/**
 * HṚṢĪKEŚA (हृषीकेश) — Knowledge Relationship Repository
 *
 * Phase 19: Directed, Typed Graph Relationships with Temporal Bounds & Confidence
 */

import { randomUUID } from 'node:crypto';
import { DatabaseManager } from '../../persistence/database/database.manager.js';
import {
  KnowledgeRelationship,
  RelationshipType,
  RelationshipDirection,
  KnowledgeScope,
} from '../interfaces/knowledge.types.js';

interface RawRelRow {
  id: string;
  source_entity_id: string;
  relationship_type: string;
  target_entity_id: string;
  direction: string;
  confidence: number;
  status: string;
  scope: string;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
}

export class KnowledgeRelationshipRepository {
  private readonly db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  public createRelationship(data: {
    id?: string;
    sourceEntityId: string;
    relationshipType: RelationshipType;
    targetEntityId: string;
    direction?: RelationshipDirection;
    confidence?: number;
    status?: 'ACTIVE' | 'SUPERSEDED' | 'DEPRECATED';
    scope?: KnowledgeScope;
    validFrom?: string;
    validUntil?: string;
  }): KnowledgeRelationship {
    const id = data.id || randomUUID();
    const now = new Date().toISOString();
    const direction = data.direction || 'OUTGOING';
    const confidence = data.confidence !== undefined ? data.confidence : 1.0;
    const status = data.status || 'ACTIVE';
    const scope = data.scope || 'GLOBAL';

    this.db.prepare(`
      INSERT INTO knowledge_relationships (
        id, source_entity_id, relationship_type, target_entity_id, direction,
        confidence, status, scope, valid_from, valid_until, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.sourceEntityId,
      data.relationshipType,
      data.targetEntityId,
      direction,
      confidence,
      status,
      scope,
      data.validFrom || null,
      data.validUntil || null,
      now,
      now
    );

    return {
      id,
      sourceEntityId: data.sourceEntityId,
      relationshipType: data.relationshipType,
      targetEntityId: data.targetEntityId,
      direction,
      confidence,
      status,
      scope,
      validFrom: data.validFrom,
      validUntil: data.validUntil,
      createdAt: now,
      updatedAt: now,
    };
  }

  public getRelationship(id: string): KnowledgeRelationship | null {
    const row = this.db.prepare(
      'SELECT * FROM knowledge_relationships WHERE id = ?'
    ).get(id) as unknown as RawRelRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  public findRelationships(filter?: {
    sourceEntityId?: string;
    targetEntityId?: string;
    entityId?: string; // matches either source or target
    relationshipType?: string;
    status?: string;
    scope?: string;
    activeOnly?: boolean;
    limit?: number;
  }): KnowledgeRelationship[] {
    let query = 'SELECT * FROM knowledge_relationships WHERE 1=1';
    const params: unknown[] = [];

    if (filter?.entityId) {
      query += ' AND (source_entity_id = ? OR target_entity_id = ?)';
      params.push(filter.entityId, filter.entityId);
    } else {
      if (filter?.sourceEntityId) {
        query += ' AND source_entity_id = ?';
        params.push(filter.sourceEntityId);
      }
      if (filter?.targetEntityId) {
        query += ' AND target_entity_id = ?';
        params.push(filter.targetEntityId);
      }
    }

    if (filter?.relationshipType) {
      query += ' AND relationship_type = ?';
      params.push(filter.relationshipType);
    }
    if (filter?.status) {
      query += ' AND status = ?';
      params.push(filter.status);
    }
    if (filter?.activeOnly) {
      query += " AND status NOT IN ('SUPERSEDED', 'EXPIRED', 'REJECTED', 'CONTRADICTED')";
    }
    if (filter?.scope) {
      query += " AND (scope = ? OR scope = 'GLOBAL')";
      params.push(filter.scope);
    }

    query += ' ORDER BY created_at DESC';
    query += ` LIMIT ${filter?.limit || 200}`;

    const rows = this.db.prepare(query).all(...(params as any[])) as unknown as RawRelRow[];
    return rows.map((r) => this.mapRow(r));
  }

  public listRelationships(filter?: Parameters<KnowledgeRelationshipRepository['findRelationships']>[0]): KnowledgeRelationship[] {
    return this.findRelationships(filter);
  }

  public findOutgoing(sourceEntityId: string, allowedTypes?: string[], activeOnly = true): KnowledgeRelationship[] {
    let query = 'SELECT * FROM knowledge_relationships WHERE source_entity_id = ?';
    const params: unknown[] = [sourceEntityId];

    if (activeOnly) {
      query += " AND status = 'ACTIVE'";
    }
    if (allowedTypes && allowedTypes.length > 0) {
      query += ` AND relationship_type IN (${allowedTypes.map(() => '?').join(',')})`;
      params.push(...allowedTypes);
    }

    const rows = this.db.prepare(query).all(...(params as any[])) as unknown as RawRelRow[];
    return rows.map((r) => this.mapRow(r));
  }

  public findIncoming(targetEntityId: string, allowedTypes?: string[], activeOnly = true): KnowledgeRelationship[] {
    let query = 'SELECT * FROM knowledge_relationships WHERE target_entity_id = ?';
    const params: unknown[] = [targetEntityId];

    if (activeOnly) {
      query += ' AND status = "ACTIVE"';
    }
    if (allowedTypes && allowedTypes.length > 0) {
      query += ` AND relationship_type IN (${allowedTypes.map(() => '?').join(',')})`;
      params.push(...allowedTypes);
    }

    const rows = this.db.prepare(query).all(...(params as any[])) as unknown as RawRelRow[];
    return rows.map((r) => this.mapRow(r));
  }

  public updateRelationship(
    id: string,
    updates: Partial<KnowledgeRelationship>
  ): KnowledgeRelationship | null {
    const current = this.getRelationship(id);
    if (!current) return null;

    const now = new Date().toISOString();
    const status = updates.status || current.status;
    const confidence = updates.confidence !== undefined ? updates.confidence : current.confidence;
    const validUntil = updates.validUntil !== undefined ? updates.validUntil : current.validUntil;

    this.db.prepare(`
      UPDATE knowledge_relationships
      SET status = ?, confidence = ?, valid_until = ?, updated_at = ?
      WHERE id = ?
    `).run(status, confidence, validUntil || null, now, id);

    return this.getRelationship(id);
  }

  public deleteRelationship(id: string): boolean {
    const res = this.db.prepare('DELETE FROM knowledge_relationships WHERE id = ?').run(id);
    return (res.changes ?? 0) > 0;
  }

  private mapRow(row: RawRelRow): KnowledgeRelationship {
    return {
      id: row.id,
      sourceEntityId: row.source_entity_id,
      relationshipType: row.relationship_type,
      targetEntityId: row.target_entity_id,
      direction: row.direction as RelationshipDirection,
      confidence: row.confidence,
      status: row.status as 'ACTIVE' | 'SUPERSEDED' | 'DEPRECATED',
      scope: row.scope,
      validFrom: row.valid_from || undefined,
      validUntil: row.valid_until || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
