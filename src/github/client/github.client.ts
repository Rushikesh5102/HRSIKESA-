/**
 * HṚṢĪKEŚA (हृषीकेश) — GitHub API Client Abstraction
 *
 * Safe HTTP client with rate-limit tracking, token-based authentication via vault/env,
 * response validation, defensive error handling, and public web fallbacks.
 */

import { ILogger } from '../../core/logging/logger.types.js';
import { GitHubRateLimitInfo, GitHubRepository } from '../types/github.types.js';

export interface GitHubClientOptions {
  readonly baseUrl?: string;
  readonly token?: string;
  readonly userAgent?: string;
  readonly logger?: ILogger;
}

export class GitHubClient {
  private readonly baseUrl: string;
  private token?: string;
  private readonly userAgent: string;
  private readonly logger?: ILogger;

  private rateLimitInfo: GitHubRateLimitInfo = {
    limit: 60,
    remaining: 60,
    resetAt: new Date(Date.now() + 3600000).toISOString(),
    authenticated: false,
    status: 'OK',
  };

  constructor(options: GitHubClientOptions = {}) {
    this.baseUrl = (options.baseUrl || 'https://api.github.com').replace(/\/$/, '');
    this.token = options.token;
    this.userAgent = options.userAgent || 'HRISEKESA-Intelligence-Fabric/1.0';
    this.logger = options.logger?.child('GitHubClient');
    if (this.token) {
      this.rateLimitInfo = { ...this.rateLimitInfo, authenticated: true, limit: 5000, remaining: 5000 };
    }
  }

  public setToken(token?: string): void {
    this.token = token;
    this.rateLimitInfo = {
      ...this.rateLimitInfo,
      authenticated: Boolean(token),
    };
  }

  public getRateLimitInfo(): GitHubRateLimitInfo {
    return { ...this.rateLimitInfo };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': this.userAgent,
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Update rate-limit headers
      const limit = response.headers.get('x-ratelimit-limit');
      const remaining = response.headers.get('x-ratelimit-remaining');
      const reset = response.headers.get('x-ratelimit-reset');

      if (limit && remaining) {
        const remainingNum = parseInt(remaining, 10);
        this.rateLimitInfo = {
          limit: parseInt(limit, 10),
          remaining: remainingNum,
          resetAt: reset ? new Date(parseInt(reset, 10) * 1000).toISOString() : this.rateLimitInfo.resetAt,
          authenticated: Boolean(this.token),
          status: remainingNum === 0 ? 'RATE_LIMITED' : 'OK',
        };
      }

      if (response.status === 401 || response.status === 403) {
        if (response.headers.get('x-ratelimit-remaining') === '0') {
          this.rateLimitInfo = { ...this.rateLimitInfo, status: 'RATE_LIMITED' };
          throw new Error('GitHub API rate limit exceeded.');
        }
        if (response.status === 401) {
          throw new Error('AUTH_REQUIRED: Invalid or expired GitHub credentials.');
        }
      }

      if (response.status === 404) {
        throw new Error(`Resource not found on GitHub: ${endpoint}`);
      }

      if (!response.ok) {
        throw new Error(`GitHub API request failed with status ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data as T;
    } catch (err: any) {
      this.logger?.debug(`GitHub API error on ${endpoint}: ${err.message}`);
      throw err;
    }
  }

  public async searchRepositories(query: string, options: { sort?: string; order?: string; limit?: number } = {}): Promise<GitHubRepository[]> {
    const params = new URLSearchParams({
      q: query,
      sort: options.sort || 'stars',
      order: options.order || 'desc',
      per_page: String(Math.min(options.limit || 30, 100)),
    });

    const data = await this.request<{ items: any[] }>(`/search/repositories?${params.toString()}`);
    if (!data || !Array.isArray(data.items)) {
      return [];
    }

    return data.items.map((item) => this.mapApiRepo(item));
  }

  public async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    const data = await this.request<any>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
    return this.mapApiRepo(data);
  }

  public async getContents(owner: string, repo: string, path: string = '', ref?: string): Promise<any> {
    const refParam = ref ? `?ref=${encodeURIComponent(ref)}` : '';
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return this.request<any>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${cleanPath}${refParam}`);
  }

  public async getFile(owner: string, repo: string, path: string, ref?: string): Promise<string> {
    const contents = await this.getContents(owner, repo, path, ref);
    if (Array.isArray(contents)) {
      throw new Error(`Path '${path}' is a directory, not a file.`);
    }
    if (contents.content && contents.encoding === 'base64') {
      return Buffer.from(contents.content, 'base64').toString('utf8');
    }
    if (contents.download_url) {
      const res = await fetch(contents.download_url);
      if (res.ok) {
        return res.text();
      }
    }
    throw new Error(`Unable to decode content for '${path}'.`);
  }

  public async getReadme(owner: string, repo: string, ref?: string): Promise<string> {
    try {
      const refParam = ref ? `?ref=${encodeURIComponent(ref)}` : '';
      const data = await this.request<any>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme${refParam}`);
      if (data.content && data.encoding === 'base64') {
        return Buffer.from(data.content, 'base64').toString('utf8');
      }
    } catch (err: any) {
      // Fallback: try raw.githubusercontent.com for main/master
      try {
        const rawRes = await fetch(`https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${ref || 'main'}/README.md`);
        if (rawRes.ok) {
          return await rawRes.text();
        }
      } catch {
        // Ignored
      }
      throw new Error(`README not found for ${owner}/${repo}`);
    }
    return '';
  }

  public async getLicense(owner: string, repo: string): Promise<{ spdx?: string; name?: string; content?: string }> {
    try {
      const data = await this.request<any>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/license`);
      let content: string | undefined;
      if (data.content && data.encoding === 'base64') {
        content = Buffer.from(data.content, 'base64').toString('utf8');
      }
      return {
        spdx: data.license?.spdx_id || 'UNKNOWN',
        name: data.license?.name || 'Unknown',
        content,
      };
    } catch {
      return { spdx: 'UNKNOWN', name: 'Unknown' };
    }
  }

  public async getReleases(owner: string, repo: string, limit: number = 10): Promise<any[]> {
    try {
      const data = await this.request<any[]>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases?per_page=${limit}`);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  public async getTags(owner: string, repo: string, limit: number = 20): Promise<any[]> {
    try {
      const data = await this.request<any[]>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/tags?per_page=${limit}`);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  public async getLanguages(owner: string, repo: string): Promise<Record<string, number>> {
    try {
      const data = await this.request<Record<string, number>>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/languages`);
      return data || {};
    } catch {
      return {};
    }
  }

  public async getIssues(owner: string, repo: string, limit: number = 10): Promise<any[]> {
    try {
      const data = await this.request<any[]>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?state=all&per_page=${limit}`);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  public async getPullRequests(owner: string, repo: string, limit: number = 10): Promise<any[]> {
    try {
      const data = await this.request<any[]>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?state=all&per_page=${limit}`);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  private mapApiRepo(item: any): GitHubRepository {
    const owner = item.owner?.login || item.full_name?.split('/')[0] || 'unknown';
    const name = item.name || item.full_name?.split('/')[1] || 'unknown';
    const fullName = item.full_name || `${owner}/${name}`;

    return {
      id: `gh_${owner.toLowerCase()}_${name.toLowerCase()}`,
      githubId: item.id || 0,
      owner,
      name,
      fullName,
      url: item.html_url || `https://github.com/${fullName}`,
      defaultBranch: item.default_branch || 'main',
      description: item.description || '',
      stars: item.stargazers_count || 0,
      forks: item.forks_count || 0,
      watchers: item.watchers_count || 0,
      openIssues: item.open_issues_count || 0,
      language: item.language || 'unknown',
      languages: {},
      licenseSpdx: item.license?.spdx_id || 'UNKNOWN',
      licenseName: item.license?.name || (item.license?.spdx_id ? item.license.spdx_id : 'Unknown License'),
      topics: Array.isArray(item.topics) ? item.topics : [],
      createdAt: item.created_at || new Date().toISOString(),
      updatedAt: item.updated_at || new Date().toISOString(),
      pushedAt: item.pushed_at || '',
      archived: Boolean(item.archived),
      fork: Boolean(item.fork),
      sizeKb: item.size || 0,
      visibility: item.private ? 'private' : 'public',
      discoveredAt: new Date().toISOString(),
    };
  }
}
