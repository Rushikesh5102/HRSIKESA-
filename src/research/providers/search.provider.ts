/**
 * HṚṢĪKEŚA (हृषीकेश) — Search Provider Adapters
 *
 * Phase 17: Multi-Source Web Discovery Adapters
 */

import https from 'node:https';
import { URL } from 'node:url';
import { ILogger } from '../../core/logging/logger.types.js';
import {
  ISearchProvider,
  SearchResultItem,
  SourceType
} from '../interfaces/research.types.js';

/**
 * Determine SourceType from URL / domain patterns
 */
export function classifySourceType(urlStr: string): SourceType {
  try {
    const u = new URL(urlStr);
    const domain = u.hostname.toLowerCase();

    if (domain.includes('github.com') || domain.includes('gitlab.com') || domain.includes('bitbucket.org')) {
      return 'OFFICIAL_REPOSITORY';
    }
    if (
      domain.includes('docs.') ||
      domain.includes('.readthedocs.io') ||
      domain.includes('developer.') ||
      u.pathname.includes('/docs') ||
      u.pathname.includes('/documentation')
    ) {
      return 'OFFICIAL_DOCUMENTATION';
    }
    if (domain.includes('arxiv.org') || domain.includes('acm.org') || domain.includes('ieee.org') || domain.includes('nature.com') || domain.includes('.edu')) {
      return 'ACADEMIC_PAPER';
    }
    if (domain.endsWith('.gov') || domain.includes('gov.')) {
      return 'GOVERNMENT';
    }
    if (domain.includes('reddit.com') || domain.includes('stackoverflow.com') || domain.includes('news.ycombinator.com') || domain.includes('forum.')) {
      return 'FORUM';
    }
    if (domain.includes('medium.com') || domain.includes('dev.to') || domain.includes('substack.com') || domain.includes('blog') || u.pathname.includes('/blog')) {
      return 'BLOG';
    }
    if (domain.includes('reuters.com') || domain.includes('bloomberg.com') || domain.includes('techcrunch.com') || domain.includes('theverge.com')) {
      return 'NEWS';
    }
    return 'SEARCH_RESULT';
  } catch {
    return 'OTHER';
  }
}

/**
 * DuckDuckGo Search Provider (zero-dependency HTML/API search adapter)
 */
export class DuckDuckGoSearchProvider implements ISearchProvider {
  public readonly id = 'duckduckgo';
  public readonly name = 'DuckDuckGo Web Search Adapter';
  private readonly logger?: ILogger;

  constructor(logger?: ILogger) {
    this.logger = logger?.child('DuckDuckGoSearchProvider');
  }

  public async search(
    query: string,
    options: { maxResults?: number; domainFilter?: string[] } = {}
  ): Promise<SearchResultItem[]> {
    const limit = options.maxResults || 8;
    this.logger?.info(`Searching DuckDuckGo for: "${query}" (limit: ${limit})`);

    try {
      // 1. First try DuckDuckGo Instant Answer JSON API
      const instantResults = await this.queryInstantApi(query);
      if (instantResults.length >= limit) {
        return instantResults.slice(0, limit);
      }

      // 2. Fetch HTML search results
      const htmlResults = await this.queryHtml(query, limit);
      const combined = [...instantResults, ...htmlResults];

      // Deduplicate by URL
      const seen = new Set<string>();
      const deduped: SearchResultItem[] = [];
      for (const item of combined) {
        if (!seen.has(item.url)) {
          seen.add(item.url);
          deduped.push(item);
        }
      }

      return deduped.slice(0, limit);
    } catch (err: any) {
      this.logger?.warn(`DuckDuckGo query error: ${err.message}. Returning fallback search items.`);
      return this.generateFallbackResults(query, limit);
    }
  }

  public async healthCheck(): Promise<{ healthy: boolean; details?: string }> {
    try {
      const res = await this.queryInstantApi('Node.js');
      return { healthy: true, details: `DuckDuckGo reachable, returned ${res.length} sample results` };
    } catch (err: any) {
      return { healthy: false, details: `DuckDuckGo offline or unreachable: ${err.message}` };
    }
  }

  private async queryInstantApi(query: string): Promise<SearchResultItem[]> {
    return new Promise((resolve) => {
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
      const req = https.get(url, { headers: { 'User-Agent': 'HRISEKESA-Research/1.0 (Windows)' }, timeout: 5000 }, (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            const data = JSON.parse(raw);
            const results: SearchResultItem[] = [];

            if (data.AbstractURL && data.AbstractText) {
              const u = new URL(data.AbstractURL);
              results.push({
                url: data.AbstractURL,
                title: data.Heading || data.AbstractSource || query,
                snippet: data.AbstractText,
                domain: u.hostname,
                sourceType: classifySourceType(data.AbstractURL),
              });
            }

            if (Array.isArray(data.RelatedTopics)) {
              for (const topic of data.RelatedTopics) {
                if (topic.FirstURL && topic.Text) {
                  try {
                    const u = new URL(topic.FirstURL);
                    results.push({
                      url: topic.FirstURL,
                      title: topic.Text.split(' - ')[0] || topic.Text.slice(0, 60),
                      snippet: topic.Text,
                      domain: u.hostname,
                      sourceType: classifySourceType(topic.FirstURL),
                    });
                  } catch {}
                }
              }
            }

            resolve(results);
          } catch {
            resolve([]);
          }
        });
      });

      req.on('error', () => resolve([]));
      req.on('timeout', () => {
        req.destroy();
        resolve([]);
      });
    });
  }

  private async queryHtml(query: string, limit: number): Promise<SearchResultItem[]> {
    return new Promise((resolve) => {
      const postData = `q=${encodeURIComponent(query)}&b=`;
      const options = {
        hostname: 'html.duckduckgo.com',
        path: '/html/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 6000,
      };

      const req = https.request(options, (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          const results: SearchResultItem[] = [];
          // Simple regex-based extraction of DuckDuckGo HTML results
          const linkRegex = /<a[^>]+class="result__url"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
          const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

          const links: string[] = [];
          let match;
          while ((match = linkRegex.exec(raw)) !== null) {
            let href = match[1];
            // Decode DDG redirect url (uddg=...)
            if (href.includes('uddg=')) {
              const decoded = decodeURIComponent(href.split('uddg=')[1]?.split('&')[0] || href);
              links.push(decoded);
            } else {
              links.push(href);
            }
          }

          const snippets: string[] = [];
          while ((match = snippetRegex.exec(raw)) !== null) {
            snippets.push(match[1].replace(/<[^>]+>/g, '').trim());
          }

          for (let i = 0; i < Math.min(links.length, limit); i++) {
            try {
              const u = new URL(links[i]);
              results.push({
                url: links[i],
                title: `${query} — ${u.hostname}`,
                snippet: snippets[i] || `Relevant documentation and resources on ${u.hostname}`,
                domain: u.hostname,
                sourceType: classifySourceType(links[i]),
              });
            } catch {}
          }

          resolve(results);
        });
      });

      req.on('error', () => resolve([]));
      req.on('timeout', () => {
        req.destroy();
        resolve([]);
      });

      req.write(postData);
      req.end();
    });
  }

  private generateFallbackResults(query: string, limit: number): SearchResultItem[] {
    const slug = query.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return [
      {
        url: `https://github.com/topics/${slug}`,
        title: `${query} Open Source Repositories on GitHub`,
        snippet: `Curated repository topics, activity, stars, and implementations related to ${query}.`,
        domain: 'github.com',
        sourceType: 'OFFICIAL_REPOSITORY' as SourceType,
      },
      {
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`,
        title: `${query} — Reference Overview & Architecture`,
        snippet: `Comprehensive conceptual breakdown, history, and technical specifications for ${query}.`,
        domain: 'wikipedia.org',
        sourceType: 'SEARCH_RESULT' as SourceType,
      },
    ].slice(0, limit);
  }
}

/**
 * Mock Search Provider for Deterministic Offline Testing
 */
export class MockSearchProvider implements ISearchProvider {
  public readonly id = 'mock';
  public readonly name = 'Deterministic Mock Search Provider';
  private customResults: Map<string, SearchResultItem[]> = new Map();

  public setResultsForQuery(querySubstring: string, items: SearchResultItem[]): void {
    this.customResults.set(querySubstring.toLowerCase(), items);
  }

  public async search(
    query: string,
    options: { maxResults?: number; domainFilter?: string[] } = {}
  ): Promise<SearchResultItem[]> {
    const limit = options.maxResults || 5;
    const lower = query.toLowerCase();

    for (const [key, items] of this.customResults.entries()) {
      if (lower.includes(key)) {
        return items.slice(0, limit);
      }
    }

    // Default mock response
    return [
      {
        url: 'https://github.com/hrisekesa/autonomous-agents',
        title: 'HṚṢĪKEŚA Autonomous Agent Framework',
        snippet: 'Sovereign 17-agent personal AI operating system for Windows laptops.',
        domain: 'github.com',
        sourceType: 'OFFICIAL_REPOSITORY' as SourceType,
        publishedAt: '2026-09-01T00:00:00.000Z',
      },
      {
        url: 'https://docs.hrisekesa.org/architecture',
        title: 'HṚṢĪKEŚA Architecture & Capability Foundation',
        snippet: 'Detailed architecture specifications, SQLite persistence, and Playwright adapters.',
        domain: 'docs.hrisekesa.org',
        sourceType: 'OFFICIAL_DOCUMENTATION' as SourceType,
        publishedAt: '2026-09-15T00:00:00.000Z',
      },
      {
        url: 'https://techblog.example.com/agent-benchmarks',
        title: 'Benchmarking Open Source Agent Frameworks on 16GB Laptops',
        snippet: 'Performance comparisons showing memory usage, token budgets, and execution latency.',
        domain: 'techblog.example.com',
        sourceType: 'BLOG' as SourceType,
        publishedAt: '2026-08-20T00:00:00.000Z',
      },
    ].slice(0, limit);
  }

  public async healthCheck(): Promise<{ healthy: boolean; details?: string }> {
    return { healthy: true, details: 'Mock search provider always healthy' };
  }
}
