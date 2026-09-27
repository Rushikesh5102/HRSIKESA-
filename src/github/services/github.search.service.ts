/**
 * HṚṢĪKEŚA (हृषीकेश) — GitHub Repository Search Service
 *
 * Discovers open-source candidate repositories matching capability needs,
 * keywords, language constraints, and license preferences.
 */

import { ILogger } from '../../core/logging/logger.types.js';
import { GitHubClient } from '../client/github.client.js';
import { GitHubIntelligenceRepository } from '../repository/github.repository.js';
import { GitHubRepository, GitHubSearchCriteria } from '../types/github.types.js';

export class GitHubRepositorySearchService {
  private readonly client: GitHubClient;
  private readonly repository: GitHubIntelligenceRepository;
  private readonly logger?: ILogger;

  constructor(
    client: GitHubClient,
    repository: GitHubIntelligenceRepository,
    logger?: ILogger
  ) {
    this.client = client;
    this.repository = repository;
    this.logger = logger?.child('GitHubRepositorySearchService');
  }

  /**
   * Search for repositories matching multi-attribute search criteria.
   */
  public async search(criteria: GitHubSearchCriteria): Promise<GitHubRepository[]> {
    // Construct query string for GitHub Search API
    const terms: string[] = [];

    if (criteria.query) {
      terms.push(criteria.query.trim());
    } else if (criteria.capabilityNeed) {
      terms.push(criteria.capabilityNeed.trim());
    }

    if (criteria.language) {
      terms.push(`language:${criteria.language}`);
    }

    if (criteria.license) {
      terms.push(`license:${criteria.license}`);
    }

    if (criteria.topic) {
      terms.push(`topic:${criteria.topic}`);
    }

    if (criteria.minStars !== undefined && criteria.minStars > 0) {
      terms.push(`stars:>=${criteria.minStars}`);
    }

    const searchQuery = terms.join(' ');
    this.logger?.info(`Executing GitHub search: "${searchQuery}"`);

    let results: GitHubRepository[] = [];
    try {
      results = await this.client.searchRepositories(searchQuery, { limit: criteria.limit || 20 });
    } catch (err: any) {
      this.logger?.warn(`GitHub remote search failed (${err.message}). Falling back to local cache.`);
      results = this.repository.searchLocalRepositories(criteria.query || criteria.capabilityNeed || '', criteria.limit || 20);
    }

    // Persist discovered repositories to repository cache
    for (const repo of results) {
      this.repository.saveRepository(repo);
    }

    return results;
  }
}
