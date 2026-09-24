/**
 * HṚṢĪKEŚA (हृषीकेश) — Knowledge Contradiction Repository
 *
 * Phase 19: Conflict Recording, Provenance Comparison & Resolution Tracking
 */

import { randomUUID } from 'node:crypto';
import { DatabaseManager } from '../../persistence/database/database.manager.js';
import {
  KnowledgeContradiction,
  ContradictionStatus,
  ResolutionStrategy,
} from '../interfaces/knowledge.types.js';

interface RawContradictionRow {
  id: string;
  fact_id_a: string;
  fact_id_b: string;
  subject_entity_id: string;
  predicate: string;
  description: string | null;
  status: string;
  resolution_strategy: string | null;
  resolved_fact_id: string | null;
  detected_at: string;
  resolved_at: string | null;
}

export class KnowledgeContradictionRepository {
  private readonly db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  public createContradiction(data: {
    id?: string;
    factIdA?: string;
    factIdB?: string;
    existingFactId?: string;
    conflictingFactId?: string;
    subjectEntityId: string;
    predicate: string;
    description?: string;
    explanation?: string;
    status?: ContradictionStatus;
    resolutionStrategy?: ResolutionStrategy;
    resolvedFactId?: string;
    detectedAt?: string;
  }): KnowledgeContradiction {
    const id = data.id || randomUUID();
    const now = data.detectedAt || new Date().toISOString();
    const status = data.status || 'DETECTED';
    const factIdA = data.factIdA || data.existingFactId || 'UNKNOWN_A';
    const factIdB = data.factIdB || data.conflictingFactId || 'UNKNOWN_B';
    const description = data.description || data.explanation || null;

    this.db.prepare(`
      INSERT INTO knowledge_contradictions (
        id, fact_id_a, fact_id_b, subject_entity_id, predicate, description,
        status, resolution_strategy, resolved_fact_id, detected_at, resolved_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      factIdA,
      factIdB,
      data.subjectEntityId,
      data.predicate.trim().toLowerCase(),
      description,
      status,
      data.resolutionStrategy || null,
      data.resolvedFactId || null,
      now,
      data.resolvedFactId ? now : null
    );

    return {
      id,
      factIdA,
      factIdB,
      subjectEntityId: data.subjectEntityId,
      predicate: data.predicate.trim().toLowerCase(),
      description: description || undefined,
      status,
      resolutionStrategy: data.resolutionStrategy,
      resolvedFactId: data.resolvedFactId,
      detectedAt: now,
      resolvedAt: data.resolvedFactId ? now : undefined,
    };
  }

  public getContradiction(id: string): KnowledgeContradiction | null {
    const row = this.db.prepare(
      'SELECT * FROM knowledge_contradictions WHERE id = ?'
    ).get(id) as unknown as RawContradictionRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  public findContradictions(filter?: {
    subjectEntityId?: string;
    predicate?: string;
    status?: ContradictionStatus;
    limit?: number;
  }): KnowledgeContradiction[] {
    let query = 'SELECT * FROM knowledge_contradictions WHERE 1=1';
    const params: unknown[] = [];

    if (filter?.subjectEntityId) {
      query += ' AND subject_entity_id = ?';
      params.push(filter.subjectEntityId);
    }
    if (filter?.predicate) {
      query += ' AND predicate = ?';
      params.push(filter.predicate.trim().toLowerCase());
    }
    if (filter?.status) {
      query += ' AND status = ?';
      params.push(filter.status);
    }

    query += ' ORDER BY detected_at DESC';
    query += ` LIMIT ${filter?.limit || 100}`;

    const rows = this.db.prepare(query).all(...(params as any[])) as unknown as RawContradictionRow[];
    return rows.map((r) => this.mapRow(r));
  }

  public resolveContradiction(
    id: string,
    resolutionStrategy: ResolutionStrategy,
    resolvedFactId?: string
  ): KnowledgeContradiction | null {
    const current = this.getContradiction(id);
    if (!current) return null;

    const now = new Date().toISOString();

    this.db.prepare(`
      UPDATE knowledge_contradictions
      SET status = 'RESOLVED', resolution_strategy = ?, resolved_fact_id = ?, resolved_at = ?
      WHERE id = ?
    `).run(resolutionStrategy, resolvedFactId || null, now, id);

    return this.getContradiction(id);
  }

  private mapRow(row: RawContradictionRow): KnowledgeContradiction {
    return {
      id: row.id,
      factIdA: row.fact_id_a,
      factIdB: row.fact_id_b,
      subjectEntityId: row.subject_entity_id,
      predicate: row.predicate,
      description: row.description || undefined,
      status: row.status as ContradictionStatus,
      resolutionStrategy: row.resolution_strategy as ResolutionStrategy | undefined,
      resolvedFactId: row.resolved_fact_id || undefined,
      detectedAt: row.detected_at,
      resolvedAt: row.resolved_at || undefined,
    };
  }
}
