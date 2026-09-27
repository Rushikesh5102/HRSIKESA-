/**
 * HṚṢĪKEŚA (हृषीकेश) — Research Domain Types & Interfaces
 *
 * Phase 17: Advanced Research & Web Intelligence
 */

export const ResearchStatus = {
  CREATED: 'CREATED',
  DRAFT: 'DRAFT',
  PLANNING: 'PLANNING',
  SEARCHING: 'SEARCHING',
  FETCHING: 'FETCHING',
  EXTRACTING: 'EXTRACTING',
  RESEARCHING: 'RESEARCHING',
  ANALYZING: 'ANALYZING',
  VERIFYING: 'VERIFYING',
  SYNTHESIZING: 'SYNTHESIZING',
  COMPLETED: 'COMPLETED',
  PARTIAL: 'PARTIAL',
  WAITING: 'WAITING',
  BLOCKED: 'BLOCKED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  PAUSED: 'PAUSED',
} as const;
export type ResearchStatus = (typeof ResearchStatus)[keyof typeof ResearchStatus];

export const ResearchDepth = {
  QUICK: 'QUICK',
  NORMAL: 'NORMAL',
  STANDARD: 'STANDARD',
  DEEP: 'DEEP',
  COMPREHENSIVE: 'COMPREHENSIVE',
} as const;
export type ResearchDepth = (typeof ResearchDepth)[keyof typeof ResearchDepth];

export const ResearchType = {
  FACT_LOOKUP: 'FACT_LOOKUP',
  CURRENT_INFORMATION: 'CURRENT_INFORMATION',
  DEEP_RESEARCH: 'DEEP_RESEARCH',
  COMPARISON: 'COMPARISON',
  VERIFICATION: 'VERIFICATION',
  TECHNICAL_RESEARCH: 'TECHNICAL_RESEARCH',
  MARKET_RESEARCH: 'MARKET_RESEARCH',
  COMPANY_RESEARCH: 'COMPANY_RESEARCH',
  ACADEMIC_RESEARCH: 'ACADEMIC_RESEARCH',
  PRODUCT_RESEARCH: 'PRODUCT_RESEARCH',
  NEWS_RESEARCH: 'NEWS_RESEARCH',
  OPEN_SOURCE_RESEARCH: 'OPEN_SOURCE_RESEARCH',
} as const;
export type ResearchType = (typeof ResearchType)[keyof typeof ResearchType];

export interface ResearchBudget {
  maxSearchQueries: number;
  maxSources: number;
  maxPages: number;
  maxBrowserActions: number;
  maxModelCalls: number;
  maxExtractionCharacters: number;
  maxResearchTime: number; // in ms (alias for maxDurationMs)
  maxDurationMs: number;
  maxParallelRequests: number;
  maxContextTokens: number;
  maxDepth: number;
}

export const DEFAULT_RESEARCH_BUDGET: Record<ResearchDepth, ResearchBudget> = {
  QUICK: {
    maxSearchQueries: 3,
    maxSources: 5,
    maxPages: 8,
    maxBrowserActions: 5,
    maxModelCalls: 3,
    maxExtractionCharacters: 25_000,
    maxResearchTime: 60_000,
    maxDurationMs: 60_000, // 1 minute
    maxParallelRequests: 2,
    maxContextTokens: 2_000,
    maxDepth: 1,
  },
  NORMAL: {
    maxSearchQueries: 6,
    maxSources: 10,
    maxPages: 16,
    maxBrowserActions: 15,
    maxModelCalls: 8,
    maxExtractionCharacters: 50_000,
    maxResearchTime: 180_000,
    maxDurationMs: 180_000, // 3 minutes
    maxParallelRequests: 2,
    maxContextTokens: 4_000,
    maxDepth: 2,
  },
  STANDARD: {
    maxSearchQueries: 8,
    maxSources: 12,
    maxPages: 20,
    maxBrowserActions: 20,
    maxModelCalls: 12,
    maxExtractionCharacters: 75_000,
    maxResearchTime: 300_000,
    maxDurationMs: 300_000, // 5 minutes
    maxParallelRequests: 2,
    maxContextTokens: 6_000,
    maxDepth: 2,
  },
  DEEP: {
    maxSearchQueries: 15,
    maxSources: 25,
    maxPages: 40,
    maxBrowserActions: 40,
    maxModelCalls: 25,
    maxExtractionCharacters: 150_000,
    maxResearchTime: 600_000,
    maxDurationMs: 600_000, // 10 minutes
    maxParallelRequests: 2,
    maxContextTokens: 12_000,
    maxDepth: 3,
  },
  COMPREHENSIVE: {
    maxSearchQueries: 25,
    maxSources: 40,
    maxPages: 60,
    maxBrowserActions: 60,
    maxModelCalls: 40,
    maxExtractionCharacters: 250_000,
    maxResearchTime: 900_000,
    maxDurationMs: 900_000, // 15 minutes
    maxParallelRequests: 2,
    maxContextTokens: 20_000,
    maxDepth: 4,
  },
};

export const SourceType = {
  OFFICIAL: 'OFFICIAL',
  PRIMARY: 'PRIMARY',
  ACADEMIC: 'ACADEMIC',
  GOVERNMENT: 'GOVERNMENT',
  NEWS: 'NEWS',
  DOCUMENTATION: 'DOCUMENTATION',
  OFFICIAL_DOCUMENTATION: 'OFFICIAL_DOCUMENTATION',
  OFFICIAL_REPOSITORY: 'OFFICIAL_REPOSITORY',
  ACADEMIC_PAPER: 'ACADEMIC_PAPER',
  COMPANY: 'COMPANY',
  COMMUNITY: 'COMMUNITY',
  BLOG: 'BLOG',
  SOCIAL: 'SOCIAL',
  FORUM: 'FORUM',
  SEARCH_RESULT: 'SEARCH_RESULT',
  USER_PROVIDED: 'USER_PROVIDED',
  UNKNOWN: 'UNKNOWN',
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
export const FreshnessLevel = SourceFreshness;
export type FreshnessLevel = SourceFreshness;

export const SourceCredibilityTier = {
  AUTHORITATIVE: 'AUTHORITATIVE', // official docs, official repo, academic peer-reviewed
  PRIMARY: 'PRIMARY',             // direct company / author website
  SECONDARY: 'SECONDARY',         // news, vetted blogs
  COMMUNITY: 'COMMUNITY',         // forums, reddit, social
  UNVERIFIED: 'UNVERIFIED',
} as const;
export type SourceCredibilityTier = (typeof SourceCredibilityTier)[keyof typeof SourceCredibilityTier];
export const CredibilityLevel = SourceCredibilityTier;
export type CredibilityLevel = SourceCredibilityTier;

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
  content?: string; // alias to cleanText
  language?: string;
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

export const SupportType = {
  SUPPORTS: 'SUPPORTS',
  PARTIALLY_SUPPORTS: 'PARTIALLY_SUPPORTS',
  CONTRADICTS: 'CONTRADICTS',
  MENTIONS: 'MENTIONS',
  DOES_NOT_SUPPORT: 'DOES_NOT_SUPPORT',
} as const;
export type SupportType = (typeof SupportType)[keyof typeof SupportType];

export interface IResearchEvidence {
  id: string;
  researchId: string;
  sourceId: string;
  claimText: string;
  claim?: string; // alias
  quoteText?: string;
  supportingText?: string; // alias
  claimType: ClaimType;
  supportType?: SupportType;
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
  researchType?: ResearchType;
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
    modelCalls?: number;
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
