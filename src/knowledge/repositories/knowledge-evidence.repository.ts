/**
 * HṚṢĪKEŚA (हृषीकेश) — Knowledge Evidence Repository
 *
 * Phase 19: Provenance, Source Citations, and Credibility Anchoring
 */

import { randomUUID } from 'node:crypto';
import { DatabaseManager } from '../../persistence/database/database.manager.js';
import {
  KnowledgeEvidence,
  ProvenanceType,
  SourceCredibility,
} from '../interfaces/knowledge.types.js';

interface RawEvidenceRow {
  id: string;
  fact_id: string;
  source_type: string;
  source_reference: string;
  quote: string | null;
  location: string | null;
  source_date: string | null;
  retrieved_at: string;
  credibility: string;
  confidence: number;
  provenance: string;
}

export class KnowledgeEvidenceRepository {
  private readonly db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  public createEvidence(data: {
    id?: string;
    factId: string;
    sourceType: ProvenanceType;
    sourceReference: string;
    quote?: string;
    location?: string;
    sourceDate?: string;
    retrievedAt?: string;
    credibility?: SourceCredibility;
    confidence?: number;
    provenance?: string;
  }): KnowledgeEvidence {
    const id = data.id || randomUUID();
    const now = new Date().toISOString();
    const retrievedAt = data.retrievedAt || now;
    const credibility = data.credibility || 'PRIMARY';
    const confidence = data.confidence !== undefined ? data.confidence : 1.0;
    const provenance = data.provenance || data.sourceType;

    this.db.prepare(`
      INSERT INTO knowledge_evidence (
        id, fact_id, source_type, source_reference, quote, location,
        source_date, retrieved_at, credibility, confidence, provenance
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.factId,
      data.sourceType,
      data.sourceReference,
      data.quote || null,
      data.location || null,
      data.sourceDate || null,
      retrievedAt,
      credibility,
      confidence,
      provenance
    );

    return {
      id,
      factId: data.factId,
      sourceType: data.sourceType,
      sourceReference: data.sourceReference,
      quote: data.quote,
      location: data.location,
      sourceDate: data.sourceDate,
      retrievedAt,
      credibility,
      confidence,
      provenance,
    };
  }

  public getEvidence(id: string): KnowledgeEvidence | null {
    const row = this.db.prepare(
      'SELECT * FROM knowledge_evidence WHERE id = ?'
    ).get(id) as unknown as RawEvidenceRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  public findEvidenceForFact(factId: string): KnowledgeEvidence[] {
    const rows = this.db.prepare(
      'SELECT * FROM knowledge_evidence WHERE fact_id = ? ORDER BY retrieved_at DESC'
    ).all(factId) as unknown as RawEvidenceRow[];

    return rows.map((r) => this.mapRow(r));
  }

  public findByFactId(factId: string): KnowledgeEvidence[] {
    return this.findEvidenceForFact(factId);
  }

  public deleteEvidence(id: string): boolean {
    const res = this.db.prepare('DELETE FROM knowledge_evidence WHERE id = ?').run(id);
    return (res.changes ?? 0) > 0;
  }

  private mapRow(row: RawEvidenceRow): KnowledgeEvidence {
    return {
      id: row.id,
      factId: row.fact_id,
      sourceType: row.source_type as ProvenanceType,
      sourceReference: row.source_reference,
      quote: row.quote || undefined,
      location: row.location || undefined,
      sourceDate: row.source_date || undefined,
      retrievedAt: row.retrieved_at,
      credibility: row.credibility as SourceCredibility,
      confidence: row.confidence,
      provenance: row.provenance,
    };
  }
}
