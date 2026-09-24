/**
 * HṚṢĪKEŚA (हृषीकेश) — Knowledge Claim Repository
 *
 * Phase 19: Unconfirmed/Candidate Knowledge Lifecycle
 */

import { randomUUID } from 'node:crypto';
import { DatabaseManager } from '../../persistence/database/database.manager.js';
import {
  KnowledgeClaim,
  ClaimStatus,
  ProvenanceType,
} from '../interfaces/knowledge.types.js';

interface RawClaimRow {
  id: string;
  claim_text: string;
  extracted_entities: string | null;
  status: string;
  confidence: number;
  source_type: string;
  source_reference: string;
  created_at: string;
  updated_at: string;
}

export class KnowledgeClaimRepository {
  private readonly db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  public createClaim(data: {
    id?: string;
    claimText: string;
    extractedEntities?: string[];
    status?: ClaimStatus;
    confidence?: number;
    sourceType: ProvenanceType;
    sourceReference: string;
  }): KnowledgeClaim {
    const id = data.id || randomUUID();
    const now = new Date().toISOString();
    const status = data.status || 'CANDIDATE';
    const confidence = data.confidence !== undefined ? data.confidence : 0.5;
    const extractedJson = data.extractedEntities ? JSON.stringify(data.extractedEntities) : null;

    this.db.prepare(`
      INSERT INTO knowledge_claims (
        id, claim_text, extracted_entities, status, confidence,
        source_type, source_reference, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.claimText,
      extractedJson,
      status,
      confidence,
      data.sourceType,
      data.sourceReference,
      now,
      now
    );

    return {
      id,
      claimText: data.claimText,
      extractedEntities: data.extractedEntities || [],
      status,
      confidence,
      sourceType: data.sourceType,
      sourceReference: data.sourceReference,
      createdAt: now,
      updatedAt: now,
    };
  }

  public getClaim(id: string): KnowledgeClaim | null {
    const row = this.db.prepare(
      'SELECT * FROM knowledge_claims WHERE id = ?'
    ).get(id) as unknown as RawClaimRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  public findClaims(filter?: {
    status?: ClaimStatus;
    sourceType?: string;
    limit?: number;
  }): KnowledgeClaim[] {
    let query = 'SELECT * FROM knowledge_claims WHERE 1=1';
    const params: unknown[] = [];

    if (filter?.status) {
      query += ' AND status = ?';
      params.push(filter.status);
    }
    if (filter?.sourceType) {
      query += ' AND source_type = ?';
      params.push(filter.sourceType);
    }

    query += ' ORDER BY created_at DESC';
    query += ` LIMIT ${filter?.limit || 100}`;

    const rows = this.db.prepare(query).all(...(params as any[])) as unknown as RawClaimRow[];
    return rows.map((r) => this.mapRow(r));
  }

  public updateClaimStatus(id: string, status: ClaimStatus, confidence?: number): KnowledgeClaim | null {
    const current = this.getClaim(id);
    if (!current) return null;

    const now = new Date().toISOString();
    const conf = confidence !== undefined ? confidence : current.confidence;

    this.db.prepare(`
      UPDATE knowledge_claims
      SET status = ?, confidence = ?, updated_at = ?
      WHERE id = ?
    `).run(status, conf, now, id);

    return this.getClaim(id);
  }

  private mapRow(row: RawClaimRow): KnowledgeClaim {
    let entities: string[] = [];
    if (row.extracted_entities) {
      try {
        entities = JSON.parse(row.extracted_entities);
      } catch {
        entities = [];
      }
    }

    return {
      id: row.id,
      claimText: row.claim_text,
      extractedEntities: entities,
      status: row.status as ClaimStatus,
      confidence: row.confidence,
      sourceType: row.source_type as ProvenanceType,
      sourceReference: row.source_reference,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
