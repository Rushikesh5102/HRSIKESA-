/**
 * HṚṢĪKEŚA (हृषीकेश) — Built-in Tools: knowledge.search, knowledge.entity.lookup, knowledge.fact.query
 *
 * INT-006: Sovereign Personal Knowledge Graph Tool Integrations
 */

import { ITool } from '../interfaces/tool.types.js';
import { DangerTier } from '../interfaces/danger.types.js';
import { ToolExecutionContext, ToolExecutionResult, JsonSchemaObject } from '../interfaces/execution.types.js';
import { KnowledgeGraphService } from '../../knowledge/services/knowledge-graph.service.js';
import { EntityResolutionService } from '../../knowledge/services/entity-resolution.service.js';
import { KnowledgeFactRepository } from '../../knowledge/repositories/knowledge-fact.repository.js';
import { KnowledgeScope } from '../../knowledge/interfaces/knowledge.types.js';

export interface KnowledgeSearchInput {
  query: string;
  scope?: KnowledgeScope;
  limit?: number;
}

export interface KnowledgeSearchOutput {
  query: string;
  entities: Array<{
    id: string;
    canonicalName: string;
    displayName: string;
    type: string;
    scope: string;
  }>;
  totalFound: number;
}

export class KnowledgeSearchTool implements ITool<KnowledgeSearchInput, KnowledgeSearchOutput> {
  public readonly id = 'knowledge.search';
  public readonly name = 'Search Knowledge Graph';
  public readonly description = 'Searches entities, concepts, projects, and companies in the sovereign Knowledge Graph.';
  public readonly version = '1.0.0';
  public readonly category = 'knowledge';
  public readonly riskLevel = DangerTier.TIER_0;
  public readonly requiresApproval = false;
  public readonly capabilities = ['knowledge.query', 'entity.search'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Name, keyword, or concept to search in the knowledge graph' },
      scope: { type: 'string', enum: ['CREATOR', 'PROJECT', 'COMPANY', 'GLOBAL'], description: 'Knowledge isolation scope' },
      limit: { type: 'number', description: 'Maximum results to return (bounded to 50)' },
    },
    required: ['query'],
  };

  constructor(
    private resolutionService?: EntityResolutionService,
    private graphService?: KnowledgeGraphService
  ) {}

  public setServices(res: EntityResolutionService, graph: KnowledgeGraphService): void {
    this.resolutionService = res;
    this.graphService = graph;
  }

  public async execute(
    input: KnowledgeSearchInput,
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult<KnowledgeSearchOutput>> {
    const startTime = Date.now();
    const limit = Math.min(Math.max(1, input.limit ?? 10), 50);

    if (!this.resolutionService) {
      return {
        success: false,
        error: 'EntityResolutionService not initialized',
        durationMs: Date.now() - startTime,
      };
    }

    try {
      const result = await this.resolutionService.resolveEntity(input.query, {
        scope: input.scope,
        confidenceThreshold: 0.6,
      });

      const entities: KnowledgeSearchOutput['entities'] = [];
      if (result.entity) {
        entities.push({
          id: result.entity.id,
          canonicalName: result.entity.canonicalName,
          displayName: result.entity.displayName || result.entity.canonicalName,
          type: result.entity.entityType,
          scope: result.entity.scope,
        });
      }

      for (const cand of result.candidates || []) {
        if (!entities.some((e) => e.id === cand.entity.id) && entities.length < limit) {
          entities.push({
            id: cand.entity.id,
            canonicalName: cand.entity.canonicalName,
            displayName: cand.entity.displayName || cand.entity.canonicalName,
            type: cand.entity.entityType,
            scope: cand.entity.scope,
          });
        }
      }

      // If graphService is available, expand with immediate neighbors if under limit
      if (this.graphService && entities.length > 0 && entities.length < limit) {
        const neighbors = this.graphService.findNeighbors(entities[0].id, {
          limit: limit - entities.length,
          maxDepth: 1,
        });
        for (const n of neighbors) {
          if (!entities.some((e) => e.id === n.id)) {
            entities.push({
              id: n.id,
              canonicalName: n.canonicalName,
              displayName: n.displayName || n.canonicalName,
              type: n.entityType,
              scope: n.scope,
            });
          }
        }
      }

      return {
        success: true,
        output: {
          query: input.query,
          entities,
          totalFound: entities.length,
        },
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Knowledge search failed',
        durationMs: Date.now() - startTime,
      };
    }
  }
}

export interface KnowledgeEntityLookupInput {
  entityIdOrName: string;
  maxNeighbors?: number;
}

export interface KnowledgeEntityLookupOutput {
  entity: {
    id: string;
    canonicalName: string;
    type: string;
    scope: string;
    description?: string;
  } | null;
  neighbors: Array<{
    id: string;
    name: string;
    relationshipType: string;
  }>;
}

export class KnowledgeEntityLookupTool implements ITool<KnowledgeEntityLookupInput, KnowledgeEntityLookupOutput> {
  public readonly id = 'knowledge.entity.lookup';
  public readonly name = 'Lookup Knowledge Entity Details';
  public readonly description = 'Retrieves detailed entity attributes, canonical aliases, and bounded neighbors.';
  public readonly version = '1.0.0';
  public readonly category = 'knowledge';
  public readonly riskLevel = DangerTier.TIER_0;
  public readonly requiresApproval = false;
  public readonly capabilities = ['knowledge.lookup', 'entity.details'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      entityIdOrName: { type: 'string', description: 'Entity ID or name to look up' },
      maxNeighbors: { type: 'number', description: 'Maximum neighbors to retrieve (bounded to 25)' },
    },
    required: ['entityIdOrName'],
  };

  constructor(
    private graphService?: KnowledgeGraphService,
    private resolutionService?: EntityResolutionService
  ) {}

  public setServices(graph: KnowledgeGraphService, res: EntityResolutionService): void {
    this.graphService = graph;
    this.resolutionService = res;
  }

  public async execute(
    input: KnowledgeEntityLookupInput,
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult<KnowledgeEntityLookupOutput>> {
    const startTime = Date.now();
    if (!this.graphService || !this.resolutionService) {
      return {
        success: false,
        error: 'Knowledge services not initialized',
        durationMs: Date.now() - startTime,
      };
    }

    try {
      let ent = this.graphService.getEntity(input.entityIdOrName);
      if (!ent) {
        const resolved = await this.resolutionService.resolveEntity(input.entityIdOrName, {
          confidenceThreshold: 0.7,
        });
        ent = resolved.entity || null;
      }

      if (!ent) {
        return {
          success: true,
          output: { entity: null, neighbors: [] },
          durationMs: Date.now() - startTime,
        };
      }

      const maxNeighbors = Math.min(Math.max(1, input.maxNeighbors ?? 10), 25);
      const neighborNodes = this.graphService.findNeighbors(ent.id, { limit: maxNeighbors, maxDepth: 1 });

      return {
        success: true,
        output: {
          entity: {
            id: ent.id,
            canonicalName: ent.canonicalName,
            type: ent.entityType,
            scope: ent.scope,
            description: ent.description,
          },
          neighbors: neighborNodes.map((n) => ({
            id: n.id,
            name: n.canonicalName,
            relationshipType: 'CONNECTED_TO',
          })),
        },
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Entity lookup failed',
        durationMs: Date.now() - startTime,
      };
    }
  }
}

export interface KnowledgeFactQueryInput {
  subjectEntityId?: string;
  predicate?: string;
  scope?: KnowledgeScope;
  activeOnly?: boolean;
}

export interface KnowledgeFactQueryOutput {
  facts: Array<{
    id: string;
    subjectEntityId: string;
    predicate: string;
    objectValue: string;
    confidence: number;
    provenance: string;
    scope: string;
    version: number;
  }>;
  totalFound: number;
}

export class KnowledgeFactQueryTool implements ITool<KnowledgeFactQueryInput, KnowledgeFactQueryOutput> {
  public readonly id = 'knowledge.fact.query';
  public readonly name = 'Query Verified Knowledge Facts';
  public readonly description = 'Queries structured, evidence-backed facts from the sovereign Knowledge Graph.';
  public readonly version = '1.0.0';
  public readonly category = 'knowledge';
  public readonly riskLevel = DangerTier.TIER_0;
  public readonly requiresApproval = false;
  public readonly capabilities = ['knowledge.facts', 'fact.query'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      subjectEntityId: { type: 'string', description: 'Filter by subject entity ID' },
      predicate: { type: 'string', description: 'Filter by relationship/property predicate' },
      scope: { type: 'string', enum: ['CREATOR', 'PROJECT', 'COMPANY', 'GLOBAL'], description: 'Knowledge isolation scope' },
      activeOnly: { type: 'boolean', description: 'Whether to only return active (non-superseded) facts' },
    },
  };

  constructor(private factRepo?: KnowledgeFactRepository) {}

  public setRepo(repo: KnowledgeFactRepository): void {
    this.factRepo = repo;
  }

  public async execute(
    input: KnowledgeFactQueryInput,
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult<KnowledgeFactQueryOutput>> {
    const startTime = Date.now();
    if (!this.factRepo) {
      return {
        success: false,
        error: 'KnowledgeFactRepository not initialized',
        durationMs: Date.now() - startTime,
      };
    }

    try {
      const facts = this.factRepo.findFacts({
        subjectEntityId: input.subjectEntityId,
        predicate: input.predicate,
        scope: input.scope,
        activeOnly: input.activeOnly ?? true,
      });

      return {
        success: true,
        output: {
          facts: facts.map((f) => ({
            id: f.id,
            subjectEntityId: f.subjectEntityId,
            predicate: f.predicate,
            objectValue: f.objectValue,
            confidence: f.confidence,
            provenance: f.provenance || 'SYSTEM',
            scope: f.scope,
            version: f.version || 1,
          })),
          totalFound: facts.length,
        },
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Fact query failed',
        durationMs: Date.now() - startTime,
      };
    }
  }
}
