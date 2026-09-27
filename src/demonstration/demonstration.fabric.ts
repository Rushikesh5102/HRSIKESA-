/**
 * HṚṢĪKEŚA (हृषीकेश) — FP-16: Demonstration Fabric
 *
 * Orchestrates the full FP-16 pipeline:
 * START → RECORD → STOP → ANALYZE → VALIDATE → APPROVE → COMPILE → LEARN
 *
 * Coordinates: DemonstrationSessionService, ProcedureInferenceService,
 * DemonstrationValidatorService, DemonstrationCompilerService
 *
 * Single entry-point for all FP-16 capabilities.
 * Used by API routes, CLI, and SSE.
 */

import { DemonstrationSessionService, StartDemonstrationOptions } from './services/demonstration-session.service.js';
import { ProcedureInferenceService } from './services/procedure-inference.service.js';
import { DemonstrationValidatorService } from './services/demonstration-validator.service.js';
import { DemonstrationCompilerService, CompilationResult } from './services/demonstration-compiler.service.js';
import { DemonstrationRepository } from './repositories/demonstration.repository.js';
import {
  DemonstrationSession,
  SemanticAction,
  SemanticActionType,
  SemanticActionSource,
  SemanticActionDangerLevel,
  ProcedureProposal,
  LearnedProcedure,
  LearnedProcedureVersion,
  LearnedProcedureExecutionRecord,
} from './interfaces/demonstration.types.js';
import { EventBus } from '../core/events/event-bus.js';
import { ILogger } from '../core/logging/logger.types.js';

export interface DemonstrationFabricOptions {
  repository: DemonstrationRepository;
  sessionService: DemonstrationSessionService;
  inferenceService: ProcedureInferenceService;
  validatorService: DemonstrationValidatorService;
  compilerService: DemonstrationCompilerService;
  eventBus?: EventBus;
  logger?: ILogger;
}

export class DemonstrationFabric {
  private readonly repository: DemonstrationRepository;
  private readonly sessionService: DemonstrationSessionService;
  private readonly inferenceService: ProcedureInferenceService;
  private readonly validatorService: DemonstrationValidatorService;
  private readonly compilerService: DemonstrationCompilerService;
  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;

  constructor(options: DemonstrationFabricOptions) {
    this.repository = options.repository;
    this.sessionService = options.sessionService;
    this.inferenceService = options.inferenceService;
    this.validatorService = options.validatorService;
    this.compilerService = options.compilerService;
    this.eventBus = options.eventBus;
    this.logger = options.logger?.child('DemonstrationFabric');
  }

  // ─── Session Lifecycle ─────────────────────────────────────────────────────

  public startSession(options: StartDemonstrationOptions): DemonstrationSession {
    return this.sessionService.startSession(options);
  }

  public pauseSession(id: string): DemonstrationSession | null {
    return this.sessionService.pauseSession(id);
  }

  public resumeSession(id: string): DemonstrationSession | null {
    return this.sessionService.resumeSession(id);
  }

  public stopSession(id: string): DemonstrationSession | null {
    return this.sessionService.stopSession(id);
  }

  public discardSession(id: string): boolean {
    return this.sessionService.discardSession(id);
  }

  public getSession(id: string): DemonstrationSession | null {
    return this.sessionService.getSession(id);
  }

  public listSessions(filter?: { owner?: string; companyId?: string; projectId?: string; status?: DemonstrationSession['status'] }): DemonstrationSession[] {
    return this.sessionService.listSessions(filter);
  }

  public getActiveSessionId(): string | null {
    return this.sessionService.getActiveSessionId();
  }

  // ─── Recording ─────────────────────────────────────────────────────────────

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
    return this.sessionService.recordAction(demonstrationId, input);
  }

  public addTeachingAnnotation(demonstrationId: string, annotation: string, relatedActionId?: string): SemanticAction | null {
    return this.sessionService.addTeachingAnnotation(demonstrationId, annotation, relatedActionId);
  }

  public applyCorrection(
    demonstrationId: string,
    actionId: string,
    correction: { ignore?: boolean; markImportant?: boolean; markOptional?: boolean; annotation?: string }
  ): void {
    this.sessionService.applyCorrection(demonstrationId, actionId, correction);
  }

  public addCheckpoint(demonstrationId: string, label: string, annotation?: string) {
    return this.sessionService.addCheckpoint(demonstrationId, label, annotation);
  }

  public getTrace(demonstrationId: string): SemanticAction[] {
    return this.sessionService.getTrace(demonstrationId);
  }

  // ─── Analysis Pipeline ─────────────────────────────────────────────────────

  public async analyze(id: string): Promise<{ proposal: ProcedureProposal | null; rejection?: { reason: string; explanation: string } }> {
    const session = this.getSession(id);
    if (!session) return { proposal: null, rejection: { reason: 'NOT_FOUND', explanation: 'Session not found.' } };

    if (session.status !== 'STOPPED') {
      this.stopSession(id);
    }

    this.sessionService.transitionStatus(id, 'ANALYZING');
    this.eventBus?.emit('demonstration.analyzing', { demonstrationId: id });

    const actions = this.getTrace(id);
    const result = await this.inferenceService.infer({
      demonstrationId: id,
      objective: session.objective,
      actions,
      companyId: session.companyId,
      projectId: session.projectId,
    });

    if (result.rejection) {
      this.sessionService.transitionStatus(id, 'FAILED', {
        inferredIntentSummary: `Rejected: ${result.rejection.reason} — ${result.rejection.explanation}`,
      });
      return { proposal: null, rejection: result.rejection };
    }

    this.sessionService.transitionStatus(id, 'PROPOSAL_READY', {
      proposedProcedureId: result.proposal!.id,
      inferredIntentSummary: result.proposal!.purpose,
    });

    return { proposal: result.proposal };
  }

  public getProposal(demonstrationId: string): ProcedureProposal | null {
    return this.repository.getProposalByDemonstration(demonstrationId);
  }

  public getProposalById(proposalId: string): ProcedureProposal | null {
    return this.repository.getProposal(proposalId);
  }

  // ─── Validation ────────────────────────────────────────────────────────────

  public validateProposal(proposalId: string): { isValid: boolean; result: import('./interfaces/demonstration.types.js').ProcedureValidationResult } | null {
    const proposal = this.repository.getProposal(proposalId);
    if (!proposal) return null;

    this.eventBus?.emit('demonstration.validation_started', { proposalId });
    const result = this.validatorService.validate(proposal);

    this.repository.updateProposalStatus(
      proposalId,
      result.isValid ? 'VALID' : 'INVALID',
      result
    );
    this.sessionService.transitionStatus(proposal.demonstrationId, result.isValid ? 'AWAITING_APPROVAL' : 'FAILED');

    this.eventBus?.emit('demonstration.validation_completed', {
      proposalId,
      isValid: result.isValid,
      requiresHumanApproval: result.requiresHumanApproval,
      riskLevel: result.riskLevel,
    });

    return { isValid: result.isValid, result };
  }

  // ─── Approval ──────────────────────────────────────────────────────────────

  public approveProposal(
    proposalId: string,
    options?: { approvedBy?: string; comment?: string }
  ): CompilationResult | null {
    const proposal = this.repository.getProposal(proposalId);
    if (!proposal) return null;

    if (proposal.status !== 'VALID' && proposal.status !== 'AWAITING_APPROVAL') {
      this.logger?.warn(`[DemonstrationFabric] Cannot approve proposal ${proposalId} in status ${proposal.status}`);
      return null;
    }

    this.repository.updateProposalStatus(proposalId, 'APPROVED');
    this.sessionService.transitionStatus(proposal.demonstrationId, 'APPROVED', {
      approvalStatus: 'APPROVED',
      approvedBy: options?.approvedBy,
      approvedAt: new Date().toISOString(),
    });

    this.eventBus?.emit('demonstration.approved', { proposalId, demonstrationId: proposal.demonstrationId });

    // Trigger compilation
    const updatedProposal = this.repository.getProposal(proposalId)!;
    this.sessionService.transitionStatus(proposal.demonstrationId, 'LEARNING');

    this.eventBus?.emit('demonstration.execution_started', { demonstrationId: proposal.demonstrationId, type: 'COMPILATION' });

    const result = this.compilerService.compile(updatedProposal);

    if (result.success) {
      this.eventBus?.emit('demonstration.execution_completed', {
        demonstrationId: proposal.demonstrationId,
        learnedProcedureId: result.learnedProcedureId,
        compilationTarget: result.compilationTarget,
      });
    } else {
      this.sessionService.transitionStatus(proposal.demonstrationId, 'FAILED');
      this.eventBus?.emit('demonstration.execution_failed', {
        demonstrationId: proposal.demonstrationId,
        errors: result.errors,
      });
    }

    return result;
  }

  public rejectProposal(proposalId: string, reason: string, rejectedBy?: string): boolean {
    const proposal = this.repository.getProposal(proposalId);
    if (!proposal) return false;

    this.repository.updateProposalStatus(proposalId, 'REJECTED');
    this.sessionService.transitionStatus(proposal.demonstrationId, 'REJECTED', {
      approvalStatus: 'REJECTED',
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason,
    });

    this.eventBus?.emit('demonstration.rejected', {
      proposalId,
      demonstrationId: proposal.demonstrationId,
      reason,
      rejectedBy,
    });

    return true;
  }

  // ─── Learned Procedures ────────────────────────────────────────────────────

  public listLearnedProcedures(filter?: {
    scope?: string;
    companyId?: string;
    projectId?: string;
  }): LearnedProcedure[] {
    return this.repository.listLearned(filter);
  }

  public getLearnedProcedure(id: string): LearnedProcedure | null {
    return this.repository.getLearned(id);
  }

  public getLearnedProcedureVersions(learnedProcedureId: string): LearnedProcedureVersion[] {
    return this.repository.getLearnedVersions(learnedProcedureId);
  }

  public recordExecution(exec: LearnedProcedureExecutionRecord): LearnedProcedureExecutionRecord {
    return this.repository.saveExecution(exec);
  }

  // ─── Intent Matching ───────────────────────────────────────────────────────

  /**
   * Match a natural-language request against learned procedure trigger phrases.
   * Used by intent routing / CognitiveContextEngine.
   */
  public findMatchingProcedure(query: string): { procedure: LearnedProcedure; confidence: number } | null {
    const all = this.repository.listLearned();
    const lowerQuery = query.toLowerCase();

    let bestMatch: { procedure: LearnedProcedure; confidence: number } | null = null;

    for (const proc of all) {
      for (const phrase of proc.triggerPhrases) {
        const lowerPhrase = phrase.toLowerCase();
        if (lowerQuery.includes(lowerPhrase) || this.fuzzyMatch(lowerQuery, lowerPhrase)) {
          const confidence = lowerQuery.includes(lowerPhrase) ? 0.9 : 0.65;
          if (!bestMatch || confidence > bestMatch.confidence) {
            bestMatch = { procedure: proc, confidence };
          }
        }
      }
    }

    return bestMatch;
  }

  private fuzzyMatch(query: string, phrase: string): boolean {
    const words = phrase.split(' ').filter((w) => w.length > 3);
    const matchCount = words.filter((w) => query.includes(w)).length;
    return words.length > 0 && matchCount / words.length >= 0.6;
  }

  // ─── "Watch Me" Intent Detection (deterministic, no LLM) ─────────────────

  public detectDemonstrationIntent(text: string): {
    intent: 'START' | 'STOP' | 'PAUSE' | 'RESUME' | 'ANALYZE' | 'APPROVE' | 'REJECT' | 'SAVE' | 'USE' | 'FORGET' | 'SHOW' | 'NONE';
    confidence: number;
  } {
    const lower = text.toLowerCase().trim();

    const patterns: Array<{ patterns: RegExp[]; intent: 'START' | 'STOP' | 'PAUSE' | 'RESUME' | 'ANALYZE' | 'APPROVE' | 'REJECT' | 'SAVE' | 'USE' | 'FORGET' | 'SHOW' }> = [
      { patterns: [/watch\s+me/i, /learn\s+how\s+i/i, /remember\s+this\s+workflow/i, /don.t\s+execute.*just\s+watch/i, /observe\s+this/i], intent: 'START' },
      { patterns: [/stop\s+learning/i, /stop\s+watching/i, /stop\s+recording/i, /that.s\s+all/i], intent: 'STOP' },
      { patterns: [/pause\s+(learning|watching|recording)/i], intent: 'PAUSE' },
      { patterns: [/resume\s+(learning|watching|recording)/i, /continue\s+watching/i], intent: 'RESUME' },
      { patterns: [/save\s+this\s+as\s+a\s+skill/i, /turn.*into\s+(a\s+)?(workflow|skill)/i, /learn\s+this\s+process/i], intent: 'SAVE' },
      { patterns: [/use\s+the\s+procedure\s+you\s+learned/i, /do\s+the\s+workflow\s+i\s+showed/i, /use\s+my\s+usual\s+.*process/i], intent: 'USE' },
      { patterns: [/forget\s+this\s+learned\s+procedure/i, /discard\s+what\s+you\s+learned/i], intent: 'FORGET' },
      { patterns: [/show\s+me\s+what\s+you\s+learned/i, /what\s+did\s+you\s+learn/i], intent: 'SHOW' },
    ];

    for (const { patterns: pats, intent } of patterns) {
      if (pats.some((p) => p.test(lower))) {
        return { intent, confidence: 0.95 };
      }
    }

    return { intent: 'NONE', confidence: 0 };
  }
}
