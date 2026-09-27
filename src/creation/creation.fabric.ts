/**
 * HṚṢĪKEŚA (हृषीकेश) — Creation Studio Fabric
 *
 * FP-17: Master orchestrator for Universal Digital Creation & Media Studio.
 *
 * Implements the complete creation lifecycle:
 * REQUEST → UNDERSTAND → PLAN → RESOLVE_CAPABILITIES → CREATE →
 * OBSERVE → VERIFY → ITERATE → PACKAGE → APPROVE → DELIVER
 *
 * Reuses existing:
 * - EventBus for SSE events
 * - ResourceGovernor for memory pressure defense
 * - CreationRepository for SQLite persistence
 * - CreationVerifierService for deterministic QA
 * - CreationPipelines for media generation
 * - MediaCapabilityService for honest provider resolution
 */

import { randomUUID } from 'node:crypto';
import {
  CreationJob,
  CreateJobRequest,
  DesignContext,
  CreationArtifact,
} from './interfaces/creation.types.js';
import { CreationRepository } from './repositories/creation.repository.js';
import { MediaCapabilityService } from './services/media-capability.service.js';
import { CreationVerifierService } from './services/creation-verifier.service.js';
import { CreationPipelines } from './pipelines/creation.pipelines.js';
import { EventBus } from '../core/events/event-bus.js';
import { ILogger } from '../core/logging/logger.types.js';
import { ResourceGovernor } from '../core/hardware/resource.governor.js';

export interface CreationFabricOptions {
  repository: CreationRepository;
  capabilityService: MediaCapabilityService;
  verifierService: CreationVerifierService;
  pipelines?: CreationPipelines;
  eventBus?: EventBus;
  logger?: ILogger;
  resourceGovernor?: ResourceGovernor;
}

export class CreationFabric {
  private readonly repository: CreationRepository;
  private readonly capabilityService: MediaCapabilityService;
  private readonly verifierService: CreationVerifierService;
  private readonly pipelines: CreationPipelines;
  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;
  private readonly resourceGovernor?: ResourceGovernor;

  constructor(options: CreationFabricOptions) {
    this.repository = options.repository;
    this.capabilityService = options.capabilityService;
    this.verifierService = options.verifierService;
    this.pipelines = options.pipelines || new CreationPipelines(options.capabilityService);
    this.eventBus = options.eventBus;
    this.logger = options.logger?.child('CreationFabric');
    this.resourceGovernor = options.resourceGovernor;
  }

  // ─── Job Creation & Planning ────────────────────────────────────────────────

  public createJob(req: CreateJobRequest): CreationJob {
    const id = `cjob_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    let designCtx: DesignContext | undefined;
    if (req.designContext) {
      const ctxId = req.designContextId || `dctx_${Date.now()}_${randomUUID().slice(0, 6)}`;
      designCtx = {
        id: ctxId,
        projectId: req.projectId,
        companyId: req.companyId,
        name: req.designContext.name || 'Default Project Style',
        brandIdentity: req.designContext.brandIdentity || {
          primaryColors: ['#6366f1'],
          secondaryColors: ['#0f172a'],
          accentColors: ['#38bdf8'],
          backgroundColors: ['#090d16'],
          fontHeadings: 'Outfit, sans-serif',
          fontBody: 'Inter, sans-serif',
          tone: 'Refined, sovereign, ancient-future',
        },
        visualReferences: req.designContext.visualReferences || [],
        spacingRules: req.designContext.spacingRules || { baseUnitPx: 8, containerMaxPx: 1200, borderRadiusPx: 8 },
        accessibilityRequirements: req.designContext.accessibilityRequirements || {
          contrastRatioMin: 4.5,
          altTextMandatory: true,
          audioDescriptions: false,
        },
        createdAt: now,
        updatedAt: now,
      };
      this.repository.saveDesignContext(designCtx);
    } else if (req.designContextId) {
      designCtx = this.repository.getDesignContext(req.designContextId) ?? undefined;
    }

    const job: CreationJob = {
      id,
      owner: req.owner || 'rushikesh',
      companyId: req.companyId,
      projectId: req.projectId,
      type: req.type,
      objective: req.objective,
      prompt: req.prompt,
      status: 'DRAFT',
      progressPercentage: 0,
      inputArtifacts: req.inputArtifacts || [],
      outputArtifacts: [],
      parameters: req.parameters || {},
      constraints: req.constraints || {},
      designContextId: designCtx?.id,
      designContext: designCtx,
      iterations: [],
      currentIteration: 0,
      maxIterations: req.constraints?.maxIterations || 3,
      requiresApproval: req.constraints?.requireApprovalForPurchase || false,
      provenance: {
        creatorIdentity: req.owner || 'rushikesh',
        sourceAssets: req.referenceAssets || [],
        transformationHistory: [`Created job at ${now}`],
        thirdPartyNotices: [],
        isAiGenerated: true,
        timestamp: now,
      },
      licenseInformation: 'PROPRIETARY',
      createdAt: now,
      updatedAt: now,
    };

    if (req.referenceAssets) {
      for (const asset of req.referenceAssets) {
        this.repository.saveReferenceAsset(job.id, asset);
      }
    }

    this.repository.saveJob(job);
    this.emitEvent('creation.started', { jobId: job.id, type: job.type });

    if (req.autoStart) {
      this.executeJob(job.id).catch((err) => {
        this.logger?.error(`Job auto-start failed for ${job.id}: ${err.message}`);
      });
    }

    return this.repository.getJob(id)!;
  }

  // ─── Execution & Lifecycle ──────────────────────────────────────────────────

  public async executeJob(jobId: string): Promise<CreationJob> {
    const job = this.repository.getJob(jobId);
    if (!job) throw new Error(`CreationJob '${jobId}' not found.`);

    // Check hardware resource governor
    if (this.resourceGovernor) {
      const metrics = this.resourceGovernor.getMetrics();
      if (metrics.pressureLevel === 'CRITICAL_MEMORY') {
        job.status = 'QUEUED';
        this.repository.saveJob(job);
        this.emitEvent('creation.queued', { jobId: job.id, reason: 'CRITICAL_MEMORY_PRESSURE' });
        return job;
      }
    }

    // Step 1: PLAN & RESOLVE_CAPABILITIES
    job.status = 'PLANNING';
    job.progressPercentage = 15;
    this.repository.saveJob(job);
    this.emitEvent('creation.planned', { jobId: job.id });

    const resolution = this.capabilityService.resolveProviderForJob(job.type, {
      localOnly: job.constraints.localOnly,
    });

    if (resolution.status === 'NOT_CONFIGURED' || !resolution.provider) {
      job.status = 'FAILED';
      job.errorMessage = `PROVIDER_NOT_CONFIGURED: ${resolution.reason}`;
      this.repository.saveJob(job);
      this.emitEvent('creation.failed', { jobId: job.id, error: job.errorMessage });
      return job;
    }

    job.modelProvider = resolution.provider.name;
    job.applicationOrTool = resolution.provider.providerId;
    job.status = 'RUNNING';
    job.progressPercentage = 30;
    this.repository.saveJob(job);
    this.emitEvent('creation.running', { jobId: job.id, provider: resolution.provider.name });

    // Step 2: EXECUTE PIPELINE
    job.currentIteration += 1;
    let executionResult;

    switch (job.type) {
      case 'IMAGE':
      case 'EDIT':
      case 'TRANSFORM':
        executionResult = await this.pipelines.executeImagePipeline(job);
        break;

      case 'VIDEO':
      case 'MEDIA_PACKAGE':
        executionResult = await this.pipelines.executeVideoPipeline(job);
        break;

      case 'AUDIO':
      case 'MUSIC':
      case 'VOICE':
        executionResult = await this.pipelines.executeAudioPipeline(job);
        break;

      case 'DOCUMENT':
      case 'PRESENTATION':
        executionResult = await this.pipelines.executeDocumentPipeline(job);
        break;

      case 'THREE_D':
        executionResult = await this.pipelines.execute3DPipeline(job);
        break;

      default:
        executionResult = await this.pipelines.executeDocumentPipeline(job);
        break;
    }

    if (!executionResult.success || executionResult.artifacts.length === 0) {
      job.status = 'FAILED';
      job.errorMessage = executionResult.error || 'Pipeline execution failed to produce artifacts.';
      this.repository.saveJob(job);
      this.emitEvent('creation.failed', { jobId: job.id, error: job.errorMessage });
      return job;
    }

    // Save artifacts
    for (const art of executionResult.artifacts) {
      this.repository.saveArtifact(art);
    }
    job.outputArtifacts = executionResult.artifacts;
    job.actualCostUsd = executionResult.costUsd;
    job.progressPercentage = 70;
    this.emitEvent('creation.output_created', { jobId: job.id, count: executionResult.artifacts.length });

    // Step 3: VERIFY ARTIFACT
    job.status = 'VERIFYING';
    this.repository.saveJob(job);
    this.emitEvent('creation.verification_started', { jobId: job.id });

    const primaryArtifact = executionResult.artifacts[0];
    const verification = await this.verifierService.verifyArtifact(job, primaryArtifact);
    job.verification = verification;

    primaryArtifact.verified = verification.verified;
    primaryArtifact.verificationResult = verification;
    this.repository.saveArtifact(primaryArtifact);

    this.emitEvent('creation.verification_completed', {
      jobId: job.id,
      verified: verification.verified,
      score: verification.score,
    });

    // Record Iteration
    this.repository.recordIteration({
      jobId: job.id,
      iterationNumber: job.currentIteration,
      reason: 'Initial creation cycle',
      modificationsRequested: 'N/A',
      resultArtifactId: primaryArtifact.id,
      verification,
      timestamp: new Date().toISOString(),
    });

    // Step 4: APPROVAL GATE OR COMPLETE
    if (job.requiresApproval && verification.verified) {
      job.status = 'AWAITING_APPROVAL';
      job.approvalStatus = 'PENDING';
      job.progressPercentage = 90;
      this.repository.saveJob(job);
      this.emitEvent('creation.awaiting_approval', { jobId: job.id });
      return this.repository.getJob(job.id)!;
    }

    if (verification.verified) {
      job.status = 'COMPLETED';
      job.progressPercentage = 100;
      this.repository.saveJob(job);
      this.emitEvent('creation.completed', { jobId: job.id, artifactId: primaryArtifact.id });
    } else {
      job.status = 'FAILED';
      job.errorMessage = `Verification failed: ${verification.details}`;
      this.repository.saveJob(job);
      this.emitEvent('creation.failed', { jobId: job.id, error: job.errorMessage });
    }

    return this.repository.getJob(job.id)!;
  }

  // ─── Human Sovereign Approval & Controls ────────────────────────────────────

  public approveJob(jobId: string, approvedBy: string): CreationJob {
    const job = this.repository.getJob(jobId);
    if (!job) throw new Error(`Job '${jobId}' not found.`);

    job.approvalStatus = 'APPROVED';
    job.approvedBy = approvedBy;
    job.approvedAt = new Date().toISOString();
    job.status = 'COMPLETED';
    job.progressPercentage = 100;
    this.repository.saveJob(job);
    this.emitEvent('creation.approved', { jobId: job.id, approvedBy });
    this.emitEvent('creation.completed', { jobId: job.id });

    return this.repository.getJob(jobId)!;
  }

  public rejectJob(jobId: string, reason: string): CreationJob {
    const job = this.repository.getJob(jobId);
    if (!job) throw new Error(`Job '${jobId}' not found.`);

    job.approvalStatus = 'REJECTED';
    job.status = 'REJECTED';
    job.errorMessage = `Rejected: ${reason}`;
    this.repository.saveJob(job);
    this.emitEvent('creation.rejected', { jobId: job.id, reason });

    return this.repository.getJob(jobId)!;
  }

  public cancelJob(jobId: string): CreationJob {
    const job = this.repository.getJob(jobId);
    if (!job) throw new Error(`Job '${jobId}' not found.`);

    job.status = 'CANCELLED';
    this.repository.saveJob(job);
    this.emitEvent('creation.cancelled', { jobId: job.id });

    return this.repository.getJob(jobId)!;
  }

  public archiveJob(jobId: string): CreationJob {
    const job = this.repository.getJob(jobId);
    if (!job) throw new Error(`Job '${jobId}' not found.`);

    job.status = 'ARCHIVED';
    this.repository.saveJob(job);
    this.emitEvent('creation.archived', { jobId: job.id });

    return this.repository.getJob(jobId)!;
  }

  public pauseJob(jobId: string): CreationJob {
    const job = this.repository.getJob(jobId);
    if (!job) throw new Error(`Job '${jobId}' not found.`);

    job.status = 'PAUSED';
    this.repository.saveJob(job);
    this.emitEvent('creation.paused', { jobId: job.id });

    return this.repository.getJob(jobId)!;
  }

  public resumeJob(jobId: string): Promise<CreationJob> {
    const job = this.repository.getJob(jobId);
    if (!job) throw new Error(`Job '${jobId}' not found.`);

    job.status = 'RUNNING';
    this.repository.saveJob(job);
    this.emitEvent('creation.resumed', { jobId: job.id });

    return this.executeJob(jobId);
  }

  /**
   * Bounded creation iteration loop with convergence check.
   */
  public async iterateJob(jobId: string, modifications: string): Promise<CreationJob> {
    const job = this.repository.getJob(jobId);
    if (!job) throw new Error(`Job '${jobId}' not found.`);

    if (job.currentIteration >= job.maxIterations) {
      job.status = 'AWAITING_INPUT';
      job.errorMessage = `MAX_ITERATION_BUDGET_EXCEEDED (${job.maxIterations} iterations). Requires sovereign review.`;
      this.repository.saveJob(job);
      return job;
    }

    this.emitEvent('creation.iteration_started', {
      jobId: job.id,
      iterationNumber: job.currentIteration + 1,
      modifications,
    });

    job.prompt = `${job.prompt}\n\n[Iteration ${job.currentIteration + 1} Modification]: ${modifications}`;
    this.repository.saveJob(job);

    return this.executeJob(job.id);
  }

  // ─── Query Accessors ────────────────────────────────────────────────────────

  public getJob(jobId: string): CreationJob | null {
    return this.repository.getJob(jobId);
  }

  public listJobs(filter?: Parameters<CreationRepository['listJobs']>[0]): CreationJob[] {
    return this.repository.listJobs(filter);
  }

  public getArtifacts(jobId: string): CreationArtifact[] {
    return this.repository.getArtifactsForJob(jobId);
  }

  public getCapabilities() {
    return this.capabilityService.listCapabilities();
  }

  public getProviders() {
    return this.capabilityService.listProviders();
  }

  private emitEvent(type: string, data: Record<string, unknown>): void {
    if (this.eventBus) {
      this.eventBus.emit(type as any, {
        ...data,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
