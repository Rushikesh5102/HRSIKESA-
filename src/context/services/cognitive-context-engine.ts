/**
 * HṚṢĪKEŚA (हृषीकेश) — Cognitive Context Engine
 *
 * Track A / INT-007: Unified Context Selection, Scoping, Relevance & Intelligence
 *
 * Coordinates request classification, scope resolution, candidate collection,
 * relevance ranking, temporal filtering, conflict resolution, budget management,
 * compression, and formatted context generation.
 */

import { randomUUID } from 'node:crypto';
import {
  ContextRequest,
  CognitiveContextResult,
  ContextTrace,
  ContextTraceTimings,
  ContextCandidate,
} from '../interfaces/context.types.js';
import { RequestClassifierService } from './request-classifier.service.js';
import { ScopeResolverService } from './scope-resolver.service.js';
import { CandidateCollectorService } from './candidate-collector.service.js';
import { RelevanceRankerService } from './relevance-ranker.service.js';
import { TemporalFilterService } from './temporal-filter.service.js';
import { ConflictResolverService } from './conflict-resolver.service.js';
import { ContextBudgetManagerService } from './context-budget-manager.service.js';
import { ContextCompressorService } from './context-compressor.service.js';

export interface CognitiveContextEngineDependencies {
  readonly classifier: RequestClassifierService;
  readonly scopeResolver: ScopeResolverService;
  readonly candidateCollector: CandidateCollectorService;
  readonly relevanceRanker: RelevanceRankerService;
  readonly temporalFilter: TemporalFilterService;
  readonly conflictResolver: ConflictResolverService;
  readonly budgetManager: ContextBudgetManagerService;
  readonly compressor: ContextCompressorService;
}

export class CognitiveContextEngine {
  private readonly classifier: RequestClassifierService;
  private readonly scopeResolver: ScopeResolverService;
  private readonly candidateCollector: CandidateCollectorService;
  private readonly relevanceRanker: RelevanceRankerService;
  private readonly temporalFilter: TemporalFilterService;
  private readonly conflictResolver: ConflictResolverService;
  private readonly budgetManager: ContextBudgetManagerService;
  private readonly compressor: ContextCompressorService;

  private readonly traceCache: Map<string, ContextTrace> = new Map();
  private readonly maxTraces: number = 200;

  constructor(dependencies: CognitiveContextEngineDependencies) {
    this.classifier = dependencies.classifier;
    this.scopeResolver = dependencies.scopeResolver;
    this.candidateCollector = dependencies.candidateCollector;
    this.relevanceRanker = dependencies.relevanceRanker;
    this.temporalFilter = dependencies.temporalFilter;
    this.conflictResolver = dependencies.conflictResolver;
    this.budgetManager = dependencies.budgetManager;
    this.compressor = dependencies.compressor;
  }

  /**
   * Main entrypoint: Assemble unified, scoped, ranked, budget-enforced context.
   */
  async assembleContext(request: ContextRequest): Promise<CognitiveContextResult> {
    return this.assembleCognitiveContext(request);
  }

  async assembleCognitiveContext(request: ContextRequest): Promise<CognitiveContextResult> {
    const userMessage = (request.userMessage || request.query || '').trim();
    const effectiveRequest: ContextRequest = {
      ...request,
      userMessage,
    };
    const startTotal = performance.now();
    const requestId = effectiveRequest.requestId || `ctx-${randomUUID().slice(0, 8)}`;

    const timings: ContextTraceTimings = {
      classification: 0,
      scopeResolution: 0,
      candidateCollection: 0,
      ranking: 0,
      temporalFiltering: 0,
      conflictResolution: 0,
      compression: 0,
      assembly: 0,
      total: 0,
    };

    // 1. Classification
    const t0 = performance.now();
    const classification = this.classifier.classify(effectiveRequest);
    timings.classification = Math.round((performance.now() - t0) * 100) / 100;

    // 2. Scope Resolution
    const t1 = performance.now();
    const scopeResolution = this.scopeResolver.resolveScope(effectiveRequest, classification);
    timings.scopeResolution = Math.round((performance.now() - t1) * 100) / 100;

    // 3. Candidate Collection
    const t2 = performance.now();
    const activatedSources = this.candidateCollector.getActivatedSources(
      classification,
      scopeResolution
    );

    const rawCandidates = await this.candidateCollector.collectCandidates(
      effectiveRequest,
      classification,
      scopeResolution,
      activatedSources
    );
    timings.candidateCollection = Math.round((performance.now() - t2) * 100) / 100;

    // 4. Relevance Ranking
    const t3 = performance.now();
    const rankedCandidates = this.relevanceRanker.rank(
      rawCandidates,
      effectiveRequest,
      classification,
      scopeResolution
    );
    timings.ranking = Math.round((performance.now() - t3) * 100) / 100;

    // 5. Temporal Filtering
    const t4 = performance.now();
    const temporalFiltered = this.temporalFilter.filter(
      rankedCandidates,
      classification.temporalScope,
      effectiveRequest.referenceTime
    );
    timings.temporalFiltering = Math.round((performance.now() - t4) * 100) / 100;

    // 6. Conflict Resolution & Contradiction Annotation
    const t5 = performance.now();
    const conflictResult = this.conflictResolver.resolveConflicts(temporalFiltered);
    timings.conflictResolution = Math.round((performance.now() - t5) * 100) / 100;

    // 7. Budget Calculation & Compression
    const t6 = performance.now();
    const tier = effectiveRequest.tier ?? effectiveRequest.modelContextBudget?.tier ?? (
      classification.complexity === 'SIMPLE' ? 1 :
      classification.complexity === 'STANDARD' ? 2 :
      classification.complexity === 'COMPLEX' ? 3 : 4
    );
    const budget = this.budgetManager.calculateBudget(tier, classification.complexity);

    const compressionResult = this.compressor.compress(conflictResult.processedCandidates, budget);
    timings.compression = Math.round((performance.now() - t6) * 100) / 100;

    // 8. Final Formatting & Assembly
    const t7 = performance.now();
    const formattedContext = this.formatContext(compressionResult.selectedCandidates);
    timings.assembly = Math.round((performance.now() - t7) * 100) / 100;

    timings.total = Math.round((performance.now() - startTotal) * 100) / 100;

    // 9. Build Trace
    const sourceBreakdown: Record<string, { collected: number; selected: number }> = {};
    for (const src of activatedSources) {
      const collCount = rawCandidates.filter(c => c.sourceType === src).length;
      const selCount = compressionResult.selectedCandidates.filter(c => c.sourceType === src).length;
      sourceBreakdown[src] = { collected: collCount, selected: selCount };
    }

    const selectionReasons: Record<string, string[]> = {};
    for (const item of compressionResult.selectedCandidates) {
      selectionReasons[item.id] = item.rankingReasons;
    }

    const trace: ContextTrace = {
      requestId,
      userMessage: effectiveRequest.userMessage || '',
      intent: classification.intent,
      complexity: classification.complexity,
      resolvedScope: scopeResolution.primaryScope,
      targetEntity: classification.extractedEntities[0],
      targetProject: scopeResolution.targetProjectId,
      targetCompany: scopeResolution.targetCompanyId,
      activatedSources,
      candidatesCollected: rawCandidates.length,
      candidatesSelected: compressionResult.selectedCandidates.length,
      candidatesRejected: rawCandidates.length - compressionResult.selectedCandidates.length,
      sourceBreakdown,
      selectionReasons,
      rejectionReasons: compressionResult.rejectionReasons,
      budget,
      timingsMs: timings,
      finalContextSizeChars: formattedContext.length,
      timestamp: new Date().toISOString(),
    };

    // Store in trace cache
    this.recordTrace(trace);

    // Suggested model tier based on task complexity
    const suggestedModelTier =
      classification.complexity === 'SIMPLE' ? 'FAST_LOCAL' :
      classification.complexity === 'STANDARD' ? 'FAST_LOCAL' :
      classification.complexity === 'COMPLEX' ? 'BALANCED_DEEP_LOCAL' :
      'FLAGSHIP_QUALITY';

    return {
      requestId,
      formattedContext,
      selectedCandidates: compressionResult.selectedCandidates,
      trace,
      suggestedModelTier,
      suggestedComplexity: classification.complexity,
    };
  }

  /**
   * Safe Trace inspection methods
   */
  getTrace(requestId: string): ContextTrace | undefined {
    return this.traceCache.get(requestId);
  }

  listTraces(limit = 20): ContextTrace[] {
    const all = Array.from(this.traceCache.values()).reverse();
    return all.slice(0, limit);
  }

  clearTraces(): void {
    this.traceCache.clear();
  }

  private recordTrace(trace: ContextTrace): void {
    if (this.traceCache.size >= this.maxTraces) {
      const oldestKey = this.traceCache.keys().next().value;
      if (oldestKey) {
        this.traceCache.delete(oldestKey);
      }
    }
    this.traceCache.set(trace.requestId, trace);
  }

  /**
   * Structure candidates into human-readable, model-digestible Markdown sections.
   */
  private formatContext(candidates: ContextCandidate[]): string {
    if (candidates.length === 0) {
      return '';
    }

    const sections: string[] = [];

    // Grouping
    const userPrefs = candidates.filter(c => c.sourceType === 'MEMORY_SEMANTIC' && c.scope === 'CREATOR');
    const decisions = candidates.filter(c => c.sourceType === 'DECISION');
    const projects = candidates.filter(c => c.sourceType === 'PROJECT');
    const companies = candidates.filter(c => c.sourceType === 'COMPANY');
    const knowledge = candidates.filter(c => c.sourceType === 'KNOWLEDGE_GRAPH');
    const evidence = candidates.filter(c => c.sourceType === 'RESEARCH_EVIDENCE');
    const skills = candidates.filter(c => c.sourceType === 'SKILL');
    const contested = candidates.filter(c => c.contradiction?.isContested);

    if (userPrefs.length > 0) {
      sections.push('### Creator & User Directives\n' + userPrefs.map(c => `- ${c.content}`).join('\n'));
    }

    if (decisions.length > 0) {
      sections.push('### Architectural & Strategic Decisions\n' + decisions.map(c => `[Decision] ${c.title || c.id}:\n${c.content}`).join('\n\n'));
    }

    if (projects.length > 0) {
      sections.push('### Project Context\n' + projects.map(c => `[Project] ${c.title || c.id}:\n${c.content}`).join('\n\n'));
    }

    if (companies.length > 0) {
      sections.push('### Company & Operational Context\n' + companies.map(c => `[Company] ${c.title || c.id}:\n${c.content}`).join('\n\n'));
    }

    if (knowledge.length > 0) {
      sections.push('### Knowledge Graph Facts\n' + knowledge.map(c => `- ${c.content}`).join('\n'));
    }

    if (evidence.length > 0) {
      sections.push('### Verified Research Evidence\n' + evidence.map(c => `[Evidence] ${c.title || ''}:\n${c.content}`).join('\n\n'));
    }

    if (skills.length > 0) {
      sections.push('### Procedural Skills & Directives\n' + skills.map(c => `- ${c.title || c.id}: ${c.content}`).join('\n'));
    }

    if (contested.length > 0) {
      sections.push('### Contested / Conflicting Information\n' + contested.map(c => c.content).join('\n\n'));
    }

    // Any remaining candidates not covered by specific groups
    const handledIds = new Set([
      ...userPrefs.map(c => c.id),
      ...decisions.map(c => c.id),
      ...projects.map(c => c.id),
      ...companies.map(c => c.id),
      ...knowledge.map(c => c.id),
      ...evidence.map(c => c.id),
      ...skills.map(c => c.id),
      ...contested.map(c => c.id),
    ]);

    const remaining = candidates.filter(c => !handledIds.has(c.id));
    if (remaining.length > 0) {
      sections.push('### Additional Context\n' + remaining.map(c => `- ${c.content}`).join('\n'));
    }

    return sections.join('\n\n');
  }
}
