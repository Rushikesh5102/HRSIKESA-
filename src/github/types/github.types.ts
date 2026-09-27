/**
 * HṚṢĪKEŚA (हृषीकेश) — FP-08: GitHub & Open-Source Intelligence / Acquisition Fabric Types
 */

import { CapabilityProtocol, CapabilityRiskLevel, CapabilityTrustLevel } from '../../capabilities/fabric/capability.types.js';

export interface GitHubRepository {
  readonly id: string;
  readonly githubId: number;
  readonly owner: string;
  readonly name: string;
  readonly fullName: string;
  readonly url: string;
  readonly defaultBranch: string;
  readonly description: string;
  readonly stars: number;
  readonly forks: number;
  readonly watchers: number;
  readonly openIssues: number;
  readonly language: string;
  readonly languages: Record<string, number>;
  readonly licenseSpdx: string;
  readonly licenseName: string;
  readonly license?: { readonly spdxId: string; readonly name?: string };
  readonly topics: string[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly pushedAt: string;
  readonly archived: boolean;
  readonly fork: boolean;
  readonly sizeKb: number;
  readonly visibility: 'public' | 'private';
  readonly discoveredAt: string;
  readonly lastAnalyzedAt?: string;
}

export type LicenseCompatibility =
  | 'COMPATIBLE'
  | 'CONDITIONALLY_COMPATIBLE'
  | 'INCOMPATIBLE'
  | 'UNKNOWN'
  | 'REQUIRES_REVIEW';

export interface LicenseDetails {
  readonly spdx: string;
  readonly spdxId?: string;
  readonly name: string;
  readonly compatibility: LicenseCompatibility;
  readonly commercialUse: boolean;
  readonly modificationAllowed: boolean;
  readonly distributionAllowed: boolean;
  readonly copyleft: boolean;
  readonly isCopyleft?: boolean;
  readonly attributionRequired: boolean;
  readonly attributionRequirements?: string[];
  readonly requiresLegalReview?: boolean;
  readonly notes: string;
}

export type ArchitectureType =
  | 'CLI'
  | 'LIBRARY'
  | 'SERVER'
  | 'WEB_APP'
  | 'DESKTOP_APP'
  | 'AI_MODEL'
  | 'SDK'
  | 'MCP_SERVER'
  | 'BROWSER_EXTENSION'
  | 'PLUGIN'
  | 'WORKFLOW_ENGINE'
  | 'SERVICE'
  | 'UNKNOWN';

export type ActivityStatus =
  | 'ACTIVE'
  | 'STALE_RELEASE'
  | 'ARCHIVED'
  | 'NO_RELEASES'
  | 'UNKNOWN';

export type CompatibilityStatus =
  | 'COMPATIBLE'
  | 'PARTIAL'
  | 'INCOMPATIBLE'
  | 'UNKNOWN';

export interface CompatibilityAssessment {
  readonly status: CompatibilityStatus;
  readonly nodeCompatible: boolean;
  readonly pythonCompatible: boolean;
  readonly osCompatible: boolean;
  readonly hardwareFeasible: boolean;
  readonly reasons: string[];
  readonly score?: number;
}

export interface ResourceEstimate {
  readonly diskMb: number;
  readonly ramMb: number;
  readonly cpu: 'LOW' | 'MEDIUM' | 'HIGH';
  readonly gpu: boolean;
  readonly estimatedBuildTimeSec: number;
}

export interface ReadmeAnalysis {
  readonly purpose?: string;
  readonly features: string[];
  readonly installation?: string;
  readonly usage?: string;
  readonly requirements: string[];
  readonly defangedSummary: string;
}

export interface RepositoryIntelligence {
  readonly repositoryId: string;
  readonly architecture: ArchitectureType;
  readonly license: LicenseDetails;
  readonly activity: {
    readonly status: ActivityStatus;
    readonly lastPushDaysAgo: number;
    readonly openIssuesCount: number;
    readonly openPrsCount?: number;
    readonly commitFrequencyScore: number;
    readonly releases?: any[];
    readonly latestReleaseDate?: string;
    readonly lastPushDate?: string;
    readonly openIssues?: number;
  };
  readonly release: {
    readonly latestTag?: string;
    readonly releaseDate?: string;
    readonly isPreRelease?: boolean;
    readonly releaseNotes?: string;
  };
  readonly compatibility: CompatibilityAssessment;
  readonly resourceEstimate: ResourceEstimate;
  readonly readme: ReadmeAnalysis;
  readonly analyzedAt: string;
  readonly dependencies?: {
    readonly count: number;
    readonly riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    readonly lockfilePresent: boolean;
    readonly manifests: string[];
  };
  readonly security?: {
    readonly overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    readonly findingsCount: number;
  };
  readonly resourceRequirements?: {
    readonly estimatedMemoryMb: number;
    readonly estimatedCores: number;
  };
}

export interface DependencyRecord {
  readonly id: string;
  readonly repositoryId: string;
  readonly manifestFile: string;
  readonly name: string;
  readonly versionSpec: string;
  readonly version?: string;
  readonly dependencyType: 'PROD' | 'DEV' | 'PEER';
  readonly runtime: 'nodejs' | 'python' | 'rust' | 'go' | 'unknown';
  readonly riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly riskReasons: string[];
}

export interface SecurityFinding {
  readonly id: string;
  readonly repositoryId: string;
  readonly category: string;
  readonly indicator: string;
  readonly evidence: string;
  readonly filePath?: string;
  readonly lineNumber?: number;
  readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  readonly createdAt: string;
  readonly ruleId?: string;
  readonly description?: string;
}

export interface RepositoryAcquisition {
  readonly id: string;
  readonly repositoryId: string;
  readonly targetPath: string;
  readonly commitSha: string;
  readonly refName: string;
  readonly status: 'PENDING' | 'CLONED' | 'BUILDING' | 'TESTING' | 'COMPLETED' | 'FAILED' | 'PURGED';
  readonly acquiredBy: string;
  readonly companyId?: string;
  readonly projectId?: string;
  readonly acquiredAt: string;
}

export interface AcquisitionArtifact {
  readonly id: string;
  readonly acquisitionId: string;
  readonly filePath: string;
  readonly artifactType: 'SOURCE' | 'LOG' | 'BUILD_OUTPUT' | 'TEST_OUTPUT' | 'BINARY';
  readonly checksumSha256: string;
  readonly sizeBytes: number;
  readonly createdAt: string;
}

export interface RepositoryProvenance {
  readonly id: string;
  readonly repositoryId: string;
  readonly acquisitionId?: string;
  readonly url: string;
  readonly owner: string;
  readonly repository: string;
  readonly commitSha?: string;
  readonly branchOrTag?: string;
  readonly license: string;
  readonly originalCopyright?: string;
  readonly modifications?: string;
  readonly integrationLocation?: string;
  readonly discoveredSource: string;
  readonly createdAt: string;
  readonly acquisitionTimestamp?: string;
  readonly integrationStatus?: string;
}

export interface IntegrationProposal {
  readonly id: string;
  readonly repositoryId: string;
  readonly capabilityId: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly protocol: CapabilityProtocol;
  readonly status: 'PROPOSED' | 'REVIEWED' | 'APPROVED' | 'REJECTED' | 'REGISTERED';
  readonly riskLevel: CapabilityRiskLevel;
  readonly trustLevel: CapabilityTrustLevel;
  readonly executionCommand?: string;
  readonly requiresHumanApproval: boolean;
  readonly decisionReason?: string;
  readonly decidedBy?: string;
  readonly decidedAt?: string;
  readonly createdAt: string;
}

export interface GitHubRateLimitInfo {
  readonly limit: number;
  readonly remaining: number;
  readonly resetAt: string;
  readonly authenticated: boolean;
  readonly status: 'OK' | 'RATE_LIMITED' | 'UNKNOWN';
}

export interface CandidateComparisonResult {
  readonly candidates: Array<{
    readonly repository: GitHubRepository;
    readonly intelligence?: RepositoryIntelligence;
    readonly securityScore: number;
    readonly suitabilityScore: number;
    readonly suitabilityReasons: string[];
  }>;
  readonly winnerRepositoryId?: string;
  readonly criteriaUsed: string[];
  readonly evidenceSummary: string;
}

export interface GitHubSearchCriteria {
  readonly query: string;
  readonly capabilityNeed?: string;
  readonly language?: string;
  readonly license?: string;
  readonly minStars?: number;
  readonly minActivityDays?: number;
  readonly topic?: string;
  readonly architecture?: ArchitectureType;
  readonly limit?: number;
  readonly keywords?: string[];
}
