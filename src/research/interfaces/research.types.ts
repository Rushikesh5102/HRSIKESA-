/**
 * HṚṢĪKEŚA (हृषीकेश) — Research Domain Types & Interfaces
 *
 * Phase 17: Advanced Research & Web Intelligence
 */

export const ResearchStatus = {
  DRAFT: 'DRAFT',
  PLANNING: 'PLANNING',
  RESEARCHING: 'RESEARCHING',
  VERIFYING: 'VERIFYING',
  WAITING: 'WAITING',
  BLOCKED: 'BLOCKED',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  PAUSED: 'PAUSED',
} as const;
export type ResearchStatus = (typeof ResearchStatus)[keyof typeof ResearchStatus];

export const ResearchDepth = {
  QUICK: 'QUICK',
  STANDARD: 'STANDARD',
  DEEP: 'DEEP',
} as const;
export type ResearchDepth = (typeof ResearchDepth)[keyof typeof ResearchDepth];

export interface ResearchBudget {
  maxSources: number;
  maxPages: number;
  maxBrowserActions: number;
  maxModelCalls: number;
  maxDurationMs: number;
  maxDepth: number;
}

export const DEFAULT_RESEARCH_BUDGET: Record<ResearchDepth, ResearchBudget> = {
  QUICK: {
    maxSources: 5,
    maxPages: 8,
    maxBrowserActions: 10,
    maxModelCalls: 5,
    maxDurationMs: 120_000, // 2 minutes
    maxDepth: 1,
  },
  STANDARD: {
    maxSources: 12,
    maxPages: 20,
    maxBrowserActions: 30,
    maxModelCalls: 15,
    maxDurationMs: 300_000, // 5 minutes
    maxDepth: 2,
  },
  DEEP: {
    maxSources: 25,
    maxPages: 45,
    maxBrowserActions: 60,
    maxModelCalls: 30,
    maxDurationMs: 600_000, // 10 minutes
    maxDepth: 3,
  },
};

export const SourceType = {
  OFFICIAL_DOCUMENTATION: 'OFFICIAL_DOCUMENTATION',
  OFFICIAL_REPOSITORY: 'OFFICIAL_REPOSITORY',
  ACADEMIC_PAPER: 'ACADEMIC_PAPER',
  GOVERNMENT: 'GOVERNMENT',
  NEWS: 'NEWS',
  COMPANY: 'COMPANY',
  BLOG: 'BLOG',
  FORUM: 'FORUM',
  SEARCH_RESULT: 'SEARCH_RESULT',
  USER_PROVIDED: 'USER_PROVIDED',
  OTHER: 'OTHER',
} as const;
export type SourceType = (typeof SourceType)[keyof typeof SourceType];

export const SourceFreshness = {
  CURRENT: 'CURRENT',       // <= 30 days
  RECENT: 'RECENT',         // <= 180 days
  DATED: 'DATED',           // <= 2 years
  HISTORICAL: 'HISTORICAL', // > 2 years
  UNKNOWN: 'UNKNOWN',
} as const;
export type SourceFreshness = (typeof SourceFreshness)[keyof typeof SourceFreshness];

export const SourceCredibilityTier = {
  AUTHORITATIVE: 'AUTHORITATIVE', // official docs, official repo, academic peer-reviewed
  PRIMARY: 'PRIMARY',             // direct company / author website
  SECONDARY: 'SECONDARY',         // news, vetted blogs
  COMMUNITY: 'COMMUNITY',         // forums, reddit, social
  UNVERIFIED: 'UNVERIFIED',
} as const;
export type SourceCredibilityTier = (typeof SourceCredibilityTier)[keyof typeof SourceCredibilityTier];

export interface IResearchSource {
  id: string;
  researchId: string;
  url: string;
  canonicalUrl?: string;
  title: string;
  publisher?: string;
  author?: string;
  sourceType: SourceType;
  domain: string;
  publishedAt?: string;
  retrievedAt: string;
  freshness: SourceFreshness;
  contentHash: string;
  cleanText?: string;
  extractedText?: string;
  credibilityTier: SourceCredibilityTier;
  credibilityReason?: string;
  isDuplicate: boolean;
  duplicateOfId?: string;
  license?: string;
  failureReason?: string;
  status: 'PENDING' | 'ACQUIRED' | 'EXTRACTED' | 'FAILED' | 'REJECTED' | 'DUPLICATE' | 'EXTRACTION_FAILED';
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

export const ClaimType = {
  FACT: 'FACT',
  CLAIM: 'CLAIM',
  INFERENCE: 'INFERENCE',
  OPINION: 'OPINION',
  UNKNOWN: 'UNKNOWN',
} as const;
export type ClaimType = (typeof ClaimType)[keyof typeof ClaimType];

export interface IResearchEvidence {
  id: string;
  researchId: string;
  sourceId: string;
  claimText: string;
  claim?: string; // alias
  quoteText?: string;
  supportingText?: string; // alias
  claimType: ClaimType;
  confidence: number;
  location?: string;
  retrievedAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

export const FindingType = {
  FACT: 'FACT',
  CLAIM: 'CLAIM',
  INFERENCE: 'INFERENCE',
  OPINION: 'OPINION',
  KEY_FINDING: 'KEY_FINDING',
  COMPARISON: 'COMPARISON',
  DISCREPANCY: 'DISCREPANCY',
  LIMITATION: 'LIMITATION',
  OBSERVATION: 'OBSERVATION',
} as const;
export type FindingType = (typeof FindingType)[keyof typeof FindingType];

export const FindingStatus = {
  CONFIRMED: 'CONFIRMED',                       // Multiple primary/authoritative sources agree
  CORROBORATED: 'CORROBORATED',                 // Supported by at least two independent sources
  CONFLICTING: 'CONFLICTING',                   // Sources disagree or present contradictory data
  UNVERIFIED: 'UNVERIFIED',                     // Single source without corroboration
  INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE', // Data inconclusive
} as const;
export type FindingStatus = (typeof FindingStatus)[keyof typeof FindingStatus];

export interface ResearchCitation {
  index: number;
  sourceId: string;
  sourceTitle: string;
  sourceUrl?: string;
  url: string;
  publisher?: string;
  retrievedAt: string;
  quote?: string;
  claimType?: ClaimType;
  credibilityTier?: SourceCredibilityTier;
  freshness?: SourceFreshness;
}

export interface IResearchFinding {
  id: string;
  researchId: string;
  title: string;
  statement?: string;
  description?: string; // alias
  findingType: FindingType;
  status: FindingStatus;
  confidence: number;
  corroboratingSourceIds?: string[];
  conflictingSourceIds?: string[];
  sourceIds?: string[];
  evidenceIds?: string[];
  citations?: ResearchCitation[];
  citationIndices?: number[];
  contradictionNotes?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

export interface IResearchStudy {
  id: string;
  title: string;
  question: string;
  objective: string;
  scope?: string;
  status: ResearchStatus;
  depth: ResearchDepth;
  budget: ResearchBudget;
  sourcePolicy?: string;
  verificationPolicy?: string;
  summary?: string;
  conclusion?: string;
  confidenceScore?: number;
  companyId?: string;
  projectId?: string;
  goalId?: string;
  createdBy?: string;
  requestedBy?: string;
  createdArtifacts?: string[];
  completionState?: {
    completedAt?: string;
    sourcesReviewed?: number;
    findingsGenerated?: number;
    conflictsDetected?: number;
    durationMs?: number;
    error?: string;
  };
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface SearchResultItem {
  url: string;
  title: string;
  snippet: string;
  domain: string;
  sourceType: SourceType;
  publishedAt?: string;
}

export interface ISearchProvider {
  readonly id: string;
  readonly name: string;
  search(query: string, options?: { maxResults?: number; domainFilter?: string[] }): Promise<SearchResultItem[]>;
  healthCheck(): Promise<{ healthy: boolean; details?: string }>;
}

export interface ResearchProgress {
  status: ResearchStatus;
  sourcesFound: number;
  sourcesReviewed: number;
  evidenceCollected: number;
  findingsCount: number;
  conflictsDetected: number;
  budgetRemaining: {
    sources: number;
    pages: number;
    modelCalls: number;
    durationMs: number;
  };
}

export interface ResearchArtifactBundle {
  studyId: string;
  study?: IResearchStudy;
  markdown: string;
  reportMarkdown?: string;
  sources: IResearchSource[];
  sourcesJson?: IResearchSource[];
  evidence: IResearchEvidence[];
  evidenceJson?: IResearchEvidence[];
  findings: IResearchFinding[];
  findingsJson?: IResearchFinding[];
  citations: ResearchCitation[];
  generatedAt: string;
}
