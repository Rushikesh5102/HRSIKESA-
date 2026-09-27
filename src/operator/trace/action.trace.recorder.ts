/**
 * FP-13 Action Trace Recorder
 *
 * Records durable, secret-redacted execution traces of operator interactions
 * to prepare for future demonstration-based skill generation and replay.
 */

import { ActionTrace, ActionTraceStep } from '../types/trace.types.js';
import { OperatorActionPayload, OperatorActionResult } from '../types/action.types.js';
import { WorkspaceRepository } from '../repository/workspace.repository.js';
import { ILogger } from '../../core/logging/logger.types.js';

export class ActionTraceRecorder {
  private activeTraces: Map<string, ActionTrace> = new Map();

  constructor(
    private readonly repository?: WorkspaceRepository,
    _logger?: ILogger
  ) {}

  public startTrace(
    name: string,
    workspaceId: string,
    applicationId?: string,
    agentId?: string,
    description?: string
  ): ActionTrace {
    const traceId = `trace_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const trace: ActionTrace = {
      traceId,
      name,
      description,
      workspaceId,
      applicationId,
      initiatorAgentId: agentId,
      status: 'RECORDING',
      steps: [],
      startedAt: new Date().toISOString(),
      isReusableProposal: false,
      metadata: {},
    };

    this.activeTraces.set(traceId, trace);
    if (this.repository) {
      this.repository.saveActionTrace(trace);
    }
    return trace;
  }

  public recordStep(
    traceId: string,
    action: OperatorActionPayload,
    result: OperatorActionResult,
    verificationEvidence?: Record<string, unknown>,
    agentId?: string,
    observationHash?: string
  ): ActionTraceStep | null {
    const trace = this.activeTraces.get(traceId);
    if (!trace) return null;

    const sanitizedAction = this.sanitizeAction(action);
    const stepId = `step_${trace.steps.length + 1}_${Date.now()}`;

    const step: ActionTraceStep = {
      stepId,
      traceId,
      stepIndex: trace.steps.length + 1,
      timestamp: new Date().toISOString(),
      workspaceId: trace.workspaceId,
      applicationId: trace.applicationId,
      observationHash,
      action: sanitizedAction,
      result,
      verificationEvidence,
      confidence: action.confidence,
      agentId: agentId || trace.initiatorAgentId,
      provenance: 'OPERATOR_TRACE',
    };

    trace.steps.push(step);
    if (this.repository) {
      this.repository.saveTraceStep(step);
    }
    return step;
  }

  public completeTrace(traceId: string, isReusableProposal: boolean = false): ActionTrace | null {
    const trace = this.activeTraces.get(traceId);
    if (!trace) return null;

    trace.status = 'COMPLETED';
    trace.completedAt = new Date().toISOString();
    trace.isReusableProposal = isReusableProposal;

    if (this.repository) {
      this.repository.saveActionTrace(trace);
    }

    this.activeTraces.delete(traceId);
    return trace;
  }

  private sanitizeAction(action: OperatorActionPayload): OperatorActionPayload {
    const params = { ...action.parameters };
    for (const key of Object.keys(params)) {
      if (typeof key === 'string' && (key.toLowerCase().includes('password') || key.toLowerCase().includes('token') || key.toLowerCase().includes('secret'))) {
        params[key] = '[REDACTED]';
      }
    }
    return {
      ...action,
      parameters: params,
    };
  }
}
