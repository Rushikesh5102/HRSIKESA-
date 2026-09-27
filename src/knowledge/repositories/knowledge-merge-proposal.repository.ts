/**
 * HṚṢĪKEŚA (हृषीकेश) — Knowledge Merge Proposal Repository
 *
 * INT-006: Proposal-Based Entity Disambiguation and Non-Destructive Merging
 */

import { randomUUID } from 'node:crypto';
import { EntityMergeProposal, MergeProposalStatus } from '../interfaces/knowledge.types.js';

export class KnowledgeMergeProposalRepository {
  private readonly db: any;

  constructor(db: any) {
    this.db = db;
  }

  public createProposal(data: {
    entityAId: string;
    entityBId: string;
    reason: string;
    confidence?: number;
    evidence?: string;
    status?: MergeProposalStatus;
  }): EntityMergeProposal {
    const id = `kmp_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const now = new Date().toISOString();
    const confidence = data.confidence !== undefined ? data.confidence : 0.5;
    const status: MergeProposalStatus = data.status || 'PENDING';

    const stmt = this.db.prepare(`
      INSERT INTO knowledge_merge_proposals (
        id, entity_a_id, entity_b_id, reason, confidence, evidence, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `);

    stmt.run(
      id,
      data.entityAId,
      data.entityBId,
      data.reason,
      confidence,
      data.evidence || null,
      status,
      now
    );

    return {
      id,
      entityAId: data.entityAId,
      entityBId: data.entityBId,
      reason: data.reason,
      confidence,
      evidence: data.evidence,
      status,
      createdAt: now,
    };
  }

  public getProposal(id: string): EntityMergeProposal | null {
    const stmt = this.db.prepare(`
      SELECT 
        p.id, p.entity_a_id as entityAId, p.entity_b_id as entityBId,
        p.reason, p.confidence, p.evidence, p.status, p.created_at as createdAt,
        p.resolved_at as resolvedAt, p.resolved_by as resolvedBy,
        ea.display_name as entityAName, eb.display_name as entityBName
      FROM knowledge_merge_proposals p
      LEFT JOIN knowledge_entities ea ON p.entity_a_id = ea.id
      LEFT JOIN knowledge_entities eb ON p.entity_b_id = eb.id
      WHERE p.id = ?;
    `);

    const row = stmt.get(id) as unknown as EntityMergeProposal | undefined;
    return row || null;
  }

  public listProposals(filters?: {
    status?: MergeProposalStatus;
    limit?: number;
  }): EntityMergeProposal[] {
    const limit = filters?.limit || 50;
    let sql = `
      SELECT 
        p.id, p.entity_a_id as entityAId, p.entity_b_id as entityBId,
        p.reason, p.confidence, p.evidence, p.status, p.created_at as createdAt,
        p.resolved_at as resolvedAt, p.resolved_by as resolvedBy,
        ea.display_name as entityAName, eb.display_name as entityBName
      FROM knowledge_merge_proposals p
      LEFT JOIN knowledge_entities ea ON p.entity_a_id = ea.id
      LEFT JOIN knowledge_entities eb ON p.entity_b_id = eb.id
    `;
    const params: any[] = [];

    if (filters?.status) {
      sql += ' WHERE p.status = ?';
      params.push(filters.status);
    }

    sql += ' ORDER BY p.created_at DESC LIMIT ?;';
    params.push(limit);

    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as unknown as EntityMergeProposal[];
  }

  public findExistingPending(entityAId: string, entityBId: string): EntityMergeProposal | null {
    const stmt = this.db.prepare(`
      SELECT 
        id, entity_a_id as entityAId, entity_b_id as entityBId,
        reason, confidence, evidence, status, created_at as createdAt
      FROM knowledge_merge_proposals
      WHERE status = 'PENDING'
        AND ((entity_a_id = ? AND entity_b_id = ?) OR (entity_a_id = ? AND entity_b_id = ?))
      LIMIT 1;
    `);

    const row = stmt.get(entityAId, entityBId, entityBId, entityAId) as unknown as EntityMergeProposal | undefined;
    return row || null;
  }

  public updateStatus(id: string, status: MergeProposalStatus, resolvedBy = 'operator'): boolean {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE knowledge_merge_proposals
      SET status = ?, resolved_at = ?, resolved_by = ?
      WHERE id = ?;
    `);
    const res = stmt.run(status, now, resolvedBy, id);
    return res.changes > 0;
  }
}
