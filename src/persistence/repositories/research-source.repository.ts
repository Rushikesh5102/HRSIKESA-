/**
 * HṚṢĪKEŚA (हृषीकेश) — Research Source Repository
 *
 * Durable SQLite persistence for Research Sources with deduplication & provenance.
 */

import { DatabaseManager } from '../database/database.manager.js';
import {
  IResearchSource,
  SourceType,
  SourceFreshness,
  SourceCredibilityTier
} from '../../research/interfaces/research.types.js';

interface RawSourceRow {
  id: string;
  research_id: string;
  url: string;
  canonical_url: string | null;
  title: string;
  publisher: string | null;
  author: string | null;
  source_type: string;
  domain: string;
  published_at: string | null;
  retrieved_at: string;
  freshness: string;
  content_hash: string;
  clean_text: string | null;
  credibility_tier: string;
  credibility_reason: string | null;
  is_duplicate: number;
  duplicate_of_id: string | null;
  status: string;
  metadata: string | null;
  created_at: string;
}

export class ResearchSourceRepository {
  private readonly db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  public create(source: IResearchSource): IResearchSource {
    const stmt = this.db.prepare(`
      INSERT INTO research_sources (
        id, research_id, url, canonical_url, title, publisher, author,
        source_type, domain, published_at, retrieved_at, freshness,
        content_hash, clean_text, credibility_tier, credibility_reason,
        is_duplicate, duplicate_of_id, status, metadata, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      source.id,
      source.researchId,
      source.url,
      source.canonicalUrl || null,
      source.title,
      source.publisher || null,
      source.author || null,
      source.sourceType,
      source.domain,
      source.publishedAt || null,
      source.retrievedAt,
      source.freshness,
      source.contentHash,
      source.cleanText || source.extractedText || null,
      source.credibilityTier,
      source.credibilityReason || null,
      source.isDuplicate ? 1 : 0,
      source.duplicateOfId || null,
      source.status,
      source.metadata ? JSON.stringify(source.metadata) : null,
      source.createdAt
    );

    return source;
  }

  public get(id: string): IResearchSource | undefined {
    const row = this.db.prepare('SELECT * FROM research_sources WHERE id = ?').get(id) as unknown as RawSourceRow | undefined;
    if (!row) return undefined;
    return this.rowToSource(row);
  }

  public findById(id: string): IResearchSource | undefined {
    return this.get(id);
  }

  public findByUrl(researchId: string, url: string): IResearchSource | undefined {
    const row = this.db.prepare(
      'SELECT * FROM research_sources WHERE research_id = ? AND (url = ? OR canonical_url = ?)'
    ).get(researchId, url, url) as unknown as RawSourceRow | undefined;
    if (!row) return undefined;
    return this.rowToSource(row);
  }

  public findByContentHash(contentHashOrResearchId: string, maybeHash?: string): IResearchSource[] {
    if (maybeHash !== undefined) {
      const row = this.db.prepare(
        'SELECT * FROM research_sources WHERE research_id = ? AND content_hash = ?'
      ).get(contentHashOrResearchId, maybeHash) as unknown as RawSourceRow | undefined;
      return row ? [this.rowToSource(row)] : [];
    }
    const rows = (this.db.prepare(
      'SELECT * FROM research_sources WHERE content_hash = ?'
    ).all as (...args: unknown[]) => unknown[])(contentHashOrResearchId) as unknown as RawSourceRow[];
    return rows.map((r) => this.rowToSource(r));
  }

  public listByStudy(researchId: string, options: { includeDuplicates?: boolean } = {}): IResearchSource[] {
    let sql = 'SELECT * FROM research_sources WHERE research_id = ?';
    if (!options.includeDuplicates) {
      sql += ' AND is_duplicate = 0';
    }
    sql += ' ORDER BY created_at ASC';

    const rows = (this.db.prepare(sql).all as (...args: unknown[]) => unknown[])(researchId) as unknown as RawSourceRow[];
    return rows.map((r) => this.rowToSource(r));
  }

  public findByStudyId(researchId: string): IResearchSource[] {
    return this.listByStudy(researchId, { includeDuplicates: true });
  }

  public update(id: string, updates: Partial<IResearchSource>): IResearchSource | undefined {
    const current = this.get(id);
    if (!current) return undefined;

    const fields: string[] = [];
    const params: unknown[] = [];

    if (updates.status !== undefined) { fields.push('status = ?'); params.push(updates.status); }
    if (updates.cleanText !== undefined) { fields.push('clean_text = ?'); params.push(updates.cleanText); }
    if (updates.extractedText !== undefined) { fields.push('clean_text = ?'); params.push(updates.extractedText); }
    if (updates.isDuplicate !== undefined) { fields.push('is_duplicate = ?'); params.push(updates.isDuplicate ? 1 : 0); }
    if (updates.duplicateOfId !== undefined) { fields.push('duplicate_of_id = ?'); params.push(updates.duplicateOfId); }
    if (updates.freshness !== undefined) { fields.push('freshness = ?'); params.push(updates.freshness); }
    if (updates.credibilityTier !== undefined) { fields.push('credibility_tier = ?'); params.push(updates.credibilityTier); }
    if (updates.credibilityReason !== undefined) { fields.push('credibility_reason = ?'); params.push(updates.credibilityReason); }

    if (fields.length === 0) return current;

    params.push(id);
    const stmt = this.db.prepare(`UPDATE research_sources SET ${fields.join(', ')} WHERE id = ?`);
    (stmt.run as (...args: unknown[]) => unknown)(...params);

    return this.get(id);
  }

  public deleteByStudy(researchId: string): void {
    this.db.prepare('DELETE FROM research_sources WHERE research_id = ?').run(researchId);
  }

  private rowToSource(row: RawSourceRow): IResearchSource {
    return {
      id: row.id,
      researchId: row.research_id,
      url: row.url,
      canonicalUrl: row.canonical_url ?? undefined,
      title: row.title,
      publisher: row.publisher ?? undefined,
      author: row.author ?? undefined,
      sourceType: row.source_type as SourceType,
      domain: row.domain,
      publishedAt: row.published_at ?? undefined,
      retrievedAt: row.retrieved_at,
      freshness: row.freshness as SourceFreshness,
      contentHash: row.content_hash,
      cleanText: row.clean_text ?? undefined,
      extractedText: row.clean_text ?? undefined,
      credibilityTier: row.credibility_tier as SourceCredibilityTier,
      credibilityReason: row.credibility_reason ?? undefined,
      isDuplicate: row.is_duplicate === 1,
      duplicateOfId: row.duplicate_of_id ?? undefined,
      status: row.status as any,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at,
    };
  }
}
