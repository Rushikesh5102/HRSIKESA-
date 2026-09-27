/**
 * HṚṢĪKEŚA (हृषीकेश) — Context Candidate Collector Service
 *
 * Track A / INT-007: Cognitive Context Engine
 * Collects context candidates across all authoritative memory, graph, research,
 * and decision stores guided by the Source Activation Matrix.
 */

import {
  ContextRequest,
  ContextCandidate,
  ContextScope,
  CandidateSourceType,
} from '../interfaces/context.types.js';
import { ClassificationResult } from './request-classifier.service.js';
import { ResolvedScope } from './scope-resolver.service.js';
import {
  KnowledgeEntityRepository,
  KnowledgeFactRepository,
  KnowledgeRelationshipRepository,
  KnowledgeEvidenceRepository,
  KnowledgeContradictionRepository,
  EntityResolutionService,
  KnowledgeGraphService,
} from '../../knowledge/index.js';
import { DecisionRepository } from '../../persistence/repositories/decision.repository.js';
import { MemoryRepository } from '../../persistence/repositories/memory.repository.js';
import { CreatorProfileManager } from '../../memory/creator.profile.js';
import { SessionManager } from '../../conversation/session.manager.js';
import { BUILTIN_SKILLS } from '../../skills/services/builtin-skills.js';

export interface CollectorDependencies {
  readonly memoryRepo?: MemoryRepository;
  readonly creatorManager?: CreatorProfileManager;
  readonly sessionManager?: SessionManager;
  readonly entityRepo?: KnowledgeEntityRepository;
  readonly factRepo?: KnowledgeFactRepository;
  readonly relRepo?: KnowledgeRelationshipRepository;
  readonly evidenceRepo?: KnowledgeEvidenceRepository;
  readonly contradictionRepo?: KnowledgeContradictionRepository;
  readonly resolutionService?: EntityResolutionService;
  readonly graphService?: KnowledgeGraphService;
  readonly decisionRepo?: DecisionRepository;
  readonly hybridMemoryRetriever?: any;
  readonly workingMemoryEngine?: import('../../working-memory/services/working-memory.engine.js').WorkingMemoryEngine;
}

export class CandidateCollectorService {
  private readonly deps: CollectorDependencies;

  constructor(deps: CollectorDependencies) {
    this.deps = deps;
  }

  /**
   * Deterministically determines which sources are active for this request.
   * Enforces Section 8: Source Activation Matrix.
   */
  public getActivatedSources(
    classification: ClassificationResult,
    _scope?: ResolvedScope
  ): CandidateSourceType[] {
    const { isFastPathCandidate } = classification;

    // Fast-path candidate (greetings, clock, simple math): ZERO extra sources
    if (isFastPathCandidate) {
      return ['CONVERSATION'];
    }

    const sources = this.getBaseActivatedSources(classification, _scope);
    if (this.deps.workingMemoryEngine && !sources.includes('WORKING_MEMORY')) {
      sources.push('WORKING_MEMORY');
    }
    return sources;
  }

  private getBaseActivatedSources(
    classification: ClassificationResult,
    _scope?: ResolvedScope
  ): CandidateSourceType[] {
    const { intent } = classification;

    // Scope-level overrides
    if (_scope?.primaryScope === 'AGENT') {
      return ['AGENT', 'PROJECT', 'SKILL', 'KNOWLEDGE_GRAPH', 'TOOL_STATE'];
    }
    if (_scope?.primaryScope === 'GOAL' || _scope?.primaryScope === 'MISSION') {
      return ['GOAL', 'MISSION', 'PROJECT', 'DECISION', 'SKILL', 'KNOWLEDGE_GRAPH'];
    }

    switch (intent) {
      case 'CASUAL_CONVERSATION':
        return ['CONVERSATION', 'MEMORY_EPISODIC'];

      case 'IDENTITY':
        return ['CONVERSATION', 'MEMORY_EPISODIC', 'KNOWLEDGE_GRAPH'];

      case 'DECISION_QUERY':
        return [
          'DECISION',
          'KNOWLEDGE_GRAPH',
          'PROJECT',
          'RESEARCH_EVIDENCE',
          'MEMORY_EPISODIC',
        ];

      case 'PROJECT_QUERY':
        return [
          'PROJECT',
          'DECISION',
          'KNOWLEDGE_GRAPH',
          'RESEARCH_EVIDENCE',
          'MEMORY_EPISODIC',
          'MEMORY_SEMANTIC',
        ];

      case 'RESEARCH_QUERY':
        return [
          'RESEARCH_EVIDENCE',
          'KNOWLEDGE_GRAPH',
          'DECISION',
          'DOCUMENT',
          'MEMORY_SEMANTIC',
        ];

      case 'COMPANY_QUERY':
        return [
          'COMPANY',
          'PROJECT',
          'DECISION',
          'KNOWLEDGE_GRAPH',
          'MEMORY_EPISODIC',
        ];

      case 'GOAL_MISSION':
        return [
          'GOAL',
          'MISSION',
          'PROJECT',
          'DECISION',
          'SKILL',
          'KNOWLEDGE_GRAPH',
        ];

      case 'AGENT_TASK':
        return [
          'AGENT',
          'PROJECT',
          'SKILL',
          'KNOWLEDGE_GRAPH',
          'TOOL_STATE',
        ];

      case 'TECHNICAL_QUERY':
      case 'GENERAL_KNOWLEDGE':
      default:
        return [
          'KNOWLEDGE_GRAPH',
          'DECISION',
          'MEMORY_SEMANTIC',
          'MEMORY_EPISODIC',
          'RESEARCH_EVIDENCE',
          'SKILL',
        ];
    }
  }

  /**
   * Collects all candidates from active sources matching the request and scope.
   */
  public async collectCandidates(
    request: ContextRequest,
    classification: ClassificationResult,
    scope: ResolvedScope,
    activatedSources: CandidateSourceType[]
  ): Promise<ContextCandidate[]> {
    const candidates: ContextCandidate[] = [];
    const sourceSet = new Set(activatedSources);

    // 1. Current Conversation (SessionManager)
    if (sourceSet.has('CONVERSATION') && this.deps.sessionManager && request.sessionId) {
      try {
        const session = this.deps.sessionManager.getSession(request.sessionId);
        const history = session?.messages || [];
        const recentTurns = history.slice(-4);
        for (const msg of recentTurns) {
          if (msg.role !== 'system') {
            candidates.push({
              id: `conv_${msg.id || Math.random().toString(36).slice(2)}`,
              sourceType: 'CONVERSATION',
              scope: 'SESSION',
              title: `${msg.role.toUpperCase()} Turn`,
              content: msg.content,
              relevanceScore: 0.9,
              rankingReasons: ['recent_conversation_turn'],
              provenance: msg.role === 'user' ? 'EXPLICIT' : 'SYSTEM',
              confidence: 1.0,
              tokensEstimated: Math.ceil(msg.content.length / 4),
              charsCount: msg.content.length,
            });
          }
        }
      } catch {}
    }

    // 2. Creator Profile & Preferences (MemoryRepository / CreatorProfileManager)
    if (
      (sourceSet.has('MEMORY_EPISODIC') || scope.primaryScope === 'CREATOR') &&
      this.deps.creatorManager
    ) {
      try {
        const profile = this.deps.creatorManager.getProfile();
        // Creator principles & directives
        for (const [idx, directive] of profile.projectPrinciples.entries()) {
          candidates.push({
            id: `creator_principle_${idx}`,
            sourceType: 'MEMORY_EPISODIC',
            scope: 'CREATOR',
            title: `Creator Directive #${idx + 1}`,
            content: directive,
            relevanceScore: 0.95,
            rankingReasons: ['creator_authority_directive'],
            provenance: 'EXPLICIT',
            confidence: 1.0,
            tokensEstimated: Math.ceil(directive.length / 4),
            charsCount: directive.length,
          });
        }
      } catch {}
    }

    // 3. User Preferences (from MemoryRepository)
    if (sourceSet.has('MEMORY_EPISODIC') && this.deps.memoryRepo) {
      try {
        const prefs = this.deps.memoryRepo.listByTier('preferences', 10);
        for (const p of prefs) {
          candidates.push({
            id: `pref_${p.id}`,
            sourceType: 'MEMORY_EPISODIC',
            sourceId: p.id,
            scope: 'CREATOR',
            title: `User Preference: ${p.key}`,
            content: `${p.key}: ${p.content}`,
            relevanceScore: 0.92,
            rankingReasons: ['explicit_user_preference'],
            provenance: 'EXPLICIT',
            confidence: 1.0,
            tokensEstimated: Math.ceil(p.content.length / 4),
            charsCount: p.content.length,
          });
        }
      } catch {}
    }

    // 4. Architectural & Operational Decisions (DecisionRepository)
    if (sourceSet.has('DECISION') && this.deps.decisionRepo) {
      try {
        const decisionFilter: any = {};
        if (scope.targetProjectId) {
          decisionFilter.projectId = scope.targetProjectId;
        }
        if (scope.targetCompanyId) {
          decisionFilter.companyId = scope.targetCompanyId;
        }

        let decisions = this.deps.decisionRepo.list(decisionFilter);
        if (decisions.length === 0 && !request.projectId && !request.targetProjectId && !scope.targetProjectId) {
          decisions = this.deps.decisionRepo.list();
        }

        for (const dec of decisions) {
          if (scope.boundaryEnforced && dec.projectId && scope.targetProjectId && dec.projectId !== scope.targetProjectId) {
            continue;
          }
          const body = `Decision: ${dec.title}\nStatus: ${dec.status}\nRationale: ${dec.decision} — ${dec.reasoning || ''}${dec.supersedes ? ` (Supersedes: ${dec.supersedes})` : ''}`;
          candidates.push({
            id: `decision_${dec.id}`,
            sourceType: 'DECISION',
            sourceId: dec.id,
            scope: dec.projectId ? 'PROJECT' : (dec.companyId ? 'COMPANY' : 'GLOBAL'),
            title: `ADR: ${dec.title}`,
            content: body,
            relevanceScore: 0.88,
            rankingReasons: ['architectural_decision_record', 'scope_match'],
            provenance: 'EXPLICIT',
            confidence: 1.0,
            tokensEstimated: Math.ceil(body.length / 4),
            charsCount: body.length,
            temporal: {
              validFrom: dec.createdAt,
              isCurrent: dec.status === 'ACCEPTED',
            },
          });
        }
      } catch {}
    }

    // 5. Knowledge Graph (Entities, Facts, Contradictions)
    if (sourceSet.has('KNOWLEDGE_GRAPH') && this.deps.factRepo && this.deps.entityRepo) {
      try {
        // Find entities mentioned in classification or scope
        const entityNamesToQuery = new Set<string>(classification.extractedEntities);
        if (scope.targetEntityName) entityNamesToQuery.add(scope.targetEntityName);
        if (scope.targetProjectId) {
          entityNamesToQuery.add(scope.targetProjectId);
          if (scope.targetProjectId === 'hrisekesa') {
            entityNamesToQuery.add('HṚṢĪKEŚA');
          }
        }

        const resolvedEntities: any[] = [];
        const seenEntityIds = new Set<string>();

        for (const entName of entityNamesToQuery) {
          if (this.deps.resolutionService) {
            const res = await this.deps.resolutionService.resolveEntity(entName);
            if (res.resolved && res.entity && !seenEntityIds.has(res.entity.id)) {
              seenEntityIds.add(res.entity.id);
              resolvedEntities.push(res.entity);
            }
          } else {
            const ent = this.deps.entityRepo.findByCanonicalName(entName);
            if (ent && !seenEntityIds.has(ent.id)) {
              seenEntityIds.add(ent.id);
              resolvedEntities.push(ent);
            }
          }
        }

        // Search entities matching significant words in message
        const significantWords = (request.userMessage || '')
          .replace(/[?!.,;:()]/g, ' ')
          .split(/\s+/)
          .filter(w => w.length >= 3 && !['what', 'when', 'where', 'which', 'does', 'show', 'with', 'from', 'this', 'that'].includes(w.toLowerCase()));

        for (const word of significantWords) {
          const matches = this.deps.entityRepo.listEntities({ search: word, limit: 5 });
          for (const m of matches) {
            if (!seenEntityIds.has(m.id)) {
              seenEntityIds.add(m.id);
              resolvedEntities.push(m);
            }
          }
        }

        // Active contradictions map to attach contradiction metadata
        const activeContradictions = this.deps.contradictionRepo
          ? this.deps.contradictionRepo.findContradictions({ status: 'UNRESOLVED' })
          : [];
        const contradictionMap = new Map<string, any>();
        for (const c of activeContradictions) {
          if (c.factIdA) contradictionMap.set(c.factIdA, c);
          if (c.factIdB) contradictionMap.set(c.factIdB, c);
        }

        for (const entity of resolvedEntities) {
          // Scope isolation check: if boundary is enforced, entity scope must be in allowedScopes
          if (scope.boundaryEnforced && !scope.allowedScopes.includes(entity.scope)) {
            continue;
          }

          // Entity candidate
          const entitySummary = `Entity: ${entity.displayName} (${entity.entityType}) [Scope: ${entity.scope}]\n${entity.description || ''}`;
          candidates.push({
            id: `entity_${entity.id}`,
            sourceType: 'KNOWLEDGE_GRAPH',
            sourceId: entity.id,
            scope: entity.scope,
            title: `Entity: ${entity.displayName}`,
            content: entitySummary.trim(),
            relevanceScore: 0.85,
            rankingReasons: ['entity_match', `scope_${entity.scope}`],
            provenance: 'EXPLICIT',
            confidence: 1.0,
            tokensEstimated: Math.ceil(entitySummary.length / 4),
            charsCount: entitySummary.length,
          });

          // Fetch facts for this entity
          const facts = this.deps.factRepo.findFacts({
            subjectEntityId: entity.id,
            activeOnly: classification.temporalScope !== 'HISTORICAL' && classification.temporalScope !== 'ALL',
          });

          for (const fact of facts) {
            const mappedScope: ContextScope = ['CREATOR', 'GLOBAL', 'PROJECT', 'COMPANY', 'SESSION', 'AGENT', 'GOAL', 'MISSION', 'TASK'].includes(fact.scope.toUpperCase())
              ? (fact.scope.toUpperCase() as ContextScope)
              : 'GLOBAL';

            // Check scope isolation
            if (scope.boundaryEnforced && !scope.allowedScopes.includes(mappedScope)) {
              continue;
            }

            const contradiction = contradictionMap.get(fact.id);
            const factText = `${entity.displayName} -> ${fact.predicate}: ${fact.objectValue}${fact.version && fact.version > 1 ? ` (v${fact.version})` : ''}`;

            candidates.push({
              id: `fact_${fact.id}`,
              sourceType: 'KNOWLEDGE_GRAPH',
              sourceId: fact.id,
              scope: mappedScope,
              title: `Fact: ${fact.predicate}`,
              content: factText,
              relevanceScore: 0.82,
              rankingReasons: ['knowledge_fact', `predicate_${fact.predicate}`],
              provenance: fact.provenance || 'DERIVED',
              confidence: fact.confidence || 0.9,
              tokensEstimated: Math.ceil(factText.length / 4),
              charsCount: factText.length,
              temporal: {
                validFrom: fact.validFrom || undefined,
                validUntil: fact.validUntil || undefined,
                observedAt: fact.observedAt || undefined,
                isCurrent: fact.status === 'ACTIVE' || fact.status === 'CONFIRMED',
                version: fact.version,
                supersededBy: (fact as any).supersededBy || undefined,
              },
              contradiction: contradiction
                ? {
                    isContested: true,
                    conflictReason: contradiction.reason || contradiction.description,
                    conflictingCandidateId: contradiction.factIdA === fact.id ? contradiction.factIdB : contradiction.factIdA,
                  }
                : undefined,
            });
          }
        }
      } catch {}
    }

    // 6. Research Evidence & Citations (KnowledgeEvidenceRepository)
    if (sourceSet.has('RESEARCH_EVIDENCE') && this.deps.evidenceRepo) {
      try {
        const evidenceList = this.deps.evidenceRepo.listEvidence({ limit: 15 });
        for (const ev of evidenceList) {
          const body = `Verified Evidence [Study: ${ev.studyId || 'N/A'}]: "${ev.quote || ''}" (Source: ${ev.url || ev.sourceReference || 'N/A'})`;
          candidates.push({
            id: `ev_${ev.id}`,
            sourceType: 'RESEARCH_EVIDENCE',
            sourceId: ev.id,
            scope: 'GLOBAL',
            title: `Evidence Citation`,
            content: body,
            relevanceScore: 0.80,
            rankingReasons: ['verified_evidence_citation', 'research_provenance'],
            provenance: 'RESEARCH',
            confidence: ev.confidence || 0.95,
            tokensEstimated: Math.ceil(body.length / 4),
            charsCount: body.length,
          });
        }
      } catch {}
    }

    // 7. Skills & Procedures (Builtin Skills)
    if (sourceSet.has('SKILL')) {
      const lowerQuery = (request.userMessage || '').toLowerCase();
      for (const skill of BUILTIN_SKILLS) {
        if (
          lowerQuery.includes(skill.id.replace(/-/g, ' ')) ||
          skill.triggerPhrases?.some(t => lowerQuery.includes(t.toLowerCase())) ||
          lowerQuery.includes(skill.name.toLowerCase())
        ) {
          const content = `Skill: ${skill.name} (${skill.id})\nDescription: ${skill.description}\nCategory: ${skill.category}`;
          candidates.push({
            id: `skill_${skill.id}`,
            sourceType: 'SKILL',
            sourceId: skill.id,
            scope: 'GLOBAL',
            title: `Procedural Skill: ${skill.name}`,
            content,
            relevanceScore: 0.78,
            rankingReasons: ['skill_tag_match'],
            provenance: 'SYSTEM',
            confidence: 1.0,
            tokensEstimated: Math.ceil(content.length / 4),
            charsCount: content.length,
          });
        }
      }
    }

    // 8. Persistent Working Memory (WorkingMemoryEngine)
    if (sourceSet.has('WORKING_MEMORY') && this.deps.workingMemoryEngine && request.sessionId) {
      try {
        const wmCandidates = this.deps.workingMemoryEngine.getWorkingMemoryCandidates(request.sessionId);
        candidates.push(...wmCandidates);
      } catch {}
    }

    return candidates;
  }
}
