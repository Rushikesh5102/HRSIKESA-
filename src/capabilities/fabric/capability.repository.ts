/**
 * HṚṢĪKEŚA (हृषीकेश) — Capability Fabric Repository
 *
 * FP-07: Persistent SQLite storage for capabilities, credentials, dependencies,
 * health status, and invocation audit trail.
 */

import { DatabaseManager } from '../../persistence/database/database.manager.js';
import {
  UniversalCapability,
  CapabilityLifecycleStatus,
  CapabilityHealth,
  CapabilityCredentialReference,
  CapabilityDependency,
  CapabilityInvocation,
  CapabilityResult,
  CapabilityCategory,
  CapabilityProtocol,
  CapabilityTrustLevel,
  CapabilityRiskLevel,
  PrivacyClass,
} from './capability.types.js';

export interface CapabilityFilter {
  category?: CapabilityCategory;
  protocol?: CapabilityProtocol;
  status?: CapabilityLifecycleStatus;
  trustLevel?: CapabilityTrustLevel;
  riskLevel?: CapabilityRiskLevel;
  privacyClass?: PrivacyClass;
  enabledOnly?: boolean;
  companyId?: string;
  projectId?: string;
  searchQuery?: string;
}

export interface InvocationRecordRow {
  invocation_id: string;
  capability_id: string;
  operation: string;
  actor: string;
  company_id: string | null;
  project_id: string | null;
  agent_id: string | null;
  privacy_class: string;
  status: string;
  output_json: string | null;
  error_message: string | null;
  verified: number;
  verification_strategy: string | null;
  duration_ms: number;
  provider: string;
  capability_version: string;
  requested_at: string;
  completed_at: string;
}

export class CapabilityRepository {
  private readonly db: DatabaseManager;
  private readonly memoryCache = new Map<string, UniversalCapability>();

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  /**
   * Save or update a UniversalCapability entity.
   */
  public saveCapability(cap: UniversalCapability): void {
    const stmt = this.db.prepare(`
      INSERT INTO universal_capabilities (
        id, name, description, category, provider, source, version, protocol,
        status, trust_level, risk_level, privacy_class, authentication_type,
        credential_ref, scopes_json, inputs_schema_json, outputs_schema_json,
        supported_operations_json, environments_json, enabled, documentation,
        metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        category = excluded.category,
        provider = excluded.provider,
        source = excluded.source,
        version = excluded.version,
        protocol = excluded.protocol,
        status = excluded.status,
        trust_level = excluded.trust_level,
        risk_level = excluded.risk_level,
        privacy_class = excluded.privacy_class,
        authentication_type = excluded.authentication_type,
        credential_ref = excluded.credential_ref,
        scopes_json = excluded.scopes_json,
        inputs_schema_json = excluded.inputs_schema_json,
        outputs_schema_json = excluded.outputs_schema_json,
        supported_operations_json = excluded.supported_operations_json,
        environments_json = excluded.environments_json,
        enabled = excluded.enabled,
        documentation = excluded.documentation,
        metadata_json = excluded.metadata_json,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      cap.id,
      cap.name,
      cap.description,
      cap.category,
      cap.provider,
      cap.source,
      cap.version,
      cap.protocol,
      cap.status,
      cap.trustLevel,
      cap.riskLevel,
      cap.privacyClass,
      cap.authentication.type,
      cap.authentication.credentialRef || null,
      JSON.stringify(cap.scopes || []),
      JSON.stringify(cap.inputs || {}),
      JSON.stringify(cap.outputs || {}),
      JSON.stringify(cap.supportedOperations || []),
      JSON.stringify(cap.environments || []),
      cap.enabled ? 1 : 0,
      cap.documentation || null,
      JSON.stringify(cap.metadata || {}),
      cap.createdAt,
      cap.updatedAt
    );

    // Save provenance if provided
    if (cap.provenance) {
      this.saveProvenance(cap.id, cap);
    }

    // Save health if provided
    if (cap.health) {
      this.saveHealth(cap.id, cap.health);
    }

    // Update memory cache
    this.memoryCache.set(cap.id, cap);
  }

  /**
   * Fast lookup by capability ID. Uses memory cache with DB fallback.
   */
  public getCapability(id: string): UniversalCapability | undefined {
    if (this.memoryCache.has(id)) {
      return this.memoryCache.get(id);
    }

    const row = this.db.prepare('SELECT * FROM universal_capabilities WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return undefined;

    const cap = this.rowToCapability(row);
    this.memoryCache.set(cap.id, cap);
    return cap;
  }

  /**
   * List capabilities with optional filtering.
   */
  public listCapabilities(filter?: CapabilityFilter): UniversalCapability[] {
    let sql = 'SELECT * FROM universal_capabilities WHERE 1=1';
    const params: any[] = [];

    if (filter?.category) {
      sql += ' AND category = ?';
      params.push(filter.category);
    }
    if (filter?.protocol) {
      sql += ' AND protocol = ?';
      params.push(filter.protocol);
    }
    if (filter?.status) {
      sql += ' AND status = ?';
      params.push(filter.status);
    }
    if (filter?.trustLevel) {
      sql += ' AND trust_level = ?';
      params.push(filter.trustLevel);
    }
    if (filter?.riskLevel) {
      sql += ' AND risk_level = ?';
      params.push(filter.riskLevel);
    }
    if (filter?.privacyClass) {
      sql += ' AND privacy_class = ?';
      params.push(filter.privacyClass);
    }
    if (filter?.enabledOnly) {
      sql += ' AND enabled = 1';
    }
    if (filter?.searchQuery) {
      sql += ' AND (name LIKE ? OR description LIKE ? OR id LIKE ?)';
      const term = `%${filter.searchQuery}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY name ASC';
    const rows = this.db.prepare(sql).all(...params) as Record<string, unknown>[];
    return rows.map((r) => this.rowToCapability(r));
  }

  /**
   * Update status and/or enabled flag for a capability.
   */
  public updateCapabilityStatus(id: string, status: CapabilityLifecycleStatus, enabled?: boolean): void {
    const updatedAt = new Date().toISOString();
    if (enabled !== undefined) {
      this.db.prepare('UPDATE universal_capabilities SET status = ?, enabled = ?, updated_at = ? WHERE id = ?')
        .run(status, enabled ? 1 : 0, updatedAt, id);
    } else {
      this.db.prepare('UPDATE universal_capabilities SET status = ?, updated_at = ? WHERE id = ?')
        .run(status, updatedAt, id);
    }
    this.memoryCache.delete(id);
  }

  /**
   * Save health telemetry.
   */
  public saveHealth(capabilityId: string, health: CapabilityHealth): void {
    const stmt = this.db.prepare(`
      INSERT INTO capability_health (
        capability_id, status, last_checked_at, last_success_at, last_failure_at,
        consecutive_failures, latency_ms, message, provider_status,
        rate_limit_reset_at, quota_remaining
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(capability_id) DO UPDATE SET
        status = excluded.status,
        last_checked_at = excluded.last_checked_at,
        last_success_at = COALESCE(excluded.last_success_at, capability_health.last_success_at),
        last_failure_at = COALESCE(excluded.last_failure_at, capability_health.last_failure_at),
        consecutive_failures = excluded.consecutive_failures,
        latency_ms = excluded.latency_ms,
        message = excluded.message,
        provider_status = excluded.provider_status,
        rate_limit_reset_at = excluded.rate_limit_reset_at,
        quota_remaining = excluded.quota_remaining
    `);

    stmt.run(
      capabilityId,
      health.status,
      health.lastCheckedAt,
      health.lastSuccessAt || null,
      health.lastFailureAt || null,
      health.consecutiveFailures || 0,
      health.latencyMs || null,
      health.message || null,
      health.providerStatus || null,
      health.rateLimitResetAt || null,
      health.quotaRemaining !== undefined ? String(health.quotaRemaining) : 'UNKNOWN'
    );
  }

  /**
   * Get health record for a capability.
   */
  public getHealth(capabilityId: string): CapabilityHealth | undefined {
    const row = this.db.prepare('SELECT * FROM capability_health WHERE capability_id = ?').get(capabilityId) as Record<string, unknown> | undefined;
    if (!row) return undefined;

    return {
      status: (row.status as CapabilityHealth['status']) || 'UNKNOWN',
      lastCheckedAt: String(row.last_checked_at),
      lastSuccessAt: row.last_success_at ? String(row.last_success_at) : undefined,
      lastFailureAt: row.last_failure_at ? String(row.last_failure_at) : undefined,
      consecutiveFailures: Number(row.consecutive_failures || 0),
      latencyMs: row.latency_ms ? Number(row.latency_ms) : undefined,
      message: row.message ? String(row.message) : undefined,
      providerStatus: row.provider_status ? String(row.provider_status) : undefined,
      rateLimitResetAt: row.rate_limit_reset_at ? String(row.rate_limit_reset_at) : undefined,
      quotaRemaining: row.quota_remaining === 'UNKNOWN' ? 'UNKNOWN' : Number(row.quota_remaining || 0),
    };
  }

  /**
   * Record invocation audit entry (Never stores credentials or secret values).
   */
  public recordInvocation(inv: CapabilityInvocation, res: CapabilityResult): void {
    const stmt = this.db.prepare(`
      INSERT INTO capability_invocations (
        invocation_id, capability_id, operation, actor, company_id, project_id,
        agent_id, privacy_class, status, output_json, error_message, verified,
        verification_strategy, duration_ms, provider, capability_version,
        requested_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Defensive serialization: truncate large outputs if needed, ensure zero secrets
    let safeOutputJson: string | null = null;
    if (res.output !== undefined) {
      try {
        const raw = JSON.stringify(res.output);
        safeOutputJson = raw.length > 50000 ? raw.slice(0, 50000) + '...[TRUNCATED]' : raw;
      } catch {
        safeOutputJson = '{"error":"serialization_failed"}';
      }
    }

    stmt.run(
      inv.invocationId,
      inv.capabilityId,
      inv.operation,
      inv.actor,
      inv.companyId || null,
      inv.projectId || null,
      inv.agentId || null,
      inv.privacyClass,
      res.status,
      safeOutputJson,
      res.error || null,
      res.verification.verified ? 1 : 0,
      res.verification.strategy || null,
      res.durationMs,
      res.provider,
      res.capabilityVersion,
      inv.requestedAt,
      new Date().toISOString()
    );
  }

  /**
   * List recent invocation audit entries.
   */
  public listInvocations(capabilityId?: string, limit: number = 50): InvocationRecordRow[] {
    if (capabilityId) {
      return this.db.prepare('SELECT * FROM capability_invocations WHERE capability_id = ? ORDER BY requested_at DESC LIMIT ?')
        .all(capabilityId, limit) as unknown as InvocationRecordRow[];
    }
    return this.db.prepare('SELECT * FROM capability_invocations ORDER BY requested_at DESC LIMIT ?')
      .all(limit) as unknown as InvocationRecordRow[];
  }

  /**
   * Save credential reference (vault:// ref only, zero plaintext keys).
   */
  public saveCredential(cred: CapabilityCredentialReference): void {
    const stmt = this.db.prepare(`
      INSERT INTO capability_credentials (
        id, capability_id, credential_ref, provider, auth_type, scopes_json,
        status, expires_at, company_id, project_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(credential_ref) DO UPDATE SET
        capability_id = excluded.capability_id,
        provider = excluded.provider,
        auth_type = excluded.auth_type,
        scopes_json = excluded.scopes_json,
        status = excluded.status,
        expires_at = excluded.expires_at,
        company_id = excluded.company_id,
        project_id = excluded.project_id,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      cred.id,
      cred.capabilityId,
      cred.credentialRef,
      cred.provider,
      cred.authType,
      JSON.stringify(cred.scopes || []),
      cred.status,
      cred.expiresAt || null,
      cred.companyId || null,
      cred.projectId || null,
      cred.createdAt,
      cred.updatedAt
    );
  }

  /**
   * Get credential reference.
   */
  public getCredentialByRef(ref: string): CapabilityCredentialReference | undefined {
    const row = this.db.prepare('SELECT * FROM capability_credentials WHERE credential_ref = ?').get(ref) as Record<string, unknown> | undefined;
    if (!row) return undefined;

    return {
      id: String(row.id),
      capabilityId: String(row.capability_id),
      credentialRef: String(row.credential_ref),
      provider: String(row.provider),
      authType: String(row.auth_type) as any,
      scopes: JSON.parse(String(row.scopes_json || '[]')),
      status: String(row.status) as any,
      expiresAt: row.expires_at ? String(row.expires_at) : undefined,
      companyId: row.company_id ? String(row.company_id) : undefined,
      projectId: row.project_id ? String(row.project_id) : undefined,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  /**
   * Save dependencies for a capability.
   */
  public saveDependencies(capabilityId: string, dependencies: CapabilityDependency[]): void {
    const deleteStmt = this.db.prepare('DELETE FROM capability_dependencies WHERE capability_id = ?');
    deleteStmt.run(capabilityId);

    const insertStmt = this.db.prepare(`
      INSERT INTO capability_dependencies (
        id, capability_id, dependency_type, dependency_ref, required, satisfied, details
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const dep of dependencies) {
      insertStmt.run(
        dep.id,
        capabilityId,
        dep.dependencyType,
        dep.dependencyRef,
        dep.required ? 1 : 0,
        dep.satisfied ? 1 : 0,
        dep.details || null
      );
    }
  }

  /**
   * Get dependencies for a capability.
   */
  public getDependencies(capabilityId: string): CapabilityDependency[] {
    const rows = this.db.prepare('SELECT * FROM capability_dependencies WHERE capability_id = ?').all(capabilityId) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r.id),
      capabilityId: String(r.capability_id),
      dependencyType: String(r.dependency_type) as any,
      dependencyRef: String(r.dependency_ref),
      required: Boolean(r.required),
      satisfied: Boolean(r.satisfied),
      details: r.details ? String(r.details) : undefined,
    }));
  }

  private saveProvenance(capabilityId: string, cap: UniversalCapability): void {
    const stmt = this.db.prepare(`
      INSERT INTO capability_provenance (
        capability_id, source, provider, version, license, discovered_at,
        registered_by, verification_status, source_repository
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(capability_id) DO UPDATE SET
        source = excluded.source,
        provider = excluded.provider,
        version = excluded.version,
        license = excluded.license,
        verification_status = excluded.verification_status,
        source_repository = excluded.source_repository
    `);

    stmt.run(
      capabilityId,
      cap.provenance.source,
      cap.provenance.provider,
      cap.provenance.version,
      cap.provenance.license || 'UNKNOWN',
      cap.provenance.discoveredAt,
      cap.provenance.registeredBy,
      cap.provenance.verificationStatus,
      cap.provenance.sourceRepository || null
    );
  }

  private rowToCapability(row: Record<string, unknown>): UniversalCapability {
    const health = this.getHealth(String(row.id)) || {
      status: 'UNKNOWN',
      lastCheckedAt: new Date().toISOString(),
      consecutiveFailures: 0,
    };

    return {
      id: String(row.id),
      name: String(row.name),
      description: String(row.description),
      category: String(row.category) as any,
      provider: String(row.provider),
      source: String(row.source),
      version: String(row.version),
      protocol: String(row.protocol) as any,
      status: String(row.status) as any,
      trustLevel: String(row.trust_level) as any,
      riskLevel: String(row.risk_level) as any,
      privacyClass: String(row.privacy_class) as any,
      authentication: {
        type: String(row.authentication_type) as any,
        credentialRef: row.credential_ref ? String(row.credential_ref) : undefined,
        scopes: JSON.parse(String(row.scopes_json || '[]')),
      },
      scopes: JSON.parse(String(row.scopes_json || '[]')),
      inputs: JSON.parse(String(row.inputs_schema_json || '{}')),
      outputs: JSON.parse(String(row.outputs_schema_json || '{}')),
      dependencies: [],
      environments: JSON.parse(String(row.environments_json || '[]')),
      supportedOperations: JSON.parse(String(row.supported_operations_json || '[]')),
      provenance: {
        source: String(row.source),
        provider: String(row.provider),
        version: String(row.version),
        discoveredAt: String(row.created_at),
        registeredBy: 'SYSTEM',
        verificationStatus: 'UNVERIFIED',
      },
      verification: {
        verified: false,
        strategy: 'schema_match',
      },
      health,
      enabled: Boolean(row.enabled),
      documentation: row.documentation ? String(row.documentation) : undefined,
      metadata: JSON.parse(String(row.metadata_json || '{}')),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }
}
