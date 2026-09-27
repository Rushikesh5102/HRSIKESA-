/**
 * FP-13 Learned UI Pattern Store
 *
 * Stores and retrieves verified UI interaction patterns, element selectors,
 * and application layouts to speed up resolution and reduce repetitive model queries.
 */

import { LearnedUIPattern } from '../types/trace.types.js';
import { WorkspaceRepository } from '../repository/workspace.repository.js';
import { ILogger } from '../../core/logging/logger.types.js';

export class LearnedPatternStore {
  private inMemoryCache: Map<string, LearnedUIPattern> = new Map();

  constructor(
    private readonly repository?: WorkspaceRepository,
    _logger?: ILogger
  ) {}

  public recordSuccess(
    appName: string,
    intent: string,
    successfulSelector: string,
    resolutionMethod: string,
    appVersion?: string
  ): LearnedUIPattern {
    const key = `${appName.toLowerCase()}:${intent.toLowerCase()}`;
    const existing = this.findPattern(appName, intent);

    const pattern: LearnedUIPattern = {
      patternId: existing ? existing.patternId : `pat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      applicationName: appName,
      applicationVersion: appVersion || existing?.applicationVersion,
      intent,
      successfulSelector,
      resolutionMethod,
      confidence: existing ? Math.min(1.0, existing.confidence + 0.05) : 0.9,
      useCount: (existing?.useCount || 0) + 1,
      lastUsedAt: new Date().toISOString(),
      createdAt: existing?.createdAt || new Date().toISOString(),
      metadata: {},
    };

    this.inMemoryCache.set(key, pattern);
    if (this.repository) {
      this.repository.savePattern(pattern);
    }

    return pattern;
  }

  public findPattern(appName: string, intent: string): LearnedUIPattern | null {
    const key = `${appName.toLowerCase()}:${intent.toLowerCase()}`;
    if (this.inMemoryCache.has(key)) {
      return this.inMemoryCache.get(key)!;
    }
    if (this.repository) {
      const fromDb = this.repository.findPattern(appName, intent);
      if (fromDb) {
        this.inMemoryCache.set(key, fromDb);
        return fromDb;
      }
    }
    return null;
  }

  public listPatterns(appName?: string): LearnedUIPattern[] {
    if (this.repository) {
      return this.repository.listPatterns(appName);
    }
    return Array.from(this.inMemoryCache.values());
  }
}
