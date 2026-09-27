/**
 * HṚṢĪKEŚA (हृषीकेश) — Built-in Tools: Working Memory & Conversational Continuity
 *
 * Track A / INT-008: Persistent Working Memory & Conversational Continuity Engine
 *
 * Tools:
 * 1. working_memory.inspect - Inspects active continuity state and working memory items
 * 2. working_memory.threads - Lists and inspects active/paused conversation threads
 * 3. working_memory.pending - Lists pending items, unresolved questions, and blockers
 * 4. working_memory.checkpoint - Inspects or captures conversational checkpoints
 */

import { ITool } from '../interfaces/tool.types.js';
import { DangerTier } from '../interfaces/danger.types.js';
import { ToolExecutionContext, ToolExecutionResult, JsonSchemaObject } from '../interfaces/execution.types.js';
import { WorkingMemoryEngine } from '../../working-memory/services/working-memory.engine.js';

// ==========================================
// 1. working_memory.inspect
// ==========================================

export interface WorkingMemoryInspectInput {
  sessionId?: string;
  limit?: number;
}

export interface WorkingMemoryInspectOutput {
  activeThread?: {
    id: string;
    title: string;
    status: string;
    project?: string;
    company?: string;
  };
  activeProject?: string;
  activeCompany?: string;
  activeTask?: string;
  itemCount: number;
  items: Array<{
    id: string;
    type: string;
    content: string;
    scope: string;
    priority: number;
  }>;
  blockers: string[];
  nextSteps: string[];
  continuityContextPreview: string;
}

export class WorkingMemoryInspectTool implements ITool<WorkingMemoryInspectInput, WorkingMemoryInspectOutput> {
  public readonly id = 'working_memory.inspect';
  public readonly name = 'Inspect Working Memory & Continuity State';
  public readonly description = 'Inspects the active working memory items, current task, blockers, project continuity, and assembled continuity context.';
  public readonly version = '1.0.0';
  public readonly category = 'working_memory';
  public readonly riskLevel = DangerTier.TIER_0;
  public readonly requiresApproval = false;
  public readonly capabilities = ['working_memory.inspect', 'working_memory.read'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      sessionId: { type: 'string', description: 'Optional session identifier' },
      limit: { type: 'number', description: 'Max items to return' },
    },
  };

  private readonly engine: WorkingMemoryEngine;

  constructor(engine: WorkingMemoryEngine) {
    this.engine = engine;
  }

  public async execute(
    input: WorkingMemoryInspectInput,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult<WorkingMemoryInspectOutput>> {
    const startTime = Date.now();
    const sessionId = input.sessionId || context.sessionId || 'default';
    const activeThread = this.engine.threadManager.getActiveThread(sessionId);
    const state = this.engine.continuityTracker.getContinuityState(sessionId, activeThread ?? undefined);

    const items = state.workingItems.slice(0, input.limit || 20).map((i) => ({
      id: i.id,
      type: i.type,
      content: i.content,
      scope: i.scope,
      priority: i.priority,
    }));

    const preview = this.engine.assembleWorkingContext(sessionId);

    return {
      success: true,
      durationMs: Date.now() - startTime,
      output: {
        activeThread: activeThread
          ? {
              id: activeThread.id,
              title: activeThread.title,
              status: activeThread.status,
              project: activeThread.targetProjectId,
              company: activeThread.targetCompanyId,
            }
          : undefined,
        activeProject: state.activeProject,
        activeCompany: state.activeCompany,
        activeTask: state.activeTask,
        itemCount: state.workingItems.length,
        items,
        blockers: state.blockers.map((b) => b.content),
        nextSteps: state.nextSteps.map((n) => n.content),
        continuityContextPreview: preview,
      },
    };
  }
}

// ==========================================
// 2. working_memory.threads
// ==========================================

export interface WorkingMemoryThreadsInput {
  sessionId?: string;
  status?: string;
  limit?: number;
}

export interface WorkingMemoryThreadsOutput {
  total: number;
  threads: Array<{
    id: string;
    title: string;
    status: string;
    project?: string;
    company?: string;
    priority: number;
    lastActiveAt: string;
  }>;
}

export class WorkingMemoryThreadsTool implements ITool<WorkingMemoryThreadsInput, WorkingMemoryThreadsOutput> {
  public readonly id = 'working_memory.threads';
  public readonly name = 'List Conversation Threads';
  public readonly description = 'Lists conversation threads for a session, filtered by status.';
  public readonly version = '1.0.0';
  public readonly category = 'working_memory';
  public readonly riskLevel = DangerTier.TIER_0;
  public readonly requiresApproval = false;
  public readonly capabilities = ['working_memory.threads', 'working_memory.read'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      sessionId: { type: 'string', description: 'Session identifier' },
      status: { type: 'string', description: 'Thread status filter' },
      limit: { type: 'number', description: 'Max threads to return' },
    },
  };

  private readonly engine: WorkingMemoryEngine;

  constructor(engine: WorkingMemoryEngine) {
    this.engine = engine;
  }

  public async execute(
    input: WorkingMemoryThreadsInput,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult<WorkingMemoryThreadsOutput>> {
    const startTime = Date.now();
    const sessionId = input.sessionId || context.sessionId || 'default';
    const threads = this.engine.threadManager.listThreadsForSession(sessionId, input.status as any);

    return {
      success: true,
      durationMs: Date.now() - startTime,
      output: {
        total: threads.length,
        threads: threads.slice(0, input.limit || 20).map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          project: t.targetProjectId,
          company: t.targetCompanyId,
          priority: t.priority,
          lastActiveAt: t.lastActiveAt,
        })),
      },
    };
  }
}

// ==========================================
// 3. working_memory.pending
// ==========================================

export interface WorkingMemoryPendingInput {
  sessionId?: string;
  limit?: number;
}

export interface WorkingMemoryPendingOutput {
  total: number;
  pendingItems: Array<{
    id: string;
    type: string;
    description: string;
    priority: number;
    status: string;
  }>;
}

export class WorkingMemoryPendingTool implements ITool<WorkingMemoryPendingInput, WorkingMemoryPendingOutput> {
  public readonly id = 'working_memory.pending';
  public readonly name = 'List Pending Items';
  public readonly description = 'Lists open pending items, unanswered questions, and required actions in working memory.';
  public readonly version = '1.0.0';
  public readonly category = 'working_memory';
  public readonly riskLevel = DangerTier.TIER_0;
  public readonly requiresApproval = false;
  public readonly capabilities = ['working_memory.pending', 'working_memory.read'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      sessionId: { type: 'string', description: 'Session identifier' },
      limit: { type: 'number', description: 'Max items to return' },
    },
  };

  private readonly engine: WorkingMemoryEngine;

  constructor(engine: WorkingMemoryEngine) {
    this.engine = engine;
  }

  public async execute(
    input: WorkingMemoryPendingInput,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult<WorkingMemoryPendingOutput>> {
    const startTime = Date.now();
    const sessionId = input.sessionId || context.sessionId || 'default';
    const pending = this.engine.pendingRepo.listOpenBySession(sessionId, input.limit || 20);

    return {
      success: true,
      durationMs: Date.now() - startTime,
      output: {
        total: pending.length,
        pendingItems: pending.map((p) => ({
          id: p.id,
          type: p.type,
          description: p.description,
          priority: p.priority,
          status: p.status,
        })),
      },
    };
  }
}

// ==========================================
// 4. working_memory.checkpoint
// ==========================================

export interface WorkingMemoryCheckpointInput {
  sessionId?: string;
  action: 'INSPECT_LATEST' | 'LIST';
  limit?: number;
}

export interface WorkingMemoryCheckpointOutput {
  checkpoint?: {
    id: string;
    title: string;
    threadId: string;
    status: string;
    project?: string;
    task?: string;
    blockers: string[];
    nextSteps: string[];
    createdAt: string;
  };
  checkpoints?: Array<{
    id: string;
    title: string;
    threadId: string;
    status: string;
    createdAt: string;
  }>;
}

export class WorkingMemoryCheckpointTool implements ITool<WorkingMemoryCheckpointInput, WorkingMemoryCheckpointOutput> {
  public readonly id = 'working_memory.checkpoint';
  public readonly name = 'Inspect Conversation Checkpoints';
  public readonly description = 'Inspects recent or latest conversation checkpoints for task resumption.';
  public readonly version = '1.0.0';
  public readonly category = 'working_memory';
  public readonly riskLevel = DangerTier.TIER_0;
  public readonly requiresApproval = false;
  public readonly capabilities = ['working_memory.checkpoint', 'working_memory.read'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      sessionId: { type: 'string', description: 'Session identifier' },
      action: {
        type: 'string',
        enum: ['INSPECT_LATEST', 'LIST'],
        description: 'Whether to inspect latest active checkpoint or list all',
      },
      limit: { type: 'number', description: 'Max checkpoints to return' },
    },
    required: ['action'],
  };

  private readonly engine: WorkingMemoryEngine;

  constructor(engine: WorkingMemoryEngine) {
    this.engine = engine;
  }

  public async execute(
    input: WorkingMemoryCheckpointInput,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult<WorkingMemoryCheckpointOutput>> {
    const startTime = Date.now();
    const sessionId = input.sessionId || context.sessionId || 'default';

    if (input.action === 'INSPECT_LATEST') {
      const cp = this.engine.checkpointManager.getLatestActiveCheckpoint(sessionId);
      if (!cp) {
        return { success: true, durationMs: Date.now() - startTime, output: {} };
      }
      return {
        success: true,
        durationMs: Date.now() - startTime,
        output: {
          checkpoint: {
            id: cp.id,
            title: cp.title,
            threadId: cp.threadId,
            status: cp.status,
            project: cp.state.targetProjectId,
            task: cp.state.taskDescription,
            blockers: cp.state.blockers,
            nextSteps: cp.state.nextSteps,
            createdAt: cp.createdAt,
          },
        },
      };
    }

    const list = this.engine.checkpointManager.listCheckpoints(sessionId);
    return {
      success: true,
      durationMs: Date.now() - startTime,
      output: {
        checkpoints: list.slice(0, input.limit || 20).map((c) => ({
          id: c.id,
          title: c.title,
          threadId: c.threadId,
          status: c.status,
          createdAt: c.createdAt,
        })),
      },
    };
  }
}
