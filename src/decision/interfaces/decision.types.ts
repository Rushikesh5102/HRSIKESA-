/**
 * HṚṢĪKEŚA (हृषीकेश) — Decision Intelligence Domain Types & Interfaces
 *
 * FP-18: Universal Real-World Research, Knowledge & Decision Intelligence Fabric
 * Bridges external information, existing knowledge, company/project context,
 * host hardware realities, and evidence into auditable decision support.
 */

export const ResearchCaseStatus = {
  DRAFT: 'DRAFT',
  SCOPING: 'SCOPING',
  RESEARCHING: 'RESEARCHING',
  GATHERING_EVIDENCE: 'GATHERING_EVIDENCE',
  ANALYZING: 'ANALYZING',
  COMPARING: 'COMPARING',
  SYNTHESIZING: 'SYNTHESIZING',
  REVIEWING: 'REVIEWING',
  AWAITING_USER: 'AWAITING_USER',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type ResearchCaseStatus = (typeof ResearchCaseStatus)[keyof typeof ResearchCaseStatus];

export const SourceHierarchyTier = {
  PRIMARY: 'PRIMARY',         // Official documentation, official repos, standards, whitepapers
  SECONDARY: 'SECONDARY',     // Reputable technical analysis, established publications, benchmarks
  COMMUNITY: 'COMMUNITY',     // GitHub discussions, Reddit, forums, community tutorials
  UNVERIFIED: 'UNVERIFIED',   // Uncited claims, anonymous sources, low-quality aggregators
} as const;
export type SourceHierarchyTier = (typeof SourceHierarchyTier)[keyof typeof SourceHierarchyTier];

export const ClaimClassification = {
  FACT: 'FACT',               // Directly verifiable and verified by authoritative source
  CLAIM: 'CLAIM',             // Asserted by source but not yet independently corroborated
  INFERENCE: 'INFERENCE',     // Deductive conclusion derived from one or more facts
  OPINION: 'OPINION',         // Subjective assessment or preference
  UNKNOWN: 'UNKNOWN',         // Explicitly unverified or missing data
} as const;
export type ClaimClassification = (typeof ClaimClassification)[keyof typeof ClaimClassification];

export const UncertaintyLevel = {
  KNOWN: 'KNOWN',
  SUPPORTED: 'SUPPORTED',
  LIKELY: 'LIKELY',
  UNCERTAIN: 'UNCERTAIN',
  CONTRADICTED: 'CONTRADICTED',
  UNKNOWN: 'UNKNOWN',
  OUTDATED: 'OUTDATED',
} as const;
export type UncertaintyLevel = (typeof UncertaintyLevel)[keyof typeof UncertaintyLevel];

export const HardwareCompatibilityStatus = {
  VERIFIED_COMPATIBLE: 'VERIFIED_COMPATIBLE',         // Confirmed to work on host CPU/GPU/RAM
  LIKELY_COMPATIBLE: 'LIKELY_COMPATIBLE',             // Specifications match host profile
  CONDITIONALLY_COMPATIBLE: 'CONDITIONALLY_COMPATIBLE', // Compatible only with quantization/flags
  INCOMPATIBLE: 'INCOMPATIBLE',                       // Hard constraint violated (e.g. requires CUDA)
  UNKNOWN: 'UNKNOWN',                                 // Requirements undocumented or unverified
} as const;
export type HardwareCompatibilityStatus =
  (typeof HardwareCompatibilityStatus)[keyof typeof HardwareCompatibilityStatus];

export interface EvaluationCriterion {
  id: string;
  name: string;
  description: string;
  weight: number; // 0.0 to 1.0
  isMandatory: boolean;
  unit?: string;
  targetDirection?: 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER' | 'QUALITATIVE';
}

export interface ResearchPlan {
  id: string;
  caseId: string;
  questions: string[];
  subquestions: string[];
  sourcesToInspect: string[];
  sourcePriority: SourceHierarchyTier[];
  searchStrategy: string;
  extractionStrategy: string;
  evidenceRequirements: string[];
  contradictionStrategy: string;
  stoppingConditions: string[];
  resourceBudget: {
    maxSources: number;
    maxSearches: number;
    maxPages: number;
    maxModelCalls: number;
    maxDurationMs: number;
  };
  timeBudgetMs: number;
  confidenceThreshold: number;
}

export interface StructuredClaim {
  id: string;
  caseId: string;
  subject: string;
  predicate: string;
  object: string;
  claimType: ClaimClassification;
  uncertainty: UncertaintyLevel;
  sourceUrl: string;
  sourceTitle: string;
  sourceTier: SourceHierarchyTier;
  retrievedAt: string;
  publishedAt?: string;
  version?: string;
  quote: string;
  confidence: number; // 0.0 to 1.0
  conditions?: string[];
  caveats?: string[];
}

export interface ContradictionAnalysis {
  id: string;
  caseId: string;
  claimA: StructuredClaim;
  claimB: StructuredClaim;
  topic: string;
  natureOfConflict: string;
  resolutionHypothesis?: string;
  factors: {
    versionDifference?: boolean;
    quantizationDifference?: boolean;
    osDifference?: boolean;
    hardwareDifference?: boolean;
    temporalDifference?: boolean;
  };
  requiresUserReview: boolean;
  resolved: boolean;
}

export interface ResearchCandidate {
  id: string;
  caseId: string;
  name: string;
  description: string;
  sourceUrl: string;
  repositoryUrl?: string;
  license: string;
  licenseCategory: 'PERMISSIVE' | 'COPYLEFT' | 'PROPRIETARY' | 'UNKNOWN';
  compatibilityStatus: HardwareCompatibilityStatus;
  compatibilityDetails: {
    cpuSupported: boolean;
    gpuSupported: boolean;
    gpuVulkanSupported: boolean;
    minRamGb: number;
    recommendedRamGb: number;
    minVramGb?: number;
    storageGb?: number;
    supportedOs: string[];
  };
  capabilities: string[];
  limitations: string[];
  costSummary: string;
  operationalComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;
  evidenceIds: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ComparisonMatrixCell {
  candidateId: string;
  criterionId: string;
  value: string | number | boolean;
  qualitativeAssessment: string;
  evidenceQuote?: string;
  sourceUrl?: string;
  confidence: number;
  uncertainty: UncertaintyLevel;
}

export interface CandidateComparison {
  id: string;
  caseId: string;
  criteria: EvaluationCriterion[];
  candidates: ResearchCandidate[];
  matrix: ComparisonMatrixCell[];
  tradeoffSummary: string;
  unknowns: string[];
  confidenceScore: number;
  recommendedCandidateId?: string; // Only populated if user explicitly requested evaluation
  recommendationRationale?: string;
  createdAt: string;
}

export interface DecisionBrief {
  id: string;
  caseId: string;
  title: string;
  objective: string;
  scope: string;
  keyFindings: string[];
  evidenceSummary: string[];
  options: {
    id: string;
    name: string;
    description: string;
    pros: string[];
    cons: string[];
  }[];
  tradeoffs: string[];
  risks: string[];
  unknowns: string[];
  constraints: string[];
  dependencies: string[];
  costConsiderations: string[];
  implementationImplications: string[];
  openQuestions: string[];
  decisionRequired: string;
  proposedNextSteps: string[];
  sources: {
    title: string;
    url: string;
    tier: SourceHierarchyTier;
    retrievedAt: string;
  }[];
  recommendation?: {
    optionId: string;
    optionName: string;
    rationale: string;
    assumptions: string[];
  };
  createdAt: string;
  generatedArtifactPath?: string;
}

export interface ProposedAction {
  id: string;
  caseId: string;
  decisionId?: string;
  type: 'MISSION' | 'GOAL' | 'WORKFLOW' | 'SKILL' | 'CREATION_JOB' | 'ENVIRONMENT_CHANGE';
  title: string;
  description: string;
  parameters: Record<string, unknown>;
  requiresApproval: boolean;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'DISPATCHED' | 'REJECTED' | 'FAILED';
  dispatchedEntityId?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface DecisionRecord {
  id: string;
  caseId: string;
  companyId?: string;
  projectId?: string;
  context: string;
  objective: string;
  optionsConsidered: {
    id: string;
    name: string;
    summary: string;
  }[];
  criteria: EvaluationCriterion[];
  evidenceSummary: string;
  assumptions: string[];
  selectedOption: {
    id: string;
    name: string;
  };
  rationale: string;
  approver: string;
  timestamp: string;
  supersededDecisionId?: string;
  resultingActions: ProposedAction[];
  status: 'ACTIVE' | 'SUPERSEDED' | 'UNDER_REVIEW' | 'REVOKED';
  createdAt: string;
  updatedAt: string;
}

export interface DecisionReview {
  id: string;
  decisionId: string;
  reviewTrigger: 'SCHEDULED' | 'NEW_EVIDENCE' | 'MANUAL_REQUEST' | 'CHANGED_CONSTRAINTS';
  originalEvidenceSummary: string;
  newEvidenceSummary: string;
  changedAssumptions: string[];
  changedConstraints: string[];
  contradictionsIdentified: string[];
  reviewWarranted: boolean;
  recommendation: 'MAINTAIN' | 'UPDATE' | 'OVERTURN' | 'INVESTIGATE_FURTHER';
  rationale: string;
  createdAt: string;
}

export interface ResearchCase {
  id: string;
  owner: string;
  companyId?: string;
  projectId?: string;
  objective: string;
  question: string;
  scope: string;
  status: ResearchCaseStatus;
  researchType: string;
  depth: 'QUICK' | 'NORMAL' | 'DEEP' | 'COMPREHENSIVE';
  criteria: EvaluationCriterion[];
  constraints: string[];
  plan?: ResearchPlan;
  sources: {
    id: string;
    url: string;
    title: string;
    tier: SourceHierarchyTier;
    retrievedAt: string;
  }[];
  claims: StructuredClaim[];
  contradictions: ContradictionAnalysis[];
  unknowns: string[];
  candidates: ResearchCandidate[];
  comparison?: CandidateComparison;
  decisionBrief?: DecisionBrief;
  decisionRecordId?: string;
  artifacts: string[];
  createdAt: string;
  updatedAt: string;
}
