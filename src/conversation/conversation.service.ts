/**
 * HṚṢĪKEŚA (हृषीकेश) — Sovereign Conversation Service
 *
 * Implements Low-Latency Chat Architecture & Fast Response SLA:
 * - Deterministic Fast Chat Gate for instantaneous conversational returns
 * - Immediate non-blocking acknowledgements for long-running tasks
 * - Token-level streaming support (SSE & direct generator callbacks)
 * - Decoupled background orchestration (memory indexing, embeddings, goal execution)
 * - Granular latency span telemetry (TTFB, TTFT, Total)
 */

import { SessionManager } from './session.manager.js';
import { ModelRouter } from '../models/router/model.router.js';
import { IdentityManager } from '../core/identity/identity.manager.js';
import { ILogger } from '../core/logging/logger.types.js';
import { ContextAssembler } from './context.assembler.js';
import { ChatMessage, ToolDefinition } from '../models/interfaces/model.types.js';
import { ToolExecutionBus } from '../tools/execution/tool.bus.js';
import { ToolRegistry } from '../tools/registry/tool.registry.js';
import { MissionOrchestrator } from '../agents/mission/mission.orchestrator.js';
import { FastChatGate } from './fast.chat.gate.js';
import { ChatLatencyTracker, latencyDiagnostics, ChatMetricsReport } from './latency.tracker.js';
import { EventBus } from '../core/events/event-bus.js';

export interface ToolExecutionSummary {
  readonly tool: string;
  readonly input: Record<string, unknown>;
  readonly output?: unknown;
  readonly error?: string;
  readonly durationMs: number;
}

export interface ConversationResponse {
  readonly success: boolean;
  readonly sessionId: string;
  readonly response: string;
  readonly model: string;
  readonly provider: string;
  readonly timestamp: string;
  readonly durationMs: number;
  readonly toolCallsExecuted?: readonly ToolExecutionSummary[];
  readonly missionId?: string;
  readonly goalId?: string;
  readonly intentMode?: string;
  readonly metrics?: ChatMetricsReport;
}

export class ConversationService {
  private readonly sessionManager: SessionManager;
  private readonly router: ModelRouter;
  private readonly identityManager: IdentityManager;
  private readonly contextAssembler?: ContextAssembler;
  private readonly logger?: ILogger;
  private readonly fastGate = new FastChatGate();
  private readonly eventBus?: EventBus;

  private toolBus?: ToolExecutionBus;
  private toolRegistry?: ToolRegistry;
  private missionOrchestrator?: MissionOrchestrator;
  private goalEngine?: import('../goal/engine/goal.execution.engine.js').GoalExecutionEngine;
  private maxToolIterations = 2;

  constructor(
    sessionManager: SessionManager,
    router: ModelRouter,
    identityManager: IdentityManager,
    logger?: ILogger,
    contextAssembler?: ContextAssembler,
    toolBus?: ToolExecutionBus,
    toolRegistry?: ToolRegistry,
    missionOrchestrator?: MissionOrchestrator,
    eventBus?: EventBus
  ) {
    this.sessionManager = sessionManager;
    this.router = router;
    this.identityManager = identityManager;
    this.logger = logger?.child('ConversationService');
    this.contextAssembler = contextAssembler;
    this.toolBus = toolBus;
    this.toolRegistry = toolRegistry;
    this.missionOrchestrator = missionOrchestrator;
    this.eventBus = eventBus;
  }

  public setToolExecution(bus: ToolExecutionBus, registry: ToolRegistry, maxIterations = 2): void {
    this.toolBus = bus;
    this.toolRegistry = registry;
    this.maxToolIterations = maxIterations;
  }

  public setMissionOrchestrator(orchestrator: MissionOrchestrator): void {
    this.missionOrchestrator = orchestrator;
  }

  public setGoalEngine(goalEngine: import('../goal/engine/goal.execution.engine.js').GoalExecutionEngine): void {
    this.goalEngine = goalEngine;
  }

  public setCompanyService(_companyService: import('../company/services/company.service.js').CompanyService): void {
    // Reserved for future company-goal orchestration integration
  }



  /**
   * Main conversational entrypoint with token-level streaming and low-latency fast-paths.
   */
  public async sendMessage(
    userMessage: string,
    sessionId?: string,
    preferredModel?: string,
    preferredProvider?: string,
    onToken?: (token: string) => void
  ): Promise<ConversationResponse> {
    const trimmed = userMessage.trim();
    if (!trimmed) {
      throw new Error('Message cannot be empty.');
    }

    const tracker = new ChatLatencyTracker();
    tracker.startSpan('total_request');

    const session = this.sessionManager.getOrCreateSession(sessionId);

    // 1. Append user message to durable session immediately
    tracker.startSpan('session_persistence');
    this.sessionManager.addMessage(session.id, 'user', trimmed);
    tracker.endSpan('session_persistence');

    // 2. Fast Chat Gate Evaluation (< 2ms)
    tracker.startSpan('fast_gate');
    tracker.markRoutingStarted();
    const ownerName = this.identityManager.getOwnerIdentity().fullName;
    const gateDecision = this.fastGate.evaluate(trimmed, ownerName);
    tracker.endSpan('fast_gate');

    // Path A: Deterministic Instant Response (Casual Greetings, Courtesies, Identity) -> TTFB < 5ms
    if (gateDecision.isDeterministicInstant && gateDecision.instantResponse) {
      tracker.markFirstVisibleResponse();
      const instantText = gateDecision.instantResponse;

      if (onToken) {
        onToken(instantText);
      }

      this.sessionManager.addMessage(session.id, 'assistant', instantText, {
        model: 'fast-gate-instant',
        provider: 'local',
        metadata: { intent: gateDecision.intent, fastPath: true }
      });

      const metrics = tracker.complete();
      latencyDiagnostics.record(metrics);

      return {
        success: true,
        sessionId: session.id,
        response: instantText,
        model: 'fast-gate-instant',
        provider: 'local',
        timestamp: new Date().toISOString(),
        durationMs: metrics.totalDurationMs,
        intentMode: gateDecision.intent,
        metrics
      };
    }

    // Path B: Immediate Acknowledgement for Tasks (Computer, Research, Goal, Company)
    if (gateDecision.requiresImmediateAck && gateDecision.ackResponse) {
      tracker.markFirstVisibleResponse();
      const ackText = gateDecision.ackResponse;

      if (onToken) {
        onToken(ackText);
      }

      this.sessionManager.addMessage(session.id, 'assistant', ackText, {
        model: 'system-ack',
        provider: 'local',
        metadata: { intent: gateDecision.intent, status: 'ACCEPTED' }
      });

      // Spawn background task asynchronously without blocking chat response
      tracker.markBackgroundWorkStarted();
      this.dispatchBackgroundTask(trimmed, session.id, gateDecision.intent, gateDecision.suggestedAgentId)
        .then(() => {
          tracker.markBackgroundWorkCompleted();
        })
        .catch((err) => {
          this.logger?.warn('Background task execution notice:', err);
        });

      const metrics = tracker.complete();
      latencyDiagnostics.record(metrics);

      return {
        success: true,
        sessionId: session.id,
        response: ackText,
        model: 'system-ack',
        provider: 'local',
        timestamp: new Date().toISOString(),
        durationMs: metrics.totalDurationMs,
        intentMode: gateDecision.intent === 'GOAL_COMPANY_TASK' ? 'GOAL_REQUEST' : gateDecision.intent,
        metrics
      };
    }

    // Path C: Approval Response
    if (gateDecision.intent === 'APPROVAL_RESPONSE' && this.goalEngine) {
      const awaitingGoals = this.goalEngine.listGoals({ status: 'AWAITING_APPROVAL' });
      if (awaitingGoals.length > 0) {
        const targetGoal = awaitingGoals[0];
        const isApprove = trimmed.toLowerCase().includes('approve') || trimmed.toLowerCase().includes('proceed');
        let responseText = '';

        if (isApprove) {
          await this.goalEngine.resumeGoal(targetGoal.id);
          responseText = `✅ **Action Approved.** Resumed sovereign execution for Goal **${targetGoal.title}** (\`${targetGoal.id}\`). The workforce has been authorized to proceed.`;
        } else {
          this.goalEngine.cancelGoal(targetGoal.id, 'Rejected by operator in chat.');
          responseText = `🛑 **Action Rejected.** Execution for Goal **${targetGoal.title}** (\`${targetGoal.id}\`) was cancelled safely.`;
        }

        tracker.markFirstVisibleResponse();
        if (onToken) onToken(responseText);

        this.sessionManager.addMessage(session.id, 'assistant', responseText);
        const metrics = tracker.complete();
        latencyDiagnostics.record(metrics);

        return {
          success: true,
          sessionId: session.id,
          response: responseText,
          model: 'system',
          provider: 'local',
          timestamp: new Date().toISOString(),
          durationMs: metrics.totalDurationMs,
          goalId: targetGoal.id,
          intentMode: 'APPROVAL_RESPONSE',
          metrics
        };
      }
    }

    // Path D: Status Query
    if (gateDecision.intent === 'STATUS_QUERY' && (this.goalEngine || this.missionOrchestrator)) {
      const lines: string[] = ['### 📊 HṚṢĪKEŚA System & Workforce Status\n'];
      if (this.goalEngine) {
        const activeGoals = this.goalEngine.listGoals({ status: 'EXECUTING' });
        const pendingApproval = this.goalEngine.listGoals({ status: 'AWAITING_APPROVAL' });
        const completedGoals = this.goalEngine.listGoals({ status: 'COMPLETED' });

        lines.push(`**Autonomous Goals:**`);
        lines.push(`- Active / In-Progress: ${activeGoals.length}`);
        lines.push(`- Awaiting Human Approval: ${pendingApproval.length}`);
        lines.push(`- Completed: ${completedGoals.length}`);

        if (activeGoals.length > 0) {
          const g = activeGoals[0];
          const progress = this.goalEngine.getProgress(g.id);
          lines.push(`\n**Active Goal:** "${g.title}"`);
          lines.push(`- Progress: ${progress.milestonesCompleted}/${progress.milestonesTotal} milestones completed`);
        }
      }

      const statusResponse = lines.join('\n');
      tracker.markFirstVisibleResponse();
      if (onToken) onToken(statusResponse);

      this.sessionManager.addMessage(session.id, 'assistant', statusResponse);
      const metrics = tracker.complete();
      latencyDiagnostics.record(metrics);

      return {
        success: true,
        sessionId: session.id,
        response: statusResponse,
        model: 'system',
        provider: 'local',
        timestamp: new Date().toISOString(),
        durationMs: metrics.totalDurationMs,
        intentMode: 'STATUS_QUERY',
        metrics
      };
    }

    // Path E: Interactive Model Cognition & Streaming Response
    tracker.startSpan('context_assembly');
    const messages: ChatMessage[] = this.contextAssembler
      ? [...await this.contextAssembler.assembleContext(session.id, {
          tier: gateDecision.contextTier,
          query: trimmed,
          skipSemanticRecall: gateDecision.skipMemoryRecall
        })]
      : [...this.sessionManager.getBoundedHistory(session.id, this.buildSystemPrompt())];
    tracker.endSpan('context_assembly');

    // Prepare candidate tools only when relevant (skipping for simple conversation turns)
    const availableTools: ToolDefinition[] = [];
    if (this.toolRegistry && !gateDecision.skipToolAttachment) {
      tracker.startSpan('tool_selection');
      const lowerMsg = trimmed.toLowerCase();
      const allTools = this.toolRegistry.list();

      const relevantTools = allTools.filter((tool) => {
        const id = tool.id.toLowerCase();
        if (id === 'system.info' || id === 'time.now') return true;
        if ((lowerMsg.includes('browse') || lowerMsg.includes('web') || lowerMsg.includes('url') || lowerMsg.includes('page') || lowerMsg.includes('search') || lowerMsg.includes('http')) && id.startsWith('browser.')) return true;
        if ((lowerMsg.includes('file') || lowerMsg.includes('read') || lowerMsg.includes('write') || lowerMsg.includes('dir') || lowerMsg.includes('folder')) && id.startsWith('filesystem.')) return true;
        if ((lowerMsg.includes('terminal') || lowerMsg.includes('command') || lowerMsg.includes('exec') || lowerMsg.includes('run') || lowerMsg.includes('python')) && id === 'terminal.execute') return true;
        return false;
      });

      if (relevantTools.length > 0) {
        for (const tool of relevantTools.slice(0, 6)) {
          availableTools.push({
            name: tool.id,
            description: tool.description,
            parameters: tool.inputSchema
          });
        }
      }
      tracker.endSpan('tool_selection');
    }

    let currentModel = '';
    let currentProvider = '';
    let finalAssistantText = '';
    const executedTools: ToolExecutionSummary[] = [];

    /**
     * Core System Invariant: Conversational responsiveness is INDEPENDENT of
     * task completion time, model availability, or resource pressure.
     * On any inference failure, return a graceful soft-degraded response (200)
     * rather than propagating an error that would cause the HTTP layer to 422.
     */
    const executeInference = async (): Promise<void> => {
      let iteration = 0;
      while (iteration <= this.maxToolIterations) {
        iteration++;

        tracker.markModelStarted();
        tracker.startSpan('model_inference');

        let hasEmittedFirstToken = false;
        const modelResponse = await this.router.routeAndExecuteChat({
          messages,
          preferredModel,
          preferredProvider,
          temperature: 0.7,
          maxTokens: 512,
          tools: availableTools.length > 0 ? availableTools : undefined,
          stream: true,
          onToken: (tok: string) => {
            if (!hasEmittedFirstToken) {
              hasEmittedFirstToken = true;
              tracker.markModelFirstToken();
            }
            if (onToken) {
              onToken(tok);
            }
          }
        });

        tracker.endSpan('model_inference');
        currentModel = modelResponse.modelId;
        currentProvider = modelResponse.providerId;

        // Check if model emitted tool proposals
        if (
          modelResponse.toolCalls &&
          modelResponse.toolCalls.length > 0 &&
          this.toolBus &&
          iteration <= this.maxToolIterations
        ) {
          tracker.startSpan('tool_execution');
          messages.push({
            role: 'assistant',
            content: modelResponse.text || '',
            toolCalls: modelResponse.toolCalls
          });

          for (const tc of modelResponse.toolCalls) {
            const execResult = await this.toolBus.execute(
              tc.name,
              tc.arguments,
              { sessionId: session.id, userId: 'ROOT_RUSHIKESH' }
            );

            executedTools.push({
              tool: tc.name,
              input: tc.arguments,
              output: execResult.output,
              error: execResult.error,
              durationMs: execResult.durationMs
            });

            const toolContent = execResult.success
              ? (typeof execResult.output === 'string' ? execResult.output : JSON.stringify(execResult.output))
              : `Error: ${execResult.error || 'Tool execution failed.'}`;

            messages.push({
              role: 'tool',
              content: toolContent,
              toolCallId: tc.id
            });
          }
          tracker.endSpan('tool_execution');
          continue;
        }

        finalAssistantText = modelResponse.text;
        break;
      }
    };

    try {
      await executeInference();
    } catch (inferenceErr: any) {
      const errMsg: string = inferenceErr?.message ?? String(inferenceErr);
      const isLockContention = errMsg.includes('concurrency limit') || errMsg.includes('ADR-006');
      const isNoModel = errMsg.includes('No active AI models') || errMsg.includes('No capable');

      this.logger?.warn(`[ConversationService] Inference soft-failure (graceful degraded response): ${errMsg}`);

      // If it's a lock contention error, wait briefly and retry once
      if (isLockContention) {
        this.logger?.warn('[ConversationService] Lock contention — waiting 2s then retrying inference once.');
        await new Promise<void>((resolve) => setTimeout(resolve, 2000));
        try {
          await executeInference();
        } catch (retryErr: any) {
          this.logger?.warn(`[ConversationService] Retry also failed: ${retryErr?.message}`);
          // Fall through to soft degraded response below
        }
      }

      // If still no response, build a polite degraded response so HTTP always returns 200
      if (!finalAssistantText) {
        tracker.markFirstVisibleResponse();
        let degradedMsg: string;
        if (isNoModel) {
          degradedMsg = `⚠️ I am currently unable to access my neural reasoning engine — no AI model is available at this moment. Please ensure Ollama is running with a local model (e.g., \`ollama run qwen2.5:7b\`) and try again shortly.`;
        } else if (isLockContention) {
          degradedMsg = `⏳ My cognition engine is currently occupied with another inference task. Your message has been received and stored. Please send it again in a moment when I am available.`;
        } else {
          degradedMsg = `⚠️ HṚṢĪKEŚA encountered a temporary internal issue while processing your request. Your message has been recorded. Please try again shortly.`;
        }

        if (onToken) onToken(degradedMsg);
        finalAssistantText = degradedMsg;
        currentModel = 'system-degraded';
        currentProvider = 'local';
      }
    }

    // Append final assistant response to session
    tracker.startSpan('session_persistence');
    this.sessionManager.addMessage(session.id, 'assistant', finalAssistantText, {
      model: currentModel,
      provider: currentProvider,
      metadata: { toolCallsCount: executedTools.length }
    });
    tracker.endSpan('session_persistence');

    const metrics = tracker.complete();
    latencyDiagnostics.record(metrics);

    return {
      success: true,
      sessionId: session.id,
      response: finalAssistantText,
      model: currentModel,
      provider: currentProvider,
      timestamp: new Date().toISOString(),
      durationMs: metrics.totalDurationMs,
      toolCallsExecuted: executedTools.length > 0 ? executedTools : undefined,
      intentMode: gateDecision.intent,
      metrics
    };
  }

  /**
   * Dispatches long-running background tasks without blocking chat.
   */
  private async dispatchBackgroundTask(
    prompt: string,
    sessionId: string,
    _intent: string,
    suggestedAgentId = 'gandiva'
  ): Promise<void> {
    try {
      if (this.missionOrchestrator) {
        const mission = await this.missionOrchestrator.planAndCreateMission({
          objective: prompt,
          sessionId,
          rootAgentId: suggestedAgentId
        });

        this.eventBus?.emit('mission.created' as any, {
          missionId: mission.id,
          objective: prompt,
          status: 'ACCEPTED'
        } as any);

        // Trigger execution asynchronously
        this.missionOrchestrator.executeMission(mission.id).catch((err) => {
          this.logger?.warn(`Background mission execution notice [${mission.id}]:`, { error: String(err) });
        });
      }
    } catch (err) {
      this.logger?.warn('Background task dispatch notice:', { error: String(err) });
    }
  }

  public getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  private buildSystemPrompt(): string {
    const sys = this.identityManager.getSystemIdentity();
    const owner = this.identityManager.getOwnerIdentity();

    return [
      `You are ${sys.name} (${sys.sanskrit} / ${sys.internationalSpelling}), a sovereign personal AI operating system and autonomous AI workforce control plane.`,
      `Your sole creator, developer, and master is ${owner.fullName}.`,
      `You are currently operating on Rushikesh's local workstation (Acer Swift, 16 GB RAM, Intel Core Ultra 5 125H) with the local neural model Qwen 2.5 (7B) hosted via Ollama.`,
      `Identity Invariants:`,
      `- Your sovereign persona, OS control plane, and identity is ${sys.name}.`,
      `- The underlying local neural language model executing your reasoning is Qwen (qwen2.5:7b).`,
      `- Do not pretend that Qwen itself is ${sys.name}; you are the sovereign OS orchestrator operating through Qwen as your local cognition engine.`,
      `- Maintain accurate conversation context across multiple turns.`,
      `- When tools are available to answer queries about the environment, files, or system, call the appropriate tool.`
    ].join('\n');
  }
}
