/**
 * HṚṢĪKEŚA (हृषीकेश) — FP-16: Demonstration Session Service
 *
 * Orchestrates the lifecycle of a demonstration session:
 * START → RECORD → PAUSE/RESUME → STOP → ANALYZE → PROPOSE → APPROVE → LEARN
 *
 * REUSES:
 * - WorkspaceObserver (FP-13) for observation
 * - ActionTraceRecorder (FP-13) for raw trace
 * - EventBus for SSE propagation
 * - WorkingMemoryEngine (INT-008) for teaching context
 * - ModelRouter for inference
 *
 * Does NOT duplicate any of those systems.
 */

import { randomUUID } from 'node:crypto';
import { DemonstrationRepository } from '../repositories/demonstration.repository.js';
import {
  DemonstrationSession,
  DemonstrationStatus,
  DemonstrationScope,
  SemanticAction,
  SemanticActionType,
  SemanticActionSource,
  SemanticActionDangerLevel,
  DemonstrationCheckpoint,
  DemonstrationArtifact,
  DemonstrationEvent,
  DemonstrationObservationSource,
} from '../interfaces/demonstration.types.js';
import { EventBus } from '../../core/events/event-bus.js';
import { ILogger } from '../../core/logging/logger.types.js';

// Sensitive patterns for redaction
const SENSITIVE_PATTERNS = [
  /password/i,
  /passwd/i,
  /secret/i,
  /api[_-]?key/i,
  /access[_-]?token/i,
  /auth[_-]?token/i,
  /bearer/i,
  /private[_-]?key/i,
  /session[_-]?cookie/i,
  /mfa[_-]?code/i,
  /otp/i,
  /credit[_-]?card/i,
  /cvv/i,
  /ssn/i,
];

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_PATTERNS.some((p) => p.test(key));
}

function isSensitiveValue(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  // Detect likely tokens: long alphanumeric strings
  if (/^[A-Za-z0-9+/=_-]{32,}$/.test(value)) return true;
  // Detect "sk-..." or "Bearer ..." patterns
  if (/^(sk-|Bearer |ghp_|xoxb-|ya29\.|eyJ)/.test(value)) return true;
  return false;
}

export interface StartDemonstrationOptions {
  owner: string;
  title: string;
  objective: string;
  companyId?: string;
  projectId?: string;
  workspaceId?: string;
  scope?: DemonstrationScope;
  teachingMode?: boolean;
  voiceAnnotationsEnabled?: boolean;
  environment?: string;
}

export class DemonstrationSessionService {
  private activeSessions = new Map<string, DemonstrationSession>();
  private activeActionIndex = new Map<string, number>(); // demonstrationId → next step index

  constructor(
    private readonly repository: DemonstrationRepository,
    private readonly eventBus?: EventBus,
    private readonly logger?: ILogger
  ) {}

  // ─── Session Lifecycle ─────────────────────────────────────────────────────

  public startSession(options: StartDemonstrationOptions): DemonstrationSession {
    const now = new Date().toISOString();
    const id = `demo_${randomUUID().replace(/-/g, '').substring(0, 12)}`;

    const session: DemonstrationSession = {
      id,
      owner: options.owner,
      companyId: options.companyId,
      projectId: options.projectId,
      workspaceId: options.workspaceId,
      title: options.title,
      objective: options.objective,
      status: 'RECORDING',
      scope: options.scope ?? 'USER',
      startedAt: now,
      observationSources: [],
      actionCount: 0,
      checkpointCount: 0,
      teachingMode: options.teachingMode ?? false,
      voiceAnnotationsEnabled: options.voiceAnnotationsEnabled ?? false,
      environment: options.environment,
      securityClassification: 'INTERNAL',
      provenance: 'HUMAN_DEMONSTRATION',
      metadata: {},
      createdAt: now,
      updatedAt: now,
    };

    this.repository.createSession(session);
    this.activeSessions.set(id, session);
    this.activeActionIndex.set(id, 0);

    this.logger?.info(`[DemonstrationSession] Started: ${id} — "${options.title}"`);
    this.emitEvent('demonstration.started', id, { title: options.title, objective: options.objective });

    return session;
  }

  public pauseSession(id: string): DemonstrationSession | null {
    const session = this.getActiveSession(id);
    if (!session || session.status !== 'RECORDING') return null;

    const updated = this.repository.updateSession(id, {
      status: 'PAUSED',
      pausedAt: new Date().toISOString(),
    });

    if (updated) {
      this.activeSessions.set(id, updated);
      this.emitEvent('demonstration.paused', id, {});
      this.logger?.info(`[DemonstrationSession] Paused: ${id}`);
    }
    return updated;
  }

  public resumeSession(id: string): DemonstrationSession | null {
    const session = this.getActiveSession(id) ?? this.repository.getSession(id);
    if (!session || session.status !== 'PAUSED') return null;

    const updated = this.repository.updateSession(id, {
      status: 'RECORDING',
      resumedAt: new Date().toISOString(),
      pausedAt: undefined,
    });

    if (updated) {
      this.activeSessions.set(id, updated);
      this.emitEvent('demonstration.resumed', id, {});
    }
    return updated;
  }

  public stopSession(id: string): DemonstrationSession | null {
    const session = this.getActiveSession(id) ?? this.repository.getSession(id);
    if (!session) return null;
    if (session.status === 'STOPPED' || session.status === 'ANALYZING') return session;

    const updated = this.repository.updateSession(id, {
      status: 'STOPPED',
      endedAt: new Date().toISOString(),
    });

    if (updated) {
      this.activeSessions.set(id, updated);
      this.emitEvent('demonstration.stopped', id, { actionCount: updated.actionCount });
    }

    return updated;
  }

  public discardSession(id: string): boolean {
    const session = this.repository.getSession(id);
    if (!session) return false;

    this.repository.updateSession(id, { status: 'ARCHIVED' });
    this.activeSessions.delete(id);
    this.activeActionIndex.delete(id);
    this.emitEvent('demonstration.archived', id, { reason: 'DISCARDED' });
    return true;
  }

  // ─── Action Recording ──────────────────────────────────────────────────────

  public recordAction(
    demonstrationId: string,
    input: {
      actionType: SemanticActionType;
      semanticIntent: string;
      source?: SemanticActionSource;
      confidence?: number;
      application?: string;
      environment?: string;
      target?: SemanticAction['target'];
      parameters?: Array<{ name: string; value: unknown }>;
      resultingState?: string;
      dangerLevel?: SemanticActionDangerLevel;
      isReversible?: boolean;
      precondition?: string;
      verificationEvidence?: Record<string, unknown>;
      teachingAnnotation?: string;
      rawOperatorActionId?: string;
    }
  ): SemanticAction | null {
    const session = this.getActiveSession(demonstrationId) ?? this.repository.getSession(demonstrationId);
    if (!session || (session.status !== 'RECORDING')) return null;

    // Security: detect authentication events
    if (this.isAuthenticationEvent(input)) {
      return this.recordAuthenticationEvent(demonstrationId, input);
    }

    const stepIndex = (this.activeActionIndex.get(demonstrationId) ?? 0) + 1;
    this.activeActionIndex.set(demonstrationId, stepIndex);

    // Redact sensitive parameters
    const safeParameters = this.redactParameters(input.parameters ?? []);

    const action: SemanticAction = {
      id: `act_${randomUUID().replace(/-/g, '').substring(0, 10)}`,
      demonstrationId,
      stepIndex,
      actionType: input.actionType,
      semanticIntent: input.semanticIntent,
      target: input.target,
      application: input.application,
      environment: input.environment,
      precondition: input.precondition,
      parameters: safeParameters,
      resultingState: input.resultingState,
      timestamp: new Date().toISOString(),
      source: input.source ?? 'INFERRED',
      confidence: input.confidence ?? 0.8,
      verificationEvidence: input.verificationEvidence,
      isVerified: false,
      isReversible: input.isReversible ?? true,
      dangerLevel: input.dangerLevel ?? 'SAFE',
      teachingAnnotation: input.teachingAnnotation,
      isIgnored: false,
      isImportant: false,
      isOptional: false,
      rawOperatorActionId: input.rawOperatorActionId,
      metadata: {},
    };

    this.repository.saveAction(action);
    this.emitEvent('demonstration.action_observed', demonstrationId, {
      stepIndex,
      actionType: action.actionType,
      semanticIntent: action.semanticIntent,
      source: action.source,
      confidence: action.confidence,
    });

    return action;
  }

  /**
   * Mark an action as ignored, important, or optional via user correction.
   */
  public applyCorrection(
    demonstrationId: string,
    actionId: string,
    correction: { ignore?: boolean; markImportant?: boolean; markOptional?: boolean; annotation?: string }
  ): void {
    const updates: Partial<SemanticAction> = {};
    if (correction.ignore !== undefined) updates.isIgnored = correction.ignore;
    if (correction.markImportant !== undefined) updates.isImportant = correction.markImportant;
    if (correction.markOptional !== undefined) updates.isOptional = correction.markOptional;
    if (correction.annotation !== undefined) updates.teachingAnnotation = correction.annotation;

    this.repository.updateAction(actionId, updates);
    this.emitEvent('demonstration.correction_applied', demonstrationId, { actionId, correction });
  }

  /**
   * Add a voice/text teaching annotation to the current context.
   * Stored as a TEACHING_ANNOTATION semantic action.
   */
  public addTeachingAnnotation(demonstrationId: string, annotation: string, relatedActionId?: string): SemanticAction | null {
    return this.recordAction(demonstrationId, {
      actionType: 'TEACHING_ANNOTATION',
      semanticIntent: `Teaching annotation: ${annotation.substring(0, 120)}`,
      source: 'VOICE',
      confidence: 1.0,
      dangerLevel: 'SAFE',
      isReversible: true,
      teachingAnnotation: annotation,
      rawOperatorActionId: relatedActionId,
    });
  }

  // ─── Checkpoints ───────────────────────────────────────────────────────────

  public addCheckpoint(demonstrationId: string, label: string, annotation?: string): DemonstrationCheckpoint | null {
    const session = this.repository.getSession(demonstrationId);
    if (!session) return null;

    const cp: DemonstrationCheckpoint = {
      checkpointId: `cp_${randomUUID().replace(/-/g, '').substring(0, 10)}`,
      demonstrationId,
      stepIndex: session.actionCount,
      label,
      annotation,
      capturedAt: new Date().toISOString(),
    };

    this.repository.saveCheckpoint(cp);
    this.emitEvent('demonstration.checkpoint_added', demonstrationId, { label, stepIndex: cp.stepIndex });
    return cp;
  }

  // ─── Artifacts ─────────────────────────────────────────────────────────────

  public addArtifact(
    demonstrationId: string,
    artifact: Omit<DemonstrationArtifact, 'artifactId' | 'createdAt' | 'isRedacted'>
  ): DemonstrationArtifact {
    const full: DemonstrationArtifact = {
      ...artifact,
      demonstrationId,
      artifactId: `art_${randomUUID().replace(/-/g, '').substring(0, 10)}`,
      createdAt: new Date().toISOString(),
      isRedacted: false,
    };
    return this.repository.saveArtifact(full);
  }

  // ─── Status Transitions ────────────────────────────────────────────────────

  public transitionStatus(id: string, status: DemonstrationStatus, extra?: Partial<DemonstrationSession>): DemonstrationSession | null {
    const updated = this.repository.updateSession(id, { status, ...extra });
    if (updated) {
      this.activeSessions.set(id, updated);
      this.emitEvent('demonstration.state_changed', id, { status });
    }
    return updated;
  }

  // ─── Queries ───────────────────────────────────────────────────────────────

  public getSession(id: string): DemonstrationSession | null {
    return this.activeSessions.get(id) ?? this.repository.getSession(id);
  }

  public listSessions(filter?: {
    owner?: string;
    companyId?: string;
    projectId?: string;
    status?: DemonstrationStatus;
  }): DemonstrationSession[] {
    return this.repository.listSessions(filter);
  }

  public getTrace(demonstrationId: string): SemanticAction[] {
    return this.repository.getActions(demonstrationId);
  }

  public getActiveSession(id: string): DemonstrationSession | null {
    return this.activeSessions.get(id) ?? null;
  }

  public getActiveSessionId(): string | null {
    // Return the most recently started RECORDING session
    for (const [id, session] of this.activeSessions) {
      if (session.status === 'RECORDING') return id;
    }
    return null;
  }

  public addObservationSource(id: string, source: DemonstrationObservationSource): void {
    const session = this.getSession(id);
    if (!session) return;
    if (!session.observationSources.includes(source)) {
      session.observationSources.push(source);
      this.repository.updateSession(id, { observationSources: session.observationSources });
    }
  }

  // ─── Security ──────────────────────────────────────────────────────────────

  private isAuthenticationEvent(input: { actionType: SemanticActionType; parameters?: Array<{ name: string; value: unknown }> }): boolean {
    if (input.actionType === 'AUTHENTICATE' || input.actionType === 'AUTHENTICATION_REQUIRED') return true;
    if (input.parameters?.some((p) => isSensitiveKey(p.name))) return true;
    return false;
  }

  private recordAuthenticationEvent(demonstrationId: string, _input: unknown): SemanticAction {
    const stepIndex = (this.activeActionIndex.get(demonstrationId) ?? 0) + 1;
    this.activeActionIndex.set(demonstrationId, stepIndex);

    const action: SemanticAction = {
      id: `act_auth_${randomUUID().replace(/-/g, '').substring(0, 8)}`,
      demonstrationId,
      stepIndex,
      actionType: 'AUTHENTICATION_REQUIRED',
      semanticIntent: 'Authentication event — credentials redacted',
      parameters: [], // NO credentials stored
      timestamp: new Date().toISOString(),
      source: 'INFERRED',
      confidence: 1.0,
      isVerified: false,
      isReversible: true,
      dangerLevel: 'SAFE',
      isIgnored: false,
      isImportant: false,
      isOptional: false,
      metadata: { redacted: true },
    };

    this.repository.saveAction(action);
    this.emitEvent('demonstration.sensitive_data_redacted', demonstrationId, {
      stepIndex,
      reason: 'AUTHENTICATION_EVENT',
    });

    return action;
  }

  private redactParameters(
    params: Array<{ name: string; value: unknown }>
  ): SemanticAction['parameters'] {
    return params.map((p) => {
      const isSensitive = isSensitiveKey(p.name) || isSensitiveValue(p.value);
      return {
        name: p.name,
        value: isSensitive ? '[REDACTED]' : p.value,
        isRedacted: isSensitive,
        isSensitive,
        isVariable: false,
      };
    });
  }

  // ─── Events ────────────────────────────────────────────────────────────────

  private emitEvent(eventType: DemonstrationEvent['eventType'], demonstrationId: string, data: Record<string, unknown>): void {
    this.eventBus?.emit(eventType, {
      eventType,
      demonstrationId,
      timestamp: new Date().toISOString(),
      data,
    } satisfies DemonstrationEvent);
  }
}
