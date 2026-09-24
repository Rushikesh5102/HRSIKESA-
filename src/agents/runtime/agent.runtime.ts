/**
 * HRSIKESA - Agent Execution Runtime
 *
 * SECURITY: Every tool call from every agent MUST pass through PermissionManager ->
 * ToolExecutionBus -> Tool -> Audit. Agents cannot bypass this pipeline.
 */

import { randomUUID } from 'node:crypto';
import { AgentRegistry } from '../registry/agent.registry.js';
import { AgentTask, AgentResult, AgentToolCallRecord } from '../interfaces/task.types.js';
import { MissionBudgetTracker } from '../interfaces/mission.types.js';
import { ToolExecutionBus } from '../../tools/execution/tool.bus.js';
import { ToolRegistry } from '../../tools/registry/tool.registry.js';
import { ModelRouter } from '../../models/router/model.router.js';
import { ChatMessage, ChatRequest, ToolDefinition } from '../../models/interfaces/model.types.js';
import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';

const MAX_TOOL_ITERATIONS = 3;

export class AgentRuntime {
  private readonly agentRegistry: AgentRegistry;
  private readonly toolRegistry: ToolRegistry;
  private readonly toolBus: ToolExecutionBus;
  private readonly modelRouter: ModelRouter;
  private readonly logger?: ILogger;
  private readonly eventBus?: EventBus;

  constructor(
    agentRegistry: AgentRegistry,
    toolRegistry: ToolRegistry,
    toolBus: ToolExecutionBus,
    modelRouter: ModelRouter,
    eventBus?: EventBus,
    logger?: ILogger
  ) {
    this.agentRegistry = agentRegistry;
    this.toolRegistry = toolRegistry;
    this.toolBus = toolBus;
    this.modelRouter = modelRouter;
    this.eventBus = eventBus;
    this.logger = logger?.child('AgentRuntime');
  }

  public async execute(task: AgentTask, budgetTracker?: MissionBudgetTracker): Promise<AgentResult> {
    const startedAt = new Date().toISOString();
    const toolCallRecords: AgentToolCallRecord[] = [];
    const errors: string[] = [];

    const agent = this.agentRegistry.get(task.agentId);
    if (!agent) {
      return {
        taskId: task.id,
        agentId: task.agentId,
        status: 'failed',
        summary: `Agent '${task.agentId}' not found in registry.`,
        toolCalls: [],
        childTaskIds: [],
        errors: [`Agent '${task.agentId}' is not registered.`],
        startedAt,
        completedAt: new Date().toISOString()
      };
    }

    try {
      this.agentRegistry.updateStatus(task.agentId, 'working');
    } catch { /* non-fatal */ }

    this.logger?.info(`Executing task [${task.id}] for agent [${agent.displayName}] (${agent.role})`);
    this.eventBus?.emit('agent.task_started', { taskId: task.id, agentId: task.agentId });

    try {
      // 1. FAST-PATH: Deterministic tool execution without LLM reasoning
      const deterministicAction = task.deterministicToolAction ||
        (task.inputs?.tool && typeof task.inputs.tool === 'string'
          ? { tool: task.inputs.tool, input: (task.inputs.input as Record<string, unknown>) || {} }
          : undefined);

      if (deterministicAction && deterministicAction.tool) {
        const toolName = deterministicAction.tool;
        const toolInput = deterministicAction.input || {};

        if (!agent.allowedTools.includes(toolName)) {
          const secErr = `SECURITY VIOLATION: Agent '${agent.id}' cannot call tool '${toolName}' (not in allowedTools).`;
          this.logger?.warn(secErr);
          try { this.agentRegistry.updateStatus(task.agentId, 'failed'); } catch { /* non-fatal */ }
          return {
            taskId: task.id,
            agentId: task.agentId,
            status: 'failed',
            summary: secErr,
            toolCalls: [{ tool: toolName, input: toolInput, success: false, durationMs: 0, error: secErr }],
            childTaskIds: [],
            errors: [secErr],
            startedAt,
            completedAt: new Date().toISOString()
          };
        }

        const toolStart = Date.now();
        const toolResult = await this.toolBus.execute(toolName, toolInput, {
          requestId: randomUUID(),
          sessionId: task.sessionId,
          agentId: task.agentId,
          userId: 'ROOT_RUSHIKESH',
          environment: 'development',
          workspaceRoot: process.cwd(),
          approvalId: task.approvalId
        });
        const toolDuration = Date.now() - toolStart;

        toolCallRecords.push({
          tool: toolName,
          input: toolInput,
          output: toolResult.output,
          success: toolResult.success,
          durationMs: toolDuration,
          error: toolResult.error
        });

        // Check if approval was required
        if (!toolResult.success && toolResult.error && (toolResult.error.includes('Approval Request ID') || toolResult.error.includes('human authorization'))) {
          const match = toolResult.error.match(/apr_[a-zA-Z0-9_]+/);
          const approvalId = match ? match[0] : undefined;

          try { this.agentRegistry.updateStatus(task.agentId, 'idle'); } catch { /* non-fatal */ }
          this.eventBus?.emit('agent.task_completed', { taskId: task.id, agentId: task.agentId });

          return {
            taskId: task.id,
            agentId: task.agentId,
            status: 'blocked',
            pendingApprovalId: approvalId,
            requiresApproval: true,
            summary: `Action requires human approval: ${toolResult.error}`,
            output: toolResult.output,
            toolCalls: toolCallRecords,
            childTaskIds: [],
            errors: [toolResult.error],
            startedAt,
            completedAt: new Date().toISOString()
          };
        }

        const completedAt = new Date().toISOString();
        try { this.agentRegistry.updateStatus(task.agentId, 'idle'); } catch { /* non-fatal */ }
        this.eventBus?.emit('agent.task_completed', { taskId: task.id, agentId: task.agentId });

        return {
          taskId: task.id,
          agentId: task.agentId,
          status: toolResult.success ? 'completed' : 'failed',
          summary: toolResult.success
            ? `Deterministic tool [${toolName}] executed successfully by ${agent.displayName}.`
            : `Deterministic tool [${toolName}] failed: ${toolResult.error}`,
          output: toolResult.output,
          evidence: [`Tool: ${toolName} -> ${toolResult.success ? 'success' : 'failed: ' + toolResult.error}`],
          toolCalls: toolCallRecords,
          childTaskIds: [],
          errors: toolResult.success ? [] : [toolResult.error || 'Execution failed'],
          startedAt,
          completedAt
        };
      }

      // 2. OPEN-ENDED AGENT REASONING VIA LLM
      const permittedTools: ToolDefinition[] = [];
      for (const toolId of agent.allowedTools) {
        const tool = this.toolRegistry.get(toolId);
        if (tool) {
          permittedTools.push({
            name: tool.id,
            description: tool.description,
            parameters: (tool.inputSchema || {}) as Record<string, unknown>
          });
        }
      }

      const messages: ChatMessage[] = [];
      const sovereignDirectives = [
        agent.systemPrompt,
        `\nSOVEREIGN CAPABILITIES & ZERO-CONSTRAINT MANDATE:`,
        `1. External Data Access: You HAVE direct access to browser and web tools (${agent.allowedTools.filter(t => t.startsWith('browser.') || t.startsWith('filesystem.')).join(', ') || 'browser.*'}). NEVER claim you cannot access the internet or external data.`,
        `2. Real-Time Data: You HAVE real-time clock and telemetry tools (${agent.allowedTools.filter(t => t.includes('time') || t.includes('environment') || t.includes('system')).join(', ') || 'time.now'}). NEVER claim you lack real-time data.`,
        `3. Physical & Computer OS Control: You HAVE full operating system, computer automation, terminal command, and tool execution capabilities (${agent.allowedTools.filter(t => t.startsWith('computer.') || t.startsWith('terminal.')).join(', ') || 'computer.*, terminal.*'}). NEVER claim you cannot perform actions or interact with the computer.`,
        `4. Complex Predictive Analytics: You HAVE advanced computational modeling and reasoning capabilities. NEVER claim your predictive capabilities are strictly limited to static pre-training data.`,
        `5. Autonomous Execution: Use your permitted tools proactively to achieve the objective.`
      ].join('\n');
      messages.push({ role: 'system', content: sovereignDirectives });
      if (task.context) {
        messages.push({ role: 'system', content: 'Context:\n' + task.context });
      }
      messages.push({ role: 'user', content: task.objective });

      let finalContent = '';
      let iterationCount = 0;
      let blockedApprovalId: string | undefined;

      while (iterationCount < MAX_TOOL_ITERATIONS) {
        iterationCount++;

        // Enforce mission-wide model budget
        if (budgetTracker) {
          budgetTracker.recordModelCall();
        }

        const request: ChatRequest = {
          messages,
          preferredModel: agent.modelPreference.preferredModelId,
          preferredProvider: agent.modelPreference.preferredProviderId,
          tools: permittedTools.length > 0 ? permittedTools : undefined,
          maxTokens: 256,
          timeoutMs: 90000
        };

        const modelResponse = await this.modelRouter.routeAndExecuteChat(request);

        let activeToolCalls = modelResponse.toolCalls ? [...modelResponse.toolCalls] : [];

        // Intelligent Fallback: if Ollama or model returned JSON tool calls embedded inside text
        if (activeToolCalls.length === 0 && modelResponse.text) {
          const rawText = modelResponse.text;
          const jsonCodeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
          let match: RegExpExecArray | null;

          while ((match = jsonCodeBlockRegex.exec(rawText)) !== null) {
            try {
              const parsed = JSON.parse(match[1].trim());
              const toolName = parsed.name || parsed.tool || parsed.function;
              const toolArgs = parsed.arguments || parsed.input || parsed.params || parsed.args || {};
              if (toolName && typeof toolName === 'string' && agent.allowedTools.includes(toolName)) {
                activeToolCalls.push({
                  id: randomUUID(),
                  name: toolName,
                  arguments: toolArgs
                });
              }
            } catch {
              // Try next block
            }
          }

          // If not in code block, check if raw text contains tool objects
          if (activeToolCalls.length === 0) {
            const rawJsonRegex = /\{\s*"(?:name|tool)"\s*:\s*"([^"]+)"[\s\S]*?\}/g;
            let rawMatch: RegExpExecArray | null;
            while ((rawMatch = rawJsonRegex.exec(rawText)) !== null) {
              try {
                const parsed = JSON.parse(rawMatch[0]);
                const toolName = parsed.name || parsed.tool;
                const toolArgs = parsed.arguments || parsed.input || parsed.params || {};
                if (toolName && agent.allowedTools.includes(toolName)) {
                  activeToolCalls.push({
                    id: randomUUID(),
                    name: toolName,
                    arguments: toolArgs
                  });
                }
              } catch {
                // Ignore parse error
              }
            }
          }
        }

        if (activeToolCalls.length === 0) {
          finalContent = modelResponse.text;
          break;
        }

        messages.push({ role: 'assistant', content: modelResponse.text || '', toolCalls: activeToolCalls });

        for (const toolCall of activeToolCalls) {
          const toolName = toolCall.name;

          if (!agent.allowedTools.includes(toolName)) {
            const secErr = `SECURITY VIOLATION: Agent '${agent.id}' attempted to call tool '${toolName}' which is not in allowedTools.`;
            this.logger?.warn(secErr);
            errors.push(secErr);
            toolCallRecords.push({ tool: toolName, input: toolCall.arguments || {}, success: false, durationMs: 0, error: secErr });
            continue;
          }

          const toolInput = toolCall.arguments || {};
          const toolStart = Date.now();

          const toolResult = await this.toolBus.execute(toolName, toolInput, {
            requestId: randomUUID(),
            sessionId: task.sessionId,
            agentId: task.agentId,
            userId: 'ROOT_RUSHIKESH',
            environment: 'development',
            workspaceRoot: process.cwd(),
            approvalId: task.approvalId
          });

          const toolDuration = Date.now() - toolStart;

          toolCallRecords.push({
            tool: toolName,
            input: toolInput,
            output: toolResult.output,
            success: toolResult.success,
            durationMs: toolDuration,
            error: toolResult.error
          });

          // Check if tool required human approval
          if (!toolResult.success && toolResult.error && (toolResult.error.includes('Approval Request ID') || toolResult.error.includes('human authorization'))) {
            const match = toolResult.error.match(/apr_[a-zA-Z0-9_]+/);
            blockedApprovalId = match ? match[0] : undefined;
            errors.push(toolResult.error);
            break; // Stop immediately on approval requirement
          }

          let toolContent = JSON.stringify(toolResult.success ? toolResult.output : { error: toolResult.error });
          if (toolContent.length > 500) {
            toolContent = toolContent.substring(0, 500) + '... [truncated]';
          }

          messages.push({
            role: 'tool',
            content: toolContent,
            toolCallId: toolCall.id
          });
        }

        // If blocked by human approval requirement, break immediately
        if (blockedApprovalId) {
          break;
        }

        // After executing tools, if we reached 2 iterations, ask model to synthesize final answer without more tools
        if (iterationCount >= 2) {
          try {
            if (budgetTracker) {
              budgetTracker.recordModelCall();
            }
            const finalRequest: ChatRequest = {
              messages: [
                ...messages,
                { role: 'user', content: 'Synthesize your findings and state the final result directly in 1-2 paragraphs.' }
              ],
              preferredModel: agent.modelPreference.preferredModelId,
              preferredProvider: agent.modelPreference.preferredProviderId,
              maxTokens: 256,
              timeoutMs: 90000
            };
            const finalResponse = await this.modelRouter.routeAndExecuteChat(finalRequest);
            finalContent = finalResponse.text;
          } catch {
            finalContent = `Task executed with ${toolCallRecords.length} tool call(s). Success: ${toolCallRecords.every(t => t.success)}.`;
          }
          break;
        }
      }

      const completedAt = new Date().toISOString();

      try { this.agentRegistry.updateStatus(task.agentId, 'idle'); } catch { /* non-fatal */ }
      this.eventBus?.emit('agent.task_completed', { taskId: task.id, agentId: task.agentId });

      if (blockedApprovalId) {
        return {
          taskId: task.id,
          agentId: task.agentId,
          status: 'blocked',
          pendingApprovalId: blockedApprovalId,
          requiresApproval: true,
          summary: `Task blocked: action requires human approval (${blockedApprovalId}).`,
          output: undefined,
          toolCalls: toolCallRecords,
          childTaskIds: [],
          errors,
          startedAt,
          completedAt
        };
      }

      const evidenceList = toolCallRecords.map(t => {
        const outcome = t.success ? 'success' : ('failed: ' + t.error);
        return 'Tool: ' + t.tool + ' -> ' + outcome;
      });

      return {
        taskId: task.id,
        agentId: task.agentId,
        status: errors.length > 0 ? 'failed' : 'completed',
        summary: finalContent || ('Task executed by ' + agent.displayName + '. ' + toolCallRecords.length + ' tool(s) invoked.'),
        output: finalContent || undefined,
        evidence: evidenceList,
        toolCalls: toolCallRecords,
        childTaskIds: [],
        errors,
        startedAt,
        completedAt
      };

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      errors.push(errMsg);
      this.logger?.warn(`Task [${task.id}] failed: ${errMsg}`);

      try { this.agentRegistry.updateStatus(task.agentId, 'failed'); } catch { /* non-fatal */ }
      this.eventBus?.emit('agent.task_failed', { taskId: task.id, agentId: task.agentId, error: errMsg });

      return {
        taskId: task.id,
        agentId: task.agentId,
        status: 'failed',
        summary: 'Task failed: ' + errMsg,
        toolCalls: toolCallRecords,
        childTaskIds: [],
        errors,
        startedAt,
        completedAt: new Date().toISOString()
      };
    }
  }
}
