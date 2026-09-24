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
  ResearchBudget,
  ResearchArtifactBundle,
  ISearchProvider,
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
import { randomUUID } from 'node:crypto';

export interface CreateStudyOptions {
  title?: string;
  question: string;
  objective?: string;
  scope?: string;
  depth?: ResearchDepth;
  budget?: Partial<ResearchBudget>;
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

  constructor(
    private studyRepo: ResearchRepository,
    private sourceRepo: ResearchSourceRepository,
    private evidenceRepo: ResearchEvidenceRepository,
    private findingRepo: ResearchFindingRepository,
    private memoryRepo?: MemoryRepository,
    private semanticIndexer?: SemanticMemoryIndexer,
    private browserAdapter?: IBrowserAdapter,
    searchProvider?: ISearchProvider
  ) {
    this.searchProvider = searchProvider || new DuckDuckGoSearchProvider();
    this.extractor = new SourceExtractor();
    this.analyzer = new CrossSourceAnalyzer();
    this.synthesizer = new ResearchSynthesizer();
  }

  public setSearchProvider(provider: ISearchProvider): void {
    this.searchProvider = provider;
  }

  /**
   * Parse natural language prompt to determine if it is a research intent.
   */
  public parseResearchIntent(prompt: string): {
    isResearch: boolean;
    question: string;
    depth: ResearchDepth;
    suggestedAgent: string;
  } {
    const lower = prompt.toLowerCase();
    const researchKeywords = [
      'research',
      'investigate',
      'investigation',
      'compare',
      'comparison',
      'find out',
      'study',
      'market analysis',
      'competitive analysis',
      'evidence for',
      'benchmark',
      'look up',
      'summary',
      'summarize',
      'overview',
      'features',
      'tell me about',
    ];

    const isResearch = researchKeywords.some((kw) => lower.includes(kw));
    let depth: ResearchDepth = 'STANDARD';

    if (lower.includes('quick') || lower.includes('brief') || lower.includes('summary')) {
      depth = 'QUICK';
    } else if (lower.includes('deep') || lower.includes('comprehensive') || lower.includes('thorough') || lower.includes('in-depth')) {
      depth = 'DEEP';
    }

    // Default agent assignment
    let suggestedAgent = 'Rahu'; // Primary research intelligence agent
    if (lower.includes('code') || lower.includes('repo') || lower.includes('github') || lower.includes('architecture')) {
      suggestedAgent = 'Gāṇḍīva';
    } else if (lower.includes('verify') || lower.includes('audit') || lower.includes('fact-check')) {
      suggestedAgent = 'Vighna';
    }

    return {
      isResearch,
      question: prompt.trim(),
      depth,
      suggestedAgent,
    };
  }

  /**
   * Create a new persistent Research Study record.
   */
  public async createStudy(options: CreateStudyOptions): Promise<IResearchStudy> {
    const depth: ResearchDepth = options.depth || 'STANDARD';
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
    return study;
  }

  /**
   * Execute research lifecycle end-to-end.
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
    let browserActions = 0;

    try {
      // Step 1: Planning
      await this.updateStudyStatus(study, 'RESEARCHING');

      // Step 2: Source Discovery
      let candidateUrls: Array<{ url: string; title: string; snippet?: string }> = [];

      if (options?.customUrls && options.customUrls.length > 0) {
        candidateUrls = options.customUrls.map((url) => ({ url, title: url }));
      } else {
        const searchResults = await this.searchProvider.search(study.question, {
          maxResults: study.budget.maxSources * 2,
        });
        candidateUrls = searchResults.map((r) => ({
          url: r.url,
          title: r.title,
          snippet: r.snippet,
        }));
      }

      // Step 3: Source Acquisition & Extraction
      const collectedSources: IResearchSource[] = [];
      const collectedEvidences: IResearchEvidence[] = [];

      for (const item of candidateUrls) {
        if (abortController.signal.aborted) break;
        if (sourcesReviewed >= study.budget.maxSources) break;
        if (Date.now() - startTime >= study.budget.maxDurationMs) break;

        // Fetch page content
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
          // If fetch fails, record source as extraction failure and proceed
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

        // Extract and normalize
        const extracted = this.extractor.extractFromHtml(htmlContent, item.url, item.title);

        // Deduplication Check
        const existingByHash = this.sourceRepo.findByContentHash(extracted.contentHash);
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
          cleanText: extracted.sanitizedText.substring(0, 15000), // Bounded slice
          extractedText: extracted.sanitizedText.substring(0, 15000),
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
            confidence: claimItem.confidence,
            retrievedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          this.evidenceRepo.create(evidenceRecord);
          collectedEvidences.push(evidenceRecord);
        }
      }

      // Step 4: Verification & Analysis
      await this.updateStudyStatus(study, 'VERIFYING');

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

      // Step 5: Synthesis & Artifacts
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

      // Step 6: Memory Persistence
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

      // Complete Study
      study.createdArtifacts = [savedPaths.markdownPath, savedPaths.sourcesPath, savedPaths.evidencePath];
      study.status = 'COMPLETED';
      study.completionState = {
        completedAt: new Date().toISOString(),
        sourcesReviewed,
        findingsGenerated: persistedFindings.length,
        conflictsDetected: analysisResult.contradictions.length,
        durationMs: Date.now() - startTime,
      };
      this.studyRepo.update(study.id, study);

      return { study, bundle };
    } catch (err: any) {
      study.status = 'FAILED';
      study.completionState = {
        completedAt: new Date().toISOString(),
        error: err.message,
      };
      this.studyRepo.update(study.id, study);
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
  }

  private getDefaultBudget(depth: ResearchDepth): ResearchBudget {
    switch (depth) {
      case 'QUICK':
        return {
          maxSources: 5,
          maxPages: 8,
          maxBrowserActions: 5,
          maxModelCalls: 5,
          maxDurationMs: 60000,
          maxDepth: 1,
        };
      case 'DEEP':
        return {
          maxSources: 25,
          maxPages: 40,
          maxBrowserActions: 25,
          maxModelCalls: 30,
          maxDurationMs: 600000,
          maxDepth: 3,
        };
      case 'STANDARD':
      default:
        return {
          maxSources: 12,
          maxPages: 20,
          maxBrowserActions: 15,
          maxModelCalls: 15,
          maxDurationMs: 180000,
          maxDepth: 2,
        };
    }
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
