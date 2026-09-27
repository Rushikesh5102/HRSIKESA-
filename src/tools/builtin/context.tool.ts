/**
 * HṚṢĪKEŚA (हृषीकेश) — Built-in Tools: context.inspect, context.search, context.trace
 *
 * INT-007: Cognitive Context Engine Diagnostic and Search Tools
 */

import { ITool } from '../interfaces/tool.types.js';
import { DangerTier } from '../interfaces/danger.types.js';
import { ToolExecutionContext, ToolExecutionResult, JsonSchemaObject } from '../interfaces/execution.types.js';
import { CognitiveContextEngine } from '../../context/services/cognitive-context-engine.js';
import { ContextRequest, ContextScope, ContextIntent, ContextTrace } from '../../context/interfaces/context.types.js';

// ==========================================
// 1. context.inspect
// ==========================================

export interface ContextInspectInput {
  userMessage: string;
  projectId?: string;
  companyId?: string;
  intent?: ContextIntent;
  requestedDepth?: 'SHALLOW' | 'STANDARD' | 'DEEP' | 'EXHAUSTIVE';
}

export interface ContextInspectOutput {
  requestId: string;
  intent: string;
  complexity: string;
  primaryScope: string;
  activatedSources: string[];
  candidatesCollected: number;
  candidatesSelected: number;
  selectedCandidates: Array<{
    id: string;
    sourceType: string;
    scope: string;
    title?: string;
    content: string;
    relevanceScore: number;
    rankingReasons: string[];
  }>;
  formattedContextPreview: string;
  timingsMs: { total: number };
}

export class ContextInspectTool implements ITool<ContextInspectInput, ContextInspectOutput> {
  public readonly id = 'context.inspect';
  public readonly name = 'Inspect Cognitive Context Assembly';
  public readonly description = 'Runs request classification, scope resolution, ranking, and returns the selected cognitive context items.';
  public readonly version = '1.0.0';
  public readonly category = 'context';
  public readonly riskLevel = DangerTier.TIER_0;
  public readonly requiresApproval = false;
  public readonly capabilities = ['context.inspect', 'context.debug'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      userMessage: { type: 'string', description: 'User message or query to inspect context for' },
      projectId: { type: 'string', description: 'Optional project isolation identifier' },
      companyId: { type: 'string', description: 'Optional company isolation identifier' },
      intent: { type: 'string', description: 'Optional explicit intent override' },
      requestedDepth: { type: 'string', enum: ['SHALLOW', 'STANDARD', 'DEEP', 'EXHAUSTIVE'], description: 'Context search depth' },
    },
    required: ['userMessage'],
  };

  constructor(private contextEngine?: CognitiveContextEngine) {}

  public setContextEngine(engine: CognitiveContextEngine): void {
    this.contextEngine = engine;
  }

  public async execute(
    input: ContextInspectInput,
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult<ContextInspectOutput>> {
    const start = performance.now();
    if (!this.contextEngine) {
      return {
        success: false,
        error: 'CognitiveContextEngine is not initialized',
        durationMs: performance.now() - start,
      };
    }

    try {
      const request: ContextRequest = {
        userMessage: input.userMessage,
        projectId: input.projectId,
        companyId: input.companyId,
        intent: input.intent,
        requestedDepth: input.requestedDepth,
      };

      const result = await this.contextEngine.assembleCognitiveContext(request);

      return {
        success: true,
        output: {
          requestId: result.requestId,
          intent: result.trace.intent,
          complexity: result.trace.complexity,
          primaryScope: result.trace.resolvedScope,
          activatedSources: result.trace.activatedSources,
          candidatesCollected: result.trace.candidatesCollected,
          candidatesSelected: result.trace.candidatesSelected,
          selectedCandidates: result.selectedCandidates.map(c => ({
            id: c.id,
            sourceType: c.sourceType,
            scope: c.scope,
            title: c.title,
            content: c.content,
            relevanceScore: c.relevanceScore,
            rankingReasons: c.rankingReasons,
          })),
          formattedContextPreview: result.formattedContext.slice(0, 500),
          timingsMs: { total: result.trace.timingsMs.total },
        },
        durationMs: performance.now() - start,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: performance.now() - start,
      };
    }
  }
}

// ==========================================
// 2. context.search
// ==========================================

export interface ContextSearchInput {
  query: string;
  scope?: ContextScope;
  projectId?: string;
  limit?: number;
}

export interface ContextSearchOutput {
  query: string;
  scope: string;
  totalFound: number;
  items: Array<{
    id: string;
    sourceType: string;
    title?: string;
    content: string;
    score: number;
    reasons: string[];
  }>;
}

export class ContextSearchTool implements ITool<ContextSearchInput, ContextSearchOutput> {
  public readonly id = 'context.search';
  public readonly name = 'Search Context Knowledge & Decisions';
  public readonly description = 'Searches across unified memory, decisions, knowledge graph, and evidence using the cognitive context ranker.';
  public readonly version = '1.0.0';
  public readonly category = 'context';
  public readonly riskLevel = DangerTier.TIER_0;
  public readonly requiresApproval = false;
  public readonly capabilities = ['context.search', 'knowledge.search'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Query to search context for' },
      scope: { type: 'string', description: 'Optional scope filter' },
      projectId: { type: 'string', description: 'Optional project isolation' },
      limit: { type: 'number', description: 'Maximum items to return' },
    },
    required: ['query'],
  };

  constructor(private contextEngine?: CognitiveContextEngine) {}

  public setContextEngine(engine: CognitiveContextEngine): void {
    this.contextEngine = engine;
  }

  public async execute(
    input: ContextSearchInput,
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult<ContextSearchOutput>> {
    const start = performance.now();
    if (!this.contextEngine) {
      return {
        success: false,
        error: 'CognitiveContextEngine is not initialized',
        durationMs: performance.now() - start,
      };
    }

    try {
      const result = await this.contextEngine.assembleCognitiveContext({
        userMessage: input.query,
        projectId: input.projectId,
      });

      const limit = Math.min(input.limit || 10, 50);
      const items = result.selectedCandidates.slice(0, limit).map(c => ({
        id: c.id,
        sourceType: c.sourceType,
        title: c.title,
        content: c.content,
        score: c.relevanceScore,
        reasons: c.rankingReasons,
      }));

      return {
        success: true,
        output: {
          query: input.query,
          scope: input.scope || result.trace.resolvedScope,
          totalFound: items.length,
          items,
        },
        durationMs: performance.now() - start,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: performance.now() - start,
      };
    }
  }
}

// ==========================================
// 3. context.trace
// ==========================================

export interface ContextTraceInput {
  requestId: string;
}

export interface ContextTraceOutput {
  found: boolean;
  trace?: ContextTrace;
}

export class ContextTraceTool implements ITool<ContextTraceInput, ContextTraceOutput> {
  public readonly id = 'context.trace';
  public readonly name = 'Retrieve Context Trace';
  public readonly description = 'Retrieves diagnostic trace explaining source selection, candidate counts, and ranking reasons for a request.';
  public readonly version = '1.0.0';
  public readonly category = 'context';
  public readonly riskLevel = DangerTier.TIER_0;
  public readonly requiresApproval = false;
  public readonly capabilities = ['context.trace', 'audit.view'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      requestId: { type: 'string', description: 'Request identifier from a prior context assembly' },
    },
    required: ['requestId'],
  };

  constructor(private contextEngine?: CognitiveContextEngine) {}

  public setContextEngine(engine: CognitiveContextEngine): void {
    this.contextEngine = engine;
  }

  public async execute(
    input: ContextTraceInput,
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult<ContextTraceOutput>> {
    const start = performance.now();
    if (!this.contextEngine) {
      return {
        success: false,
        error: 'CognitiveContextEngine is not initialized',
        durationMs: performance.now() - start,
      };
    }

    const trace = this.contextEngine.getTrace(input.requestId);

    return {
      success: true,
      output: {
        found: !!trace,
        trace,
      },
      durationMs: performance.now() - start,
    };
  }
}
