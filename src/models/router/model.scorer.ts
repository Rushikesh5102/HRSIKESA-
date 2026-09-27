/**
 * HṚṢĪKEŚA (हृषीकेश) — Explainable Model Scorer & Policy Engine
 *
 * Phase 18: Deterministic Hard Constraint Filtering + Explainable Weighted Multi-Factor Scoring
 */

import {
  ModelMetadata,
  TaskProfile,
  RoutingPolicy,
  CandidateModelScore,
  ProviderHealth,
} from '../interfaces/model.types.js';

export class ModelScorer {
  /**
   * Score a candidate model against a task profile and active routing policy.
   */
  public static scoreModel(
    model: ModelMetadata,
    providerHealth: ProviderHealth,
    profile: TaskProfile,
    policy: RoutingPolicy = 'BALANCED',
    resourceConstrained = false
  ): CandidateModelScore {
    // 1. Hard Constraints Validation
    const constraintCheck = this.checkHardConstraints(model, providerHealth, profile, resourceConstrained);
    if (!constraintCheck.passed) {
      return {
        modelId: model.id,
        providerId: model.providerId,
        totalScore: 0,
        capabilityScore: 0,
        taskSuitabilityScore: 0,
        privacyScore: 0,
        reliabilityScore: 0,
        latencyScore: 0,
        costScore: 0,
        passedHardConstraints: false,
        rejectionReason: constraintCheck.reason,
      };
    }

    // 2. Individual Sub-scores (0..100)
    const capabilityScore = this.computeCapabilityScore(model, profile);
    const taskSuitabilityScore = this.computeTaskSuitabilityScore(model, profile);
    const privacyScore = this.computePrivacyScore(model, profile);
    const reliabilityScore = this.computeReliabilityScore(providerHealth);
    const latencyScore = this.computeLatencyScore(model);
    const costScore = this.computeCostScore(model);

    // 3. Policy Weights
    const weights = this.getPolicyWeights(policy);

    // 4. Weighted Total Score
    let totalScore =
      capabilityScore * weights.capability +
      taskSuitabilityScore * weights.taskSuitability +
      privacyScore * weights.privacy +
      reliabilityScore * weights.reliability +
      latencyScore * weights.latency +
      costScore * weights.cost;

    // Policy specific adjustments
    if (policy === 'LOCAL_FIRST' && model.isLocal) {
      totalScore += 25;
    } else if (policy === 'PRIVACY_FIRST' && model.isLocal) {
      totalScore += 30;
    } else if (policy === 'QUALITY_FIRST' && (model.capabilities.includes('reasoning') || model.capabilities.includes('code'))) {
      totalScore += 20;
    } else if (policy === 'COST_FIRST' && model.isLocal) {
      totalScore += 35;
    }

    // Empirical benchmark calibration: factor in model priority (e.g. Llama 3.2 3B = 130, Qwen 2.5 7B = 110, DeepSeek R1 = 70)
    if (model.priority) {
      totalScore += (model.priority - 100) * 0.25;
    }

    // Resource constraint adjustment: penalize newly loading heavy models if RAM constrained
    if (resourceConstrained && !model.isLocal) {
      totalScore -= 10;
    }

    return {
      modelId: model.id,
      providerId: model.providerId,
      totalScore: Math.round(Math.max(1, totalScore)),
      capabilityScore: Math.round(capabilityScore),
      taskSuitabilityScore: Math.round(taskSuitabilityScore),
      privacyScore: Math.round(privacyScore),
      reliabilityScore: Math.round(reliabilityScore),
      latencyScore: Math.round(latencyScore),
      costScore: Math.round(costScore),
      passedHardConstraints: true,
    };
  }

  private static checkHardConstraints(
    model: ModelMetadata,
    providerHealth: ProviderHealth,
    profile: TaskProfile,
    resourceConstrained: boolean
  ): { passed: boolean; reason?: string } {
    // 1. Provider health check
    if (providerHealth.status === 'unreachable' || providerHealth.status === 'unconfigured' || providerHealth.status === 'disabled') {
      return { passed: false, reason: `Provider '${model.providerId}' is ${providerHealth.status} (${providerHealth.message})` };
    }

    // 2. Model availability check
    if (model.availability === false) {
      return { passed: false, reason: `Model '${model.id}' is currently marked unavailable` };
    }

    // 3. Privacy constraint: High privacy strictly prohibits cloud models
    if ((profile.privacyLevel === 'HIGHLY_PRIVATE' || profile.privacyLevel === 'PRIVATE') && !model.isLocal) {
      return { passed: false, reason: `Task privacy level '${profile.privacyLevel}' strictly requires local execution; cloud model '${model.id}' rejected` };
    }

    // 4. Tools capability constraint
    if (profile.requiresTools) {
      const supportsTools = model.supportsTools === true || model.capabilities.includes('tools');
      if (!supportsTools) {
        return { passed: false, reason: `Task requires tool execution, but model '${model.id}' does not support tools` };
      }
    }

    // 5. Structured output constraint
    if (profile.requiresStructuredOutput) {
      const supportsStructured =
        model.supportsStructuredOutput === true ||
        model.capabilities.includes('structured-output') ||
        model.capabilities.includes('json');
      if (!supportsStructured) {
        return { passed: false, reason: `Task requires structured JSON output, but model '${model.id}' lacks structured output support` };
      }
    }

    // 6. Vision constraint
    if (profile.requiresVision) {
      const supportsVision = model.supportsVision === true || model.capabilities.includes('vision');
      if (!supportsVision) {
        return { passed: false, reason: `Task requires visual multimodal input, but model '${model.id}' does not support vision` };
      }
    }

    // 7. Context window constraint
    if (model.contextWindow && profile.estimatedInputTokens > model.contextWindow) {
      return {
        passed: false,
        reason: `Estimated input tokens (${profile.estimatedInputTokens}) exceeds context window limit (${model.contextWindow}) of model '${model.id}'`,
      };
    }

    // 8. Resource pressure constraint
    if (resourceConstrained && !model.isLocal && profile.privacyLevel === 'PRIVATE') {
      return { passed: false, reason: `Host laptop memory is constrained; private tasks must use existing local runtime` };
    }

    return { passed: true };
  }

  private static computeCapabilityScore(model: ModelMetadata, profile: TaskProfile): number {
    let score = 50;

    if (profile.taskType === 'CODE' || profile.taskType === 'CODE_REVIEW') {
      if (model.capabilities.includes('code')) score += 30;
      if (model.id.includes('coder') || model.id.includes('qwen2.5-coder')) score += 20;
    } else if (profile.taskType === 'REASONING' || profile.taskType === 'PLANNING' || profile.taskType === 'GOAL_DECOMPOSITION') {
      if (model.capabilities.includes('reasoning') || model.supportsReasoning) score += 30;
      if (model.capabilities.includes('chat')) score += 20;
    } else if (profile.taskType === 'RESEARCH' || profile.taskType === 'SUMMARIZATION') {
      if (model.capabilities.includes('text-generation')) score += 25;
      if (model.capabilities.includes('chat')) score += 25;
    } else {
      if (model.capabilities.includes('chat')) score += 40;
    }

    return Math.min(100, score);
  }

  private static computeTaskSuitabilityScore(model: ModelMetadata, profile: TaskProfile): number {
    let score = 60;

    // Match preferred tier if assigned by TaskProfiler
    if (profile.preferredTier && model.modelTier === profile.preferredTier) {
      score += 25;
    }

    if (profile.complexity === 'SIMPLE') {
      if (model.modelTier === 'FAST_LOCAL') {
        score = 98; // Fast local models (e.g. Llama 3.2 3B) are optimal for simple tasks: sub-second TTFT (837ms), 14.4 t/s
      } else if (model.isLocal) {
        score = 80;
      }
    } else if (profile.complexity === 'COMPLEX' && model.modelTier === 'BALANCED_DEEP_LOCAL') {
      score = 92; // Deep local models (e.g. Qwen 2.5 7B) optimal for complex multi-step planning
    } else if (profile.complexity === 'CRITICAL' && (model.capabilities.includes('reasoning') || model.id.includes('gpt-4') || model.id.includes('claude-3-5'))) {
      score = 95;
    }

    // Empirical benchmark finding: deepseek-r1 emits extensive <think> blocks that exhaust response token budgets on non-pure-reasoning tasks
    if (model.id.toLowerCase().includes('deepseek-r1') && (!profile.requiresReasoning || profile.complexity === 'SIMPLE' || profile.requiresStructuredOutput)) {
      score -= 40;
    }

    return Math.min(100, Math.max(1, score));
  }

  private static computePrivacyScore(model: ModelMetadata, profile: TaskProfile): number {
    if (model.isLocal) {
      return 100; // Local inference never leaks data
    }
    if (profile.privacyLevel === 'PUBLIC') {
      return 85;
    }
    return 40;
  }

  private static computeReliabilityScore(health: ProviderHealth): number {
    if (health.status === 'healthy') return 100;
    if (health.status === 'degraded') return 60;
    return 10;
  }

  private static computeLatencyScore(model: ModelMetadata): number {
    if (model.latencyClass === 'FAST') return 95; // Fast local compact models (~800ms TTFT)
    if (model.latencyClass === 'MODERATE') return 70; // 7B models (~2000ms TTFT)
    if (model.latencyClass === 'SLOW') return 30; // Heavy thinking/slow models
    if (model.isLocal) return 75; // Zero network roundtrip
    return 50;
  }

  private static computeCostScore(model: ModelMetadata): number {
    if (model.isLocal || model.costClassification === 'free-local') {
      return 100; // Zero financial cost
    }
    if (model.costClass === 'LOW') return 75;
    if (model.costClass === 'MEDIUM') return 50;
    return 25;
  }

  private static getPolicyWeights(policy: RoutingPolicy): {
    capability: number;
    taskSuitability: number;
    privacy: number;
    reliability: number;
    latency: number;
    cost: number;
  } {
    switch (policy) {
      case 'LOCAL_FIRST':
        return { capability: 0.20, taskSuitability: 0.15, privacy: 0.25, reliability: 0.15, latency: 0.10, cost: 0.15 };
      case 'QUALITY_FIRST':
        return { capability: 0.40, taskSuitability: 0.30, privacy: 0.10, reliability: 0.10, latency: 0.05, cost: 0.05 };
      case 'SPEED_FIRST':
        return { capability: 0.20, taskSuitability: 0.15, privacy: 0.10, reliability: 0.15, latency: 0.30, cost: 0.10 };
      case 'COST_FIRST':
        return { capability: 0.20, taskSuitability: 0.15, privacy: 0.15, reliability: 0.10, latency: 0.10, cost: 0.30 };
      case 'PRIVACY_FIRST':
        return { capability: 0.15, taskSuitability: 0.15, privacy: 0.40, reliability: 0.15, latency: 0.05, cost: 0.10 };
      case 'BALANCED':
      default:
        return { capability: 0.30, taskSuitability: 0.20, privacy: 0.15, reliability: 0.15, latency: 0.10, cost: 0.10 };
    }
  }
}
