/**
 * HṚṢĪKEŚA (हृषीकेश) — Multimodal Vision + Advanced Voice Domain Types
 *
 * Phase 24: Unifies perception (Hearing, Vision, Voice, Screen, Camera, Documents)
 * with deterministic verification, sovereign authority, and zero credential harvesting.
 */

export type MultimodalInputType =
  | 'TEXT'
  | 'AUDIO'
  | 'IMAGE'
  | 'SCREENSHOT'
  | 'CAMERA_FRAME'
  | 'DOCUMENT_IMAGE'
  | 'UI_TREE'
  | 'VIDEO_FRAME';

export type ModalityType = 'TEXT' | 'VOICE' | 'VISION' | 'UI' | 'CAMERA' | 'DOCUMENT';

export type PrivacyTier = 'PUBLIC' | 'PRIVATE' | 'HIGHLY_PRIVATE' | 'RESTRICTED';

export type CameraState = 'OFF' | 'READY' | 'ACTIVE';

export type MicrophoneState =
  | 'IDLE'
  | 'LISTENING'
  | 'TRANSCRIBING'
  | 'PARTIAL'
  | 'FINAL'
  | 'MUTED'
  | 'ERROR';

export type SpeakerState =
  | 'IDLE'
  | 'PLAYING'
  | 'PAUSED'
  | 'INTERRUPTED'
  | 'MUTED'
  | 'ERROR';

export type MultimodalSessionType = 'INTERACTIVE' | 'MONITORING' | 'BACKGROUND';

export type MultimodalSessionStatus = 'ACTIVE' | 'PAUSED' | 'ENDED' | 'CANCELLED';

export type ChallengeType =
  | 'NONE'
  | 'CAPTCHA'
  | 'MFA'
  | 'LOGIN_PROMPT'
  | 'SECURITY_WARNING'
  | 'CRASH'
  | 'LOADING'
  | 'SUCCESS';

export type VisualComparisonState =
  | 'UNCHANGED'
  | 'CHANGED'
  | 'EXPECTED_CHANGE'
  | 'UNEXPECTED_CHANGE';

export type MultimodalErrorState =
  | 'NO_AUDIO'
  | 'LOW_AUDIO_CONFIDENCE'
  | 'VISION_UNAVAILABLE'
  | 'IMAGE_INVALID'
  | 'MODEL_UNAVAILABLE'
  | 'RESOURCE_LIMITED'
  | 'PRIVACY_BLOCKED'
  | 'USER_REQUIRED'
  | 'PROCESSING'
  | 'CANCELLED'
  | 'FAILED';

export interface MultimodalTaskBudget {
  readonly maxAudioDurationMs: number;
  readonly maxImages: number;
  readonly maxImageBytes: number;
  readonly maxVisionCalls: number;
  readonly maxModelCalls: number;
  readonly maxDurationMs: number;
  readonly maxMemoryMb: number;
  readonly maxRetries: number;
}

export const DEFAULT_MULTIMODAL_BUDGET: MultimodalTaskBudget = {
  maxAudioDurationMs: 30000,
  maxImages: 5,
  maxImageBytes: 10485760, // 10MB
  maxVisionCalls: 10,
  maxModelCalls: 15,
  maxDurationMs: 60000,
  maxMemoryMb: 512,
  maxRetries: 3,
};

export interface OcrBoundingBox {
  readonly text: string;
  readonly bounds: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly confidence: number;
  readonly language?: string;
}

export interface VisionObservation {
  readonly id: string;
  readonly interactionId?: string;
  readonly sourceType: string;
  readonly targetApp?: string;
  readonly targetWindow?: string;
  readonly ocrTextSummary?: string;
  readonly ocrBoxes?: OcrBoundingBox[];
  readonly uiaElementsCount: number;
  readonly visualElementsCount: number;
  readonly confidence: number;
  readonly detectedChallenges: ChallengeType[];
  readonly comparisonState: VisualComparisonState;
  readonly verificationStatus: 'PENDING' | 'VERIFIED' | 'FAILED' | 'SKIPPED';
  readonly verificationEvidence?: string;
  readonly capturedAt: string;
}

export interface VoiceInteraction {
  readonly id: string;
  readonly sessionId: string;
  readonly vadTriggered: boolean;
  readonly partialTranscripts: string[];
  readonly finalTranscript?: string;
  readonly sttConfidence: number;
  readonly languageDetected: string;
  readonly audioDurationMs: number;
  readonly ttsDurationMs: number;
  readonly interruptedByBargeIn: boolean;
  readonly createdAt: string;
}

export interface MultimodalContext {
  readonly sessionId: string;
  readonly text?: string;
  readonly utterance?: string;
  readonly transcript?: any;
  readonly audioMetadata?: {
    readonly durationMs: number;
    readonly sampleRate?: number;
    readonly vadTriggered?: boolean;
  };
  readonly images?: Array<{
    readonly id: string;
    readonly sourceType: string;
    readonly dimensions?: { width: number; height: number };
    readonly data?: string | Buffer;
    readonly privacyTier?: PrivacyTier;
  }>;
  readonly screenshot?: {
    readonly pathOrData: string;
    readonly dimensions: { width: number; height: number };
    readonly capturedAt: string;
    readonly privacyTier: PrivacyTier;
  };
  readonly activeApplication?: string;
  readonly activeWindow?: string;
  readonly uiObservation?: any;
  readonly uiTree?: {
    readonly activeWindow?: string;
    readonly activeApp?: string;
    readonly elementsCount?: number;
    readonly treeSummary?: string;
    readonly children?: any[];
  };
  readonly environment?: {
    readonly environmentId?: string;
    readonly type?: string;
    readonly hostname?: string;
  };
  readonly taskBudget: MultimodalTaskBudget;
  readonly privacyTier: PrivacyTier;
  readonly privacyClassification?: PrivacyTier;
  readonly confidence: number;
  readonly timestamp: string;
}

export interface MultimodalSessionRecord {
  readonly id: string;
  readonly sessionType: MultimodalSessionType;
  readonly status: MultimodalSessionStatus;
  readonly userId: string;
  readonly activeModalities: ModalityType[];
  readonly currentApp?: string;
  readonly currentWindow?: string;
  readonly cameraState: CameraState;
  readonly microphoneState: MicrophoneState;
  readonly speakerState: SpeakerState;
  readonly startedAt: string;
  readonly endedAt?: string;
  readonly metadata?: Record<string, any>;
}

export interface MultimodalInteractionRecord {
  readonly id: string;
  readonly sessionId: string;
  readonly inputType: MultimodalInputType;
  readonly rawText?: string;
  readonly transcriptConfidence?: number;
  readonly language?: string;
  readonly audioDurationMs?: number;
  readonly imageDimensions?: string;
  readonly privacyTier: PrivacyTier;
  readonly responseText?: string;
  readonly responseAudioDurationMs?: number;
  readonly modelId?: string;
  readonly latencyMs?: number;
  readonly createdAt: string;
}

export interface MultimodalPreferenceRecord {
  readonly id: string;
  readonly key: string;
  readonly value: string;
  readonly updatedAt: string;
}
