/**
 * HṚṢĪKEŚA (हृषीकेश) — Research Evidence Repository
 *
 * Durable SQLite persistence for Evidence items and claims.
 */

import { DatabaseManager } from '../database/database.manager.js';
import {
  IResearchEvidence,
  ClaimType
} from '../../research/interfaces/research.types.js';

interface RawEvidenceRow {
  id: string;
  research_id: string;
  source_id: string;
  claim_text: string;
  quote_text: string | null;
  claim_type: string;
  confidence: number;
  location: string | null;
  metadata: string | null;
  created_at: string;
}

export class ResearchEvidenceRepository {
  private readonly db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  public create(evidence: IResearchEvidence): IResearchEvidence {
    const stmt = this.db.prepare(`
      INSERT INTO research_evidence (
        id, research_id, source_id, claim_text, quote_text,
        claim_type, confidence, location, metadata, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      evidence.id,
      evidence.researchId,
      evidence.sourceId,
      evidence.claimText || evidence.claim || '',
      evidence.quoteText || evidence.supportingText || null,
      evidence.claimType || 'CLAIM',
      evidence.confidence || 0.8,
      evidence.location || null,
      evidence.metadata ? JSON.stringify(evidence.metadata) : null,
      evidence.createdAt
    );

    return evidence;
  }

  public get(id: string): IResearchEvidence | undefined {
    const row = this.db.prepare('SELECT * FROM research_evidence WHERE id = ?').get(id) as unknown as RawEvidenceRow | undefined;
    if (!row) return undefined;
    return this.rowToEvidence(row);
  }

  public findById(id: string): IResearchEvidence | undefined {
    return this.get(id);
  }

  public listByStudy(researchId: string): IResearchEvidence[] {
    const rows = (this.db.prepare(
      'SELECT * FROM research_evidence WHERE research_id = ? ORDER BY created_at ASC'
    ).all as (...args: unknown[]) => unknown[])(researchId) as unknown as RawEvidenceRow[];
    return rows.map((r) => this.rowToEvidence(r));
  }

  public findByStudyId(researchId: string): IResearchEvidence[] {
    return this.listByStudy(researchId);
  }

  public listBySource(sourceId: string): IResearchEvidence[] {
    const rows = (this.db.prepare(
      'SELECT * FROM research_evidence WHERE source_id = ? ORDER BY created_at ASC'
    ).all as (...args: unknown[]) => unknown[])(sourceId) as unknown as RawEvidenceRow[];
    return rows.map((r) => this.rowToEvidence(r));
  }

  public deleteByStudy(researchId: string): void {
    this.db.prepare('DELETE FROM research_evidence WHERE research_id = ?').run(researchId);
  }

  private rowToEvidence(row: RawEvidenceRow): IResearchEvidence {
    return {
      id: row.id,
      researchId: row.research_id,
      sourceId: row.source_id,
      claimText: row.claim_text,
      claim: row.claim_text,
      quoteText: row.quote_text ?? undefined,
      supportingText: row.quote_text ?? undefined,
      claimType: row.claim_type as ClaimType,
      confidence: row.confidence,
      location: row.location ?? undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at,
    };
  }
}
