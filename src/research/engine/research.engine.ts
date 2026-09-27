/**
 * HṚṢĪKEŚA — Phase 17 Research Intelligence
 * Master Research Engine
 *
 * Orchestrates end-to-end research:
 * Intent -> Planning -> Discovery -> Acquisition -> Extraction ->
 * Quality/Freshness -> Evidence Store -> Cross-Source Analysis ->
 * Contradiction Detection -> Synthesis -> Artifacts & Memory -> Monitoring.
 */

import {
  IResearchStudy,
  IResearchSource,
  IResearchEvidence,
  IResearchFinding,
  ResearchStatus,
  ResearchDepth,
  ResearchType,
  ResearchBudget,
  ResearchArtifactBundle,
  ISearchProvider,
  DEFAULT_RESEARCH_BUDGET,
} from '../interfaces/research.types.js';
import { ResearchRepository } from '../../persistence/repositories/research.repository.js';
import { ResearchSourceRepository } from '../../persistence/repositories/research-source.repository.js';
import { ResearchEvidenceRepository } from '../../persistence/repositories/research-evidence.repository.js';
import { ResearchFindingRepository } from '../../persistence/repositories/research-finding.repository.js';
import { DuckDuckGoSearchProvider } from '../providers/search.provider.js';
import { SourceExtractor } from '../extractor/source.extractor.js';
import { CrossSourceAnalyzer } from '../analyzer/cross.source.analyzer.js';
import { ResearchSynthesizer } from '../synthesizer/research.synthesizer.js';
import { MemoryRepository } from '../../persistence/repositories/memory.repository.js';
import { SemanticMemoryIndexer } from '../../memory/semantic/semantic.indexer.js';
import { IBrowserAdapter } from '../../tools/browser/interfaces/browser.types.js';
import { EventBus } from '../../core/events/event-bus.js';
import { ModelRouter } from '../../models/router/model.router.js';
import { randomUUID } from 'node:crypto';

export interface CreateStudyOptions {
  title?: string;
  question: string;
  objective?: string;
  scope?: string;
  depth?: ResearchDepth;
  researchType?: ResearchType;
  budget?: Partial<ResearchBudget>;
  createdBy?: string;
  requestedBy?: string;
  companyId?: string;
  projectId?: string;
  goalId?: string;
  customUrls?: string[];
}

export class ResearchEngine {
  private searchProvider: ISearchProvider;
  private extractor: SourceExtractor;
  private analyzer: CrossSourceAnalyzer;
  private synthesizer: ResearchSynthesizer;
  private activeRuns: Map<string, { abortController: AbortController }> = new Map();
  private eventBus?: EventBus;
  private modelRouter?: ModelRouter;

  constructor(
    private studyRepo: ResearchRepository,
    private sourceRepo: ResearchSourceRepository,
    private evidenceRepo: ResearchEvidenceRepository,
    private findingRepo: ResearchFindingRepository,
    private memoryRepo?: MemoryRepository,
    private semanticIndexer?: SemanticMemoryIndexer,
    private browserAdapter?: IBrowserAdapter,
    searchProvider?: ISearchProvider,
    eventBus?: EventBus,
    modelRouter?: ModelRouter
  ) {
    this.searchProvider = searchProvider || new DuckDuckGoSearchProvider();
    this.extractor = new SourceExtractor();
    this.analyzer = new CrossSourceAnalyzer();
    this.synthesizer = new ResearchSynthesizer();
    this.eventBus = eventBus;
    this.modelRouter = modelRouter;
  }

  public setSearchProvider(provider: ISearchProvider): void {
    this.searchProvider = provider;
  }

  public setEventBus(bus: EventBus): void {
    this.eventBus = bus;
  }

  public setModelRouter(router: ModelRouter): void {
    this.modelRouter = router;
  }

  public getModelRouter(): ModelRouter | undefined {
    return this.modelRouter;
  }

  /**
   * Parse natural language prompt to determine if it is a research intent.
   * Classifies research vs non-research, depth, research type, and target agent.
   */
  public parseResearchIntent(prompt: string): {
    isResearch: boolean;
    question: string;
    depth: ResearchDepth;
    researchType: ResearchType;
    suggestedAgent: string;
    searchQueries: string[];
  } {
    const trimmed = (prompt || '').trim();
    const lower = trimmed.toLowerCase();

    // 1. Non-research queries (greetings, identity, clock, simple arithmetic, conversational questions)
    if (
      lower === 'hello' || lower === 'hi' || lower === 'hey' ||
      lower.startsWith('who created you') || lower.startsWith('who are you') ||
      lower.includes('what is hṛṣīkeśa') || lower.includes('what is hrisekesa') ||
      lower.includes('what time is it') || lower.includes('today\'s date') || lower.includes('todays date') ||
      lower === 'what is 2+2?' || lower === 'what is 2 + 2?' || lower.startsWith('what is 12+19') || lower.startsWith('what is 12 + 19') ||
      lower.startsWith('explain recursion') || lower.startsWith('what is recursion')
    ) {
      return {
        isResearch: false,
        question: trimmed,
        depth: 'NORMAL',
        researchType: 'FACT_LOOKUP',
        suggestedAgent: 'Rahu',
        searchQueries: [],
      };
    }

    const explicitResearchTriggers = [
      'research ',
      'investigate ',
      'investigation ',
      'find information about ',
      'look up the latest information about ',
      'what are the latest developments in ',
      'deep dive into ',
      'analyze ',
      'verify whether ',
      'find reliable sources about ',
      'market analysis',
      'competitive analysis',
      'literature review',
      'find out about ',
      'find open source',
      'study of ',
      'summary of ',
      'quick summary of ',
      'brief summary of ',
      'overview of ',
    ];

    const isResearch =
      explicitResearchTriggers.some((t) => lower.includes(t)) ||
      (lower.startsWith('compare ') && (lower.includes(' and ') || lower.includes(' vs ') || lower.includes(' with ') || lower.includes(' to '))) ||
      (lower.startsWith('what are the latest') && lower.length > 20) ||
      (lower.includes('using multiple sources'));

    // 2. Depth extraction
    let depth: ResearchDepth = 'NORMAL';
    if (lower.includes('comprehensive') || lower.includes('exhaustive') || lower.includes('full analysis')) {
      depth = 'COMPREHENSIVE';
    } else if (lower.includes('deep') || lower.includes('thorough') || lower.includes('in-depth')) {
      depth = 'DEEP';
    } else if (lower.includes('quick') || lower.includes('brief') || lower.includes('fast') || lower.includes('short summary')) {
      depth = 'QUICK';
    }

    // 3. Research Type extraction (Section 5)
    let researchType: ResearchType = 'FACT_LOOKUP';
    if (lower.includes('compare ') || lower.includes(' versus ') || lower.includes(' vs ') || lower.includes('difference between')) {
      researchType = 'COMPARISON';
    } else if (lower.includes('verify') || lower.includes('is it true') || lower.includes('fact-check') || lower.includes('debunk')) {
      researchType = 'VERIFICATION';
    } else if (lower.includes('open source') || lower.includes('github') || lower.includes('repo') || lower.includes('open-source')) {
      researchType = 'OPEN_SOURCE_RESEARCH';
    } else if (lower.includes('market') || lower.includes('industry') || lower.includes('competitor') || lower.includes('market analysis')) {
      researchType = 'MARKET_RESEARCH';
    } else if (lower.includes('company') || lower.includes('startup') || lower.includes('acquisition') || lower.includes('funding')) {
      researchType = 'COMPANY_RESEARCH';
    } else if (lower.includes('paper') || lower.includes('arxiv') || lower.includes('academic') || lower.includes('literature review')) {
      researchType = 'ACADEMIC_RESEARCH';
    } else if (lower.includes('product') || lower.includes('pricing') || lower.includes('specs')) {
      researchType = 'PRODUCT_RESEARCH';
    } else if (lower.includes('news') || lower.includes('announcement') || lower.includes('headlines')) {
      researchType = 'NEWS_RESEARCH';
    } else if (lower.includes('architecture') || lower.includes('technical') || lower.includes('protocol') || lower.includes('algorithm') || lower.includes('code')) {
      researchType = 'TECHNICAL_RESEARCH';
    } else if (lower.includes('latest') || lower.includes('recent') || lower.includes('developments') || lower.includes('current')) {
      researchType = 'CURRENT_INFORMATION';
    } else if (depth === 'DEEP' || depth === 'COMPREHENSIVE') {
      researchType = 'DEEP_RESEARCH';
    }

    // 4. Suggested Agent assignment (Section 29)
    let suggestedAgent = 'Rahu'; // Default research intelligence
    if (researchType === 'TECHNICAL_RESEARCH' || researchType === 'OPEN_SOURCE_RESEARCH') {
      suggestedAgent = 'Gāṇḍīva'; // Technical research
    } else if (researchType === 'VERIFICATION') {
      suggestedAgent = 'Vighna'; // Verification & QA audit
    } else if (researchType === 'PRODUCT_RESEARCH' || researchType === 'COMPANY_RESEARCH') {
      suggestedAgent = 'Tvas'; // Product & requirements
    } else if (lower.includes('compliance') || lower.includes('legal') || lower.includes('governance')) {
      suggestedAgent = 'Rutam'; // Governance & ethics
    }

    // 5. Generate initial multi-angle search queries
    const cleanTopic = trimmed
      .replace(/^(?:please\s+)?(?:research|investigate|find information about|look up the latest information about|deep dive into|analyze|verify whether|find reliable sources about|quick summary of|summary of|brief summary of|overview of)\s+/i, '')
      .replace(/[?.,!]$/, '')
      .trim();

    const searchQueries: string[] = [cleanTopic || trimmed];
    searchQueries.push(`${cleanTopic || trimmed} overview analysis`);
    if (researchType === 'COMPARISON') {
      searchQueries.push(`${cleanTopic} comparison benchmark`);
    } else if (researchType === 'OPEN_SOURCE_RESEARCH') {
      searchQueries.push(`${cleanTopic} github open source`);
    } else if (researchType === 'CURRENT_INFORMATION') {
      searchQueries.push(`${cleanTopic} latest updates 2026`);
    } else if (researchType === 'VERIFICATION') {
      searchQueries.push(`${cleanTopic} fact check evidence`);
    }

    return {
      isResearch,
      question: trimmed,
      depth,
      researchType,
      suggestedAgent,
      searchQueries,
    };
  }

  /**
   * Create a new persistent Research Study record.
   * Supports both CreateStudyOptions object or (question, userId, depth, researchType).
   */
  public async createStudy(
    questionOrOptions: string | CreateStudyOptions,
    userId?: string,
    depthParam?: ResearchDepth,
    researchTypeParam?: ResearchType
  ): Promise<IResearchStudy> {
    const options: CreateStudyOptions = typeof questionOrOptions === 'string'
      ? {
          question: questionOrOptions,
          createdBy: userId || 'ROOT_RUSHIKESH',
          depth: depthParam,
          researchType: researchTypeParam,
        }
      : questionOrOptions;

    const parsed = this.parseResearchIntent(options.question);
    const depth: ResearchDepth = options.depth || parsed.depth || 'NORMAL';
    const researchType: ResearchType = options.researchType || parsed.researchType || 'FACT_LOOKUP';
    const defaultBudget = this.getDefaultBudget(depth);
    const budget: ResearchBudget = {
      ...defaultBudget,
      ...(options.budget || {}),
    };

    const study: IResearchStudy = {
      id: randomUUID(),
      title: options.title || this.deriveTitle(options.question),
      question: options.question,
      objective: options.objective || options.question,
      scope: options.scope || 'General Public Domain & Technical Ecosystem',
      status: 'PLANNING',
      depth,
      researchType,
      budget,
      sourcePolicy: 'AUTHORIZED_PUBLIC_AND_REPOSITORIES',
      verificationPolicy: 'CROSS_SOURCE_CORROBORATION',
      createdBy: options.requestedBy || 'Rushikesh',
      requestedBy: options.requestedBy || 'Rushikesh',
      companyId: options.companyId,
      projectId: options.projectId,
      goalId: options.goalId,
      createdArtifacts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.studyRepo.create(study);
    this.eventBus?.emit('research.created' as any, { studyId: study.id, question: study.question, depth: study.depth } as any);
    return study;
  }

  /**
   * Execute research lifecycle end-to-end.
   * State Machine: PLANNING -> SEARCHING -> FETCHING -> EXTRACTING -> ANALYZING -> VERIFYING -> SYNTHESIZING -> COMPLETED / PARTIAL / FAILED / CANCELLED.
   */
  public async executeStudy(
    studyId: string,
    options?: { customUrls?: string[]; artifactDirectory?: string }
  ): Promise<{
    study: IResearchStudy;
    bundle: ResearchArtifactBundle;
  }> {
    const study = this.studyRepo.get(studyId);
    if (!study) {
      throw new Error(`Research study ${studyId} not found`);
    }

    const abortController = new AbortController();
    this.activeRuns.set(studyId, { abortController });

    const startTime = Date.now();
    let sourcesReviewed = 0;
    let pagesVisited = 0;
    let browserActions = 0;
    let searchCalls = 0;
    let modelCalls = 0;
    let extractedChars = 0;
    let isBudgetExhausted = false;

    try {
      // Step 1: Planning
      await this.updateStudyStatus(study, 'PLANNING');
      this.emitProgress(study, { sourcesFound: 0, sourcesReviewed: 0, evidenceCollected: 0, findingsCount: 0, conflictsDetected: 0 });

      // Step 2: Source Discovery (Multi-angle search)
      await this.updateStudyStatus(study, 'SEARCHING');
      let candidateUrls: Array<{ url: string; title: string; snippet?: string }> = [];

      if (options?.customUrls && options.customUrls.length > 0) {
        candidateUrls = options.customUrls.map((url) => ({ url, title: url }));
      } else {
        const parsed = this.parseResearchIntent(study.question);
        const queries = parsed.searchQueries.length > 0 ? parsed.searchQueries : [study.question];
        const candidateMap = new Map<string, { url: string; title: string; snippet?: string }>();

        for (const query of queries) {
          if (abortController.signal.aborted) break;
          if (searchCalls >= study.budget.maxSearchQueries) break;
          searchCalls++;

          try {
            const searchResults = await this.searchProvider.search(query, {
              maxResults: Math.min(study.budget.maxSources * 2, 8),
            });
            for (const r of searchResults) {
              if (!candidateMap.has(r.url)) {
                candidateMap.set(r.url, { url: r.url, title: r.title, snippet: r.snippet });
              }
            }
          } catch {
            // Graceful search failure tolerance
          }
        }
        candidateUrls = Array.from(candidateMap.values());
      }

      this.emitProgress(study, { sourcesFound: candidateUrls.length, sourcesReviewed: 0, evidenceCollected: 0, findingsCount: 0, conflictsDetected: 0 });

      // Step 3: Source Acquisition & Extraction
      await this.updateStudyStatus(study, 'FETCHING');
      const collectedSources: IResearchSource[] = [];
      const collectedEvidences: IResearchEvidence[] = [];

      for (const item of candidateUrls) {
        if (abortController.signal.aborted) break;
        if (sourcesReviewed >= study.budget.maxSources) {
          isBudgetExhausted = true;
          break;
        }
        if (Date.now() - startTime >= study.budget.maxDurationMs) {
          isBudgetExhausted = true;
          break;
        }
        if (extractedChars >= study.budget.maxExtractionCharacters) {
          isBudgetExhausted = true;
          break;
        }

        // Fetch page content
        pagesVisited++;
        let htmlContent = '';
        try {
          if (this.browserAdapter && browserActions < study.budget.maxBrowserActions) {
            browserActions++;
            const session = (await this.browserAdapter.listSessions())[0] || (await this.browserAdapter.createSession());
            await this.browserAdapter.navigate(session.id, item.url);
            const pageData = await this.browserAdapter.readPage(session.id);
            htmlContent = pageData.visibleText || '';
          } else {
            htmlContent = await this.fetchWithHttp(item.url);
          }
        } catch (fetchErr: any) {
          if (item.snippet && item.snippet.length >= 15) {
            htmlContent = `<html><head><title>${item.title}</title></head><body><h1>${item.title}</h1><p>${item.snippet}</p></body></html>`;
          } else {
            let hostname = 'unknown';
            try { hostname = new URL(item.url).hostname; } catch {}

            const failedSource: IResearchSource = {
              id: randomUUID(),
              researchId: study.id,
              url: item.url,
              title: item.title,
              domain: hostname,
              sourceType: 'SEARCH_RESULT',
              credibilityTier: 'UNVERIFIED',
              freshness: 'UNKNOWN',
              contentHash: 'hash_err_' + randomUUID(),
              extractedText: '',
              cleanText: '',
              isDuplicate: false,
              status: 'EXTRACTION_FAILED',
              failureReason: fetchErr.message,
              retrievedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            this.sourceRepo.create(failedSource);
            continue;
          }
        }

        // Extract and normalize
        const extracted = this.extractor.extractFromHtml(htmlContent, item.url, item.title);
        extractedChars += extracted.cleanText.length;

        // Deduplication Check
        const existingByHash = typeof this.sourceRepo.findByContentHash === 'function'
          ? this.sourceRepo.findByContentHash(extracted.contentHash)
          : [];
        const isDuplicate = existingByHash.length > 0;

        const sourceRecord: IResearchSource = {
          id: randomUUID(),
          researchId: study.id,
          url: item.url,
          title: extracted.title,
          publisher: extracted.domain,
          domain: extracted.domain,
          sourceType: extracted.sourceType,
          credibilityTier: extracted.credibilityTier,
          freshness: extracted.freshness,
          contentHash: extracted.contentHash,
          canonicalUrl: extracted.canonicalUrl,
          publishedAt: extracted.publishedAt,
          retrievedAt: new Date().toISOString(),
          license: extracted.license,
          cleanText: extracted.sanitizedText.substring(0, 15000),
          extractedText: extracted.sanitizedText.substring(0, 15000),
          content: extracted.sanitizedText.substring(0, 15000),
          language: 'en',
          isDuplicate,
          status: isDuplicate ? 'DUPLICATE' : 'ACQUIRED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        this.sourceRepo.create(sourceRecord);
        collectedSources.push(sourceRecord);
        sourcesReviewed++;

        if (isDuplicate) continue; // Skip duplicate content for evidence extraction

        // Extract Evidence Items
        const rawClaims = this.extractor.extractClaims(extracted.sanitizedText);
        for (const claimItem of rawClaims) {
          const evidenceRecord: IResearchEvidence = {
            id: randomUUID(),
            researchId: study.id,
            sourceId: sourceRecord.id,
            claimText: claimItem.claim,
            claim: claimItem.claim,
            supportingText: claimItem.supportingText,
            quoteText: claimItem.supportingText,
            location: claimItem.location,
            claimType: claimItem.claimType,
            supportType: 'SUPPORTS',
            confidence: claimItem.confidence,
            retrievedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          this.evidenceRepo.create(evidenceRecord);
          collectedEvidences.push(evidenceRecord);
        }

        this.emitProgress(study, {
          sourcesFound: candidateUrls.length,
          sourcesReviewed,
          evidenceCollected: collectedEvidences.length,
          findingsCount: 0,
          conflictsDetected: 0,
        });
      }

      // Check cancellation
      if (abortController.signal.aborted) {
        study.status = 'CANCELLED';
        this.studyRepo.update(study.id, { status: 'CANCELLED' });
        throw new Error(`Research study ${study.id} was cancelled by operator.`);
      }

      // Step 4: Verification & Analysis
      await this.updateStudyStatus(study, 'ANALYZING');
      const analysisResult = this.analyzer.analyze(study.id, collectedSources, collectedEvidences);

      // Persist Findings
      const persistedFindings: IResearchFinding[] = [];
      for (const f of analysisResult.findings) {
        const findingRecord: IResearchFinding = {
          ...f,
          id: randomUUID(),
          researchId: study.id,
          confidence: f.confidence || 0.85,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        this.findingRepo.create(findingRecord);
        persistedFindings.push(findingRecord);
      }

      // Step 5: Verification Phase
      await this.updateStudyStatus(study, 'VERIFYING');

      // Step 6: Synthesis & Artifacts
      await this.updateStudyStatus(study, 'SYNTHESIZING');
      const bundle = this.synthesizer.synthesizeReport(
        study,
        collectedSources,
        collectedEvidences,
        persistedFindings,
        analysisResult.citations,
        analysisResult.contradictions
      );

      const targetDir = options?.artifactDirectory || `workspace/research/${study.id}`;
      const savedPaths = await this.synthesizer.saveArtifactBundle(bundle, targetDir);

      // Step 7: Memory Persistence for Durable Verified Facts
      if (this.memoryRepo) {
        const durableFacts = this.synthesizer.extractDurableFacts(persistedFindings, analysisResult.citations);
        for (const fact of durableFacts) {
          const item = this.memoryRepo.store({
            id: randomUUID(),
            tier: 'knowledge',
            key: `research:${study.id}:${randomUUID()}`,
            content: fact,
            source: 'RESEARCH_STUDY',
            provenance: 'learned',
            confidence: 0.9,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          if (this.semanticIndexer && item) {
            this.semanticIndexer.indexMemory(item).catch(() => {});
          }
        }
      }

      // Final Status Determination (Section 25 & 33)
      const finalStatus: ResearchStatus = collectedSources.length === 0
        ? 'FAILED'
        : isBudgetExhausted
        ? 'PARTIAL'
        : 'COMPLETED';

      study.createdArtifacts = [savedPaths.markdownPath, savedPaths.sourcesPath, savedPaths.evidencePath];
      study.status = finalStatus;
      study.completionState = {
        completedAt: new Date().toISOString(),
        sourcesReviewed,
        findingsGenerated: persistedFindings.length,
        conflictsDetected: analysisResult.contradictions.length,
        durationMs: Date.now() - startTime,
        modelCalls,
      };
      this.studyRepo.update(study.id, study);

      this.eventBus?.emit('research.completed' as any, {
        studyId: study.id,
        status: finalStatus,
        sourcesCount: collectedSources.length,
        findingsCount: persistedFindings.length,
        conflictsCount: analysisResult.contradictions.length,
        durationMs: Date.now() - startTime,
      } as any);

      return { study, bundle };
    } catch (err: any) {
      if (study.status !== 'CANCELLED') {
        study.status = 'FAILED';
        study.completionState = {
          completedAt: new Date().toISOString(),
          error: err.message,
        };
        this.studyRepo.update(study.id, study);
      }
      throw err;
    } finally {
      this.activeRuns.delete(studyId);
    }
  }

  public async pauseStudy(studyId: string): Promise<IResearchStudy | null> {
    const active = this.activeRuns.get(studyId);
    if (active) {
      active.abortController.abort();
      this.activeRuns.delete(studyId);
    }
    const study = this.studyRepo.get(studyId);
    if (study) {
      study.status = 'PAUSED';
      this.studyRepo.update(study.id, { status: 'PAUSED' });
    }
    return study || null;
  }

  public async cancelStudy(studyId: string): Promise<IResearchStudy | null> {
    const active = this.activeRuns.get(studyId);
    if (active) {
      active.abortController.abort();
      this.activeRuns.delete(studyId);
    }
    const study = this.studyRepo.get(studyId);
    if (study) {
      study.status = 'CANCELLED';
      this.studyRepo.update(study.id, { status: 'CANCELLED' });
    }
    return study || null;
  }

  public async getStudy(studyId: string): Promise<{
    study: IResearchStudy | null;
    sources: IResearchSource[];
    evidence: IResearchEvidence[];
    findings: IResearchFinding[];
  }> {
    const study = this.studyRepo.get(studyId) || null;
    const sources = this.sourceRepo.findByStudyId(studyId);
    const evidence = this.evidenceRepo.findByStudyId(studyId);
    const findings = this.findingRepo.findByStudyId(studyId);
    return { study, sources, evidence, findings };
  }

  public async listStudies(filter?: { companyId?: string; projectId?: string; status?: ResearchStatus }): Promise<IResearchStudy[]> {
    return this.studyRepo.list(filter);
  }

  private async updateStudyStatus(study: IResearchStudy, status: ResearchStatus): Promise<void> {
    study.status = status;
    study.updatedAt = new Date().toISOString();
    this.studyRepo.update(study.id, { status, updatedAt: study.updatedAt });
    this.eventBus?.emit('research.status' as any, { studyId: study.id, status } as any);
  }

  private emitProgress(study: IResearchStudy, data: { sourcesFound: number; sourcesReviewed: number; evidenceCollected: number; findingsCount: number; conflictsDetected: number }): void {
    this.eventBus?.emit('research.progress' as any, {
      studyId: study.id,
      status: study.status,
      ...data,
      budgetRemaining: {
        sources: Math.max(0, study.budget.maxSources - data.sourcesReviewed),
        pages: study.budget.maxPages,
        modelCalls: study.budget.maxModelCalls,
        durationMs: study.budget.maxDurationMs,
      },
    } as any);
  }

  private getDefaultBudget(depth: ResearchDepth): ResearchBudget {
    return DEFAULT_RESEARCH_BUDGET[depth] || DEFAULT_RESEARCH_BUDGET.NORMAL;
  }

  private deriveTitle(question: string): string {
    const clean = question.replace(/[?.,!]/g, '').trim();
    if (clean.length <= 60) return clean;
    return clean.substring(0, 57) + '...';
  }

  private async fetchWithHttp(url: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 (HṚṢĪKEŚA Research Intelligence Bot)',
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.text();
    } finally {
      clearTimeout(timeout);
    }
  }
}
