/**
 * HṚṢĪKEŚA (हृषीकेश) — Knowledge Entity Repository
 *
 * Phase 19: Persistent Entity Storage with Canonical Normalization & Aliases
 */

import { randomUUID } from 'node:crypto';
import { DatabaseManager } from '../../persistence/database/database.manager.js';
import {
  KnowledgeEntity,
  EntityAlias,
  EntityType,
  KnowledgeScope,
  EntityStatus,
} from '../interfaces/knowledge.types.js';

interface RawEntityRow {
  id: string;
  entity_type: string;
  canonical_name: string;
  display_name: string;
  description: string | null;
  scope: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export class KnowledgeEntityRepository {
  private readonly db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  public normalizeName(name: string): string {
    const decomposed = name
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^a-z0-9 _-]/g, '');

    return decomposed
      .replace(/hrishike/g, 'hrsike')
      .replace(/hrisike/g, 'hrsike')
      .replace(/hriseke/g, 'hrsike')
      .replace(/hris/g, 'hrs');
  }

  public createEntity(
    data: {
      id?: string;
      canonicalName: string;
      displayName: string;
      entityType?: EntityType;
      description?: string;
      scope?: KnowledgeScope;
      status?: EntityStatus;
      aliases?: string[];
      type?: EntityType;
    }
  ): KnowledgeEntity {
    const id = data.id || randomUUID();
    const now = new Date().toISOString();
    const canonical = this.normalizeName(data.canonicalName);
    const scope = data.scope || 'GLOBAL';
    const status = data.status || 'ACTIVE';
    const entityType = data.entityType || (data as any).type || 'CONCEPT';

    this.db.prepare(`
      INSERT INTO knowledge_entities (id, entity_type, canonical_name, display_name, description, scope, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      entityType,
      canonical,
      data.displayName || data.canonicalName,
      data.description || null,
      scope,
      status,
      now,
      now
    );

    const aliases = data.aliases || [];
    for (const alias of aliases) {
      this.addAlias(id, alias);
    }

    return {
      id,
      entityType,
      canonicalName: canonical,
      displayName: data.displayName,
      description: data.description,
      aliases,
      scope,
      status,
      createdAt: now,
      updatedAt: now,
    };
  }

  public getEntity(id: string): KnowledgeEntity | null {
    const row = this.db.prepare(
      'SELECT * FROM knowledge_entities WHERE id = ?'
    ).get(id) as unknown as RawEntityRow | undefined;

    if (!row) return null;
    const aliases = this.getAliases(id);
    return this.mapRow(row, aliases);
  }

  public findById(id: string): KnowledgeEntity | null {
    return this.getEntity(id);
  }

  public findByCanonicalName(
    canonicalName: string,
    entityTypeOrScope?: string,
    scopeParam?: string
  ): KnowledgeEntity | null {
    const normalized = this.normalizeName(canonicalName);
    let query = 'SELECT * FROM knowledge_entities WHERE canonical_name = ?';
    const params: unknown[] = [normalized];

    const isType = entityTypeOrScope && [
      'PERSON', 'ORGANIZATION', 'COMPANY', 'PROJECT', 'PRODUCT', 'SERVICE',
      'AGENT', 'MODEL', 'PROVIDER', 'SOFTWARE', 'LIBRARY', 'TECHNOLOGY',
      'DOCUMENT', 'WEBSITE', 'SOURCE', 'LOCATION', 'CONCEPT', 'EVENT',
      'TASK', 'GOAL', 'MISSION', 'DECISION', 'SKILL', 'TOOL', 'CUSTOMER', 'DEPARTMENT'
    ].includes(entityTypeOrScope.toUpperCase());

    const entityType = isType ? entityTypeOrScope.toUpperCase() : undefined;
    const scope = isType ? scopeParam : entityTypeOrScope;

    if (entityType) {
      query += ' AND entity_type = ?';
      params.push(entityType);
    }
    if (scope && scope !== 'GLOBAL') {
      query += ' AND scope = ?';
      params.push(scope);
    }

    query += ' LIMIT 1';

    const row = this.db.prepare(query).get(...(params as any[])) as unknown as RawEntityRow | undefined;
    if (!row) return null;
    return this.mapRow(row, this.getAliases(row.id));
  }

  public findByAlias(aliasText: string, scope?: string): KnowledgeEntity | null {
    const normalized = this.normalizeName(aliasText);
    let query = `
      SELECT e.* FROM knowledge_entities e
      JOIN knowledge_entity_aliases a ON e.id = a.entity_id
      WHERE a.normalized_alias = ?
    `;
    const params: unknown[] = [normalized];

    if (scope && scope !== 'GLOBAL') {
      query += " AND (e.scope = ? OR e.scope = 'GLOBAL')";
      params.push(scope);
    }

    query += ' LIMIT 1';

    const row = this.db.prepare(query).get(...(params as any[])) as unknown as RawEntityRow | undefined;
    if (!row) return null;
    return this.mapRow(row, this.getAliases(row.id));
  }

  public addAlias(entityId: string, alias: string): EntityAlias {
    const id = randomUUID();
    const now = new Date().toISOString();
    const normalized = this.normalizeName(alias);

    this.db.prepare(`
      INSERT INTO knowledge_entity_aliases (id, entity_id, alias, normalized_alias, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, entityId, alias.trim(), normalized, now);

    return {
      id,
      entityId,
      alias: alias.trim(),
      normalizedAlias: normalized,
      createdAt: now,
    };
  }

  public getAliases(entityId: string): string[] {
    const rows = this.db.prepare(
      'SELECT alias FROM knowledge_entity_aliases WHERE entity_id = ? ORDER BY created_at ASC'
    ).all(entityId) as unknown as { alias: string }[];
    return rows.map((r) => r.alias);
  }

  public updateEntity(id: string, updates: Partial<KnowledgeEntity>): KnowledgeEntity | null {
    const current = this.getEntity(id);
    if (!current) return null;

    const now = new Date().toISOString();
    const entityType = updates.entityType || current.entityType;
    const canonicalName = updates.canonicalName ? this.normalizeName(updates.canonicalName) : current.canonicalName;
    const displayName = updates.displayName || current.displayName;
    const description = updates.description !== undefined ? updates.description : current.description;
    const scope = updates.scope || current.scope;
    const status = updates.status || current.status;

    this.db.prepare(`
      UPDATE knowledge_entities
      SET entity_type = ?, canonical_name = ?, display_name = ?, description = ?, scope = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).run(entityType, canonicalName, displayName, description || null, scope, status, now, id);

    return this.getEntity(id);
  }

  public deleteEntity(id: string): boolean {
    const res = this.db.prepare('DELETE FROM knowledge_entities WHERE id = ?').run(id);
    return (res.changes ?? 0) > 0;
  }

  public listEntities(filter?: {
    entityType?: string;
    scope?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): KnowledgeEntity[] {
    let query = 'SELECT * FROM knowledge_entities WHERE 1=1';
    const params: unknown[] = [];

    if (filter?.entityType) {
      query += ' AND entity_type = ?';
      params.push(filter.entityType);
    }
    if (filter?.scope) {
      query += " AND (scope = ? OR scope = 'GLOBAL')";
      params.push(filter.scope);
    }
    if (filter?.status) {
      query += ' AND status = ?';
      params.push(filter.status);
    }
    if (filter?.search) {
      query += ' AND (canonical_name LIKE ? OR display_name LIKE ? OR description LIKE ?)';
      const s = `%${filter.search}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY updated_at DESC';
    query += ` LIMIT ${filter?.limit || 100} OFFSET ${filter?.offset || 0}`;

    const rows = this.db.prepare(query).all(...(params as any[])) as unknown as RawEntityRow[];
    return rows.map((r) => this.mapRow(r, this.getAliases(r.id)));
  }

  private mapRow(row: RawEntityRow, aliases: string[]): KnowledgeEntity {
    return {
      id: row.id,
      entityType: row.entity_type,
      canonicalName: row.canonical_name,
      displayName: row.display_name,
      description: row.description || undefined,
      aliases,
      scope: row.scope,
      status: row.status as EntityStatus,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
