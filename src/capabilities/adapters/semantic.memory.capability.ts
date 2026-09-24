/**
 * HṚṢĪKEŚA (हृषीकेश) — Semantic Memory & Embedding Capability Adapter
 *
 * Phase 16J: Semantic Vector Embedding and Hybrid Search Capability
 */

import { ICapabilityAdapter } from './capability.adapter.js';
import {
  CapabilityMetadata,
  CapabilityHealthCheckResult,
  CapabilityExecutionRequest,
  CapabilityExecutionResult,
} from '../interfaces/capability.types.js';
import { SemanticMemorySearch } from '../../memory/semantic/semantic.search.js';

export class SemanticMemoryCapabilityAdapter implements ICapabilityAdapter {
  private readonly search: SemanticMemorySearch;

  constructor(search: SemanticMemorySearch) {
    this.search = search;
  }

  public getMetadata(): CapabilityMetadata {
    return {
      id: 'memory.semantic',
      name: 'Semantic Vector Memory & Hybrid Search',
      description: 'Dense vector similarity embeddings (nomic-embed-text) combined with SQLite full-text search.',
      category: 'memory',
      provider: 'Ollama nomic-embed-text / SQLite FTS',
      source: 'open_source',
      version: '1.2.0',
      license: 'Apache-2.0',
      runtimeType: 'native',
      supportedPlatforms: ['win32', 'linux', 'darwin'],
      requiredPermissions: ['memory:read', 'memory:write'],
      riskLevel: 'LOW',
      dependencies: ['sqlite3', 'ollama'],
      enabled: true,
      securityStatus: 'VERIFIED',
    };
  }

  public async checkHealth(): Promise<CapabilityHealthCheckResult> {
    const start = Date.now();
    try {
      const isReady = this.search !== undefined;
      return {
        status: isReady ? 'HEALTHY' : 'DEGRADED',
        message: isReady ? 'Hybrid semantic memory index online.' : 'Semantic search not configured.',
        latencyMs: Date.now() - start,
        lastCheckedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        status: 'UNAVAILABLE',
        message: `Semantic memory health check failed: ${err.message}`,
        latencyMs: Date.now() - start,
        lastCheckedAt: new Date().toISOString(),
      };
    }
  }

  public async execute(req: CapabilityExecutionRequest): Promise<CapabilityExecutionResult> {
    const start = Date.now();
    try {
      let output: unknown;
      if (req.action === 'search') {
        output = await this.search.search(String(req.parameters.query), {
          topK: typeof req.parameters.limit === 'number' ? req.parameters.limit : 5,
        });
      } else {
        throw new Error(`Unsupported semantic memory action: ${req.action}`);
      }

      return {
        success: true,
        output,
        executionTimeMs: Date.now() - start,
        capabilityId: 'memory.semantic',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        executionTimeMs: Date.now() - start,
        capabilityId: 'memory.semantic',
      };
    }
  }
}
