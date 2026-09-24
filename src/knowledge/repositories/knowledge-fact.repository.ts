/**
 * HṚṢĪKEŚA (हृषीकेश) — Knowledge Fact Repository
 *
 * Phase 19: Structured Facts, Temporal Versioning, Current vs Historical State
 */

import { randomUUID } from 'node:crypto';
import { DatabaseManager } from '../../persistence/database/database.manager.js';
import {
  KnowledgeFact,
  FactVersion,
  FactStatus,
  FactValueType,
  KnowledgeScope,
} from '../interfaces/knowledge.types.js';

interface RawFactRow {
  id: string;
  subject_entity_id: string;
  predicate: string;
  object_entity_id: string | null;
  object_value: string;
  value_type: string;
  confidence: number;
  status: string;
  scope: string;
  valid_from: string | null;
  valid_until: string | null;
  observed_at: string;
  version: number;
  created_at: string;
  updated_at: string;
}

interface RawVersionRow {
  id: string;
  fact_id: string;
  version: number;
  predicate: string;
  object_value: string;
  status: string;
  valid_from: string | null;
  valid_until: string | null;
  replaced_by_fact_id: string | null;
  recorded_at: string;
}

export class KnowledgeFactRepository {
  private readonly db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  public createFact(data: {
    id?: string;
    subjectEntityId: string;
    predicate: string;
    objectEntityId?: string;
    objectValue: string;
    valueType?: FactValueType;
    confidence?: number;
    status?: FactStatus;
    scope?: KnowledgeScope;
    validFrom?: string;
    validUntil?: string;
    observedAt?: string;
    version?: number;
    supersedePrevious?: boolean;
  }): KnowledgeFact {
    const id = data.id || randomUUID();
    const now = new Date().toISOString();
    const observedAt = data.observedAt || now;
    const valueType = data.valueType || 'STRING';
    const confidence = data.confidence !== undefined ? data.confidence : 1.0;
    const status = data.status || 'ACTIVE';
    const scope = data.scope || 'GLOBAL';

    let version = data.version || 1;
    if (data.supersedePrevious) {
      const activeFacts = this.findFacts({
        subjectEntityId: data.subjectEntityId,
        predicate: data.predicate,
        activeOnly: true,
      });
      for (const oldFact of activeFacts) {
        version = Math.max(version, (oldFact.version || 1) + 1);
        this.updateFactStatus(oldFact.id, 'SUPERSEDED', now);
        this.recordVersion({
          factId: oldFact.id,
          version: oldFact.version || 1,
          predicate: oldFact.predicate,
          objectValue: oldFact.objectValue,
          status: 'SUPERSEDED',
          validFrom: oldFact.validFrom,
          validUntil: now,
          replacedByFactId: id,
        });
      }
    }

    this.db.prepare(`
      INSERT INTO knowledge_facts (
        id, subject_entity_id, predicate, object_entity_id, object_value,
        value_type, confidence, status, scope, valid_from, valid_until,
        observed_at, version, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.subjectEntityId,
      data.predicate.trim().toLowerCase(),
      data.objectEntityId || null,
      data.objectValue,
      valueType,
      confidence,
      status,
      scope,
      data.validFrom || null,
      data.validUntil || null,
      observedAt,
      version,
      now,
      now
    );

    // Initial version entry
    this.recordVersion({
      factId: id,
      version,
      predicate: data.predicate.trim().toLowerCase(),
      objectValue: data.objectValue,
      status,
      validFrom: data.validFrom,
      validUntil: data.validUntil,
    });

    return {
      id,
      subjectEntityId: data.subjectEntityId,
      predicate: data.predicate.trim().toLowerCase(),
      objectEntityId: data.objectEntityId,
      objectValue: data.objectValue,
      valueType,
      confidence,
      status,
      scope,
      validFrom: data.validFrom,
      validUntil: data.validUntil,
      observedAt,
      version,
      createdAt: now,
      updatedAt: now,
    };
  }

  public getFact(id: string): KnowledgeFact | null {
    const row = this.db.prepare(
      'SELECT * FROM knowledge_facts WHERE id = ?'
    ).get(id) as unknown as RawFactRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  public findById(id: string): KnowledgeFact | null {
    return this.getFact(id);
  }

  public findFacts(filter?: {
    subjectEntityId?: string;
    predicate?: string;
    status?: FactStatus;
    scope?: string;
    activeOnly?: boolean;
    limit?: number;
  }): KnowledgeFact[] {
    let query = 'SELECT * FROM knowledge_facts WHERE 1=1';
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
    } else if (filter?.activeOnly) {
      query += " AND status NOT IN ('SUPERSEDED', 'EXPIRED', 'REJECTED', 'CONTRADICTED')";
    }
    if (filter?.scope) {
      query += ' AND scope = ?';
      params.push(filter.scope);
    }

    query += ' ORDER BY observed_at DESC';
    query += ` LIMIT ${filter?.limit || 200}`;

    const rows = this.db.prepare(query).all(...(params as any[])) as unknown as RawFactRow[];
    return rows.map((r) => this.mapRow(r));
  }

  public listFacts(filter?: Parameters<KnowledgeFactRepository['findFacts']>[0]): KnowledgeFact[] {
    return this.findFacts(filter);
  }

  public findCurrentFactsForEntity(subjectEntityId: string, scope?: string): KnowledgeFact[] {
    return this.findFacts({ subjectEntityId, activeOnly: true, scope });
  }

  public findCurrentFacts(subjectEntityId: string, scope?: string): KnowledgeFact[] {
    return this.findCurrentFactsForEntity(subjectEntityId, scope);
  }

  public findHistoricalFactsForEntity(subjectEntityId: string, scope?: string): KnowledgeFact[] {
    let query = "SELECT * FROM knowledge_facts WHERE subject_entity_id = ? AND status IN ('SUPERSEDED', 'EXPIRED', 'REJECTED', 'CONTRADICTED')";
    const params: unknown[] = [subjectEntityId];

    if (scope && scope !== 'GLOBAL') {
      query += ' AND scope = ?';
      params.push(scope);
    }

    query += ' ORDER BY observed_at DESC';
    const rows = this.db.prepare(query).all(...(params as any[])) as unknown as RawFactRow[];
    return rows.map((r) => this.mapRow(r));
  }

  public findHistoricalFacts(subjectEntityId: string, scope?: string): KnowledgeFact[] {
    return this.findHistoricalFactsForEntity(subjectEntityId, scope);
  }

  public supersedeFact(
    oldFactId: string,
    newFactData: {
      subjectEntityId: string;
      predicate: string;
      objectEntityId?: string;
      objectValue: string;
      valueType?: FactValueType;
      confidence?: number;
      scope?: KnowledgeScope;
      observedAt?: string;
    }
  ): KnowledgeFact & { oldFact: KnowledgeFact; newFact: KnowledgeFact } {
    const oldFact = this.getFact(oldFactId);
    if (!oldFact) {
      throw new Error(`Cannot supersede non-existent fact with ID: ${oldFactId}`);
    }

    const now = new Date().toISOString();

    // 1. Create the new active fact with incremented version
    const newFact = this.createFact({
      ...newFactData,
      version: (oldFact.version || 1) + 1,
      status: 'CONFIRMED',
      validFrom: now,
    });

    // 2. Mark old fact as SUPERSEDED with validUntil = now
    this.db.prepare(`
      UPDATE knowledge_facts
      SET status = 'SUPERSEDED', valid_until = ?, updated_at = ?
      WHERE id = ?
    `).run(now, now, oldFactId);

    // 3. Record updated version for old fact
    const currentVersions = this.getFactVersions(oldFactId);
    this.recordVersion({
      factId: oldFactId,
      version: currentVersions.length + 1,
      predicate: oldFact.predicate,
      objectValue: oldFact.objectValue,
      status: 'SUPERSEDED',
      validFrom: oldFact.validFrom,
      validUntil: now,
      replacedByFactId: newFact.id,
    });

    const updatedOldFact = this.getFact(oldFactId)!;
    const res = Object.assign({ ...newFact }, { oldFact: updatedOldFact, newFact });
    return res as any;
  }

  public updateFactStatus(id: string, status: FactStatus, validUntil?: string): KnowledgeFact | null {
    const current = this.getFact(id);
    if (!current) return null;

    const now = new Date().toISOString();
    const until = validUntil || (status === 'SUPERSEDED' || status === 'EXPIRED' ? now : null);

    this.db.prepare(`
      UPDATE knowledge_facts
      SET status = ?, valid_until = ?, updated_at = ?
      WHERE id = ?
    `).run(status, until, now, id);

    return this.getFact(id);
  }

  public recordVersion(versionData: {
    factId: string;
    version: number;
    predicate: string;
    objectValue: string;
    status: FactStatus;
    validFrom?: string;
    validUntil?: string;
    replacedByFactId?: string;
  }): FactVersion {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO knowledge_fact_versions (
        id, fact_id, version, predicate, object_value, status, valid_from, valid_until, replaced_by_fact_id, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      versionData.factId,
      versionData.version,
      versionData.predicate,
      versionData.objectValue,
      versionData.status,
      versionData.validFrom || null,
      versionData.validUntil || null,
      versionData.replacedByFactId || null,
      now
    );

    return {
      id,
      factId: versionData.factId,
      version: versionData.version,
      predicate: versionData.predicate,
      objectValue: versionData.objectValue,
      status: versionData.status,
      validFrom: versionData.validFrom,
      validUntil: versionData.validUntil,
      replacedByFactId: versionData.replacedByFactId,
      createdAt: now,
    };
  }

  public getFactVersions(factId: string): FactVersion[] {
    const rows = this.db.prepare(
      'SELECT * FROM knowledge_fact_versions WHERE fact_id = ? ORDER BY version ASC'
    ).all(factId) as unknown as RawVersionRow[];

    return rows.map((r) => ({
      id: r.id,
      factId: r.fact_id,
      version: r.version,
      predicate: r.predicate,
      objectValue: r.object_value,
      status: r.status as FactStatus,
      validFrom: r.valid_from || undefined,
      validUntil: r.valid_until || undefined,
      replacedByFactId: r.replaced_by_fact_id || undefined,
      createdAt: (r as any).recorded_at || (r as any).created_at || new Date().toISOString(),
    }));
  }

  private mapRow(row: RawFactRow): KnowledgeFact {
    return {
      id: row.id,
      subjectEntityId: row.subject_entity_id,
      predicate: row.predicate,
      objectEntityId: row.object_entity_id || undefined,
      objectValue: row.object_value,
      valueType: row.value_type as FactValueType,
      confidence: row.confidence,
      status: row.status as FactStatus,
      scope: row.scope,
      validFrom: row.valid_from || undefined,
      validUntil: row.valid_until || undefined,
      observedAt: row.observed_at,
      version: row.version ?? 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
