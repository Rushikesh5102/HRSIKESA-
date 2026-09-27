/**
 * HṚṢĪKEŚA (हृषीकेश) — Advanced Model Router & Intelligence Gateway
 *
 * Phase 18: Provider- and Model-Agnostic Intelligent Routing
 */

import { ModelRegistry } from '../registry/model.registry.js';
import { IModelProvider } from '../interfaces/model.provider.js';
import {
  ModelRequest,
  ChatRequest,
  ModelResponse,
  RoutingDecision,
  TaskProfile,
  RoutingPolicy,
  FallbackReason,
  PrivacyLevel,
  TaskType,
  ModelPreferenceConfig,
  CandidateModelScore,
} from '../interfaces/model.types.js';
import { TaskProfiler } from './task.profiler.js';
import { ModelScorer } from './model.scorer.js';
import { ModelAuditRepository } from '../../persistence/repositories/model-audit.repository.js';
import { ResourceGovernor } from '../../core/hardware/resource.governor.js';
import { EventBus } from '../../core/events/event-bus.js';
import { ILogger } from '../../core/logging/logger.types.js';
import { HardwareDetector } from '../../core/hardware/hardware.detector.js';

export interface RouteDecision {
  readonly selected: boolean;
  readonly provider?: IModelProvider;
  readonly modelId?: string;
  readonly reason: string;
}

export class ModelRouter {
  private readonly registry: ModelRegistry;
  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;
  private readonly hardwareDetector?: HardwareDetector;
  private auditRepo?: ModelAuditRepository;
  private resourceGovernor?: ResourceGovernor;
  private activePolicy: RoutingPolicy = 'BALANCED';

  constructor(
    registry: ModelRegistry,
    eventBus?: EventBus,
    logger?: ILogger,
    hardwareDetector?: HardwareDetector,
    auditRepo?: ModelAuditRepository,
    resourceGovernor?: ResourceGovernor
  ) {
    this.registry = registry;
    this.eventBus = eventBus;
    this.logger = logger?.child('ModelRouter');
    this.hardwareDetector = hardwareDetector;
    this.auditRepo = auditRepo;
    this.resourceGovernor = resourceGovernor;
  }

  public getRegistry(): ModelRegistry {
    return this.registry;
  }

  public setAuditRepository(repo: ModelAuditRepository): void {
    this.auditRepo = repo;
  }

  public setResourceGovernor(governor: ResourceGovernor): void {
    this.resourceGovernor = governor;
  }

  public getPolicy(): RoutingPolicy {
    if (this.auditRepo) {
      try {
        const pref = this.auditRepo.getPreferences();
        this.activePolicy = pref.activePolicy;
      } catch {}
    }
    return this.activePolicy;
  }

  public setPolicy(policy: RoutingPolicy): void {
    this.activePolicy = policy;
    if (this.auditRepo) {
      try {
        this.auditRepo.updatePreferences({ activePolicy: policy });
      } catch {}
    }
    this.logger?.info(`Active model routing policy set to [${policy}]`);
  }

  public getPreferenceConfig(): ModelPreferenceConfig {
    if (this.auditRepo) {
      try {
        return this.auditRepo.getPreferences();
      } catch {}
    }
    return {
      id: 'default',
      activePolicy: this.activePolicy,
      privacyThreshold: 'NORMAL',
      costLimitUsd: 10.0,
      defaultLocalModel: 'llama3.2:3b',
      defaultCloudModel: 'gpt-4o',
      updatedAt: new Date().toISOString(),
    };
  }

  public setPreferenceConfig(config: Partial<ModelPreferenceConfig>): void {
    if (config.activePolicy) {
      this.activePolicy = config.activePolicy;
    }
    if (this.auditRepo) {
      try {
        this.auditRepo.updatePreferences(config);
      } catch {}
    }
  }

  /**
   * Advanced multi-dimensional route decision with explainable scoring and policy checks.
   */
  public routeAdvanced(
    request: ModelRequest | ChatRequest,
    contextOptions: {
      agentId?: string;
      companyId?: string;
      projectId?: string;
      goalId?: string;
      missionId?: string;
      explicitPrivacy?: PrivacyLevel;
      explicitTaskType?: TaskType;
      policyOverride?: RoutingPolicy;
    } = {}
  ): RoutingDecision {
    const policy = contextOptions.policyOverride || this.getPolicy();
    const profile: TaskProfile = TaskProfiler.profile(request, contextOptions);
    const allProviders = this.registry.getAllRecords();

    // Check host resource state
    let isMemoryConstrained = false;
    if (this.resourceGovernor) {
      const metrics = this.resourceGovernor.getMetrics();
      isMemoryConstrained = metrics.pressureLevel === 'CRITICAL_MEMORY' || metrics.pressureLevel === 'LOW_MEMORY';
    }

    // Explicit provider/model preference check
    if (request.preferredProvider || request.preferredModel) {
      const explicitProviderId = request.preferredProvider;
      const explicitModelId = request.preferredModel;

      if (explicitProviderId) {
        const provRecord = this.registry.getProviderRecord(explicitProviderId);
        if (provRecord && provRecord.enabled && (provRecord.health.status === 'healthy' || provRecord.health.status === 'degraded')) {
          const matchedModel = explicitModelId
            ? provRecord.models.find((m) => m.id === explicitModelId)
            : provRecord.models[0];

          if (matchedModel) {
            return {
              selected: true,
              modelId: matchedModel.id,
              providerId: provRecord.provider.id,
              modelTier: matchedModel.modelTier,
              reason: `Explicitly routed to preferred model '${matchedModel.id}' on provider '${provRecord.provider.displayName}'.`,
              taskProfile: profile,
              policyApplied: policy,
              estimatedCostUsd: matchedModel.isLocal ? 0.0 : 0.002,
              estimatedLatencyMs: matchedModel.isLocal ? 150 : 800,
              privacyClassification: profile.privacyLevel,
              fallbacks: [],
              candidateScores: [
                {
                  modelId: matchedModel.id,
                  providerId: provRecord.provider.id,
                  totalScore: 100,
                  capabilityScore: 100,
                  taskSuitabilityScore: 100,
                  privacyScore: matchedModel.isLocal ? 100 : 80,
                  reliabilityScore: 100,
                  latencyScore: 100,
                  costScore: matchedModel.isLocal ? 100 : 50,
                  passedHardConstraints: true,
                },
              ],
              policyChecks: {
                privacyPassed: true,
                contextPassed: true,
                capabilitiesPassed: true,
                authorizationPassed: true,
                resourceGovernorApproved: true,
              },
            };
          }
        }
      }
    }

    // Collect all candidate models from enabled providers
    const candidateScores: CandidateModelScore[] = [];

    for (const record of allProviders) {
      if (!record.enabled) continue;

      for (const model of record.models) {
        // Exclude embedding-only models from conversational/general routing
        if (model.id.toLowerCase().includes('embed') && profile.taskType !== 'EMBEDDING') {
          continue;
        }

        const score = ModelScorer.scoreModel(
          model,
          record.health,
          profile,
          policy,
          isMemoryConstrained
        );
        candidateScores.push(score);
      }
    }

    // Sort valid candidates descending by totalScore
    const validCandidates = candidateScores
      .filter((c) => c.passedHardConstraints)
      .sort((a, b) => b.totalScore - a.totalScore);

    if (validCandidates.length === 0) {
      let reasonMsg: string;
      if (candidateScores.length === 0) {
        reasonMsg = 'No active AI models available: 0 models installed in Ollama and 0 cloud providers configured. To install a local model, execute: `ollama pull qwen2.5:7b`';
      } else {
        const topRejection = candidateScores.find((c) => c.rejectionReason)?.rejectionReason;
        reasonMsg = topRejection
          ? `No capable authorized model passed hard constraints: ${topRejection}`
          : `No active AI models available for task type '${profile.taskType}' under policy '${policy}'.`;
      }

      return {
        selected: false,
        reason: reasonMsg,
        taskProfile: profile,
        policyApplied: policy,
        privacyClassification: profile.privacyLevel,
        fallbacks: [],
        candidateScores,
        policyChecks: {
          privacyPassed: !candidateScores.some((c) => c.rejectionReason?.includes('privacy')),
          contextPassed: !candidateScores.some((c) => c.rejectionReason?.includes('context')),
          capabilitiesPassed: false,
          authorizationPassed: !candidateScores.some((c) => c.rejectionReason?.includes('unauthorized')),
          resourceGovernorApproved: !isMemoryConstrained,
        },
      };
    }

    const topCandidate = validCandidates[0];
    const targetModelMeta = this.registry.getModel(topCandidate.providerId, topCandidate.modelId);
    const fallbacks = validCandidates.slice(1, 4).map((c) => ({
      modelId: c.modelId,
      providerId: c.providerId,
      reason: `Alternative ranked candidate (score: ${c.totalScore})`,
    }));

    const isLocal = targetModelMeta?.isLocal ?? (topCandidate.providerId === 'ollama');
    const estimatedCostUsd = isLocal ? 0.0 : this.estimateCost(profile.estimatedInputTokens, 500, targetModelMeta?.pricing);
    const estimatedLatencyMs = isLocal ? (profile.complexity === 'SIMPLE' ? 120 : 600) : 1200;
    const explainReason = this.buildExplanation(topCandidate, targetModelMeta, profile, policy);

    const decision: RoutingDecision = {
      selected: true,
      modelId: topCandidate.modelId,
      providerId: topCandidate.providerId,
      modelTier: targetModelMeta?.modelTier,
      reason: explainReason,
      taskProfile: profile,
      policyApplied: policy,
      estimatedCostUsd,
      estimatedLatencyMs,
      privacyClassification: profile.privacyLevel,
      fallbacks,
      candidateScores,
      policyChecks: {
        privacyPassed: true,
        contextPassed: true,
        capabilitiesPassed: true,
        authorizationPassed: true,
        resourceGovernorApproved: true,
      },
    };

    this.eventBus?.emit('model.routed' as any, {
      selected: true,
      providerId: decision.providerId,
      modelId: decision.modelId,
      taskType: profile.taskType,
      policyApplied: policy,
      costUsd: estimatedCostUsd,
    });

    return decision;
  }

  /**
   * Preview routing decision without executing model inference.
   */
  public preview(request: ModelRequest | ChatRequest): RoutingDecision {
    return this.routeAdvanced(request);
  }

  /**
   * Legacy simple route method for backward compatibility.
   */
  public route(request: ModelRequest): RouteDecision {
    const advanced = this.routeAdvanced(request);
    if (!advanced.selected || !advanced.providerId || !advanced.modelId) {
      return {
        selected: false,
        reason: advanced.reason,
      };
    }

    const prov = this.registry.getProvider(advanced.providerId);
    return {
      selected: true,
      provider: prov,
      modelId: advanced.modelId,
      reason: advanced.reason,
    };
  }

  /**
   * Route and execute a ModelRequest with fallback recovery.
   */
  public async routeAndExecute(request: ModelRequest): Promise<ModelResponse> {
    const decision = this.routeAdvanced(request);
    if (!decision.selected || !decision.providerId || !decision.modelId) {
      throw new Error(decision.reason);
    }

    const provider = this.registry.getProvider(decision.providerId);
    if (!provider) {
      throw new Error(`Provider '${decision.providerId}' not found in registry`);
    }

    const startTime = Date.now();
    let lockAcquired = false;

    if (provider.isLocal && this.hardwareDetector) {
      lockAcquired = await this.hardwareDetector.acquireLocalModelLockAsync(8000, request.priority || 'NORMAL');
      if (!lockAcquired) {
        throw new Error('Local model concurrency limit reached (ADR-006: 1 active local inference lock).');
      }
    }

    try {
      const response = await provider.generate({
        ...request,
        preferredModel: decision.modelId,
      });

      const latencyMs = Date.now() - startTime;
      this.recordAudit(decision, response, latencyMs, true);

      return {
        ...response,
        routingReason: decision.reason,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;

      // Attempt fallback if candidate models exist
      if (decision.fallbacks.length > 0) {
        this.logger?.warn(`Primary model [${decision.providerId}:${decision.modelId}] failed (${err.message}). Attempting fallback.`);
        const fallback = decision.fallbacks[0];
        const fbProvider = this.registry.getProvider(fallback.providerId);

        if (fbProvider) {
          try {
            const fbResponse = await fbProvider.generate({
              ...request,
              preferredModel: fallback.modelId,
            });
            const fbLatencyMs = Date.now() - startTime;
            this.recordAudit(decision, fbResponse, fbLatencyMs, true, true, 'PROVIDER_ERROR');

            return {
              ...fbResponse,
              fallbackOccurred: true,
              fallbackReason: `Primary [${decision.modelId}] failed: ${err.message}`,
              routingReason: `Fallback to [${fallback.providerId}:${fallback.modelId}]`,
            };
          } catch (fbErr) {
            this.logger?.error(`Fallback execution also failed: ${fbErr}`);
          }
        }
      }

      this.recordAudit(decision, undefined, latencyMs, false, false, undefined, err.message);
      throw err;
    } finally {
      if (lockAcquired && this.hardwareDetector) {
        this.hardwareDetector.releaseLocalModelLock();
      }
    }
  }

  /**
   * Route and execute a multi-turn ChatRequest with fallback recovery.
   */
  public async routeChat(request: ChatRequest): Promise<ModelResponse> {
    const decision = this.routeAdvanced(request, {
      agentId: request.agentId,
      goalId: request.goalId,
      missionId: request.missionId,
    });

    if (!decision.selected || !decision.providerId || !decision.modelId) {
      throw new Error(decision.reason);
    }

    const provider = this.registry.getProvider(decision.providerId);
    if (!provider) {
      throw new Error(`Provider '${decision.providerId}' not found in registry`);
    }

    const startTime = Date.now();
    let lockAcquired = false;

    if (provider.isLocal && this.hardwareDetector) {
      lockAcquired = await this.hardwareDetector.acquireLocalModelLockAsync(request.timeoutMs || 8000, request.priority || 'NORMAL');
      if (!lockAcquired) {
        throw new Error('Local model concurrency limit reached (ADR-006: 1 active local inference lock).');
      }
    }

    try {
      const response = await provider.chat({
        ...request,
        preferredModel: decision.modelId,
      });

      const latencyMs = Date.now() - startTime;
      this.recordAudit(decision, response, latencyMs, true);

      return {
        ...response,
        routingReason: decision.reason,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;

      // Attempt fallback if candidate models exist
      if (decision.fallbacks.length > 0) {
        this.logger?.warn(`Primary chat model [${decision.providerId}:${decision.modelId}] failed (${err.message}). Attempting fallback.`);
        const fallback = decision.fallbacks[0];
        const fbProvider = this.registry.getProvider(fallback.providerId);

        if (fbProvider) {
          try {
            const fbResponse = await fbProvider.chat({
              ...request,
              preferredModel: fallback.modelId,
            });
            const fbLatencyMs = Date.now() - startTime;
            this.recordAudit(decision, fbResponse, fbLatencyMs, true, true, 'PROVIDER_ERROR');

            return {
              ...fbResponse,
              fallbackOccurred: true,
              fallbackReason: `Primary [${decision.modelId}] failed: ${err.message}`,
              routingReason: `Fallback to [${fallback.providerId}:${fallback.modelId}]`,
            };
          } catch (fbErr) {
            this.logger?.error(`Fallback chat execution also failed: ${fbErr}`);
          }
        }
      }

      this.recordAudit(decision, undefined, latencyMs, false, false, undefined, err.message);
      throw err;
    } finally {
      if (lockAcquired && this.hardwareDetector) {
        this.hardwareDetector.releaseLocalModelLock();
      }
    }
  }

  /**
   * Route and execute a chat request (alias for backwards compatibility across subsystems).
   */
  public async routeAndExecuteChat(request: ChatRequest): Promise<ModelResponse> {
    return this.routeChat(request);
  }

  private buildExplanation(
    candidate: CandidateModelScore,
    meta: any,
    profile: TaskProfile,
    policy: RoutingPolicy
  ): string {
    const isLocal = meta?.isLocal ?? (candidate.providerId === 'ollama');
    const reasons: string[] = [];

    if (isLocal) {
      reasons.push(`Local zero-cost model (${meta?.costClassification || 'free-local'})`);
    } else {
      reasons.push(`Cloud provider '${candidate.providerId}'`);
    }

    if (profile.complexity === 'SIMPLE') {
      reasons.push('optimal for simple interaction');
    } else if (profile.complexity === 'COMPLEX' || profile.complexity === 'CRITICAL') {
      reasons.push(`capable of complex ${profile.taskType.toLowerCase()}`);
    }

    if (profile.privacyLevel === 'HIGHLY_PRIVATE' || profile.privacyLevel === 'PRIVATE') {
      reasons.push(`strictly honors ${profile.privacyLevel.toLowerCase()} privacy constraint`);
    }

    if (policy !== 'BALANCED') {
      reasons.push(`matches [${policy}] policy`);
    }

    return `Selected [${candidate.providerId}:${candidate.modelId}] (score: ${candidate.totalScore}) — ${reasons.join(', ')}.`;
  }

  private estimateCost(
    inputTokens: number,
    outputTokens = 500,
    pricing?: { promptPerMillionUsd: number; completionPerMillionUsd: number }
  ): number {
    if (!pricing) return 0.0;
    const promptCost = (inputTokens / 1000000) * pricing.promptPerMillionUsd;
    const completionCost = (outputTokens / 1000000) * pricing.completionPerMillionUsd;
    return Math.round((promptCost + completionCost) * 10000) / 10000;
  }

  private recordAudit(
    decision: RoutingDecision,
    response?: ModelResponse,
    latencyMs = 0,
    success = true,
    fallbackOccurred = false,
    fallbackReason?: FallbackReason,
    errorMessage?: string
  ): void {
    if (!this.auditRepo) return;

    try {
      const promptTokens = response?.usage?.promptTokens || decision.taskProfile.estimatedInputTokens || 0;
      const completionTokens = response?.usage?.completionTokens || 0;
      const totalTokens = response?.usage?.totalTokens || (promptTokens + completionTokens);

      this.auditRepo.recordUsage({
        providerId: decision.providerId || 'unknown',
        modelId: decision.modelId || 'unknown',
        taskType: decision.taskProfile.taskType,
        complexity: decision.taskProfile.complexity,
        agentId: decision.taskProfile.agentId,
        goalId: decision.taskProfile.goalId,
        missionId: decision.taskProfile.missionId,
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCostUsd: decision.estimatedCostUsd || 0.0,
        latencyMs,
        success,
        errorMessage: errorMessage ? this.redactSecrets(errorMessage) : undefined,
        fallbackOccurred,
        fallbackReason,
        routingReason: this.redactSecrets(decision.reason),
        policyApplied: decision.policyApplied,
      });
    } catch (err) {
      this.logger?.warn('Failed to record model usage audit:', { error: String(err) });
    }
  }

  private redactSecrets(text: string): string {
    return text
      .replace(/sk-[a-zA-Z0-9_-]{20,}/g, '[REDACTED_API_KEY]')
      .replace(/Bearer\s+[a-zA-Z0-9_.-]+/gi, 'Bearer [REDACTED_TOKEN]')
      .replace(/key=[a-zA-Z0-9_-]{20,}/gi, 'key=[REDACTED]');
  }
}
