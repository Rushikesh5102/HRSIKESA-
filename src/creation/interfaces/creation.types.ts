/**
 * HṚṢĪKEŚA (हृषीकेश) — Universal Digital Creation & Media Studio Types (FP-17)
 *
 * Core domain contracts, creation jobs, artifact descriptors, verification schemas,
 * provenance models, media capability bindings, and design system context.
 */

export type CreationJobType =
  | 'IMAGE'
  | 'VIDEO'
  | 'AUDIO'
  | 'MUSIC'
  | 'VOICE'
  | 'THREE_D'
  | 'DOCUMENT'
  | 'PRESENTATION'
  | 'GRAPHIC'
  | 'UI_DESIGN'
  | 'WEB_ASSET'
  | 'MEDIA_PACKAGE'
  | 'TRANSFORM'
  | 'EDIT'
  | 'ANALYSIS';

export type CreationJobStatus =
  | 'DRAFT'
  | 'PLANNING'
  | 'QUEUED'
  | 'RUNNING'
  | 'PAUSED'
  | 'AWAITING_INPUT'
  | 'AWAITING_APPROVAL'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'ARCHIVED';

export type MediaProviderClass =
  | 'LOCAL_MODEL'
  | 'CLOUD_MODEL'
  | 'DESKTOP_APPLICATION'
  | 'CLI_TOOL'
  | 'MCP_SERVER'
  | 'REST_API'
  | 'BROWSER_SERVICE';

export type ProviderAvailabilityStatus =
  | 'VERIFIED'
  | 'AVAILABLE'
  | 'NOT_CONFIGURED'
  | 'UNAVAILABLE'
  | 'DEGRADED'
  | 'UNKNOWN';

export interface CreationDimension {
  width: number;
  height: number;
  unit?: 'px' | 'pt' | 'mm' | 'in';
}

export interface CreationJobParameters {
  dimensions?: CreationDimension;
  aspectRatio?: string;
  durationSeconds?: number;
  format?: string;
  quality?: 'draft' | 'standard' | 'high' | 'ultra';
  transparentBackground?: boolean;
  seed?: number;
  negativePrompt?: string;
  style?: string;
  referenceImagePaths?: string[];
  maskPath?: string;
  sampleRate?: number;
  channels?: number;
  bitrate?: string;
  codec?: string;
  fps?: number;
  theme?: string;
  pageCount?: number;
  slideCount?: number;
  custom?: Record<string, unknown>;
}

export interface CreationConstraints {
  maxCostUsd?: number;
  maxDurationSeconds?: number;
  localOnly?: boolean;
  requireApprovalForPurchase?: boolean;
  prohibitedColors?: string[];
  requiredElements?: string[];
  brandGuidelinesAdherence?: boolean;
  maxIterations?: number;
}

export interface DesignContext {
  id: string;
  projectId?: string;
  companyId?: string;
  name: string;
  brandIdentity: {
    primaryColors: string[];
    secondaryColors: string[];
    accentColors: string[];
    backgroundColors: string[];
    fontHeadings: string;
    fontBody: string;
    fontMonospace?: string;
    logoAssetId?: string;
    iconStyle?: string;
    tone: string;
    culturalAesthetic?: string;
  };
  visualReferences: Array<{
    title: string;
    uri: string;
    description: string;
    intent: 'INSPIRE' | 'ANALYZE' | 'TRANSFORM' | 'CLEAN_ROOM_RECREATE' | 'AUTHORIZED_COPY';
  }>;
  spacingRules?: {
    baseUnitPx: number;
    containerMaxPx: number;
    borderRadiusPx: number;
  };
  accessibilityRequirements?: {
    contrastRatioMin: number;
    altTextMandatory: boolean;
    audioDescriptions: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ReferenceAsset {
  id: string;
  source: string;
  owner?: string;
  urlOrPath: string;
  retrievalTime: string;
  license: string;
  intendedUse: 'INSPIRE' | 'ANALYZE' | 'TRANSFORM' | 'CLEAN_ROOM_RECREATE' | 'AUTHORIZED_COPY';
  transformationRelationship?: string;
  sha256?: string;
}

export interface CreationProvenance {
  creatorIdentity: string;
  modelUsed?: string;
  modelVersion?: string;
  modelLicense?: string;
  applicationUsed?: string;
  applicationVersion?: string;
  sourceAssets: ReferenceAsset[];
  transformationHistory: string[];
  thirdPartyNotices: string[];
  isAiGenerated: boolean;
  humanApprovedBy?: string;
  humanApprovedAt?: string;
  timestamp: string;
}

export interface CreationVerificationResult {
  jobId: string;
  verified: boolean;
  score: number; // 0.0 to 1.0
  passedChecks: string[];
  failedChecks: string[];
  metrics: {
    dimensionMatch?: boolean;
    formatValid?: boolean;
    durationValid?: boolean;
    fileIntegrityVerified?: boolean;
    codecValid?: boolean;
    contrastRatioVerified?: boolean;
    syntaxValid?: boolean;
    fileSizeBytes?: number;
  };
  details: string;
  verifiedAt: string;
}

export type VerificationResult = CreationVerificationResult;

export interface CreationIteration {
  iterationNumber: number;
  reason: string;
  modificationsRequested: string;
  resultArtifactId?: string;
  verification?: VerificationResult;
  timestamp: string;
}

export interface CreationArtifact {
  id: string;
  jobId: string;
  type: CreationJobType;
  name: string;
  location: string;
  format: string;
  sizeBytes: number;
  dimensions?: CreationDimension;
  durationSeconds?: number;
  mimeType: string;
  sha256?: string;
  version: number;
  verified: boolean;
  verificationResult?: VerificationResult;
  provenance: CreationProvenance;
  licenseInfo: string;
  previewUrlOrPath?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreationJob {
  id: string;
  owner: string;
  companyId?: string;
  projectId?: string;
  type: CreationJobType;
  objective: string;
  prompt: string;
  status: CreationJobStatus;
  progressPercentage: number;
  inputArtifacts: string[];
  outputArtifacts: CreationArtifact[];
  modelProvider?: string;
  selectedModel?: string;
  applicationOrTool?: string;
  workflowId?: string;
  skillId?: string;
  parameters: CreationJobParameters;
  constraints: CreationConstraints;
  style?: string;
  designContextId?: string;
  designContext?: DesignContext;
  iterations: CreationIteration[];
  currentIteration: number;
  maxIterations: number;
  costEstimateUsd?: number;
  actualCostUsd?: number;
  requiresApproval: boolean;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
  verification?: VerificationResult;
  provenance: CreationProvenance;
  licenseInformation: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaCapability {
  capabilityId: string; // e.g., 'image.generate', 'video.compose', 'audio.mix'
  category: 'image' | 'video' | 'audio' | 'music' | 'voice' | '3d' | 'document' | 'presentation' | 'design';
  name: string;
  description: string;
  supportedInputFormats: string[];
  supportedOutputFormats: string[];
  availableProviders: MediaProviderDescriptor[];
  preferredProviderId?: string;
  requiresHardwareAcceleration?: boolean;
}

export interface MediaProviderDescriptor {
  providerId: string;
  name: string;
  providerClass: MediaProviderClass;
  availability: ProviderAvailabilityStatus;
  isLocal: boolean;
  health: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' | 'NOT_CONFIGURED';
  costClassification: 'FREE_LOCAL' | 'USAGE_TIER' | 'PAID_API';
  estimatedLatencyMs: number;
  supportedOperations: string[];
  version?: string;
  pathOrEndpoint?: string;
  license: string;
}

export interface CreateJobRequest {
  owner?: string;
  companyId?: string;
  projectId?: string;
  type: CreationJobType;
  objective: string;
  prompt: string;
  parameters?: CreationJobParameters;
  constraints?: CreationConstraints;
  designContextId?: string;
  designContext?: Partial<DesignContext>;
  referenceAssets?: ReferenceAsset[];
  inputArtifacts?: string[];
  autoStart?: boolean;
}
