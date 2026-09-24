/**
 * HṚṢĪKEŚA (हृषीकेश) — MCP Server Repository
 *
 * Phase 21: SQLite-backed persistence for MCP Servers and Version Snapshots.
 */

import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import { DatabaseManager } from '../../persistence/database/database.manager.js';
import { MCPServer, MCPServerVersion, MCPServerStatus, MCPHealthStatus, MCPTrustLevel } from '../interfaces/mcp.types.js';

export class MCPServerRepository {
  private readonly db: DatabaseSync;

  constructor(db: DatabaseManager | DatabaseSync) {
    this.db = (db instanceof DatabaseManager || 'getRawDb' in db) ? (db as any).getRawDb() : db;
  }

  public create(server: Omit<MCPServer, 'createdAt' | 'updatedAt' | 'restartCount'> & { restartCount?: number }): MCPServer {
    const now = new Date().toISOString();
    const id = server.id || crypto.randomUUID();
    const restartCount = server.restartCount ?? 0;

    const stmt = this.db.prepare(`
      INSERT INTO mcp_servers (
        id, name, display_name, description, version, transport,
        command, arguments_json, endpoint, env_metadata_json,
        status, trust_level, source, repository_url, license,
        enabled, authorized, health, last_checked_at, pid,
        restart_count, config_hash, error_message, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      );
    `);

    stmt.run(
      id,
      server.name.trim().toLowerCase(),
      server.displayName,
      server.description,
      server.version || '1.0.0',
      server.transport || 'stdio',
      server.command ?? null,
      JSON.stringify(server.args || []),
      server.endpoint ?? null,
      JSON.stringify(server.envMetadata || {}),
      server.status || 'DISCOVERED',
      server.trustLevel || 'UNKNOWN',
      server.source || 'LOCAL',
      server.repositoryUrl ?? null,
      server.license || 'UNKNOWN',
      server.enabled ? 1 : 0,
      server.authorized ? 1 : 0,
      server.health || 'UNCONFIGURED',
      server.lastCheckedAt ?? null,
      server.pid ?? null,
      restartCount,
      server.configHash ?? null,
      server.errorMessage ?? null,
      now,
      now
    );

    // Save initial version snapshot
    this.createVersionSnapshot(id, server.version || '1.0.0', {
      name: server.name,
      transport: server.transport,
      command: server.command,
      args: server.args,
      endpoint: server.endpoint,
    });

    return this.findById(id)!;
  }

  public findById(id: string): MCPServer | null {
    const row = this.db.prepare('SELECT * FROM mcp_servers WHERE id = ?').get(id) as Record<string, any> | undefined;
    return row ? this.mapRowToMCPServer(row) : null;
  }

  public findByName(name: string): MCPServer | null {
    const row = this.db.prepare('SELECT * FROM mcp_servers WHERE name = ?').get(name.trim().toLowerCase()) as Record<string, any> | undefined;
    return row ? this.mapRowToMCPServer(row) : null;
  }

  public list(filter?: {
    status?: MCPServerStatus;
    trustLevel?: MCPTrustLevel;
    health?: MCPHealthStatus;
    enabled?: boolean;
    authorized?: boolean;
  }): MCPServer[] {
    let query = 'SELECT * FROM mcp_servers WHERE 1=1';
    const params: any[] = [];

    if (filter?.status) {
      query += ' AND status = ?';
      params.push(filter.status);
    }
    if (filter?.trustLevel) {
      query += ' AND trust_level = ?';
      params.push(filter.trustLevel);
    }
    if (filter?.health) {
      query += ' AND health = ?';
      params.push(filter.health);
    }
    if (filter?.enabled !== undefined) {
      query += ' AND enabled = ?';
      params.push(filter.enabled ? 1 : 0);
    }
    if (filter?.authorized !== undefined) {
      query += ' AND authorized = ?';
      params.push(filter.authorized ? 1 : 0);
    }

    query += ' ORDER BY created_at DESC';

    const rows = this.db.prepare(query).all(...params) as unknown as Record<string, any>[];
    return rows.map((r) => this.mapRowToMCPServer(r));
  }

  public update(id: string, updates: Partial<MCPServer>): MCPServer | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.displayName !== undefined) {
      fields.push('display_name = ?');
      values.push(updates.displayName);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.version !== undefined) {
      fields.push('version = ?');
      values.push(updates.version);
    }
    if (updates.transport !== undefined) {
      fields.push('transport = ?');
      values.push(updates.transport);
    }
    if (updates.command !== undefined) {
      fields.push('command = ?');
      values.push(updates.command);
    }
    if (updates.args !== undefined) {
      fields.push('arguments_json = ?');
      values.push(JSON.stringify(updates.args));
    }
    if (updates.endpoint !== undefined) {
      fields.push('endpoint = ?');
      values.push(updates.endpoint);
    }
    if (updates.envMetadata !== undefined) {
      fields.push('env_metadata_json = ?');
      values.push(JSON.stringify(updates.envMetadata));
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.trustLevel !== undefined) {
      fields.push('trust_level = ?');
      values.push(updates.trustLevel);
    }
    if (updates.enabled !== undefined) {
      fields.push('enabled = ?');
      values.push(updates.enabled ? 1 : 0);
    }
    if (updates.authorized !== undefined) {
      fields.push('authorized = ?');
      values.push(updates.authorized ? 1 : 0);
    }
    if (updates.health !== undefined) {
      fields.push('health = ?');
      values.push(updates.health);
    }
    if (updates.lastCheckedAt !== undefined) {
      fields.push('last_checked_at = ?');
      values.push(updates.lastCheckedAt);
    }
    if (updates.pid !== undefined) {
      fields.push('pid = ?');
      values.push(updates.pid);
    }
    if (updates.restartCount !== undefined) {
      fields.push('restart_count = ?');
      values.push(updates.restartCount);
    }
    if (updates.configHash !== undefined) {
      fields.push('config_hash = ?');
      values.push(updates.configHash);
    }
    if (updates.errorMessage !== undefined) {
      fields.push('error_message = ?');
      values.push(updates.errorMessage);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    this.db.prepare(`UPDATE mcp_servers SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    if (updates.version && updates.version !== existing.version) {
      this.createVersionSnapshot(id, updates.version, {
        ...existing,
        ...updates,
      });
    }

    return this.findById(id);
  }

  public updateStatus(id: string, status: MCPServerStatus, health?: MCPHealthStatus, error?: string): void {
    const now = new Date().toISOString();
    let query = 'UPDATE mcp_servers SET status = ?, updated_at = ?';
    const params: any[] = [status, now];

    if (health) {
      query += ', health = ?';
      params.push(health);
    }
    if (error !== undefined) {
      query += ', error_message = ?';
      params.push(error);
    }
    query += ' WHERE id = ?';
    params.push(id);

    this.db.prepare(query).run(...params);
  }

  public delete(id: string): boolean {
    const res = this.db.prepare('DELETE FROM mcp_servers WHERE id = ?').run(id);
    return res.changes > 0;
  }

  public createVersionSnapshot(serverId: string, version: string, definition: Record<string, unknown>, changelog?: string): MCPServerVersion {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO mcp_server_versions (
        id, server_id, version, definition_json, changelog, created_at
      ) VALUES (?, ?, ?, ?, ?, ?);
    `);

    stmt.run(id, serverId, version, JSON.stringify(definition), changelog ?? null, now);

    return {
      id,
      serverId,
      version,
      definition,
      changelog,
      createdAt: now,
    };
  }

  public getVersions(serverId: string): MCPServerVersion[] {
    const rows = this.db.prepare(
      'SELECT * FROM mcp_server_versions WHERE server_id = ? ORDER BY created_at DESC'
    ).all(serverId) as unknown as Record<string, any>[];

    return rows.map((r) => ({
      id: String(r.id),
      serverId: String(r.server_id),
      version: String(r.version),
      definition: JSON.parse(r.definition_json || '{}'),
      changelog: r.changelog ? String(r.changelog) : undefined,
      createdAt: String(r.created_at),
    }));
  }

  public listVersions(serverId: string): MCPServerVersion[] {
    return this.getVersions(serverId);
  }

  private mapRowToMCPServer(row: Record<string, any>): MCPServer {
    return {
      id: String(row.id),
      name: String(row.name),
      displayName: String(row.display_name),
      description: String(row.description),
      version: String(row.version),
      transport: String(row.transport) as any,
      command: row.command ? String(row.command) : undefined,
      args: row.arguments_json ? JSON.parse(row.arguments_json) : [],
      endpoint: row.endpoint ? String(row.endpoint) : undefined,
      envMetadata: row.env_metadata_json ? JSON.parse(row.env_metadata_json) : {},
      status: String(row.status) as any,
      trustLevel: String(row.trust_level) as any,
      source: String(row.source),
      repositoryUrl: row.repository_url ? String(row.repository_url) : undefined,
      license: String(row.license),
      enabled: Boolean(row.enabled),
      authorized: Boolean(row.authorized),
      health: String(row.health) as any,
      lastCheckedAt: row.last_checked_at ? String(row.last_checked_at) : undefined,
      pid: row.pid ? Number(row.pid) : undefined,
      restartCount: Number(row.restart_count || 0),
      configHash: row.config_hash ? String(row.config_hash) : undefined,
      errorMessage: row.error_message ? String(row.error_message) : undefined,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }
}
