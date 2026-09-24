/**
 * HṚṢĪKEŚA (हृषीकेश) — MCP Security Review Repository
 *
 * Phase 21: Persistence for MCP Security Reviews and Static Analysis Reports.
 */

import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import { DatabaseManager } from '../../persistence/database/database.manager.js';
import { MCPSecurityReview } from '../interfaces/mcp.types.js';

export class MCPSecurityRepository {
  private readonly db: DatabaseSync;

  constructor(db: DatabaseManager | DatabaseSync) {
    this.db = (db instanceof DatabaseManager || 'getRawDb' in db) ? (db as any).getRawDb() : db;
  }

  public recordReview(review: Omit<MCPSecurityReview, 'id' | 'reviewedAt'> & { id?: string }): MCPSecurityReview {
    const id = review.id || crypto.randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO mcp_security_reviews (
        id, server_id, reviewed_at, reviewer, findings_json, risk_score, decision, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `);

    stmt.run(
      id,
      review.serverId,
      now,
      review.reviewer || 'SYSTEM',
      JSON.stringify(review.findings || []),
      review.riskScore ?? 0.0,
      review.decision || 'APPROVED',
      review.notes ?? null
    );

    return {
      id,
      serverId: review.serverId,
      reviewedAt: now,
      reviewer: review.reviewer || 'SYSTEM',
      findings: review.findings || [],
      riskScore: review.riskScore ?? 0.0,
      decision: review.decision || 'APPROVED',
      notes: review.notes,
    };
  }

  public getLatestReview(serverId: string): MCPSecurityReview | null {
    const row = this.db.prepare(
      'SELECT * FROM mcp_security_reviews WHERE server_id = ? ORDER BY reviewed_at DESC LIMIT 1'
    ).get(serverId) as Record<string, any> | undefined;

    return row ? this.mapRowToSecurityReview(row) : null;
  }

  public listReviews(serverId: string): MCPSecurityReview[] {
    const rows = this.db.prepare(
      'SELECT * FROM mcp_security_reviews WHERE server_id = ? ORDER BY reviewed_at DESC'
    ).all(serverId) as unknown as Record<string, any>[];

    return rows.map((r) => this.mapRowToSecurityReview(r));
  }

  private mapRowToSecurityReview(row: Record<string, any>): MCPSecurityReview {
    return {
      id: String(row.id),
      serverId: String(row.server_id),
      reviewedAt: String(row.reviewed_at),
      reviewer: String(row.reviewer),
      findings: row.findings_json ? JSON.parse(row.findings_json) : [],
      riskScore: Number(row.risk_score || 0.0),
      decision: String(row.decision) as any,
      notes: row.notes ? String(row.notes) : undefined,
    };
  }
}
