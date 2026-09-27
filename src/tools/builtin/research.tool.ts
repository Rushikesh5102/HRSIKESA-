/**
 * HṚṢĪKEŚA (हृषीकेश) — Built-in Tools: research.execute & research.query
 *
 * INT-005: Advanced Research & Web Intelligence Tool Integrations
 */

import { ITool } from '../interfaces/tool.types.js';
import { DangerTier } from '../interfaces/danger.types.js';
import { ToolExecutionContext, ToolExecutionResult, JsonSchemaObject } from '../interfaces/execution.types.js';
import { ResearchEngine } from '../../research/engine/research.engine.js';
import { ResearchDepth, ResearchType } from '../../research/interfaces/research.types.js';

export interface ResearchExecuteInput {
  topic: string;
  depth?: ResearchDepth;
  researchType?: ResearchType;
}

export interface ResearchExecuteOutput {
  studyId: string;
  topic: string;
  status: string;
  synthesis?: string;
  sourcesFound: number;
  claimsExtracted: number;
  durationMs: number;
}

export class ResearchExecuteTool implements ITool<ResearchExecuteInput, ResearchExecuteOutput> {
  public readonly id = 'research.execute';
  public readonly name = 'Execute Deep Research';
  public readonly description = 'Plans, gathers multi-source web intelligence, extracts evidence, detects contradictions, and synthesizes findings.';
  public readonly version = '1.0.0';
  public readonly category = 'research';
  public readonly riskLevel = DangerTier.TIER_1;
  public readonly requiresApproval = false;
  public readonly capabilities = ['web.research', 'source.extraction', 'evidence.synthesis'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      topic: { type: 'string', description: 'The research topic or question to investigate' },
      depth: { type: 'string', enum: ['QUICK', 'NORMAL', 'DEEP', 'COMPREHENSIVE'], description: 'Research depth budget' },
      researchType: { type: 'string', description: 'Type of research to perform' },
    },
    required: ['topic']
  };

  constructor(private engine?: ResearchEngine) {}

  public setEngine(engine: ResearchEngine): void {
    this.engine = engine;
  }

  public async execute(
    input: ResearchExecuteInput,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult<ResearchExecuteOutput>> {
    const startTime = Date.now();
    if (!this.engine) {
      return {
        success: false,
        error: 'ResearchEngine is not wired to ResearchExecuteTool',
        durationMs: Date.now() - startTime
      };
    }

    try {
      const study = await this.engine.createStudy(
        input.topic,
        context.userId || 'ROOT_RUSHIKESH',
        input.depth,
        input.researchType
      );

      const executed = await this.engine.executeStudy(study.id);
      return {
        success: true,
        output: {
          studyId: executed.study.id,
          topic: executed.study.title,
          status: executed.study.status,
          synthesis: executed.bundle.markdown,
          sourcesFound: executed.bundle.sources.length,
          claimsExtracted: executed.bundle.evidence.length,
          durationMs: Date.now() - startTime
        },
        durationMs: Date.now() - startTime
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: (err as Error).message,
        durationMs: Date.now() - startTime
      };
    }
  }
}

export interface ResearchQueryInput {
  studyId?: string;
  limit?: number;
}

export interface ResearchQueryOutput {
  studies: Array<{
    id: string;
    topic: string;
    status: string;
    sourcesCount: number;
    claimsCount: number;
    createdAt: string;
  }>;
}

export class ResearchQueryTool implements ITool<ResearchQueryInput, ResearchQueryOutput> {
  public readonly id = 'research.query';
  public readonly name = 'Query Research Studies';
  public readonly description = 'Retrieves past research sessions, summaries, and findings.';
  public readonly version = '1.0.0';
  public readonly category = 'research';
  public readonly riskLevel = DangerTier.TIER_0;
  public readonly requiresApproval = false;
  public readonly capabilities = ['research.history', 'knowledge.retrieval'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      studyId: { type: 'string', description: 'Optional specific study ID to retrieve' },
      limit: { type: 'number', description: 'Maximum number of studies to list' }
    }
  };

  constructor(private engine?: ResearchEngine) {}

  public setEngine(engine: ResearchEngine): void {
    this.engine = engine;
  }

  public async execute(
    input: ResearchQueryInput,
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult<ResearchQueryOutput>> {
    const startTime = Date.now();
    if (!this.engine) {
      return {
        success: false,
        error: 'ResearchEngine is not wired to ResearchQueryTool',
        durationMs: Date.now() - startTime
      };
    }

    try {
      if (input.studyId) {
        const bundle = await this.engine.getStudy(input.studyId);
        if (!bundle || !bundle.study) {
          return {
            success: false,
            error: `Study not found: ${input.studyId}`,
            durationMs: Date.now() - startTime
          };
        }
        return {
          success: true,
          output: {
            studies: [{
              id: bundle.study.id,
              topic: bundle.study.title,
              status: bundle.study.status,
              sourcesCount: bundle.sources.length,
              claimsCount: bundle.evidence.length,
              createdAt: bundle.study.createdAt
            }]
          },
          durationMs: Date.now() - startTime
        };
      }

      const all = await this.engine.listStudies();
      const limit = typeof input.limit === 'number' ? input.limit : 10;
      const sliced = all.slice(0, limit);

      return {
        success: true,
        output: {
          studies: sliced.map((s) => ({
            id: s.id,
            topic: s.title,
            status: s.status,
            sourcesCount: 0,
            claimsCount: 0,
            createdAt: s.createdAt
          }))
        },
        durationMs: Date.now() - startTime
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: (err as Error).message,
        durationMs: Date.now() - startTime
      };
    }
  }
}
