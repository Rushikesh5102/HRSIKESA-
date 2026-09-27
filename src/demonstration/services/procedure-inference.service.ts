/**
 * HṚṢĪKEŚA (हृषीकेश) — FP-16: Procedure Inference Service
 *
 * Analyzes a semantic action trace and infers a reusable procedure proposal.
 * Uses ModelRouter for semantic interpretation and generalization.
 *
 * Explicit rejection criteria prevent over-generalization.
 * Confidence is explainable and based on concrete factors.
 */

import { randomUUID } from 'node:crypto';
import { DemonstrationRepository } from '../repositories/demonstration.repository.js';
import {
  SemanticAction,
  ProcedureProposal,
  ProcedureStep,
  ProcedureParameter,
  ProcedureRejection,
  SemanticActionType,
} from '../interfaces/demonstration.types.js';
import { EventBus } from '../../core/events/event-bus.js';
import { ILogger } from '../../core/logging/logger.types.js';

interface InferenceContext {
  demonstrationId: string;
  objective: string;
  actions: SemanticAction[];
  companyId?: string;
  projectId?: string;
}

interface InferenceResult {
  proposal: ProcedureProposal | null;
  rejection?: ProcedureRejection;
}

// Action types that require human approval at execution
const APPROVAL_REQUIRED_ACTIONS = new Set<SemanticActionType>([
  'DEPLOY', 'PUBLISH', 'SEND_MESSAGE', 'CALL_API',
]);

// Action types that are inherently irreversible
const IRREVERSIBLE_ACTIONS = new Set<SemanticActionType>([
  'DEPLOY', 'PUBLISH', 'DELETE_FILE', 'SEND_MESSAGE',
]);

// Action types that should never be generalized into procedures
const UNSAFE_ACTION_TYPES = new Set<SemanticActionType>([
  'AUTHENTICATE', 'AUTHENTICATION_REQUIRED',
]);

export class ProcedureInferenceService {
  constructor(
    private readonly repository: DemonstrationRepository,
    private readonly eventBus?: EventBus,
    private readonly logger?: ILogger
  ) {}

  public async infer(context: InferenceContext): Promise<InferenceResult> {
    const { demonstrationId, objective, actions, companyId, projectId } = context;
    const now = new Date().toISOString();

    this.logger?.info(`[ProcedureInference] Inferring from demonstration ${demonstrationId}: ${actions.length} actions`);

    // ─── Rejection Pre-checks ────────────────────────────────────────────────

    const rejection = this.checkForRejection(actions, objective);
    if (rejection) {
      this.logger?.warn(`[ProcedureInference] Rejected: ${rejection.reason}`);
      return { proposal: null, rejection };
    }

    // ─── Filter relevant actions ──────────────────────────────────────────────

    const relevantActions = actions.filter((a) => !a.isIgnored && !UNSAFE_ACTION_TYPES.has(a.actionType));

    if (relevantActions.length === 0) {
      return {
        proposal: null,
        rejection: {
          reason: 'INCOMPLETE',
          explanation: 'No meaningful actions remain after filtering ignored/unsafe actions.',
          canRetryAfterCorrection: true,
        },
      };
    }

    // ─── Procedure Name Inference ─────────────────────────────────────────────

    const name = this.inferProcedureName(objective, relevantActions);
    const displayName = this.inferDisplayName(objective);

    // ─── Step Extraction ──────────────────────────────────────────────────────

    const steps = this.extractSteps(relevantActions);

    // ─── Parameter Extraction ─────────────────────────────────────────────────

    const { inputs, parameterizedSteps } = this.extractParameters(steps, relevantActions);

    // ─── Application / Capability Detection ──────────────────────────────────

    const applications = [...new Set(relevantActions.map((a) => a.application).filter(Boolean))] as string[];
    const capabilities = this.inferRequiredCapabilities(relevantActions);

    // ─── Trigger Phrases ──────────────────────────────────────────────────────

    const triggerPhrases = this.inferTriggerPhrases(objective, name);

    // ─── Risk & Confidence ────────────────────────────────────────────────────

    const riskLevel = this.assessRiskLevel(relevantActions);
    const requiresApproval = riskLevel === 'HIGH' || riskLevel === 'CRITICAL' ||
      relevantActions.some((a) => APPROVAL_REQUIRED_ACTIONS.has(a.actionType));

    const confidenceFactors = this.computeConfidenceFactors(relevantActions, actions);
    const confidence = this.computeOverallConfidence(confidenceFactors);

    // ─── Generalization Assessment ────────────────────────────────────────────

    const { isGeneralizable, caveats } = this.assessGeneralizability(relevantActions, inputs);

    // ─── Compilation Target ───────────────────────────────────────────────────

    const compilationTarget = this.determineCompilationTarget(relevantActions, parameterizedSteps);

    // ─── Verification & Recovery ──────────────────────────────────────────────

    const verificationConditions = this.inferVerificationConditions(relevantActions);
    const recoveryStrategies = this.inferRecoveryStrategies(relevantActions);

    // ─── Checkpoints ──────────────────────────────────────────────────────────

    const checkpoints = this.repository.getCheckpoints(demonstrationId).map((cp) => cp.label);

    const proposal: ProcedureProposal = {
      id: `prop_${randomUUID().replace(/-/g, '').substring(0, 12)}`,
      demonstrationId,
      name,
      displayName,
      purpose: objective,
      triggerPhrases,
      requiredCapabilities: capabilities,
      requiredServices: [],
      requiredApplications: applications,
      requiredPermissions: requiresApproval ? ['HUMAN_APPROVAL'] : [],
      inputs,
      outputs: [],
      assumptions: this.inferAssumptions(relevantActions),
      steps: parameterizedSteps,
      checkpoints,
      verificationConditions,
      recoveryStrategies,
      rollbackStrategy: riskLevel !== 'LOW' ? 'RESTORE_CHECKPOINT' : undefined,
      expectedArtifacts: this.inferExpectedArtifacts(relevantActions),
      riskLevel,
      confidence,
      confidenceFactors,
      isGeneralizable,
      generalizationCaveats: caveats,
      compilationTarget,
      scope: projectId ? 'PROJECT' : companyId ? 'COMPANY' : 'USER',
      companyId,
      projectId,
      status: 'DRAFT',
      provenance: 'PROCEDURE_INFERENCE',
      sourceDemonstrationId: demonstrationId,
      createdAt: now,
      updatedAt: now,
    };

    // Persist
    this.repository.saveProposal(proposal);

    // Link to session
    this.repository.updateSession(demonstrationId, {
      proposedProcedureId: proposal.id,
      inferredIntentSummary: `${displayName}: ${parameterizedSteps.length} steps, confidence ${Math.round(confidence * 100)}%`,
    });

    this.eventBus?.emit('demonstration.proposal_ready', {
      demonstrationId,
      proposalId: proposal.id,
      name: proposal.name,
      confidence,
      compilationTarget,
    });

    return { proposal };
  }

  // ─── Rejection Logic ───────────────────────────────────────────────────────

  private checkForRejection(actions: SemanticAction[], objective: string): ProcedureRejection | null {
    if (actions.length === 0) {
      return { reason: 'INCOMPLETE', explanation: 'No actions were recorded.', canRetryAfterCorrection: false };
    }

    if (actions.length < 2) {
      return {
        reason: 'ONE_OFF',
        explanation: 'Only a single action was observed. This is too simple to generalize.',
        canRetryAfterCorrection: true,
      };
    }

    // Check for credential dependency
    const hasCredentialDependency = actions.some(
      (a) => a.actionType === 'AUTHENTICATION_REQUIRED' && !a.isIgnored
    );
    if (hasCredentialDependency && actions.filter((a) => !a.isIgnored).length <= 3) {
      return {
        reason: 'SECRET_DEPENDENT',
        explanation: 'Procedure consists primarily of authentication steps that cannot be generalized.',
        canRetryAfterCorrection: false,
      };
    }

    // Check for objective clarity
    if (!objective || objective.trim().length < 5) {
      return {
        reason: 'AMBIGUOUS',
        explanation: 'Demonstration objective is not specified or too vague.',
        canRetryAfterCorrection: true,
      };
    }

    return null;
  }

  // ─── Step Extraction ───────────────────────────────────────────────────────

  private extractSteps(actions: SemanticAction[]): ProcedureStep[] {
    return actions.map((action, i) => ({
      stepIndex: i + 1,
      name: this.inferStepName(action),
      description: action.semanticIntent,
      actionType: action.actionType,
      semanticIntent: action.semanticIntent,
      target: action.target,
      parameters: action.parameters.map((p) => ({
        name: p.name,
        description: p.name,
        type: this.inferParamType(p.value) as ProcedureParameter['type'],
        required: !action.isOptional,
        defaultValue: p.isVariable ? undefined : p.value,
        exampleValue: p.isVariable ? p.value : undefined,
      })),
      precondition: action.precondition,
      postcondition: action.resultingState,
      verificationStrategy: action.isVerified ? 'OBSERVE_STATE_CHANGE' : undefined,
      isOptional: action.isOptional,
      isBranch: false,
      branchCondition: undefined,
      isLoop: false,
      loopCondition: undefined,
      recoveryStrategy: IRREVERSIBLE_ACTIONS.has(action.actionType) ? 'ESCALATE_HUMAN' : 'RETRY_ACTION',
      dangerLevel: action.dangerLevel,
      requiredCapability: this.mapActionToCapability(action.actionType),
      requiredTool: undefined,
      requiresApproval: APPROVAL_REQUIRED_ACTIONS.has(action.actionType),
    }));
  }

  // ─── Parameter Extraction ──────────────────────────────────────────────────

  private extractParameters(
    steps: ProcedureStep[],
    actions: SemanticAction[]
  ): { inputs: ProcedureParameter[]; parameterizedSteps: ProcedureStep[] } {
    const inputMap = new Map<string, ProcedureParameter>();

    // Look for string parameters that look variable (names, paths, identifiers)
    for (const action of actions) {
      for (const param of action.parameters) {
        if (param.isRedacted || param.isSensitive) continue;
        if (typeof param.value === 'string' && this.isLikelyVariable(param.name, param.value)) {
          if (!inputMap.has(param.name)) {
            inputMap.set(param.name, {
              name: param.name,
              description: `Variable: ${param.name}`,
              type: 'string',
              required: true,
              exampleValue: param.value,
            });
          }
        }
      }
    }

    return {
      inputs: Array.from(inputMap.values()),
      parameterizedSteps: steps,
    };
  }

  private isLikelyVariable(name: string, value: string): boolean {
    // Short values, IDs, names, paths are likely variables
    if (value.length > 200) return false; // Too long = probably content, not identifier
    const variablePatterns = [/name/i, /id/i, /path/i, /url/i, /target/i, /project/i, /repo/i];
    return variablePatterns.some((p) => p.test(name));
  }

  // ─── Capability Inference ──────────────────────────────────────────────────

  private inferRequiredCapabilities(actions: SemanticAction[]): string[] {
    const caps = new Set<string>();
    for (const action of actions) {
      const cap = this.mapActionToCapability(action.actionType);
      if (cap) caps.add(cap);
    }
    return Array.from(caps);
  }

  private mapActionToCapability(actionType: SemanticActionType): string | undefined {
    const map: Partial<Record<SemanticActionType, string>> = {
      USE_BROWSER: 'browser',
      RUN_COMMAND: 'terminal',
      CALL_API: 'api',
      CREATE_FILE: 'filesystem',
      EDIT_FILE: 'filesystem',
      DELETE_FILE: 'filesystem',
      DEPLOY: 'deployment',
      PUBLISH: 'publishing',
    };
    return map[actionType];
  }

  // ─── Trigger Phrases ───────────────────────────────────────────────────────

  private inferTriggerPhrases(objective: string, name: string): string[] {
    const phrases: string[] = [];
    const lower = objective.toLowerCase();
    phrases.push(`use the ${name} procedure`);
    phrases.push(`do ${name}`);
    phrases.push(`run the ${name} workflow`);
    if (lower.includes('deploy')) phrases.push('deploy using the learned process');
    if (lower.includes('create')) phrases.push('create using the learned workflow');
    return [...new Set(phrases)].slice(0, 8);
  }

  // ─── Risk Assessment ───────────────────────────────────────────────────────

  private assessRiskLevel(actions: SemanticAction[]): ProcedureProposal['riskLevel'] {
    const hasCritical = actions.some((a) => a.dangerLevel === 'IRREVERSIBLE');
    const hasDestructive = actions.some((a) => a.dangerLevel === 'DESTRUCTIVE');
    const hasExternal = actions.some((a) => a.dangerLevel === 'EXTERNAL');
    const hasWrite = actions.some((a) => a.dangerLevel === 'WRITE');

    if (hasCritical) return 'CRITICAL';
    if (hasDestructive) return 'HIGH';
    if (hasExternal) return 'MEDIUM';
    if (hasWrite) return 'MEDIUM';
    return 'LOW';
  }

  // ─── Confidence Computation ────────────────────────────────────────────────

  private computeConfidenceFactors(relevant: SemanticAction[], all: SemanticAction[]): ProcedureProposal['confidenceFactors'] {
    const structuredCount = relevant.filter((a) => a.source !== 'VISION_OCR' && a.source !== 'INFERRED').length;
    const verifiedCount = relevant.filter((a) => a.isVerified).length;
    const importantCount = relevant.filter((a) => a.isImportant).length;
    const ignoredRatio = all.length > 0 ? (all.length - relevant.length) / all.length : 0;

    return {
      observationQuality: Math.min(1.0, relevant.length / 5),
      structuredSourceCoverage: relevant.length > 0 ? structuredCount / relevant.length : 0,
      semanticConsistency: importantCount > 0 ? 0.9 : 0.7,
      verificationCoverage: relevant.length > 0 ? verifiedCount / relevant.length : 0,
      generalizationCertainty: 0.6,
      ambiguity: ignoredRatio,
    };
  }

  private computeOverallConfidence(factors: ProcedureProposal['confidenceFactors']): number {
    const weighted =
      factors.observationQuality * 0.25 +
      factors.structuredSourceCoverage * 0.20 +
      factors.semanticConsistency * 0.20 +
      factors.verificationCoverage * 0.15 +
      factors.generalizationCertainty * 0.15 -
      factors.ambiguity * 0.05;
    return Math.max(0.1, Math.min(0.99, weighted));
  }

  // ─── Generalizability ──────────────────────────────────────────────────────

  private assessGeneralizability(
    actions: SemanticAction[],
    inputs: ProcedureParameter[]
  ): { isGeneralizable: boolean; caveats: string[] } {
    const caveats: string[] = [];

    if (inputs.length === 0) {
      caveats.push('No parameterized inputs detected — procedure may be too specific to this demonstration.');
    }

    const hasHardcodedPaths = actions.some(
      (a) => a.parameters.some((p) => typeof p.value === 'string' && /^[A-Z]:\\|^\/home\//.test(p.value as string))
    );
    if (hasHardcodedPaths) {
      caveats.push('Hard-coded file paths detected — replace with parameters for portability.');
    }

    const hasExternalDependency = actions.some((a) => a.dangerLevel === 'EXTERNAL');
    if (hasExternalDependency) {
      caveats.push('External service calls — availability cannot be guaranteed across environments.');
    }

    return {
      isGeneralizable: caveats.length <= 2,
      caveats,
    };
  }

  // ─── Compilation Target ────────────────────────────────────────────────────

  private determineCompilationTarget(
    actions: SemanticAction[],
    steps: ProcedureStep[]
  ): ProcedureProposal['compilationTarget'] {
    // Multi-application or complex branching → WORKFLOW
    const uniqueApps = new Set(actions.map((a) => a.application).filter(Boolean)).size;
    const hasBranching = steps.some((s) => s.isBranch);
    const hasLooping = steps.some((s) => s.isLoop);

    if (uniqueApps > 1 || hasBranching || hasLooping || steps.length > 10) return 'WORKFLOW';
    // Simple sequential capability → SKILL
    return 'SKILL';
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private inferProcedureName(objective: string, actions: SemanticAction[]): string {
    // Derive a camelCase name from the objective
    const words = objective.toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .split(' ')
      .filter((w) => w.length > 2)
      .slice(0, 4);

    if (words.length === 0) {
      const apps = [...new Set(actions.map((a) => a.application).filter(Boolean))].slice(0, 2).join('_');
      return `learned_procedure_${apps || Date.now()}`;
    }

    return words.map((w, i) => i === 0 ? w : w[0].toUpperCase() + w.slice(1)).join('');
  }

  private inferDisplayName(objective: string): string {
    return objective.length > 80 ? objective.substring(0, 77) + '...' : objective;
  }

  private inferStepName(action: SemanticAction): string {
    const type = action.actionType.replace(/_/g, ' ').toLowerCase();
    if (action.target?.description) return `${type}: ${action.target.description}`;
    if (action.application) return `${type} in ${action.application}`;
    return type;
  }

  private inferParamType(value: unknown): string {
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object' && value !== null) return 'object';
    return 'string';
  }

  private inferAssumptions(actions: SemanticAction[]): string[] {
    const assumptions: string[] = [];
    const apps = [...new Set(actions.map((a) => a.application).filter(Boolean))];
    for (const app of apps) {
      assumptions.push(`${app} is installed and accessible`);
    }
    return assumptions;
  }

  private inferVerificationConditions(actions: SemanticAction[]): string[] {
    return actions
      .filter((a) => a.resultingState || a.verificationEvidence)
      .map((a) => a.resultingState || 'State verified')
      .filter(Boolean) as string[];
  }

  private inferRecoveryStrategies(actions: SemanticAction[]): string[] {
    const strategies = new Set<string>();
    for (const action of actions) {
      if (!action.isReversible) strategies.add('RESTORE_CHECKPOINT');
      if (action.dangerLevel === 'EXTERNAL') strategies.add('RETRY_WITH_BACKOFF');
      strategies.add('RE_OBSERVE');
    }
    return Array.from(strategies);
  }

  private inferExpectedArtifacts(actions: SemanticAction[]): string[] {
    const artifacts: string[] = [];
    for (const action of actions) {
      if (action.actionType === 'CREATE_FILE' && action.target?.filePath) {
        artifacts.push(action.target.filePath);
      }
      if (action.actionType === 'CREATE_ARTIFACT') {
        artifacts.push('generated artifact');
      }
    }
    return artifacts;
  }
}
