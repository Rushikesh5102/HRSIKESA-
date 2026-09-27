/**
 * HṚṢĪKEŚA (हृषीकेश) — Universal IDE & Development Workspace Master Fabric
 *
 * FP-09: Unifies workspace navigation, code search, precision file modification,
 * terminal execution, dev server preview, Git SCM, and the 10-stage autonomous loop.
 */

import { DatabaseManager } from '../persistence/database/database.manager.js';
import { EventBus } from '../core/events/event-bus.js';
import { ResourceGovernor } from '../core/hardware/resource.governor.js';
import { ILogger } from '../core/logging/logger.types.js';
import { UniversalCapabilityFabric } from '../capabilities/fabric/universal.capability.fabric.js';
import { IdeRepository } from './repository/ide.repository.js';
import { WorkspaceManager } from './workspace/workspace.manager.js';
import { CodeSearchEngine } from './search/code.search.js';
import { EditorEngine } from './editor/editor.engine.js';
import { TerminalManager } from './terminal/terminal.manager.js';
import { PreviewManager } from './preview/preview.manager.js';
import { GitWorkspaceManager } from './git/git.workspace.js';
import { VerificationLoopEngine } from './verification/verification.loop.js';
import { WorkspaceMetadata } from './types/ide.types.js';

export interface IdeFabricOptions {
  dbManager: DatabaseManager;
  fabric?: UniversalCapabilityFabric;
  capabilityFabric?: UniversalCapabilityFabric;
  eventBus?: EventBus;
  resourceGovernor?: ResourceGovernor;
  logger?: ILogger;
}

export class IdeFabric {
  private readonly dbManager: DatabaseManager;
  private readonly fabric?: UniversalCapabilityFabric;
  private readonly eventBus?: EventBus;
  private readonly resourceGovernor?: ResourceGovernor;
  private readonly logger?: ILogger;

  private readonly repo: IdeRepository;
  private readonly workspaceManager: WorkspaceManager;
  private readonly codeSearchEngine: CodeSearchEngine;
  private readonly editorEngine: EditorEngine;
  private readonly terminalManager: TerminalManager;
  private readonly previewManager: PreviewManager;
  private readonly gitWorkspaceManager: GitWorkspaceManager;
  private readonly verificationLoopEngine: VerificationLoopEngine;

  private initialized = false;

  constructor(options: IdeFabricOptions) {
    this.dbManager = options.dbManager;
    this.fabric = options.fabric || options.capabilityFabric;
    this.eventBus = options.eventBus;
    this.resourceGovernor = options.resourceGovernor;
    this.logger = options.logger?.child('IdeFabric');

    this.repo = new IdeRepository(this.dbManager);
    this.workspaceManager = new WorkspaceManager(this.repo, this.eventBus, this.logger);
    this.codeSearchEngine = new CodeSearchEngine(this.workspaceManager);
    this.editorEngine = new EditorEngine(this.repo, this.logger);
    this.terminalManager = new TerminalManager(this.repo, this.eventBus, this.logger);
    this.previewManager = new PreviewManager(this.repo, this.terminalManager, this.eventBus, this.logger);
    this.gitWorkspaceManager = new GitWorkspaceManager(this.terminalManager);
    this.verificationLoopEngine = new VerificationLoopEngine(
      this.repo,
      this.workspaceManager,
      this.editorEngine,
      this.terminalManager,
      this.eventBus,
      this.logger
    );
  }

  /**
   * Initializes the Universal IDE Fabric and registers capabilities with FP-07.
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    if (this.fabric) {
      this.registerIdeCapabilities();
    }

    this.initialized = true;
    this.eventBus?.emit('ide.fabric.initialized', {
      timestamp: new Date().toISOString(),
    });

    this.logger?.info('Universal IDE & Development Workspace Fabric online.');
  }

  // Subsystem accessors
  public getRepository(): IdeRepository { return this.repo; }
  public getWorkspaceManager(): WorkspaceManager { return this.workspaceManager; }
  public getCodeSearchEngine(): CodeSearchEngine { return this.codeSearchEngine; }
  public getEditorEngine(): EditorEngine { return this.editorEngine; }
  public getTerminalManager(): TerminalManager { return this.terminalManager; }
  public getPreviewManager(): PreviewManager { return this.previewManager; }
  public getGitWorkspaceManager(): GitWorkspaceManager { return this.gitWorkspaceManager; }
  public getVerificationLoopEngine(): VerificationLoopEngine { return this.verificationLoopEngine; }

  // Aliases for convenience
  public getCodeSearch(): CodeSearchEngine { return this.codeSearchEngine; }
  public getGitWorkspace(): GitWorkspaceManager { return this.gitWorkspaceManager; }
  public getVerificationLoop(): VerificationLoopEngine { return this.verificationLoopEngine; }

  /**
   * Opens or selects active project workspace.
   */
  public async openWorkspace(rootPath: string, options?: { name?: string; companyId?: string; projectId?: string }): Promise<WorkspaceMetadata> {
    return this.workspaceManager.openWorkspace(rootPath, options);
  }

  public async executeCommand(commandLine: string, cwd?: string, timeoutMs = 60000) {
    const ws = this.workspaceManager.getActiveWorkspace();
    const workingDir = cwd || ws?.rootPath || process.cwd();
    return this.terminalManager.executeSync(commandLine, workingDir, timeoutMs);
  }

  public async runVerificationLoop(options?: { instruction?: string; autoFix?: boolean; maxCorrectionAttempts?: number }) {
    const ws = this.workspaceManager.getActiveWorkspace();
    return this.verificationLoopEngine.executeLoop({
      workspace: ws,
      instruction: options?.instruction,
      autoFix: options?.autoFix,
      maxIterations: options?.maxCorrectionAttempts,
    });
  }

  /**
   * Shuts down terminals and preview servers cleanly.
   */
  public async shutdown(): Promise<void> {
    this.terminalManager.shutdown();
    this.previewManager.shutdown();
    this.logger?.info('Universal IDE Fabric cleanly stopped.');
  }

  public getResourceGovernor(): ResourceGovernor | undefined {
    return this.resourceGovernor;
  }

  /**
   * Registers sovereign IDE capabilities into FP-07 UniversalCapabilityFabric.
   */
  private registerIdeCapabilities(): void {
    if (!this.fabric) return;

    const capabilities = [
      {
        id: 'ide.workspace.open',
        name: 'Open Project Workspace',
        description: 'Opens and analyzes a project root directory for autonomous development',
        category: 'DEVELOPMENT' as const,
        provider: 'HṚṢĪKEŚA IDE',
        source: 'local' as const,
        version: '1.0.0',
        protocol: 'NATIVE' as const,
        status: 'AVAILABLE' as const,
        trustLevel: 'SYSTEM' as const,
        riskLevel: 'TIER_0_READ_ONLY' as const,
        privacyClass: 'SOVEREIGN_LOCAL' as const,
        authentication: { type: 'NONE' as const },
        scopes: ['workspace:read'],
        inputs: { rootPath: { type: 'string', required: true, description: 'Workspace path' } },
        outputs: { workspaceId: { type: 'string' }, architecture: { type: 'string' } },
        dependencies: [],
        environments: ['local'],
        supportedOperations: ['workspace.open'],
        provenance: {
          source: 'src/ide',
          provider: 'HṚṢĪKEŚA',
          version: '1.0.0',
          discoveredAt: new Date().toISOString(),
          registeredBy: 'SYSTEM',
          verificationStatus: 'VERIFIED' as const,
        },
      },
      {
        id: 'ide.workspace.inspect',
        name: 'Inspect Workspace Architecture',
        description: 'Analyzes frameworks, entrypoints, dependencies, and file tree',
        category: 'DEVELOPMENT' as const,
        provider: 'HṚṢĪKEŚA IDE',
        source: 'local' as const,
        version: '1.0.0',
        protocol: 'NATIVE' as const,
        status: 'AVAILABLE' as const,
        trustLevel: 'SYSTEM' as const,
        riskLevel: 'TIER_0_READ_ONLY' as const,
        privacyClass: 'SOVEREIGN_LOCAL' as const,
        authentication: { type: 'NONE' as const },
        scopes: ['workspace:read'],
        inputs: {},
        outputs: { architecture: { type: 'object' } },
        dependencies: [],
        environments: ['local'],
        supportedOperations: ['workspace.inspect'],
        provenance: {
          source: 'src/ide',
          provider: 'HṚṢĪKEŚA',
          version: '1.0.0',
          discoveredAt: new Date().toISOString(),
          registeredBy: 'SYSTEM',
          verificationStatus: 'VERIFIED' as const,
        },
      },
      {
        id: 'ide.terminal.execute',
        name: 'Execute Governed Terminal Command',
        description: 'Runs shell commands inside workspace with safety policies and circular buffers',
        category: 'TERMINAL' as const,
        provider: 'HṚṢĪKEŚA IDE',
        source: 'local' as const,
        version: '1.0.0',
        protocol: 'NATIVE' as const,
        status: 'AVAILABLE' as const,
        trustLevel: 'SYSTEM' as const,
        riskLevel: 'TIER_2_EXTERNAL_SIDE_EFFECT' as const,
        privacyClass: 'SOVEREIGN_LOCAL' as const,
        authentication: { type: 'NONE' as const },
        scopes: ['terminal:execute'],
        inputs: { command: { type: 'string', required: true } },
        outputs: { exitCode: { type: 'number' }, output: { type: 'string' } },
        dependencies: [],
        environments: ['local'],
        supportedOperations: ['terminal.execute'],
        provenance: {
          source: 'src/ide',
          provider: 'HṚṢĪKEŚA',
          version: '1.0.0',
          discoveredAt: new Date().toISOString(),
          registeredBy: 'SYSTEM',
          verificationStatus: 'VERIFIED' as const,
        },
      },
      {
        id: 'ide.code.search',
        name: 'Ripgrep Workspace Search',
        description: 'Performs high-performance regex code search across workspace files',
        category: 'DEVELOPMENT' as const,
        provider: 'HṚṢĪKEŚA IDE',
        source: 'local' as const,
        version: '1.0.0',
        protocol: 'NATIVE' as const,
        status: 'AVAILABLE' as const,
        trustLevel: 'SYSTEM' as const,
        riskLevel: 'TIER_0_READ_ONLY' as const,
        privacyClass: 'SOVEREIGN_LOCAL' as const,
        authentication: { type: 'NONE' as const },
        scopes: ['code:search'],
        inputs: { query: { type: 'string', required: true, description: 'Search term' } },
        outputs: { matches: { type: 'array' } },
        dependencies: [],
        environments: ['local'],
        supportedOperations: ['code.search'],
        provenance: {
          source: 'src/ide',
          provider: 'HṚṢĪKEŚA',
          version: '1.0.0',
          discoveredAt: new Date().toISOString(),
          registeredBy: 'SYSTEM',
          verificationStatus: 'VERIFIED' as const,
        },
      },
      {
        id: 'ide.file.edit',
        name: 'Precision Code Modification',
        description: 'Applies precision single-chunk or transactional multi-chunk code refactoring',
        category: 'DEVELOPMENT' as const,
        provider: 'HṚṢĪKEŚA IDE',
        source: 'local' as const,
        version: '1.0.0',
        protocol: 'NATIVE' as const,
        status: 'AVAILABLE' as const,
        trustLevel: 'SYSTEM' as const,
        riskLevel: 'TIER_1_SAFE_ACTION' as const,
        privacyClass: 'SOVEREIGN_LOCAL' as const,
        authentication: { type: 'NONE' as const },
        scopes: ['file:write'],
        inputs: { filePath: { type: 'string', required: true }, replacement: { type: 'string', required: true } },
        outputs: { diff: { type: 'string' } },
        dependencies: [],
        environments: ['local'],
        supportedOperations: ['file.edit'],
        provenance: {
          source: 'src/ide',
          provider: 'HṚṢĪKEŚA',
          version: '1.0.0',
          discoveredAt: new Date().toISOString(),
          registeredBy: 'SYSTEM',
          verificationStatus: 'VERIFIED' as const,
        },
      },
      {
        id: 'ide.verification.run',
        name: 'Autonomous 10-Stage Verification Loop',
        description: 'Executes UNDERSTAND -> PLAN -> MODIFY -> EXECUTE -> OBSERVE -> TEST -> VERIFY -> FIX -> REVERIFY -> REPORT',
        category: 'DEVELOPMENT' as const,
        provider: 'HṚṢĪKEŚA IDE',
        source: 'local' as const,
        version: '1.0.0',
        protocol: 'NATIVE' as const,
        status: 'AVAILABLE' as const,
        trustLevel: 'SYSTEM' as const,
        riskLevel: 'TIER_1_SAFE_ACTION' as const,
        privacyClass: 'SOVEREIGN_LOCAL' as const,
        authentication: { type: 'NONE' as const },
        scopes: ['verification:run'],
        inputs: { objective: { type: 'string', required: true } },
        outputs: { status: { type: 'string' }, report: { type: 'string' } },
        dependencies: [],
        environments: ['local'],
        supportedOperations: ['verification.run'],
        provenance: {
          source: 'src/ide',
          provider: 'HṚṢĪKEŚA',
          version: '1.0.0',
          discoveredAt: new Date().toISOString(),
          registeredBy: 'SYSTEM',
          verificationStatus: 'VERIFIED' as const,
        },
      },
    ];

    const now = new Date().toISOString();
    for (const cap of capabilities) {
      try {
        this.fabric.registerCapability({
          ...cap,
          enabled: true,
          verification: {
            verified: true,
            strategy: 'schema_match',
            lastVerifiedAt: now,
          },
          health: {
            status: 'HEALTHY',
            lastCheckedAt: now,
            consecutiveFailures: 0,
          },
          createdAt: now,
          updatedAt: now,
        });
      } catch (err: any) {
        this.logger?.warn(`Failed to register capability ${cap.id}: ${err?.message}`);
      }
    }
  }
}
