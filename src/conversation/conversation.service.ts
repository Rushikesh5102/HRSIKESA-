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
import { InferenceScheduler } from '../inference/inference.scheduler.js';
import { CancellationManager } from './cancellation.manager.js';
import { ChatNamer } from './chat.namer.js';
import { ExecutionPolicyEngine } from './execution.policy.js';
import { ResponseMode, getResponseModeConfig } from '../inference/backend.types.js';

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
  readonly responseMode?: ResponseMode;
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
  private researchEngine?: import('../research/engine/research.engine.js').ResearchEngine;
  private workingMemoryEngine?: import('../working-memory/services/working-memory.engine.js').WorkingMemoryEngine;
  private maxToolIterations = 2;

  /** In-flight background mission IDs: tracked so shutdown() can cancel them. */
  private readonly _backgroundMissionIds = new Set<string>();
  /** In-flight background task promises: awaited on shutdown() drain. */
  private readonly _backgroundTasks = new Set<Promise<unknown>>();
  private _shuttingDown = false;

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

  public setResearchEngine(researchEngine: import('../research/engine/research.engine.js').ResearchEngine): void {
    this.researchEngine = researchEngine;
  }

  public setCompanyService(_companyService: import('../company/services/company.service.js').CompanyService): void {
    // Reserved for future company-goal orchestration integration
  }

  public setKnowledgeContextAssembler(assembler: import('../knowledge/services/knowledge-context-assembler.js').KnowledgeContextAssembler): void {
    if (this.contextAssembler) {
      this.contextAssembler.setKnowledgeAssembler(assembler);
    }
  }

  public setCognitiveContextEngine(engine: import('../context/services/cognitive-context-engine.js').CognitiveContextEngine): void {
    if (this.contextAssembler) {
      this.contextAssembler.setCognitiveEngine(engine);
    }
  }

  public setWorkingMemoryEngine(engine: import('../working-memory/services/working-memory.engine.js').WorkingMemoryEngine): void {
    this.workingMemoryEngine = engine;
    if (this.contextAssembler) {
      this.contextAssembler.setWorkingMemoryEngine(engine);
    }
  }



  /**
   * Main conversational entrypoint with token-level streaming and low-latency fast-paths.
   */
  public async sendMessage(
    userMessage: string,
    sessionId?: string,
    preferredModel?: string,
    preferredProvider?: string,
    onToken?: (token: string) => void,
    responseMode?: ResponseMode
  ): Promise<ConversationResponse> {
    const trimmed = userMessage.trim();
    if (!trimmed) {
      throw new Error('Message cannot be empty.');
    }

    const tracker = new ChatLatencyTracker();
    tracker.startSpan('total_request');

    const session = this.sessionManager.getOrCreateSession(sessionId);

    // 0. High-Priority Interrupt / STOP Command Check (Instant abort without LLM invocation)
    if (CancellationManager.isInterruptCommand(trimmed)) {
      CancellationManager.getInstance().cancelSession(session.id, 'Operator interrupt command.');
      const cancelText = '🛑 **Generation Stopped:** Active model inference and tool execution have been safely cancelled.';
      if (onToken) onToken(cancelText);
      this.sessionManager.addMessage(session.id, 'assistant', cancelText);
      const metrics = tracker.complete();
      latencyDiagnostics.record(metrics);
      return {
        success: true,
        sessionId: session.id,
        response: cancelText,
        model: 'system-interrupt',
        provider: 'local',
        timestamp: new Date().toISOString(),
        durationMs: metrics.totalDurationMs,
        intentMode: 'STATUS_QUERY',
        metrics
      };
    }

    // 1. Append user message to durable session immediately
    tracker.startSpan('session_persistence');
    this.sessionManager.addMessage(session.id, 'user', trimmed);
    tracker.endSpan('session_persistence');

    // Asynchronously name the conversation in background (ChatGPT-style, non-blocking)
    ChatNamer.nameSessionAsync(session.id, trimmed, this.sessionManager).catch(() => {});

    // 2. Fast Chat Gate Evaluation (< 2ms)
    tracker.startSpan('fast_gate');
    tracker.markRoutingStarted();
    const ownerName = this.identityManager.getOwnerIdentity().fullName;
    const gateDecision = this.fastGate.evaluate(trimmed, ownerName);
    tracker.endSpan('fast_gate');

    // Path A: Deterministic Instant Response (Casual Greetings, Courtesies, Identity, Live Time/Date) -> TTFB < 5ms
    if (gateDecision.isDeterministicInstant && gateDecision.instantResponse) {
      tracker.markFirstVisibleResponse();
      let instantText = gateDecision.instantResponse;

      // Deterministic tool optimization: If ToolBus is wired, route live time/date through ToolBus to enforce permissions & audit
      if (this.toolBus && (gateDecision.intent === 'TIME_QUERY' || gateDecision.intent === 'DATE_QUERY')) {
        try {
          const toolRes = await this.toolBus.execute('time.now', {}, {
            sessionId: session.id,
            userId: 'ROOT_RUSHIKESH'
          });
          if (toolRes.success && toolRes.output) {
            const out = toolRes.output as any;
            if (gateDecision.intent === 'TIME_QUERY') {
              instantText = `The current system time is **${new Date(out.unixMs).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })} IST** (ISO: \`${out.iso}\`).`;
            } else {
              instantText = `Today is **${new Date(out.unixMs).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}** (System ISO: \`${out.iso}\`).`;
            }
          }
        } catch {
          // Graceful fallback to gateDecision instantResponse
        }
      }

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
    if (this.workingMemoryEngine) {
      try {
        await this.workingMemoryEngine.processIncomingTurn(trimmed, session.id);
      } catch {
        // Non-blocking working memory safety
      }
    }

    // Execution-First Policy Evaluation: Check if clarification is strictly required
    const execDecision = ExecutionPolicyEngine.evaluate(trimmed, {
      intent: gateDecision.intent,
      hasTools: !gateDecision.skipToolAttachment,
    });

    if (execDecision.action === 'ASK_CLARIFICATION' && execDecision.blockingQuestion) {
      tracker.markFirstVisibleResponse();
      if (onToken) onToken(execDecision.blockingQuestion);
      this.sessionManager.addMessage(session.id, 'assistant', execDecision.blockingQuestion);
      const metrics = tracker.complete();
      latencyDiagnostics.record(metrics);
      return {
        success: true,
        sessionId: session.id,
        response: execDecision.blockingQuestion,
        model: 'system-policy',
        provider: 'local',
        timestamp: new Date().toISOString(),
        durationMs: metrics.totalDurationMs,
        intentMode: 'CLARIFICATION_REQUIRED',
        metrics
      };
    }

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
        if ((lowerMsg.includes('hardware') || lowerMsg.includes('spec') || lowerMsg.includes('battery') || lowerMsg.includes('cpu') || lowerMsg.includes('ram')) && id === 'system.info') return true;
        if ((lowerMsg.includes('what time') || lowerMsg.includes('what date') || lowerMsg.includes('clock')) && id === 'time.now') return true;
        if ((lowerMsg.includes('browse') || lowerMsg.includes('web') || lowerMsg.includes('url') || lowerMsg.includes('page') || lowerMsg.includes('search') || lowerMsg.includes('http')) && id.startsWith('browser.')) return true;
        if ((lowerMsg.includes('file') || lowerMsg.includes('read') || lowerMsg.includes('write') || lowerMsg.includes('dir') || lowerMsg.includes('folder') || lowerMsg.includes('directory') || lowerMsg.includes('list files')) && id.startsWith('filesystem.')) return true;
        if ((lowerMsg.includes('terminal') || lowerMsg.includes('command') || lowerMsg.includes('exec') || lowerMsg.includes('run') || lowerMsg.includes('bash') || lowerMsg.includes('powershell')) && id === 'terminal.execute') return true;
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

    const effectiveMode = responseMode || this.detectResponseMode(trimmed, gateDecision.intent);
    const modeConfig = getResponseModeConfig(effectiveMode);

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
      // Fast Hardware-Agnostic Direct Inference (Llama.cpp Intel Arc GPU / Multi-Threaded CPU)
      const hasMockProvider = this.router &&
        typeof (this.router as any).getRegistry === 'function' &&
        (this.router as any).getRegistry()?.getAllRecords()?.some((r: any) => r.provider?.id?.includes('mock') || r.models?.some((m: any) => m.id?.includes('mock')));

      if (availableTools.length === 0 && !hasMockProvider) {
        try {
          tracker.markModelStarted();
          tracker.startSpan('model_inference');
          let hasEmittedFirstToken = false;
          const cancelToken = CancellationManager.getInstance().createTokenForSession(session.id);

          const schedResult = await InferenceScheduler.getInstance().scheduleAndExecute({
            messages,
            preferredModel,
            tier: preferredModel ? undefined : 'T2',
            responseMode: effectiveMode,
            temperature: 0.7,
            maxTokens: modeConfig.maxTokens,
            cancellationToken: cancelToken,
            sessionId: session.id,
            onToken: (tok: string) => {
              if (!hasEmittedFirstToken) {
                hasEmittedFirstToken = true;
                tracker.markModelFirstToken();
              }
              if (onToken) onToken(tok);
            }
          });

          tracker.endSpan('model_inference');
          currentModel = schedResult.modelId;
          currentProvider = schedResult.backendType.toLowerCase();
          finalAssistantText = schedResult.text;
          return;
        } catch (schedErr: any) {
          this.logger?.warn(`Direct hardware-agnostic inference fallback: ${schedErr?.message}`);
        }
      }

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
          maxTokens: modeConfig.maxTokens,
          priority: 'HIGH',
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

    if (this.workingMemoryEngine) {
      // Non-blocking asynchronous working memory turn update (Part M SLA requirement)
      this.workingMemoryEngine.processOutgoingTurn(session.id, finalAssistantText).catch(() => {});
    }

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
      responseMode: effectiveMode,
      metrics
    };
  }

  /**
   * Auto-detects appropriate response mode for simple or deep requests (Part C).
   */
  private detectResponseMode(message: string, intent: string): ResponseMode {
    const lower = message.toLowerCase();
    // Simple / quick queries -> CONCISE (e.g. quick tip, one-liner, short summary)
    if (
      lower.includes('quick tip') ||
      lower.includes('give me a tip') ||
      lower.includes('simple tip') ||
      lower.includes('briefly') ||
      lower.includes('in short') ||
      lower.includes('in one sentence') ||
      lower.includes('one sentence') ||
      lower.includes('tl;dr') ||
      lower.includes('tldr') ||
      lower.includes('short summary') ||
      lower.includes('quick typescript') ||
      lower.includes('quick python') ||
      (intent === 'GENERAL_CONVERSATION' && lower.length < 35 && (lower.startsWith('what is') || lower.startsWith('how to') || lower.startsWith('define')))
    ) {
      return 'CONCISE';
    }

    if (
      lower.includes('deep dive') ||
      lower.includes('in-depth') ||
      lower.includes('detailed breakdown') ||
      lower.includes('comprehensive analysis')
    ) {
      return 'DEEP';
    }

    if (
      lower.includes('explain in detail') ||
      lower.includes('detailed explanation') ||
      lower.includes('step by step') ||
      lower.includes('with examples')
    ) {
      return 'DETAILED';
    }

    return 'NORMAL';
  }

  /**
   * Dispatches long-running background tasks without blocking chat.
   */
  private async dispatchBackgroundTask(
    prompt: string,
    sessionId: string,
    intent: string,
    suggestedAgentId = 'gandiva'
  ): Promise<void> {
    try {
      if (this.goalEngine && (intent === 'GOAL_COMPANY_TASK' || prompt.toLowerCase().startsWith('goal:'))) {
        try {
          const goal = this.goalEngine.createGoal({
            title: prompt.slice(0, 100),
            description: prompt,
            objective: prompt
          });
          this.eventBus?.emit('goal.created' as any, { goalId: goal.id, title: goal.title } as any);
        } catch (err: unknown) {
          this.logger?.warn('Background goal creation notice:', { error: String(err) });
        }
      }

      if (this.researchEngine && intent === 'RESEARCH_TASK') {
        try {
          const study = await this.researchEngine.createStudy(prompt, 'ROOT_RUSHIKESH');
          this.eventBus?.emit('research.created' as any, {
            studyId: study.id,
            topic: study.title,
            status: 'ACCEPTED'
          } as any);

          // Trigger execution asynchronously without blocking chat — tracked for clean shutdown drain.
          if (!this._shuttingDown) {
            const resTask = this.researchEngine.executeStudy(study.id)
              .catch((err) => {
                this.logger?.warn(`Background research execution notice [${study.id}]:`, { error: String(err) });
              })
              .finally(() => {
                this._backgroundTasks.delete(resTask!);
              });
            this._backgroundTasks.add(resTask);
          }
        } catch (err: unknown) {
          this.logger?.warn('Background research creation notice:', { error: String(err) });
        }
      } else if (this.missionOrchestrator) {
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

        // Trigger execution asynchronously — tracked so shutdown() can cancel and drain it.
        if (!this._shuttingDown) {
          this._backgroundMissionIds.add(mission.id);
          const task = this.missionOrchestrator.executeMission(mission.id)
            .catch((err) => {
              this.logger?.warn(`Background mission execution notice [${mission.id}]:`, { error: String(err) });
            })
            .finally(() => {
              this._backgroundMissionIds.delete(mission.id);
              this._backgroundTasks.delete(task!);
            });
          this._backgroundTasks.add(task);
        }
      }
    } catch (err) {
      this.logger?.warn('Background task dispatch notice:', { error: String(err) });
    }
  }

  /**
   * Gracefully shuts down the ConversationService.
   *
   * Cancels all in-flight background missions so their promises settle promptly,
   * then waits up to 5 seconds for any remaining task promises to drain.
   * This prevents the process from hanging after kernel.shutdown() when
   * fire-and-forget executeMission() calls are still pending in the event loop.
   */
  public async shutdown(): Promise<void> {
    this._shuttingDown = true;

    // Cancel all missions that are still in-flight
    if (this.missionOrchestrator && this._backgroundMissionIds.size > 0) {
      for (const missionId of Array.from(this._backgroundMissionIds)) {
        try {
          await this.missionOrchestrator.cancelMission(missionId, 'Kernel shutdown');
        } catch {
          // Ignore — mission may have already completed or failed
        }
      }
    }

    // Drain remaining promise references with a bounded timeout
    if (this._backgroundTasks.size > 0) {
      const drain = Promise.allSettled(Array.from(this._backgroundTasks));
      const timeout = new Promise<void>((resolve) => {
        const t = setTimeout(resolve, 5000);
        // Unref so this timer itself does not prevent process exit
        if (typeof (t as any).unref === 'function') (t as any).unref();
      });
      await Promise.race([drain, timeout]);
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
      `English Self-Name: In English conversation, refer to yourself naturally as 'Rishi' (e.g. "I’m Rishi").`,
      `Execution-First Policy: If a user request is actionable and sufficiently specified, execute immediately. Do not ask unnecessary clarification questions; use safe defaults, project knowledge, and available tools. Ask only for irreversible/high-risk actions or when missing essential inputs.`,
      `You are operating on Rushikesh's local workstation (Intel Core Ultra 5 125H, Intel Arc GPU, 16 GB RAM) with hardware-agnostic local neural inference (Vulkan GPU & CPU).`,
      `Identity Invariants:`,
      `- Your sovereign persona, OS control plane, and identity is ${sys.name}. In English, you are Rishi.`,
      `- Maintain accurate conversation context across multiple turns.`,
      `- When tools are available to answer queries about the environment, files, or system, call the appropriate tool.`
    ].join('\n');
  }
}
