/**
 * HṚṢĪKEŚA (हृषीकेश) — MCP Prompt Repository
 *
 * Phase 21: Persistence for MCP Prompts and Argument Schemas.
 */

import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import { DatabaseManager } from '../../persistence/database/database.manager.js';
import { MCPPrompt } from '../interfaces/mcp.types.js';

export class MCPPromptRepository {
  private readonly db: DatabaseSync;

  constructor(db: DatabaseManager | DatabaseSync) {
    this.db = (db instanceof DatabaseManager || 'getRawDb' in db) ? (db as any).getRawDb() : db;
  }

  public registerPrompt(prompt: Omit<MCPPrompt, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): MCPPrompt {
    const id = prompt.id || crypto.randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO mcp_prompts (
        id, server_id, name, description, arguments_json, risk_level, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `);

    stmt.run(
      id,
      prompt.serverId,
      prompt.name,
      prompt.description ?? null,
      JSON.stringify(prompt.arguments || []),
      prompt.riskLevel || 'LOW',
      now,
      now
    );

    return this.findPromptById(id)!;
  }

  public findPromptById(id: string): MCPPrompt | null {
    const row = this.db.prepare('SELECT * FROM mcp_prompts WHERE id = ?').get(id) as Record<string, any> | undefined;
    return row ? this.mapRowToMCPPrompt(row) : null;
  }

  public listPrompts(serverId?: string): MCPPrompt[] {
    const query = serverId
      ? 'SELECT * FROM mcp_prompts WHERE server_id = ? ORDER BY name ASC'
      : 'SELECT * FROM mcp_prompts ORDER BY name ASC';
    const rows = (serverId ? this.db.prepare(query).all(serverId) : this.db.prepare(query).all()) as unknown as Record<string, any>[];
    return rows.map((r) => this.mapRowToMCPPrompt(r));
  }

  public deletePromptsByServerId(serverId: string): void {
    this.db.prepare('DELETE FROM mcp_prompts WHERE server_id = ?').run(serverId);
  }

  private mapRowToMCPPrompt(row: Record<string, any>): MCPPrompt {
    return {
      id: String(row.id),
      serverId: String(row.server_id),
      name: String(row.name),
      description: row.description ? String(row.description) : undefined,
      arguments: row.arguments_json ? JSON.parse(row.arguments_json) : [],
      riskLevel: String(row.risk_level) as any,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }
}
