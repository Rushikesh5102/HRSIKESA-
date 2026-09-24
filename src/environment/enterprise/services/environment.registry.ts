/**
 * HṚṢĪKEŚA (हृषीकेश) — Environment Registry Coordinator
 *
 * Phase 23: Central management coordinator for all execution targets across local, remote,
 * cloud, container, RDP, VDI, and CI environments.
 * Enforces lifecycle transitions, scoped authorization, trust boundaries, connection pooling,
 * secret non-persistence, and event dissemination.
 */

import { randomUUID as uuidv4 } from 'node:crypto';
import { EventBus } from '../../../core/events/event-bus.js';
import {
  EnvironmentRecord,
  EnvironmentType,
  EnvironmentLifecycleStatus,
  EnvironmentTrustLevel,
  EnvironmentScope,
  EnvironmentCapabilityRecord,
  EnvironmentSessionRecord,
  SessionStatus,
  IEnvironmentAdapter,
  RemoteCommandOptions,
  RemoteCommandResult,
  RemoteFileEntry,
  RemoteProcessInfo,
  EnvironmentHealthRecord,
  DangerTier,
} from '../interfaces/environment.types.js';
import { EnvironmentRepository } from '../repositories/environment.repository.js';
import { CredentialProvider } from '../security/credential.provider.js';
import { EnvironmentPolicy } from '../security/environment.policy.js';
import { EnvironmentFingerprintService } from './environment.fingerprint.js';
import { EnvironmentRecoveryEngine } from './environment.recovery.js';
import { EnvironmentObservationEngine } from './environment.observation.js';
import { SshEnvironmentAdapter } from '../adapters/ssh.adapter.js';
import { WindowsRemoteAdapter } from '../adapters/windows-remote.adapter.js';
import { LinuxEnvironmentAdapter } from '../adapters/linux.adapter.js';
import { RdpVdiEnvironmentAdapter } from '../adapters/rdp-vdi.adapter.js';
import { CloudEnvironmentAdapter } from '../adapters/cloud.adapter.js';
import { ContainerEnvironmentAdapter } from '../adapters/container.adapter.js';
import { CiEnvironmentAdapter } from '../adapters/ci.adapter.js';
import { RemoteBrowserAdapter } from '../adapters/remote-browser.adapter.js';

export interface RegisterEnvironmentInput {
  readonly name: string;
  readonly type: EnvironmentType;
  readonly platform: string;
  readonly hostname: string;
  readonly address?: string;
  readonly port?: number;
  readonly owner: string;
  readonly scope?: EnvironmentScope;
  readonly companyId?: string;
  readonly projectId?: string;
  readonly department?: string;
  readonly tags?: readonly string[];
  readonly metadata?: Record<string, unknown>;
  readonly trustLevel?: EnvironmentTrustLevel;
}

export interface EnvironmentPoolLimits {
  readonly maxActiveEnvironments: number;
  readonly maxSessionsPerEnvironment: number;
  readonly idleTimeoutMs: number;
  readonly connectionTimeoutMs: number;
}

export class EnvironmentRegistry {
  private repository: EnvironmentRepository;
  public readonly credentialProvider: CredentialProvider;
  private recoveryEngine: EnvironmentRecoveryEngine;
  private observationEngine: EnvironmentObservationEngine;
  private eventBus?: EventBus;
  private activeAdapters: Map<string, IEnvironmentAdapter> = new Map();
  private poolLimits: EnvironmentPoolLimits = {
    maxActiveEnvironments: 20,
    maxSessionsPerEnvironment: 5,
    idleTimeoutMs: 300000, // 5 min
    connectionTimeoutMs: 15000,
  };

  constructor(
    repository: EnvironmentRepository,
    credentialProvider?: CredentialProvider,
    eventBus?: EventBus,
    poolLimits?: Partial<EnvironmentPoolLimits>,
  ) {
    this.repository = repository;
    this.credentialProvider = credentialProvider || new CredentialProvider();
    this.eventBus = eventBus;
    this.recoveryEngine = new EnvironmentRecoveryEngine(eventBus);
    this.observationEngine = new EnvironmentObservationEngine(eventBus);
    if (poolLimits) {
      this.poolLimits = { ...this.poolLimits, ...poolLimits };
    }
  }

  /**
   * Discovers and registers a new environment in the DISCOVERED lifecycle status.
   */
  async registerEnvironment(input: RegisterEnvironmentInput): Promise<EnvironmentRecord> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const record: EnvironmentRecord = {
      id,
      name: input.name,
      type: input.type,
      platform: input.platform,
      hostname: input.hostname,
      address: input.address,
      port: input.port,
      status: EnvironmentLifecycleStatus.DISCOVERED,
      trustLevel: input.trustLevel || EnvironmentTrustLevel.UNKNOWN,
      isAuthorized: false,
      owner: input.owner,
      scope: input.scope || 'GLOBAL',
      companyId: input.companyId,
      projectId: input.projectId,
      department: input.department,
      tags: input.tags || [],
      metadata: input.metadata || {},
      createdAt: now,
      updatedAt: now,
    };

    await this.repository.saveEnvironment(record);

    if (this.eventBus) {
      this.eventBus.emit('environment.discovered', {
        environmentId: id,
        name: record.name,
        type: record.type,
        hostname: record.hostname,
      });
    }

    return record;
  }

  /**
   * Inspects and fingerprints an environment.
   */
  async inspectEnvironment(environmentId: string): Promise<EnvironmentRecord> {
    const env = await this.repository.getEnvironment(environmentId);
    if (!env) {
      throw new Error(`[EnvironmentRegistry] Environment ${environmentId} not found.`);
    }

    await this.repository.updateStatus(environmentId, EnvironmentLifecycleStatus.INSPECTING);
    if (this.eventBus) {
      this.eventBus.emit('environment.validating', { environmentId });
    }

    // Capture or build fingerprint
    let fingerprint = env.fingerprint;
    if (env.type === EnvironmentType.LOCAL) {
      fingerprint = EnvironmentFingerprintService.captureLocalFingerprint();
    } else {
      const adapter = this.getOrCreateAdapter(env);
      fingerprint = await adapter.getFingerprint();
    }

    await this.repository.updateFingerprint(environmentId, fingerprint);

    // Auto-discover standard capabilities based on type
    await this.discoverDefaultCapabilities(env);

    const updated = (await this.repository.getEnvironment(environmentId))!;
    return updated;
  }

  /**
   * Authorizes an environment explicitly.
   */
  async authorizeEnvironment(environmentId: string, trustLevel: EnvironmentTrustLevel = EnvironmentTrustLevel.TRUSTED): Promise<EnvironmentRecord> {
    const env = await this.repository.getEnvironment(environmentId);
    if (!env) {
      throw new Error(`[EnvironmentRegistry] Environment ${environmentId} not found.`);
    }

    await this.repository.setAuthorization(environmentId, true, trustLevel);
    await this.repository.updateStatus(environmentId, EnvironmentLifecycleStatus.AUTHORIZED);

    if (this.eventBus) {
      this.eventBus.emit('environment.authorized', { environmentId, trustLevel });
    }

    return (await this.repository.getEnvironment(environmentId))!;
  }

  /**
   * Revokes authorization for an environment and closes all sessions.
   */
  async revokeEnvironment(environmentId: string): Promise<EnvironmentRecord> {
    const env = await this.repository.getEnvironment(environmentId);
    if (!env) {
      throw new Error(`[EnvironmentRegistry] Environment ${environmentId} not found.`);
    }

    await this.disconnect(environmentId);
    await this.repository.setAuthorization(environmentId, false, EnvironmentTrustLevel.UNTRUSTED);
    await this.repository.updateStatus(environmentId, EnvironmentLifecycleStatus.REVOKED);

    if (this.eventBus) {
      this.eventBus.emit('environment.revoked', { environmentId });
    }

    return (await this.repository.getEnvironment(environmentId))!;
  }

  /**
   * Disables an environment temporarily.
   */
  async disableEnvironment(environmentId: string): Promise<EnvironmentRecord> {
    await this.disconnect(environmentId);
    await this.repository.updateStatus(environmentId, EnvironmentLifecycleStatus.DISABLED);
    return (await this.repository.getEnvironment(environmentId))!;
  }

  /**
   * Connects to an authorized environment and creates a session.
   */
  async connect(environmentId: string, agentId?: string): Promise<EnvironmentSessionRecord> {
    const env = await this.repository.getEnvironment(environmentId);
    if (!env) {
      throw new Error(`[EnvironmentRegistry] Environment ${environmentId} not found.`);
    }

    // 1. Enforce authorization
    if (!env.isAuthorized || env.status === EnvironmentLifecycleStatus.REVOKED || env.status === EnvironmentLifecycleStatus.DISABLED) {
      throw new Error(`[EnvironmentRegistry] Environment ${environmentId} is not authorized for connection (Status: ${env.status}).`);
    }

    // 2. Enforce connection pool limits
    if (this.activeAdapters.size >= this.poolLimits.maxActiveEnvironments && !this.activeAdapters.has(environmentId)) {
      throw new Error(`[EnvironmentRegistry] Maximum active environments reached (${this.poolLimits.maxActiveEnvironments}).`);
    }

    const activeSessions = await this.repository.listActiveSessions(environmentId);
    if (activeSessions.length >= this.poolLimits.maxSessionsPerEnvironment) {
      throw new Error(`[EnvironmentRegistry] Maximum sessions per environment reached (${this.poolLimits.maxSessionsPerEnvironment}).`);
    }

    await this.repository.updateStatus(environmentId, EnvironmentLifecycleStatus.CONNECTING);
    if (this.eventBus) {
      this.eventBus.emit('environment.connecting', { environmentId });
    }

    const adapter = this.getOrCreateAdapter(env);
    await adapter.connect();

    await this.repository.updateStatus(environmentId, EnvironmentLifecycleStatus.CONNECTED);
    await this.repository.recordConnection(environmentId);

    const sessionId = uuidv4();
    const now = new Date().toISOString();
    const session: EnvironmentSessionRecord = {
      id: sessionId,
      environmentId,
      sessionType: env.type,
      status: SessionStatus.CONNECTED,
      agentId,
      idleTimeoutMs: this.poolLimits.idleTimeoutMs,
      createdAt: now,
      lastActivityAt: now,
    };

    await this.repository.createSession(session);

    if (this.eventBus) {
      this.eventBus.emit('environment.connected', { environmentId, sessionId });
      this.eventBus.emit('session.created', { sessionId, environmentId });
    }

    return session;
  }

  /**
   * Disconnects an environment and closes all its active sessions.
   */
  async disconnect(environmentId: string): Promise<void> {
    const adapter = this.activeAdapters.get(environmentId);
    if (adapter) {
      await adapter.disconnect();
      this.activeAdapters.delete(environmentId);
    }

    const activeSessions = await this.repository.listActiveSessions(environmentId);
    for (const session of activeSessions) {
      await this.repository.closeSession(session.id, SessionStatus.DISCONNECTED);
      if (this.eventBus) {
        this.eventBus.emit('session.closed', { sessionId: session.id, environmentId });
      }
    }

    const env = await this.repository.getEnvironment(environmentId);
    if (env && env.status === EnvironmentLifecycleStatus.CONNECTED) {
      await this.repository.updateStatus(environmentId, EnvironmentLifecycleStatus.DISCONNECTED);
      if (this.eventBus) {
        this.eventBus.emit('environment.disconnected', { environmentId });
      }
    }
  }

  /**
   * Executes a command on a remote environment through policy, audit, and recovery.
   */
  async executeCommand(
    environmentId: string,
    command: string,
    options?: RemoteCommandOptions,
  ): Promise<RemoteCommandResult> {
    const env = await this.repository.getEnvironment(environmentId);
    if (!env) {
      throw new Error(`[EnvironmentRegistry] Environment ${environmentId} not found.`);
    }

    if (!env.isAuthorized) {
      throw new Error(`[EnvironmentRegistry] Execution blocked: Environment ${environmentId} is not authorized.`);
    }

    // Determine danger tier
    const dangerTier = options?.dangerTier || EnvironmentPolicy.classifyCommand(command);

    // Assert safety
    EnvironmentPolicy.assertCommandSafety(command);

    const adapter = this.getOrCreateAdapter(env);
    if (!adapter.isConnected()) {
      await adapter.connect();
    }

    const opId = uuidv4();
    const startTime = Date.now();

    const result = await this.recoveryEngine.executeWithRecovery(adapter, command, options);

    // Audit operation into persistent ledger
    await this.repository.recordOperation({
      id: opId,
      environmentId,
      operationType: 'COMMAND_EXECUTION',
      commandOrAction: command,
      dangerTier,
      preconditionStatus: 'PASSED',
      executionStatus: result.success ? 'COMPLETED' : 'FAILED',
      exitCode: result.exitCode,
      outputSummary: result.stdout.substring(0, 200),
      durationMs: Date.now() - startTime,
      isIdempotent: this.recoveryEngine.isIdempotent(command, options?.isIdempotent),
      verificationStatus: result.verificationStatus,
      verificationEvidence: result.evidence,
      agentId: options?.agentId,
      requiresApproval: !!options?.requiresApproval,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    });

    return result;
  }

  /**
   * Discovers and queries remote files.
   */
  async listFiles(environmentId: string, remotePath: string, maxItems?: number): Promise<RemoteFileEntry[]> {
    const env = await this.repository.getEnvironment(environmentId);
    if (!env || !env.isAuthorized) {
      throw new Error(`[EnvironmentRegistry] Environment ${environmentId} unauthorized or not found.`);
    }
    const adapter = this.getOrCreateAdapter(env);
    return adapter.listFiles(remotePath, maxItems);
  }

  /**
   * Discovers and queries remote processes.
   */
  async listProcesses(environmentId: string): Promise<RemoteProcessInfo[]> {
    const env = await this.repository.getEnvironment(environmentId);
    if (!env || !env.isAuthorized) {
      throw new Error(`[EnvironmentRegistry] Environment ${environmentId} unauthorized or not found.`);
    }
    const adapter = this.getOrCreateAdapter(env);
    return adapter.listProcesses();
  }

  /**
   * Runs a health check on an environment.
   */
  async checkHealth(environmentId: string): Promise<EnvironmentHealthRecord> {
    const env = await this.repository.getEnvironment(environmentId);
    if (!env) {
      throw new Error(`[EnvironmentRegistry] Environment ${environmentId} not found.`);
    }
    const adapter = this.getOrCreateAdapter(env);
    const health = await this.observationEngine.observeHealth(adapter);
    await this.repository.recordHealth(health);
    return health;
  }

  /**
   * Resolves or instantiates the appropriate adapter for an environment.
   */
  getOrCreateAdapter(env: EnvironmentRecord): IEnvironmentAdapter {
    let adapter = this.activeAdapters.get(env.id);
    if (adapter) return adapter;

    switch (env.type) {
      case EnvironmentType.SSH:
        adapter = new SshEnvironmentAdapter({
          environmentId: env.id,
          hostname: env.hostname,
          port: env.port || 22,
          username: (env.metadata?.username as string) || 'developer',
        });
        break;
      case EnvironmentType.WINDOWS:
        adapter = new WindowsRemoteAdapter({
          environmentId: env.id,
          hostname: env.hostname,
          port: env.port || 5985,
          username: (env.metadata?.username as string) || 'Administrator',
        });
        break;
      case EnvironmentType.LINUX:
        adapter = new LinuxEnvironmentAdapter({
          environmentId: env.id,
          hostname: env.hostname,
          port: env.port || 22,
          username: (env.metadata?.username as string) || 'developer',
        });
        break;
      case EnvironmentType.RDP:
      case EnvironmentType.VDI:
        adapter = new RdpVdiEnvironmentAdapter({
          environmentId: env.id,
          type: env.type === EnvironmentType.VDI ? 'VDI' : 'RDP',
          hostname: env.hostname,
          port: env.port || 3389,
        });
        break;
      case EnvironmentType.CLOUD:
        adapter = new CloudEnvironmentAdapter({
          environmentId: env.id,
          provider: (env.metadata?.provider as any) || 'AWS',
          accountOrProjectId: env.hostname,
          defaultRegion: (env.metadata?.region as string) || 'us-east-1',
        });
        break;
      case EnvironmentType.CONTAINER:
        adapter = new ContainerEnvironmentAdapter({
          environmentId: env.id,
          containerId: env.id,
          containerName: env.name,
          image: (env.metadata?.image as string) || 'alpine:latest',
        });
        break;
      case EnvironmentType.CI:
        adapter = new CiEnvironmentAdapter({
          environmentId: env.id,
          provider: (env.metadata?.ciProvider as any) || 'GITHUB_ACTIONS',
          repositoryOrProject: env.hostname,
        });
        break;
      case EnvironmentType.REMOTE_BROWSER:
        adapter = new RemoteBrowserAdapter({
          environmentId: env.id,
          browserWSEndpoint: `ws://${env.hostname}:${env.port || 9222}/devtools/browser`,
        });
        break;
      case EnvironmentType.LOCAL:
      default:
        // Local Linux or Windows adapter
        adapter = new WindowsRemoteAdapter({
          environmentId: env.id,
          hostname: env.hostname,
        });
        break;
    }

    this.activeAdapters.set(env.id, adapter);
    return adapter;
  }

  private async discoverDefaultCapabilities(env: EnvironmentRecord): Promise<void> {
    const caps: { id: string; risk: DangerTier }[] = [
      { id: 'terminal.execute', risk: 'MEDIUM_RISK' },
      { id: 'filesystem.read', risk: 'SAFE' },
      { id: 'filesystem.write', risk: 'MEDIUM_RISK' },
      { id: 'process.inspect', risk: 'SAFE' },
      { id: 'process.control', risk: 'HIGH_RISK' },
    ];

    if (env.type === EnvironmentType.RDP || env.type === EnvironmentType.VDI) {
      caps.push(
        { id: 'computer.observe', risk: 'SAFE' },
        { id: 'computer.control', risk: 'HIGH_RISK' },
      );
    }

    if (env.type === EnvironmentType.REMOTE_BROWSER) {
      caps.push({ id: 'browser.control', risk: 'MEDIUM_RISK' });
    }

    if (env.type === EnvironmentType.CLOUD) {
      caps.push(
        { id: 'cloud.read', risk: 'SAFE' },
        { id: 'cloud.write', risk: 'CRITICAL' },
      );
    }

    for (const c of caps) {
      await this.repository.addCapability({
        id: uuidv4(),
        environmentId: env.id,
        capabilityId: c.id,
        scope: env.scope,
        isAvailable: true,
        riskTier: c.risk,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // Pass-through helpers for queries
  async getEnvironment(id: string): Promise<EnvironmentRecord | null> {
    return this.repository.getEnvironment(id);
  }

  async listEnvironments(filter?: Parameters<EnvironmentRepository['listEnvironments']>[0]): Promise<EnvironmentRecord[]> {
    return this.repository.listEnvironments(filter);
  }

  async listCapabilities(environmentId: string): Promise<EnvironmentCapabilityRecord[]> {
    return this.repository.listCapabilities(environmentId);
  }

  async listSessions(environmentId?: string): Promise<EnvironmentSessionRecord[]> {
    return this.repository.listActiveSessions(environmentId);
  }

  async getLatestHealth(environmentId: string): Promise<EnvironmentHealthRecord | null> {
    return this.repository.getLatestHealth(environmentId);
  }

  async deleteEnvironment(environmentId: string): Promise<void> {
    await this.disconnect(environmentId);
    await this.repository.deleteEnvironment(environmentId);
  }
}
