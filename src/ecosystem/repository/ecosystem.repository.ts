/**
 * HṚṢĪKEŚA (हृषीकेश) — Ecosystem SQLite Repository
 *
 * FP-15: Persistent repository for normalized service descriptors, interface bindings,
 * operation audit records, and consequential action verifications.
 */

import { DatabaseSync } from 'node:sqlite';
import {
  ServiceDescriptor,
  ServiceInterfaceBinding,
  EcosystemOperationEnvelope,
  ConsequentialVerificationResult,
} from '../types/index.js';

export class EcosystemRepository {
  constructor(private readonly db: DatabaseSync) {}

  // ==========================================
  // 1. Service Descriptors
  // ==========================================

  public saveService(service: ServiceDescriptor): void {
    const stmt = this.db.prepare(`
      INSERT INTO ecosystem_services (
        id, provider_id, name, display_name, category,
        interfaces_json, capabilities_json, auth_methods_json,
        account_requirements_json, scopes_json, environments_json,
        supported_operations_json, risk, privacy, availability,
        health_status, quota_json, rate_limit_json, provenance_json,
        license, version, documentation_url, dependencies_json,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        provider_id = excluded.provider_id,
        name = excluded.name,
        display_name = excluded.display_name,
        category = excluded.category,
        interfaces_json = excluded.interfaces_json,
        capabilities_json = excluded.capabilities_json,
        auth_methods_json = excluded.auth_methods_json,
        account_requirements_json = excluded.account_requirements_json,
        scopes_json = excluded.scopes_json,
        environments_json = excluded.environments_json,
        supported_operations_json = excluded.supported_operations_json,
        risk = excluded.risk,
        privacy = excluded.privacy,
        availability = excluded.availability,
        health_status = excluded.health_status,
        quota_json = excluded.quota_json,
        rate_limit_json = excluded.rate_limit_json,
        provenance_json = excluded.provenance_json,
        license = excluded.license,
        version = excluded.version,
        documentation_url = excluded.documentation_url,
        dependencies_json = excluded.dependencies_json,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      service.serviceId,
      service.providerId,
      service.name,
      service.displayName,
      service.category,
      JSON.stringify(service.interfaces || []),
      JSON.stringify(service.capabilities || []),
      JSON.stringify(service.authenticationMethods || []),
      JSON.stringify(service.accountRequirements || {}),
      JSON.stringify(service.scopes || []),
      JSON.stringify(service.environments || []),
      JSON.stringify(service.supportedOperations || []),
      service.risk,
      service.privacy,
      service.availability,
      service.health,
      JSON.stringify(service.quota || {}),
      JSON.stringify(service.rateLimit || {}),
      JSON.stringify(service.provenance || {}),
      service.license,
      service.version,
      service.documentation || null,
      JSON.stringify(service.dependencies || []),
      service.createdAt,
      service.updatedAt
    );

    // Save interface bindings
    if (service.interfaces && service.interfaces.length > 0) {
      this.saveInterfaces(service.serviceId, service.interfaces);
    }
  }

  public getService(serviceId: string): ServiceDescriptor | null {
    const stmt = this.db.prepare(`SELECT * FROM ecosystem_services WHERE id = ?`);
    const row = stmt.get(serviceId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapRowToService(row);
  }

  public listServices(filter?: { category?: string; providerId?: string }): ServiceDescriptor[] {
    let sql = `SELECT * FROM ecosystem_services WHERE 1=1`;
    const params: string[] = [];

    if (filter?.category) {
      sql += ` AND category = ?`;
      params.push(filter.category);
    }
    if (filter?.providerId) {
      sql += ` AND provider_id = ?`;
      params.push(filter.providerId);
    }

    sql += ` ORDER BY name ASC`;
    const stmt = this.db.prepare(sql);
    const rows = (params.length > 0 ? stmt.all(...params) : stmt.all()) as unknown as Record<string, unknown>[];
    return rows.map(r => this.mapRowToService(r));
  }

  private mapRowToService(row: Record<string, unknown>): ServiceDescriptor {
    return {
      serviceId: String(row.id),
      providerId: String(row.provider_id),
      name: String(row.name),
      displayName: String(row.display_name),
      category: row.category as any,
      interfaces: JSON.parse(String(row.interfaces_json || '[]')),
      capabilities: JSON.parse(String(row.capabilities_json || '[]')),
      authenticationMethods: JSON.parse(String(row.auth_methods_json || '[]')),
      accountRequirements: JSON.parse(String(row.account_requirements_json || '{}')),
      scopes: JSON.parse(String(row.scopes_json || '[]')),
      environments: JSON.parse(String(row.environments_json || '[]')),
      supportedOperations: JSON.parse(String(row.supported_operations_json || '[]')),
      risk: row.risk as any,
      privacy: row.privacy as any,
      availability: row.availability as any,
      health: row.health_status as any,
      quota: JSON.parse(String(row.quota_json || '{}')),
      rateLimit: JSON.parse(String(row.rate_limit_json || '{}')),
      provenance: JSON.parse(String(row.provenance_json || '{}')),
      license: String(row.license),
      version: String(row.version),
      documentation: row.documentation_url ? String(row.documentation_url) : undefined,
      dependencies: JSON.parse(String(row.dependencies_json || '[]')),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  // ==========================================
  // 2. Interfaces
  // ==========================================

  public saveInterfaces(serviceId: string, interfaces: ServiceInterfaceBinding[]): void {
    const deleteStmt = this.db.prepare(`DELETE FROM ecosystem_interfaces WHERE service_id = ?`);
    deleteStmt.run(serviceId);

    const insertStmt = this.db.prepare(`
      INSERT INTO ecosystem_interfaces (
        id, service_id, interface_type, priority,
        reliability_score, average_latency_ms, is_available,
        requires_approval, config_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    for (const iface of interfaces) {
      const ifaceId = `${serviceId}_${iface.interfaceType.toLowerCase()}`;
      insertStmt.run(
        ifaceId,
        serviceId,
        iface.interfaceType,
        iface.priority,
        iface.reliabilityScore,
        iface.averageLatencyMs,
        iface.isAvailable ? 1 : 0,
        iface.requiresApproval ? 1 : 0,
        JSON.stringify(iface.config || {}),
        now,
        now
      );
    }
  }

  public getInterfacesForService(serviceId: string): ServiceInterfaceBinding[] {
    const stmt = this.db.prepare(`
      SELECT * FROM ecosystem_interfaces WHERE service_id = ? ORDER BY priority ASC
    `);
    const rows = stmt.all(serviceId) as Record<string, unknown>[];
    return rows.map(r => ({
      interfaceType: r.interface_type as any,
      priority: Number(r.priority),
      reliabilityScore: Number(r.reliability_score),
      averageLatencyMs: Number(r.average_latency_ms),
      isAvailable: Number(r.is_available) === 1,
      requiresApproval: Number(r.requires_approval) === 1,
      config: JSON.parse(String(r.config_json || '{}')),
    }));
  }

  // ==========================================
  // 3. Operations Ledger
  // ==========================================

  public saveOperation(envelope: EcosystemOperationEnvelope): void {
    const stmt = this.db.prepare(`
      INSERT INTO ecosystem_operations (
        id, operation_id, provider_id, service_id, account_id,
        capability_id, operation_name, interface_type, scope,
        risk_level, request_json, response_json, status,
        error_json, evidence_json, execution_time_ms, started_at,
        completed_at, provenance_json
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?
      )
      ON CONFLICT(operation_id) DO UPDATE SET
        response_json = excluded.response_json,
        status = excluded.status,
        error_json = excluded.error_json,
        evidence_json = excluded.evidence_json,
        execution_time_ms = excluded.execution_time_ms,
        completed_at = excluded.completed_at
    `);

    stmt.run(
      `op_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      envelope.operationId,
      envelope.providerId,
      envelope.serviceId,
      envelope.accountId || null,
      envelope.capabilityId,
      envelope.operationName,
      envelope.interfaceType,
      envelope.scope || null,
      envelope.riskLevel,
      JSON.stringify(envelope.request || {}),
      JSON.stringify(envelope.response || {}),
      envelope.status,
      envelope.error ? JSON.stringify(envelope.error) : null,
      envelope.evidence ? JSON.stringify(envelope.evidence) : null,
      envelope.executionTimeMs || 0,
      envelope.startedAt,
      envelope.completedAt || null,
      JSON.stringify(envelope.provenance || {})
    );
  }

  public getOperation(operationId: string): EcosystemOperationEnvelope | null {
    const stmt = this.db.prepare(`SELECT * FROM ecosystem_operations WHERE operation_id = ?`);
    const row = stmt.get(operationId) as Record<string, unknown> | undefined;
    if (!row) return null;

    return {
      operationId: String(row.operation_id),
      providerId: String(row.provider_id),
      serviceId: String(row.service_id),
      accountId: row.account_id ? String(row.account_id) : undefined,
      capabilityId: String(row.capability_id),
      operationName: String(row.operation_name),
      interfaceType: row.interface_type as any,
      scope: row.scope ? String(row.scope) : undefined,
      riskLevel: row.risk_level as any,
      request: JSON.parse(String(row.request_json || '{}')),
      response: row.response_json ? JSON.parse(String(row.response_json)) : undefined,
      status: row.status as any,
      error: row.error_json ? JSON.parse(String(row.error_json)) : undefined,
      evidence: row.evidence_json ? JSON.parse(String(row.evidence_json)) : undefined,
      executionTimeMs: Number(row.execution_time_ms || 0),
      startedAt: String(row.started_at),
      completedAt: row.completed_at ? String(row.completed_at) : undefined,
      provenance: JSON.parse(String(row.provenance_json || '{}')),
    };
  }

  public listRecentOperations(limit = 50): EcosystemOperationEnvelope[] {
    const stmt = this.db.prepare(`
      SELECT * FROM ecosystem_operations ORDER BY started_at DESC LIMIT ?
    `);
    const rows = stmt.all(limit) as Record<string, unknown>[];
    return rows.map(row => ({
      operationId: String(row.operation_id),
      providerId: String(row.provider_id),
      serviceId: String(row.service_id),
      accountId: row.account_id ? String(row.account_id) : undefined,
      capabilityId: String(row.capability_id),
      operationName: String(row.operation_name),
      interfaceType: row.interface_type as any,
      scope: row.scope ? String(row.scope) : undefined,
      riskLevel: row.risk_level as any,
      request: JSON.parse(String(row.request_json || '{}')),
      response: row.response_json ? JSON.parse(String(row.response_json)) : undefined,
      status: row.status as any,
      error: row.error_json ? JSON.parse(String(row.error_json)) : undefined,
      evidence: row.evidence_json ? JSON.parse(String(row.evidence_json)) : undefined,
      executionTimeMs: Number(row.execution_time_ms || 0),
      startedAt: String(row.started_at),
      completedAt: row.completed_at ? String(row.completed_at) : undefined,
      provenance: JSON.parse(String(row.provenance_json || '{}')),
    }));
  }

  // ==========================================
  // 4. Consequential Verifications
  // ==========================================

  public saveVerification(result: ConsequentialVerificationResult): void {
    // Ensure parent operation exists to satisfy SQLite FOREIGN KEY constraint
    const opExists = this.db.prepare('SELECT 1 FROM ecosystem_operations WHERE operation_id = ?').get(result.operationId);
    if (!opExists) {
      this.saveOperation({
        operationId: result.operationId,
        providerId: 'ecosystem',
        serviceId: 'svc_verification',
        capabilityId: 'verification.evidence',
        operationName: 'Verification Check',
        interfaceType: 'LOCAL_API',
        riskLevel: 'LOW',
        request: {},
        status: result.verified ? 'VERIFIED' : 'FAILED',
        startedAt: result.verifiedAt,
        completedAt: result.verifiedAt,
        provenance: { source: 'ConsequentialVerificationEngine' },
      });
    }

    const stmt = this.db.prepare(`
      INSERT INTO ecosystem_verifications (
        id, operation_id, strategy, verified, evidence_json, verified_at, error
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      `verif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      result.operationId,
      result.strategy,
      result.verified ? 1 : 0,
      JSON.stringify(result.evidence || {}),
      result.verifiedAt,
      result.error || null
    );
  }

  public getVerification(operationId: string): ConsequentialVerificationResult | null {
    const stmt = this.db.prepare(`
      SELECT * FROM ecosystem_verifications WHERE operation_id = ? ORDER BY verified_at DESC LIMIT 1
    `);
    const row = stmt.get(operationId) as Record<string, unknown> | undefined;
    if (!row) return null;

    return {
      operationId: String(row.operation_id),
      verified: Number(row.verified) === 1,
      strategy: String(row.strategy),
      evidence: JSON.parse(String(row.evidence_json || '{}')),
      verifiedAt: String(row.verified_at),
      error: row.error ? String(row.error) : undefined,
    };
  }
}
