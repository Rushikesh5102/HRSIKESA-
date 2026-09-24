/**
 * HṚṢĪKEŚA (हृषीकेश) — Enterprise Environment Persistence Repository
 *
 * Phase 23: SQLite storage for environment definitions, scoped capabilities,
 * active sessions, credential pointers (never plaintext secrets), health metrics, and operation ledgers.
 */

import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import { DatabaseManager } from '../../../persistence/database/database.manager.js';
import {
  EnvironmentRecord,
  EnvironmentType,
  EnvironmentLifecycleStatus,
  EnvironmentTrustLevel,
  EnvironmentScope,
  EnvironmentCapabilityRecord,
  EnvironmentSessionRecord,
  CredentialMetadataRecord,
  EnvironmentHealthRecord,
  RemoteOperationRecord,
  SessionStatus,
  DangerTier,
  EnvironmentHealthLevel,
} from '../interfaces/environment.types.js';

export class EnvironmentRepository {
  private readonly db: DatabaseSync;

  constructor(db: DatabaseManager | DatabaseSync) {
    this.db = db instanceof DatabaseManager || 'getRawDb' in db ? (db as any).getRawDb() : db;
  }

  // =========================================================================
  // Environments CRUD
  // =========================================================================

  public createEnvironment(data: Partial<EnvironmentRecord> & { name: string; type: EnvironmentType; hostname: string }): EnvironmentRecord {
    const id = data.id || crypto.randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO environments (
        id, name, type, platform, hostname, address, port, status, trust_level,
        is_authorized, owner, scope, company_id, project_id, department,
        fingerprint, tags, metadata, last_connected_at, last_health_check_at,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?
      )
    `);

    stmt.run(
      id,
      data.name,
      data.type,
      data.platform || 'unknown',
      data.hostname,
      data.address || null,
      data.port || null,
      data.status || 'DISCOVERED',
      data.trustLevel || 'UNKNOWN',
      data.isAuthorized ? 1 : 0,
      data.owner || 'Rushikesh Pattiwar',
      data.scope || 'GLOBAL',
      data.companyId || null,
      data.projectId || null,
      data.department || null,
      data.fingerprint ? JSON.stringify(data.fingerprint) : null,
      data.tags ? JSON.stringify(data.tags) : JSON.stringify([]),
      data.metadata ? JSON.stringify(data.metadata) : JSON.stringify({}),
      data.lastConnectedAt || null,
      data.lastHealthCheckAt || null,
      now,
      now
    );

    return this.getEnvironment(id)!;
  }

  public saveEnvironment(data: Partial<EnvironmentRecord> & { name: string; type: EnvironmentType; hostname: string }): EnvironmentRecord {
    return this.createEnvironment(data);
  }

  public updateStatus(id: string, status: EnvironmentLifecycleStatus): EnvironmentRecord | null {
    return this.updateEnvironment(id, { status });
  }

  public updateFingerprint(id: string, fingerprint: any): EnvironmentRecord | null {
    return this.updateEnvironment(id, { fingerprint });
  }

  public setAuthorization(id: string, isAuthorized: boolean, trustLevel: EnvironmentTrustLevel): EnvironmentRecord | null {
    return this.updateEnvironment(id, { isAuthorized, trustLevel });
  }

  public recordConnection(id: string): EnvironmentRecord | null {
    return this.updateEnvironment(id, { lastConnectedAt: new Date().toISOString() });
  }

  public addCapability(data: any): EnvironmentCapabilityRecord {
    return this.registerCapability(data);
  }

  public updateEnvironment(id: string, updates: Partial<EnvironmentRecord>): EnvironmentRecord | null {
    const existing = this.getEnvironment(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const sets: string[] = ['updated_at = ?'];
    const params: any[] = [now];

    if (updates.name !== undefined) {
      sets.push('name = ?');
      params.push(updates.name);
    }
    if (updates.type !== undefined) {
      sets.push('type = ?');
      params.push(updates.type);
    }
    if (updates.platform !== undefined) {
      sets.push('platform = ?');
      params.push(updates.platform);
    }
    if (updates.hostname !== undefined) {
      sets.push('hostname = ?');
      params.push(updates.hostname);
    }
    if (updates.address !== undefined) {
      sets.push('address = ?');
      params.push(updates.address);
    }
    if (updates.port !== undefined) {
      sets.push('port = ?');
      params.push(updates.port);
    }
    if (updates.status !== undefined) {
      sets.push('status = ?');
      params.push(updates.status);
    }
    if (updates.trustLevel !== undefined) {
      sets.push('trust_level = ?');
      params.push(updates.trustLevel);
    }
    if (updates.isAuthorized !== undefined) {
      sets.push('is_authorized = ?');
      params.push(updates.isAuthorized ? 1 : 0);
    }
    if (updates.owner !== undefined) {
      sets.push('owner = ?');
      params.push(updates.owner);
    }
    if (updates.scope !== undefined) {
      sets.push('scope = ?');
      params.push(updates.scope);
    }
    if (updates.companyId !== undefined) {
      sets.push('company_id = ?');
      params.push(updates.companyId);
    }
    if (updates.projectId !== undefined) {
      sets.push('project_id = ?');
      params.push(updates.projectId);
    }
    if (updates.department !== undefined) {
      sets.push('department = ?');
      params.push(updates.department);
    }
    if (updates.fingerprint !== undefined) {
      sets.push('fingerprint = ?');
      params.push(updates.fingerprint ? JSON.stringify(updates.fingerprint) : null);
    }
    if (updates.tags !== undefined) {
      sets.push('tags = ?');
      params.push(JSON.stringify(updates.tags));
    }
    if (updates.metadata !== undefined) {
      sets.push('metadata = ?');
      params.push(JSON.stringify(updates.metadata));
    }
    if (updates.lastConnectedAt !== undefined) {
      sets.push('last_connected_at = ?');
      params.push(updates.lastConnectedAt);
    }
    if (updates.lastHealthCheckAt !== undefined) {
      sets.push('last_health_check_at = ?');
      params.push(updates.lastHealthCheckAt);
    }

    params.push(id);
    this.db.prepare(`UPDATE environments SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    return this.getEnvironment(id);
  }

  public getEnvironment(id: string): EnvironmentRecord | null {
    const row = this.db.prepare(`SELECT * FROM environments WHERE id = ?`).get(id) as any;
    if (!row) return null;
    return this.mapEnvironment(row);
  }

  public getEnvironmentByName(name: string): EnvironmentRecord | null {
    const row = this.db.prepare(`SELECT * FROM environments WHERE name = ? COLLATE NOCASE`).get(name) as any;
    if (!row) return null;
    return this.mapEnvironment(row);
  }

  public listEnvironments(filter?: {
    type?: EnvironmentType;
    status?: EnvironmentLifecycleStatus;
    trustLevel?: EnvironmentTrustLevel;
    scope?: EnvironmentScope;
    companyId?: string;
    projectId?: string;
    isAuthorized?: boolean;
  }): EnvironmentRecord[] {
    let sql = `SELECT * FROM environments WHERE 1=1`;
    const params: any[] = [];

    if (filter?.type) {
      sql += ` AND type = ?`;
      params.push(filter.type);
    }
    if (filter?.status) {
      sql += ` AND status = ?`;
      params.push(filter.status);
    }
    if (filter?.trustLevel) {
      sql += ` AND trust_level = ?`;
      params.push(filter.trustLevel);
    }
    if (filter?.scope) {
      sql += ` AND scope = ?`;
      params.push(filter.scope);
    }
    if (filter?.companyId) {
      sql += ` AND company_id = ?`;
      params.push(filter.companyId);
    }
    if (filter?.projectId) {
      sql += ` AND project_id = ?`;
      params.push(filter.projectId);
    }
    if (filter?.isAuthorized !== undefined) {
      sql += ` AND is_authorized = ?`;
      params.push(filter.isAuthorized ? 1 : 0);
    }

    sql += ` ORDER BY created_at DESC`;
    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map((r) => this.mapEnvironment(r));
  }

  public deleteEnvironment(id: string): boolean {
    const info = this.db.prepare(`DELETE FROM environments WHERE id = ?`).run(id);
    return (info as any).changes > 0;
  }

  // =========================================================================
  // Scoped Capabilities
  // =========================================================================

  public registerCapability(data: {
    environmentId: string;
    capabilityId: string;
    scope?: EnvironmentScope;
    isAvailable?: boolean;
    riskTier?: DangerTier;
    configuration?: Record<string, unknown>;
  }): EnvironmentCapabilityRecord {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO environment_capabilities (
        id, environment_id, capability_id, scope, is_available, risk_tier,
        configuration, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(environment_id, capability_id) DO UPDATE SET
        scope = excluded.scope,
        is_available = excluded.is_available,
        risk_tier = excluded.risk_tier,
        configuration = excluded.configuration,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      id,
      data.environmentId,
      data.capabilityId,
      data.scope || 'ENVIRONMENT',
      data.isAvailable !== undefined ? (data.isAvailable ? 1 : 0) : 1,
      data.riskTier || 'LOW_RISK',
      data.configuration ? JSON.stringify(data.configuration) : null,
      now,
      now
    );

    const row = this.db.prepare(`SELECT * FROM environment_capabilities WHERE environment_id = ? AND capability_id = ?`).get(data.environmentId, data.capabilityId) as any;
    return this.mapCapability(row);
  }

  public listCapabilities(environmentId?: string): EnvironmentCapabilityRecord[] {
    let sql = `SELECT * FROM environment_capabilities`;
    const params: any[] = [];
    if (environmentId) {
      sql += ` WHERE environment_id = ?`;
      params.push(environmentId);
    }
    sql += ` ORDER BY created_at ASC`;
    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map((r) => this.mapCapability(r));
  }

  public removeCapability(environmentId: string, capabilityId: string): boolean {
    const info = this.db.prepare(`DELETE FROM environment_capabilities WHERE environment_id = ? AND capability_id = ?`).run(environmentId, capabilityId);
    return (info as any).changes > 0;
  }

  // =========================================================================
  // Sessions
  // =========================================================================

  public createSession(data: {
    environmentId: string;
    sessionType: string;
    status?: SessionStatus;
    agentId?: string;
    missionId?: string;
    goalId?: string;
    remotePid?: number;
    remoteUser?: string;
    activeChannel?: string;
    idleTimeoutMs?: number;
    connectionMetadata?: Record<string, unknown>;
  }): EnvironmentSessionRecord {
    const id = (data as any).id || crypto.randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO environment_sessions (
        id, environment_id, session_type, status, agent_id, mission_id, goal_id,
        remote_pid, remote_user, active_channel, idle_timeout_ms, connection_metadata,
        created_at, last_activity_at, closed_at, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.environmentId,
      data.sessionType,
      data.status || 'CREATING',
      data.agentId || null,
      data.missionId || null,
      data.goalId || null,
      data.remotePid || null,
      data.remoteUser || null,
      data.activeChannel || null,
      data.idleTimeoutMs || 300000,
      data.connectionMetadata ? JSON.stringify(data.connectionMetadata) : null,
      now,
      now,
      null,
      null
    );

    return this.getSession(id)!;
  }

  public updateSession(id: string, updates: Partial<EnvironmentSessionRecord>): EnvironmentSessionRecord | null {
    const now = new Date().toISOString();
    const sets: string[] = ['last_activity_at = ?'];
    const params: any[] = [now];

    if (updates.status !== undefined) {
      sets.push('status = ?');
      params.push(updates.status);
    }
    if (updates.remotePid !== undefined) {
      sets.push('remote_pid = ?');
      params.push(updates.remotePid);
    }
    if (updates.activeChannel !== undefined) {
      sets.push('active_channel = ?');
      params.push(updates.activeChannel);
    }
    if (updates.closedAt !== undefined) {
      sets.push('closed_at = ?');
      params.push(updates.closedAt);
    }
    if (updates.errorMessage !== undefined) {
      sets.push('error_message = ?');
      params.push(updates.errorMessage);
    }
    if (updates.connectionMetadata !== undefined) {
      sets.push('connection_metadata = ?');
      params.push(JSON.stringify(updates.connectionMetadata));
    }

    params.push(id);
    this.db.prepare(`UPDATE environment_sessions SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    return this.getSession(id);
  }

  public getSession(id: string): EnvironmentSessionRecord | null {
    const row = this.db.prepare(`SELECT * FROM environment_sessions WHERE id = ?`).get(id) as any;
    if (!row) return null;
    return this.mapSession(row);
  }

  public listSessions(environmentId?: string, status?: SessionStatus): EnvironmentSessionRecord[] {
    let sql = `SELECT * FROM environment_sessions WHERE 1=1`;
    const params: any[] = [];
    if (environmentId) {
      sql += ` AND environment_id = ?`;
      params.push(environmentId);
    }
    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }
    sql += ` ORDER BY created_at DESC`;
    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map((r) => this.mapSession(r));
  }

  public listActiveSessions(environmentId?: string): EnvironmentSessionRecord[] {
    return this.listSessions(environmentId, 'CONNECTED');
  }

  public closeSession(id: string, reason?: string): EnvironmentSessionRecord | null {
    const now = new Date().toISOString();
    return this.updateSession(id, {
      status: 'DISCONNECTED',
      closedAt: now,
      errorMessage: reason,
    });
  }

  // =========================================================================
  // Credential Metadata (Pointers only, NO plaintext secrets)
  // =========================================================================

  public saveCredentialMetadata(data: {
    environmentId: string;
    authType: 'SSH_KEY' | 'SSH_AGENT' | 'PASSWORD' | 'WINRM' | 'RDP' | 'OAUTH' | 'TOKEN' | 'KEYCHAIN';
    credentialReference: string;
    username?: string;
    keyFingerprint?: string;
    requiresMfa?: boolean;
    mfaType?: 'OTP' | 'PUSH' | 'HARDWARE_KEY' | 'BIOMETRIC';
    isValid?: boolean;
  }): CredentialMetadataRecord {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO environment_credentials_metadata (
        id, environment_id, auth_type, credential_reference, username,
        key_fingerprint, requires_mfa, mfa_type, last_validated_at, is_valid,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.environmentId,
      data.authType,
      data.credentialReference,
      data.username || null,
      data.keyFingerprint || null,
      data.requiresMfa ? 1 : 0,
      data.mfaType || null,
      now,
      data.isValid !== undefined ? (data.isValid ? 1 : 0) : 1,
      now,
      now
    );

    const row = this.db.prepare(`SELECT * FROM environment_credentials_metadata WHERE id = ?`).get(id) as any;
    return this.mapCredentialMetadata(row);
  }

  public listCredentialMetadata(environmentId: string): CredentialMetadataRecord[] {
    const rows = this.db.prepare(`SELECT * FROM environment_credentials_metadata WHERE environment_id = ?`).all(environmentId) as any[];
    return rows.map((r) => this.mapCredentialMetadata(r));
  }

  // =========================================================================
  // Health Metrics
  // =========================================================================

  public recordHealth(data: {
    environmentId: string;
    status: EnvironmentHealthLevel;
    latencyMs?: number;
    cpuUsagePct?: number;
    memoryUsagePct?: number;
    diskFreeBytes?: number;
    activeSessionsCount?: number;
    errorMessage?: string;
  }): EnvironmentHealthRecord {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO environment_health (
        id, environment_id, status, latency_ms, cpu_usage_pct, memory_usage_pct,
        disk_free_bytes, active_sessions_count, error_message, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.environmentId,
      data.status,
      data.latencyMs || null,
      data.cpuUsagePct || null,
      data.memoryUsagePct || null,
      data.diskFreeBytes || null,
      data.activeSessionsCount || 0,
      data.errorMessage || null,
      now
    );

    // Also update environment last_health_check_at
    this.updateEnvironment(data.environmentId, { lastHealthCheckAt: now });

    const row = this.db.prepare(`SELECT * FROM environment_health WHERE id = ?`).get(id) as any;
    return this.mapHealth(row);
  }

  public getLatestHealth(environmentId: string): EnvironmentHealthRecord | null {
    const row = this.db.prepare(`SELECT * FROM environment_health WHERE environment_id = ? ORDER BY timestamp DESC LIMIT 1`).get(environmentId) as any;
    if (!row) return null;
    return this.mapHealth(row);
  }

  // =========================================================================
  // Remote Operations
  // =========================================================================

  public recordOperation(data: {
    id?: string;
    environmentId: string;
    sessionId?: string;
    operationType: string;
    commandOrAction: string;
    dangerTier?: DangerTier;
    preconditionStatus?: 'PASSED' | 'FAILED';
    executionStatus?: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PENDING_APPROVAL' | 'BLOCKED';
    exitCode?: number;
    outputSummary?: string;
    errorMessage?: string;
    durationMs?: number;
    isIdempotent?: boolean;
    verificationStatus?: 'PENDING' | 'VERIFIED' | 'FAILED' | 'SKIPPED';
    verificationEvidence?: string;
    agentId?: string;
    requiresApproval?: boolean;
    approvedBy?: string;
    createdAt?: string;
    completedAt?: string;
  }): RemoteOperationRecord {
    const id = data.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const createdAt = data.createdAt || now;
    const completedAt = data.completedAt || (data.executionStatus === 'COMPLETED' || data.executionStatus === 'FAILED' ? now : null);

    const stmt = this.db.prepare(`
      INSERT INTO environment_operations (
        id, environment_id, session_id, operation_type, command_or_action,
        danger_tier, precondition_status, execution_status, exit_code,
        output_summary, error_message, duration_ms, is_idempotent,
        verification_status, verification_evidence, agent_id, requires_approval,
        approved_by, created_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.environmentId,
      data.sessionId || null,
      data.operationType,
      data.commandOrAction,
      data.dangerTier || 'SAFE',
      data.preconditionStatus || 'PASSED',
      data.executionStatus || 'RUNNING',
      data.exitCode !== undefined ? data.exitCode : null,
      data.outputSummary || null,
      data.errorMessage || null,
      data.durationMs || null,
      data.isIdempotent !== undefined ? (data.isIdempotent ? 1 : 0) : 1,
      data.verificationStatus || 'PENDING',
      data.verificationEvidence || null,
      data.agentId || null,
      data.requiresApproval ? 1 : 0,
      data.approvedBy || null,
      createdAt,
      completedAt
    );

    const row = this.db.prepare(`SELECT * FROM environment_operations WHERE id = ?`).get(id) as any;
    return this.mapOperation(row);
  }

  public listOperations(environmentId?: string, limit = 50): RemoteOperationRecord[] {
    let sql = `SELECT * FROM environment_operations`;
    const params: any[] = [];
    if (environmentId) {
      sql += ` WHERE environment_id = ?`;
      params.push(environmentId);
    }
    sql += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(limit);

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map((r) => this.mapOperation(r));
  }

  // =========================================================================
  // Mappers
  // =========================================================================

  private mapEnvironment(row: any): EnvironmentRecord {
    return {
      id: row.id,
      name: row.name,
      type: row.type as EnvironmentType,
      platform: row.platform,
      hostname: row.hostname,
      address: row.address || undefined,
      port: row.port || undefined,
      status: row.status as EnvironmentLifecycleStatus,
      trustLevel: row.trust_level as EnvironmentTrustLevel,
      isAuthorized: Boolean(row.is_authorized),
      owner: row.owner,
      scope: row.scope as EnvironmentScope,
      companyId: row.company_id || undefined,
      projectId: row.project_id || undefined,
      department: row.department || undefined,
      fingerprint: row.fingerprint ? JSON.parse(row.fingerprint) : undefined,
      tags: row.tags ? JSON.parse(row.tags) : [],
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      lastConnectedAt: row.last_connected_at || undefined,
      lastHealthCheckAt: row.last_health_check_at || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapCapability(row: any): EnvironmentCapabilityRecord {
    return {
      id: row.id,
      environmentId: row.environment_id,
      capabilityId: row.capability_id,
      scope: row.scope as EnvironmentScope,
      isAvailable: Boolean(row.is_available),
      riskTier: row.risk_tier as DangerTier,
      configuration: row.configuration ? JSON.parse(row.configuration) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapSession(row: any): EnvironmentSessionRecord {
    return {
      id: row.id,
      environmentId: row.environment_id,
      sessionType: row.session_type,
      status: row.status as SessionStatus,
      agentId: row.agent_id || undefined,
      missionId: row.mission_id || undefined,
      goalId: row.goal_id || undefined,
      remotePid: row.remote_pid || undefined,
      remoteUser: row.remote_user || undefined,
      activeChannel: row.active_channel || undefined,
      idleTimeoutMs: row.idle_timeout_ms,
      connectionMetadata: row.connection_metadata ? JSON.parse(row.connection_metadata) : undefined,
      createdAt: row.created_at,
      lastActivityAt: row.last_activity_at,
      closedAt: row.closed_at || undefined,
      errorMessage: row.error_message || undefined,
    };
  }

  private mapCredentialMetadata(row: any): CredentialMetadataRecord {
    return {
      id: row.id,
      environmentId: row.environment_id,
      authType: row.auth_type,
      credentialReference: row.credential_reference,
      username: row.username || undefined,
      keyFingerprint: row.key_fingerprint || undefined,
      requiresMfa: Boolean(row.requires_mfa),
      mfaType: row.mfa_type || undefined,
      lastValidatedAt: row.last_validated_at || undefined,
      isValid: Boolean(row.is_valid),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapHealth(row: any): EnvironmentHealthRecord {
    return {
      id: row.id,
      environmentId: row.environment_id,
      status: row.status as EnvironmentHealthLevel,
      latencyMs: row.latency_ms || undefined,
      cpuUsagePct: row.cpu_usage_pct || undefined,
      memoryUsagePct: row.memory_usage_pct || undefined,
      diskFreeBytes: row.disk_free_bytes || undefined,
      activeSessionsCount: row.active_sessions_count,
      errorMessage: row.error_message || undefined,
      timestamp: row.timestamp,
    };
  }

  private mapOperation(row: any): RemoteOperationRecord {
    return {
      id: row.id,
      environmentId: row.environment_id,
      sessionId: row.session_id || undefined,
      operationType: row.operation_type,
      commandOrAction: row.command_or_action,
      dangerTier: row.danger_tier as DangerTier,
      preconditionStatus: row.precondition_status as any,
      executionStatus: row.execution_status as any,
      exitCode: row.exit_code !== null ? row.exit_code : undefined,
      outputSummary: row.output_summary || undefined,
      errorMessage: row.error_message || undefined,
      durationMs: row.duration_ms || undefined,
      isIdempotent: Boolean(row.is_idempotent),
      verificationStatus: row.verification_status as any,
      verificationEvidence: row.verification_evidence || undefined,
      agentId: row.agent_id || undefined,
      requiresApproval: Boolean(row.requires_approval),
      approvedBy: row.approved_by || undefined,
      createdAt: row.created_at,
      completedAt: row.completed_at || undefined,
    };
  }
}
