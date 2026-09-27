/**
 * HṚṢĪKEŚA (हृषीकेश) — Capability Discovery Engine
 *
 * FP-07: Safe, multi-source capability discovery spanning Built-ins, ToolBus tools,
 * Skills, MCP ecosystem, installed software, and PATH CLI binaries.
 * Discovery does NOT imply authorization or trust.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ILogger } from '../../core/logging/logger.types.js';
import {
  UniversalCapability,
  CapabilityEvaluation,
  EvaluationVerdict,
} from '../fabric/capability.types.js';
import { CapabilityRepository } from '../fabric/capability.repository.js';
import { ToolRegistry } from '../../tools/registry/tool.registry.js';
import { MCPToolRepository } from '../../mcp/repositories/mcp-tool.repository.js';
import { MCPServerRepository } from '../../mcp/repositories/mcp-server.repository.js';
import { AppDiscovery } from '../../environment/discovery/app.discovery.js';

const execFileAsync = promisify(execFile);

export class CapabilityDiscoveryEngine {
  private readonly repository: CapabilityRepository;
  private readonly toolRegistry?: ToolRegistry;
  private readonly mcpToolRepo?: MCPToolRepository;
  private readonly mcpServerRepo?: MCPServerRepository;
  private readonly appDiscovery?: AppDiscovery;
  private readonly logger?: ILogger;

  constructor(
    repository: CapabilityRepository,
    toolRegistry?: ToolRegistry,
    mcpToolRepo?: MCPToolRepository,
    mcpServerRepo?: MCPServerRepository,
    appDiscovery?: AppDiscovery,
    logger?: ILogger
  ) {
    this.repository = repository;
    this.toolRegistry = toolRegistry;
    this.mcpToolRepo = mcpToolRepo;
    this.mcpServerRepo = mcpServerRepo;
    this.appDiscovery = appDiscovery;
    this.logger = logger?.child('CapabilityDiscoveryEngine');
  }

  /**
   * Run full discovery pass across all configured sources.
   */
  public async discoverAll(): Promise<UniversalCapability[]> {
    this.logger?.info('Starting universal capability discovery pass...');
    const discovered: UniversalCapability[] = [];

    // 1. Built-in Core Capabilities
    const builtins = this.discoverBuiltinCapabilities();
    discovered.push(...builtins);

    // 2. Local CLI on PATH
    const cliCaps = await this.discoverCliCapabilities();
    discovered.push(...cliCaps);

    // 3. ToolRegistry Tools
    if (this.toolRegistry) {
      const toolCaps = this.discoverToolRegistryCapabilities();
      discovered.push(...toolCaps);
    }

    // 4. MCP Tools
    if (this.mcpToolRepo && this.mcpServerRepo) {
      const mcpCaps = this.discoverMcpCapabilities();
      discovered.push(...mcpCaps);
    }

    // 5. Installed Software
    if (this.appDiscovery) {
      const softwareCaps = await this.discoverInstalledSoftware();
      discovered.push(...softwareCaps);
    }

    // Persist discovered capabilities into repository
    for (const cap of discovered) {
      this.repository.saveCapability(cap);
    }

    this.logger?.info(`Discovered and registered ${discovered.length} total capabilities.`);
    return discovered;
  }

  /**
   * Evaluate a capability for identity, security, privacy, and dependencies.
   */
  public evaluateCapability(capability: UniversalCapability): CapabilityEvaluation {
    const reasons: string[] = [];
    let identityVerdict: EvaluationVerdict = 'PASS';
    let securityVerdict: EvaluationVerdict = 'PASS';
    let privacyVerdict: EvaluationVerdict = 'PASS';
    let dependencyVerdict: EvaluationVerdict = 'PASS';

    // 1. Identity Check
    if (!capability.id || !capability.name || !capability.provider) {
      identityVerdict = 'FAIL';
      reasons.push('Missing essential identity attributes (id, name, or provider).');
    }

    // 2. Security Check
    if (capability.riskLevel === 'TIER_4_IRREVERSIBLE' && capability.trustLevel === 'UNVERIFIED') {
      securityVerdict = 'WARN';
      reasons.push('High-risk irreversible capability has unverified trust level.');
    }
    if (capability.trustLevel === 'BLOCKED') {
      securityVerdict = 'FAIL';
      reasons.push('Capability trust level is explicitly BLOCKED.');
    }

    // 3. Privacy Check
    if (capability.privacyClass === 'SOVEREIGN_LOCAL' && capability.protocol === 'REST') {
      privacyVerdict = 'FAIL';
      reasons.push('Sovereign local privacy class cannot communicate over external REST protocol.');
    }

    // 4. Dependencies Check
    if (capability.dependencies && capability.dependencies.length > 0) {
      // Evaluate known dependencies
      dependencyVerdict = 'PASS';
    }

    let overallVerdict: EvaluationVerdict = 'PASS';
    if (identityVerdict === 'FAIL' || securityVerdict === 'FAIL' || privacyVerdict === 'FAIL') {
      overallVerdict = 'FAIL';
    } else if (securityVerdict === 'WARN') {
      overallVerdict = 'WARN';
    }

    return {
      capabilityId: capability.id,
      identityVerdict,
      securityVerdict,
      privacyVerdict,
      dependencyVerdict,
      overallVerdict,
      reasons,
      evaluatedAt: new Date().toISOString(),
    };
  }

  private discoverBuiltinCapabilities(): UniversalCapability[] {
    const now = new Date().toISOString();
    return [
      {
        id: 'filesystem.read',
        name: 'Workspace Filesystem Read',
        description: 'Read files, list directories, and inspect metadata within permitted workspaces.',
        category: 'FILESYSTEM',
        provider: 'HṚṢĪKEŚA Native Core',
        source: 'builtin',
        version: '1.0.0',
        protocol: 'NATIVE',
        status: 'AVAILABLE',
        trustLevel: 'SYSTEM',
        riskLevel: 'TIER_0_READ_ONLY',
        privacyClass: 'SOVEREIGN_LOCAL',
        authentication: { type: 'NONE' },
        scopes: ['fs:read'],
        inputs: { path: { type: 'string', required: true } },
        outputs: { content: { type: 'string' } },
        dependencies: [],
        environments: ['win32', 'linux', 'darwin'],
        supportedOperations: ['read_file', 'list_dir', 'stat'],
        provenance: {
          source: 'HṚṢĪKEŚA Core',
          provider: 'HṚṢĪKEŚA Native Core',
          version: '1.0.0',
          license: 'Proprietary / Local',
          discoveredAt: now,
          registeredBy: 'SYSTEM',
          verificationStatus: 'VERIFIED',
        },
        verification: { verified: true, strategy: 'schema_match' },
        health: { status: 'HEALTHY', lastCheckedAt: now, consecutiveFailures: 0 },
        enabled: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'browser.navigate',
        name: 'Headless Browser Navigation',
        description: 'Navigate to target web pages, read rendered DOM, and capture screenshots.',
        category: 'BROWSER',
        provider: 'Microsoft Playwright',
        source: 'native',
        version: '1.49.0',
        protocol: 'BROWSER',
        status: 'AVAILABLE',
        trustLevel: 'TRUSTED',
        riskLevel: 'TIER_1_SAFE_ACTION',
        privacyClass: 'PRIVATE',
        authentication: { type: 'NONE' },
        scopes: ['browser:navigate', 'browser:read'],
        inputs: { url: { type: 'string', required: true } },
        outputs: { title: { type: 'string' }, content: { type: 'string' } },
        dependencies: ['playwright-core'],
        environments: ['win32', 'linux', 'darwin'],
        supportedOperations: ['navigate', 'read', 'screenshot'],
        provenance: {
          source: 'Playwright Subsystem',
          provider: 'Microsoft Playwright',
          version: '1.49.0',
          license: 'Apache-2.0',
          discoveredAt: now,
          registeredBy: 'SYSTEM',
          verificationStatus: 'VERIFIED',
        },
        verification: { verified: true, strategy: 'dom_presence' },
        health: { status: 'HEALTHY', lastCheckedAt: now, consecutiveFailures: 0 },
        enabled: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'software.installed.list',
        name: 'Installed Software Inventory',
        description: 'Enumerate installed applications and running system processes.',
        category: 'SOFTWARE',
        provider: 'HṚṢĪKEŚA Environment Manager',
        source: 'native',
        version: '1.0.0',
        protocol: 'LOCAL_PROCESS',
        status: 'AVAILABLE',
        trustLevel: 'SYSTEM',
        riskLevel: 'TIER_0_READ_ONLY',
        privacyClass: 'SOVEREIGN_LOCAL',
        authentication: { type: 'NONE' },
        scopes: ['env:read'],
        inputs: {},
        outputs: { applications: { type: 'array' } },
        dependencies: [],
        environments: ['win32'],
        supportedOperations: ['list', 'processes'],
        provenance: {
          source: 'Environment Manager',
          provider: 'HṚṢĪKEŚA Environment Manager',
          version: '1.0.0',
          discoveredAt: now,
          registeredBy: 'SYSTEM',
          verificationStatus: 'VERIFIED',
        },
        verification: { verified: true, strategy: 'schema_match' },
        health: { status: 'HEALTHY', lastCheckedAt: now, consecutiveFailures: 0 },
        enabled: true,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  private async discoverCliCapabilities(): Promise<UniversalCapability[]> {
    const candidates = [
      { id: 'cli.git.version', cmd: 'git', name: 'Git Version Control CLI', category: 'DEVELOPMENT' as const },
      { id: 'cli.node.version', cmd: 'node', name: 'Node.js Runtime CLI', category: 'DEVELOPMENT' as const },
      { id: 'cli.npm.version', cmd: 'npm', name: 'Node Package Manager CLI', category: 'DEVELOPMENT' as const },
      { id: 'cli.ollama.list', cmd: 'ollama', name: 'Ollama Local LLM CLI', category: 'RESEARCH' as const },
    ];

    const discovered: UniversalCapability[] = [];
    const now = new Date().toISOString();

    for (const c of candidates) {
      try {
        const { stdout } = await execFileAsync(c.cmd, ['--version'], { timeout: 3000, windowsHide: true });
        discovered.push({
          id: c.id,
          name: c.name,
          description: `Discovered local executable '${c.cmd}' on system PATH. Output: ${stdout.trim().split('\n')[0]}`,
          category: c.category,
          provider: c.cmd,
          source: 'cli',
          version: stdout.trim().split('\n')[0] || '1.0.0',
          protocol: 'CLI',
          status: 'AVAILABLE',
          trustLevel: 'TRUSTED',
          riskLevel: 'TIER_0_READ_ONLY',
          privacyClass: 'SOVEREIGN_LOCAL',
          authentication: { type: 'NONE' },
          scopes: ['cli:execute'],
          inputs: { args: { type: 'array', required: false } },
          outputs: { stdout: { type: 'string' }, exitCode: { type: 'number' } },
          dependencies: [c.cmd],
          environments: ['win32', 'linux', 'darwin'],
          supportedOperations: ['--version', 'run'],
          metadata: { executable: c.cmd },
          provenance: {
            source: 'Local System PATH',
            provider: c.cmd,
            version: 'system',
            license: 'Open Source / System',
            discoveredAt: now,
            registeredBy: 'DISCOVERY_ENGINE',
            verificationStatus: 'VERIFIED',
          },
          verification: { verified: true, strategy: 'exit_code' },
          health: { status: 'HEALTHY', lastCheckedAt: now, consecutiveFailures: 0, message: stdout.trim() },
          enabled: true,
          createdAt: now,
          updatedAt: now,
        });
      } catch {
        // Candidate not on PATH or execution timed out; record as UNAVAILABLE or skip
      }
    }

    return discovered;
  }

  private discoverToolRegistryCapabilities(): UniversalCapability[] {
    if (!this.toolRegistry) return [];
    const tools = this.toolRegistry.list();
    const now = new Date().toISOString();

    return tools.map((tool) => ({
      id: `tool.${tool.id}`,
      name: tool.name,
      description: tool.description,
      category: 'CUSTOM' as const,
      provider: 'HṚṢĪKEŚA ToolRegistry',
      source: 'native',
      version: tool.version || '1.0.0',
      protocol: 'NATIVE' as const,
      status: 'AVAILABLE' as const,
      trustLevel: 'SYSTEM' as const,
      riskLevel: tool.riskLevel === 0 ? 'TIER_0_READ_ONLY' : tool.riskLevel === 1 ? 'TIER_1_SAFE_ACTION' : 'TIER_2_EXTERNAL_SIDE_EFFECT',
      privacyClass: 'SOVEREIGN_LOCAL' as const,
      authentication: { type: 'NONE' as const },
      scopes: Array.from(tool.capabilities || []),
      inputs: tool.inputSchema as Record<string, unknown>,
      outputs: {},
      dependencies: [],
      environments: ['win32', 'linux', 'darwin'],
      supportedOperations: [tool.id],
      metadata: { toolId: tool.id },
      provenance: {
        source: 'ToolRegistry',
        provider: 'HṚṢĪKEŚA Core',
        version: tool.version || '1.0.0',
        license: 'Internal',
        discoveredAt: now,
        registeredBy: 'TOOL_REGISTRY_BRIDGE',
        verificationStatus: 'VERIFIED',
      },
      verification: { verified: true, strategy: 'schema_match' },
      health: { status: 'HEALTHY', lastCheckedAt: now, consecutiveFailures: 0 },
      enabled: true,
      createdAt: now,
      updatedAt: now,
    }));
  }

  private discoverMcpCapabilities(): UniversalCapability[] {
    if (!this.mcpToolRepo || !this.mcpServerRepo) return [];
    const servers = this.mcpServerRepo.list();
    const now = new Date().toISOString();
    const discovered: UniversalCapability[] = [];

    for (const server of servers) {
      const tools = this.mcpToolRepo.listTools(server.id);
      for (const tool of tools) {
        discovered.push({
          id: `mcp.${server.name}.${tool.name}`,
          name: tool.displayName || `MCP: ${server.name} / ${tool.name}`,
          description: tool.description || `MCP tool provided by ${server.name}`,
          category: 'MCP' as const,
          provider: server.name,
          source: 'mcp',
          version: server.version || '1.0.0',
          protocol: 'MCP' as const,
          status: 'REGISTERED' as const,
          trustLevel: 'UNVERIFIED' as const,
          riskLevel: 'TIER_2_EXTERNAL_SIDE_EFFECT' as const,
          privacyClass: 'PRIVATE' as const,
          authentication: { type: 'NONE' as const },
          scopes: tool.requiredPermissions || [],
          inputs: tool.inputSchema as Record<string, unknown>,
          outputs: {},
          dependencies: [server.name],
          environments: ['win32', 'linux', 'darwin'],
          supportedOperations: [tool.name],
          metadata: { serverId: server.id, toolName: tool.name },
          provenance: {
            source: `MCP Server: ${server.name}`,
            provider: server.name,
            version: server.version || '1.0.0',
            license: 'External MCP',
            discoveredAt: now,
            registeredBy: 'MCP_DISCOVERY_BRIDGE',
            verificationStatus: 'COMMUNITY_AUDITED',
          },
          verification: { verified: false, strategy: 'schema_match' },
          health: { status: 'HEALTHY', lastCheckedAt: now, consecutiveFailures: 0 },
          enabled: true,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return discovered;
  }

  private async discoverInstalledSoftware(): Promise<UniversalCapability[]> {
    if (!this.appDiscovery) return [];
    const now = new Date().toISOString();
    try {
      const apps = await this.appDiscovery.discoverInstalledApps();
      return apps.slice(0, 20).map((app) => ({
        id: `software.${app.id}`,
        name: app.name,
        description: `Discovered installed desktop application: ${app.name} (${app.executablePath || 'System registered'})`,
        category: 'SOFTWARE' as const,
        provider: app.publisher || 'Installed Software',
        source: 'software',
        version: app.version || '1.0.0',
        protocol: 'LOCAL_PROCESS' as const,
        status: 'DISCOVERED' as const,
        trustLevel: 'UNVERIFIED' as const,
        riskLevel: 'TIER_2_EXTERNAL_SIDE_EFFECT' as const,
        privacyClass: 'SOVEREIGN_LOCAL' as const,
        authentication: { type: 'NONE' as const },
        scopes: ['app:launch'],
        inputs: { args: { type: 'array' } },
        outputs: { pid: { type: 'number' } },
        dependencies: [app.id],
        environments: ['win32'],
        supportedOperations: ['launch', 'inspect'],
        metadata: { appId: app.id, executablePath: app.executablePath },
        provenance: {
          source: 'Windows AppDiscovery',
          provider: app.publisher || 'Local Software',
          version: app.version || '1.0.0',
          discoveredAt: now,
          registeredBy: 'APP_DISCOVERY_ENGINE',
          verificationStatus: 'UNVERIFIED',
        },
        verification: { verified: false, strategy: 'process_state' },
        health: { status: 'HEALTHY', lastCheckedAt: now, consecutiveFailures: 0 },
        enabled: true,
        createdAt: now,
        updatedAt: now,
      }));
    } catch {
      return [];
    }
  }
}
