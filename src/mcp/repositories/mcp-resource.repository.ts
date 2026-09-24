/**
 * HṚṢĪKEŚA (हृषीकेश) — MCP Resource Repository
 *
 * Phase 21: Persistence for MCP Resources and Access Policies.
 */

import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import { DatabaseManager } from '../../persistence/database/database.manager.js';
import { MCPResource } from '../interfaces/mcp.types.js';

export class MCPResourceRepository {
  private readonly db: DatabaseSync;

  constructor(db: DatabaseManager | DatabaseSync) {
    this.db = (db instanceof DatabaseManager || 'getRawDb' in db) ? (db as any).getRawDb() : db;
  }

  public registerResource(resource: Omit<MCPResource, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): MCPResource {
    const id = resource.id || crypto.randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO mcp_resources (
        id, server_id, uri, name, description, mime_type, sensitivity, access_policy_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);

    stmt.run(
      id,
      resource.serverId,
      resource.uri,
      resource.name,
      resource.description ?? null,
      resource.mimeType || 'text/plain',
      resource.sensitivity || 'INTERNAL',
      JSON.stringify(resource.accessPolicy || {}),
      now,
      now
    );

    return this.findResourceById(id)!;
  }

  public findResourceById(id: string): MCPResource | null {
    const row = this.db.prepare('SELECT * FROM mcp_resources WHERE id = ?').get(id) as Record<string, any> | undefined;
    return row ? this.mapRowToMCPResource(row) : null;
  }

  public listResources(serverId?: string): MCPResource[] {
    const query = serverId
      ? 'SELECT * FROM mcp_resources WHERE server_id = ? ORDER BY name ASC'
      : 'SELECT * FROM mcp_resources ORDER BY name ASC';
    const rows = (serverId ? this.db.prepare(query).all(serverId) : this.db.prepare(query).all()) as unknown as Record<string, any>[];
    return rows.map((r) => this.mapRowToMCPResource(r));
  }

  public deleteResourcesByServerId(serverId: string): void {
    this.db.prepare('DELETE FROM mcp_resources WHERE server_id = ?').run(serverId);
  }

  private mapRowToMCPResource(row: Record<string, any>): MCPResource {
    return {
      id: String(row.id),
      serverId: String(row.server_id),
      uri: String(row.uri),
      name: String(row.name),
      description: row.description ? String(row.description) : undefined,
      mimeType: String(row.mime_type),
      sensitivity: String(row.sensitivity) as any,
      accessPolicy: row.access_policy_json ? JSON.parse(row.access_policy_json) : {},
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }
}
