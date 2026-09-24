/**
 * HṚṢĪKEŚA (हृषीकेश) — Multimodal Context Assembler
 *
 * Phase 24: Aggregates multi-sensory context (Voice transcript, active window, screenshot,
 * UIA hierarchy, memory facts, goal/mission state) into a bounded, privacy-classified representation.
 */

import { ILogger } from '../../core/logging/logger.types.js';
import {
  MultimodalContext,
  MultimodalTaskBudget,
  DEFAULT_MULTIMODAL_BUDGET,
  PrivacyTier,
} from '../interfaces/multimodal.types.js';
import { MultimodalSecurityPolicy } from '../security/multimodal-security.policy.js';

export interface AssembleContextOptions {
  sessionId: string;
  utterance?: string;
  transcript?: {
    text: string;
    confidence: number;
    language?: string;
    isPartial?: boolean;
  };
  audioMetadata?: {
    durationMs: number;
    sampleRate?: number;
    vadTriggered?: boolean;
  };
  screenshot?: {
    pathOrData: string;
    dimensions: { width: number; height: number };
    capturedAt: string;
    privacyTier?: PrivacyTier;
  };
  uiTree?: {
    activeWindow?: string;
    activeApp?: string;
    elementsCount?: number;
    treeSummary?: string;
  };
  environment?: {
    environmentId?: string;
    type?: string;
    hostname?: string;
  };
  budget?: Partial<MultimodalTaskBudget>;
  explicitPrivacyTier?: PrivacyTier;
}

export class MultimodalContextAssembler {
  private readonly securityPolicy: MultimodalSecurityPolicy;
  private readonly logger?: ILogger;

  constructor(securityPolicyOrConfig?: MultimodalSecurityPolicy | any, logger?: ILogger) {
    if (securityPolicyOrConfig && typeof securityPolicyOrConfig.evaluatePromptInjection === 'function') {
      this.securityPolicy = securityPolicyOrConfig;
    } else if (securityPolicyOrConfig && securityPolicyOrConfig.securityPolicy) {
      this.securityPolicy = securityPolicyOrConfig.securityPolicy;
    } else {
      this.securityPolicy = new MultimodalSecurityPolicy();
    }
    this.logger = logger?.child('MultimodalContextAssembler');
  }

  public assembleContext(options: AssembleContextOptions | any): Promise<MultimodalContext> | MultimodalContext {
    if (options.userUtterance || options.activeApp || options.screenshot) {
      return this.assemble({
        sessionId: options.sessionId || 'default-session',
        utterance: options.userUtterance || options.utterance,
        transcript: typeof options.transcript === 'string'
          ? { text: options.transcript, confidence: 0.95 }
          : options.transcript,
        screenshot: typeof options.screenshot === 'string'
          ? { pathOrData: options.screenshot, dimensions: { width: 1920, height: 1080 }, capturedAt: new Date().toISOString() }
          : options.screenshot,
        uiTree: options.uiTree
          ? {
              activeApp: options.activeApp || options.uiTree.name,
              activeWindow: options.activeWindow,
              elementsCount: options.uiTree.children?.length || 1,
              treeSummary: JSON.stringify(options.uiTree).substring(0, 500),
            }
          : undefined,
        explicitPrivacyTier: options.explicitPrivacyTier,
      });
    }
    return this.assemble(options);
  }

  /**
   * Assembles a structured, bounded MultimodalContext ready for model reasoning or action routing.
   */
  public assemble(options: AssembleContextOptions): MultimodalContext {
    const budget: MultimodalTaskBudget = {
      ...DEFAULT_MULTIMODAL_BUDGET,
      ...options.budget,
    };

    // 1. Sanitize text and transcripts against prompt injection
    let utterance = options.utterance;
    if (utterance) {
      const defense = this.securityPolicy.evaluatePromptInjection(utterance);
      utterance = defense.sanitizedText;
    }

    let transcript: any = options.transcript;
    if (transcript) {
      if (typeof transcript === 'string') {
        const defense = this.securityPolicy.evaluatePromptInjection(transcript);
        transcript = defense.sanitizedText.length > 2000 ? defense.sanitizedText.substring(0, 2000) + '... [TRUNCATED]' : defense.sanitizedText;
      } else if (transcript.text) {
        const defense = this.securityPolicy.evaluatePromptInjection(transcript.text);
        const cleanText = defense.sanitizedText.length > 2000 ? defense.sanitizedText.substring(0, 2000) + '... [TRUNCATED]' : defense.sanitizedText;
        transcript = {
          ...transcript,
          text: cleanText,
        };
      }
    }

    // 2. Bound UI tree summary length
    let uiTree = options.uiTree;
    if (uiTree && uiTree.treeSummary && uiTree.treeSummary.length > 2000) {
      uiTree = {
        ...uiTree,
        treeSummary: uiTree.treeSummary.substring(0, 2000) + '... [TRUNCATED]',
      };
    }

    // 3. Determine composite privacy tier
    let privacyTier: PrivacyTier = options.explicitPrivacyTier || 'PRIVATE';
    if (options.screenshot?.privacyTier) {
      if (options.screenshot.privacyTier === 'RESTRICTED' || options.screenshot.privacyTier === 'HIGHLY_PRIVATE') {
        privacyTier = options.screenshot.privacyTier;
      }
    }

    // 4. Calculate aggregate perception confidence
    let confidence = 1.0;
    if (transcript && transcript.confidence !== undefined) {
      confidence = Math.min(confidence, transcript.confidence);
    }

    const context: MultimodalContext = {
      sessionId: options.sessionId,
      text: utterance,
      utterance,
      transcript: transcript ? (transcript.text || transcript) : undefined,
      audioMetadata: options.audioMetadata,
      images: options.screenshot
        ? [
            {
              id: 'img-1',
              sourceType: 'SCREENSHOT',
              dimensions: options.screenshot.dimensions,
              data: options.screenshot.pathOrData,
              privacyTier: options.screenshot.privacyTier || privacyTier,
            },
          ]
        : [],
      screenshot: options.screenshot
        ? {
            pathOrData: options.screenshot.pathOrData,
            dimensions: options.screenshot.dimensions,
            capturedAt: options.screenshot.capturedAt,
            privacyTier: options.screenshot.privacyTier || privacyTier,
          }
        : undefined,
      activeApplication: uiTree?.activeApp,
      activeWindow: uiTree?.activeWindow,
      uiObservation: uiTree,
      uiTree,
      environment: options.environment,
      taskBudget: budget,
      privacyTier,
      privacyClassification: privacyTier,
      confidence,
      timestamp: new Date().toISOString(),
    };

    this.logger?.debug(`[MultimodalContextAssembler] Assembled context for session ${options.sessionId} (Confidence: ${confidence}, Privacy: ${privacyTier})`);
    return context;
  }
}

