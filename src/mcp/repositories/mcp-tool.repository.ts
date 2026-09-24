/**
 * HṚṢĪKEŚA (हृषीकेश) — MCP Tool & Binding Repository
 *
 * Phase 21: Persistence for MCP Tools, Capability Bindings, and Telemetry.
 */

import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import { DatabaseManager } from '../../persistence/database/database.manager.js';
import { MCPTool, MCPCapabilityBinding, MCPExecutionStats, MCPCapabilityScope } from '../interfaces/mcp.types.js';
import { DangerTier } from '../../tools/interfaces/danger.types.js';

export class MCPToolRepository {
  private readonly db: DatabaseSync;

  constructor(db: DatabaseManager | DatabaseSync) {
    this.db = (db instanceof DatabaseManager || 'getRawDb' in db) ? (db as any).getRawDb() : db;
  }

  public registerTool(tool: Omit<MCPTool, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): MCPTool {
    const id = tool.id || crypto.randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO mcp_tools (
        id, server_id, name, display_name, description,
        input_schema_json, output_schema_json, risk_level,
        required_permissions_json, network_requirement,
        filesystem_requirement, credential_requirement,
        enabled, verified, is_destructive, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?,
        ?, ?, ?, ?, ?
      );
    `);

    stmt.run(
      id,
      tool.serverId,
      tool.name,
      tool.displayName || tool.name,
      tool.description || '',
      JSON.stringify(tool.inputSchema || {}),
      JSON.stringify(tool.outputSchema || {}),
      tool.riskLevel !== undefined ? tool.riskLevel : DangerTier.TIER_1,
      JSON.stringify(tool.requiredPermissions || []),
      tool.networkRequirement || 'NONE',
      tool.filesystemRequirement || 'NONE',
      tool.credentialRequirement || 'NONE',
      tool.enabled !== false ? 1 : 0,
      tool.verified ? 1 : 0,
      tool.isDestructive ? 1 : 0,
      now,
      now
    );

    return this.findToolById(id)!;
  }

  public updateTool(id: string, updates: Partial<MCPTool>): void {
    const existing = this.findToolById(id);
    if (!existing) return;

    const fields: string[] = [];
    const values: any[] = [];
    const now = new Date().toISOString();

    if (updates.displayName !== undefined) {
      fields.push('display_name = ?');
      values.push(updates.displayName);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.inputSchema !== undefined) {
      fields.push('input_schema_json = ?');
      values.push(JSON.stringify(updates.inputSchema));
    }
    if (updates.outputSchema !== undefined) {
      fields.push('output_schema_json = ?');
      values.push(JSON.stringify(updates.outputSchema));
    }
    if (updates.riskLevel !== undefined) {
      fields.push('risk_level = ?');
      values.push(updates.riskLevel);
    }
    if (updates.enabled !== undefined) {
      fields.push('enabled = ?');
      values.push(updates.enabled ? 1 : 0);
    }
    if (updates.verified !== undefined) {
      fields.push('verified = ?');
      values.push(updates.verified ? 1 : 0);
    }

    if (fields.length > 0) {
      fields.push('updated_at = ?');
      values.push(now);
      values.push(id);
      this.db.prepare(`UPDATE mcp_tools SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }
  }

  public findToolById(id: string): MCPTool | null {
    const row = this.db.prepare('SELECT * FROM mcp_tools WHERE id = ?').get(id) as Record<string, any> | undefined;
    return row ? this.mapRowToMCPTool(row) : null;
  }

  public findToolByName(serverId: string, name: string): MCPTool | null {
    const row = this.db.prepare('SELECT * FROM mcp_tools WHERE server_id = ? AND name = ?').get(serverId, name) as Record<string, any> | undefined;
    return row ? this.mapRowToMCPTool(row) : null;
  }

  public listTools(serverId?: string): MCPTool[] {
    const query = serverId
      ? 'SELECT * FROM mcp_tools WHERE server_id = ? ORDER BY name ASC'
      : 'SELECT * FROM mcp_tools ORDER BY name ASC';
    const rows = (serverId ? this.db.prepare(query).all(serverId) : this.db.prepare(query).all()) as unknown as Record<string, any>[];
    return rows.map((r) => this.mapRowToMCPTool(r));
  }

  public setToolEnabled(id: string, enabled: boolean): void {
    const now = new Date().toISOString();
    this.db.prepare('UPDATE mcp_tools SET enabled = ?, updated_at = ? WHERE id = ?').run(enabled ? 1 : 0, now, id);
  }

  public deleteToolsByServerId(serverId: string): void {
    this.db.prepare('DELETE FROM mcp_tools WHERE server_id = ?').run(serverId);
  }

  public getExecutionStats(serverId: string, toolId?: string): MCPExecutionStats | null {
    const stats = this.getStats(serverId, toolId);
    return stats.length > 0 ? stats[0] : null;
  }

  // Capability Bindings
  public bindCapability(binding: {
    serverId: string;
    toolId: string;
    capabilityId: string;
    scope?: MCPCapabilityScope;
    tenantId?: string;
    priority?: number;
    enabled?: boolean;
  }): MCPCapabilityBinding {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO mcp_capability_bindings (
        id, server_id, tool_id, capability_id, scope, tenant_id, enabled, priority, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);

    stmt.run(
      id,
      binding.serverId,
      binding.toolId,
      binding.capabilityId,
      binding.scope || 'GLOBAL',
      binding.tenantId ?? null,
      binding.enabled !== false ? 1 : 0,
      binding.priority ?? 100,
      now,
      now
    );

    return {
      id,
      serverId: binding.serverId,
      toolId: binding.toolId,
      capabilityId: binding.capabilityId,
      scope: binding.scope || 'GLOBAL',
      tenantId: binding.tenantId,
      enabled: binding.enabled !== false,
      priority: binding.priority ?? 100,
      createdAt: now,
      updatedAt: now,
    };
  }

  public listBindings(filter?: { capabilityId?: string; serverId?: string; scope?: MCPCapabilityScope }): MCPCapabilityBinding[] {
    let query = 'SELECT * FROM mcp_capability_bindings WHERE 1=1';
    const params: any[] = [];

    if (filter?.capabilityId) {
      query += ' AND capability_id = ?';
      params.push(filter.capabilityId);
    }
    if (filter?.serverId) {
      query += ' AND server_id = ?';
      params.push(filter.serverId);
    }
    if (filter?.scope) {
      query += ' AND scope = ?';
      params.push(filter.scope);
    }

    query += ' ORDER BY priority ASC, created_at DESC';

    const rows = this.db.prepare(query).all(...params) as unknown as Record<string, any>[];
    return rows.map((r) => ({
      id: String(r.id),
      serverId: String(r.server_id),
      toolId: String(r.tool_id),
      capabilityId: String(r.capability_id),
      scope: String(r.scope) as any,
      tenantId: r.tenant_id ? String(r.tenant_id) : undefined,
      enabled: Boolean(r.enabled),
      priority: Number(r.priority || 100),
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    }));
  }

  // Telemetry & Stats
  public recordExecution(serverId: string, toolId: string, success: boolean, latencyMs: number, error?: string): void {
    const now = new Date().toISOString();
    const existing = this.db.prepare('SELECT * FROM mcp_execution_stats WHERE server_id = ? AND tool_id = ?').get(serverId, toolId) as Record<string, any> | undefined;

    if (!existing) {
      const id = crypto.randomUUID();
      this.db.prepare(`
        INSERT INTO mcp_execution_stats (
          id, server_id, tool_id, total_calls, successful_calls, failed_calls, total_latency_ms, avg_latency_ms, last_called_at, last_error
        ) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?);
      `).run(
        id,
        serverId,
        toolId,
        success ? 1 : 0,
        success ? 0 : 1,
        latencyMs,
        latencyMs,
        now,
        error ?? null
      );
    } else {
      const totalCalls = Number(existing.total_calls) + 1;
      const successfulCalls = Number(existing.successful_calls) + (success ? 1 : 0);
      const failedCalls = Number(existing.failed_calls) + (success ? 0 : 1);
      const totalLatencyMs = Number(existing.total_latency_ms) + latencyMs;
      const avgLatencyMs = Math.round(totalLatencyMs / totalCalls);

      this.db.prepare(`
        UPDATE mcp_execution_stats SET
          total_calls = ?,
          successful_calls = ?,
          failed_calls = ?,
          total_latency_ms = ?,
          avg_latency_ms = ?,
          last_called_at = ?,
          last_error = ?
        WHERE server_id = ? AND tool_id = ?;
      `).run(
        totalCalls,
        successfulCalls,
        failedCalls,
        totalLatencyMs,
        avgLatencyMs,
        now,
        error ?? existing.last_error ?? null,
        serverId,
        toolId
      );
    }
  }

  public getStats(serverId: string, toolId?: string): MCPExecutionStats[] {
    const query = toolId
      ? 'SELECT * FROM mcp_execution_stats WHERE server_id = ? AND tool_id = ?'
      : 'SELECT * FROM mcp_execution_stats WHERE server_id = ?';
    const rows = (toolId ? this.db.prepare(query).all(serverId, toolId) : this.db.prepare(query).all(serverId)) as unknown as Record<string, any>[];

    return rows.map((r) => ({
      id: String(r.id),
      serverId: String(r.server_id),
      toolId: String(r.tool_id),
      totalCalls: Number(r.total_calls || 0),
      successfulCalls: Number(r.successful_calls || 0),
      failedCalls: Number(r.failed_calls || 0),
      totalLatencyMs: Number(r.total_latency_ms || 0),
      avgLatencyMs: Number(r.avg_latency_ms || 0),
      lastCalledAt: r.last_called_at ? String(r.last_called_at) : undefined,
      lastError: r.last_error ? String(r.last_error) : undefined,
    }));
  }

  private mapRowToMCPTool(row: Record<string, any>): MCPTool {
    return {
      id: String(row.id),
      serverId: String(row.server_id),
      name: String(row.name),
      displayName: String(row.display_name),
      description: String(row.description),
      inputSchema: row.input_schema_json ? JSON.parse(row.input_schema_json) : {},
      outputSchema: row.output_schema_json ? JSON.parse(row.output_schema_json) : {},
      riskLevel: Number(row.risk_level) as any,
      requiredPermissions: row.required_permissions_json ? JSON.parse(row.required_permissions_json) : [],
      networkRequirement: String(row.network_requirement) as any,
      filesystemRequirement: String(row.filesystem_requirement) as any,
      credentialRequirement: String(row.credential_requirement) as any,
      enabled: Boolean(row.enabled),
      verified: Boolean(row.verified),
      isDestructive: Boolean(row.is_destructive),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }
}
