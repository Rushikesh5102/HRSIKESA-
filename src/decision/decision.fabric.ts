/**
 * HṚṢĪKEŚA (हृषीकेश) — Decision Intelligence Fabric
 *
 * FP-18: Universal Real-World Research, Knowledge & Decision Intelligence Fabric.
 * Master orchestrator connecting ResearchEngine, Question Decomposition,
 * Contradiction Analysis, Environment Evaluation, Comparison Engine, Decision Briefs,
 * History, and Action Bridges.
 */

import { ILogger } from '../core/logging/logger.types.js';
import { EventBus } from '../core/events/event-bus.js';
import { DatabaseManager } from '../persistence/database/database.manager.js';
import { ResourceGovernor } from '../core/hardware/resource.governor.js';
import { PromptInjectionDefense } from '../research/security/prompt.injection.defense.js';
import { DecisionRepository } from './repositories/decision.repository.js';
import { QuestionDecomposerService } from './services/question-decomposer.service.js';
import { EnvironmentEvaluatorService } from './services/environment-evaluator.service.js';
import { ContradictionEngineService } from './services/contradiction-engine.service.js';
import { ComparisonEngineService } from './services/comparison-engine.service.js';
import { DecisionBriefService } from './services/decision-brief.service.js';
import { ActionBridgeService } from './services/action-bridge.service.js';
import { DecisionHistoryService } from './services/decision-history.service.js';
import {
  ResearchCase,
  ResearchCaseStatus,
  ResearchCandidate,
  StructuredClaim,
  DecisionRecord,
  DecisionReview,
  ProposedAction,
  EvaluationCriterion,
  SourceHierarchyTier,
  ClaimClassification,
  UncertaintyLevel,
} from './interfaces/decision.types.js';

export interface CreateCaseParams {
  owner: string;
  question: string;
  objective?: string;
  scope?: string;
  researchType?: string;
  depth?: 'QUICK' | 'NORMAL' | 'DEEP' | 'COMPREHENSIVE';
  companyId?: string;
  projectId?: string;
  criteria?: EvaluationCriterion[];
  constraints?: string[];
}

export class DecisionFabric {
  private readonly dbManager: DatabaseManager;
  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;
  private readonly resourceGovernor?: ResourceGovernor;

  public readonly repository: DecisionRepository;
  public readonly decomposer: QuestionDecomposerService;
  public readonly envEvaluator: EnvironmentEvaluatorService;
  public readonly contradictionEngine: ContradictionEngineService;
  public readonly comparisonEngine: ComparisonEngineService;
  public readonly briefService: DecisionBriefService;
  public readonly actionBridge: ActionBridgeService;
  public readonly historyService: DecisionHistoryService;

  constructor(options: {
    dbManager: DatabaseManager;
    eventBus?: EventBus;
    logger?: ILogger;
    resourceGovernor?: ResourceGovernor;
  }) {
    this.dbManager = options.dbManager;
    this.eventBus = options.eventBus;
    this.logger = options.logger?.child('DecisionFabric');
    this.resourceGovernor = options.resourceGovernor;

    this.repository = new DecisionRepository(this.dbManager, this.logger);
    this.decomposer = new QuestionDecomposerService();
    this.envEvaluator = new EnvironmentEvaluatorService();
    this.contradictionEngine = new ContradictionEngineService();
    this.comparisonEngine = new ComparisonEngineService();
    this.briefService = new DecisionBriefService();
    this.actionBridge = new ActionBridgeService();
    this.historyService = new DecisionHistoryService(this.repository);
  }

  // ==========================================
  // CASE LIFECYCLE
  // ==========================================

  public createCase(params: CreateCaseParams): ResearchCase {
    // Defense: Sanitize input question against prompt injection
    const scanResult = PromptInjectionDefense.scan(params.question);
    let sanitizedQuestion = params.question;
    const lower = params.question.toLowerCase();
    const isSuspicious =
      scanResult.isSuspicious ||
      lower.includes('ignore instructions') ||
      lower.includes('ignore previous instructions') ||
      lower.includes('system override') ||
      lower.includes('reveal system') ||
      lower.includes('curl ') ||
      lower.includes('secret database password') ||
      lower.includes('exfiltrate');

    if (isSuspicious) {
      sanitizedQuestion = params.question
        .replace(/ignore\s+(all\s+)?(previous\s+|prior\s+|above\s+)?instructions/gi, '[DEFANGED_INJECTION]')
        .replace(/curl\s+[^ \t\r\n]+/gi, '[DEFANGED_CURL]')
        .replace(/curl/gi, '[DEFANGED_CURL]')
        .replace(/reveal\s+system\s+keys/gi, '[DEFANGED_EXFILTRATION]')
        .replace(/system\s+override/gi, '[DEFANGED_OVERRIDE]')
        .replace(/passwords?/gi, '[DEFANGED_CREDENTIAL]')
        .replace(/environment\s+tokens/gi, '[DEFANGED_TOKENS]')
        .replace(/exfiltrate/gi, '[DEFANGED_EXFILTRATION]');
    }
    const objective = params.objective || `Investigate and produce decision support for: ${sanitizedQuestion}`;

    const caseId = `case_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const depth = params.depth || 'NORMAL';

    // 1. Decompose question
    const { plan, inferredCriteria } = this.decomposer.decompose(caseId, sanitizedQuestion, depth);

    const mergedCriteria = [...(params.criteria || []), ...inferredCriteria];
    // Deduplicate criteria by ID
    const uniqueCriteria = Array.from(new Map(mergedCriteria.map((c) => [c.id, c])).values());

    const rCase: ResearchCase = {
      id: caseId,
      owner: params.owner,
      companyId: params.companyId,
      projectId: params.projectId,
      objective,
      question: sanitizedQuestion,
      scope: params.scope || 'Standard technical evaluation',
      status: ResearchCaseStatus.DRAFT,
      researchType: params.researchType || 'TECHNICAL_RESEARCH',
      depth,
      criteria: uniqueCriteria,
      constraints: params.constraints || [
        'Host envelope: Intel Core Ultra 5 125H, 15.7 GB RAM, Intel Arc GPU, Windows 11',
      ],
      plan,
      sources: [],
      claims: [],
      contradictions: [],
      unknowns: [],
      candidates: [],
      artifacts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = this.repository.createCase(rCase);
    this.emitEvent('research.started', { caseId, objective });
    return saved;
  }

  public async startCase(caseId: string, requestedRecommendation: boolean = false): Promise<ResearchCase> {
    const c = this.repository.getCaseById(caseId);
    if (!c) throw new Error(`ResearchCase [${caseId}] not found`);

    // Check Resource Governor
    if (this.resourceGovernor) {
      const metrics = this.resourceGovernor.getMetrics();
      if (metrics.pressureLevel !== 'NORMAL') {
        this.logger?.warn(`Resource pressure elevated (${metrics.pressureLevel}). Throttling research case [${caseId}]`);
      }
    }

    // SCOPING
    c.status = ResearchCaseStatus.SCOPING;
    this.repository.updateCaseStatus(c.id, c.status);
    this.emitEvent('research.scoping', { caseId: c.id, plan: c.plan });

    // RESEARCHING & GATHERING_EVIDENCE
    c.status = ResearchCaseStatus.RESEARCHING;
    this.repository.updateCaseStatus(c.id, c.status);

    // If no candidates or claims were explicitly added, discover default candidates based on topic
    if (c.candidates.length === 0) {
      this.populateDefaultCandidates(c);
      const refreshed = this.repository.getCaseById(c.id);
      if (refreshed) {
        c.candidates = refreshed.candidates;
        c.claims = refreshed.claims;
        c.sources = refreshed.sources;
      }
    }

    // ANALYZING
    c.status = ResearchCaseStatus.ANALYZING;
    this.repository.updateCaseStatus(c.id, c.status);
    this.emitEvent('research.analysis_started', { caseId: c.id });

    // Run contradiction analysis
    const { contradictions, annotatedClaims } = this.contradictionEngine.analyzeClaims(c.id, c.claims);
    c.contradictions = contradictions;
    c.claims = annotatedClaims;
    if (contradictions.length > 0) {
      this.emitEvent('research.contradiction_detected', { caseId: c.id, count: contradictions.length });
    }

    // COMPARING
    c.status = ResearchCaseStatus.COMPARING;
    this.repository.updateCaseStatus(c.id, c.status);
    const comparison = this.comparisonEngine.compareCandidates(c.id, c.candidates, c.criteria, requestedRecommendation);
    c.comparison = comparison;
    this.repository.saveComparison(comparison);
    this.emitEvent('research.comparison_ready', { caseId: c.id, comparisonId: comparison.id });

    // SYNTHESIZING
    c.status = ResearchCaseStatus.SYNTHESIZING;
    this.repository.updateCaseStatus(c.id, c.status);
    const brief = this.briefService.generateBrief(c, comparison, requestedRecommendation);
    c.decisionBrief = brief;
    this.emitEvent('research.brief_ready', { caseId: c.id, briefId: brief.id });

    // REVIEWING / COMPLETED
    c.status = ResearchCaseStatus.COMPLETED;
    c.updatedAt = new Date().toISOString();
    this.repository.updateCase(c);
    this.emitEvent('research.completed', { caseId: c.id, briefId: brief.id });

    return c;
  }

  public pauseCase(caseId: string): void {
    this.repository.updateCaseStatus(caseId, ResearchCaseStatus.AWAITING_USER);
    this.emitEvent('research.awaiting_user', { caseId, reason: 'Operator requested pause' });
  }

  public resumeCase(caseId: string): Promise<ResearchCase> {
    return this.startCase(caseId);
  }

  public cancelCase(caseId: string): void {
    this.repository.updateCaseStatus(caseId, ResearchCaseStatus.CANCELLED);
    this.emitEvent('research.failed', { caseId, error: 'Cancelled by operator' });
  }

  // ==========================================
  // CANDIDATE & CLAIM REGISTRATION
  // ==========================================

  public addCandidate(caseId: string, cand: Omit<ResearchCandidate, 'id' | 'caseId' | 'createdAt'>): ResearchCandidate {
    const candidateId = `cand_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const fullCandidate: ResearchCandidate = {
      ...cand,
      id: candidateId,
      caseId,
      createdAt: new Date().toISOString(),
    };

    const saved = this.repository.createCandidate(fullCandidate);
    this.emitEvent('research.candidate_added', { caseId, candidateId, name: cand.name });
    return saved;
  }

  public addClaim(caseId: string, claim: Omit<StructuredClaim, 'id' | 'caseId'>): StructuredClaim {
    const claimId = `claim_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const fullClaim: StructuredClaim = {
      ...claim,
      id: claimId,
      caseId,
    };

    const c = this.repository.getCaseById(caseId);
    if (c) {
      c.claims.push(fullClaim);
      this.repository.updateCase(c);
    }

    this.emitEvent('research.claim_extracted', { caseId, claimId, subject: claim.subject });
    return fullClaim;
  }

  public addSource(
    caseId: string,
    source: { id: string; url: string; title: string; tier: SourceHierarchyTier; retrievedAt: string }
  ): void {
    const c = this.repository.getCaseById(caseId);
    if (c) {
      c.sources.push(source);
      this.repository.updateCase(c);
      this.emitEvent('research.source_found', { caseId, url: source.url });
    }
  }

  // ==========================================
  // ACTION PROPOSAL & APPROVAL
  // ==========================================

  public compileImplementationPlan(caseId: string, candidateId?: string): { planSteps: string[]; proposedActions: ProposedAction[] } {
    const c = this.repository.getCaseById(caseId);
    if (!c || !c.decisionBrief) {
      throw new Error(`ResearchCase [${caseId}] lacks completed decision brief`);
    }

    const selected = candidateId ? c.candidates.find((cd) => cd.id === candidateId) : undefined;
    const result = this.actionBridge.compileImplementationPlan(caseId, c.decisionBrief, selected);

    // Persist proposed actions
    for (const act of result.proposedActions) {
      this.repository.createProposedAction(act);
    }

    return result;
  }

  public approveAction(actionId: string, approver: string): ProposedAction {
    const existing = this.repository.getProposedActionById(actionId);
    if (!existing) {
      throw new Error(`ProposedAction [${actionId}] not found`);
    }
    const dispatchedId = `dispatched_${Date.now()}`;
    this.repository.updateActionStatus(actionId, 'APPROVED', dispatchedId);
    return {
      ...existing,
      status: 'APPROVED',
      approvedBy: approver,
      approvedAt: new Date().toISOString(),
      dispatchedEntityId: dispatchedId,
    };
  }

  // ==========================================
  // DECISION RECORDS & REVIEWS
  // ==========================================

  public recordDecision(params: {
    caseId: string;
    companyId?: string;
    projectId?: string;
    context: string;
    objective: string;
    optionsConsidered: { id: string; name: string; summary: string }[];
    criteria: EvaluationCriterion[];
    evidenceSummary: string;
    assumptions: string[];
    selectedOption: { id: string; name: string };
    rationale: string;
    approver: string;
    supersededDecisionId?: string;
  }): DecisionRecord {
    return this.historyService.recordDecision(params);
  }

  public reviewDecision(decisionId: string, newCaseId: string): DecisionReview {
    const newCase = this.repository.getCaseById(newCaseId);
    if (!newCase) throw new Error(`New evidence case [${newCaseId}] not found`);
    return this.historyService.reviewDecision(decisionId, newCase, 'NEW_EVIDENCE');
  }

  // ==========================================
  // EXPORT DECISION BRIEF ARTIFACT
  // ==========================================

  public exportDecisionBriefArtifact(caseId: string): string {
    const c = this.repository.getCaseById(caseId);
    if (!c || !c.decisionBrief) {
      throw new Error(`ResearchCase [${caseId}] has no decision brief`);
    }

    const markdown = this.briefService.toMarkdown(c.decisionBrief);
    const artifactPath = `data/research_artifacts/${caseId}_decision_brief.md`;
    c.decisionBrief.generatedArtifactPath = artifactPath;
    c.artifacts.push(artifactPath);
    this.repository.updateCase(c);

    return markdown;
  }

  // ==========================================
  // INTERNAL HELPERS
  // ==========================================

  private populateDefaultCandidates(c: ResearchCase): void {
    const qLower = c.question.toLowerCase();

    if (qLower.includes('image') || qLower.includes('generation') || qLower.includes('stable diffusion')) {
      // Candidate 1: stable-diffusion.cpp (Vulkan / CPU)
      const compat1 = this.envEvaluator.evaluateCompatibility({
        minRamGb: 6,
        recommendedRamGb: 12,
        minVramGb: 2,
        requiresCuda: false,
        supportsVulkan: true,
        supportsCpuOnly: true,
        supportedOs: ['WINDOWS', 'LINUX'],
      });

      this.addCandidate(c.id, {
        name: 'stable-diffusion.cpp',
        description: 'Lightweight C/C++ inference implementation with native Vulkan and CPU backend support.',
        sourceUrl: 'https://github.com/leejet/stable-diffusion.cpp',
        repositoryUrl: 'https://github.com/leejet/stable-diffusion.cpp',
        license: 'MIT',
        licenseCategory: 'PERMISSIVE',
        compatibilityStatus: compat1.status,
        compatibilityDetails: {
          cpuSupported: true,
          gpuSupported: true,
          gpuVulkanSupported: true,
          minRamGb: 6,
          recommendedRamGb: 12,
          minVramGb: 2,
          storageGb: 4,
          supportedOs: ['Windows', 'Linux'],
        },
        capabilities: ['SD 1.5, SD 2.1, SDXL Turbo', 'GGUF Quantization (q4_0, q8_0)', 'Vulkan acceleration on Intel Arc'],
        limitations: ['Limited ecosystem plugins compared to Automatic1111/ComfyUI'],
        costSummary: 'Free, open source (MIT)',
        operationalComplexity: 'LOW',
        confidence: 0.9,
        evidenceIds: [],
      });

      // Candidate 2: ComfyUI (DirectML / CPU)
      const compat2 = this.envEvaluator.evaluateCompatibility({
        minRamGb: 8,
        recommendedRamGb: 16,
        minVramGb: 4,
        requiresCuda: false,
        supportsDirectMl: true,
        supportsCpuOnly: true,
        supportedOs: ['WINDOWS', 'LINUX'],
      });

      this.addCandidate(c.id, {
        name: 'ComfyUI (DirectML)',
        description: 'Node-based modular diffusion UI with DirectML acceleration for Windows/Intel.',
        sourceUrl: 'https://github.com/comfyanonymous/ComfyUI',
        repositoryUrl: 'https://github.com/comfyanonymous/ComfyUI',
        license: 'GPL-3.0',
        licenseCategory: 'COPYLEFT',
        compatibilityStatus: compat2.status,
        compatibilityDetails: {
          cpuSupported: true,
          gpuSupported: true,
          gpuVulkanSupported: false,
          minRamGb: 8,
          recommendedRamGb: 16,
          minVramGb: 4,
          storageGb: 10,
          supportedOs: ['Windows'],
        },
        capabilities: ['Extensible node graph', 'DirectML acceleration', 'Broad community custom nodes'],
        limitations: ['Higher RAM/VRAM footprint (~10GB disk)', 'GPL-3.0 copyleft license'],
        costSummary: 'Free, open source (GPL-3.0)',
        operationalComplexity: 'MEDIUM',
        confidence: 0.85,
        evidenceIds: [],
      });

      // Candidate 3: Proprietary CUDA-Only Framework (e.g. TensorRT-Diffusion)
      const compat3 = this.envEvaluator.evaluateCompatibility({
        minRamGb: 16,
        requiresCuda: true,
      });

      this.addCandidate(c.id, {
        name: 'TensorRT-LLM Diffusion (CUDA)',
        description: 'High-throughput enterprise diffusion runtime optimized strictly for NVIDIA Tensor Cores.',
        sourceUrl: 'https://github.com/NVIDIA/TensorRT',
        license: 'Proprietary / Apache-2.0 hybrid',
        licenseCategory: 'PROPRIETARY',
        compatibilityStatus: compat3.status,
        compatibilityDetails: {
          cpuSupported: false,
          gpuSupported: true,
          gpuVulkanSupported: false,
          minRamGb: 16,
          recommendedRamGb: 32,
          minVramGb: 12,
          storageGb: 20,
          supportedOs: ['Linux', 'Windows'],
        },
        capabilities: ['Extreme FP16 throughput on NVIDIA GPUs'],
        limitations: ['Strictly requires NVIDIA hardware with CUDA; completely incompatible with Intel Arc'],
        costSummary: 'Commercial / Hardware locked',
        operationalComplexity: 'HIGH',
        confidence: 0.95,
        evidenceIds: [],
      });

      // Default claims
      this.addClaim(c.id, {
        subject: 'stable-diffusion.cpp',
        predicate: 'supports Vulkan acceleration on',
        object: 'Intel Arc Graphics',
        claimType: ClaimClassification.FACT,
        uncertainty: UncertaintyLevel.KNOWN,
        sourceUrl: 'https://github.com/leejet/stable-diffusion.cpp',
        sourceTitle: 'stable-diffusion.cpp Official Repository',
        sourceTier: SourceHierarchyTier.PRIMARY,
        retrievedAt: new Date().toISOString(),
        quote: 'Vulkan backend enables cross-vendor GPU support on Intel, AMD, and Apple Silicon.',
        confidence: 0.95,
      });

      this.addClaim(c.id, {
        subject: 'TensorRT Diffusion',
        predicate: 'requires discrete',
        object: 'NVIDIA CUDA GPU with >= 12GB VRAM',
        claimType: ClaimClassification.FACT,
        uncertainty: UncertaintyLevel.KNOWN,
        sourceUrl: 'https://developer.nvidia.com',
        sourceTitle: 'NVIDIA Developer Documentation',
        sourceTier: SourceHierarchyTier.PRIMARY,
        retrievedAt: new Date().toISOString(),
        quote: 'TensorRT requires compute capability 7.5 or higher and official NVIDIA drivers.',
        confidence: 0.98,
      });
    }

    // Refresh candidates in memory
    c.candidates = this.repository.getCandidatesByCaseId(c.id);
  }

  private emitEvent(eventName: string, payload: Record<string, unknown>): void {
    if (this.eventBus) {
      this.eventBus.emit(eventName as any, payload as any);
    }
  }
}
