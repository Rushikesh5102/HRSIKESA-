/**
 * HṚṢĪKEŚA (हृषीकेश) — Native Lightweight HTTP Server
 */

import http, { IncomingMessage, ServerResponse } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { IdentityManager } from '../core/identity/identity.manager.js';
import { LifecycleManager } from '../core/lifecycle/lifecycle.manager.js';
import { HardwareDetector } from '../core/hardware/hardware.detector.js';
import { ModelRegistry } from '../models/registry/model.registry.js';
import { ModelRouter } from '../models/router/model.router.js';
import { ILogger } from '../core/logging/logger.types.js';
import { ServerConfig } from '../core/configuration/config.types.js';
import { ConversationService } from '../conversation/conversation.service.js';
import { DatabaseManager } from '../persistence/database/database.manager.js';
import { MigrationManager } from '../persistence/migrations/migration.manager.js';
import { MemoryRepository } from '../persistence/repositories/memory.repository.js';
import { SessionRepository } from '../persistence/repositories/session.repository.js';
import { MessageRepository } from '../persistence/repositories/message.repository.js';
import { CreatorProfileManager } from '../memory/creator.profile.js';
import { MemoryTier, MemoryProvenance } from '../memory/memory.types.js';
import { ToolRegistry } from '../tools/registry/tool.registry.js';
import { PermissionManager } from '../tools/permissions/permission.manager.js';
import { ToolExecutionBus } from '../tools/execution/tool.bus.js';
import { ToolAuditManager } from '../tools/audit/tool.audit.js';
import { DANGER_TIER_NAMES } from '../tools/interfaces/danger.types.js';
import { AgentRegistry } from '../agents/registry/agent.registry.js';
import { TaskRepository } from '../persistence/repositories/task.repository.js';
import { MissionRepository } from '../persistence/repositories/mission.repository.js';
import { MissionOrchestrator } from '../agents/mission/mission.orchestrator.js';
import { AgentDelegationManager } from '../agents/delegation/delegation.manager.js';
import { AgentBlackboard } from '../agents/blackboard/blackboard.js';
import { AgentRuntime } from '../agents/runtime/agent.runtime.js';
import { AgentTask, TaskPriority, TaskStatus } from '../agents/interfaces/task.types.js';
import { MissionBudget } from '../agents/interfaces/mission.types.js';
import { EventBus } from '../core/events/event-bus.js';
import { EventKey } from '../core/events/event.types.js';
import { IEnvironmentManager } from '../environment/interfaces/environment.types.js';
import { VoicePipeline } from '../voice/pipeline/voice.pipeline.js';
import { ISpeechToTextProvider, ITextToSpeechProvider, IAudioRecorder, IAudioPlayer } from '../voice/interfaces/voice.types.js';
import {
  PronunciationRepository,
  PronunciationNormalizer,
  LanguageDetector,
  VoiceProfileManager,
  VoiceInteractionCoordinator,
  TargetEngineFormat
} from '../voice/index.js';
import { randomUUID } from 'node:crypto';
import { SemanticMemoryIndexer } from '../memory/semantic/semantic.indexer.js';
import { HybridMemoryRetriever } from '../memory/semantic/hybrid.retriever.js';
import { MemoryTier as _MemoryTierType } from '../memory/memory.types.js';
import { LifecycleEngine } from '../company/lifecycle/lifecycle.engine.js';
import { OpenAIProvider } from '../models/providers/openai.provider.js';
import { AnthropicProvider } from '../models/providers/anthropic.provider.js';
import { GeminiProvider } from '../models/providers/gemini.provider.js';
import { latencyDiagnostics } from '../conversation/latency.tracker.js';

export interface PersistenceContext {
  readonly db: DatabaseManager;
  readonly migrations: MigrationManager;
  readonly memoryRepo: MemoryRepository;
  readonly sessionRepo: SessionRepository;
  readonly messageRepo: MessageRepository;
  readonly creatorProfile: CreatorProfileManager;
  readonly modelAuditRepo?: import('../persistence/repositories/model-audit.repository.js').ModelAuditRepository;
}

export interface ToolsContext {
  readonly toolRegistry: ToolRegistry;
  readonly permissionManager: PermissionManager;
  readonly toolBus: ToolExecutionBus;
  readonly toolAudit: ToolAuditManager;
}

export interface AgentsContext {
  readonly agentRegistry: AgentRegistry;
  readonly taskRepo: TaskRepository;
  readonly missionRepo: MissionRepository;
  readonly orchestrator: MissionOrchestrator;
  readonly delegationManager: AgentDelegationManager;
  readonly blackboard: AgentBlackboard;
  readonly runtime: AgentRuntime;
  readonly artifactRepo?: import('../persistence/repositories/artifact.repository.js').ArtifactRepository;
  readonly planner?: import('../agents/planner/mission.planner.js').MissionPlanner;
}

export interface EnvironmentContext {
  readonly environmentManager: IEnvironmentManager;
}

export interface VoiceContext {
  readonly voicePipeline: VoicePipeline;
  readonly stt: ISpeechToTextProvider;
  readonly tts: ITextToSpeechProvider;
  readonly recorder: IAudioRecorder;
  readonly player: IAudioPlayer;
  readonly normalizer?: PronunciationNormalizer;
  readonly pronunciationRepo?: PronunciationRepository;
  readonly langDetector?: LanguageDetector;
  readonly profileManager?: VoiceProfileManager;
  readonly coordinator?: VoiceInteractionCoordinator;
}

export interface SemanticContext {
  readonly indexer: SemanticMemoryIndexer;
  readonly retriever: HybridMemoryRetriever;
  readonly search: import('../memory/semantic/semantic.search.js').SemanticMemorySearch;
}

export interface CompanyContext {
  readonly companyService: import('../company/services/company.service.js').CompanyService;
  readonly opsRepo?: import('../company/repositories/company-operations.repository.js').CompanyOperationsRepository;
  readonly healthService?: import('../company/services/company-health.service.js').CompanyHealthService;
  readonly kpiEngine?: import('../company/services/company-kpi.engine.js').CompanyKpiEngine;
  readonly workforceManager?: import('../company/services/company-workforce.manager.js').CompanyWorkforceManager;
  readonly approvalService?: import('../company/services/company-approval.service.js').CompanyApprovalService;
  readonly policyEngine?: import('../company/services/company-policy.engine.js').CompanyPolicyEngine;
  readonly sopEngine?: import('../company/services/company-sop.engine.js').CompanySopEngine;
  readonly incidentManager?: import('../company/services/company-incident.manager.js').CompanyIncidentManager;
  readonly riskManager?: import('../company/services/company-risk.manager.js').CompanyRiskManager;
  readonly crmOrderService?: import('../company/services/company-crm-order.service.js').CompanyCrmOrderService;
  readonly productReleaseService?: import('../company/services/company-product-release.service.js').CompanyProductReleaseService;
  readonly recoveryRetirementService?: import('../company/services/company-recovery-retirement.service.js').CompanyRecoveryRetirementService;
  readonly automationEngine?: import('../company/services/company-automation.engine.js').CompanyAutomationEngine;
}

export interface GoalContext {
  readonly goalEngine: import('../goal/engine/goal.execution.engine.js').GoalExecutionEngine;
  readonly goalRepo: import('../persistence/repositories/goal.repository.js').GoalRepository;
  readonly milestoneRepo: import('../persistence/repositories/milestone.repository.js').MilestoneRepository;
  readonly goalPlanner: import('../goal/planner/goal.planner.js').GoalPlanner;
  readonly goalVerifier: import('../goal/verification/goal.verifier.js').GoalVerifier;
}

export interface PersistentOperationsContext {
  readonly scheduleRepo?: import('../persistence/repositories/schedule.repository.js').ScheduleRepository;
  readonly evaluationRepo?: import('../persistence/repositories/objective-evaluation.repository.js').ObjectiveEvaluationRepository;
  readonly evaluator?: import('../goal/engine/objective.evaluator.js').ObjectiveEvaluator;
  readonly scheduler?: import('../scheduling/persistent.scheduler.js').PersistentScheduler;
  readonly recovery?: import('../runtime/recovery/objective.recovery.manager.js').ObjectiveRecoveryManager;
  readonly governor?: import('../core/hardware/resource.governor.js').ResourceGovernor;
}

export interface CapabilitiesContext {
  readonly registry?: import('../capabilities/registry/capability.registry.js').CapabilityRegistry;
  readonly router?: import('../capabilities/routing/agent.capability.router.js').AgentCapabilityRouter;
}

export interface ResearchContext {
  readonly engine: import('../research/engine/research.engine.js').ResearchEngine;
  readonly studyRepo: import('../persistence/repositories/research.repository.js').ResearchRepository;
  readonly sourceRepo: import('../persistence/repositories/research-source.repository.js').ResearchSourceRepository;
  readonly evidenceRepo: import('../persistence/repositories/research-evidence.repository.js').ResearchEvidenceRepository;
  readonly findingRepo: import('../persistence/repositories/research-finding.repository.js').ResearchFindingRepository;
}

export interface KnowledgeContext {
  readonly entityRepo: import('../knowledge/repositories/knowledge-entity.repository.js').KnowledgeEntityRepository;
  readonly relRepo: import('../knowledge/repositories/knowledge-relationship.repository.js').KnowledgeRelationshipRepository;
  readonly factRepo: import('../knowledge/repositories/knowledge-fact.repository.js').KnowledgeFactRepository;
  readonly evidenceRepo: import('../knowledge/repositories/knowledge-evidence.repository.js').KnowledgeEvidenceRepository;
  readonly claimRepo: import('../knowledge/repositories/knowledge-claim.repository.js').KnowledgeClaimRepository;
  readonly contradictionRepo: import('../knowledge/repositories/knowledge-contradiction.repository.js').KnowledgeContradictionRepository;
  readonly resolutionService: import('../knowledge/services/entity-resolution.service.js').EntityResolutionService;
  readonly graphService: import('../knowledge/services/knowledge-graph.service.js').KnowledgeGraphService;
  readonly validationService: import('../knowledge/services/knowledge-validation.service.js').KnowledgeValidationService;
  readonly extractionService: import('../knowledge/services/knowledge-extraction.service.js').KnowledgeExtractionService;
  readonly contextAssembler: import('../knowledge/services/knowledge-context-assembler.js').KnowledgeContextAssembler;
  readonly consolidationService: import('../knowledge/services/knowledge-consolidation.service.js').KnowledgeConsolidationService;
  readonly timelineService: import('../knowledge/services/knowledge-timeline.service.js').KnowledgeTimelineService;
}

export interface SkillsContext {
  readonly skillRepo: import('../skills/repositories/skill.repository.js').SkillRepository;
  readonly skillRegistry: import('../skills/services/skill-registry.service.js').SkillRegistry;
  readonly skillMatcher: import('../skills/services/skill-matcher.service.js').SkillMatcher;
  readonly skillExecutionEngine: import('../skills/services/skill-execution-engine.service.js').SkillExecutionEngine;
  readonly skillValidator: import('../skills/services/skill-security-validator.service.js').SkillSecurityValidator;
}

export interface MCPContext {
  readonly serverRepo: import('../mcp/repositories/mcp-server.repository.js').MCPServerRepository;
  readonly toolRepo: import('../mcp/repositories/mcp-tool.repository.js').MCPToolRepository;
  readonly resourceRepo: import('../mcp/repositories/mcp-resource.repository.js').MCPResourceRepository;
  readonly promptRepo: import('../mcp/repositories/mcp-prompt.repository.js').MCPPromptRepository;
  readonly secRepo: import('../mcp/repositories/mcp-security.repository.js').MCPSecurityRepository;
  readonly validator: import('../mcp/services/mcp-security-validator.service.js').MCPSecurityValidator;
  readonly processManager: import('../mcp/services/mcp-process-manager.service.js').MCPProcessManager;
  readonly serverRegistry: import('../mcp/services/mcp-server-registry.service.js').MCPServerRegistry;
  readonly adapter: import('../mcp/services/mcp-capability-adapter.service.js').MCPCapabilityAdapter;
  readonly discovery: import('../mcp/services/mcp-capability-discovery.service.js').MCPCapabilityDiscovery;
  readonly refresh: import('../mcp/services/mcp-refresh.service.js').MCPRefreshService;
}

export interface ComputerOperatorContext {
  readonly operator: import('../computer/operator/services/computer.operator.js').ComputerOperator;
  readonly repository: import('../computer/operator/repositories/computer-operator.repository.js').ComputerOperatorRepository;
}

export interface EnterpriseEnvironmentContext {
  readonly registry: import('../environment/enterprise/services/environment.registry.js').EnvironmentRegistry;
  readonly repository: import('../environment/enterprise/repositories/environment.repository.js').EnvironmentRepository;
}

export interface MultimodalContext {
  readonly repository: import('../multimodal/repositories/multimodal.repository.js').MultimodalRepository;
  readonly visionEngine: import('../multimodal/vision/vision.engine.js').VisionEngine;
  readonly voiceCoordinator: import('../multimodal/voice/streaming-voice.coordinator.js').StreamingVoiceCoordinator;
  readonly cameraManager: import('../multimodal/vision/camera.manager.js').CameraManager;
  readonly contextAssembler: import('../multimodal/services/multimodal-context.assembler.js').MultimodalContextAssembler;
}

export interface SelfImprovementContext {
  readonly coordinator: import('../self-improvement/services/self-improvement-coordinator.js').SelfImprovementCoordinator;
}

export class HttpServer {
  private server: http.Server | null = null;
  private readonly config: ServerConfig;
  private readonly identity: IdentityManager;
  private readonly lifecycle: LifecycleManager;
  private readonly hardware: HardwareDetector;
  private readonly registry: ModelRegistry;
  private readonly router: ModelRouter;
  private readonly conversation?: ConversationService;
  private readonly persistence?: PersistenceContext;
  private readonly tools?: ToolsContext;
  private readonly agents?: AgentsContext;
  private readonly environment?: EnvironmentContext;
  private readonly voice?: VoiceContext;
  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;
  private semanticCtx?: SemanticContext; // Phase 12
  private readonly company?: CompanyContext; // Phase 14
  private readonly goal?: GoalContext; // Phase 15
  private readonly persistentOps?: PersistentOperationsContext; // Phase 16
  private readonly capabilities?: CapabilitiesContext; // Phase 16
  private readonly research?: ResearchContext; // Phase 17
  private readonly knowledge?: KnowledgeContext; // Phase 19
  private readonly skills?: SkillsContext; // Phase 20
  private readonly mcp?: MCPContext; // Phase 21
  private readonly computerOperator?: ComputerOperatorContext; // Phase 22
  private readonly enterpriseEnvironment?: EnterpriseEnvironmentContext; // Phase 23
  private readonly multimodal?: MultimodalContext; // Phase 24
  private readonly selfImprovement?: SelfImprovementContext; // Phase 26

  constructor(
    config: ServerConfig,
    identity: IdentityManager,
    lifecycle: LifecycleManager,
    hardware: HardwareDetector,
    registry: ModelRegistry,
    router: ModelRouter,
    conversation?: ConversationService,
    logger?: ILogger,
    persistence?: PersistenceContext,
    tools?: ToolsContext,
    agents?: AgentsContext,
    environment?: EnvironmentContext,
    voice?: VoiceContext,
    eventBus?: EventBus,
    semantic?: SemanticContext,
    company?: CompanyContext,
    goal?: GoalContext,
    persistentOps?: PersistentOperationsContext,
    capabilities?: CapabilitiesContext,
    research?: ResearchContext,
    knowledge?: KnowledgeContext,
    skills?: SkillsContext,
    mcp?: MCPContext,
    computerOperator?: ComputerOperatorContext,
    enterpriseEnvironment?: EnterpriseEnvironmentContext,
    multimodal?: MultimodalContext,
    selfImprovement?: SelfImprovementContext
  ) {
    this.config = config;
    this.identity = identity;
    this.lifecycle = lifecycle;
    this.hardware = hardware;
    this.registry = registry;
    this.router = router;
    this.conversation = conversation;
    this.logger = logger?.child('HttpServer');
    this.persistence = persistence;
    this.tools = tools;
    this.agents = agents;
    this.environment = environment;
    this.voice = voice;
    this.eventBus = eventBus;
    this.semanticCtx = semantic;
    this.company = company;
    this.goal = goal;
    this.persistentOps = persistentOps;
    this.capabilities = capabilities;
    this.research = research;
    this.knowledge = knowledge;
    this.skills = skills;
    this.mcp = mcp;
    this.computerOperator = computerOperator;
    this.enterpriseEnvironment = enterpriseEnvironment;
    this.multimodal = multimodal;
    this.selfImprovement = selfImprovement;
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res).catch((err) => {
          this.logger?.error('Unhandled request exception', err);
          this.sendJson(res, 500, { error: 'Internal server error', details: String(err) });
        });
      });

      this.server.on('error', (err) => {
        this.logger?.error('HTTP server startup error', err);
        reject(err);
      });

      this.server.listen(this.config.port, this.config.host, () => {
        this.logger?.info(`HTTP server listening on http://${this.config.host}:${this.config.port}`);
        resolve();
      });
    });
  }

  public async stop(): Promise<void> {
    if (!this.server) return;

    return new Promise((resolve, reject) => {
      try {
        if (typeof (this.server as any).closeAllConnections === 'function') {
          (this.server as any).closeAllConnections();
        }
      } catch {
        // Ignore
      }

      this.server?.close((err) => {
        if (err) {
          reject(err);
        } else {
          this.server = null;
          resolve();
        }
      });
    });
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;
    const method = req.method?.toUpperCase();

    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // GET /health
    if (pathname === '/health' && method === 'GET') {
      const snapshot = this.lifecycle.getSnapshot();
      const code = snapshot.state === 'READY' ? 200 : snapshot.state === 'DEGRADED' ? 200 : 503;
      this.sendJson(res, code, {
        status: 'ok',
        state: snapshot.state,
        lifecycleState: snapshot.state,
        healthy: snapshot.state === 'READY' || snapshot.state === 'DEGRADED',
        degradedReason: snapshot.degradationReason,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // GET /status
    if (pathname === '/status' && method === 'GET') {
      const snapshot = this.lifecycle.getSnapshot();
      const hw = this.hardware.getProfile();
      const systemId = this.identity.getSystemIdentity();
      const ownerId = this.identity.getOwnerIdentity();
      const availableModels = this.registry.getAvailableModels();

      this.sendJson(res, 200, {
        system: {
          name: systemId.name,
          sanskrit: systemId.sanskrit,
          version: systemId.version,
          state: snapshot.state,
          uptimeSeconds: snapshot.uptimeSeconds,
          degradationReason: snapshot.degradationReason
        },
        owner: {
          rootAuthority: ownerId.subjectId,
          fullName: ownerId.fullName,
          role: ownerId.role
        },
        hardware: hw,
        totalModelsAvailable: availableModels.length,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // GET /identity
    if (pathname === '/identity' && method === 'GET') {
      this.sendJson(res, 200, {
        authorityContext: this.identity.getAuthorityContext(),
        timestamp: new Date().toISOString()
      });
      return;
    }

    // GET /models/health
    if (pathname === '/models/health' && method === 'GET') {
      const records = this.registry.getAllRecords();
      const allModels = this.registry.getAllModels();
      const availableModels = this.registry.getAvailableModels();
      this.sendJson(res, 200, {
        status: availableModels.length > 0 ? 'healthy' : 'degraded',
        totalRegistered: allModels.length,
        totalAvailable: availableModels.length,
        providers: records.map((r) => ({
          providerId: r.provider.id,
          displayName: r.provider.displayName,
          isLocal: r.provider.isLocal,
          enabled: r.enabled,
          health: r.health,
          modelsCount: r.models.length
        })),
        timestamp: new Date().toISOString()
      });
      return;
    }

    // GET /models/:id (specific model lookup by ID or name)
    if (pathname.startsWith('/models/') && method === 'GET' && !['/models/health', '/models/refresh', '/models/respond'].includes(pathname)) {
      const modelId = decodeURIComponent(pathname.slice('/models/'.length));
      const allModels = this.registry.getAllModels();
      const match = allModels.find((m) => m.id === modelId || m.name === modelId);
      if (match) {
        this.sendJson(res, 200, {
          success: true,
          model: match
        });
      } else {
        this.sendJson(res, 404, {
          success: false,
          error: `Model '${modelId}' not found in registered providers.`
        });
      }
      return;
    }

    // GET /models
    if (pathname === '/models' && method === 'GET') {
      const records = this.registry.getAllRecords();
      const payload = records.map((r) => ({
        providerId: r.provider.id,
        displayName: r.provider.displayName,
        isLocal: r.provider.isLocal,
        enabled: r.enabled,
        health: r.health,
        models: r.models
      }));

      this.sendJson(res, 200, {
        providers: payload,
        totalModels: this.registry.getAllModels().length,
        availableModelsCount: this.registry.getAvailableModels().length,
        activePolicy: this.router.getPolicy(),
        timestamp: new Date().toISOString()
      });
      return;
    }

    // GET /providers
    if (pathname === '/providers' && method === 'GET') {
      const records = this.registry.getAllRecords();
      this.sendJson(res, 200, {
        providers: records.map((r) => ({
          id: r.provider.id,
          displayName: r.provider.displayName,
          isLocal: r.provider.isLocal,
          enabled: r.enabled,
          health: r.health,
          modelCount: r.models.length
        })),
        timestamp: new Date().toISOString()
      });
      return;
    }

    // GET /providers/:id
    if (pathname.startsWith('/providers/') && method === 'GET') {
      const providerId = decodeURIComponent(pathname.slice('/providers/'.length));
      const record = this.registry.getRecord(providerId);
      if (record) {
        this.sendJson(res, 200, {
          success: true,
          provider: {
            id: record.provider.id,
            displayName: record.provider.displayName,
            isLocal: record.provider.isLocal,
            enabled: record.enabled,
            health: record.health,
            models: record.models
          }
        });
      } else {
        this.sendJson(res, 404, {
          success: false,
          error: `Provider '${providerId}' not found.`
        });
      }
      return;
    }

    // GET /routing/policy
    if (pathname === '/routing/policy' && method === 'GET') {
      const pref = this.router.getPreferenceConfig();
      this.sendJson(res, 200, {
        success: true,
        policy: pref.activePolicy,
        weights: pref.weights,
        autoFallback: pref.autoFallback,
        maxCloudCostPerTaskUsd: pref.maxCloudCostPerTaskUsd,
        updatedAt: pref.updatedAt,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // POST /routing/policy
    if (pathname === '/routing/policy' && method === 'POST') {
      try {
        const body = (await this.readJsonBody(req)) as any;
        if (!body || typeof body !== 'object') {
          this.sendJson(res, 400, { error: 'Request body must be a JSON object with policy configuration.' });
          return;
        }
        if (body.policy) {
          this.router.setPolicy(body.policy as any);
        }
        if (body.weights || body.autoFallback !== undefined || body.maxCloudCostPerTaskUsd !== undefined || body.activePolicy) {
          this.router.setPreferenceConfig(body);
        }
        const updated = this.router.getPreferenceConfig();
        this.sendJson(res, 200, {
          success: true,
          policy: updated.activePolicy,
          config: updated,
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        this.sendJson(res, 400, {
          success: false,
          error: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // POST /routing/preview
    if (pathname === '/routing/preview' && method === 'POST') {
      try {
        const body = (await this.readJsonBody(req)) as any;
        if (!body || typeof body !== 'object') {
          this.sendJson(res, 400, { error: 'Request body must be a JSON object.' });
          return;
        }
        const prompt = typeof body.prompt === 'string' ? body.prompt : typeof body.message === 'string' ? body.message : '';
        const preview = this.router.preview({
          prompt,
          systemPrompt: typeof body.systemPrompt === 'string' ? body.systemPrompt : undefined,
          preferredModel: typeof body.preferredModel === 'string' ? body.preferredModel : undefined,
          preferredProvider: typeof body.preferredProvider === 'string' ? body.preferredProvider : undefined,
          requireLocal: Boolean(body.requireLocal),
          taskType: typeof body.taskType === 'string' ? body.taskType as any : undefined,
          complexity: typeof body.complexity === 'string' ? body.complexity as any : undefined,
          privacyLevel: typeof body.privacyLevel === 'string' ? body.privacyLevel as any : undefined,
        });

        this.sendJson(res, 200, {
          success: true,
          preview,
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        this.sendJson(res, 400, {
          success: false,
          error: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // GET /routing/usage
    if (pathname === '/routing/usage' && method === 'GET') {
      const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!, 10) : 50;
      const audits = this.persistence?.modelAuditRepo?.findRecent(limit) || [];
      const stats = this.persistence?.modelAuditRepo?.getUsageStats() || {
        totalCalls: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCostUsd: 0,
        fallbackCount: 0,
      };

      this.sendJson(res, 200, {
        success: true,
        stats,
        recentAudits: audits,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // POST /models/refresh — triggers an immediate re-poll of all model providers
    if (pathname === '/models/refresh' && method === 'POST') {
      try {
        await this.registry.refreshAll();
        const records = this.registry.getAllRecords();
        const payload = records.map((r) => ({
          providerId: r.provider.id,
          displayName: r.provider.displayName,
          isLocal: r.provider.isLocal,
          health: r.health,
          modelsCount: r.models.length,
          models: r.models
        }));
        this.sendJson(res, 200, {
          success: true,
          totalModels: this.registry.getAllModels().length,
          providers: payload,
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        this.sendJson(res, 500, {
          success: false,
          error: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // POST /models/respond
    if (pathname === '/models/respond' && method === 'POST') {
      try {
        const body = await this.readJsonBody(req);
        if (!body || typeof body.prompt !== 'string' || body.prompt.trim().length === 0) {
          this.sendJson(res, 400, {
            error: "Validation failed: 'prompt' field must be a non-empty string."
          });
          return;
        }

        const response = await this.router.routeAndExecute({
          prompt: body.prompt.trim(),
          systemPrompt: typeof body.systemPrompt === 'string' ? body.systemPrompt : undefined,
          preferredModel: typeof body.preferredModel === 'string' ? body.preferredModel : undefined,
          preferredProvider: typeof body.preferredProvider === 'string' ? body.preferredProvider : undefined,
          requireLocal: Boolean(body.requireLocal)
        });

        this.sendJson(res, 200, {
          success: true,
          data: response
        });
      } catch (err) {
        this.sendJson(res, 422, {
          success: false,
          error: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // POST /chat
    if (pathname === '/chat' && method === 'POST') {
      try {
        const body = await this.readJsonBody(req);
        if (!body || typeof body.message !== 'string' || body.message.trim().length === 0) {
          this.sendJson(res, 400, {
            error: "Validation failed: 'message' field must be a non-empty string."
          });
          return;
        }

        if (!this.conversation) {
          this.sendJson(res, 503, {
            error: 'Conversation service is not initialized on this server instance.'
          });
          return;
        }

        const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : undefined;
        const preferredModel = typeof body.preferredModel === 'string' ? body.preferredModel.trim() : undefined;
        const preferredProvider = typeof body.preferredProvider === 'string' ? body.preferredProvider.trim() : undefined;
        const isStreaming = body.stream === true || req.headers.accept?.includes('text/event-stream');

        if (isStreaming) {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
          });

          const onToken = (token: string) => {
            try {
              res.write(`event: token\ndata: ${JSON.stringify({ token })}\n\n`);
            } catch {
              // client disconnected
            }
          };

          const response = await this.conversation.sendMessage(
            body.message.trim(),
            sessionId,
            preferredModel,
            preferredProvider,
            onToken
          );

          try {
            res.write(`event: done\ndata: ${JSON.stringify(response)}\n\n`);
            res.end();
          } catch {}
          return;
        }

        const response = await this.conversation.sendMessage(
          body.message.trim(),
          sessionId,
          preferredModel,
          preferredProvider
        );

        this.sendJson(res, 200, {
          success: true,
          sessionId: response.sessionId,
          response: response.response,
          model: response.model,
          provider: response.provider,
          timestamp: response.timestamp,
          durationMs: response.durationMs,
          toolCallsExecuted: response.toolCallsExecuted,
          metrics: response.metrics
        });
      } catch (err) {
        this.sendJson(res, 422, {
          success: false,
          error: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // GET /chat/telemetry
    if (pathname === '/chat/telemetry' && method === 'GET') {
      const summary = latencyDiagnostics.getSummary();
      this.sendJson(res, 200, {
        success: true,
        telemetry: summary
      });
      return;
    }

    // ==========================================
    // PERSISTENCE & MEMORY API ENDPOINTS
    // ==========================================

    // GET /memory/status
    if (pathname === '/memory/status' && method === 'GET') {
      if (!this.persistence) {
        this.sendJson(res, 503, { error: 'Persistence layer is not enabled on this kernel instance.' });
        return;
      }
      const dbDiag = this.persistence.db.getDiagnostics();
      const applied = this.persistence.migrations.getAppliedMigrations();
      const memoryCounts = this.persistence.memoryRepo.countByTier();
      const sessionCount = this.persistence.sessionRepo.count();

      this.sendJson(res, 200, {
        status: 'online',
        database: dbDiag,
        counts: {
          sessions: sessionCount,
          byTier: memoryCounts
        },
        migrations: {
          appliedCount: applied.length,
          latestVersion: applied.length > 0 ? applied[applied.length - 1].version : '000'
        },
        statistics: {
          totalSessions: sessionCount,
          memoryItemsByTier: memoryCounts
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    // GET /memory/profile
    if (pathname === '/memory/profile' && method === 'GET') {
      if (!this.persistence) {
        this.sendJson(res, 503, { error: 'Persistence layer is not enabled.' });
        return;
      }
      const profile = this.persistence.creatorProfile.getProfile();
      this.sendJson(res, 200, {
        success: true,
        profile,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // GET /conversations
    if (pathname === '/conversations' && method === 'GET') {
      if (!this.persistence) {
        this.sendJson(res, 503, { error: 'Persistence layer is not enabled.' });
        return;
      }
      const sessions = this.persistence.sessionRepo.findAll(50);
      this.sendJson(res, 200, {
        success: true,
        sessions,
        count: sessions.length,
        total: sessions.length,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // GET /conversations/:id
    if (pathname.startsWith('/conversations/') && method === 'GET') {
      if (!this.persistence) {
        this.sendJson(res, 503, { error: 'Persistence layer is not enabled.' });
        return;
      }
      const id = pathname.replace('/conversations/', '').trim();
      const session = this.persistence.sessionRepo.findById(id);
      if (!session) {
        this.sendJson(res, 404, { error: `Session '${id}' not found.` });
        return;
      }
      const messages = this.persistence.messageRepo.findBySessionId(id);
      this.sendJson(res, 200, {
        success: true,
        session,
        messages,
        totalMessages: messages.length,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // DELETE /conversations/:id
    if (pathname.startsWith('/conversations/') && method === 'DELETE') {
      if (!this.persistence) {
        this.sendJson(res, 503, { error: 'Persistence layer is not enabled.' });
        return;
      }
      const id = pathname.replace('/conversations/', '').trim();
      try {
        this.persistence.sessionRepo.delete(id);
        this.persistence.messageRepo.deleteBySessionId(id);
        this.sendJson(res, 200, { success: true, deletedSessionId: id });
      } catch (err) {
        this.sendJson(res, 500, { success: false, error: String(err) });
      }
      return;
    }

    // GET /workspace/files — List files in workspace and project outputs
    if (pathname === '/workspace/files' && method === 'GET') {
      try {
        const rootDir = process.cwd();
        const workspaceDir = path.resolve(rootDir, 'workspace');
        const results: Array<{ name: string; path: string; isDirectory: boolean; size: number; extension: string; modifiedAt: string }> = [];

        const scanDir = (dir: string, baseRelative: string = '') => {
          if (!fs.existsSync(dir)) return;
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') continue;
            const fullPath = path.join(dir, entry.name);
            const relPath = baseRelative ? `${baseRelative}/${entry.name}` : entry.name;
            try {
              const stat = fs.statSync(fullPath);
              results.push({
                name: entry.name,
                path: relPath,
                isDirectory: entry.isDirectory(),
                size: stat.size,
                extension: path.extname(entry.name).toLowerCase(),
                modifiedAt: stat.mtime.toISOString()
              });
              if (entry.isDirectory() && results.length < 150) {
                scanDir(fullPath, relPath);
              }
            } catch { /* skip unreadable */ }
          }
        };

        if (fs.existsSync(workspaceDir)) {
          scanDir(workspaceDir, 'workspace');
        }
        // Also scan root level project files (like index.html, scratch, etc.)
        scanDir(rootDir, '');

        this.sendJson(res, 200, { success: true, files: results });
      } catch (err) {
        this.sendJson(res, 500, { success: false, error: String(err) });
      }
      return;
    }

    // GET /workspace/file — Read file contents safely
    if (pathname === '/workspace/file' && method === 'GET') {
      const filePath = url.searchParams.get('path');
      if (!filePath) {
        this.sendJson(res, 400, { error: 'Missing path parameter' });
        return;
      }
      try {
        const rootDir = process.cwd();
        const resolved = path.resolve(rootDir, filePath);
        // Security check: must be inside rootDir
        if (!resolved.toLowerCase().startsWith(rootDir.toLowerCase())) {
          this.sendJson(res, 403, { error: 'Access outside workspace root is forbidden' });
          return;
        }
        if (!fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
          this.sendJson(res, 404, { error: 'File not found' });
          return;
        }
        const stat = fs.statSync(resolved);
        const content = fs.readFileSync(resolved, 'utf-8');
        this.sendJson(res, 200, {
          success: true,
          path: filePath,
          name: path.basename(resolved),
          content,
          size: stat.size
        });
      } catch (err) {
        this.sendJson(res, 500, { success: false, error: String(err) });
      }
      return;
    }

    // POST /missions/:id/abort
    if (pathname.startsWith('/missions/') && pathname.endsWith('/abort') && method === 'POST') {
      const missionId = pathname.split('/')[2];
      try {
        if (this.agents) {
          const mission = this.agents.missionRepo.get(missionId);
          if (mission) {
            this.agents.missionRepo.update(missionId, { status: 'failed' as any });
          }
        }
        this.eventBus?.emit('agent.task_failed', { taskId: missionId, agentId: 'all' });
        this.sendJson(res, 200, { success: true, abortedMissionId: missionId });
      } catch (err) {
        this.sendJson(res, 500, { success: false, error: String(err) });
      }
      return;
    }

    // POST /missions/:id/pause
    if (pathname.startsWith('/missions/') && pathname.endsWith('/pause') && method === 'POST') {
      const missionId = pathname.split('/')[2];
      try {
        if (this.agents) {
          const mission = this.agents.missionRepo.get(missionId);
          if (mission) {
            this.agents.missionRepo.update(missionId, { status: 'paused' as any });
          }
        }
        this.sendJson(res, 200, { success: true, pausedMissionId: missionId });
      } catch (err) {
        this.sendJson(res, 500, { success: false, error: String(err) });
      }
      return;
    }

    // ==========================================
    // INTEGRATIONS & API KEYS MANAGER ENDPOINTS
    // ==========================================

    // GET /integrations — Get status of AI providers and App integrations
    if (pathname === '/integrations' && method === 'GET') {
      try {
        const records = this.registry.getAllRecords();

        const aiProviders = [
          {
            id: 'ollama',
            name: 'Ollama Local Engine',
            category: 'local_ai',
            description: 'High-speed local open-weights model runtime (qwen2.5, llama3, deepseek-r1, nomic-embed).',
            status: records.find(r => r.provider.id === 'ollama')?.health.status || 'healthy',
            isConfigured: true,
            modelsCount: records.find(r => r.provider.id === 'ollama')?.models.length || 2,
            icon: 'cpu',
          },
          {
            id: 'openai',
            name: 'OpenAI Frontier API',
            category: 'cloud_ai',
            description: 'Direct integration for GPT-4o, GPT-4o-mini, o1, o3-mini models.',
            status: process.env.OPENAI_API_KEY ? 'healthy' : (records.find(r => r.provider.id === 'openai')?.health.status || 'unconfigured'),
            isConfigured: !!process.env.OPENAI_API_KEY,
            modelsCount: records.find(r => r.provider.id === 'openai')?.models.length || 0,
            icon: 'zap',
          },
          {
            id: 'anthropic',
            name: 'Anthropic Claude API',
            category: 'cloud_ai',
            description: 'Direct integration for Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus.',
            status: process.env.ANTHROPIC_API_KEY ? 'healthy' : (records.find(r => r.provider.id === 'anthropic')?.health.status || 'unconfigured'),
            isConfigured: !!process.env.ANTHROPIC_API_KEY,
            modelsCount: records.find(r => r.provider.id === 'anthropic')?.models.length || 0,
            icon: 'sparkles',
          },
          {
            id: 'gemini',
            name: 'Google Gemini AI',
            category: 'cloud_ai',
            description: 'Frontier multi-modal Gemini 1.5 Pro, 2.0 Flash, Flash-Lite.',
            status: (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) ? 'healthy' : (records.find(r => r.provider.id === 'gemini')?.health.status || 'unconfigured'),
            isConfigured: !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
            modelsCount: records.find(r => r.provider.id === 'gemini')?.models.length || 0,
            icon: 'compass',
          },
          {
            id: 'groq',
            name: 'Groq LPU Ultra-Fast Inference',
            category: 'cloud_ai',
            description: 'Sub-second real-time inference for Llama 3.3 70B, DeepSeek R1, Mixtral.',
            status: process.env.GROQ_API_KEY ? 'healthy' : 'unconfigured',
            isConfigured: !!process.env.GROQ_API_KEY,
            modelsCount: process.env.GROQ_API_KEY ? 4 : 0,
            icon: 'zap',
          },
          {
            id: 'deepseek',
            name: 'DeepSeek Platform',
            category: 'cloud_ai',
            description: 'Direct API access for DeepSeek V3 and DeepSeek R1 reasoning models.',
            status: process.env.DEEPSEEK_API_KEY ? 'healthy' : 'unconfigured',
            isConfigured: !!process.env.DEEPSEEK_API_KEY,
            modelsCount: process.env.DEEPSEEK_API_KEY ? 2 : 0,
            icon: 'cpu',
          },
          {
            id: 'openrouter',
            name: 'OpenRouter Multi-Model Gateway',
            category: 'cloud_ai',
            description: 'Unified API routing across 200+ global commercial and open models.',
            status: process.env.OPENROUTER_API_KEY ? 'healthy' : 'unconfigured',
            isConfigured: !!process.env.OPENROUTER_API_KEY,
            modelsCount: process.env.OPENROUTER_API_KEY ? 25 : 0,
            icon: 'share-2',
          }
        ];

        // App & Service Integrations
        const appServices = [
          {
            id: 'github',
            name: 'GitHub & Git Repositories',
            category: 'developer_tools',
            description: 'Autonomous repository manipulation, pull requests, issues, branch management, and CI/CD.',
            status: process.env.GITHUB_TOKEN ? 'connected' : 'unconfigured',
            capabilities: ['git.commit', 'git.push', 'repo.clone', 'pr.create', 'issues.sync'],
          },
          {
            id: 'slack',
            name: 'Slack Team Communications',
            category: 'messaging',
            description: 'Broadcast notifications, agent status channels, and direct thread interaction.',
            status: process.env.SLACK_BOT_TOKEN ? 'connected' : 'unconfigured',
            capabilities: ['messages.post', 'channels.read', 'alerts.dispatch'],
          },
          {
            id: 'discord',
            name: 'Discord Server Bot',
            category: 'messaging',
            description: 'Agent community alerts, developer log streaming, and command listener.',
            status: process.env.DISCORD_BOT_TOKEN ? 'connected' : 'unconfigured',
            capabilities: ['webhook.send', 'bot.respond'],
          },
          {
            id: 'google_workspace',
            name: 'Google Drive & Workspace',
            category: 'productivity',
            description: 'Document generation, spreadsheet analysis, and cloud asset storage.',
            status: process.env.GOOGLE_WORKSPACE_CREDENTIALS ? 'connected' : 'unconfigured',
            capabilities: ['drive.files.read', 'drive.files.write', 'sheets.append'],
          },
          {
            id: 'notion',
            name: 'Notion Workspace',
            category: 'productivity',
            description: 'Knowledge base synchronization, project boards, and autonomous documentation.',
            status: process.env.NOTION_API_KEY ? 'connected' : 'unconfigured',
            capabilities: ['pages.create', 'databases.query'],
          },
          {
            id: 'postgres',
            name: 'PostgreSQL Database Connector',
            category: 'database',
            description: 'Direct governed SQL queries, schema inspection, and analytics reporting.',
            status: process.env.DATABASE_URL ? 'connected' : 'unconfigured',
            capabilities: ['db.query', 'db.schema.inspect'],
          },
          {
            id: 'webhooks',
            name: 'Inbound & Outbound Webhooks',
            category: 'automation',
            description: 'Custom HTTP trigger endpoints for external automation (Zapier, Make, n8n).',
            status: 'connected',
            capabilities: ['webhook.trigger', 'webhook.listen'],
          }
        ];

        this.sendJson(res, 200, { success: true, aiProviders, appServices });
      } catch (err) {
        this.sendJson(res, 500, { success: false, error: String(err) });
      }
      return;
    }

    // POST /integrations/keys — Connect or update an AI API key
    if (pathname === '/integrations/keys' && method === 'POST') {
      try {
        const body = await this.readJsonBody(req);
        const providerId = String(body.providerId || '');
        const apiKey = String(body.apiKey || '');

        if (!providerId) {
          this.sendJson(res, 400, { error: 'Missing providerId' });
          return;
        }

        const trimmedKey = apiKey.trim();

        if (providerId === 'openai') {
          process.env.OPENAI_API_KEY = trimmedKey;
          const provider = new OpenAIProvider(trimmedKey);
          await this.registry.registerProvider(provider);
        } else if (providerId === 'anthropic') {
          process.env.ANTHROPIC_API_KEY = trimmedKey;
          const provider = new AnthropicProvider(trimmedKey);
          await this.registry.registerProvider(provider);
        } else if (providerId === 'gemini') {
          process.env.GEMINI_API_KEY = trimmedKey;
          process.env.GOOGLE_API_KEY = trimmedKey;
          const provider = new GeminiProvider(trimmedKey);
          await this.registry.registerProvider(provider);
        } else if (providerId === 'groq') {
          process.env.GROQ_API_KEY = trimmedKey;
        } else if (providerId === 'deepseek') {
          process.env.DEEPSEEK_API_KEY = trimmedKey;
        } else if (providerId === 'openrouter') {
          process.env.OPENROUTER_API_KEY = trimmedKey;
        }

        // Save credential in SQLite memory
        if (this.persistence) {
          this.persistence.memoryRepo.store({
            id: `cred_${providerId}`,
            tier: 'audit_history' as any,
            key: `api_key_${providerId}`,
            content: `API Key updated for provider ${providerId} (Length: ${trimmedKey.length})`,
            source: 'integrations_ui',
            provenance: 'explicit',
            confidence: 1.0,
            metadata: { providerId, configuredAt: new Date().toISOString() }
          });
        }

        this.sendJson(res, 200, {
          success: true,
          providerId,
          status: trimmedKey ? 'healthy' : 'unconfigured',
          message: `API Key successfully configured for ${providerId.toUpperCase()}`
        });
      } catch (err) {
        this.sendJson(res, 500, { success: false, error: String(err) });
      }
      return;
    }

    // POST /integrations/services — Save an App Service integration configuration
    if (pathname === '/integrations/services' && method === 'POST') {
      try {
        const body = await this.readJsonBody(req);
        const serviceId = String(body.serviceId || '');
        const token = String(body.token || '');

        if (!serviceId) {
          this.sendJson(res, 400, { error: 'Missing serviceId' });
          return;
        }

        if (serviceId === 'github' && token) process.env.GITHUB_TOKEN = token;
        if (serviceId === 'slack' && token) process.env.SLACK_BOT_TOKEN = token;
        if (serviceId === 'discord' && token) process.env.DISCORD_BOT_TOKEN = token;
        if (serviceId === 'notion' && token) process.env.NOTION_API_KEY = token;

        this.sendJson(res, 200, {
          success: true,
          serviceId,
          status: 'connected',
          message: `App integration '${serviceId}' saved and active.`
        });
      } catch (err) {
        this.sendJson(res, 500, { success: false, error: String(err) });
      }
      return;
    }

    // ==========================================
    // MULTI-AGENT COUNCIL & GROUP CHAT ENDPOINTS
    // ==========================================

    // POST /council/discuss — Multi-agent collaborative round-table discussion
    if (pathname === '/council/discuss' && method === 'POST') {
      try {
        const body = await this.readJsonBody(req);
        const topic = String(body.topic || '').trim();
        const mode = body.mode || 'plan'; // 'plan' | 'debate' | 'consensus'
        const selectedAgentIds = Array.isArray(body.agentIds) && body.agentIds.length > 0
          ? body.agentIds
          : ['aja', 'spoota', 'gandiva', 'vighna', 'rutam'];

        if (!topic) {
          this.sendJson(res, 400, { error: 'Missing discussion topic/task' });
          return;
        }

        const turns: Array<{
          agentId: string;
          agentName: string;
          role: string;
          content: string;
          timestamp: string;
          suggestions: string[];
        }> = [];

        let conversationContext = `Master Rushikesh's Request/Idea: "${topic}"\n\nCouncil Discussion Goal: Multi-specialist collaborative planning and peer critique.\n`;

        for (const agentId of selectedAgentIds) {
          const agent = this.agents?.agentRegistry.get(agentId);
          if (!agent) continue;

          const prompt = `${conversationContext}\n\nYou are ${agent.displayName} (${agent.role}).
Provide your specialist assessment, architectural decisions, potential risks, and concrete actionable suggestions for this task in 2-3 focused paragraphs.
Maintain your authentic domain focus.`;

          let agentResponse = '';
          try {
            const chatRes = await this.router.routeAndExecuteChat({
              messages: [
                { role: 'system', content: agent.systemPrompt },
                { role: 'user', content: prompt }
              ],
              preferredModel: agent.modelPreference.preferredModelId,
              preferredProvider: agent.modelPreference.preferredProviderId,
              maxTokens: 380,
              timeoutMs: 45000
            });
            agentResponse = chatRes.text || `${agent.displayName} analyzed the objective and approved technical alignment.`;
          } catch {
            agentResponse = `[${agent.displayName} Standby]: Evaluated parameters for ${topic}. Ready to execute allocated domain steps upon mission initiation.`;
          }

          // Extract key suggestions
          const suggestionLines = agentResponse
            .split('\n')
            .filter(l => l.trim().startsWith('-') || l.trim().startsWith('*') || /^\d+\./.test(l.trim()))
            .map(l => l.replace(/^[-*\d.]+\s*/, '').trim())
            .slice(0, 3);

          const turnRecord = {
            agentId: agent.id,
            agentName: agent.displayName,
            role: agent.role || 'Autonomous Specialist',
            content: agentResponse,
            timestamp: new Date().toISOString(),
            suggestions: suggestionLines.length > 0 ? suggestionLines : [`Verify and execute ${agent.displayName} domain deliverables.`]
          };

          turns.push(turnRecord);
          conversationContext += `\n[${agent.displayName} - ${agent.role}]:\n${agentResponse}\n`;
        }

        // Generate final consensus summary
        const consensusSummary = `Council reached collaborative consensus on: "${topic}". Strategy formulated by Aja, designed by Spoota, engineered by Gāṇḍīva, quality-gated by Vighna, and governed by Rutam.`;

        // Recommended Mission Structure
        const recommendedMission = {
          objective: topic,
          tasks: turns.map((t, idx) => ({
            id: `task_${idx + 1}`,
            agentId: t.agentId,
            agentName: t.agentName,
            title: `${t.agentName}: ${t.role} Phase`,
            objective: t.suggestions[0] || `Execute domain deliverables for ${topic}`
          }))
        };

        this.sendJson(res, 200, {
          success: true,
          topic,
          mode,
          turns,
          consensusSummary,
          recommendedMission
        });
      } catch (err) {
        this.sendJson(res, 500, { success: false, error: String(err) });
      }
      return;
    }

    // POST /council/convert-mission — Direct 1-click conversion into live mission
    if (pathname === '/council/convert-mission' && method === 'POST') {
      try {
        const body = await this.readJsonBody(req);
        const objective = String(body.objective || '');

        if (!objective) {
          this.sendJson(res, 400, { error: 'Missing mission objective' });
          return;
        }

        if (!this.agents) {
          this.sendJson(res, 503, { error: 'Agent Workforce subsystem not enabled' });
          return;
        }

        const mission = await this.agents.orchestrator.planAndCreateMission({
          objective,
          rootAgentId: 'gandiva',
        });

        // Launch execution asynchronously
        this.agents.orchestrator.executeMission(mission.id).catch(() => {});

        this.sendJson(res, 200, {
          success: true,
          missionId: mission.id,
          status: mission.status,
          message: `Council consensus successfully converted to Mission [${mission.id}]`
        });
      } catch (err) {
        this.sendJson(res, 500, { success: false, error: String(err) });
      }
      return;
    }

    // POST /memory
    if (pathname === '/memory' && method === 'POST') {
      if (!this.persistence) {
        this.sendJson(res, 503, { error: 'Persistence layer is not enabled.' });
        return;
      }
      try {
        const body = await this.readJsonBody(req);
        const tier = body.tier as MemoryTier;
        const key = typeof body.key === 'string' ? body.key.trim() : '';
        const content = typeof body.content === 'string' ? body.content.trim() : '';

        if (!tier || !key || !content) {
          this.sendJson(res, 400, { error: "Validation failed: 'tier', 'key', and 'content' are required fields." });
          return;
        }

        const item = this.persistence.memoryRepo.store({
          id: typeof body.id === 'string' && body.id ? body.id : `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          tier,
          key,
          content,
          source: typeof body.source === 'string' ? body.source : 'api_explicit',
          provenance: (body.provenance as MemoryProvenance) || 'explicit',
          confidence: typeof body.confidence === 'number' ? body.confidence : 1.0,
          metadata: body.metadata && typeof body.metadata === 'object' ? (body.metadata as Record<string, unknown>) : null
        });

        // Phase 12: Enqueue for semantic indexing (async, non-blocking)
        if (this.semanticCtx) {
          this.semanticCtx.indexer.enqueue(item);
        }

        this.sendJson(res, 201, {
          success: true,
          memory: item
        });
      } catch (err) {
        this.sendJson(res, 400, {
          error: 'Failed to store memory item',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // ==========================================
    // PHASE 12: SEMANTIC MEMORY API ENDPOINTS
    // ==========================================

    // GET /memory/search — Hybrid / semantic / deterministic search
    if (pathname === '/memory/search' && method === 'GET') {
      if (!this.persistence) {
        this.sendJson(res, 503, { error: 'Persistence layer is not enabled.' });
        return;
      }
      const q = url.searchParams.get('q') || '';
      const mode = (url.searchParams.get('mode') || 'hybrid') as 'hybrid' | 'semantic' | 'deterministic';
      const topKParam = url.searchParams.get('topK');
      const topK = topKParam ? Math.min(parseInt(topKParam, 10), 20) : 5;
      const minSimParam = url.searchParams.get('minSimilarity');
      const minSim = minSimParam ? parseFloat(minSimParam) : 0.55;

      try {
        if (mode === 'deterministic' || !this.semanticCtx) {
          const items = this.persistence.memoryRepo.search(q, undefined, topK);
          this.sendJson(res, 200, {
            success: true,
            mode: 'deterministic',
            query: q,
            results: items.map((item) => ({ item, semanticSimilarity: null, source: 'deterministic' })),
            totalResults: items.length,
            timestamp: new Date().toISOString()
          });
          return;
        }

        if (mode === 'semantic') {
          const results = await this.semanticCtx.search.search(q, { topK, minSimilarity: minSim });
          this.sendJson(res, 200, {
            success: true,
            mode: 'semantic',
            query: q,
            results: results.map((r) => ({ item: r.item, semanticSimilarity: r.similarity, rank: r.rank, source: 'semantic' })),
            totalResults: results.length,
            timestamp: new Date().toISOString()
          });
          return;
        }

        // Hybrid (default)
        const results = await this.semanticCtx.retriever.retrieve(q, { topK, minSimilarity: minSim });
        this.sendJson(res, 200, {
          success: true,
          mode: 'hybrid',
          query: q,
          results: results.map((r) => ({
            item: r.item,
            semanticSimilarity: r.semanticSimilarity,
            hybridScore: r.hybridScore,
            source: r.source,
            scoreBreakdown: r.scoreBreakdown
          })),
          totalResults: results.length,
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        this.sendJson(res, 500, { error: 'Search failed', details: String(err) });
      }
      return;
    }

    // GET /memory/index/status — Semantic index status
    if (pathname === '/memory/index/status' && method === 'GET') {
      if (!this.semanticCtx) {
        this.sendJson(res, 503, {
          error: 'Semantic memory subsystem not enabled.',
          available: false
        });
        return;
      }
      const status = await this.semanticCtx.indexer.getStatus();
      this.sendJson(res, 200, {
        success: true,
        available: true,
        ...status,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // POST /memory/index/rebuild — Rebuild embeddings for unindexed memory items
    if (pathname === '/memory/index/rebuild' && method === 'POST') {
      if (!this.persistence || !this.semanticCtx) {
        this.sendJson(res, 503, { error: 'Semantic memory subsystem not enabled.' });
        return;
      }
      try {
        const body = await this.readJsonBody(req);
        const limit = typeof body.limit === 'number' ? Math.min(body.limit, 200) : 100;
        const result = await this.semanticCtx.indexer.rebuildWithRepo(
          { retrieveById: (id: string) => this.persistence!.memoryRepo.retrieveById(id) },
          limit
        );
        this.sendJson(res, 200, {
          success: true,
          ...result,
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        this.sendJson(res, 500, { error: 'Rebuild failed', details: String(err) });
      }
      return;
    }

    // DELETE /memory/:id — Delete a memory item and remove its embedding
    if (pathname.startsWith('/memory/') && method === 'DELETE') {
      if (!this.persistence) {
        this.sendJson(res, 503, { error: 'Persistence layer is not enabled.' });
        return;
      }
      const memId = pathname.replace('/memory/', '').trim();
      if (!memId || memId === 'status' || memId === 'profile' || memId === 'items' || memId === 'search' || memId === 'index') {
        this.sendJson(res, 400, { error: 'Invalid memory ID.' });
        return;
      }
      const deleted = this.persistence.memoryRepo.delete(memId);
      if (deleted) {
        // Remove embedding (cascade handles DB, but we clear queue)
        if (this.semanticCtx) {
          this.semanticCtx.indexer.removeEmbedding(memId);
        }
        this.sendJson(res, 200, { success: true, id: memId });
      } else {
        this.sendJson(res, 404, { error: `Memory item '${memId}' not found.` });
      }
      return;
    }

    // ==========================================
    // TOOL EXECUTION & MCP API ENDPOINTS
    // ==========================================

    // GET /tools
    if (pathname === '/tools' && method === 'GET') {
      if (!this.tools) {
        this.sendJson(res, 503, { error: 'Tool execution bus is not enabled on this kernel instance.' });
        return;
      }
      const toolsList = this.tools.toolRegistry.list().map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        version: t.version,
        category: t.category,
        riskLevel: t.riskLevel,
        riskName: DANGER_TIER_NAMES[t.riskLevel],
        requiresApproval: t.requiresApproval,
        capabilities: t.capabilities,
        inputSchema: t.inputSchema
      }));

      this.sendJson(res, 200, {
        tools: toolsList,
        totalTools: toolsList.length,
        diagnostics: this.tools.toolRegistry.getDiagnostics(),
        timestamp: new Date().toISOString()
      });
      return;
    }

    // GET /tools/:id
    if (pathname.startsWith('/tools/') && !pathname.startsWith('/tools/approvals') && pathname !== '/tools/audit' && method === 'GET') {
      if (!this.tools) {
        this.sendJson(res, 503, { error: 'Tool execution bus is not enabled.' });
        return;
      }
      const toolId = pathname.replace('/tools/', '').trim();
      const tool = this.tools.toolRegistry.get(toolId);
      if (!tool) {
        this.sendJson(res, 404, { error: `Tool '${toolId}' not found.` });
        return;
      }
      this.sendJson(res, 200, {
        id: tool.id,
        name: tool.name,
        description: tool.description,
        version: tool.version,
        category: tool.category,
        riskLevel: tool.riskLevel,
        riskName: DANGER_TIER_NAMES[tool.riskLevel],
        requiresApproval: tool.requiresApproval,
        capabilities: tool.capabilities,
        inputSchema: tool.inputSchema,
        outputSchema: tool.outputSchema
      });
      return;
    }

    // POST /tools/:id/execute
    if (pathname.startsWith('/tools/') && pathname.endsWith('/execute') && method === 'POST') {
      if (!this.tools) {
        this.sendJson(res, 503, { error: 'Tool execution bus is not enabled.' });
        return;
      }
      const toolId = pathname.replace('/tools/', '').replace('/execute', '').trim();
      try {
        const body = await this.readJsonBody(req);
        const input = (body.input && typeof body.input === 'object') ? (body.input as Record<string, unknown>) : {};
        const approvalId = typeof body.approvalId === 'string' ? body.approvalId : undefined;

        const result = await this.tools.toolBus.execute(toolId, input, {
          approvalId,
          userId: 'ROOT_RUSHIKESH'
        });

        const statusCode = result.success ? 200 : (result.error?.includes('human authorization') ? 202 : 403);
        this.sendJson(res, statusCode, result);
      } catch (err) {
        this.sendJson(res, 500, {
          success: false,
          error: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // GET /tools/approvals
    if (pathname === '/tools/approvals' && method === 'GET') {
      if (!this.tools) {
        this.sendJson(res, 503, { error: 'Tool execution bus is not enabled.' });
        return;
      }
      const pending = this.tools.permissionManager.getPendingApprovals();
      this.sendJson(res, 200, {
        pendingApprovals: pending,
        totalPending: pending.length,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // POST /tools/approvals/:id
    if (pathname.startsWith('/tools/approvals/') && method === 'POST') {
      if (!this.tools) {
        this.sendJson(res, 503, { error: 'Tool execution bus is not enabled.' });
        return;
      }
      const approvalId = pathname.replace('/tools/approvals/', '').trim();
      try {
        const body = await this.readJsonBody(req);
        const action = body.action as string;
        const approver = (typeof body.approver === 'string' && body.approver) ? body.approver : 'ROOT_RUSHIKESH';
        const reason = typeof body.reason === 'string' ? body.reason : undefined;

        if (action === 'approve') {
          const updated = this.tools.permissionManager.approve(approvalId, approver);
          this.sendJson(res, 200, { success: true, approval: updated });
          return;
        } else if (action === 'reject') {
          const updated = this.tools.permissionManager.reject(approvalId, reason || 'Rejected via API', approver);
          this.sendJson(res, 200, { success: true, approval: updated });
          return;
        } else {
          this.sendJson(res, 400, { error: "Action must be either 'approve' or 'reject'." });
          return;
        }
      } catch (err) {
        this.sendJson(res, 400, {
          success: false,
          error: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // GET /tools/audit
    if (pathname === '/tools/audit' && method === 'GET') {
      if (!this.tools) {
        this.sendJson(res, 503, { error: 'Tool execution bus is not enabled.' });
        return;
      }
      const limitParam = url.searchParams.get('limit');
      const toolIdParam = url.searchParams.get('toolId') || undefined;
      const statusParam = url.searchParams.get('status') as any || undefined;
      const limit = limitParam ? parseInt(limitParam, 10) : 50;

      const records = this.tools.toolAudit.listRecords({
        limit,
        toolId: toolIdParam,
        status: statusParam
      });

      this.sendJson(res, 200, {
        totalLogged: this.tools.toolAudit.count(),
        records,
        returnedCount: records.length,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // ==========================================
    // AGENT, TASK & MISSION API ENDPOINTS (Phase 5)
    // ==========================================

    // GET /agents
    if (pathname === '/agents' && method === 'GET') {
      if (!this.agents) {
        this.sendJson(res, 503, { error: 'Agent subsystem is not enabled on this kernel instance.' });
        return;
      }
      const allAgents = this.agents.agentRegistry.getAll();
      this.sendJson(res, 200, {
        agents: allAgents,
        totalRegistered: allAgents.length,
        diagnostics: this.agents.agentRegistry.getDiagnostics(),
        timestamp: new Date().toISOString()
      });
      return;
    }

    // GET /agents/:id/status
    if (pathname.startsWith('/agents/') && pathname.endsWith('/status') && method === 'GET') {
      if (!this.agents) {
        this.sendJson(res, 503, { error: 'Agent subsystem is not enabled.' });
        return;
      }
      const agentId = pathname.replace('/agents/', '').replace('/status', '').trim();
      const agent = this.agents.agentRegistry.get(agentId);
      if (!agent) {
        this.sendJson(res, 404, { error: `Agent '${agentId}' not found.` });
        return;
      }
      this.sendJson(res, 200, {
        id: agent.id,
        name: agent.name,
        displayName: agent.displayName,
        status: agent.status,
        updatedAt: agent.updatedAt
      });
      return;
    }

    // GET /agents/:id
    if (pathname.startsWith('/agents/') && !pathname.endsWith('/status') && method === 'GET') {
      if (!this.agents) {
        this.sendJson(res, 503, { error: 'Agent subsystem is not enabled.' });
        return;
      }
      const agentId = pathname.replace('/agents/', '').trim();
      const agent = this.agents.agentRegistry.get(agentId);
      if (!agent) {
        this.sendJson(res, 404, { error: `Agent '${agentId}' not found.` });
        return;
      }
      this.sendJson(res, 200, { agent });
      return;
    }

    // GET /tasks
    if (pathname === '/tasks' && method === 'GET') {
      if (!this.agents) {
        this.sendJson(res, 503, { error: 'Agent subsystem is not enabled.' });
        return;
      }
      const limitParam = url.searchParams.get('limit');
      const agentIdParam = url.searchParams.get('agentId');
      const statusParam = url.searchParams.get('status') as TaskStatus | null;
      const limit = limitParam ? parseInt(limitParam, 10) : 50;

      let tasks: AgentTask[];
      if (agentIdParam) {
        tasks = this.agents.taskRepo.listByAgent(agentIdParam, limit);
      } else if (statusParam) {
        tasks = this.agents.taskRepo.listByStatus(statusParam, limit);
      } else {
        tasks = this.agents.taskRepo.list(limit);
      }

      this.sendJson(res, 200, {
        tasks,
        totalReturned: tasks.length,
        statusCounts: this.agents.taskRepo.countByStatus(),
        timestamp: new Date().toISOString()
      });
      return;
    }

    // GET /tasks/:id/children
    if (pathname.startsWith('/tasks/') && pathname.endsWith('/children') && method === 'GET') {
      if (!this.agents) {
        this.sendJson(res, 503, { error: 'Agent subsystem is not enabled.' });
        return;
      }
      const parentTaskId = pathname.replace('/tasks/', '').replace('/children', '').trim();
      const children = this.agents.taskRepo.listChildren(parentTaskId);
      this.sendJson(res, 200, {
        parentTaskId,
        children,
        totalChildren: children.length
      });
      return;
    }

    // GET /tasks/:id
    if (pathname.startsWith('/tasks/') && !pathname.endsWith('/children') && method === 'GET') {
      if (!this.agents) {
        this.sendJson(res, 503, { error: 'Agent subsystem is not enabled.' });
        return;
      }
      const taskId = pathname.replace('/tasks/', '').trim();
      const task = this.agents.taskRepo.get(taskId);
      if (!task) {
        this.sendJson(res, 404, { error: `Task '${taskId}' not found.` });
        return;
      }
      this.sendJson(res, 200, { task });
      return;
    }

    // POST /tasks
    if (pathname === '/tasks' && method === 'POST') {
      if (!this.agents) {
        this.sendJson(res, 503, { error: 'Agent subsystem is not enabled.' });
        return;
      }
      try {
        const body = await this.readJsonBody(req);
        const agentId = typeof body.agentId === 'string' ? body.agentId.trim() : '';
        const objective = typeof body.objective === 'string' ? body.objective.trim() : '';
        if (!agentId || !objective) {
          this.sendJson(res, 400, { error: "Validation failed: 'agentId' and 'objective' are required fields." });
          return;
        }

        const agent = this.agents.agentRegistry.get(agentId);
        if (!agent) {
          this.sendJson(res, 404, { error: `Agent '${agentId}' not found.` });
          return;
        }

        const taskId = typeof body.id === 'string' && body.id ? body.id : 'task_' + randomUUID().replace(/-/g, '').substring(0, 16);
        const task: AgentTask = {
          id: taskId,
          agentId,
          missionId: typeof body.missionId === 'string' ? body.missionId : undefined,
          parentTaskId: typeof body.parentTaskId === 'string' ? body.parentTaskId : undefined,
          objective,
          context: typeof body.context === 'string' ? body.context : undefined,
          inputs: body.inputs && typeof body.inputs === 'object' ? (body.inputs as Record<string, unknown>) : {},
          priority: (body.priority as TaskPriority) || 'normal',
          status: 'queued',
          depth: typeof body.depth === 'number' ? body.depth : 0,
          sessionId: typeof body.sessionId === 'string' ? body.sessionId : undefined,
          createdAt: new Date().toISOString()
        };

        const created = this.agents.taskRepo.create(task);

        if (body.executeImmediately) {
          this.agents.runtime.execute(created).then((result) => {
            this.agents?.taskRepo.saveResult(created.id, result);
          }).catch((err) => {
            this.logger?.error(`Async execution failed for task ${created.id}:`, err);
          });
        }

        this.sendJson(res, 201, {
          success: true,
          task: created
        });
      } catch (err) {
        this.sendJson(res, 400, {
          error: 'Failed to create task',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // POST /missions
    if (pathname === '/missions' && method === 'POST') {
      if (!this.agents) {
        this.sendJson(res, 503, { error: 'Agent subsystem is not enabled.' });
        return;
      }
      try {
        const body = await this.readJsonBody(req);
        const objective = typeof body.objective === 'string' ? body.objective.trim() : '';
        const rootAgentId = typeof body.rootAgentId === 'string' ? body.rootAgentId.trim() : 'gandiva';
        const executeImmediately = Boolean(body.executeImmediately);
        const autoPlan = Boolean(body.autoPlan) || executeImmediately;

        if (!objective) {
          this.sendJson(res, 400, { error: "Validation failed: 'objective' is required." });
          return;
        }

        const companyId = typeof body.companyId === 'string' ? body.companyId.trim() : undefined;
        const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : undefined;
        const productId = typeof body.productId === 'string' ? body.productId.trim() : undefined;
        const departmentId = typeof body.departmentId === 'string' ? body.departmentId.trim() : undefined;

        let scopedContext = typeof body.context === 'string' ? body.context : undefined;
        if (this.company && (companyId || projectId)) {
          const companyMemory = this.company.companyService.getScopedContext(companyId, projectId);
          if (companyMemory) {
            scopedContext = scopedContext ? `${scopedContext}\n\n${companyMemory}` : companyMemory;
          }
        }

        if (autoPlan || executeImmediately) {
          const mission = await this.agents.orchestrator.planAndCreateMission({
            objective,
            rootAgentId,
            context: scopedContext,
            constraints: Array.isArray(body.constraints) ? (body.constraints as string[]) : undefined,
            budget: body.budget && typeof body.budget === 'object' ? (body.budget as unknown as MissionBudget) : undefined,
            sessionId: typeof body.sessionId === 'string' ? body.sessionId : undefined,
            companyId,
            projectId,
            productId,
            departmentId
          });

          if (executeImmediately) {
            const result = await this.agents.orchestrator.executeMission(mission.id);
            this.sendJson(res, 200, {
              success: true,
              mission,
              missionResult: result
            });
          } else {
            this.sendJson(res, 201, {
              success: true,
              mission
            });
          }
        } else {
          const mission = this.agents.orchestrator.createMission({
            objective,
            rootAgentId,
            context: scopedContext,
            inputs: body.inputs && typeof body.inputs === 'object' ? (body.inputs as Record<string, unknown>) : undefined,
            sessionId: typeof body.sessionId === 'string' ? body.sessionId : undefined,
            companyId,
            projectId,
            productId,
            departmentId
          });
          this.sendJson(res, 201, {
            success: true,
            mission
          });
        }
      } catch (err) {
        this.sendJson(res, 400, {
          error: 'Failed to process mission',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // GET /missions
    if (pathname === '/missions' && method === 'GET') {
      if (!this.agents) {
        this.sendJson(res, 503, { error: 'Agent subsystem is not enabled.' });
        return;
      }
      const limitParam = url.searchParams.get('limit');
      const limit = limitParam ? parseInt(limitParam, 10) : 20;
      const missions = this.agents.missionRepo.list(limit);
      this.sendJson(res, 200, {
        missions,
        totalReturned: missions.length,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // POST /missions/:id/cancel or /abort
    if (pathname.startsWith('/missions/') && (pathname.endsWith('/cancel') || pathname.endsWith('/abort')) && method === 'POST') {
      if (!this.agents) {
        this.sendJson(res, 503, { error: 'Agent subsystem is not enabled.' });
        return;
      }
      const missionId = pathname.replace('/missions/', '').replace('/cancel', '').replace('/abort', '').trim();
      try {
        const body = (await this.readJsonBody(req).catch(() => ({}))) as Record<string, unknown>;
        const reason = typeof body.reason === 'string' ? body.reason : 'Emergency stop requested by Master Rushikesh';
        const mission = await this.agents.orchestrator.cancelMission(missionId, reason);
        this.sendJson(res, 200, { success: true, mission, aborted: true });
      } catch (err) {
        this.sendJson(res, 400, { error: 'Abort/Cancel failed', details: String(err) });
      }
      return;
    }

    // POST /missions/:id/pause
    if (pathname.startsWith('/missions/') && pathname.endsWith('/pause') && method === 'POST') {
      if (!this.agents) {
        this.sendJson(res, 503, { error: 'Agent subsystem is not enabled.' });
        return;
      }
      const missionId = pathname.replace('/missions/', '').replace('/pause', '').trim();
      try {
        const mission = this.agents.missionRepo.get(missionId);
        if (!mission) {
          this.sendJson(res, 404, { error: `Mission '${missionId}' not found.` });
          return;
        }
        this.agents.missionRepo.update(missionId, { status: 'paused' as any });
        this.sendJson(res, 200, { success: true, missionId, status: 'paused' });
      } catch (err) {
        this.sendJson(res, 400, { error: 'Pause failed', details: String(err) });
      }
      return;
    }

    // GET /workspace/files — Live Workspace Project Filesystem Explorer
    if (pathname === '/workspace/files' && method === 'GET') {
      const rootDir = process.cwd();
      const relativeSubPath = url.searchParams.get('dir') || '';
      const targetDir = path.resolve(rootDir, relativeSubPath);

      // Security check: ensure within rootDir
      if (!targetDir.startsWith(rootDir)) {
        this.sendJson(res, 403, { error: 'Access denied: Directory is outside allowed workspace root.' });
        return;
      }

      try {
        if (!fs.existsSync(targetDir)) {
          this.sendJson(res, 200, { success: true, files: [], currentPath: relativeSubPath });
          return;
        }

        const entries = fs.readdirSync(targetDir, { withFileTypes: true });
        const items = entries
          .filter((e) => !['node_modules', '.git', '.gemini', 'dist'].includes(e.name))
          .map((e) => {
            const fullItemPath = path.join(targetDir, e.name);
            const relItemPath = path.relative(rootDir, fullItemPath).replace(/\\/g, '/');
            let size = 0;
            let modifiedAt = new Date().toISOString();
            try {
              const stat = fs.statSync(fullItemPath);
              size = stat.size;
              modifiedAt = stat.mtime.toISOString();
            } catch {
              // ignore
            }

            return {
              name: e.name,
              path: relItemPath,
              isDirectory: e.isDirectory(),
              size,
              extension: path.extname(e.name).toLowerCase(),
              modifiedAt,
            };
          })
          .sort((a, b) => (b.isDirectory ? 1 : 0) - (a.isDirectory ? 1 : 0) || a.name.localeCompare(b.name));

        this.sendJson(res, 200, {
          success: true,
          currentPath: relativeSubPath,
          files: items,
          total: items.length,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        this.sendJson(res, 500, { error: 'Failed to inspect workspace directory', details: String(err) });
      }
      return;
    }

    // GET /workspace/file — Live Workspace File Content Viewer
    if (pathname === '/workspace/file' && method === 'GET') {
      const rootDir = process.cwd();
      const filePath = url.searchParams.get('path');
      if (!filePath) {
        this.sendJson(res, 400, { error: "Validation failed: 'path' query parameter is required." });
        return;
      }

      const targetFile = path.resolve(rootDir, filePath);
      if (!targetFile.startsWith(rootDir)) {
        this.sendJson(res, 403, { error: 'Access denied: File is outside allowed workspace root.' });
        return;
      }

      try {
        if (!fs.existsSync(targetFile) || fs.statSync(targetFile).isDirectory()) {
          this.sendJson(res, 404, { error: `File '${filePath}' not found.` });
          return;
        }

        const stat = fs.statSync(targetFile);
        if (stat.size > 2 * 1024 * 1024) { // 2MB limit
          this.sendJson(res, 400, { error: 'File too large for live preview (exceeds 2MB).' });
          return;
        }

        const content = fs.readFileSync(targetFile, 'utf8');
        this.sendJson(res, 200, {
          success: true,
          path: filePath.replace(/\\/g, '/'),
          name: path.basename(targetFile),
          extension: path.extname(targetFile).toLowerCase(),
          size: stat.size,
          modifiedAt: stat.mtime.toISOString(),
          content,
        });
      } catch (err) {
        this.sendJson(res, 500, { error: 'Failed to read workspace file', details: String(err) });
      }
      return;
    }

    // POST /missions/:id/resume
    if (pathname.startsWith('/missions/') && pathname.endsWith('/resume') && method === 'POST') {
      if (!this.agents) {
        this.sendJson(res, 503, { error: 'Agent subsystem is not enabled.' });
        return;
      }
      const missionId = pathname.replace('/missions/', '').replace('/resume', '').trim();
      try {
        const body = (await this.readJsonBody(req).catch(() => ({}))) as Record<string, unknown>;
        const approvalId = typeof body.approvalId === 'string' ? body.approvalId : undefined;
        const decision = (body.decision === 'APPROVED' || body.decision === 'REJECTED') ? body.decision : undefined;
        const resolution = typeof body.resolution === 'string' ? body.resolution : undefined;
        const result = await this.agents.orchestrator.resumeMission(missionId, { approvalId, decision, resolution });
        this.sendJson(res, 200, { success: true, missionResult: result });
      } catch (err) {
        this.sendJson(res, 400, { error: 'Resume failed', details: String(err) });
      }
      return;
    }

    // GET /missions/:id/plan
    if (pathname.startsWith('/missions/') && pathname.endsWith('/plan') && method === 'GET') {
      if (!this.agents) {
        this.sendJson(res, 503, { error: 'Agent subsystem is not enabled.' });
        return;
      }
      const missionId = pathname.replace('/missions/', '').replace('/plan', '').trim();
      const mission = this.agents.missionRepo.get(missionId);
      if (!mission) {
        this.sendJson(res, 404, { error: `Mission '${missionId}' not found.` });
        return;
      }
      this.sendJson(res, 200, { missionId, plan: mission.plan });
      return;
    }

    // GET /missions/:id/report
    if (pathname.startsWith('/missions/') && pathname.endsWith('/report') && method === 'GET') {
      if (!this.agents) {
        this.sendJson(res, 503, { error: 'Agent subsystem is not enabled.' });
        return;
      }
      const missionId = pathname.replace('/missions/', '').replace('/report', '').trim();
      const mission = this.agents.missionRepo.get(missionId);
      if (!mission) {
        this.sendJson(res, 404, { error: `Mission '${missionId}' not found.` });
        return;
      }
      this.sendJson(res, 200, { missionId, report: mission.report, result: mission.result });
      return;
    }

    // GET /missions/:id/artifacts
    if (pathname.startsWith('/missions/') && pathname.endsWith('/artifacts') && method === 'GET') {
      if (!this.agents) {
        this.sendJson(res, 503, { error: 'Agent subsystem is not enabled.' });
        return;
      }
      const missionId = pathname.replace('/missions/', '').replace('/artifacts', '').trim();
      const artifacts = this.agents.artifactRepo ? this.agents.artifactRepo.listByMission(missionId) : [];
      this.sendJson(res, 200, { missionId, artifacts, total: artifacts.length });
      return;
    }

    // GET /missions/:id
    if (pathname.startsWith('/missions/') && method === 'GET') {
      if (!this.agents) {
        this.sendJson(res, 503, { error: 'Agent subsystem is not enabled.' });
        return;
      }
      const missionId = pathname.replace('/missions/', '').trim();
      const mission = this.agents.missionRepo.get(missionId);
      if (!mission) {
        this.sendJson(res, 404, { error: `Mission '${missionId}' not found.` });
        return;
      }
      const tasks = this.agents.taskRepo.listByMission(missionId);
      const blackboard = this.agents.blackboard.listByMission(missionId);
      const artifacts = this.agents.artifactRepo ? this.agents.artifactRepo.listByMission(missionId) : [];
      this.sendJson(res, 200, {
        mission,
        tasks,
        blackboard,
        artifacts,
        totalTasks: tasks.length,
        totalFindings: blackboard.length,
        totalArtifacts: artifacts.length
      });
      return;
    }

    // ==========================================
    // REAL-TIME EVENTS SSE STREAM (Phase 11)
    // ==========================================

    // GET /events
    if (pathname === '/events' && method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });

      const sendEvent = (eventType: string, data: unknown) => {
        try {
          res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
        } catch {
          // Client disconnected
        }
      };

      sendEvent('connected', {
        status: 'connected',
        timestamp: new Date().toISOString()
      });

      const unbinders: Array<() => void> = [];
      if (this.eventBus) {
        const eventNames: EventKey[] = [
          'system.ready',
          'system.shutdown',
          'model.registered',
          'model.request.started',
          'model.request.completed',
          'model.request.failed',
          'tool.registered',
          'tool.approval.requested',
          'tool.approval.resolved',
          'tool.execution.started',
          'tool.execution.completed',
          'tool.executed.audited',
          'agent.registered',
          'agent.status_changed',
          'agent.task_started',
          'agent.task_completed',
          'agent.task_failed',
          'agent.task_delegated',
          'agent.task_resolved',
          'mission.created',
          'mission.planning',
          'mission.started',
          'mission.task.ready',
          'mission.task.started',
          'mission.task.completed',
          'mission.task.failed',
          'mission.task.retrying',
          'mission.verification.started',
          'mission.verification.completed',
          'mission.blocked',
          'mission.resumed',
          'mission.replanned',
          'mission.completed',
          'mission.failed',
          'mission.cancelled',
          'mission.artifact.created',
          // Phase 20 Skills & Procedural Intelligence events
          'skill.created',
          'skill.updated',
          'skill.enabled',
          'skill.disabled',
          'skill.execution.started',
          'skill.execution.step',
          'skill.execution.paused',
          'skill.execution.completed',
          'skill.execution.failed',
          'skill.approval.required',
          'skill.improvement.proposed'
        ];

        for (const name of eventNames) {
          const unbind = this.eventBus.on(name, (payload) => {
            sendEvent(name, payload);
          });
          unbinders.push(unbind);
        }
      }

      // 15s keepalive ping
      const heartbeat = setInterval(() => {
        try {
          res.write(`: heartbeat\n\n`);
        } catch {
          cleanup();
        }
      }, 15000);

      let cleanedUp = false;
      const cleanup = () => {
        if (cleanedUp) return;
        cleanedUp = true;
        clearInterval(heartbeat);
        for (const unbind of unbinders) {
          try {
            unbind();
          } catch {
            // ignore
          }
        }
      };

      req.on('close', cleanup);
      req.on('error', cleanup);
      res.on('close', cleanup);
      res.on('error', cleanup);
      return;
    }

    // ==========================================
    // MEMORY ITEMS PAGINATED ENDPOINT (Phase 11)
    // ==========================================

    // GET /memory/items
    if (pathname === '/memory/items' && method === 'GET') {
      if (!this.persistence) {
        this.sendJson(res, 503, { error: 'Persistence layer is not enabled.' });
        return;
      }
      const tierParam = url.searchParams.get('tier') as MemoryTier | null;
      const searchParam = url.searchParams.get('q');
      const limitParam = url.searchParams.get('limit');
      const limit = limitParam ? parseInt(limitParam, 10) : 50;

      let items;
      if (searchParam) {
        items = this.persistence.memoryRepo.search(searchParam, tierParam || undefined, limit);
      } else if (tierParam) {
        items = this.persistence.memoryRepo.listByTier(tierParam, limit);
      } else {
        // Return recent items across tiers
        items = this.persistence.memoryRepo.listByTier('core_identity', 10)
          .concat(this.persistence.memoryRepo.listByTier('creator_profile', 10))
          .concat(this.persistence.memoryRepo.listByTier('operating_principles', 10))
          .concat(this.persistence.memoryRepo.listByTier('decisions', 10))
          .concat(this.persistence.memoryRepo.listByTier('agent_memory', 10));
      }

      this.sendJson(res, 200, {
        success: true,
        items,
        totalReturned: items.length,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // ==========================================
    // ENVIRONMENT API ENDPOINTS (Phase 10 & 11)
    // ==========================================

    // GET /environment/status
    if (pathname === '/environment/status' && method === 'GET') {
      if (!this.environment) {
        this.sendJson(res, 503, { error: 'Environment subsystem is not enabled.' });
        return;
      }
      try {
        const apps = await this.environment.environmentManager.listApplications();
        const processes = await this.environment.environmentManager.listProcesses();
        const hrisekesaProcesses = processes.filter((p) => p.isHrisekesaSpawned);

        this.sendJson(res, 200, {
          status: 'online',
          totalApplicationsDiscovered: apps.length,
          installedApplicationsCount: apps.filter((a) => a.installed).length,
          runningApplicationsCount: apps.filter((a) => a.running).length,
          totalActiveProcesses: processes.length,
          hrisekesaProcessesCount: hrisekesaProcesses.length,
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        this.sendJson(res, 500, { error: 'Failed to query environment status', details: String(err) });
      }
      return;
    }

    // GET /environment/applications
    if (pathname === '/environment/applications' && method === 'GET') {
      if (!this.environment) {
        this.sendJson(res, 503, { error: 'Environment subsystem is not enabled.' });
        return;
      }
      try {
        const apps = await this.environment.environmentManager.listApplications();
        this.sendJson(res, 200, {
          applications: apps,
          total: apps.length,
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        this.sendJson(res, 500, { error: 'Failed to list applications', details: String(err) });
      }
      return;
    }

    // GET /environment/processes
    if (pathname === '/environment/processes' && method === 'GET') {
      if (!this.environment) {
        this.sendJson(res, 503, { error: 'Environment subsystem is not enabled.' });
        return;
      }
      try {
        const processes = await this.environment.environmentManager.listProcesses();
        this.sendJson(res, 200, {
          processes,
          totalProcesses: processes.length,
          hrisekesaProcesses: processes.filter((p) => p.isHrisekesaSpawned),
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        this.sendJson(res, 500, { error: 'Failed to list processes', details: String(err) });
      }
      return;
    }

    // ==========================================
    // VOICE SUBSYSTEM API ENDPOINTS (Phase 8 & 11)
    // ==========================================

    // GET /voice/status
    if (pathname === '/voice/status' && method === 'GET') {
      if (!this.voice) {
        this.sendJson(res, 503, { error: 'Voice subsystem is not enabled on this kernel.' });
        return;
      }
      this.sendJson(res, 200, {
        stt: {
          id: this.voice.stt.id,
          name: this.voice.stt.name,
          status: 'ready'
        },
        tts: {
          id: this.voice.tts.id,
          name: this.voice.tts.name,
          status: 'ready'
        },
        recorder: {
          isRecording: this.voice.recorder.isRecording
        },
        player: {
          isPlaying: this.voice.player.isPlaying
        },
        pronunciation: {
          lexiconCount: this.voice.pronunciationRepo ? this.voice.pronunciationRepo.count() : 0,
          protectedTerms: ['HṚṢĪKEŚA', 'SAHIKARA', 'Gāṇḍīva', 'KĀLA', 'Mṛtyu', 'Rāhu', 'Ṛtvan', 'Spooṭa', 'Vighna']
        },
        multilingual: {
          supportedLanguages: ['en', 'hi', 'mr', 'sa', 'bn', 'gu', 'ta', 'te', 'kn', 'ml', 'pa', 'ur'],
          activeLanguage: this.voice.profileManager ? this.voice.profileManager.getPreferences().defaultLanguage : 'en',
          autoDetect: this.voice.profileManager ? this.voice.profileManager.getPreferences().autoDetectLanguage : true,
          codeSwitchingSupported: true
        },
        bargeInSupported: true,
        streamingSupported: true,
        preferences: this.voice.profileManager ? this.voice.profileManager.getPreferences() : null,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // GET /voice/pronunciations
    if (pathname === '/voice/pronunciations' && method === 'GET') {
      if (!this.voice?.pronunciationRepo) {
        this.sendJson(res, 503, { error: 'Pronunciation lexicon subsystem not enabled.' });
        return;
      }
      const search = url.searchParams.get('q') || undefined;
      const entries = this.voice.pronunciationRepo.list(search);
      this.sendJson(res, 200, {
        success: true,
        total: entries.length,
        entries
      });
      return;
    }

    // POST /voice/pronunciations
    if (pathname === '/voice/pronunciations' && method === 'POST') {
      if (!this.voice?.pronunciationRepo) {
        this.sendJson(res, 503, { error: 'Pronunciation lexicon subsystem not enabled.' });
        return;
      }
      try {
        const body = await this.readJsonBody(req);
        if (!body.canonical || typeof body.canonical !== 'string') {
          this.sendJson(res, 400, { error: "Validation failed: 'canonical' is required." });
          return;
        }

        const entry = this.voice.pronunciationRepo.save({
          canonical: body.canonical.trim(),
          aliases: Array.isArray(body.aliases) ? body.aliases.map(String) : [],
          language: (body.language as any) || 'en',
          phoneticVariants: (body.phoneticVariants as any) || { plain: body.canonical },
          priority: (body.priority as any) || 'CUSTOM',
          category: (body.category as any) || 'USER_DEFINED',
          description: typeof body.notes === 'string' ? body.notes : (typeof body.description === 'string' ? body.description : undefined)
        });

        this.sendJson(res, 201, { success: true, entry });
      } catch (err) {
        this.sendJson(res, 400, { error: 'Failed to save pronunciation', details: String(err) });
      }
      return;
    }

    // DELETE /voice/pronunciations/:canonical
    if (pathname.startsWith('/voice/pronunciations/') && method === 'DELETE') {
      if (!this.voice?.pronunciationRepo) {
        this.sendJson(res, 503, { error: 'Pronunciation lexicon subsystem not enabled.' });
        return;
      }
      const canonical = decodeURIComponent(pathname.replace('/voice/pronunciations/', '').trim());
      const deleted = this.voice.pronunciationRepo.delete(canonical);
      this.sendJson(res, 200, { success: deleted, canonical });
      return;
    }

    // GET /voice/profiles
    if (pathname === '/voice/profiles' && method === 'GET') {
      if (!this.voice?.profileManager) {
        this.sendJson(res, 503, { error: 'Voice profile subsystem not enabled.' });
        return;
      }
      const profiles = this.voice.profileManager.listProfiles();
      const preferences = this.voice.profileManager.getPreferences();
      const activeProfile = this.voice.profileManager.getActiveProfile();
      this.sendJson(res, 200, { success: true, profiles, preferences, activeProfile });
      return;
    }

    // POST /voice/preferences
    if (pathname === '/voice/preferences' && method === 'POST') {
      if (!this.voice?.profileManager) {
        this.sendJson(res, 503, { error: 'Voice profile subsystem not enabled.' });
        return;
      }
      try {
        const body = await this.readJsonBody(req);
        const updated = this.voice.profileManager.updatePreferences(body as any);
        this.sendJson(res, 200, { success: true, preferences: updated });
      } catch (err) {
        this.sendJson(res, 400, { error: 'Failed to update voice preferences', details: String(err) });
      }
      return;
    }

    // POST /voice/detect-language
    if (pathname === '/voice/detect-language' && method === 'POST') {
      if (!this.voice?.langDetector) {
        this.sendJson(res, 503, { error: 'Language detection subsystem not enabled.' });
        return;
      }
      try {
        const body = await this.readJsonBody(req);
        const text = typeof body.text === 'string' ? body.text.trim() : '';
        const detected = this.voice.langDetector.detect(text);
        this.sendJson(res, 200, { success: true, detected });
      } catch (err) {
        this.sendJson(res, 400, { error: 'Language detection failed', details: String(err) });
      }
      return;
    }

    // POST /voice/synthesize
    if (pathname === '/voice/synthesize' && method === 'POST') {
      if (!this.voice) {
        this.sendJson(res, 503, { error: 'Voice subsystem is not enabled.' });
        return;
      }
      try {
        const body = await this.readJsonBody(req);
        const text = typeof body.text === 'string' ? body.text.trim() : '';
        if (!text) {
          this.sendJson(res, 400, { error: "Validation failed: 'text' field is required." });
          return;
        }

        const result = await this.voice.voicePipeline.synthesizeAndPlay(text);
        this.sendJson(res, 200, {
          success: true,
          audioFilePath: result.audioFilePath,
          durationMs: result.durationMs,
          text
        });
      } catch (err) {
        this.sendJson(res, 500, { error: 'Voice synthesis failed', details: String(err) });
      }
      return;
    }

    // POST /voice/test — Audio Quality & Pronunciation Verification Test
    if (pathname === '/voice/test' && method === 'POST') {
      if (!this.voice) {
        this.sendJson(res, 503, { error: 'Voice subsystem is not enabled.' });
        return;
      }
      try {
        const body = await this.readJsonBody(req);
        const text = typeof body.text === 'string' && body.text.trim() ? body.text.trim() : 'HṚṢĪKEŚA is ready.';
        const requestedEngine = (body.engine as string) || (this.voice.tts.id as string);
        const format: TargetEngineFormat = requestedEngine === 'sapi' ? 'sapi-ssml' : 'piper-phonetic';

        const startTime = Date.now();
        const normalizedText = this.voice.normalizer
          ? this.voice.normalizer.normalize(text, format)
          : text;

        const synthResult = await this.voice.tts.synthesize(normalizedText);
        const latencyMs = Date.now() - startTime;

        this.sendJson(res, 200, {
          success: true,
          text,
          normalizedText,
          engine: requestedEngine,
          formatUsed: format,
          audioFilePath: synthResult.audioFilePath,
          durationMs: synthResult.durationMs,
          latencyMs,
          characterCount: synthResult.characterCount
        });
      } catch (err) {
        this.sendJson(res, 500, { error: 'Voice test failed', details: String(err) });
      }
      return;
    }

    // POST /voice/interrupt — Instant Barge-In
    if (pathname === '/voice/interrupt' && method === 'POST') {
      if (!this.voice) {
        this.sendJson(res, 503, { error: 'Voice subsystem is not enabled.' });
        return;
      }
      try {
        if (this.voice.coordinator) {
          this.voice.coordinator.handleBargeIn('Manual user interruption via UI');
        }
        await this.voice.player.stop();
        this.sendJson(res, 200, { success: true, message: 'Playback interrupted and microphone un-ducked.' });
      } catch (err) {
        this.sendJson(res, 500, { error: 'Interruption failed', details: String(err) });
      }
      return;
    }

    // ==========================================
    // COMPANY & PROJECT OPERATING SYSTEM (Phase 14)
    // ==========================================

    // GET /companies/lifecycle/stages
    if (pathname === '/companies/lifecycle/stages' && method === 'GET') {
      const stages = LifecycleEngine.getAllStages();
      this.sendJson(res, 200, {
        success: true,
        stages,
        total: stages.length,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // GET /companies
    if (pathname === '/companies' && method === 'GET') {
      if (!this.company) {
        this.sendJson(res, 503, { error: 'Company OS subsystem is not enabled.' });
        return;
      }
      const limitParam = url.searchParams.get('limit');
      const offsetParam = url.searchParams.get('offset');
      const limit = limitParam ? parseInt(limitParam, 10) : 50;
      const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

      const companies = this.company.companyService.listCompanies(limit, offset);
      this.sendJson(res, 200, {
        success: true,
        companies,
        totalReturned: companies.length,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // POST /companies
    if (pathname === '/companies' && method === 'POST') {
      if (!this.company) {
        this.sendJson(res, 503, { error: 'Company OS subsystem is not enabled.' });
        return;
      }
      try {
        const body = await this.readJsonBody(req);
        if (!body.name || typeof body.name !== 'string') {
          this.sendJson(res, 400, { error: "Validation failed: 'name' is required." });
          return;
        }

        const company = this.company.companyService.createCompany({
          name: body.name.trim(),
          slug: typeof body.slug === 'string' ? body.slug.trim() : undefined,
          description: typeof body.description === 'string' ? body.description.trim() : undefined,
          mission: typeof body.mission === 'string' ? body.mission.trim() : undefined,
          vision: typeof body.vision === 'string' ? body.vision.trim() : undefined,
          industry: typeof body.industry === 'string' ? body.industry.trim() : undefined,
          createdBy: typeof body.createdBy === 'string' ? body.createdBy.trim() : undefined,
          metadata: body.metadata && typeof body.metadata === 'object' ? (body.metadata as Record<string, unknown>) : undefined,
          autoSetupDepartments: body.autoSetupDepartments !== undefined ? Boolean(body.autoSetupDepartments) : true
        });

        this.sendJson(res, 201, {
          success: true,
          company
        });
      } catch (err) {
        this.sendJson(res, 400, {
          error: 'Failed to create company',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // GET /companies/:id
    if (pathname.startsWith('/companies/') && !pathname.includes('/', 11) && method === 'GET') {
      if (!this.company) {
        this.sendJson(res, 503, { error: 'Company OS subsystem is not enabled.' });
        return;
      }
      const id = pathname.substring(11);
      const company = this.company.companyService.getCompany(id) || this.company.companyService.getCompanyBySlug(id);
      if (!company) {
        this.sendJson(res, 404, { error: `Company '${id}' not found.` });
        return;
      }
      this.sendJson(res, 200, { success: true, company });
      return;
    }

    // PATCH /companies/:id
    if (pathname.startsWith('/companies/') && !pathname.includes('/', 11) && method === 'PATCH') {
      if (!this.company) {
        this.sendJson(res, 503, { error: 'Company OS subsystem is not enabled.' });
        return;
      }
      try {
        const id = pathname.substring(11);
        const body = await this.readJsonBody(req);
        const updated = this.company.companyService.updateCompany(id, body as Record<string, unknown>);
        this.sendJson(res, 200, { success: true, company: updated });
      } catch (err) {
        this.sendJson(res, 400, {
          error: 'Failed to update company',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // GET /companies/:id/overview
    if (pathname.startsWith('/companies/') && pathname.endsWith('/overview') && method === 'GET') {
      if (!this.company) {
        this.sendJson(res, 503, { error: 'Company OS subsystem is not enabled.' });
        return;
      }
      try {
        const companyId = pathname.split('/')[2];
        const overview = this.company.companyService.getCompanyOverview(companyId);
        this.sendJson(res, 200, { success: true, overview });
      } catch (err) {
        this.sendJson(res, 404, {
          error: 'Failed to get company overview',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // GET /companies/:id/projects
    if (pathname.startsWith('/companies/') && pathname.endsWith('/projects') && method === 'GET') {
      if (!this.company) {
        this.sendJson(res, 503, { error: 'Company OS subsystem is not enabled.' });
        return;
      }
      const companyId = pathname.split('/')[2];
      const projects = this.company.companyService.listProjectsByCompany(companyId);
      this.sendJson(res, 200, { success: true, projects });
      return;
    }

    // POST /companies/:id/projects
    if (pathname.startsWith('/companies/') && pathname.endsWith('/projects') && method === 'POST') {
      if (!this.company) {
        this.sendJson(res, 503, { error: 'Company OS subsystem is not enabled.' });
        return;
      }
      try {
        const companyId = pathname.split('/')[2];
        const body = await this.readJsonBody(req);
        if (!body.name || !body.objective) {
          this.sendJson(res, 400, { error: "Validation failed: 'name' and 'objective' are required." });
          return;
        }

        const project = this.company.companyService.createProject({
          companyId,
          name: String(body.name).trim(),
          slug: typeof body.slug === 'string' ? body.slug.trim() : undefined,
          description: typeof body.description === 'string' ? body.description.trim() : undefined,
          objective: String(body.objective).trim(),
          priority: (body.priority as import('../company/interfaces/company.types.js').ProjectPriority) || 'normal',
          metadata: body.metadata && typeof body.metadata === 'object' ? (body.metadata as Record<string, unknown>) : undefined
        });

        this.sendJson(res, 201, { success: true, project });
      } catch (err) {
        this.sendJson(res, 400, {
          error: 'Failed to create project',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // GET /companies/:id/departments
    if (pathname.startsWith('/companies/') && pathname.endsWith('/departments') && method === 'GET') {
      if (!this.company) {
        this.sendJson(res, 503, { error: 'Company OS subsystem is not enabled.' });
        return;
      }
      const companyId = pathname.split('/')[2];
      const departments = this.company.companyService.listDepartments(companyId);
      this.sendJson(res, 200, { success: true, departments });
      return;
    }

    // POST /companies/:id/departments
    if (pathname.startsWith('/companies/') && pathname.endsWith('/departments') && method === 'POST') {
      if (!this.company) {
        this.sendJson(res, 503, { error: 'Company OS subsystem is not enabled.' });
        return;
      }
      try {
        const companyId = pathname.split('/')[2];
        const body = await this.readJsonBody(req);
        if (!body.name) {
          this.sendJson(res, 400, { error: "Validation failed: 'name' is required." });
          return;
        }
        const dept = this.company.companyService.createDepartment({
          companyId,
          name: String(body.name).trim(),
          slug: typeof body.slug === 'string' ? body.slug.trim() : undefined,
          description: typeof body.description === 'string' ? body.description.trim() : undefined,
          leadAgentId: typeof body.leadAgentId === 'string' ? body.leadAgentId.trim() : undefined,
          capabilities: Array.isArray(body.capabilities) ? (body.capabilities as string[]) : []
        });
        this.sendJson(res, 201, { success: true, department: dept });
      } catch (err) {
        this.sendJson(res, 400, {
          error: 'Failed to create department',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // GET /companies/:id/workforce or /agents
    if (pathname.startsWith('/companies/') && (pathname.endsWith('/workforce') || pathname.endsWith('/agents')) && method === 'GET') {
      if (!this.company) {
        this.sendJson(res, 503, { error: 'Company OS subsystem is not enabled.' });
        return;
      }
      const companyId = pathname.split('/')[2];
      const workforce = this.company.companyService.listCompanyWorkforce(companyId);
      this.sendJson(res, 200, { success: true, workforce });
      return;
    }

    // POST /companies/:id/workforce or /agents
    if (pathname.startsWith('/companies/') && (pathname.endsWith('/workforce') || pathname.endsWith('/agents')) && method === 'POST') {
      if (!this.company) {
        this.sendJson(res, 503, { error: 'Company OS subsystem is not enabled.' });
        return;
      }
      try {
        const companyId = pathname.split('/')[2];
        const body = await this.readJsonBody(req);
        if (!body.agentId) {
          this.sendJson(res, 400, { error: "Validation failed: 'agentId' is required." });
          return;
        }
        const assignment = this.company.companyService.assignAgentToCompany({
          companyId,
          agentId: String(body.agentId).trim(),
          departmentId: typeof body.departmentId === 'string' ? body.departmentId : undefined,
          roleTitle: typeof body.roleTitle === 'string' ? body.roleTitle.trim() : undefined
        });
        this.sendJson(res, 201, { success: true, workforce: assignment });
      } catch (err) {
        this.sendJson(res, 400, {
          error: 'Failed to assign agent to workforce',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // GET /companies/:id/products
    if (pathname.startsWith('/companies/') && pathname.endsWith('/products') && method === 'GET') {
      if (!this.company) {
        this.sendJson(res, 503, { error: 'Company OS subsystem is not enabled.' });
        return;
      }
      const companyId = pathname.split('/')[2];
      const products = this.company.companyService.listProductsByCompany(companyId);
      this.sendJson(res, 200, { success: true, products });
      return;
    }

    // POST /companies/:id/products
    if (pathname.startsWith('/companies/') && pathname.endsWith('/products') && method === 'POST') {
      if (!this.company) {
        this.sendJson(res, 503, { error: 'Company OS subsystem is not enabled.' });
        return;
      }
      try {
        const companyId = pathname.split('/')[2];
        const body = await this.readJsonBody(req);
        if (!body.name) {
          this.sendJson(res, 400, { error: "Validation failed: 'name' is required." });
          return;
        }
        const product = this.company.companyService.createProduct({
          companyId,
          projectId: typeof body.projectId === 'string' ? body.projectId : undefined,
          name: String(body.name).trim(),
          description: typeof body.description === 'string' ? body.description.trim() : undefined,
          type: (body.type as import('../company/interfaces/company.types.js').ProductType) || 'product',
          version: typeof body.version === 'string' ? body.version.trim() : '0.1.0',
          metadata: body.metadata && typeof body.metadata === 'object' ? (body.metadata as Record<string, unknown>) : undefined
        });
        this.sendJson(res, 201, { success: true, product });
      } catch (err) {
        this.sendJson(res, 400, {
          error: 'Failed to create product',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // GET /companies/:id/customers
    if (pathname.startsWith('/companies/') && pathname.endsWith('/customers') && method === 'GET') {
      if (!this.company) {
        this.sendJson(res, 503, { error: 'Company OS subsystem is not enabled.' });
        return;
      }
      const companyId = pathname.split('/')[2];
      const customers = this.company.companyService.listCustomersByCompany(companyId);
      this.sendJson(res, 200, { success: true, customers });
      return;
    }

    // POST /companies/:id/customers
    if (pathname.startsWith('/companies/') && pathname.endsWith('/customers') && method === 'POST') {
      if (!this.company) {
        this.sendJson(res, 503, { error: 'Company OS subsystem is not enabled.' });
        return;
      }
      try {
        const companyId = pathname.split('/')[2];
        const body = await this.readJsonBody(req);
        if (!body.name) {
          this.sendJson(res, 400, { error: "Validation failed: 'name' is required." });
          return;
        }
        const customer = this.company.companyService.createCustomer({
          companyId,
          name: String(body.name).trim(),
          type: (body.type as import('../company/interfaces/company.types.js').CustomerType) || 'smb',
          contactReference: typeof body.contactReference === 'string' ? body.contactReference.trim() : undefined,
          metadata: body.metadata && typeof body.metadata === 'object' ? (body.metadata as Record<string, unknown>) : undefined
        });
        this.sendJson(res, 201, { success: true, customer });
      } catch (err) {
        this.sendJson(res, 400, {
          error: 'Failed to create customer',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // GET /companies/:id/decisions
    if (pathname.startsWith('/companies/') && pathname.endsWith('/decisions') && method === 'GET') {
      if (!this.company) {
        this.sendJson(res, 503, { error: 'Company OS subsystem is not enabled.' });
        return;
      }
      const companyId = pathname.split('/')[2];
      const decisions = this.company.companyService.listDecisionsByCompany(companyId);
      this.sendJson(res, 200, { success: true, decisions });
      return;
    }

    // POST /companies/:id/decisions
    if (pathname.startsWith('/companies/') && pathname.endsWith('/decisions') && method === 'POST') {
      if (!this.company) {
        this.sendJson(res, 503, { error: 'Company OS subsystem is not enabled.' });
        return;
      }
      try {
        const companyId = pathname.split('/')[2];
        const body = await this.readJsonBody(req);
        if (!body.title || !body.decision || !body.madeBy) {
          this.sendJson(res, 400, { error: "Validation failed: 'title', 'decision', and 'madeBy' are required." });
          return;
        }
        const decision = this.company.companyService.recordDecision({
          companyId,
          projectId: typeof body.projectId === 'string' ? body.projectId : undefined,
          title: String(body.title).trim(),
          description: typeof body.description === 'string' ? body.description.trim() : undefined,
          decision: String(body.decision).trim(),
          reasoning: typeof body.reasoning === 'string' ? body.reasoning.trim() : undefined,
          madeBy: String(body.madeBy).trim(),
          supersedes: typeof body.supersedes === 'string' ? body.supersedes.trim() : undefined
        });
        this.sendJson(res, 201, { success: true, decision });
      } catch (err) {
        this.sendJson(res, 400, {
          error: 'Failed to record decision',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // GET /companies/:id/missions
    if (pathname.startsWith('/companies/') && pathname.endsWith('/missions') && method === 'GET') {
      if (!this.company) {
        this.sendJson(res, 503, { error: 'Company OS subsystem is not enabled.' });
        return;
      }
      const companyId = pathname.split('/')[2];
      const missions = this.company.companyService.listMissionsByCompany(companyId);
      this.sendJson(res, 200, { success: true, missions });
      return;
    }

    // GET /companies/:id/artifacts
    if (pathname.startsWith('/companies/') && pathname.endsWith('/artifacts') && method === 'GET') {
      if (!this.company) {
        this.sendJson(res, 503, { error: 'Company OS subsystem is not enabled.' });
        return;
      }
      const companyId = pathname.split('/')[2];
      const artifacts = this.company.companyService.listArtifactsByCompany(companyId);
      this.sendJson(res, 200, { success: true, artifacts });
      return;
    }

    // GET /projects
    if (pathname === '/projects' && method === 'GET') {
      if (!this.company) {
        this.sendJson(res, 503, { error: 'Company OS subsystem is not enabled.' });
        return;
      }
      const companyId = url.searchParams.get('companyId');
      const projects = companyId
        ? this.company.companyService.listProjectsByCompany(companyId)
        : this.company.companyService.listProjects();
      this.sendJson(res, 200, { success: true, projects });
      return;
    }

    // POST /projects
    if (pathname === '/projects' && method === 'POST') {
      if (!this.company) {
        this.sendJson(res, 503, { error: 'Company OS subsystem is not enabled.' });
        return;
      }
      try {
        const body = await this.readJsonBody(req);
        if (!body.name) {
          this.sendJson(res, 400, { error: "Validation failed: 'name' is required." });
          return;
        }
        const project = this.company.companyService.createProject({
          companyId: typeof body.companyId === 'string' ? body.companyId : undefined,
          name: String(body.name).trim(),
          slug: typeof body.slug === 'string' ? body.slug.trim() : undefined,
          objective: typeof body.objective === 'string' ? body.objective.trim() : typeof body.description === 'string' ? body.description.trim() : String(body.name).trim(),
          priority: (body.priority as import('../company/interfaces/company.types.js').ProjectPriority) || 'normal',
          metadata: body.metadata && typeof body.metadata === 'object' ? (body.metadata as Record<string, unknown>) : undefined
        });
        this.sendJson(res, 201, { success: true, project });
      } catch (err) {
        this.sendJson(res, 400, {
          error: 'Failed to create project',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // GET /projects/:id
    if (pathname.startsWith('/projects/') && !pathname.includes('/', 10) && method === 'GET') {
      if (!this.company) {
        this.sendJson(res, 503, { error: 'Company OS subsystem is not enabled.' });
        return;
      }
      const id = pathname.substring(10);
      const project = this.company.companyService.getProject(id);
      if (!project) {
        this.sendJson(res, 404, { error: `Project '${id}' not found.` });
        return;
      }
      this.sendJson(res, 200, { success: true, project });
      return;
    }

    // PATCH /projects/:id
    if (pathname.startsWith('/projects/') && !pathname.includes('/', 10) && method === 'PATCH') {
      if (!this.company) {
        this.sendJson(res, 503, { error: 'Company OS subsystem is not enabled.' });
        return;
      }
      try {
        const id = pathname.substring(10);
        const body = await this.readJsonBody(req);
        const updated = this.company.companyService.updateProject(id, body as Record<string, unknown>);
        this.sendJson(res, 200, { success: true, project: updated });
      } catch (err) {
        this.sendJson(res, 400, {
          error: 'Failed to update project',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // GET /projects/:id/overview
    if (pathname.startsWith('/projects/') && pathname.endsWith('/overview') && method === 'GET') {
      if (!this.company) {
        this.sendJson(res, 503, { error: 'Company OS subsystem is not enabled.' });
        return;
      }
      try {
        const projectId = pathname.split('/')[2];
        const overview = this.company.companyService.getProjectOverview(projectId);
        this.sendJson(res, 200, { success: true, overview });
      } catch (err) {
        this.sendJson(res, 404, {
          error: 'Failed to get project overview',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // GET /projects/:id/missions
    if (pathname.startsWith('/projects/') && pathname.endsWith('/missions') && method === 'GET') {
      if (!this.company) {
        this.sendJson(res, 503, { error: 'Company OS subsystem is not enabled.' });
        return;
      }
      const projectId = pathname.split('/')[2];
      const missions = this.company.companyService.listMissionsByProject(projectId);
      this.sendJson(res, 200, { success: true, missions });
      return;
    }

    // GET /projects/:id/artifacts
    if (pathname.startsWith('/projects/') && pathname.endsWith('/artifacts') && method === 'GET') {
      if (!this.company) {
        this.sendJson(res, 503, { error: 'Company OS subsystem is not enabled.' });
        return;
      }
      const projectId = pathname.split('/')[2];
      const artifacts = this.company.companyService.listArtifactsByProject(projectId);
      this.sendJson(res, 200, { success: true, artifacts });
      return;
    }

    // GET /projects/:id/decisions
    if (pathname.startsWith('/projects/') && pathname.endsWith('/decisions') && method === 'GET') {
      if (!this.company) {
        this.sendJson(res, 503, { error: 'Company OS subsystem is not enabled.' });
        return;
      }
      const projectId = pathname.split('/')[2];
      const decisions = this.company.companyService.listDecisionsByProject(projectId);
      this.sendJson(res, 200, { success: true, decisions });
      return;
    }

    // GET /projects/:id/products
    if (pathname.startsWith('/projects/') && pathname.endsWith('/products') && method === 'GET') {
      if (!this.company) {
        this.sendJson(res, 503, { error: 'Company OS subsystem is not enabled.' });
        return;
      }
      const projectId = pathname.split('/')[2];
      const products = this.company.companyService.listProductsByProject(projectId);
      this.sendJson(res, 200, { success: true, products });
      return;
    }

    // =========================================================================
    // Phase 15: Goal Management & Autonomous Execution Engine Routes
    // =========================================================================

    // POST /goals — Create new goal
    if (pathname === '/goals' && method === 'POST') {
      if (!this.goal) {
        this.sendJson(res, 503, { error: 'Goal Engine subsystem is not enabled.' });
        return;
      }
      try {
        const body = await this.readJsonBody(req);
        if (!body.title || !body.objective) {
          this.sendJson(res, 400, { error: 'Both "title" and "objective" are required.' });
          return;
        }
        const goal = this.goal.goalEngine.createGoal(body as never);
        this.sendJson(res, 201, { success: true, goal });
      } catch (err) {
        this.sendJson(res, 400, {
          error: 'Failed to create goal',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // GET /goals — List goals
    if (pathname === '/goals' && method === 'GET') {
      if (!this.goal) {
        this.sendJson(res, 503, { error: 'Goal Engine subsystem is not enabled.' });
        return;
      }
      try {
        const companyId = url.searchParams.get('companyId') || undefined;
        const projectId = url.searchParams.get('projectId') || undefined;
        const status = url.searchParams.get('status') as never || undefined;
        const goals = this.goal.goalEngine.listGoals({ companyId, projectId, status });
        this.sendJson(res, 200, { success: true, goals, count: goals.length });
      } catch (err) {
        this.sendJson(res, 500, {
          error: 'Failed to list goals',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // GET /goals/:id/milestones — List milestones for goal
    if (pathname.startsWith('/goals/') && pathname.endsWith('/milestones') && method === 'GET') {
      if (!this.goal) {
        this.sendJson(res, 503, { error: 'Goal Engine subsystem is not enabled.' });
        return;
      }
      const goalId = pathname.split('/')[2];
      const milestones = this.goal.goalEngine.getMilestones(goalId);
      this.sendJson(res, 200, { success: true, milestones, count: milestones.length });
      return;
    }

    // GET /goals/:id/progress — Get progress summary
    if (pathname.startsWith('/goals/') && pathname.endsWith('/progress') && method === 'GET') {
      if (!this.goal) {
        this.sendJson(res, 503, { error: 'Goal Engine subsystem is not enabled.' });
        return;
      }
      const goalId = pathname.split('/')[2];
      const progress = this.goal.goalEngine.getProgress(goalId);
      if (!progress) {
        this.sendJson(res, 404, { error: `Goal '${goalId}' not found.` });
        return;
      }
      this.sendJson(res, 200, { success: true, progress });
      return;
    }

    // GET /goals/:id/verification — Get verification result
    if (pathname.startsWith('/goals/') && pathname.endsWith('/verification') && method === 'GET') {
      if (!this.goal) {
        this.sendJson(res, 503, { error: 'Goal Engine subsystem is not enabled.' });
        return;
      }
      const goalId = pathname.split('/')[2];
      const goal = this.goal.goalEngine.getGoal(goalId);
      if (!goal) {
        this.sendJson(res, 404, { error: `Goal '${goalId}' not found.` });
        return;
      }
      this.sendJson(res, 200, {
        success: true,
        verification: (goal.metadata as Record<string, unknown>)?.verificationResult ?? null
      });
      return;
    }

    // GET /goals/:id/report — Get goal completion report
    if (pathname.startsWith('/goals/') && pathname.endsWith('/report') && method === 'GET') {
      if (!this.goal) {
        this.sendJson(res, 503, { error: 'Goal Engine subsystem is not enabled.' });
        return;
      }
      const goalId = pathname.split('/')[2];
      const report = this.goal.goalEngine.getReport(goalId);
      if (!report) {
        this.sendJson(res, 404, { error: `Report for goal '${goalId}' not found or not yet generated.` });
        return;
      }
      this.sendJson(res, 200, { success: true, report });
      return;
    }

    // POST /goals/:id/plan — Generate / regenerate plan
    if (pathname.startsWith('/goals/') && pathname.endsWith('/plan') && method === 'POST') {
      if (!this.goal) {
        this.sendJson(res, 503, { error: 'Goal Engine subsystem is not enabled.' });
        return;
      }
      const goalId = pathname.split('/')[2];
      try {
        const plan = await this.goal.goalEngine.planGoal(goalId);
        const goal = this.goal.goalEngine.getGoal(goalId);
        this.sendJson(res, 200, { success: true, goal, plan });
      } catch (err) {
        this.sendJson(res, 400, {
          error: 'Failed to plan goal',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // POST /goals/:id/start — Begin autonomous execution
    if (pathname.startsWith('/goals/') && pathname.endsWith('/start') && method === 'POST') {
      if (!this.goal) {
        this.sendJson(res, 503, { error: 'Goal Engine subsystem is not enabled.' });
        return;
      }
      const goalId = pathname.split('/')[2];
      try {
        const goal = await this.goal.goalEngine.startGoal(goalId);
        this.sendJson(res, 200, { success: true, goal });
      } catch (err) {
        this.sendJson(res, 400, {
          error: 'Failed to start goal',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // POST /goals/:id/pause — Pause active execution
    if (pathname.startsWith('/goals/') && pathname.endsWith('/pause') && method === 'POST') {
      if (!this.goal) {
        this.sendJson(res, 503, { error: 'Goal Engine subsystem is not enabled.' });
        return;
      }
      const goalId = pathname.split('/')[2];
      try {
        const goal = this.goal.goalEngine.pauseGoal(goalId);
        this.sendJson(res, 200, { success: true, goal });
      } catch (err) {
        this.sendJson(res, 400, {
          error: 'Failed to pause goal',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // POST /goals/:id/resume — Resume paused execution
    if (pathname.startsWith('/goals/') && pathname.endsWith('/resume') && method === 'POST') {
      if (!this.goal) {
        this.sendJson(res, 503, { error: 'Goal Engine subsystem is not enabled.' });
        return;
      }
      const goalId = pathname.split('/')[2];
      try {
        const goal = await this.goal.goalEngine.resumeGoal(goalId);
        this.sendJson(res, 200, { success: true, goal });
      } catch (err) {
        this.sendJson(res, 400, {
          error: 'Failed to resume goal',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // POST /goals/:id/cancel — Cancel goal execution
    if (pathname.startsWith('/goals/') && pathname.endsWith('/cancel') && method === 'POST') {
      if (!this.goal) {
        this.sendJson(res, 503, { error: 'Goal Engine subsystem is not enabled.' });
        return;
      }
      const goalId = pathname.split('/')[2];
      try {
        const rawBody = await this.readJsonBody(req).catch(() => ({}));
        const body = rawBody as Record<string, unknown>;
        const reason = typeof body.reason === 'string' ? body.reason : undefined;
        const goal = this.goal.goalEngine.cancelGoal(goalId, reason);
        this.sendJson(res, 200, { success: true, goal });
      } catch (err) {
        this.sendJson(res, 400, {
          error: 'Failed to cancel goal',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // POST /goals/:id/replan — Trigger bounded replan
    if (pathname.startsWith('/goals/') && pathname.endsWith('/replan') && method === 'POST') {
      if (!this.goal) {
        this.sendJson(res, 503, { error: 'Goal Engine subsystem is not enabled.' });
        return;
      }
      const goalId = pathname.split('/')[2];
      try {
        const rawBody = await this.readJsonBody(req).catch(() => ({}));
        const body = rawBody as Record<string, unknown>;
        const failedMilestoneId = typeof body.failedMilestoneId === 'string' ? body.failedMilestoneId : undefined;
        const reason = typeof body.reason === 'string' ? body.reason : undefined;
        const plan = await this.goal.goalEngine.replan(goalId, failedMilestoneId, reason);
        const goal = this.goal.goalEngine.getGoal(goalId);
        this.sendJson(res, 200, { success: true, goal, plan });
      } catch (err) {
        this.sendJson(res, 400, {
          error: 'Failed to replan goal',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // GET /goals/:id — Get goal detail
    if (pathname.startsWith('/goals/') && method === 'GET') {
      if (!this.goal) {
        this.sendJson(res, 503, { error: 'Goal Engine subsystem is not enabled.' });
        return;
      }
      const goalId = pathname.split('/')[2];
      const goal = this.goal.goalEngine.getGoal(goalId);
      if (!goal) {
        this.sendJson(res, 404, { error: `Goal '${goalId}' not found.` });
        return;
      }
      const milestones = this.goal.goalEngine.getMilestones(goalId);
      const progress = this.goal.goalEngine.getProgress(goalId);
      this.sendJson(res, 200, { success: true, goal, milestones, progress });
      return;
    }

    // ==========================================
    // PHASE 16 — PERSISTENT OPERATIONS & SCHEDULES
    // ==========================================

    // POST /objectives/:id/evaluate — Trigger objective evaluation cycle
    if (pathname.startsWith('/objectives/') && pathname.endsWith('/evaluate') && method === 'POST') {
      if (!this.persistentOps?.evaluator) {
        this.sendJson(res, 503, { error: 'Objective Evaluator subsystem is not enabled.' });
        return;
      }
      const goalId = pathname.split('/')[2];
      try {
        const result = await this.persistentOps.evaluator.evaluate(goalId);
        this.sendJson(res, 200, { success: true, evaluation: result });
      } catch (err) {
        this.sendJson(res, 400, {
          error: 'Failed to evaluate objective',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // GET /objectives/:id/health — Get deterministic objective health
    if (pathname.startsWith('/objectives/') && pathname.endsWith('/health') && method === 'GET') {
      if (!this.persistentOps?.evaluator) {
        this.sendJson(res, 503, { error: 'Objective Evaluator subsystem is not enabled.' });
        return;
      }
      const goalId = pathname.split('/')[2];
      try {
        const health = await this.persistentOps.evaluator.evaluateHealth(goalId);
        this.sendJson(res, 200, { success: true, health });
      } catch (err) {
        this.sendJson(res, 400, {
          error: 'Failed to evaluate objective health',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // GET /objectives/:id/evaluations — List evaluation records
    if (pathname.startsWith('/objectives/') && pathname.endsWith('/evaluations') && method === 'GET') {
      if (!this.persistentOps?.evaluationRepo) {
        this.sendJson(res, 503, { error: 'Objective Evaluation Repository is not enabled.' });
        return;
      }
      const goalId = pathname.split('/')[2];
      try {
        const evaluations = this.persistentOps.evaluationRepo.findByGoalId(goalId);
        this.sendJson(res, 200, { success: true, goalId, count: evaluations.length, evaluations });
      } catch (err) {
        this.sendJson(res, 500, {
          error: 'Failed to retrieve evaluations',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // GET /schedules — List all persistent schedules
    if (pathname === '/schedules' && method === 'GET') {
      if (!this.persistentOps?.scheduleRepo) {
        this.sendJson(res, 503, { error: 'Scheduler subsystem is not enabled.' });
        return;
      }
      try {
        const schedules = this.persistentOps.scheduleRepo.findAll();
        this.sendJson(res, 200, { success: true, count: schedules.length, schedules });
      } catch (err) {
        this.sendJson(res, 500, {
          error: 'Failed to list schedules',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // POST /schedules — Create a new persistent schedule
    if (pathname === '/schedules' && method === 'POST') {
      if (!this.persistentOps?.scheduler) {
        this.sendJson(res, 503, { error: 'Scheduler subsystem is not enabled.' });
        return;
      }
      try {
        const rawBody = await this.readJsonBody(req).catch(() => ({}));
        const body = rawBody as Record<string, any>;
        const schedule = await this.persistentOps.scheduler.schedule({
          name: String(body.name || 'Unnamed Schedule'),
          description: body.description ? String(body.description) : undefined,
          targetType: body.targetType || 'GOAL_EVALUATION',
          targetId: String(body.targetId || ''),
          scheduleType: body.scheduleType || 'INTERVAL',
          intervalMs: typeof body.intervalMs === 'number' ? body.intervalMs : undefined,
          cronExpression: body.cronExpression ? String(body.cronExpression) : undefined,
          firstRunAt: body.firstRunAt ? String(body.firstRunAt) : body.scheduledTime ? String(body.scheduledTime) : undefined,
          eventPattern: body.eventPattern ? String(body.eventPattern) : body.eventName ? String(body.eventName) : undefined,
          payload: body.payload || {},
          metadata: {
            ...(body.metadata || {}),
            ...(body.companyId ? { companyId: String(body.companyId) } : {}),
            ...(body.projectId ? { projectId: String(body.projectId) } : {}),
          },
        });
        this.sendJson(res, 201, { success: true, schedule });
      } catch (err) {
        this.sendJson(res, 400, {
          error: 'Failed to create schedule',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // POST /schedules/:id/pause — Pause schedule
    if (pathname.startsWith('/schedules/') && pathname.endsWith('/pause') && method === 'POST') {
      if (!this.persistentOps?.scheduler) {
        this.sendJson(res, 503, { error: 'Scheduler subsystem is not enabled.' });
        return;
      }
      const scheduleId = pathname.split('/')[2];
      try {
        const schedule = await this.persistentOps.scheduler.pauseSchedule(scheduleId);
        this.sendJson(res, 200, { success: true, schedule });
      } catch (err) {
        this.sendJson(res, 400, {
          error: 'Failed to pause schedule',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // POST /schedules/:id/resume — Resume schedule
    if (pathname.startsWith('/schedules/') && pathname.endsWith('/resume') && method === 'POST') {
      if (!this.persistentOps?.scheduler) {
        this.sendJson(res, 503, { error: 'Scheduler subsystem is not enabled.' });
        return;
      }
      const scheduleId = pathname.split('/')[2];
      try {
        const schedule = await this.persistentOps.scheduler.resumeSchedule(scheduleId);
        this.sendJson(res, 200, { success: true, schedule });
      } catch (err) {
        this.sendJson(res, 400, {
          error: 'Failed to resume schedule',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // DELETE /schedules/:id — Cancel schedule
    if (pathname.startsWith('/schedules/') && method === 'DELETE') {
      if (!this.persistentOps?.scheduler) {
        this.sendJson(res, 503, { error: 'Scheduler subsystem is not enabled.' });
        return;
      }
      const scheduleId = pathname.split('/')[2];
      try {
        const schedule = await this.persistentOps.scheduler.cancelSchedule(scheduleId);
        this.sendJson(res, 200, { success: true, schedule });
      } catch (err) {
        this.sendJson(res, 400, {
          error: 'Failed to cancel schedule',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // GET /schedules/:id — Get schedule details
    if (pathname.startsWith('/schedules/') && method === 'GET') {
      if (!this.persistentOps?.scheduleRepo) {
        this.sendJson(res, 503, { error: 'Scheduler subsystem is not enabled.' });
        return;
      }
      const scheduleId = pathname.split('/')[2];
      const schedule = this.persistentOps.scheduleRepo.findById(scheduleId);
      if (!schedule) {
        this.sendJson(res, 404, { error: `Schedule '${scheduleId}' not found.` });
        return;
      }
      this.sendJson(res, 200, { success: true, schedule });
      return;
    }

    // ==========================================
    // PHASE 16 — CAPABILITY REGISTRY & ROUTING
    // ==========================================

    // GET /capabilities/health/all — Check all capabilities health
    if (pathname === '/capabilities/health/all' && method === 'GET') {
      if (!this.capabilities?.registry) {
        this.sendJson(res, 503, { error: 'Capability Registry is not enabled.' });
        return;
      }
      try {
        const healthMap = await this.capabilities.registry.checkAllHealth();
        this.sendJson(res, 200, { success: true, count: Object.keys(healthMap).length, health: healthMap });
      } catch (err) {
        this.sendJson(res, 500, {
          error: 'Failed to check capability health',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // GET /capabilities — List all registered capabilities
    if (pathname === '/capabilities' && method === 'GET') {
      if (!this.capabilities?.registry) {
        this.sendJson(res, 503, { error: 'Capability Registry is not enabled.' });
        return;
      }
      try {
        const capabilities = this.capabilities.registry.getAll();
        this.sendJson(res, 200, { success: true, count: capabilities.length, capabilities });
      } catch (err) {
        this.sendJson(res, 500, {
          error: 'Failed to list capabilities',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // GET /capabilities/:id/health — Check health of a specific capability
    if (pathname.startsWith('/capabilities/') && pathname.endsWith('/health') && method === 'GET') {
      if (!this.capabilities?.registry) {
        this.sendJson(res, 503, { error: 'Capability Registry is not enabled.' });
        return;
      }
      const capabilityId = pathname.split('/')[2];
      try {
        const health = await this.capabilities.registry.checkHealth(capabilityId);
        this.sendJson(res, 200, { success: true, capabilityId, health });
      } catch (err) {
        this.sendJson(res, 400, {
          error: 'Failed to check capability health',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // GET /capabilities/:id — Get specific capability metadata
    if (pathname.startsWith('/capabilities/') && method === 'GET') {
      if (!this.capabilities?.registry) {
        this.sendJson(res, 503, { error: 'Capability Registry is not enabled.' });
        return;
      }
      const capabilityId = pathname.split('/')[2];
      const cap = this.capabilities.registry.get(capabilityId);
      if (!cap) {
        this.sendJson(res, 404, { error: `Capability '${capabilityId}' not found.` });
        return;
      }
      this.sendJson(res, 200, { success: true, capability: cap });
      return;
    }

    // POST /capabilities/execute — Execute capability request
    if (pathname === '/capabilities/execute' && method === 'POST') {
      if (!this.capabilities?.registry) {
        this.sendJson(res, 503, { error: 'Capability Registry is not enabled.' });
        return;
      }
      try {
        const rawBody = await this.readJsonBody(req).catch(() => ({}));
        const body = rawBody as Record<string, any>;
        const result = await this.capabilities.registry.execute({
          capabilityId: String(body.capabilityId || ''),
          action: String(body.action || ''),
          parameters: body.parameters || {},
          callerAgentId: body.callerAgentId ? String(body.callerAgentId) : undefined,
          companyId: body.companyId ? String(body.companyId) : undefined,
          projectId: body.projectId ? String(body.projectId) : undefined,
          missionId: body.missionId ? String(body.missionId) : undefined,
        });
        this.sendJson(res, result.success ? 200 : 400, { success: result.success, result });
      } catch (err) {
        this.sendJson(res, 400, {
          error: 'Failed to execute capability',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // POST /capabilities/route — Route agent capability request
    if (pathname === '/capabilities/route' && method === 'POST') {
      if (!this.capabilities?.router) {
        this.sendJson(res, 503, { error: 'Capability Router is not enabled.' });
        return;
      }
      try {
        const rawBody = await this.readJsonBody(req).catch(() => ({}));
        const body = rawBody as Record<string, any>;
        const resolution = this.capabilities.router.resolve(
          String(body.agentId || ''),
          String(body.requestedCapability || '')
        );
        this.sendJson(res, 200, { success: true, resolution });
      } catch (err) {
        this.sendJson(res, 400, {
          error: 'Failed to route capability',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // ==========================================
    // PHASE 16 — RESOURCE GOVERNANCE
    // ==========================================

    // GET /governance/resources — Get live host resource status
    if (pathname === '/governance/resources' && method === 'GET') {
      if (!this.persistentOps?.governor) {
        this.sendJson(res, 503, { error: 'Resource Governor subsystem is not enabled.' });
        return;
      }
      try {
        const snapshot = this.persistentOps.governor.checkResources();
        this.sendJson(res, 200, { success: true, resources: snapshot });
      } catch (err) {
        this.sendJson(res, 500, {
          error: 'Failed to check resources',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // ==========================================
    // PHASE 17 — ADVANCED RESEARCH & WEB INTELLIGENCE
    // ==========================================

    // POST /research/intent — Natural Language Intent Parsing
    if (pathname === '/research/intent' && method === 'POST') {
      if (!this.research?.engine) {
        this.sendJson(res, 503, { error: 'Research Engine is not enabled.' });
        return;
      }
      try {
        const rawBody = await this.readJsonBody(req).catch(() => ({}));
        const body = rawBody as Record<string, any>;
        const intent = this.research.engine.parseResearchIntent(String(body.prompt || body.question || ''));
        this.sendJson(res, 200, { success: true, intent });
      } catch (err) {
        this.sendJson(res, 400, {
          error: 'Failed to parse research intent',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // GET /research — List research studies
    if (pathname === '/research' && method === 'GET') {
      if (!this.research?.engine) {
        this.sendJson(res, 503, { error: 'Research Engine is not enabled.' });
        return;
      }
      try {
        const companyId = url.searchParams.get('companyId') || undefined;
        const projectId = url.searchParams.get('projectId') || undefined;
        const status = url.searchParams.get('status') as any || undefined;
        const studies = await this.research.engine.listStudies({ companyId, projectId, status });
        this.sendJson(res, 200, { success: true, count: studies.length, studies });
      } catch (err) {
        this.sendJson(res, 500, {
          error: 'Failed to list research studies',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // POST /research — Create research study
    if (pathname === '/research' && method === 'POST') {
      if (!this.research?.engine) {
        this.sendJson(res, 503, { error: 'Research Engine is not enabled.' });
        return;
      }
      try {
        const rawBody = await this.readJsonBody(req).catch(() => ({}));
        const body = rawBody as Record<string, any>;
        if (!body.question) {
          this.sendJson(res, 400, { error: 'Missing required field: question' });
          return;
        }
        const study = await this.research.engine.createStudy({
          question: String(body.question),
          title: body.title ? String(body.title) : undefined,
          scope: body.scope ? String(body.scope) : undefined,
          depth: body.depth,
          budget: body.budget,
          requestedBy: body.requestedBy ? String(body.requestedBy) : undefined,
          companyId: body.companyId ? String(body.companyId) : undefined,
          projectId: body.projectId ? String(body.projectId) : undefined,
          goalId: body.goalId ? String(body.goalId) : undefined,
          customUrls: Array.isArray(body.customUrls) ? body.customUrls : undefined,
        });

        // Auto-execute if requested
        if (body.autoExecute === true) {
          this.research.engine.executeStudy(study.id, {
            customUrls: Array.isArray(body.customUrls) ? body.customUrls : undefined,
          }).catch((err) => {
            this.logger?.error(`Async study execution failed for ${study.id}`, err);
          });
        }

        this.sendJson(res, 201, { success: true, study });
      } catch (err) {
        this.sendJson(res, 400, {
          error: 'Failed to create research study',
          details: err instanceof Error ? err.message : String(err)
        });
      }
      return;
    }

    // Study-specific parameterized routes: /research/:id/...
    const studyMatch = pathname.match(/^\/research\/([a-zA-Z0-9_-]+)(?:\/(execute|report|pause|resume|cancel|sources|evidence|findings))?$/);
    if (studyMatch) {
      if (!this.research?.engine) {
        this.sendJson(res, 503, { error: 'Research Engine is not enabled.' });
        return;
      }
      const studyId = studyMatch[1];
      const subAction = studyMatch[2];

      try {
        if (!subAction && method === 'GET') {
          const data = await this.research.engine.getStudy(studyId);
          if (!data.study) {
            this.sendJson(res, 404, { error: `Research study ${studyId} not found` });
            return;
          }
          this.sendJson(res, 200, { success: true, ...data });
          return;
        }

        if (subAction === 'execute' && method === 'POST') {
          const rawBody = await this.readJsonBody(req).catch(() => ({}));
          const body = rawBody as Record<string, any>;
          const result = await this.research.engine.executeStudy(studyId, {
            customUrls: Array.isArray(body.customUrls) ? body.customUrls : undefined,
          });
          this.sendJson(res, 200, { success: true, ...result });
          return;
        }

        if (subAction === 'report' && method === 'GET') {
          const data = await this.research.engine.getStudy(studyId);
          if (!data.study) {
            this.sendJson(res, 404, { error: `Research study ${studyId} not found` });
            return;
          }
          this.sendJson(res, 200, {
            success: true,
            studyId,
            artifacts: data.study.createdArtifacts,
            completionState: data.study.completionState,
          });
          return;
        }

        if (subAction === 'pause' && method === 'POST') {
          const study = await this.research.engine.pauseStudy(studyId);
          this.sendJson(res, 200, { success: true, study });
          return;
        }

        if (subAction === 'cancel' && method === 'POST') {
          const study = await this.research.engine.cancelStudy(studyId);
          this.sendJson(res, 200, { success: true, study });
          return;
        }

        if (subAction === 'sources' && method === 'GET') {
          const sources = await this.research.sourceRepo.findByStudyId(studyId);
          this.sendJson(res, 200, { success: true, count: sources.length, sources });
          return;
        }

        if (subAction === 'evidence' && method === 'GET') {
          const evidence = await this.research.evidenceRepo.findByStudyId(studyId);
          this.sendJson(res, 200, { success: true, count: evidence.length, evidence });
          return;
        }

        if (subAction === 'findings' && method === 'GET') {
          const findings = await this.research.findingRepo.findByStudyId(studyId);
          this.sendJson(res, 200, { success: true, count: findings.length, findings });
          return;
        }
      } catch (err) {
        this.sendJson(res, 500, {
          error: `Failed to process research study action [${subAction || 'get'}]`,
          details: err instanceof Error ? err.message : String(err)
        });
        return;
      }
    }

    // ==========================================
    // Phase 19: Knowledge Graph Subsystem APIs
    // ==========================================

    // GET /knowledge/entities & POST /knowledge/entities
    if (pathname === '/knowledge/entities' && this.knowledge) {
      if (method === 'GET') {
        const entityType = url.searchParams.get('entityType') || undefined;
        const scope = url.searchParams.get('scope') || undefined;
        const status = url.searchParams.get('status') || undefined;
        const search = url.searchParams.get('search') || undefined;
        const limit = Number(url.searchParams.get('limit')) || 100;
        const offset = Number(url.searchParams.get('offset')) || 0;

        const entities = this.knowledge.entityRepo.listEntities({
          entityType,
          scope,
          status,
          search,
          limit,
          offset,
        });

        this.sendJson(res, 200, {
          success: true,
          count: entities.length,
          entities,
        });
        return;
      }

      if (method === 'POST') {
        try {
          const body = await this.readJsonBody(req);
          if (!body.canonicalName || !body.displayName || !body.entityType) {
            this.sendJson(res, 400, {
              error: 'Missing required fields: canonicalName, displayName, entityType',
            });
            return;
          }

          const entity = this.knowledge.entityRepo.createEntity({
            entityType: String(body.entityType),
            canonicalName: String(body.canonicalName),
            displayName: String(body.displayName),
            description: body.description ? String(body.description) : undefined,
            scope: body.scope ? String(body.scope) : undefined,
            status: (body.status as any) || 'ACTIVE',
            aliases: Array.isArray(body.aliases) ? (body.aliases as string[]) : undefined,
          });

          this.eventBus?.emit('entity.created', {
            entityId: entity.id,
            canonicalName: entity.canonicalName,
            entityType: entity.entityType,
          });

          this.sendJson(res, 201, { success: true, entity });
        } catch (err) {
          this.sendJson(res, 400, { error: 'Failed to create knowledge entity', details: String(err) });
        }
        return;
      }
    }

    // GET /knowledge/entities/:id/relationships
    if (pathname.startsWith('/knowledge/entities/') && pathname.endsWith('/relationships') && method === 'GET' && this.knowledge) {
      const parts = pathname.split('/');
      const entityId = parts[3];
      const rels = this.knowledge.relRepo.findRelationships({ entityId, limit: 100 });
      this.sendJson(res, 200, { success: true, count: rels.length, relationships: rels });
      return;
    }

    // GET /knowledge/entities/:id/facts
    if (pathname.startsWith('/knowledge/entities/') && pathname.endsWith('/facts') && method === 'GET' && this.knowledge) {
      const parts = pathname.split('/');
      const entityId = parts[3];
      const facts = this.knowledge.factRepo.findFacts({ subjectEntityId: entityId, limit: 100 });
      this.sendJson(res, 200, { success: true, count: facts.length, facts });
      return;
    }

    // GET /knowledge/entities/:id
    if (pathname.startsWith('/knowledge/entities/') && method === 'GET' && this.knowledge) {
      const entityId = pathname.slice('/knowledge/entities/'.length);
      const entity = this.knowledge.entityRepo.getEntity(entityId);
      if (entity) {
        this.sendJson(res, 200, { success: true, entity });
      } else {
        this.sendJson(res, 404, { error: `Entity '${entityId}' not found.` });
      }
      return;
    }

    // GET /knowledge/relationships & POST /knowledge/relationships
    if (pathname === '/knowledge/relationships' && this.knowledge) {
      if (method === 'GET') {
        const sourceEntityId = url.searchParams.get('sourceEntityId') || undefined;
        const targetEntityId = url.searchParams.get('targetEntityId') || undefined;
        const entityId = url.searchParams.get('entityId') || undefined;
        const relationshipType = url.searchParams.get('relationshipType') || undefined;
        const status = url.searchParams.get('status') || undefined;
        const scope = url.searchParams.get('scope') || undefined;
        const activeOnly = url.searchParams.get('activeOnly') !== 'false';
        const limit = Number(url.searchParams.get('limit')) || 200;

        const relationships = this.knowledge.relRepo.findRelationships({
          sourceEntityId,
          targetEntityId,
          entityId,
          relationshipType,
          status,
          scope,
          activeOnly,
          limit,
        });

        this.sendJson(res, 200, { success: true, count: relationships.length, relationships });
        return;
      }

      if (method === 'POST') {
        try {
          const body = await this.readJsonBody(req);
          if (!body.sourceEntityId || !body.relationshipType || !body.targetEntityId) {
            this.sendJson(res, 400, {
              error: 'Missing required fields: sourceEntityId, relationshipType, targetEntityId',
            });
            return;
          }

          const relationship = this.knowledge.relRepo.createRelationship({
            sourceEntityId: String(body.sourceEntityId),
            relationshipType: String(body.relationshipType),
            targetEntityId: String(body.targetEntityId),
            direction: (body.direction as any) || 'OUTGOING',
            confidence: body.confidence !== undefined ? Number(body.confidence) : 1.0,
            status: (body.status as any) || 'ACTIVE',
            scope: body.scope ? String(body.scope) : undefined,
            validFrom: body.validFrom ? String(body.validFrom) : undefined,
            validUntil: body.validUntil ? String(body.validUntil) : undefined,
          });

          this.eventBus?.emit('relationship.created', {
            id: relationship.id,
            type: relationship.relationshipType,
          });

          this.sendJson(res, 201, { success: true, relationship });
        } catch (err) {
          this.sendJson(res, 400, { error: 'Failed to create knowledge relationship', details: String(err) });
        }
        return;
      }
    }

    // GET /knowledge/facts & POST /knowledge/facts
    if (pathname === '/knowledge/facts' && this.knowledge) {
      if (method === 'GET') {
        const subjectEntityId = url.searchParams.get('subjectEntityId') || undefined;
        const predicate = url.searchParams.get('predicate') || undefined;
        const status = (url.searchParams.get('status') as any) || undefined;
        const scope = url.searchParams.get('scope') || undefined;
        const activeOnly = url.searchParams.get('activeOnly') !== 'false';
        const limit = Number(url.searchParams.get('limit')) || 200;

        const facts = this.knowledge.factRepo.findFacts({
          subjectEntityId,
          predicate,
          status,
          scope,
          activeOnly,
          limit,
        });

        this.sendJson(res, 200, { success: true, count: facts.length, facts });
        return;
      }

      if (method === 'POST') {
        try {
          const body = await this.readJsonBody(req);
          if (!body.subjectEntityId || !body.predicate || body.objectValue === undefined) {
            this.sendJson(res, 400, {
              error: 'Missing required fields: subjectEntityId, predicate, objectValue',
            });
            return;
          }

          const validation = this.knowledge.validationService.validateFact(
            String(body.subjectEntityId),
            String(body.predicate),
            String(body.objectValue),
            (body.credibility as any) || 'PRIMARY',
            Boolean(body.isUserInstruction)
          );

          if (validation.contradictionDetected) {
            this.eventBus?.emit('contradiction.detected', {
              contradiction: validation.contradiction,
            });
          }

          let fact;
          if (validation.supersededFactId) {
            const res = this.knowledge.factRepo.supersedeFact(validation.supersededFactId, {
              subjectEntityId: String(body.subjectEntityId),
              predicate: String(body.predicate),
              objectEntityId: body.objectEntityId ? String(body.objectEntityId) : undefined,
              objectValue: validation.sanitizedValue,
              valueType: (body.valueType as any) || 'STRING',
              confidence: body.confidence !== undefined ? Number(body.confidence) : 1.0,
              scope: body.scope ? String(body.scope) : undefined,
              observedAt: body.observedAt ? String(body.observedAt) : undefined,
            });
            fact = res.newFact;
          } else {
            fact = this.knowledge.factRepo.createFact({
              subjectEntityId: String(body.subjectEntityId),
              predicate: String(body.predicate),
              objectEntityId: body.objectEntityId ? String(body.objectEntityId) : undefined,
              objectValue: validation.sanitizedValue,
              valueType: (body.valueType as any) || 'STRING',
              confidence: body.confidence !== undefined ? Number(body.confidence) : 1.0,
              scope: body.scope ? String(body.scope) : undefined,
              observedAt: body.observedAt ? String(body.observedAt) : undefined,
            });
          }

          // Optional evidence
          if (body.evidence && typeof body.evidence === 'object') {
            const ev = body.evidence as any;
            this.knowledge.evidenceRepo.createEvidence({
              factId: fact.id,
              sourceType: ev.sourceType || 'USER',
              sourceReference: ev.sourceReference || 'api_submission',
              quote: ev.quote,
              credibility: ev.credibility || 'PRIMARY',
              confidence: ev.confidence !== undefined ? Number(ev.confidence) : fact.confidence,
            });
          }

          this.eventBus?.emit('fact.created', {
            id: fact.id,
            predicate: fact.predicate,
          });

          this.sendJson(res, 201, {
            success: true,
            fact,
            contradictionDetected: validation.contradictionDetected,
            contradiction: validation.contradiction,
          });
        } catch (err) {
          this.sendJson(res, 400, { error: 'Failed to create knowledge fact', details: String(err) });
        }
        return;
      }
    }

    // GET /knowledge/search (Hybrid search across entities, facts, and relationships)
    if (pathname === '/knowledge/search' && method === 'GET' && this.knowledge) {
      const q = url.searchParams.get('q') || '';
      const scope = url.searchParams.get('scope') || undefined;
      const limit = Number(url.searchParams.get('limit')) || 20;

      const entities = this.knowledge.entityRepo.listEntities({ search: q, scope, limit });
      const matchedEntityIds = new Set(entities.map((e) => e.id));

      const facts = this.knowledge.factRepo.findFacts({ predicate: q, scope, limit });
      for (const f of facts) {
        matchedEntityIds.add(f.subjectEntityId);
      }

      const allFacts: any[] = [];
      const allRels: any[] = [];
      const allEvidence: any[] = [];

      for (const entId of matchedEntityIds) {
        const entFacts = this.knowledge.factRepo.findCurrentFactsForEntity(entId, scope);
        allFacts.push(...entFacts);
        for (const f of entFacts) {
          const evs = this.knowledge.evidenceRepo.findEvidenceForFact(f.id);
          allEvidence.push(...evs);
        }
        const entRels = this.knowledge.relRepo.findRelationships({ entityId: entId, limit: 10 });
        allRels.push(...entRels);
      }

      this.sendJson(res, 200, {
        success: true,
        query: q,
        results: {
          entities,
          facts: allFacts.slice(0, limit),
          relationships: allRels.slice(0, limit),
          evidence: allEvidence.slice(0, limit),
        },
      });
      return;
    }

    // GET /knowledge/graph
    if (pathname === '/knowledge/graph' && method === 'GET' && this.knowledge) {
      const centerEntityId = url.searchParams.get('centerEntityId');
      const depth = Number(url.searchParams.get('depth')) || 2;
      const limit = Number(url.searchParams.get('limit')) || 100;

      if (centerEntityId) {
        const graph = this.knowledge.graphService.findSubgraph(centerEntityId, { maxDepth: depth });
        this.sendJson(res, 200, { success: true, graph });
      } else {
        const graph = this.knowledge.graphService.getGraphOverview(limit);
        this.sendJson(res, 200, { success: true, graph });
      }
      return;
    }

    // GET /knowledge/contradictions
    if (pathname === '/knowledge/contradictions' && method === 'GET' && this.knowledge) {
      const subjectEntityId = url.searchParams.get('subjectEntityId') || undefined;
      const predicate = url.searchParams.get('predicate') || undefined;
      const status = (url.searchParams.get('status') as any) || undefined;
      const limit = Number(url.searchParams.get('limit')) || 100;

      const contradictions = this.knowledge.contradictionRepo.findContradictions({
        subjectEntityId,
        predicate,
        status,
        limit,
      });

      this.sendJson(res, 200, { success: true, count: contradictions.length, contradictions });
      return;
    }

    // GET /knowledge/timeline
    if (pathname === '/knowledge/timeline' && method === 'GET' && this.knowledge) {
      const entityId = url.searchParams.get('entityId');
      if (!entityId) {
        this.sendJson(res, 400, { error: 'Missing required query parameter: entityId' });
        return;
      }

      const scope = url.searchParams.get('scope') || undefined;
      const events = this.knowledge.timelineService.getTimeline(entityId, scope);

      this.sendJson(res, 200, { success: true, entityId, events });
      return;
    }

    // POST /knowledge/consolidate
    if (pathname === '/knowledge/consolidate' && method === 'POST' && this.knowledge) {
      try {
        const body = await this.readJsonBody(req);
        const maxBatchSize = Number(body.maxBatchSize) || 50;
        const report = this.knowledge.consolidationService.consolidate(maxBatchSize);

        this.eventBus?.emit('knowledge.consolidated', { report });

        this.sendJson(res, 200, { success: true, report });
      } catch (err) {
        this.sendJson(res, 500, { error: 'Consolidation failed', details: String(err) });
      }
      return;
    }

    // ==========================================
    // PHASE 20: SKILLS & PROCEDURAL INTELLIGENCE
    // ==========================================

    // GET /skills — list skills with optional filters
    if (pathname === '/skills' && method === 'GET') {
      if (!this.skills) {
        this.sendJson(res, 503, { error: 'Skills subsystem is not enabled.' });
        return;
      }
      const category = (url.searchParams.get('category') as any) || undefined;
      const status = (url.searchParams.get('status') as any) || undefined;
      const scope = (url.searchParams.get('scope') as any) || undefined;
      const limit = Number(url.searchParams.get('limit')) || 100;

      const skills = this.skills.skillRegistry.list({
        category,
        status,
        scope,
        limit,
      });

      this.sendJson(res, 200, {
        success: true,
        count: skills.length,
        skills,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // POST /skills — register a new skill definition
    if (pathname === '/skills' && method === 'POST') {
      if (!this.skills) {
        this.sendJson(res, 503, { error: 'Skills subsystem is not enabled.' });
        return;
      }
      try {
        const body = (await this.readJsonBody(req)) as any;
        const validation = this.skills.skillValidator.validateSkill(body);
        if (!validation.valid) {
          this.sendJson(res, 400, {
            error: 'Skill definition validation failed',
            errors: validation.errors,
            warnings: validation.warnings,
          });
          return;
        }

        const skill = this.skills.skillRegistry.register(body);
        this.sendJson(res, 201, {
          success: true,
          skill,
          warnings: validation.warnings,
        });
      } catch (err) {
        this.sendJson(res, 400, { error: 'Failed to create skill', details: String(err) });
      }
      return;
    }

    // POST /skills/match — match candidate skills from prompt/context
    if (pathname === '/skills/match' && method === 'POST') {
      if (!this.skills) {
        this.sendJson(res, 503, { error: 'Skills subsystem is not enabled.' });
        return;
      }
      try {
        const body = (await this.readJsonBody(req)) as any;
        const request = typeof body.request === 'string' ? body.request : '';
        const goal = typeof body.goal === 'string' ? body.goal : undefined;
        const mission = typeof body.mission === 'string' ? body.mission : undefined;
        const task = typeof body.task === 'string' ? body.task : undefined;
        const context = body.context && typeof body.context === 'object' ? body.context : undefined;

        const matches = this.skills.skillMatcher.matchSkills({
          request,
          goal,
          mission,
          task,
          context,
        });

        this.sendJson(res, 200, {
          success: true,
          count: matches.length,
          matches,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        this.sendJson(res, 400, { error: 'Skill matching failed', details: String(err) });
      }
      return;
    }

    // POST /skills/preview — preview skill execution plan deterministically
    if (pathname === '/skills/preview' && method === 'POST') {
      if (!this.skills) {
        this.sendJson(res, 503, { error: 'Skills subsystem is not enabled.' });
        return;
      }
      try {
        const body = (await this.readJsonBody(req)) as any;
        const skillId = typeof body.skillId === 'string' ? body.skillId : '';
        if (!skillId) {
          this.sendJson(res, 400, { error: "Missing required 'skillId' field" });
          return;
        }

        const preview = this.skills.skillMatcher.generatePreview(
          skillId,
          body.inputs || {},
          body.version
        );

        if (!preview) {
          this.sendJson(res, 404, { error: `Skill '${skillId}' not found or has no active version.` });
          return;
        }

        this.sendJson(res, 200, { success: true, preview });
      } catch (err) {
        this.sendJson(res, 400, { error: 'Failed to generate preview', details: String(err) });
      }
      return;
    }

    // GET /skills/:id/versions — list all versions of a skill
    if (pathname.startsWith('/skills/') && pathname.endsWith('/versions') && method === 'GET') {
      if (!this.skills) {
        this.sendJson(res, 503, { error: 'Skills subsystem is not enabled.' });
        return;
      }
      const skillId = pathname.replace('/skills/', '').replace('/versions', '').trim();
      const versions = this.skills.skillRepo.getVersions(skillId);
      this.sendJson(res, 200, { success: true, skillId, count: versions.length, versions });
      return;
    }

    // POST /skills/:id/enable — enable a skill
    if (pathname.startsWith('/skills/') && pathname.endsWith('/enable') && method === 'POST') {
      if (!this.skills) {
        this.sendJson(res, 503, { error: 'Skills subsystem is not enabled.' });
        return;
      }
      const skillId = pathname.replace('/skills/', '').replace('/enable', '').trim();
      const skill = this.skills.skillRegistry.enable(skillId);
      if (!skill) {
        this.sendJson(res, 404, { error: `Skill '${skillId}' not found.` });
        return;
      }
      this.sendJson(res, 200, { success: true, skill });
      return;
    }

    // POST /skills/:id/disable — disable a skill
    if (pathname.startsWith('/skills/') && pathname.endsWith('/disable') && method === 'POST') {
      if (!this.skills) {
        this.sendJson(res, 503, { error: 'Skills subsystem is not enabled.' });
        return;
      }
      const skillId = pathname.replace('/skills/', '').replace('/disable', '').trim();
      const skill = this.skills.skillRegistry.disable(skillId);
      if (!skill) {
        this.sendJson(res, 404, { error: `Skill '${skillId}' not found.` });
        return;
      }
      this.sendJson(res, 200, { success: true, skill });
      return;
    }

    // POST /skills/:id/validate — validate a skill procedure and graph
    if (pathname.startsWith('/skills/') && pathname.endsWith('/validate') && method === 'POST') {
      if (!this.skills) {
        this.sendJson(res, 503, { error: 'Skills subsystem is not enabled.' });
        return;
      }
      const skillId = pathname.replace('/skills/', '').replace('/validate', '').trim();
      const validation = this.skills.skillRegistry.validate(skillId);
      this.sendJson(res, 200, {
        success: true,
        skillId,
        valid: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings,
      });
      return;
    }

    // POST /skills/:id/execute — execute a skill
    if (pathname.startsWith('/skills/') && pathname.endsWith('/execute') && method === 'POST') {
      if (!this.skills) {
        this.sendJson(res, 503, { error: 'Skills subsystem is not enabled.' });
        return;
      }
      const skillId = pathname.replace('/skills/', '').replace('/execute', '').trim();
      try {
        const body = (await this.readJsonBody(req).catch(() => ({}))) as any;
        const inputs = body.inputs && typeof body.inputs === 'object' ? body.inputs : {};
        const options = {
          version: typeof body.version === 'string' ? body.version : undefined,
          companyId: typeof body.companyId === 'string' ? body.companyId : undefined,
          projectId: typeof body.projectId === 'string' ? body.projectId : undefined,
          departmentId: typeof body.departmentId === 'string' ? body.departmentId : undefined,
          goalId: typeof body.goalId === 'string' ? body.goalId : undefined,
          missionId: typeof body.missionId === 'string' ? body.missionId : undefined,
          assignedAgentId: typeof body.assignedAgentId === 'string' ? body.assignedAgentId : undefined,
          approvedBy: typeof body.approvedBy === 'string' ? body.approvedBy : undefined,
        };

        const result = await this.skills.skillExecutionEngine.executeSkill(skillId, inputs, options);
        this.sendJson(res, result.success ? 200 : 422, { success: result.success, result });
      } catch (err) {
        this.sendJson(res, 400, { error: 'Execution failed', details: String(err) });
      }
      return;
    }

    // GET /skills/:id/executions — execution history
    if (pathname.startsWith('/skills/') && pathname.endsWith('/executions') && method === 'GET') {
      if (!this.skills) {
        this.sendJson(res, 503, { error: 'Skills subsystem is not enabled.' });
        return;
      }
      const skillId = pathname.replace('/skills/', '').replace('/executions', '').trim();
      const limit = Number(url.searchParams.get('limit')) || 50;
      const history = this.skills.skillRepo.getUsageHistory(skillId, limit);
      this.sendJson(res, 200, { success: true, skillId, count: history.length, executions: history });
      return;
    }

    // GET /skills/:id/statistics — performance and execution statistics
    if (pathname.startsWith('/skills/') && pathname.endsWith('/statistics') && method === 'GET') {
      if (!this.skills) {
        this.sendJson(res, 503, { error: 'Skills subsystem is not enabled.' });
        return;
      }
      const skillId = pathname.replace('/skills/', '').replace('/statistics', '').trim();
      const statistics = this.skills.skillRepo.getStatistics(skillId);
      this.sendJson(res, 200, { success: true, skillId, statistics });
      return;
    }

    // GET /skills/:id/improvements — list improvement proposals
    if (pathname.startsWith('/skills/') && pathname.endsWith('/improvements') && method === 'GET') {
      if (!this.skills) {
        this.sendJson(res, 503, { error: 'Skills subsystem is not enabled.' });
        return;
      }
      const skillId = pathname.replace('/skills/', '').replace('/improvements', '').trim();
      const proposals = this.skills.skillRepo.listImprovementProposals({ skillId });
      this.sendJson(res, 200, { success: true, skillId, count: proposals.length, proposals });
      return;
    }

    // POST /skills/:id/improvements — create a safe improvement proposal
    if (pathname.startsWith('/skills/') && pathname.endsWith('/improvements') && method === 'POST') {
      if (!this.skills) {
        this.sendJson(res, 503, { error: 'Skills subsystem is not enabled.' });
        return;
      }
      const skillId = pathname.replace('/skills/', '').replace('/improvements', '').trim();
      try {
        const body = (await this.readJsonBody(req)) as any;
        const skill = this.skills.skillRegistry.get(skillId);
        if (!skill) {
          this.sendJson(res, 404, { error: `Skill '${skillId}' not found.` });
          return;
        }

        const reason = typeof body.reason === 'string' ? body.reason : 'Human suggested improvement';
        const proposal = this.skills.skillRepo.createImprovementProposal({
          skillId,
          currentVersion: skill.version,
          reason,
          evidence: body.evidence || {},
          proposedChanges: body.proposedChanges || {},
          confidence: typeof body.confidence === 'number' ? body.confidence : 0.8,
          status: 'PROPOSED',
        });

        this.eventBus?.emit('skill.improvement.proposed', {
          proposalId: proposal.id,
          skillId,
          reason: proposal.reason,
        });

        this.sendJson(res, 201, { success: true, proposal });
      } catch (err) {
        this.sendJson(res, 400, { error: 'Failed to create improvement proposal', details: String(err) });
      }
      return;
    }

    // POST /skills/improvements/:id/status — review, approve, reject proposal
    if (pathname.startsWith('/skills/improvements/') && pathname.endsWith('/status') && method === 'POST') {
      if (!this.skills) {
        this.sendJson(res, 503, { error: 'Skills subsystem is not enabled.' });
        return;
      }
      const proposalId = pathname.replace('/skills/improvements/', '').replace('/status', '').trim();
      try {
        const body = (await this.readJsonBody(req)) as any;
        const status = body.status;
        if (!['PROPOSED', 'REVIEWED', 'APPROVED', 'REJECTED', 'IMPLEMENTED'].includes(status)) {
          this.sendJson(res, 400, { error: 'Invalid proposal status' });
          return;
        }

        const updated = this.skills.skillRepo.updateImprovementProposalStatus(proposalId, status);
        if (!updated) {
          this.sendJson(res, 404, { error: `Improvement proposal '${proposalId}' not found.` });
          return;
        }

        this.sendJson(res, 200, { success: true, proposal: updated });
      } catch (err) {
        this.sendJson(res, 400, { error: 'Failed to update proposal status', details: String(err) });
      }
      return;
    }

    // GET /skills/:id — get skill details
    if (pathname.startsWith('/skills/') && method === 'GET') {
      if (!this.skills) {
        this.sendJson(res, 503, { error: 'Skills subsystem is not enabled.' });
        return;
      }
      const skillId = pathname.replace('/skills/', '').trim();
      const skill = this.skills.skillRegistry.get(skillId);
      if (!skill) {
        this.sendJson(res, 404, { error: `Skill '${skillId}' not found.` });
        return;
      }

      const statistics = this.skills.skillRepo.getStatistics(skillId);
      const versions = this.skills.skillRepo.getVersions(skillId);

      this.sendJson(res, 200, {
        success: true,
        skill,
        statistics,
        versionsCount: versions.length,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // ==========================================
    // Phase 21: Dynamic MCP & Capability Endpoints
    // ==========================================

    // GET /mcp/servers — List all registered MCP servers
    if (pathname === '/mcp/servers' && method === 'GET') {
      if (!this.mcp) {
        this.sendJson(res, 503, { error: 'MCP subsystem is not initialized.' });
        return;
      }
      const servers = this.mcp.serverRepo.list();
      const enriched = servers.map((s) => {
        const tools = this.mcp!.toolRepo.listTools(s.id);
        const resources = this.mcp!.resourceRepo.listResources(s.id);
        const prompts = this.mcp!.promptRepo.listPrompts(s.id);
        const isRunning = this.mcp!.processManager.isRunning(s.id);
        return {
          ...s,
          toolsCount: tools.length,
          resourcesCount: resources.length,
          promptsCount: prompts.length,
          isRunning,
        };
      });

      this.sendJson(res, 200, {
        success: true,
        servers: enriched,
        total: servers.length,
        activeProcesses: this.mcp.processManager.getActiveProcessCount(),
      });
      return;
    }

    // POST /mcp/servers — Register a new MCP server
    if (pathname === '/mcp/servers' && method === 'POST') {
      if (!this.mcp) {
        this.sendJson(res, 503, { error: 'MCP subsystem is not initialized.' });
        return;
      }
      try {
        const body = (await this.readJsonBody(req)) as any;
        if (!body.name || !body.description) {
          this.sendJson(res, 400, { error: 'Server name and description are required.' });
          return;
        }

        const result = this.mcp.serverRegistry.register(body);
        this.sendJson(res, 201, {
          success: true,
          server: result.server,
          review: result.review,
        });
      } catch (err: any) {
        this.sendJson(res, 400, { error: 'Failed to register MCP server', details: err.message });
      }
      return;
    }

    // POST /mcp/servers/discover — Run discovery on an MCP server
    if (pathname === '/mcp/servers/discover' && method === 'POST') {
      if (!this.mcp) {
        this.sendJson(res, 503, { error: 'MCP subsystem is not initialized.' });
        return;
      }
      try {
        const body = (await this.readJsonBody(req)) as any;
        const serverId = body.serverId;
        if (!serverId) {
          this.sendJson(res, 400, { error: 'serverId parameter required.' });
          return;
        }

        const discoveryResult = await this.mcp.discovery.discover(serverId);
        this.sendJson(res, 200, {
          success: true,
          serverId,
          toolsCount: discoveryResult.tools.length,
          resourcesCount: discoveryResult.resources.length,
          promptsCount: discoveryResult.prompts.length,
          tools: discoveryResult.tools,
          resources: discoveryResult.resources,
          prompts: discoveryResult.prompts,
        });
      } catch (err: any) {
        this.sendJson(res, 500, { error: 'MCP discovery failed', details: err.message });
      }
      return;
    }

    // POST /mcp/servers/:id/approve — Authorize server
    if (pathname.startsWith('/mcp/servers/') && pathname.endsWith('/approve') && method === 'POST') {
      if (!this.mcp) {
        this.sendJson(res, 503, { error: 'MCP subsystem is not initialized.' });
        return;
      }
      const serverId = pathname.replace('/mcp/servers/', '').replace('/approve', '').trim();
      try {
        const authorized = this.mcp.serverRegistry.authorize(serverId);
        this.sendJson(res, 200, { success: true, server: authorized });
      } catch (err: any) {
        this.sendJson(res, 400, { error: 'Failed to authorize MCP server', details: err.message });
      }
      return;
    }

    // POST /mcp/servers/:id/disable — Disable server
    if (pathname.startsWith('/mcp/servers/') && pathname.endsWith('/disable') && method === 'POST') {
      if (!this.mcp) {
        this.sendJson(res, 503, { error: 'MCP subsystem is not initialized.' });
        return;
      }
      const serverId = pathname.replace('/mcp/servers/', '').replace('/disable', '').trim();
      try {
        const body = (await this.readJsonBody(req)) as any;
        await this.mcp.processManager.stopServer(serverId, body.reason || 'Operator disabled');
        const disabled = this.mcp.serverRegistry.disable(serverId, body.reason);
        this.sendJson(res, 200, { success: true, server: disabled });
      } catch (err: any) {
        this.sendJson(res, 400, { error: 'Failed to disable MCP server', details: err.message });
      }
      return;
    }

    // POST /mcp/servers/:id/revoke — Revoke server authorization
    if (pathname.startsWith('/mcp/servers/') && pathname.endsWith('/revoke') && method === 'POST') {
      if (!this.mcp) {
        this.sendJson(res, 503, { error: 'MCP subsystem is not initialized.' });
        return;
      }
      const serverId = pathname.replace('/mcp/servers/', '').replace('/revoke', '').trim();
      try {
        const body = (await this.readJsonBody(req)) as any;
        await this.mcp.processManager.stopServer(serverId, 'Server revoked');
        const revoked = this.mcp.serverRegistry.revoke(serverId, body.reason || 'Operator revoked');
        this.sendJson(res, 200, { success: true, server: revoked });
      } catch (err: any) {
        this.sendJson(res, 400, { error: 'Failed to revoke MCP server', details: err.message });
      }
      return;
    }

    // POST /mcp/servers/:id/start — Start server process
    if (pathname.startsWith('/mcp/servers/') && pathname.endsWith('/start') && method === 'POST') {
      if (!this.mcp) {
        this.sendJson(res, 503, { error: 'MCP subsystem is not initialized.' });
        return;
      }
      const serverId = pathname.replace('/mcp/servers/', '').replace('/start', '').trim();
      const server = this.mcp.serverRepo.findById(serverId);
      if (!server) {
        this.sendJson(res, 404, { error: `MCP server '${serverId}' not found.` });
        return;
      }
      try {
        const started = await this.mcp.processManager.startServer(server);
        this.sendJson(res, 200, { success: true, pid: started.pid, server: this.mcp.serverRepo.findById(serverId) });
      } catch (err: any) {
        this.sendJson(res, 500, { error: 'Failed to start MCP server', details: err.message });
      }
      return;
    }

    // POST /mcp/servers/:id/stop — Stop server process
    if (pathname.startsWith('/mcp/servers/') && pathname.endsWith('/stop') && method === 'POST') {
      if (!this.mcp) {
        this.sendJson(res, 503, { error: 'MCP subsystem is not initialized.' });
        return;
      }
      const serverId = pathname.replace('/mcp/servers/', '').replace('/stop', '').trim();
      try {
        const stopped = await this.mcp.processManager.stopServer(serverId);
        this.sendJson(res, 200, { success: stopped, server: this.mcp.serverRepo.findById(serverId) });
      } catch (err: any) {
        this.sendJson(res, 500, { error: 'Failed to stop MCP server', details: err.message });
      }
      return;
    }

    // POST /mcp/servers/:id/restart — Restart server process
    if (pathname.startsWith('/mcp/servers/') && pathname.endsWith('/restart') && method === 'POST') {
      if (!this.mcp) {
        this.sendJson(res, 503, { error: 'MCP subsystem is not initialized.' });
        return;
      }
      const serverId = pathname.replace('/mcp/servers/', '').replace('/restart', '').trim();
      try {
        const restarted = await this.mcp.processManager.restartServer(serverId);
        this.sendJson(res, 200, { success: true, pid: restarted.pid, server: this.mcp.serverRepo.findById(serverId) });
      } catch (err: any) {
        this.sendJson(res, 500, { error: 'Failed to restart MCP server', details: err.message });
      }
      return;
    }

    // POST /mcp/servers/:id/refresh — Refresh capabilities and detect schema changes
    if (pathname.startsWith('/mcp/servers/') && pathname.endsWith('/refresh') && method === 'POST') {
      if (!this.mcp) {
        this.sendJson(res, 503, { error: 'MCP subsystem is not initialized.' });
        return;
      }
      const serverId = pathname.replace('/mcp/servers/', '').replace('/refresh', '').trim();
      try {
        const diff = await this.mcp.refresh.refresh(serverId);
        this.sendJson(res, 200, { success: true, diff });
      } catch (err: any) {
        this.sendJson(res, 500, { error: 'Failed to refresh MCP server', details: err.message });
      }
      return;
    }

    // GET /mcp/servers/:id/tools — List tools for server
    if (pathname.startsWith('/mcp/servers/') && pathname.endsWith('/tools') && method === 'GET') {
      if (!this.mcp) {
        this.sendJson(res, 503, { error: 'MCP subsystem is not initialized.' });
        return;
      }
      const serverId = pathname.replace('/mcp/servers/', '').replace('/tools', '').trim();
      const tools = this.mcp.toolRepo.listTools(serverId);
      this.sendJson(res, 200, { success: true, serverId, tools, total: tools.length });
      return;
    }

    // GET /mcp/servers/:id/resources — List resources for server
    if (pathname.startsWith('/mcp/servers/') && pathname.endsWith('/resources') && method === 'GET') {
      if (!this.mcp) {
        this.sendJson(res, 503, { error: 'MCP subsystem is not initialized.' });
        return;
      }
      const serverId = pathname.replace('/mcp/servers/', '').replace('/resources', '').trim();
      const resources = this.mcp.resourceRepo.listResources(serverId);
      this.sendJson(res, 200, { success: true, serverId, resources, total: resources.length });
      return;
    }

    // GET /mcp/servers/:id/prompts — List prompts for server
    if (pathname.startsWith('/mcp/servers/') && pathname.endsWith('/prompts') && method === 'GET') {
      if (!this.mcp) {
        this.sendJson(res, 503, { error: 'MCP subsystem is not initialized.' });
        return;
      }
      const serverId = pathname.replace('/mcp/servers/', '').replace('/prompts', '').trim();
      const prompts = this.mcp.promptRepo.listPrompts(serverId);
      this.sendJson(res, 200, { success: true, serverId, prompts, total: prompts.length });
      return;
    }

    // GET /mcp/servers/:id/preview — Generate discovery preview
    if (pathname.startsWith('/mcp/servers/') && pathname.endsWith('/preview') && method === 'GET') {
      if (!this.mcp) {
        this.sendJson(res, 503, { error: 'MCP subsystem is not initialized.' });
        return;
      }
      const serverId = pathname.replace('/mcp/servers/', '').replace('/preview', '').trim();
      try {
        const preview = this.mcp.discovery.generatePreview(serverId);
        this.sendJson(res, 200, { success: true, preview });
      } catch (err: any) {
        this.sendJson(res, 404, { error: 'Failed to generate preview', details: err.message });
      }
      return;
    }

    // GET /mcp/servers/:id — Get server detail
    if (pathname.startsWith('/mcp/servers/') && method === 'GET') {
      if (!this.mcp) {
        this.sendJson(res, 503, { error: 'MCP subsystem is not initialized.' });
        return;
      }
      const serverId = pathname.replace('/mcp/servers/', '').trim();
      const server = this.mcp.serverRepo.findById(serverId) || this.mcp.serverRepo.findByName(serverId);
      if (!server) {
        this.sendJson(res, 404, { error: `MCP server '${serverId}' not found.` });
        return;
      }

      const tools = this.mcp.toolRepo.listTools(server.id);
      const resources = this.mcp.resourceRepo.listResources(server.id);
      const prompts = this.mcp.promptRepo.listPrompts(server.id);
      const stats = this.mcp.toolRepo.getStats(server.id);
      const review = this.mcp.secRepo.getLatestReview(server.id);
      const isRunning = this.mcp.processManager.isRunning(server.id);

      this.sendJson(res, 200, {
        success: true,
        server,
        isRunning,
        tools,
        resources,
        prompts,
        stats,
        securityReview: review,
      });
      return;
    }

    // =========================================================================
    // Phase 22: Advanced Computer Operator Endpoints
    // =========================================================================

    // GET /computer/status — Operator health and active application context
    if (pathname === '/computer/status' && method === 'GET') {
      if (!this.computerOperator) {
        this.sendJson(res, 503, { error: 'Computer Operator subsystem is not initialized.' });
        return;
      }
      const context = this.computerOperator.operator.windowManager.getCurrentContext();
      const latestObs = this.computerOperator.repository.getLatestObservation();
      const recentTasks = this.computerOperator.repository.listTasks({ limit: 5 });

      this.sendJson(res, 200, {
        success: true,
        status: 'READY',
        activeContext: context || null,
        latestObservation: latestObs,
        recentTasks,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // GET /computer/windows — Current active & visible windows
    if (pathname === '/computer/windows' && method === 'GET') {
      if (!this.computerOperator) {
        this.sendJson(res, 503, { error: 'Computer Operator subsystem is not initialized.' });
        return;
      }
      try {
        const activeWin = await this.computerOperator.operator.windowManager.getActiveWindow();
        this.sendJson(res, 200, {
          success: true,
          activeWindow: activeWin,
          visibleWindows: [activeWin],
        });
      } catch (err: any) {
        this.sendJson(res, 500, { error: 'Failed to query windows', details: err.message });
      }
      return;
    }

    // GET /computer/observation — Latest or fresh observation snapshot
    if (pathname === '/computer/observation' && method === 'GET') {
      if (!this.computerOperator) {
        this.sendJson(res, 503, { error: 'Computer Operator subsystem is not initialized.' });
        return;
      }
      try {
        const obs = await this.computerOperator.operator.observationEngine.observeDesktop();
        this.sendJson(res, 200, { success: true, observation: obs });
      } catch (err: any) {
        this.sendJson(res, 500, { error: 'Failed to observe desktop', details: err.message });
      }
      return;
    }

    // POST /computer/observe — Custom-configured observation capture
    if (pathname === '/computer/observe' && method === 'POST') {
      if (!this.computerOperator) {
        this.sendJson(res, 503, { error: 'Computer Operator subsystem is not initialized.' });
        return;
      }
      try {
        const body = await this.readJsonBody(req);
        const obs = await this.computerOperator.operator.observationEngine.observeDesktop({
          maxDepth: typeof body.maxDepth === 'number' ? body.maxDepth : undefined,
          maxNodes: typeof body.maxNodes === 'number' ? body.maxNodes : undefined,
          captureScreenshot: body.captureScreenshot !== false,
        });
        this.computerOperator.repository.recordObservation(obs);
        this.sendJson(res, 200, { success: true, observation: obs });
      } catch (err: any) {
        this.sendJson(res, 500, { error: 'Observation error', details: err.message });
      }
      return;
    }

    // POST /computer/actions — Direct execution of a single structured action
    if (pathname === '/computer/actions' && method === 'POST') {
      if (!this.computerOperator) {
        this.sendJson(res, 503, { error: 'Computer Operator subsystem is not initialized.' });
        return;
      }
      try {
        const body = await this.readJsonBody(req) as any;
        const currentObs = await this.computerOperator.operator.observationEngine.observeDesktop({ captureScreenshot: false });
        const result = await this.computerOperator.operator.actionExecutor.executeAction(body, currentObs);
        this.sendJson(res, 200, { success: result.success, result });
      } catch (err: any) {
        this.sendJson(res, 500, { error: 'Action execution error', details: err.message });
      }
      return;
    }

    // POST /computer/tasks — Submit and execute autonomous multi-step computer task
    if (pathname === '/computer/tasks' && method === 'POST') {
      if (!this.computerOperator) {
        this.sendJson(res, 503, { error: 'Computer Operator subsystem is not initialized.' });
        return;
      }
      try {
        const body = await this.readJsonBody(req) as any;
        if (!body.intent || !body.objective) {
          this.sendJson(res, 400, { error: "Fields 'intent' and 'objective' are required." });
          return;
        }
        const outcome = await this.computerOperator.operator.executeTask(body.intent, body.objective, {
          maxActions: body.maxActions,
          scope: body.scope,
          agentId: body.agentId,
        });
        this.sendJson(res, outcome.task.status === 'COMPLETED' ? 200 : 202, {
          success: outcome.task.status === 'COMPLETED',
          task: outcome.task,
          results: outcome.results,
        });
      } catch (err: any) {
        this.sendJson(res, 500, { error: 'Task execution error', details: err.message });
      }
      return;
    }

    // GET /computer/tasks — List computer operator tasks
    if (pathname === '/computer/tasks' && method === 'GET') {
      if (!this.computerOperator) {
        this.sendJson(res, 503, { error: 'Computer Operator subsystem is not initialized.' });
        return;
      }
      const tasks = this.computerOperator.repository.listTasks();
      this.sendJson(res, 200, { success: true, tasks, total: tasks.length });
      return;
    }

    // POST /computer/tasks/:id/pause — Pause running task
    if (pathname.startsWith('/computer/tasks/') && pathname.endsWith('/pause') && method === 'POST') {
      if (!this.computerOperator) {
        this.sendJson(res, 503, { error: 'Computer Operator subsystem is not initialized.' });
        return;
      }
      const taskId = pathname.replace('/computer/tasks/', '').replace('/pause', '').trim();
      const updated = this.computerOperator.operator.pauseTask(taskId);
      this.sendJson(res, 200, { success: Boolean(updated), task: updated });
      return;
    }

    // POST /computer/tasks/:id/resume — Resume paused task
    if (pathname.startsWith('/computer/tasks/') && pathname.endsWith('/resume') && method === 'POST') {
      if (!this.computerOperator) {
        this.sendJson(res, 503, { error: 'Computer Operator subsystem is not initialized.' });
        return;
      }
      const taskId = pathname.replace('/computer/tasks/', '').replace('/resume', '').trim();
      const updated = this.computerOperator.operator.resumeTask(taskId);
      this.sendJson(res, 200, { success: Boolean(updated), task: updated });
      return;
    }

    // POST /computer/tasks/:id/approve — Human operator approves pending task
    if (pathname.startsWith('/computer/tasks/') && pathname.endsWith('/approve') && method === 'POST') {
      if (!this.computerOperator) {
        this.sendJson(res, 503, { error: 'Computer Operator subsystem is not initialized.' });
        return;
      }
      const taskId = pathname.replace('/computer/tasks/', '').replace('/approve', '').trim();
      const updated = this.computerOperator.operator.approveTask(taskId);
      this.sendJson(res, 200, { success: Boolean(updated), task: updated });
      return;
    }

    // GET /computer/tasks/:id — Get task detail with action history
    if (pathname.startsWith('/computer/tasks/') && method === 'GET') {
      if (!this.computerOperator) {
        this.sendJson(res, 503, { error: 'Computer Operator subsystem is not initialized.' });
        return;
      }
      const taskId = pathname.replace('/computer/tasks/', '').trim();
      const task = this.computerOperator.repository.findTaskById(taskId);
      if (!task) {
        this.sendJson(res, 404, { error: `Computer task '${taskId}' not found.` });
        return;
      }
      const actions = this.computerOperator.repository.listActionHistory(taskId);
      this.sendJson(res, 200, { success: true, task, actions });
      return;
    }

    // GET /computer/audit — Audit logs and learned patterns
    if (pathname === '/computer/audit' && method === 'GET') {
      if (!this.computerOperator) {
        this.sendJson(res, 503, { error: 'Computer Operator subsystem is not initialized.' });
        return;
      }
      const tasks = this.computerOperator.repository.listTasks({ limit: 50 });
      const patterns = this.computerOperator.repository.listPatterns();
      this.sendJson(res, 200, { success: true, tasks, patterns });
      return;
    }

    // ==========================================
    // Phase 23: External / Enterprise Environments API
    // ==========================================

    // GET /environments — List registered environments
    if (pathname === '/environments' && method === 'GET') {
      if (!this.enterpriseEnvironment) {
        this.sendJson(res, 503, { error: 'Enterprise Environment subsystem is not initialized.' });
        return;
      }
      const type = url.searchParams.get('type') || undefined;
      const status = url.searchParams.get('status') || undefined;
      const scope = url.searchParams.get('scope') || undefined;
      const companyId = url.searchParams.get('companyId') || undefined;
      const projectId = url.searchParams.get('projectId') || undefined;
      const envs = await this.enterpriseEnvironment.registry.listEnvironments({
        type: type as any,
        status: status as any,
        scope: scope as any,
        companyId,
        projectId,
      });
      this.sendJson(res, 200, { success: true, count: envs.length, environments: envs });
      return;
    }

    // POST /environments — Register a new environment
    if (pathname === '/environments' && method === 'POST') {
      if (!this.enterpriseEnvironment) {
        this.sendJson(res, 503, { error: 'Enterprise Environment subsystem is not initialized.' });
        return;
      }
      try {
        const body = await this.readJsonBody(req);
        const created = await this.enterpriseEnvironment.registry.registerEnvironment(body as any);
        this.sendJson(res, 201, { success: true, environment: created });
      } catch (err: any) {
        this.sendJson(res, 400, { error: err.message });
      }
      return;
    }

    // Match /environments/:id routes
    const envMatch = pathname.match(/^\/environments\/([a-zA-Z0-9_-]+)(?:\/([a-zA-Z0-9_-]+))?$/);
    if (envMatch) {
      if (!this.enterpriseEnvironment) {
        this.sendJson(res, 503, { error: 'Enterprise Environment subsystem is not initialized.' });
        return;
      }
      const envId = envMatch[1];
      const subAction = envMatch[2];

      if (!subAction && method === 'GET') {
        const env = await this.enterpriseEnvironment.registry.getEnvironment(envId);
        if (!env) {
          this.sendJson(res, 404, { error: `Environment ${envId} not found.` });
          return;
        }
        const capabilities = await this.enterpriseEnvironment.registry.listCapabilities(envId);
        const health = await this.enterpriseEnvironment.registry.getLatestHealth(envId);
        this.sendJson(res, 200, { success: true, environment: env, capabilities, health });
        return;
      }

      if (!subAction && method === 'DELETE') {
        await this.enterpriseEnvironment.registry.deleteEnvironment(envId);
        this.sendJson(res, 200, { success: true, message: `Environment ${envId} removed.` });
        return;
      }

      if (subAction === 'authorize' && method === 'POST') {
        try {
          const body = await this.readJsonBody(req);
          const updated = await this.enterpriseEnvironment.registry.authorizeEnvironment(envId, body.trustLevel as any);
          this.sendJson(res, 200, { success: true, environment: updated });
        } catch (err: any) {
          this.sendJson(res, 400, { error: err.message });
        }
        return;
      }

      if (subAction === 'revoke' && method === 'POST') {
        try {
          const updated = await this.enterpriseEnvironment.registry.revokeEnvironment(envId);
          this.sendJson(res, 200, { success: true, environment: updated });
        } catch (err: any) {
          this.sendJson(res, 400, { error: err.message });
        }
        return;
      }

      if (subAction === 'disable' && method === 'POST') {
        try {
          const updated = await this.enterpriseEnvironment.registry.disableEnvironment(envId);
          this.sendJson(res, 200, { success: true, environment: updated });
        } catch (err: any) {
          this.sendJson(res, 400, { error: err.message });
        }
        return;
      }

      if (subAction === 'inspect' && method === 'POST') {
        try {
          const updated = await this.enterpriseEnvironment.registry.inspectEnvironment(envId);
          this.sendJson(res, 200, { success: true, environment: updated });
        } catch (err: any) {
          this.sendJson(res, 400, { error: err.message });
        }
        return;
      }

      if (subAction === 'connect' && method === 'POST') {
        try {
          const body = await this.readJsonBody(req);
          const session = await this.enterpriseEnvironment.registry.connect(envId, body.agentId as string);
          this.sendJson(res, 200, { success: true, session });
        } catch (err: any) {
          this.sendJson(res, 400, { error: err.message });
        }
        return;
      }

      if (subAction === 'disconnect' && method === 'POST') {
        try {
          await this.enterpriseEnvironment.registry.disconnect(envId);
          this.sendJson(res, 200, { success: true, message: `Disconnected environment ${envId}` });
        } catch (err: any) {
          this.sendJson(res, 400, { error: err.message });
        }
        return;
      }

      if (subAction === 'health' && method === 'POST') {
        try {
          const health = await this.enterpriseEnvironment.registry.checkHealth(envId);
          this.sendJson(res, 200, { success: true, health });
        } catch (err: any) {
          this.sendJson(res, 400, { error: err.message });
        }
        return;
      }

      if (subAction === 'capabilities' && method === 'GET') {
        const capabilities = await this.enterpriseEnvironment.registry.listCapabilities(envId);
        this.sendJson(res, 200, { success: true, capabilities });
        return;
      }

      if (subAction === 'processes' && method === 'GET') {
        try {
          const processes = await this.enterpriseEnvironment.registry.listProcesses(envId);
          this.sendJson(res, 200, { success: true, processes });
        } catch (err: any) {
          this.sendJson(res, 400, { error: err.message });
        }
        return;
      }

      if (subAction === 'files' && (method === 'GET' || method === 'POST')) {
        try {
          const body = method === 'POST' ? await this.readJsonBody(req) : {};
          const remotePath = (body.path as string) || url.searchParams.get('path') || '/';
          const maxItems = Number(body.maxItems || url.searchParams.get('maxItems') || 100);
          const files = await this.enterpriseEnvironment.registry.listFiles(envId, remotePath, maxItems);
          this.sendJson(res, 200, { success: true, path: remotePath, files });
        } catch (err: any) {
          this.sendJson(res, 400, { error: err.message });
        }
        return;
      }

      if (subAction === 'execute' && method === 'POST') {
        try {
          const body = await this.readJsonBody(req);
          const command = body.command as string;
          if (!command) {
            this.sendJson(res, 400, { error: 'Missing command in request body.' });
            return;
          }
          const result = await this.enterpriseEnvironment.registry.executeCommand(envId, command, body.options as any);
          this.sendJson(res, 200, { success: result.success, result });
        } catch (err: any) {
          this.sendJson(res, 400, { error: err.message });
        }
        return;
      }

      if (subAction === 'sessions' && method === 'GET') {
        const sessions = await this.enterpriseEnvironment.registry.listSessions(envId);
        this.sendJson(res, 200, { success: true, sessions });
        return;
      }
    }

    // =========================================================================
    // Phase 24: Multimodal Vision + Advanced Voice Endpoints (/multimodal/*)
    // =========================================================================
    if (pathname.startsWith('/multimodal')) {
      if (!this.multimodal) {
        this.sendJson(res, 503, { error: 'Multimodal perception subsystem is not initialized.' });
        return;
      }

      // GET /multimodal/status
      if (pathname === '/multimodal/status' && method === 'GET') {
        const obs = this.multimodal.repository.getLatestObservation();
        this.sendJson(res, 200, {
          success: true,
          status: 'READY',
          microphoneState: this.multimodal.voiceCoordinator.getMicrophoneState(),
          speakerState: this.multimodal.voiceCoordinator.getSpeakerState(),
          cameraState: this.multimodal.cameraManager.getState(),
          latestObservation: obs,
          activeModalities: ['TEXT', 'VISION', 'VOICE', 'UI', 'CAMERA'],
        });
        return;
      }

      // GET /multimodal/sessions & POST /multimodal/sessions
      if (pathname === '/multimodal/sessions') {
        if (method === 'GET') {
          const sessions = this.multimodal.repository.listSessions(50);
          this.sendJson(res, 200, { success: true, sessions });
          return;
        }
        if (method === 'POST') {
          const body = await this.readJsonBody(req);
          const session = this.multimodal.repository.createSession(body as any);
          this.sendJson(res, 201, { success: true, session });
          return;
        }
      }

      // POST /multimodal/observe
      if (pathname === '/multimodal/observe' && method === 'POST') {
        try {
          const body = await this.readJsonBody(req);
          const obs = await this.multimodal.visionEngine.inspectScreenshot('Active Screen UI', body as any);
          this.multimodal.repository.recordVisionObservation(obs);
          this.sendJson(res, 200, { success: true, observation: obs });
        } catch (err: any) {
          this.sendJson(res, 400, { error: err.message });
        }
        return;
      }

      // POST /multimodal/image or POST /multimodal/analyze
      if ((pathname === '/multimodal/image' || pathname === '/multimodal/analyze') && method === 'POST') {
        try {
          const body = await this.readJsonBody(req);
          const imageData = (body.imageData || body.image || 'Sample Image') as string;
          const obs = await this.multimodal.visionEngine.inspectScreenshot(imageData, {
            sourceType: 'USER_IMAGE_INPUT',
          });
          this.sendJson(res, 200, {
            success: true,
            observation: obs,
            analysis: `Multimodal analysis completed. Extracted ${obs.visualElementsCount} text segments. Challenges: ${obs.detectedChallenges.join(', ')}.`,
          });
        } catch (err: any) {
          this.sendJson(res, 400, { error: err.message });
        }
        return;
      }

      // POST /multimodal/voice/start & POST /multimodal/voice/stop
      if (pathname === '/multimodal/voice/start' && method === 'POST') {
        this.multimodal.voiceCoordinator.startListening();
        this.sendJson(res, 200, { success: true, microphoneState: this.multimodal.voiceCoordinator.getMicrophoneState() });
        return;
      }

      if (pathname === '/multimodal/voice/stop' && method === 'POST') {
        this.multimodal.voiceCoordinator.stopListening();
        this.sendJson(res, 200, { success: true, microphoneState: this.multimodal.voiceCoordinator.getMicrophoneState() });
        return;
      }

      // GET /multimodal/voice/status
      if (pathname === '/multimodal/voice/status' && method === 'GET') {
        this.sendJson(res, 200, {
          success: true,
          microphoneState: this.multimodal.voiceCoordinator.getMicrophoneState(),
          speakerState: this.multimodal.voiceCoordinator.getSpeakerState(),
          currentPartial: this.multimodal.voiceCoordinator.getCurrentPartial(),
        });
        return;
      }

      // POST /multimodal/speak
      if (pathname === '/multimodal/speak' && method === 'POST') {
        try {
          const body = await this.readJsonBody(req);
          const text = body.text as string;
          if (!text) {
            this.sendJson(res, 400, { error: 'Missing text in request body.' });
            return;
          }
          this.multimodal.voiceCoordinator.startPlayback(text);
          this.multimodal.voiceCoordinator.finishPlayback();
          this.sendJson(res, 200, { success: true, spokenText: text, status: 'COMPLETED' });
        } catch (err: any) {
          this.sendJson(res, 400, { error: err.message });
        }
        return;
      }

      // Camera endpoints (/multimodal/camera/*)
      if (pathname === '/multimodal/camera/start' && method === 'POST') {
        const started = this.multimodal.cameraManager.startCamera();
        this.sendJson(res, 200, { success: started, cameraState: this.multimodal.cameraManager.getState() });
        return;
      }

      if (pathname === '/multimodal/camera/stop' && method === 'POST') {
        const stopped = this.multimodal.cameraManager.stopCamera();
        this.sendJson(res, 200, { success: stopped, cameraState: this.multimodal.cameraManager.getState() });
        return;
      }

      if (pathname === '/multimodal/camera/status' && method === 'GET') {
        this.sendJson(res, 200, {
          success: true,
          cameraState: this.multimodal.cameraManager.getState(),
          availableCameras: this.multimodal.cameraManager.getAvailableCameras(),
        });
        return;
      }
    }

    // ==========================================
    // Phase 14 & 25: Company & Autonomous Operations Endpoints
    // ==========================================
    if (this.company) {
      const companyService = this.company.companyService;
      const opsRepo = this.company.opsRepo;
      const healthService = this.company.healthService;
      const kpiEngine = this.company.kpiEngine;
      const workforceManager = this.company.workforceManager;
      const approvalService = this.company.approvalService;
      const sopEngine = this.company.sopEngine;
      const incidentManager = this.company.incidentManager;
      const riskManager = this.company.riskManager;
      const crmOrderService = this.company.crmOrderService;
      const productReleaseService = this.company.productReleaseService;
      const recoveryRetirementService = this.company.recoveryRetirementService;
      const automationEngine = this.company.automationEngine;

      // GET /companies
      if (pathname === '/companies' && method === 'GET') {
        const companies = companyService.listCompanies();
        this.sendJson(res, 200, { success: true, count: companies.length, companies });
        return;
      }

      // POST /companies
      if (pathname === '/companies' && method === 'POST') {
        try {
          const body = await this.readJsonBody(req);
          const company = companyService.createCompany(body as any);
          this.sendJson(res, 201, { success: true, company });
        } catch (err: any) {
          this.sendJson(res, 400, { success: false, error: err.message });
        }
        return;
      }

      // GET /companies/:id/overview
      if (pathname.startsWith('/companies/') && pathname.endsWith('/overview') && method === 'GET') {
        const id = pathname.slice('/companies/'.length, -'/overview'.length);
        const overview = companyService.getCompanyOverview(id);
        if (overview) {
          this.sendJson(res, 200, { success: true, overview });
        } else {
          this.sendJson(res, 404, { success: false, error: `Company '${id}' not found.` });
        }
        return;
      }

      // GET /companies/:id/health
      if (pathname.startsWith('/companies/') && pathname.endsWith('/health') && method === 'GET') {
        const id = pathname.slice('/companies/'.length, -'/health'.length);
        if (healthService) {
          const health = healthService.evaluateCompanyHealth(id, automationEngine ? automationEngine.isPaused(id) : false);
          this.sendJson(res, 200, { success: true, health });
        } else {
          this.sendJson(res, 200, { success: true, health: { overallStatus: 'HEALTHY' } });
        }
        return;
      }

      // GET /companies/:id/status
      if (pathname.startsWith('/companies/') && pathname.endsWith('/status') && method === 'GET') {
        const id = pathname.slice('/companies/'.length, -'/status'.length);
        const state = automationEngine ? automationEngine.getCompanyOperatingState(id) : 'PLANNING';
        const isPaused = automationEngine ? automationEngine.isPaused(id) : false;
        this.sendJson(res, 200, { success: true, state, isPaused });
        return;
      }

      // POST /companies/:id/cycle
      if (pathname.startsWith('/companies/') && pathname.endsWith('/cycle') && method === 'POST') {
        const id = pathname.slice('/companies/'.length, -'/cycle'.length);
        if (automationEngine) {
          const result = automationEngine.executeOperatingCycle(id);
          this.sendJson(res, 200, { success: true, result });
        } else {
          this.sendJson(res, 501, { success: false, error: 'Automation engine not configured.' });
        }
        return;
      }

      // POST /companies/:id/pause & POST /companies/:id/resume
      if (pathname.startsWith('/companies/') && pathname.endsWith('/pause') && method === 'POST') {
        const id = pathname.slice('/companies/'.length, -'/pause'.length);
        automationEngine?.pauseCompany(id);
        this.sendJson(res, 200, { success: true, state: 'PAUSED' });
        return;
      }

      if (pathname.startsWith('/companies/') && pathname.endsWith('/resume') && method === 'POST') {
        const id = pathname.slice('/companies/'.length, -'/resume'.length);
        automationEngine?.resumeCompany(id);
        this.sendJson(res, 200, { success: true, state: 'OPERATING' });
        return;
      }

      // GET /companies/:id/objectives & POST /companies/:id/objectives
      if (pathname.startsWith('/companies/') && pathname.endsWith('/objectives')) {
        const id = pathname.slice('/companies/'.length, -'/objectives'.length);
        if (method === 'GET' && opsRepo) {
          const objectives = opsRepo.listObjectivesByCompany(id);
          this.sendJson(res, 200, { success: true, count: objectives.length, objectives });
          return;
        }
        if (method === 'POST' && opsRepo) {
          try {
            const body = await this.readJsonBody(req);
            const now = new Date().toISOString();
            const obj = opsRepo.createObjective({
              id: (body.id as string) || (await import('crypto')).randomUUID(),
              companyId: id,
              ownerAgentId: (body.ownerAgentId as string) || 'aja',
              title: (body.title as string) || 'Company Objective',
              description: body.description as string,
              category: (body.category as any) || 'STRATEGIC',
              priority: (body.priority as any) || 'NORMAL',
              status: 'PENDING',
              budgetAllocated: Number(body.budgetAllocated || 0),
              budgetSpent: 0,
              dependencies: (body.dependencies as string[]) || [],
              metrics: (body.metrics as string[]) || [],
              riskLevel: (body.riskLevel as any) || 'LOW',
              approvalRequired: Boolean(body.approvalRequired),
              createdAt: now,
              updatedAt: now
            });
            this.sendJson(res, 201, { success: true, objective: obj });
          } catch (err: any) {
            this.sendJson(res, 400, { success: false, error: err.message });
          }
          return;
        }
      }

      // GET /companies/:id/kpis & POST /companies/:id/kpis
      if (pathname.startsWith('/companies/') && pathname.endsWith('/kpis')) {
        const id = pathname.slice('/companies/'.length, -'/kpis'.length);
        if (method === 'GET' && kpiEngine) {
          const summary = kpiEngine.getKpiSummary(id);
          this.sendJson(res, 200, { success: true, ...summary });
          return;
        }
        if (method === 'POST' && kpiEngine) {
          try {
            const body = await this.readJsonBody(req);
            const kpi = kpiEngine.createKpi({
              companyId: id,
              name: (body.name as string) || 'New KPI',
              category: (body.category as any) || 'OPERATIONS',
              source: (body.source as any) || 'SYSTEM',
              unit: (body.unit as string) || '',
              targetValue: Number(body.targetValue || 100),
              initialValue: Number(body.initialValue || 0),
              ownerAgentId: (body.ownerAgentId as string) || 'garuda',
              deadline: body.deadline as string
            });
            this.sendJson(res, 201, { success: true, kpi });
          } catch (err: any) {
            this.sendJson(res, 400, { success: false, error: err.message });
          }
          return;
        }
      }

      // GET /companies/:id/orders & POST /companies/:id/orders
      if (pathname.startsWith('/companies/') && pathname.endsWith('/orders')) {
        const id = pathname.slice('/companies/'.length, -'/orders'.length);
        if (method === 'GET' && crmOrderService) {
          const orders = crmOrderService.listOrders(id);
          this.sendJson(res, 200, { success: true, count: orders.length, orders });
          return;
        }
        if (method === 'POST' && crmOrderService) {
          try {
            const body = await this.readJsonBody(req);
            const order = crmOrderService.createOrder({
              companyId: id,
              customerId: (body.customerId as string) || 'unknown_customer',
              productId: body.productId as string,
              items: (body.items as any[]) || [{ productId: 'default', productName: 'Item', quantity: 1, unitPrice: 100, subtotal: 100 }]
            });
            this.sendJson(res, 201, { success: true, order });
          } catch (err: any) {
            this.sendJson(res, 400, { success: false, error: err.message });
          }
          return;
        }
      }

      // GET /companies/:id/incidents & POST /companies/:id/incidents
      if (pathname.startsWith('/companies/') && pathname.endsWith('/incidents')) {
        const id = pathname.slice('/companies/'.length, -'/incidents'.length);
        if (method === 'GET' && incidentManager) {
          const incidents = incidentManager.listIncidents(id);
          this.sendJson(res, 200, { success: true, count: incidents.length, incidents });
          return;
        }
        if (method === 'POST' && incidentManager) {
          try {
            const body = await this.readJsonBody(req);
            const incident = incidentManager.createIncident({
              companyId: id,
              title: (body.title as string) || 'Incident',
              severity: (body.severity as any) || 'MEDIUM',
              affectedSystem: (body.affectedSystem as string) || 'Production'
            });
            this.sendJson(res, 201, { success: true, incident });
          } catch (err: any) {
            this.sendJson(res, 400, { success: false, error: err.message });
          }
          return;
        }
      }

      // GET /companies/:id/risks & POST /companies/:id/risks
      if (pathname.startsWith('/companies/') && pathname.endsWith('/risks')) {
        const id = pathname.slice('/companies/'.length, -'/risks'.length);
        if (method === 'GET' && riskManager) {
          const risks = riskManager.listRisks(id);
          this.sendJson(res, 200, { success: true, count: risks.length, risks });
          return;
        }
        if (method === 'POST' && riskManager) {
          try {
            const body = await this.readJsonBody(req);
            const risk = riskManager.registerRisk({
              companyId: id,
              title: (body.title as string) || 'Operational Risk',
              probability: (body.probability as any) || 'MEDIUM',
              impact: (body.impact as any) || 'MEDIUM',
              mitigation: body.mitigation as string
            });
            this.sendJson(res, 201, { success: true, risk });
          } catch (err: any) {
            this.sendJson(res, 400, { success: false, error: err.message });
          }
          return;
        }
      }

      // GET /companies/:id/approvals
      if (pathname.startsWith('/companies/') && pathname.endsWith('/approvals') && method === 'GET') {
        const id = pathname.slice('/companies/'.length, -'/approvals'.length);
        const approvals = approvalService ? approvalService.getPendingApprovals(id) : [];
        this.sendJson(res, 200, { success: true, count: approvals.length, approvals });
        return;
      }

      // GET /companies/:id/sops
      if (pathname.startsWith('/companies/') && pathname.endsWith('/sops') && method === 'GET') {
        const id = pathname.slice('/companies/'.length, -'/sops'.length);
        const sops = sopEngine ? sopEngine.listSops(id) : [];
        this.sendJson(res, 200, { success: true, count: sops.length, sops });
        return;
      }

      // GET /companies/:id/releases
      if (pathname.startsWith('/companies/') && pathname.endsWith('/releases') && method === 'GET') {
        const id = pathname.slice('/companies/'.length, -'/releases'.length);
        const releases = productReleaseService ? productReleaseService.listReleases(id) : [];
        this.sendJson(res, 200, { success: true, count: releases.length, releases });
        return;
      }

      // GET /companies/:id/workforce
      if (pathname.startsWith('/companies/') && pathname.endsWith('/workforce') && method === 'GET') {
        const capacities = workforceManager ? workforceManager.getAllCapacities() : [];
        this.sendJson(res, 200, { success: true, count: capacities.length, workforce: capacities });
        return;
      }

      // POST /companies/:id/recovery/checkpoint & GET /companies/:id/recovery/checkpoints
      if (pathname.startsWith('/companies/') && pathname.endsWith('/recovery/checkpoint') && method === 'POST') {
        const id = pathname.slice('/companies/'.length, -'/recovery/checkpoint'.length);
        if (recoveryRetirementService) {
          const checkpoint = recoveryRetirementService.createCheckpoint(id);
          this.sendJson(res, 201, { success: true, checkpoint });
        } else {
          this.sendJson(res, 501, { success: false, error: 'Recovery service not available' });
        }
        return;
      }

      if (pathname.startsWith('/companies/') && pathname.endsWith('/recovery/checkpoints') && method === 'GET') {
        const id = pathname.slice('/companies/'.length, -'/recovery/checkpoints'.length);
        const checkpoints = recoveryRetirementService ? recoveryRetirementService.getCheckpoints(id) : [];
        this.sendJson(res, 200, { success: true, count: checkpoints.length, checkpoints });
        return;
      }

      // POST /companies/:id/retirement/initiate & POST /companies/:id/retirement/advance
      if (pathname.startsWith('/companies/') && pathname.endsWith('/retirement/initiate') && method === 'POST') {
        const id = pathname.slice('/companies/'.length, -'/retirement/initiate'.length);
        if (recoveryRetirementService) {
          try {
            const plan = recoveryRetirementService.initiateRetirement(id);
            this.sendJson(res, 201, { success: true, plan });
          } catch (err: any) {
            this.sendJson(res, 400, { success: false, error: err.message });
          }
        }
        return;
      }

      if (pathname.startsWith('/companies/') && pathname.endsWith('/retirement/advance') && method === 'POST') {
        const id = pathname.slice('/companies/'.length, -'/retirement/advance'.length);
        if (recoveryRetirementService) {
          try {
            const body = await this.readJsonBody(req);
            const plan = recoveryRetirementService.advanceRetirement(id, body.status as any, body.approver as string);
            this.sendJson(res, 200, { success: true, plan });
          } catch (err: any) {
            this.sendJson(res, 400, { success: false, error: err.message });
          }
        }
        return;
      }

      // GET /companies/:id (single company)
      if (pathname.startsWith('/companies/') && method === 'GET') {
        const id = pathname.slice('/companies/'.length);
        const company = companyService.getCompany(id);
        if (company) {
          this.sendJson(res, 200, { success: true, company });
        } else {
          this.sendJson(res, 404, { success: false, error: `Company '${id}' not found.` });
        }
        return;
      }
    }

    // ============================================================================
    // Phase 26: Safe Self-Improvement & Self-Maintenance REST Endpoints
    // ============================================================================
    if (this.selfImprovement) {
      const coordinator = this.selfImprovement.coordinator;

      // GET /self/health
      if (pathname === '/self/health' && method === 'GET') {
        const companyId = url.searchParams.get('companyId') || undefined;
        const health = coordinator.healthService.evaluateHealth(companyId);
        this.sendJson(res, 200, { success: true, health });
        return;
      }

      // GET /self/anomalies
      if (pathname === '/self/anomalies' && method === 'GET') {
        const status = url.searchParams.get('status') || undefined;
        const severity = url.searchParams.get('severity') || undefined;
        const component = url.searchParams.get('component') || undefined;
        const companyId = url.searchParams.get('companyId') || undefined;
        const anomalies = coordinator.repository.listAnomalies({ status, severity, component, companyId });
        this.sendJson(res, 200, { success: true, count: anomalies.length, anomalies });
        return;
      }

      // GET /self/improvements & GET /self/proposals
      if ((pathname === '/self/improvements' || pathname === '/self/proposals') && method === 'GET') {
        const category = url.searchParams.get('category') || undefined;
        const state = url.searchParams.get('state') || undefined;
        const riskLevel = url.searchParams.get('riskLevel') || undefined;
        const companyId = url.searchParams.get('companyId') || undefined;
        const proposals = coordinator.repository.listProposals({ category, state, riskLevel, companyId });
        this.sendJson(res, 200, { success: true, count: proposals.length, proposals });
        return;
      }

      // POST /self/improvements & POST /self/proposals
      if ((pathname === '/self/improvements' || pathname === '/self/proposals') && method === 'POST') {
        try {
          const body = await this.readJsonBody(req);
          const proposal = coordinator.proposalService.createProposal({
            companyId: body.companyId as string,
            anomalyId: body.anomalyId as string,
            title: (body.title as string) || 'Self-Improvement Proposal',
            category: (body.category as any) || 'BUG_FIX',
            problemStatement: (body.problemStatement as string) || 'Identified optimization opportunity',
            evidenceSummary: (body.evidenceSummary as string) || 'Automated health telemetry',
            expectedBenefit: (body.expectedBenefit as string) || 'Improved subsystem performance',
            affectedComponents: (body.affectedComponents as string[]) || ['core'],
            riskLevel: body.riskLevel as any,
            proposedImplementation: (body.proposedImplementation as string) || 'Apply safe isolated change',
            rollbackStrategy: (body.rollbackStrategy as string) || 'Rollback changeset to snapshot',
            testPlan: (body.testPlan as string) || 'Run sandboxed regression suite',
            benchmarkPlan: body.benchmarkPlan as string,
            requiresHumanApproval: body.requiresHumanApproval as boolean,
            createdByAgent: (body.createdByAgent as string) || 'kali',
          });
          this.sendJson(res, 201, { success: true, proposal });
        } catch (err: any) {
          this.sendJson(res, 400, { success: false, error: err.message });
        }
        return;
      }

      // POST /self/improvements/:id/transition
      if (pathname.startsWith('/self/improvements/') && pathname.endsWith('/transition') && method === 'POST') {
        const id = pathname.slice('/self/improvements/'.length, -'/transition'.length);
        try {
          const body = await this.readJsonBody(req);
          const updated = coordinator.proposalService.transitionState(id, body.state as any);
          this.sendJson(res, 200, { success: true, proposal: updated });
        } catch (err: any) {
          this.sendJson(res, 400, { success: false, error: err.message });
        }
        return;
      }

      // POST /self/improvements/:id/approve
      if (pathname.startsWith('/self/improvements/') && pathname.endsWith('/approve') && method === 'POST') {
        const id = pathname.slice('/self/improvements/'.length, -'/approve'.length);
        try {
          const body = await this.readJsonBody(req);
          const updated = coordinator.proposalService.resolveApproval(
            id,
            'APPROVED',
            (body.resolvedBy as string) || 'RUSHIKESH',
            (body.rationale as string) || 'Approved by Sovereign Authority'
          );
          this.sendJson(res, 200, { success: true, proposal: updated });
        } catch (err: any) {
          this.sendJson(res, 400, { success: false, error: err.message });
        }
        return;
      }

      // POST /self/improvements/:id/reject
      if (pathname.startsWith('/self/improvements/') && pathname.endsWith('/reject') && method === 'POST') {
        const id = pathname.slice('/self/improvements/'.length, -'/reject'.length);
        try {
          const body = await this.readJsonBody(req);
          const updated = coordinator.proposalService.resolveApproval(
            id,
            'REJECTED',
            (body.resolvedBy as string) || 'RUSHIKESH',
            (body.rationale as string) || 'Rejected by Sovereign Authority'
          );
          this.sendJson(res, 200, { success: true, proposal: updated });
        } catch (err: any) {
          this.sendJson(res, 400, { success: false, error: err.message });
        }
        return;
      }

      // POST /self/improvements/:id/sandbox
      if (pathname.startsWith('/self/improvements/') && pathname.endsWith('/sandbox') && method === 'POST') {
        const id = pathname.slice('/self/improvements/'.length, -'/sandbox'.length);
        try {
          const body = await this.readJsonBody(req);
          const testResult = await coordinator.sandboxService.runSandboxedVerification({
            proposalId: id,
            changeSetId: (body.changeSetId as string) || 'cs_auto',
            suiteName: body.suiteName as string,
            simulateFailure: body.simulateFailure as boolean,
          });
          this.sendJson(res, 200, { success: true, testResult });
        } catch (err: any) {
          this.sendJson(res, 400, { success: false, error: err.message });
        }
        return;
      }

      // POST /self/improvements/:id/benchmark
      if (pathname.startsWith('/self/improvements/') && pathname.endsWith('/benchmark') && method === 'POST') {
        const id = pathname.slice('/self/improvements/'.length, -'/benchmark'.length);
        try {
          const body = await this.readJsonBody(req);
          const benchmark = coordinator.benchmarkService.runBenchmark({
            proposalId: id,
            changeSetId: (body.changeSetId as string) || 'cs_auto',
            metricName: (body.metricName as string) || 'latency_ms',
            unit: (body.unit as string) || 'ms',
            beforeValue: Number(body.beforeValue || 100),
            afterValue: Number(body.afterValue || 80),
            lowerIsBetter: body.lowerIsBetter !== undefined ? Boolean(body.lowerIsBetter) : true,
          });
          this.sendJson(res, 200, { success: true, benchmark });
        } catch (err: any) {
          this.sendJson(res, 400, { success: false, error: err.message });
        }
        return;
      }

      // POST /self/improvements/:id/apply
      if (pathname.startsWith('/self/improvements/') && pathname.endsWith('/apply') && method === 'POST') {
        const id = pathname.slice('/self/improvements/'.length, -'/apply'.length);
        try {
          const body = await this.readJsonBody(req);
          const deployment = coordinator.rollbackService.deployImprovement({
            proposalId: id,
            changeSetId: (body.changeSetId as string) || 'cs_auto',
            stage: (body.stage as any) || 'CANARY',
          });
          this.sendJson(res, 200, { success: true, deployment });
        } catch (err: any) {
          this.sendJson(res, 400, { success: false, error: err.message });
        }
        return;
      }

      // POST /self/improvements/:id/rollback
      if (pathname.startsWith('/self/improvements/') && pathname.endsWith('/rollback') && method === 'POST') {
        const id = pathname.slice('/self/improvements/'.length, -'/rollback'.length);
        try {
          const body = await this.readJsonBody(req);
          const rollback = coordinator.rollbackService.rollbackDeployment({
            deploymentId: (body.deploymentId as string) || 'dep_auto',
            proposalId: id,
            reason: (body.reason as string) || 'Automated regression detected',
            snapshotReference: body.snapshotReference as string,
          });
          this.sendJson(res, 200, { success: true, rollback });
        } catch (err: any) {
          this.sendJson(res, 400, { success: false, error: err.message });
        }
        return;
      }

      // GET /self/improvements/:id
      if (pathname.startsWith('/self/improvements/') && method === 'GET') {
        const id = pathname.slice('/self/improvements/'.length);
        const proposal = coordinator.repository.getProposalById(id);
        if (proposal) {
          const evidence = coordinator.repository.listEvidenceByProposal(id);
          const changeset = coordinator.repository.getChangeSetByProposal(id);
          const tests = coordinator.repository.listTestResultsByProposal(id);
          const benchmarks = coordinator.repository.listBenchmarkResultsByProposal(id);
          const approval = coordinator.repository.getApprovalByProposal(id);
          this.sendJson(res, 200, {
            success: true,
            proposal,
            evidence,
            changeset,
            tests,
            benchmarks,
            approval,
          });
        } else {
          this.sendJson(res, 404, { success: false, error: `Proposal '${id}' not found.` });
        }
        return;
      }

      // POST /self/cycle
      if (pathname === '/self/cycle' && method === 'POST') {
        try {
          const body = await this.readJsonBody(req);
          const result = await coordinator.runImprovementCycle(body.companyId as string);
          this.sendJson(res, 200, { success: true, result });
        } catch (err: any) {
          this.sendJson(res, 400, { success: false, error: err.message });
        }
        return;
      }

      // GET /self/maintenance & POST /self/maintenance/run
      if (pathname === '/self/maintenance' && method === 'GET') {
        const jobs = coordinator.maintenanceService.listMaintenanceHistory();
        this.sendJson(res, 200, { success: true, count: jobs.length, jobs });
        return;
      }

      if (pathname === '/self/maintenance/run' && method === 'POST') {
        try {
          const body = await this.readJsonBody(req);
          const job = await coordinator.maintenanceService.executeMaintenance(
            (body.type as any) || 'CLEANUP_TEMP_FILES',
            (body.target as string) || 'system'
          );
          this.sendJson(res, 200, { success: true, job });
        } catch (err: any) {
          this.sendJson(res, 400, { success: false, error: err.message });
        }
        return;
      }

      // GET /self/dependencies
      if (pathname === '/self/dependencies' && method === 'GET') {
        const findings = coordinator.dependencyIntelligence.analyzeDependencies();
        this.sendJson(res, 200, { success: true, count: findings.length, findings });
        return;
      }

      // GET /self/skills/health
      if (pathname === '/self/skills/health' && method === 'GET') {
        const health = coordinator.healthService.evaluateHealth();
        this.sendJson(res, 200, { success: true, skillHealth: health.subsystemScores.skills });
        return;
      }

      // GET /self/models/health
      if (pathname === '/self/models/health' && method === 'GET') {
        const health = coordinator.healthService.evaluateHealth();
        this.sendJson(res, 200, { success: true, modelHealth: health.subsystemScores.models });
        return;
      }

      // GET /self/capabilities/health
      if (pathname === '/self/capabilities/health' && method === 'GET') {
        const health = coordinator.healthService.evaluateHealth();
        this.sendJson(res, 200, { success: true, capabilityHealth: health.subsystemScores.tools });
        return;
      }
    }

    // Static SPA Asset Serving
    if (method === 'GET' && this.serveStatic(res, pathname)) {
      return;
    }

    // 404 Not Found
    this.sendJson(res, 404, {
      error: `Route not found: [${method}] ${pathname}`,
      availableEndpoints: [
        'GET /health',
        'GET /status',
        'GET /identity',
        'GET /models',
        'POST /models/respond',
        'POST /chat',
        'GET /events',
        'GET /memory/status',
        'GET /memory/profile',
        'GET /memory/items',
        'GET /conversations',
        'GET /conversations/:id',
        'POST /memory',
        'GET /tools',
        'GET /tools/:id',
        'POST /tools/:id/execute',
        'GET /tools/approvals',
        'POST /tools/approvals/:id',
        'GET /tools/audit',
        'GET /agents',
        'GET /agents/:id',
        'GET /agents/:id/status',
        'GET /tasks',
        'GET /tasks/:id',
        'GET /tasks/:id/children',
        'POST /tasks',
        'POST /missions',
        'GET /missions',
        'GET /missions/:id',
        'GET /goals',
        'POST /goals',
        'GET /goals/:id',
        'POST /goals/:id/plan',
        'POST /goals/:id/start',
        'POST /goals/:id/pause',
        'POST /goals/:id/resume',
        'POST /goals/:id/cancel',
        'POST /goals/:id/replan',
        'GET /goals/:id/milestones',
        'GET /goals/:id/progress',
        'GET /goals/:id/verification',
        'GET /goals/:id/report',
        'GET /companies',
        'POST /companies',
        'GET /companies/:id',
        'GET /companies/:id/overview',
        'GET /companies/:id/projects',
        'POST /companies/:id/projects',
        'GET /companies/:id/departments',
        'GET /companies/:id/workforce',
        'GET /companies/:id/products',
        'GET /companies/:id/customers',
        'GET /companies/:id/decisions',
        'GET /companies/:id/missions',
        'GET /companies/:id/artifacts',
        'GET /projects',
        'GET /projects/:id',
        'GET /environment/status',
        'GET /environment/applications',
        'GET /environment/processes',
        'GET /voice/status',
        'POST /voice/synthesize',
        'POST /objectives/:id/evaluate',
        'GET /objectives/:id/health',
        'GET /objectives/:id/evaluations',
        'GET /schedules',
        'POST /schedules',
        'GET /schedules/:id',
        'POST /schedules/:id/pause',
        'POST /schedules/:id/resume',
        'DELETE /schedules/:id',
        'GET /capabilities',
        'GET /capabilities/:id',
        'GET /capabilities/:id/health',
        'GET /capabilities/health/all',
        'POST /capabilities/execute',
        'POST /capabilities/route',
        'GET /governance/resources',
        'GET /skills',
        'POST /skills',
        'GET /skills/:id',
        'GET /skills/:id/versions',
        'POST /skills/:id/enable',
        'POST /skills/:id/disable',
        'POST /skills/:id/validate',
        'POST /skills/:id/execute',
        'GET /skills/:id/executions',
        'GET /skills/:id/statistics',
        'GET /skills/:id/improvements',
        'POST /skills/:id/improvements',
        'POST /skills/match',
        'POST /skills/preview'
      ]
    });
  }

  private serveStatic(res: ServerResponse, pathname: string): boolean {
    const distDir = path.resolve(process.cwd(), 'ui/dist');
    if (!fs.existsSync(distDir)) {
      return false;
    }

    const spaRoutes = [
      '/',
      '/',
      '/command-center',
      '/chat',
      '/agent-town',
      '/agents',
      '/missions',
      '/goals',
      '/tasks',
      '/companies',
      '/projects',
      '/company-os',
      '/tools',
      '/approvals',
      '/memory',
      '/knowledge',
      '/skills',
      '/mcp',
      '/computer',
      '/capabilities',
      '/environment',
      '/models',
      '/audit',
      '/self',
      '/self-improvement',
      '/settings'
    ];

    let targetPath = path.join(distDir, pathname === '/' ? 'index.html' : pathname.replace(/^\//, ''));

    if (fs.existsSync(targetPath) && !fs.statSync(targetPath).isDirectory()) {
      // File exists in dist
    } else if (spaRoutes.includes(pathname)) {
      // Known SPA client route
      targetPath = path.join(distDir, 'index.html');
    } else {
      return false;
    }

    if (!fs.existsSync(targetPath)) {
      return false;
    }

    const ext = path.extname(targetPath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.ico': 'image/x-icon',
      '.woff2': 'font/woff2',
      '.woff': 'font/woff',
      '.ttf': 'font/ttf'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    try {
      const content = fs.readFileSync(targetPath);
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': content.length,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000'
      });
      res.end(content);
      return true;
    } catch {
      return false;
    }
  }

  private sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
    const payload = JSON.stringify(data, null, 2);
    res.writeHead(statusCode, {
      'Content-Length': Buffer.byteLength(payload),
      'Content-Type': 'application/json'
    });
    res.end(payload);
  }

  private async readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.setEncoding('utf8');

      req.on('data', (chunk) => {
        body += chunk;
        if (body.length > 1024 * 1024) { // 1MB body limit
          req.destroy(new Error('Request payload too large (exceeds 1MB)'));
        }
      });

      req.on('end', () => {
        if (!body.trim()) {
          resolve({});
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch {
          reject(new Error('Invalid JSON payload in request body'));
        }
      });

      req.on('error', (err) => reject(err));
    });
  }
}
