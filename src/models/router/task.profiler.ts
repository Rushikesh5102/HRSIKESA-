/**
 * HṚṢĪKEŚA (हृषीकेश) — Task Profiler & Intent Classifier
 *
 * Phase 18: Deterministic Multi-Dimensional Task Profiling
 */

import {
  TaskProfile,
  TaskType,
  TaskComplexity,
  PrivacyLevel,
  ChatRequest,
  ModelRequest,
} from '../interfaces/model.types.js';

export class TaskProfiler {
  /**
   * Profile a single ModelRequest or multi-turn ChatRequest.
   */
  public static profile(
    request: ModelRequest | ChatRequest,
    contextOptions: {
      agentId?: string;
      companyId?: string;
      projectId?: string;
      goalId?: string;
      missionId?: string;
      explicitPrivacy?: PrivacyLevel;
      explicitTaskType?: TaskType;
    } = {}
  ): TaskProfile {
    // Extract full text content
    let textContent = '';
    if ('messages' in request && Array.isArray(request.messages)) {
      textContent = request.messages.map((m) => `${m.role}: ${m.content}`).join('\n');
    } else if ('prompt' in request) {
      textContent = `${request.systemPrompt || ''}\n${request.prompt}`;
    }

    const lower = textContent.toLowerCase();

    // 1. Task Type Classification
    const taskType: TaskType = contextOptions.explicitTaskType || (request as any).taskType || this.classifyTaskType(lower, request);

    // 2. Complexity Classification
    const complexity: TaskComplexity = (request as any).complexity || this.classifyComplexity(lower, textContent, taskType);

    // 3. Capability Requirements
    const requiresTools = Boolean(
      ('tools' in request && request.tools && request.tools.length > 0) ||
      lower.includes('execute tool') ||
      lower.includes('run command') ||
      lower.includes('browse url') ||
      lower.includes('click element')
    );

    const requiresStructuredOutput = Boolean(
      ('format' in request && request.format === 'json') ||
      lower.includes('return json') ||
      lower.includes('json schema') ||
      lower.includes('structured json') ||
      taskType === 'STRUCTURED_EXTRACTION'
    );

    const requiresVision = Boolean(
      lower.includes('image') ||
      lower.includes('screenshot') ||
      lower.includes('photo') ||
      lower.includes('diagram') ||
      lower.includes('data:image/') ||
      taskType === 'VISION'
    );

    const requiresReasoning = Boolean(
      complexity === 'COMPLEX' ||
      complexity === 'CRITICAL' ||
      taskType === 'PLANNING' ||
      taskType === 'GOAL_DECOMPOSITION' ||
      taskType === 'CODE_REVIEW' ||
      lower.includes('step-by-step reasoning') ||
      lower.includes('chain of thought') ||
      lower.includes('architectural trade-offs')
    );

    const requiresAudio = Boolean(taskType === 'VOICE' || lower.includes('speech') || lower.includes('audio'));

    // 4. Privacy Classification
    const privacyLevel: PrivacyLevel = contextOptions.explicitPrivacy || (request as any).privacyLevel || this.classifyPrivacy(lower, textContent);

    // 5. Estimated Input Tokens (~4 chars per token)
    const estimatedInputTokens = Math.max(1, Math.ceil(textContent.length / 4));

    // 6. Latency & Cost Sensitivities
    const latencyPriority = (complexity === 'SIMPLE' || taskType === 'CONVERSATION') ? 'HIGH' : 'NORMAL';
    const costSensitivity = (privacyLevel === 'HIGHLY_PRIVATE' || privacyLevel === 'PRIVATE') ? 'HIGH' : 'MEDIUM';

    // 7. Preferred Model Tier
    let preferredTier: import('../interfaces/model.types.js').ModelTier = 'FAST_LOCAL';
    if (requiresVision) {
      preferredTier = 'CLOUD_VISION';
    } else if (
      complexity === 'COMPLEX' ||
      complexity === 'CRITICAL' ||
      taskType === 'PLANNING' ||
      taskType === 'GOAL_DECOMPOSITION' ||
      taskType === 'MISSION_EXECUTION'
    ) {
      preferredTier = 'BALANCED_DEEP_LOCAL';
    } else {
      preferredTier = 'FAST_LOCAL';
    }

    return {
      taskType,
      complexity,
      estimatedInputTokens,
      requiresTools,
      requiresStructuredOutput,
      requiresVision,
      requiresReasoning,
      requiresAudio,
      privacyLevel,
      latencyPriority,
      costSensitivity,
      preferredTier,
      agentId: contextOptions.agentId,
      companyId: contextOptions.companyId,
      projectId: contextOptions.projectId,
      goalId: contextOptions.goalId,
      missionId: contextOptions.missionId,
    };
  }

  private static classifyTaskType(lower: string, request: ModelRequest | ChatRequest): TaskType {
    if ('tools' in request && request.tools && request.tools.length > 0) {
      if (lower.includes('mission') || lower.includes('execute task')) return 'MISSION_EXECUTION';
    }

    if (lower.includes('verify') || lower.includes('audit') || lower.includes('fact-check') || lower.includes('test assertion')) {
      return 'VERIFICATION';
    }
    if (lower.includes('research') || lower.includes('investigate') || lower.includes('market analysis') || lower.includes('web intelligence')) {
      return 'RESEARCH';
    }
    if (lower.includes('plan') || lower.includes('roadmap') || lower.includes('strategy') || lower.includes('milestone')) {
      return 'PLANNING';
    }
    if (lower.includes('decompose') || lower.includes('goal breakdown')) {
      return 'GOAL_DECOMPOSITION';
    }
    if (lower.includes('review code') || lower.includes('pull request') || lower.includes('diff review') || lower.includes('security review')) {
      return 'CODE_REVIEW';
    }
    if (lower.includes('function') || lower.includes('class ') || lower.includes('typescript') || lower.includes('javascript') || lower.includes('python') || lower.includes('write code') || lower.includes('refactor') || lower.includes('bug fix') || lower.includes('algorithm') || lower.includes('regex')) {
      return 'CODE';
    }
    if (lower.includes('extract') || lower.includes('parse schema') || ('format' in request && request.format === 'json')) {
      return 'STRUCTURED_EXTRACTION';
    }
    if (lower.includes('summarize') || lower.includes('summary') || lower.includes('tldr') || lower.includes('brief overview')) {
      return 'SUMMARIZATION';
    }
    if (lower.includes('document') || lower.includes('pdf') || lower.includes('paper')) {
      return 'DOCUMENT_ANALYSIS';
    }
    if (lower.includes('dataset') || lower.includes('csv') || lower.includes('statistics') || lower.includes('analytics')) {
      return 'DATA_ANALYSIS';
    }
    if (lower.includes('classify') || lower.includes('categorize') || lower.includes('intent')) {
      return 'CLASSIFICATION';
    }
    if (lower.includes('why') || lower.includes('explain how') || lower.includes('pros and cons') || lower.includes('compare')) {
      return 'REASONING';
    }

    return 'CONVERSATION';
  }

  private static classifyComplexity(lower: string, rawText: string, taskType: TaskType): TaskComplexity {
    // Critical operations: safety, disaster recovery, permission changes
    if (
      lower.includes('permission') ||
      lower.includes('root authority') ||
      lower.includes('disaster recovery') ||
      lower.includes('delete database') ||
      lower.includes('retire agent')
    ) {
      return 'CRITICAL';
    }

    // Complex tasks: multi-step coding, architectural planning, long research
    if (
      taskType === 'PLANNING' ||
      taskType === 'GOAL_DECOMPOSITION' ||
      taskType === 'CODE_REVIEW' ||
      taskType === 'MISSION_EXECUTION' ||
      rawText.length > 2500 ||
      lower.includes('architecture') ||
      lower.includes('end-to-end') ||
      lower.includes('multi-step')
    ) {
      return 'COMPLEX';
    }

    // Simple tasks: greetings, time checks, brief arithmetic, short conversational turns
    if (
      rawText.length < 150 &&
      !lower.includes('architecture') &&
      !lower.includes('multi-step') &&
      !lower.includes('strategy') &&
      (
        lower.includes('hello') ||
        lower.includes('hi') ||
        lower.includes('what time') ||
        lower.includes('who are you') ||
        lower.includes('thank') ||
        /\b\d+\s*[\+\-\*\/]\s*\d+\b/.test(lower) ||
        taskType === 'CONVERSATION'
      )
    ) {
      return 'SIMPLE';
    }

    return 'STANDARD';
  }

  private static classifyPrivacy(lower: string, _rawText?: string): PrivacyLevel {
    // Highly private: credentials, API keys, private keys, passwords
    if (
      lower.includes('password') ||
      lower.includes('api_key') ||
      lower.includes('apikey') ||
      lower.includes('secret_key') ||
      lower.includes('bearer token') ||
      lower.includes('ssh-rsa') ||
      lower.includes('credentials')
    ) {
      return 'HIGHLY_PRIVATE';
    }

    // Private: personal finances, resumes, proprietary internal strategy, personal journal
    if (
      lower.includes('personal resume') ||
      lower.includes('financial report') ||
      lower.includes('bank statement') ||
      lower.includes('confidential') ||
      lower.includes('private memory')
    ) {
      return 'PRIVATE';
    }

    // Public: web search, open-source repositories, publicly accessible articles
    if (
      lower.includes('github.com') ||
      lower.includes('public documentation') ||
      lower.includes('wikipedia') ||
      lower.includes('web search')
    ) {
      return 'PUBLIC';
    }

    return 'NORMAL';
  }
}
