/**
 * HṚṢĪKEŚA (हृषीकेश) — Sovereign Micro-Kernel Runtime
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { IdentityManager } from '../core/identity/identity.manager.js';
import { ConfigManager } from '../core/configuration/config.manager.js';
import { LifecycleManager } from '../core/lifecycle/lifecycle.manager.js';
import { EventBus } from '../core/events/event-bus.js';
import { Logger } from '../core/logging/logger.js';
import { HardwareDetector } from '../core/hardware/hardware.detector.js';
import { ModelRegistry } from '../models/registry/model.registry.js';
import { ModelRouter } from '../models/router/model.router.js';
import { OllamaProvider } from '../models/providers/ollama.provider.js';
import { OpenAIProvider } from '../models/providers/openai.provider.js';
import { AnthropicProvider } from '../models/providers/anthropic.provider.js';
import { GeminiProvider } from '../models/providers/gemini.provider.js';
import { HttpServer } from '../api/http.server.js';
import { AppConfig } from '../core/configuration/config.types.js';
import { SessionManager } from '../conversation/session.manager.js';
import { ConversationService } from '../conversation/conversation.service.js';
import { DatabaseManager } from '../persistence/database/database.manager.js';
import { MigrationManager } from '../persistence/migrations/migration.manager.js';
import { SessionRepository } from '../persistence/repositories/session.repository.js';
import { MessageRepository } from '../persistence/repositories/message.repository.js';
import { MemoryRepository } from '../persistence/repositories/memory.repository.js';
import { ModelAuditRepository } from '../persistence/repositories/model-audit.repository.js';
import { CreatorProfileManager } from '../memory/creator.profile.js';
import { ContextAssembler } from '../conversation/context.assembler.js';

// Phase 12: Semantic Memory Subsystem
import { OllamaEmbeddingProvider } from '../memory/semantic/ollama.embedding.provider.js';
import { EmbeddingRepository } from '../memory/semantic/embedding.repository.js';
import { SemanticMemoryIndexer } from '../memory/semantic/semantic.indexer.js';
import { SemanticMemorySearch } from '../memory/semantic/semantic.search.js';
import { HybridMemoryRetriever } from '../memory/semantic/hybrid.retriever.js';

// Tool Execution & Security Subsystem
import { ToolRegistry } from '../tools/registry/tool.registry.js';
import { PermissionManager } from '../tools/permissions/permission.manager.js';
import { ToolAuditManager } from '../tools/audit/tool.audit.js';
import { ToolExecutionBus } from '../tools/execution/tool.bus.js';
import { SystemInfoTool } from '../tools/builtin/system.info.js';
import { FileListTool } from '../tools/builtin/filesystem.list.js';
import { FileReadTool } from '../tools/builtin/filesystem.read.js';
import { FileWriteTool } from '../tools/builtin/filesystem.write.js';
import { TimeNowTool } from '../tools/builtin/time.now.js';
import { OllamaModelsTool } from '../tools/builtin/ollama.models.js';
import { OllamaChatTool } from '../tools/builtin/ollama.chat.js';
import { TerminalExecuteTool } from '../tools/builtin/terminal.execute.js';

// Phase 6: Browser Automation Subsystem
import { IBrowserAdapter } from '../tools/browser/interfaces/browser.types.js';
import { PlaywrightBrowserAdapter } from '../tools/browser/adapter/playwright.adapter.js';
import {
  BrowserSessionCreateTool,
  BrowserNavigateTool,
  BrowserPageReadTool,
  BrowserClickTool,
  BrowserTypeTool,
  BrowserKeypressTool,
  BrowserScreenshotTool,
  BrowserSessionCloseTool,
} from '../tools/builtin/browser/browser.tools.js';

// Phase 7 & 9: Computer / Desktop GUI Automation Subsystem
import { IComputerAdapter } from '../tools/computer/interfaces/computer.types.js';
import { WindowsComputerAdapter } from '../tools/computer/adapter/windows.computer.adapter.js';
import { createComputerTools } from '../tools/builtin/computer/computer.tools.js';
import { IUiaAdapter } from '../tools/computer/uia/interfaces/uia.types.js';
import { WindowsUiaAdapter } from '../tools/computer/uia/windows/windows.uia.adapter.js';
import { createUiaTools } from '../tools/builtin/computer/uia.tools.js';

// Phase 10: Software & Environment Manager Subsystem
import { IEnvironmentManager } from '../environment/interfaces/environment.types.js';
import { EnvironmentManager } from '../environment/environment.manager.js';
import { createEnvironmentTools } from '../tools/builtin/environment/environment.tools.js';

// Phase 8: Voice Subsystem
import {
  ISpeechToTextProvider,
  ITextToSpeechProvider,
  IAudioRecorder,
  IAudioPlayer
} from '../voice/interfaces/voice.types.js';
import { FasterWhisperSTTProvider } from '../voice/stt/faster.whisper.stt.js';
import { WindowsSpeechSTTProvider } from '../voice/stt/windows.speech.stt.js';
import { PiperTTSProvider } from '../voice/tts/piper.tts.js';
import { WindowsSapiTTSProvider } from '../voice/tts/windows.sapi.tts.js';
import { WindowsAudioRecorder } from '../voice/audio/windows.audio.recorder.js';
import { WindowsAudioPlayer } from '../voice/audio/windows.audio.player.js';
import { VoicePipeline } from '../voice/pipeline/voice.pipeline.js';
import {
  PronunciationRepository,
  PronunciationNormalizer,
  LanguageDetector,
  VoiceProfileManager,
  VoiceInteractionCoordinator
} from '../voice/index.js';

// Phase 5 & 13: Multi-Agent Workforce & Mission Subsystem
import { AgentRegistry } from '../agents/registry/agent.registry.js';
import { INITIAL_AGENT_ROSTER } from '../agents/roster/initial.agents.js';
import { TaskRepository } from '../persistence/repositories/task.repository.js';
import { MissionRepository } from '../persistence/repositories/mission.repository.js';
import { ArtifactRepository } from '../persistence/repositories/artifact.repository.js';
import { AgentBlackboard } from '../agents/blackboard/blackboard.js';
import { AgentDelegationManager } from '../agents/delegation/delegation.manager.js';
import { AgentRuntime } from '../agents/runtime/agent.runtime.js';
import { MissionOrchestrator } from '../agents/mission/mission.orchestrator.js';
import { MissionPlanner } from '../agents/planner/mission.planner.js';
import { MissionVerifier } from '../agents/verification/mission.verifier.js';
import { RecoveryManager } from '../agents/recovery/recovery.manager.js';

// Phase 14: Company & Project Operating System Subsystem
import { CompanyRepository } from '../persistence/repositories/company.repository.js';
import { ProjectRepository } from '../persistence/repositories/project.repository.js';
import { DepartmentRepository } from '../persistence/repositories/department.repository.js';
import { CompanyWorkforceRepository } from '../persistence/repositories/company-workforce.repository.js';
import { ProductRepository } from '../persistence/repositories/product.repository.js';
import { CustomerRepository } from '../persistence/repositories/customer.repository.js';
import { DecisionRepository } from '../persistence/repositories/decision.repository.js';
import { CompanyService } from '../company/services/company.service.js';

// Phase 15: Autonomous Goal Engine Subsystem
import { GoalRepository } from '../persistence/repositories/goal.repository.js';
import { MilestoneRepository } from '../persistence/repositories/milestone.repository.js';
import { GoalPlanner } from '../goal/planner/goal.planner.js';
import { GoalDecomposer } from '../goal/decomposer/goal.decomposer.js';
import { GoalVerifier } from '../goal/verification/goal.verifier.js';
import { GoalExecutionEngine } from '../goal/engine/goal.execution.engine.js';

// Phase 16: Persistent Autonomous Operations & Open-Source Capability Foundation
import { ScheduleRepository } from '../persistence/repositories/schedule.repository.js';
import { ObjectiveEvaluationRepository } from '../persistence/repositories/objective-evaluation.repository.js';
import { ObjectiveEvaluator } from '../goal/engine/objective.evaluator.js';
import { PersistentScheduler } from '../scheduling/persistent.scheduler.js';
import { ObjectiveRecoveryManager } from './recovery/objective.recovery.manager.js';
import { ResourceGovernor } from '../core/hardware/resource.governor.js';
import {
  CapabilityRegistry,
  AgentCapabilityRouter,
  PlaywrightBrowserCapabilityAdapter,
  WindowsComputerCapabilityAdapter,
  FasterWhisperCapabilityAdapter,
  SemanticMemoryCapabilityAdapter,
  NativeFileSystemCapabilityAdapter,
  PowerShellTerminalCapabilityAdapter,
  ResearchWebCapabilityAdapter,
} from '../capabilities/index.js';

// Phase 17: Advanced Research & Web Intelligence Subsystem
import { ResearchRepository } from '../persistence/repositories/research.repository.js';
import { ResearchSourceRepository } from '../persistence/repositories/research-source.repository.js';
import { ResearchEvidenceRepository } from '../persistence/repositories/research-evidence.repository.js';
import { ResearchFindingRepository } from '../persistence/repositories/research-finding.repository.js';
import { ResearchEngine } from '../research/engine/research.engine.js';

// Phase 19: Advanced Memory & Knowledge Graph Subsystem
import {
  KnowledgeEntityRepository,
  KnowledgeRelationshipRepository,
  KnowledgeFactRepository,
  KnowledgeEvidenceRepository,
  KnowledgeClaimRepository,
  KnowledgeContradictionRepository,
  EntityResolutionService,
  KnowledgeGraphService,
  KnowledgeValidationService,
  KnowledgeExtractionService,
  KnowledgeContextAssembler,
  KnowledgeConsolidationService,
  KnowledgeTimelineService,
} from '../knowledge/index.js';

// Phase 20: Skills & Procedural Intelligence Subsystem
import {
  SkillRepository,
  SkillRegistry,
  SkillMatcher,
  SkillExecutionEngine,
  SkillSecurityValidator,
  BUILTIN_SKILLS,
} from '../skills/index.js';

// Phase 21: Dynamic MCP & Capability Ecosystem Subsystem
import {
  MCPServerRepository,
  MCPToolRepository,
  MCPResourceRepository,
  MCPPromptRepository,
  MCPSecurityRepository,
  MCPSecurityValidator,
  MCPProcessManager,
  MCPServerRegistry,
  MCPCapabilityAdapter,
  MCPCapabilityDiscovery,
  MCPRefreshService,
} from '../mcp/index.js';

// Phase 22: Advanced Computer Operator Subsystem
import {
  ComputerOperatorRepository,
  ComputerSafetyPolicy,
  ComputerWindowManager,
  ComputerObservationEngine,
  ComputerTargetResolver,
  ComputerVerificationEngine,
  ComputerActionExecutor,
  ComputerRecoveryEngine,
  ComputerActionPlanner,
  ComputerOperator,
  createComputerOperatorTools,
} from '../computer/operator/index.js';

// Phase 23: External / Enterprise Environments Subsystem
import {
  EnvironmentRepository,
  CredentialProvider,
  EnvironmentRegistry,
  createEnterpriseEnvironmentTools,
} from '../environment/enterprise/index.js';

// Phase 24: Multimodal Vision + Advanced Voice Subsystem
import {
  MultimodalRepository,
  MultimodalSecurityPolicy,
  MultimodalContextAssembler,
  VadService,
  StreamingVoiceCoordinator,
  VisionEngine,
  UiaVisionRouter,
  CameraManager,
  createMultimodalTools,
} from '../multimodal/index.js';

// Phase 25: Full Autonomous Company Operations Subsystem
import {
  CompanyOperationsRepository,
  CompanyHealthService,
  CompanyKpiEngine,
  CompanyWorkforceManager,
  CompanyApprovalService,
  CompanyPolicyEngine,
  CompanySopEngine,
  CompanyIncidentManager,
  CompanyRiskManager,
  CompanyCrmOrderService,
  CompanyProductReleaseService,
  CompanyRecoveryRetirementService,
  CompanyAutomationEngine,
  createCompanyTools,
} from '../company/index.js';

// Phase 26: Safe Self-Improvement & Self-Maintenance Subsystem
import {
  SelfImprovementRepository,
  SelfImprovementCoordinator,
  createSelfImprovementTools,
} from '../self-improvement/index.js';

export class HrisekesaKernel {
  public readonly identity: IdentityManager;
  public readonly configManager: ConfigManager;
  public readonly lifecycle: LifecycleManager;
  public readonly eventBus: EventBus;
  public readonly logger: Logger;
  public readonly hardware: HardwareDetector;
  public readonly registry: ModelRegistry;
  public readonly router: ModelRouter;

  // Persistence & Memory Subsystem
  public readonly db: DatabaseManager;
  public readonly migrations: MigrationManager;
  public readonly sessionRepo: SessionRepository;
  public readonly messageRepo: MessageRepository;
  public readonly memoryRepo: MemoryRepository;
  public readonly modelAuditRepo: ModelAuditRepository;
  public readonly creatorProfile: CreatorProfileManager;

  // Phase 14: Company & Project Operating System Repositories & Service
  public readonly companyRepo: CompanyRepository;
  public readonly projectRepo: ProjectRepository;
  public readonly departmentRepo: DepartmentRepository;
  public readonly workforceRepo: CompanyWorkforceRepository;
  public readonly productRepo: ProductRepository;
  public readonly customerRepo: CustomerRepository;
  public readonly decisionRepo: DecisionRepository;
  public readonly companyService: CompanyService;

  // Phase 15: Autonomous Goal Engine Subsystem
  public readonly goalRepo: GoalRepository;
  public readonly milestoneRepo: MilestoneRepository;
  public readonly goalPlanner: GoalPlanner;
  public readonly goalDecomposer: GoalDecomposer;
  public readonly goalVerifier: GoalVerifier;
  public readonly goalEngine: GoalExecutionEngine;

  // Phase 16: Persistent Autonomous Operations & Capability Foundation
  public readonly scheduleRepo: ScheduleRepository;
  public readonly evaluationRepo: ObjectiveEvaluationRepository;
  public readonly objectiveEvaluator: ObjectiveEvaluator;
  public readonly scheduler: PersistentScheduler;
  public readonly objectiveRecovery: ObjectiveRecoveryManager;
  public readonly resourceGovernor: ResourceGovernor;
  public readonly capabilityRegistry: CapabilityRegistry;
  public readonly capabilityRouter: AgentCapabilityRouter;

  // Phase 17: Advanced Research & Web Intelligence Subsystem
  public readonly researchStudyRepo: ResearchRepository;
  public readonly researchSourceRepo: ResearchSourceRepository;
  public readonly researchEvidenceRepo: ResearchEvidenceRepository;
  public readonly researchFindingRepo: ResearchFindingRepository;
  public readonly researchEngine: ResearchEngine;

  // Tool Execution & Permission Subsystem
  public readonly toolRegistry: ToolRegistry;
  public readonly permissionManager: PermissionManager;
  public readonly toolAudit: ToolAuditManager;
  public readonly toolBus: ToolExecutionBus;
  public readonly browserAdapter: IBrowserAdapter;
  public readonly computerAdapter: IComputerAdapter;
  public readonly uiaAdapter: IUiaAdapter;
  public readonly environmentManager: IEnvironmentManager;

  // Phase 8: Voice Subsystem
  public readonly stt: ISpeechToTextProvider;
  public readonly tts: ITextToSpeechProvider;
  public readonly audioRecorder: IAudioRecorder;
  public readonly audioPlayer: IAudioPlayer;
  public readonly voicePipeline: VoicePipeline;
  public readonly pronunciationRepo: PronunciationRepository;
  public readonly pronunciationNormalizer: PronunciationNormalizer;
  public readonly languageDetector: LanguageDetector;
  public readonly voiceProfileManager: VoiceProfileManager;
  public readonly voiceCoordinator: VoiceInteractionCoordinator;

  // Phase 5 & 13: Multi-Agent & Autonomous Mission Subsystem
  public readonly agentRegistry: AgentRegistry;
  public readonly taskRepo: TaskRepository;
  public readonly missionRepo: MissionRepository;
  public readonly artifactRepo: ArtifactRepository;
  public readonly blackboard: AgentBlackboard;
  public readonly delegationManager: AgentDelegationManager;
  public readonly agentRuntime: AgentRuntime;
  public readonly missionPlanner: MissionPlanner;
  public readonly missionVerifier: MissionVerifier;
  public readonly recoveryManager: RecoveryManager;
  public readonly missionOrchestrator: MissionOrchestrator;

  // Phase 12: Semantic Memory Subsystem
  public readonly embeddingProvider: OllamaEmbeddingProvider;
  public readonly embeddingRepo: EmbeddingRepository;
  public readonly semanticIndexer: SemanticMemoryIndexer;
  public readonly semanticSearch: SemanticMemorySearch;
  public readonly hybridRetriever: HybridMemoryRetriever;

  // Phase 19: Advanced Memory & Knowledge Graph Subsystem
  public readonly knowledgeEntityRepo: KnowledgeEntityRepository;
  public readonly knowledgeRelRepo: KnowledgeRelationshipRepository;
  public readonly knowledgeFactRepo: KnowledgeFactRepository;
  public readonly knowledgeEvidenceRepo: KnowledgeEvidenceRepository;
  public readonly knowledgeClaimRepo: KnowledgeClaimRepository;
  public readonly knowledgeContradictionRepo: KnowledgeContradictionRepository;
  public readonly entityResolution: EntityResolutionService;
  public readonly knowledgeGraph: KnowledgeGraphService;
  public readonly knowledgeValidation: KnowledgeValidationService;
  public readonly knowledgeExtraction: KnowledgeExtractionService;
  public readonly knowledgeContextAssembler: KnowledgeContextAssembler;
  public readonly knowledgeConsolidation: KnowledgeConsolidationService;
  public readonly knowledgeTimeline: KnowledgeTimelineService;

  // Phase 20: Skills & Procedural Intelligence Subsystem
  public readonly skillRepo: SkillRepository;
  public readonly skillRegistry: SkillRegistry;
  public readonly skillMatcher: SkillMatcher;
  public readonly skillExecutionEngine: SkillExecutionEngine;
  public readonly skillValidator: SkillSecurityValidator;

  // Phase 21: Dynamic MCP & Capability Ecosystem Subsystem
  public readonly mcpServerRepo: MCPServerRepository;
  public readonly mcpToolRepo: MCPToolRepository;
  public readonly mcpResourceRepo: MCPResourceRepository;
  public readonly mcpPromptRepo: MCPPromptRepository;
  public readonly mcpSecurityRepo: MCPSecurityRepository;
  public readonly mcpValidator: MCPSecurityValidator;
  public readonly mcpProcessManager: MCPProcessManager;
  public readonly mcpServerRegistry: MCPServerRegistry;
  public readonly mcpCapabilityAdapter: MCPCapabilityAdapter;
  public readonly mcpDiscovery: MCPCapabilityDiscovery;
  public readonly mcpRefresh: MCPRefreshService;

  // Phase 22: Advanced Computer Operator Subsystem
  public readonly computerOperatorRepo: ComputerOperatorRepository;
  public readonly computerSafetyPolicy: ComputerSafetyPolicy;
  public readonly computerWindowManager: ComputerWindowManager;
  public readonly computerObservationEngine: ComputerObservationEngine;
  public readonly computerTargetResolver: ComputerTargetResolver;
  public readonly computerVerificationEngine: ComputerVerificationEngine;
  public readonly computerActionExecutor: ComputerActionExecutor;
  public readonly computerRecoveryEngine: ComputerRecoveryEngine;
  public readonly computerActionPlanner: ComputerActionPlanner;
  public readonly computerOperator: ComputerOperator;

  // Phase 23: External / Enterprise Environments Subsystem
  public readonly enterpriseEnvironmentRepo: EnvironmentRepository;
  public readonly enterpriseCredentialProvider: CredentialProvider;
  public readonly enterpriseEnvironmentRegistry: EnvironmentRegistry;

  // Phase 24: Multimodal Vision + Advanced Voice Subsystem
  public readonly multimodalRepo: MultimodalRepository;
  public readonly multimodalSecurityPolicy: MultimodalSecurityPolicy;
  public readonly multimodalContextAssembler: MultimodalContextAssembler;
  public readonly multimodalVad: VadService;
  public readonly multimodalVoiceCoordinator: StreamingVoiceCoordinator;
  public readonly multimodalVisionEngine: VisionEngine;
  public readonly multimodalUiaRouter: UiaVisionRouter;
  public readonly multimodalCameraManager: CameraManager;

  // Phase 25: Autonomous Company Operations
  public readonly companyOpsRepo: CompanyOperationsRepository;
  public readonly companyHealthService: CompanyHealthService;
  public readonly companyKpiEngine: CompanyKpiEngine;
  public readonly companyWorkforceManager: CompanyWorkforceManager;
  public readonly companyApprovalService: CompanyApprovalService;
  public readonly companyPolicyEngine: CompanyPolicyEngine;
  public readonly companySopEngine: CompanySopEngine;
  public readonly companyIncidentManager: CompanyIncidentManager;
  public readonly companyRiskManager: CompanyRiskManager;
  public readonly companyCrmOrderService: CompanyCrmOrderService;
  public readonly companyProductReleaseService: CompanyProductReleaseService;
  public readonly companyRecoveryRetirementService: CompanyRecoveryRetirementService;
  public readonly companyAutomationEngine: CompanyAutomationEngine;

  // Phase 26: Safe Self-Improvement & Self-Maintenance Subsystem
  public readonly selfImprovementRepo: SelfImprovementRepository;
  public readonly selfImprovementCoordinator: SelfImprovementCoordinator;

  public readonly sessionManager: SessionManager;
  public readonly contextAssembler: ContextAssembler;
  public readonly conversation: ConversationService;
  public readonly server: HttpServer;
  private refreshTimer?: ReturnType<typeof setTimeout>;

  constructor(
    envOverrides: Partial<Record<string, string>> = {},
    customAdapters: {
      browserAdapter?: IBrowserAdapter;
      computerAdapter?: IComputerAdapter;
      uiaAdapter?: IUiaAdapter;
      environmentManager?: IEnvironmentManager;
      sttProvider?: ISpeechToTextProvider;
      ttsProvider?: ITextToSpeechProvider;
      audioRecorder?: IAudioRecorder;
      audioPlayer?: IAudioPlayer;
    } = {}
  ) {
    this.identity = new IdentityManager();
    this.configManager = new ConfigManager(envOverrides);
    const config = this.configManager.getConfig();

    this.lifecycle = new LifecycleManager();
    this.eventBus = new EventBus();
    this.logger = new Logger(
      'HṚṢĪKEŚA',
      config.server.logLevel,
      config.server.env === 'development'
    );
    this.hardware = new HardwareDetector();

    this.registry = new ModelRegistry(this.eventBus, this.logger);
    this.router = new ModelRouter(this.registry, this.eventBus, this.logger, this.hardware);

    // 1. Initialize Persistence Layer
    const dbPath = envOverrides['HRISEKESA_DB_PATH'] || envOverrides['DATABASE_PATH'] || process.env.HRISEKESA_DB_PATH || 'data/hrisekesa.db';
    this.db = new DatabaseManager(dbPath, this.logger);
    this.migrations = new MigrationManager(this.db, this.logger);
    this.sessionRepo = new SessionRepository(this.db);
    this.messageRepo = new MessageRepository(this.db);
    this.memoryRepo = new MemoryRepository(this.db);
    this.modelAuditRepo = new ModelAuditRepository(this.db);
    this.creatorProfile = new CreatorProfileManager(this.memoryRepo);
    this.router.setAuditRepository(this.modelAuditRepo);

    // Phase 14: Company & Project Operating System Repositories
    this.companyRepo = new CompanyRepository(this.db);
    this.projectRepo = new ProjectRepository(this.db);
    this.departmentRepo = new DepartmentRepository(this.db);
    this.workforceRepo = new CompanyWorkforceRepository(this.db);
    this.productRepo = new ProductRepository(this.db);
    this.customerRepo = new CustomerRepository(this.db);
    this.decisionRepo = new DecisionRepository(this.db);

    // 2. Initialize Tool Registry, Permissions & Audit Bus
    this.toolRegistry = new ToolRegistry(this.eventBus, this.logger);
    this.permissionManager = new PermissionManager(
      {
        allowedWorkspaceRoots: [process.cwd()]
      },
      this.eventBus,
      this.logger
    );
    this.toolAudit = new ToolAuditManager(this.db, this.eventBus, this.logger);
    this.toolBus = new ToolExecutionBus(
      this.toolRegistry,
      this.permissionManager,
      this.toolAudit,
      this.eventBus,
      this.logger
    );
    this.browserAdapter = customAdapters.browserAdapter || new PlaywrightBrowserAdapter();
    this.computerAdapter = customAdapters.computerAdapter || new WindowsComputerAdapter();
    this.uiaAdapter = customAdapters.uiaAdapter || new WindowsUiaAdapter();
    this.environmentManager = customAdapters.environmentManager || new EnvironmentManager(undefined, undefined, undefined, this.uiaAdapter);

    // Register initial safe built-in tools (system, files, terminal, ollama, browser, computer, uia, environment)
    this.registerBuiltinTools();

    // 3. Initialize Phase 5: Agent Workforce Subsystem
    this.taskRepo = new TaskRepository(this.db);
    this.missionRepo = new MissionRepository(this.db);
    this.blackboard = new AgentBlackboard(this.db, this.logger);
    this.delegationManager = new AgentDelegationManager(
      {
        maxDepth: 2,
        maxChildrenPerTask: 5,
        maxActiveTasks: 3
      },
      this.eventBus,
      this.logger
    );

    this.agentRegistry = new AgentRegistry(this.eventBus, this.logger);
    for (const agent of INITIAL_AGENT_ROSTER) {
      this.agentRegistry.register({ ...agent });
    }

    this.agentRuntime = new AgentRuntime(
      this.agentRegistry,
      this.toolRegistry,
      this.toolBus,
      this.router,
      this.eventBus,
      this.logger
    );

    // Phase 12: Semantic Memory Subsystem
    this.embeddingProvider = new OllamaEmbeddingProvider(undefined, this.logger);
    this.embeddingRepo = new EmbeddingRepository(this.db);
    this.semanticIndexer = new SemanticMemoryIndexer(
      this.embeddingProvider,
      this.embeddingRepo,
      this.hardware,
      this.logger
    );
    this.semanticSearch = new SemanticMemorySearch(
      this.embeddingProvider,
      this.embeddingRepo,
      this.memoryRepo,
      this.logger
    );
    this.hybridRetriever = new HybridMemoryRetriever(
      this.memoryRepo,
      this.semanticSearch,
      this.logger
    );

    // Phase 13: Autonomous Mission Engine & Execution Loop Subsystem
    this.artifactRepo = new ArtifactRepository(this.db);
    this.missionVerifier = new MissionVerifier(this.blackboard, this.logger);
    this.recoveryManager = new RecoveryManager(3, this.logger);
    this.missionPlanner = new MissionPlanner(
      this.agentRegistry,
      this.router,
      this.hybridRetriever,
      this.logger
    );
    this.missionOrchestrator = new MissionOrchestrator(
      this.agentRegistry,
      this.agentRuntime,
      this.delegationManager,
      this.blackboard,
      this.taskRepo,
      this.missionRepo,
      this.eventBus,
      this.logger,
      this.artifactRepo,
      this.missionPlanner,
      this.missionVerifier,
      this.recoveryManager,
      this.memoryRepo,
      this.semanticIndexer,
      this.hardware
    );

    // 4. Initialize Conversation & Context Assembly
    this.sessionManager = new SessionManager(this.sessionRepo, this.messageRepo);
    this.contextAssembler = new ContextAssembler(
      this.identity,
      this.creatorProfile,
      this.sessionManager,
      this.memoryRepo
    );
    this.conversation = new ConversationService(
      this.sessionManager,
      this.router,
      this.identity,
      this.logger,
      this.contextAssembler,
      this.toolBus,
      this.toolRegistry,
      this.missionOrchestrator
    );
    // Wire hybrid retriever into context assembler for semantic recall
    this.contextAssembler.setHybridRetriever(this.hybridRetriever);

    // 5. Initialize Phase 8: Voice Subsystem
    this.stt = customAdapters.sttProvider ||
      (config.voice.sttProvider === 'windows'
        ? new WindowsSpeechSTTProvider({ language: config.voice.language }, this.logger)
        : new FasterWhisperSTTProvider({ language: config.voice.language }, this.logger));

    this.tts = customAdapters.ttsProvider ||
      (config.voice.ttsProvider === 'sapi'
        ? new WindowsSapiTTSProvider({ artifactDir: config.voice.artifactDir, voiceName: config.voice.ttsVoice }, this.logger)
        : new PiperTTSProvider({ 
            artifactDir: config.voice.artifactDir,
            modelPath: 'data/audio/en-us-lessac-low.onnx'
          }, this.logger));

    this.audioRecorder = customAdapters.audioRecorder ||
      new WindowsAudioRecorder({ artifactDir: config.voice.artifactDir, sampleRate: config.voice.sampleRate }, this.logger);

    this.audioPlayer = customAdapters.audioPlayer ||
      new WindowsAudioPlayer(this.logger);

    // Multilingual Voice & Pronunciation Architecture Hardening
    this.pronunciationRepo = new PronunciationRepository();
    this.pronunciationNormalizer = new PronunciationNormalizer(this.pronunciationRepo);
    this.languageDetector = new LanguageDetector();
    this.voiceProfileManager = new VoiceProfileManager();

    this.voicePipeline = new VoicePipeline(
      this.stt,
      this.tts,
      this.audioRecorder,
      this.audioPlayer,
      this.conversation,
      {
        autoPlayTTS: false,
        normalizer: this.pronunciationNormalizer
      },
      this.logger
    );

    this.voiceCoordinator = new VoiceInteractionCoordinator(
      this.stt,
      this.tts,
      this.audioPlayer,
      this.pronunciationNormalizer,
      this.languageDetector,
      this.voiceProfileManager,
      this.conversation,
      undefined,
      this.logger
    );

    // Phase 14: Company & Project Operating System Service
    this.companyService = new CompanyService(
      this.companyRepo,
      this.projectRepo,
      this.departmentRepo,
      this.workforceRepo,
      this.productRepo,
      this.customerRepo,
      this.decisionRepo,
      this.missionRepo,
      this.artifactRepo
    );

    // Phase 15: Autonomous Goal Engine Subsystem
    this.goalRepo = new GoalRepository(this.db);
    this.milestoneRepo = new MilestoneRepository(this.db);
    this.goalPlanner = new GoalPlanner(
      this.agentRegistry,
      this.router,
      this.hybridRetriever,
      this.logger
    );
    this.goalDecomposer = new GoalDecomposer(
      this.agentRegistry,
      this.logger
    );
    this.goalVerifier = new GoalVerifier(
      this.missionRepo,
      this.milestoneRepo,
      this.artifactRepo,
      this.blackboard,
      this.logger
    );
    this.goalEngine = new GoalExecutionEngine(
      this.goalRepo,
      this.milestoneRepo,
      this.missionRepo,
      this.missionOrchestrator,
      this.goalPlanner,
      this.goalDecomposer,
      this.goalVerifier,
      this.eventBus,
      this.logger
    );

    // Phase 16: Persistent Autonomous Operations & Open-Source Capability Foundation
    this.scheduleRepo = new ScheduleRepository(this.db);
    this.evaluationRepo = new ObjectiveEvaluationRepository(this.db);
    this.objectiveEvaluator = new ObjectiveEvaluator({
      goalRepo: this.goalRepo,
      milestoneRepo: this.milestoneRepo,
      missionRepo: this.missionRepo,
      evaluationRepo: this.evaluationRepo,
      orchestrator: this.missionOrchestrator,
      verifier: this.goalVerifier,
      eventBus: this.eventBus,
      logger: this.logger,
    });
    this.scheduler = new PersistentScheduler(this.scheduleRepo, this.eventBus, this.logger);
    this.scheduler.registerHandler('goal', async (schedule) => {
      await this.objectiveEvaluator.evaluate(schedule.targetId);
    });
    this.scheduler.registerHandler('evaluation', async (schedule) => {
      await this.objectiveEvaluator.evaluate(schedule.targetId);
    });

    this.objectiveRecovery = new ObjectiveRecoveryManager(
      this.goalRepo,
      this.milestoneRepo,
      this.missionRepo,
      this.taskRepo,
      this.objectiveEvaluator,
      this.eventBus,
      this.logger
    );
    this.resourceGovernor = new ResourceGovernor(this.eventBus, this.logger);
    this.router.setResourceGovernor(this.resourceGovernor);

    this.capabilityRegistry = new CapabilityRegistry(this.eventBus, this.logger);
    this.capabilityRouter = new AgentCapabilityRouter(
      this.capabilityRegistry,
      this.agentRegistry,
      this.permissionManager,
      this.logger
    );

    // Phase 17: Advanced Research & Web Intelligence Subsystem
    this.researchStudyRepo = new ResearchRepository(this.db);
    this.researchSourceRepo = new ResearchSourceRepository(this.db);
    this.researchEvidenceRepo = new ResearchEvidenceRepository(this.db);
    this.researchFindingRepo = new ResearchFindingRepository(this.db);
    this.researchEngine = new ResearchEngine(
      this.researchStudyRepo,
      this.researchSourceRepo,
      this.researchEvidenceRepo,
      this.researchFindingRepo,
      this.memoryRepo,
      this.semanticIndexer,
      this.browserAdapter
    );

    this.scheduler.registerHandler('research', async (schedule) => {
      await this.researchEngine.executeStudy(schedule.targetId);
    });

    // Phase 19: Advanced Memory & Knowledge Graph Subsystem
    this.knowledgeEntityRepo = new KnowledgeEntityRepository(this.db);
    this.knowledgeRelRepo = new KnowledgeRelationshipRepository(this.db);
    this.knowledgeFactRepo = new KnowledgeFactRepository(this.db);
    this.knowledgeEvidenceRepo = new KnowledgeEvidenceRepository(this.db);
    this.knowledgeClaimRepo = new KnowledgeClaimRepository(this.db);
    this.knowledgeContradictionRepo = new KnowledgeContradictionRepository(this.db);

    this.entityResolution = new EntityResolutionService(
      this.knowledgeEntityRepo,
      this.knowledgeRelRepo,
      this.knowledgeFactRepo
    );
    this.knowledgeGraph = new KnowledgeGraphService(
      this.knowledgeEntityRepo,
      this.knowledgeRelRepo,
      this.knowledgeFactRepo,
      this.knowledgeEvidenceRepo
    );
    this.knowledgeValidation = new KnowledgeValidationService(
      this.knowledgeFactRepo,
      this.knowledgeContradictionRepo,
      this.knowledgeEvidenceRepo
    );
    this.knowledgeExtraction = new KnowledgeExtractionService(
      this.knowledgeClaimRepo,
      this.entityResolution,
      this.knowledgeValidation,
      this.router
    );
    this.knowledgeContextAssembler = new KnowledgeContextAssembler(
      this.knowledgeEntityRepo,
      this.knowledgeRelRepo,
      this.knowledgeFactRepo,
      this.knowledgeEvidenceRepo,
      this.entityResolution,
      this.knowledgeGraph,
      this.hybridRetriever
    );
    this.knowledgeConsolidation = new KnowledgeConsolidationService(
      this.knowledgeEntityRepo,
      this.knowledgeRelRepo,
      this.knowledgeFactRepo,
      this.knowledgeClaimRepo,
      this.knowledgeContradictionRepo,
      this.entityResolution,
      this.knowledgeValidation,
      this.resourceGovernor
    );
    this.knowledgeTimeline = new KnowledgeTimelineService(
      this.knowledgeFactRepo,
      this.knowledgeRelRepo,
      this.knowledgeEvidenceRepo,
      this.knowledgeContradictionRepo
    );

    this.registerBuiltinCapabilities();

    // Phase 20: Skills & Procedural Intelligence Subsystem
    this.skillRepo = new SkillRepository(this.db);
    this.skillValidator = new SkillSecurityValidator();
    this.skillRegistry = new SkillRegistry(
      this.skillRepo,
      this.skillValidator,
      this.eventBus,
      this.logger,
      this.knowledgeEntityRepo,
      this.knowledgeRelRepo
    );
    this.skillMatcher = new SkillMatcher(
      this.skillRegistry,
      this.capabilityRegistry,
      this.router,
      this.logger
    );
    this.skillExecutionEngine = new SkillExecutionEngine(
      this.skillRegistry,
      this.skillRepo,
      this.skillValidator,
      this.capabilityRegistry,
      this.toolBus,
      this.permissionManager,
      this.resourceGovernor,
      this.router,
      this.missionOrchestrator,
      this.eventBus,
      this.logger
    );

    // Register skills scheduler handler
    this.scheduler.registerHandler('skill', async (schedule) => {
      await this.skillExecutionEngine.executeSkill(schedule.targetId, (schedule.metadata as any) || {});
    });

    // Phase 21: Dynamic MCP & Capability Ecosystem Subsystem
    this.mcpServerRepo = new MCPServerRepository(this.db);
    this.mcpToolRepo = new MCPToolRepository(this.db);
    this.mcpResourceRepo = new MCPResourceRepository(this.db);
    this.mcpPromptRepo = new MCPPromptRepository(this.db);
    this.mcpSecurityRepo = new MCPSecurityRepository(this.db);
    this.mcpValidator = new MCPSecurityValidator(this.logger);
    this.mcpProcessManager = new MCPProcessManager(
      this.mcpServerRepo,
      this.resourceGovernor,
      this.eventBus,
      this.logger
    );
    this.mcpServerRegistry = new MCPServerRegistry(
      this.mcpServerRepo,
      this.mcpSecurityRepo,
      this.mcpValidator,
      this.eventBus,
      this.logger,
      this.knowledgeEntityRepo,
      this.knowledgeRelRepo
    );
    this.mcpCapabilityAdapter = new MCPCapabilityAdapter(
      this.mcpProcessManager,
      this.mcpToolRepo,
      this.mcpServerRepo,
      this.toolRegistry,
      this.capabilityRegistry,
      this.logger
    );
    this.mcpDiscovery = new MCPCapabilityDiscovery(
      this.mcpServerRepo,
      this.mcpToolRepo,
      this.mcpResourceRepo,
      this.mcpPromptRepo,
      this.mcpSecurityRepo,
      this.mcpValidator,
      this.mcpProcessManager,
      this.mcpCapabilityAdapter,
      this.eventBus,
      this.logger
    );
    this.mcpRefresh = new MCPRefreshService(
      this.mcpServerRepo,
      this.mcpToolRepo,
      this.mcpDiscovery,
      this.mcpValidator,
      this.eventBus,
      this.logger
    );

    // Phase 22: Advanced Computer Operator Subsystem
    this.computerOperatorRepo = new ComputerOperatorRepository(this.db);
    this.computerSafetyPolicy = new ComputerSafetyPolicy(this.logger);
    this.computerWindowManager = new ComputerWindowManager(this.computerAdapter, this.uiaAdapter, this.logger);
    this.computerObservationEngine = new ComputerObservationEngine(
      this.computerAdapter,
      this.computerWindowManager,
      this.uiaAdapter,
      this.logger
    );
    this.computerTargetResolver = new ComputerTargetResolver(
      this.uiaAdapter,
      this.computerOperatorRepo,
      this.logger
    );
    this.computerVerificationEngine = new ComputerVerificationEngine(
      this.computerObservationEngine,
      this.logger
    );
    this.computerActionExecutor = new ComputerActionExecutor(
      this.computerAdapter,
      this.computerTargetResolver,
      this.computerVerificationEngine,
      this.computerSafetyPolicy,
      this.uiaAdapter,
      this.logger
    );
    this.computerRecoveryEngine = new ComputerRecoveryEngine(
      this.computerObservationEngine,
      this.computerWindowManager,
      this.logger
    );
    this.computerActionPlanner = new ComputerActionPlanner(this.logger);
    this.computerOperator = new ComputerOperator(
      this.computerObservationEngine,
      this.computerWindowManager,
      this.computerTargetResolver,
      this.computerActionPlanner,
      this.computerActionExecutor,
      this.computerVerificationEngine,
      this.computerRecoveryEngine,
      this.computerSafetyPolicy,
      this.computerOperatorRepo,
      this.eventBus,
      this.resourceGovernor,
      this.knowledgeEntityRepo,
      this.logger
    );

    // Register Computer Operator Tools into ToolRegistry
    for (const tool of createComputerOperatorTools(this.computerOperator)) {
      this.toolRegistry.register(tool);
    }

    // Phase 23: External / Enterprise Environments Subsystem
    this.enterpriseEnvironmentRepo = new EnvironmentRepository(this.db);
    this.enterpriseCredentialProvider = new CredentialProvider();
    this.enterpriseEnvironmentRegistry = new EnvironmentRegistry(
      this.enterpriseEnvironmentRepo,
      this.enterpriseCredentialProvider,
      this.eventBus
    );

    // Register Enterprise Environment Tools into ToolRegistry
    for (const tool of createEnterpriseEnvironmentTools(this.enterpriseEnvironmentRegistry)) {
      this.toolRegistry.register(tool);
    }

    // Phase 24: Multimodal Vision + Advanced Voice Subsystem
    this.multimodalRepo = new MultimodalRepository(this.db);
    this.multimodalSecurityPolicy = new MultimodalSecurityPolicy(this.logger);
    this.multimodalContextAssembler = new MultimodalContextAssembler(this.multimodalSecurityPolicy, this.logger);
    this.multimodalVad = new VadService(undefined, this.logger);
    this.multimodalVoiceCoordinator = new StreamingVoiceCoordinator(this.multimodalVad, this.logger);
    this.multimodalVisionEngine = new VisionEngine(this.multimodalSecurityPolicy, this.logger);
    this.multimodalUiaRouter = new UiaVisionRouter(this.logger);
    this.multimodalCameraManager = new CameraManager(this.logger);

    // Register Multimodal Tools into ToolRegistry
    for (const tool of createMultimodalTools(
      this.multimodalVisionEngine,
      this.multimodalVoiceCoordinator,
      this.multimodalCameraManager,
      this.multimodalRepo
    )) {
      this.toolRegistry.register(tool);
    }

    // Phase 25: Autonomous Company Operations Subsystem
    this.companyOpsRepo = new CompanyOperationsRepository(this.db);
    this.companyHealthService = new CompanyHealthService(this.companyOpsRepo);
    this.companyKpiEngine = new CompanyKpiEngine(this.companyOpsRepo);
    this.companyWorkforceManager = new CompanyWorkforceManager();
    this.companyApprovalService = new CompanyApprovalService(this.companyOpsRepo);
    this.companyPolicyEngine = new CompanyPolicyEngine();
    this.companySopEngine = new CompanySopEngine(this.companyOpsRepo);
    this.companyIncidentManager = new CompanyIncidentManager(this.companyOpsRepo);
    this.companyRiskManager = new CompanyRiskManager(this.companyOpsRepo);
    this.companyCrmOrderService = new CompanyCrmOrderService(this.companyOpsRepo);
    this.companyProductReleaseService = new CompanyProductReleaseService(this.companyOpsRepo);
    this.companyRecoveryRetirementService = new CompanyRecoveryRetirementService(this.companyOpsRepo, this.companyRepo);
    this.companyAutomationEngine = new CompanyAutomationEngine(
      this.companyOpsRepo,
      this.companyRepo,
      this.companyHealthService,
      this.companyKpiEngine,
      this.companyWorkforceManager,
      this.companyApprovalService,
      this.companyIncidentManager,
      this.companyRiskManager,
      this.eventBus
    );

    // Register Company Tools into ToolRegistry
    for (const tool of createCompanyTools(
      this.companyAutomationEngine,
      this.companyHealthService,
      this.companyKpiEngine,
      this.companyCrmOrderService,
      this.companyIncidentManager,
      this.companyOpsRepo
    )) {
      this.toolRegistry.register(tool);
    }

    // Phase 26: Safe Self-Improvement & Self-Maintenance Subsystem
    this.selfImprovementRepo = new SelfImprovementRepository(this.db);
    this.selfImprovementCoordinator = new SelfImprovementCoordinator(
      this.selfImprovementRepo,
      this.eventBus,
      this.logger
    );
    this.selfImprovementCoordinator.initialize();

    // Register Self-Improvement Tools into ToolRegistry
    for (const tool of createSelfImprovementTools(this.selfImprovementCoordinator)) {
      this.toolRegistry.register(tool);
    }

    // Wire Goal Engine & Company OS to Conversation Service for unified human chat interaction
    this.conversation.setGoalEngine(this.goalEngine);
    this.conversation.setCompanyService(this.companyService);

    // 6. Initialize HTTP Gateway with Persistence, Tool & Agent Contexts
    this.server = new HttpServer(
      config.server,
      this.identity,
      this.lifecycle,
      this.hardware,
      this.registry,
      this.router,
      this.conversation,
      this.logger,
      {
        db: this.db,
        migrations: this.migrations,
        memoryRepo: this.memoryRepo,
        sessionRepo: this.sessionRepo,
        messageRepo: this.messageRepo,
        creatorProfile: this.creatorProfile,
        modelAuditRepo: this.modelAuditRepo,
      },
      {
        toolRegistry: this.toolRegistry,
        permissionManager: this.permissionManager,
        toolBus: this.toolBus,
        toolAudit: this.toolAudit,
      },
      {
        agentRegistry: this.agentRegistry,
        taskRepo: this.taskRepo,
        missionRepo: this.missionRepo,
        orchestrator: this.missionOrchestrator,
        delegationManager: this.delegationManager,
        blackboard: this.blackboard,
        runtime: this.agentRuntime,
        artifactRepo: this.artifactRepo,
        planner: this.missionPlanner,
      },
      {
        environmentManager: this.environmentManager,
      },
      {
        voicePipeline: this.voicePipeline,
        stt: this.stt,
        tts: this.tts,
        recorder: this.audioRecorder,
        player: this.audioPlayer,
        normalizer: this.pronunciationNormalizer,
        pronunciationRepo: this.pronunciationRepo,
        langDetector: this.languageDetector,
        profileManager: this.voiceProfileManager,
        coordinator: this.voiceCoordinator,
      },
      this.eventBus,
      {
        indexer: this.semanticIndexer,
        retriever: this.hybridRetriever,
        search: this.semanticSearch,
      },
      {
        companyService: this.companyService,
        opsRepo: this.companyOpsRepo,
        healthService: this.companyHealthService,
        kpiEngine: this.companyKpiEngine,
        workforceManager: this.companyWorkforceManager,
        approvalService: this.companyApprovalService,
        policyEngine: this.companyPolicyEngine,
        sopEngine: this.companySopEngine,
        incidentManager: this.companyIncidentManager,
        riskManager: this.companyRiskManager,
        crmOrderService: this.companyCrmOrderService,
        productReleaseService: this.companyProductReleaseService,
        recoveryRetirementService: this.companyRecoveryRetirementService,
        automationEngine: this.companyAutomationEngine,
      },
      {
        goalEngine: this.goalEngine,
        goalRepo: this.goalRepo,
        milestoneRepo: this.milestoneRepo,
        goalPlanner: this.goalPlanner,
        goalVerifier: this.goalVerifier,
      },
      {
        scheduleRepo: this.scheduleRepo,
        evaluationRepo: this.evaluationRepo,
        evaluator: this.objectiveEvaluator,
        scheduler: this.scheduler,
        recovery: this.objectiveRecovery,
        governor: this.resourceGovernor,
      },
      {
        registry: this.capabilityRegistry,
        router: this.capabilityRouter,
      },
      {
        engine: this.researchEngine,
        studyRepo: this.researchStudyRepo,
        sourceRepo: this.researchSourceRepo,
        evidenceRepo: this.researchEvidenceRepo,
        findingRepo: this.researchFindingRepo,
      },
      {
        entityRepo: this.knowledgeEntityRepo,
        relRepo: this.knowledgeRelRepo,
        factRepo: this.knowledgeFactRepo,
        evidenceRepo: this.knowledgeEvidenceRepo,
        claimRepo: this.knowledgeClaimRepo,
        contradictionRepo: this.knowledgeContradictionRepo,
        resolutionService: this.entityResolution,
        graphService: this.knowledgeGraph,
        validationService: this.knowledgeValidation,
        extractionService: this.knowledgeExtraction,
        contextAssembler: this.knowledgeContextAssembler,
        consolidationService: this.knowledgeConsolidation,
        timelineService: this.knowledgeTimeline,
      },
      {
        skillRepo: this.skillRepo,
        skillRegistry: this.skillRegistry,
        skillMatcher: this.skillMatcher,
        skillExecutionEngine: this.skillExecutionEngine,
        skillValidator: this.skillValidator,
      },
      {
        serverRepo: this.mcpServerRepo,
        toolRepo: this.mcpToolRepo,
        resourceRepo: this.mcpResourceRepo,
        promptRepo: this.mcpPromptRepo,
        secRepo: this.mcpSecurityRepo,
        validator: this.mcpValidator,
        processManager: this.mcpProcessManager,
        serverRegistry: this.mcpServerRegistry,
        adapter: this.mcpCapabilityAdapter,
        discovery: this.mcpDiscovery,
        refresh: this.mcpRefresh,
      },
      {
        operator: this.computerOperator,
        repository: this.computerOperatorRepo,
      },
      {
        registry: this.enterpriseEnvironmentRegistry,
        repository: this.enterpriseEnvironmentRepo,
      },
      {
        repository: this.multimodalRepo,
        visionEngine: this.multimodalVisionEngine,
        voiceCoordinator: this.multimodalVoiceCoordinator,
        cameraManager: this.multimodalCameraManager,
        contextAssembler: this.multimodalContextAssembler,
      },
      {
        coordinator: this.selfImprovementCoordinator,
      }
    );

    this.setupLifecycleHooks(config);
  }

  private registerBuiltinCapabilities(): void {
    this.capabilityRegistry.register(new PlaywrightBrowserCapabilityAdapter(this.browserAdapter));
    this.capabilityRegistry.register(new WindowsComputerCapabilityAdapter(this.computerAdapter, this.uiaAdapter));
    this.capabilityRegistry.register(new FasterWhisperCapabilityAdapter(this.stt, this.tts));
    this.capabilityRegistry.register(new SemanticMemoryCapabilityAdapter(this.semanticSearch));
    this.capabilityRegistry.register(new NativeFileSystemCapabilityAdapter());
    this.capabilityRegistry.register(new PowerShellTerminalCapabilityAdapter());
    this.capabilityRegistry.register(new ResearchWebCapabilityAdapter(this.researchEngine));
  }

  private registerBuiltinSkills(): void {
    for (const skill of BUILTIN_SKILLS) {
      try {
        if (!this.skillRegistry.get(skill.id) && !this.skillRegistry.get(skill.name)) {
          this.skillRegistry.register(skill);
        }
      } catch (err) {
        this.logger.warn(`Failed to register built-in skill '${skill.id}': ${err}`);
      }
    }
  }

  private registerBuiltinTools(): void {
    this.toolRegistry.register(new SystemInfoTool());
    this.toolRegistry.register(new FileListTool());
    this.toolRegistry.register(new FileReadTool());
    this.toolRegistry.register(new FileWriteTool());
    this.toolRegistry.register(new TimeNowTool());
    this.toolRegistry.register(new OllamaModelsTool());
    this.toolRegistry.register(new OllamaChatTool());
    this.toolRegistry.register(new TerminalExecuteTool());

    // Phase 6 Browser tools
    this.toolRegistry.register(new BrowserSessionCreateTool(this.browserAdapter));
    this.toolRegistry.register(new BrowserNavigateTool(this.browserAdapter));
    this.toolRegistry.register(new BrowserPageReadTool(this.browserAdapter));
    this.toolRegistry.register(new BrowserClickTool(this.browserAdapter));
    this.toolRegistry.register(new BrowserTypeTool(this.browserAdapter));
    this.toolRegistry.register(new BrowserKeypressTool(this.browserAdapter));
    this.toolRegistry.register(new BrowserScreenshotTool(this.browserAdapter));
    this.toolRegistry.register(new BrowserSessionCloseTool(this.browserAdapter));

    // Phase 7 Computer / Desktop tools
    for (const tool of createComputerTools(this.computerAdapter)) {
      this.toolRegistry.register(tool);
    }

    // Phase 9 Semantic UI Automation tools
    for (const tool of createUiaTools(this.uiaAdapter)) {
      this.toolRegistry.register(tool);
    }

    // Phase 10 Software & Environment tools
    for (const tool of createEnvironmentTools(this.environmentManager)) {
      this.toolRegistry.register(tool);
    }
  }

  private setupLifecycleHooks(config: AppConfig): void {
    // Startup hook
    this.lifecycle.registerStartupHook(async () => {
      this.logger.info(this.identity.getFormattedBanner());

      const hw = this.hardware.getProfile();
      this.logger.info(`Host Hardware: ${hw.cpu.model} (${hw.cpu.logicalProcessors} threads) | RAM: ${hw.memory.totalGb} GB (${hw.memory.freeGb} GB free) | GPU: ${hw.gpuEstimate.name}`);

      // 1. Initialize SQLite Database & Execute Migrations
      this.db.open();
      const applied = this.migrations.runPending();
      const dbDiag = this.db.getDiagnostics();
      this.logger.info(
        `Persistence Engine: SQLite (${dbDiag.path}) | WAL: ${dbDiag.journalMode} | FK: ${dbDiag.foreignKeys} | Applied Migrations: ${applied}`
      );

      // Register built-in procedural skills
      this.registerBuiltinSkills();

      // 2. Log Tools Subsystem
      const toolDiag = this.toolRegistry.getDiagnostics();
      this.logger.info(`Tool Execution Bus online: ${toolDiag.totalRegistered} registered tools across categories [system: ${toolDiag.byCategory.system || 0}, filesystem: ${toolDiag.byCategory.filesystem || 0}, ollama: ${toolDiag.byCategory.ollama || 0}, terminal: ${toolDiag.byCategory.terminal || 0}, browser: ${toolDiag.byCategory.browser || 0}, computer: ${toolDiag.byCategory.computer || 0}, environment: ${toolDiag.byCategory.environment || 0}].`);

      // 3. Log Agent Workforce Subsystem
      const agentDiag = this.agentRegistry.getDiagnostics();
      this.logger.info(`Agent Workforce online: ${agentDiag.totalRegistered} registered agents [${agentDiag.registeredIds.join(', ')}] with max delegation depth 2.`);

      // 4. Log Voice Subsystem
      this.logger.info(`Voice Subsystem online: STT [${this.stt.name}], TTS [${this.tts.name}], Mode [${config.voice.pushToTalk ? 'Push-to-Talk' : 'Continuous'}].`);

      // 5. Log Skills Subsystem
      const skillCount = this.skillRegistry.getAll().length;
      this.logger.info(`Skills & Procedural Intelligence online: ${skillCount} active skills registered.`);

      // 6. Register Model Providers
      await this.ensureLocalOllamaReady(config.ollama);
      const ollamaProvider = new OllamaProvider(config.ollama);
      const openaiProvider = new OpenAIProvider(config.cloud.openaiApiKey);
      const anthropicProvider = new AnthropicProvider(config.cloud.anthropicApiKey);
      const geminiProvider = new GeminiProvider(config.cloud.geminiApiKey);

      await this.registry.registerProvider(ollamaProvider);
      await this.registry.registerProvider(openaiProvider);
      await this.registry.registerProvider(anthropicProvider);
      await this.registry.registerProvider(geminiProvider);

      // Phase 12: Initialize semantic indexer (non-blocking)
      await this.semanticIndexer.initialize();

      // Phase 16: Run persistent startup recovery for goals and missions
      await this.objectiveRecovery.recoverOnStartup();

      // Phase 16: Start persistent scheduler
      this.scheduler.start();

      // 4. Start HTTP Gateway
      await this.server.start();

      this.eventBus.emit('system.started', {
        timestamp: new Date().toISOString(),
        version: this.identity.getSystemIdentity().version,
        host: config.server.host,
        port: config.server.port
      });

      const availableModels = this.registry.getAvailableModels();
      const records = this.registry.getAllRecords();
      const activeProviders = records.filter(
        (r) => r.health.status === 'healthy' || r.health.status === 'degraded'
      );

      this.eventBus.emit('system.ready', {
        timestamp: new Date().toISOString(),
        activeProvidersCount: activeProviders.length,
        activeModelsCount: availableModels.length
      });

      if (availableModels.length === 0) {
        this.lifecycle.setDegraded(
          'Runtime is online, but no AI models are currently installed in Ollama and no cloud API keys are configured.'
        );
        this.logger.warn(
          'HṚṢĪKEŚA status: DEGRADED (Zero models available). To install a local model, execute: `ollama pull qwen2.5:7b`'
        );
      } else {
        this.logger.info(`HṚṢĪKEŚA status: READY with ${availableModels.length} models available across ${activeProviders.length} active providers.`);
        // Non-blocking pre-warm to keep model resident in RAM
        this.router.routeAndExecute({
          prompt: 'System warm-up ping. Respond with one word: ready.',
          preferredModel: availableModels[0].name
        }).catch(() => {});
      }

      // Background model registry refresh — recovers automatically if Ollama starts after kernel boot.
      // Polls every 30s while degraded (0 models); backs off to every 5 minutes once models are available.
      const scheduleRefresh = (delayMs: number) => {
        this.refreshTimer = setTimeout(async () => {
          try {
            await this.registry.refreshAll();
            const count = this.registry.getAvailableModels().length;
            if (count > 0 && (this.lifecycle.getSnapshot().state === 'DEGRADED' || this.lifecycle.getSnapshot().degradationReason)) {
              this.lifecycle.setReady();
              this.logger.info(`Model registry recovered: ${count} model(s) now available.`);
            }
            // Back off to 5 min once healthy, keep 30s while still degraded
            scheduleRefresh(count > 0 ? 5 * 60 * 1000 : 30 * 1000);
          } catch {
            scheduleRefresh(30 * 1000);
          }
        }, delayMs);
      };
      scheduleRefresh(30 * 1000);
    });

    // Shutdown hook
    this.lifecycle.registerShutdownHook(async () => {
      this.logger.info('Commencing clean shutdown sequence...');
      const snapshot = this.lifecycle.getSnapshot();

      // Stop HTTP server before closing DB
      await this.server.stop();

      // Close all browser sessions and processes
      await this.browserAdapter.closeAll().catch(() => {});

      // Close all desktop processes spawned during session
      await this.computerAdapter.closeAll().catch(() => {});

      // Dispose UIA adapter
      await this.uiaAdapter.dispose().catch(() => {});

      // Shutdown environment manager
      await this.environmentManager.shutdown().catch(() => {});

      // Stop autonomous goal engine
      this.goalEngine.shutdown();

      // Phase 16: Stop persistent scheduler & timers
      if (this.refreshTimer) clearTimeout(this.refreshTimer);
      this.scheduler.stop();

      // Phase 21: Shutdown all active MCP child processes
      await this.mcpProcessManager.shutdownAll().catch(() => {});

      // Phase 12: Drain semantic indexing queue
      await this.semanticIndexer.drain().catch(() => {});

      // Shutdown voice pipeline
      await this.voicePipeline.shutdown().catch(() => {});

      // Gracefully close database connection
      this.db.close();

      this.eventBus.emit('system.shutdown', {
        timestamp: new Date().toISOString(),
        reason: 'Clean kernel shutdown',
        uptimeSeconds: snapshot.uptimeSeconds
      });

      this.logger.info(`HṚṢĪKEŚA runtime cleanly stopped. Uptime: ${snapshot.uptimeSeconds}s`);
    });
  }

  public async start(): Promise<void> {
    await this.lifecycle.start();
  }

  public async shutdown(reason?: string): Promise<void> {
    await this.lifecycle.shutdown(reason);
  }

  public getMissionOrchestrator(): MissionOrchestrator {
    return this.missionOrchestrator;
  }

  public getAgentRegistry(): AgentRegistry {
    return this.agentRegistry;
  }

  public getHardware(): HardwareDetector {
    return this.hardware;
  }

  public getDatabase(): DatabaseManager {
    return this.db;
  }

  public getSkillRegistry(): SkillRegistry {
    return this.skillRegistry;
  }

  public getSkillExecutionEngine(): SkillExecutionEngine {
    return this.skillExecutionEngine;
  }

  public getMCPServerRegistry(): MCPServerRegistry {
    return this.mcpServerRegistry;
  }

  public getMCPProcessManager(): MCPProcessManager {
    return this.mcpProcessManager;
  }

  public getMCPDiscovery(): MCPCapabilityDiscovery {
    return this.mcpDiscovery;
  }

  private async ensureLocalOllamaReady(ollamaConfig: { host: string }): Promise<void> {
    try {
      const resp = await fetch(`${ollamaConfig.host}/api/version`, { signal: AbortSignal.timeout(2000) });
      if (resp.ok) {
        this.logger.info('Ollama inference service is already active and healthy.');
        return;
      }
    } catch {
      // Not running, proceed to check local binary
    }

    const localOllamaBin = path.resolve(process.cwd(), 'tools', 'ollama', 'ollama.exe');
    if (!fs.existsSync(localOllamaBin)) {
      return;
    }

    const localModelDir = path.resolve(process.cwd(), 'data', 'models', 'ollama');
    this.logger.info('Auto-starting project-local Ollama service with local models...', {
      bin: localOllamaBin,
      models: localModelDir
    });

    try {
      const child = spawn(localOllamaBin, ['serve'], {
        detached: true,
        stdio: 'ignore',
        env: {
          ...process.env,
          OLLAMA_MODELS: localModelDir,
          OLLAMA_HOST: '127.0.0.1:11434'
        }
      });
      child.unref();

      // Poll until ready or timeout (6 seconds)
      const startTime = Date.now();
      while (Date.now() - startTime < 6000) {
        try {
          const resp = await fetch(`${ollamaConfig.host}/api/version`, { signal: AbortSignal.timeout(1000) });
          if (resp.ok) {
            this.logger.info('Project-local Ollama service initialized and serving local models.');
            return;
          }
        } catch {
          await new Promise((r) => setTimeout(r, 500));
        }
      }
      this.logger.warn('Project-local Ollama service did not respond within timeout window.');
    } catch (err: unknown) {
      this.logger.warn('Failed to auto-start project-local Ollama service:', { error: String(err) });
    }
  }
}
