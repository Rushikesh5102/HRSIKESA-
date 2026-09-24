/**
 * HṚṢĪKEŚA (हृषीकेश) — Phase 19: Advanced Knowledge Graph Domain Types
 */

export type EntityType =
  | 'PERSON'
  | 'ORGANIZATION'
  | 'COMPANY'
  | 'PROJECT'
  | 'PRODUCT'
  | 'SERVICE'
  | 'AGENT'
  | 'MODEL'
  | 'PROVIDER'
  | 'SOFTWARE'
  | 'LIBRARY'
  | 'TECHNOLOGY'
  | 'DOCUMENT'
  | 'WEBSITE'
  | 'SOURCE'
  | 'LOCATION'
  | 'CONCEPT'
  | 'EVENT'
  | 'TASK'
  | 'GOAL'
  | 'MISSION'
  | 'DECISION'
  | 'SKILL'
  | 'TOOL'
  | 'CUSTOMER'
  | 'DEPARTMENT'
  | string;

export type RelationshipType =
  | 'OWNS'
  | 'CREATED_BY'
  | 'DEVELOPED_BY'
  | 'WORKS_ON'
  | 'PART_OF'
  | 'DEPENDS_ON'
  | 'USES'
  | 'PROVIDES'
  | 'MANUFACTURES'
  | 'SERVES'
  | 'MANAGES'
  | 'REPORTS_TO'
  | 'RELATED_TO'
  | 'SIMILAR_TO'
  | 'CONTRADICTS'
  | 'SUPPORTS'
  | 'REQUIRES'
  | 'PRODUCES'
  | 'USED_BY'
  | 'LOCATED_IN'
  | 'MEMBER_OF'
  | 'ASSIGNED_TO'
  | 'CREATED'
  | 'MODIFIED'
  | 'REPLACED'
  | 'SUPERSEDES'
  | 'DERIVED_FROM'
  | 'EVIDENCED_BY'
  | string;

export type KnowledgeScope =
  | 'GLOBAL'
  | 'CREATOR'
  | 'COMPANY'
  | 'PROJECT'
  | 'DEPARTMENT'
  | 'AGENT'
  | 'MISSION'
  | 'TASK'
  | string;

export type EntityStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'ARCHIVED'
  | 'CANDIDATE'
  | 'SUPPORTED'
  | 'CONFIRMED'
  | 'DISPUTED'
  | 'CONTRADICTED'
  | 'REJECTED'
  | 'SUPERSEDED'
  | 'EXPIRED';

export type RelationshipDirection = 'OUTGOING' | 'INCOMING' | 'BIDIRECTIONAL';

export type FactValueType = 'STRING' | 'NUMBER' | 'BOOLEAN' | 'ENTITY_REF' | 'JSON';

export type FactStatus =
  | 'ACTIVE'
  | 'SUPERSEDED'
  | 'DISPUTED'
  | 'EXPIRED'
  | 'REJECTED'
  | 'CANDIDATE'
  | 'SUPPORTED'
  | 'CONFIRMED'
  | 'CONTRADICTED';

export type TemporalState = 'CURRENT' | 'HISTORICAL' | 'FUTURE' | 'UNKNOWN';

export type ClaimStatus =
  | 'CANDIDATE'
  | 'SUPPORTED'
  | 'CONFIRMED'
  | 'DISPUTED'
  | 'CONTRADICTED'
  | 'REJECTED'
  | 'SUPERSEDED'
  | 'EXPIRED';

export type ProvenanceType =
  | 'USER'
  | 'SYSTEM'
  | 'AGENT'
  | 'RESEARCH'
  | 'DOCUMENT'
  | 'WEB'
  | 'TOOL'
  | 'MODEL'
  | 'IMPORTED'
  | 'DERIVED';

export type SourceCredibility =
  | 'AUTHORITATIVE' // 1.0 confidence: system bootstrap, creator direct prompt
  | 'PRIMARY'       // 0.85 - 0.95 confidence: official repo, direct documentation
  | 'SECONDARY'     // 0.70 confidence: third-party article, news, review
  | 'COMMUNITY'     // 0.50 confidence: forum post, speculative observation
  | 'UNVERIFIED';   // 0.30 confidence: raw web snippet without verified domain

export type ContradictionStatus = 'DETECTED' | 'RESOLVED' | 'DISPUTED' | 'SUPERSEDED';

export type ResolutionStrategy =
  | 'NEWER_SUPERSEDES'
  | 'HIGHER_CREDIBILITY'
  | 'USER_CONFIRMED'
  | 'COEXISTENCE'
  | 'MANUAL';

export interface KnowledgeEntity {
  id: string;
  entityType: EntityType;
  canonicalName: string;
  displayName: string;
  description?: string;
  aliases?: string[];
  scope: KnowledgeScope;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EntityAlias {
  id: string;
  entityId: string;
  alias: string;
  normalizedAlias: string;
  createdAt: string;
}

export interface KnowledgeRelationship {
  id: string;
  sourceEntityId: string;
  relationshipType: RelationshipType;
  targetEntityId: string;
  direction: RelationshipDirection;
  confidence: number; // 0.0 - 1.0
  status: 'ACTIVE' | 'SUPERSEDED' | 'DEPRECATED';
  scope: KnowledgeScope;
  validFrom?: string;
  validUntil?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeFact {
  id: string;
  subjectEntityId: string;
  predicate: string;
  objectEntityId?: string;
  objectValue: string;
  valueType: FactValueType;
  confidence: number; // 0.0 - 1.0
  version: number;
  status: FactStatus;
  scope: KnowledgeScope;
  validFrom?: string;
  validUntil?: string;
  observedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeEvidence {
  id: string;
  factId: string;
  sourceType: ProvenanceType;
  sourceReference: string;
  quote?: string;
  location?: string;
  sourceDate?: string;
  retrievedAt: string;
  credibility: SourceCredibility;
  confidence: number;
  provenance: string;
}

export interface KnowledgeClaim {
  id: string;
  claimText: string;
  extractedEntities: string[];
  status: ClaimStatus;
  confidence: number;
  sourceType: ProvenanceType;
  sourceReference: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeContradiction {
  id: string;
  factIdA: string;
  factIdB: string;
  subjectEntityId: string;
  predicate: string;
  description?: string;
  status: ContradictionStatus;
  resolutionStrategy?: ResolutionStrategy;
  resolvedFactId?: string;
  detectedAt: string;
  resolvedAt?: string;
}

export interface FactVersion {
  id: string;
  factId: string;
  version: number;
  predicate: string;
  objectValue: string;
  status: FactStatus;
  validFrom?: string;
  validUntil?: string;
  replacedByFactId?: string;
  createdAt: string;
}

// Graph Traversal & Search Types
export interface GraphNode {
  id: string;
  label: string;
  type: EntityType;
  scope: KnowledgeScope;
  description?: string;
  status: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: RelationshipType;
  direction: RelationshipDirection;
  confidence: number;
}

export interface SubgraphResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  centerEntityId?: string;
  depthReached: number;
}

export interface PathResult {
  found: boolean;
  nodes: GraphNode[];
  edges: GraphEdge[];
  length: number;
}

export interface TraversalOptions {
  maxDepth?: number;         // default: 2, bounded max: 5
  limit?: number;            // max nodes/neighbors to return
  allowedRelationshipTypes?: RelationshipType[];
  scope?: KnowledgeScope;
  minConfidence?: number;
  includeHistorical?: boolean;
}

export interface KnowledgeSearchResult {
  entities: KnowledgeEntity[];
  facts: KnowledgeFact[];
  relationships: KnowledgeRelationship[];
  evidence: KnowledgeEvidence[];
  score?: number;
}

export interface KnowledgeTimelineEvent {
  id: string;
  entityId: string;
  timestamp: string;
  eventType: 'FACT_OBSERVED' | 'FACT_SUPERSEDED' | 'RELATIONSHIP_CREATED' | 'DECISION_MADE' | 'CONTRADICTION_DETECTED';
  title: string;
  description: string;
  status: string;
  provenance: ProvenanceType;
}

export interface KnowledgeContextSummary {
  authoritativeFacts: string[];
  currentScopedFacts: string[];
  relationships: string[];
  historicalContext: string[];
  evidenceCitations: string[];
  confidenceScore: number;
}
