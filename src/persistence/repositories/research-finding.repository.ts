/**
 * HṚṢĪKEŚA (हृषीकेश) — Research Finding Repository
 *
 * Durable SQLite persistence for Synthesized Findings with citation and contradiction mappings.
 */

import { DatabaseManager } from '../database/database.manager.js';
import {
  IResearchFinding,
  FindingType,
  FindingStatus,
  ResearchCitation
} from '../../research/interfaces/research.types.js';

interface RawFindingRow {
  id: string;
  research_id: string;
  title: string;
  statement: string;
  finding_type: string;
  status: string;
  corroborating_source_ids: string | null;
  conflicting_source_ids: string | null;
  citations: string | null;
  metadata: string | null;
  created_at: string;
}

export class ResearchFindingRepository {
  private readonly db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  public create(finding: IResearchFinding): IResearchFinding {
    const stmt = this.db.prepare(`
      INSERT INTO research_findings (
        id, research_id, title, statement, finding_type, status,
        corroborating_source_ids, conflicting_source_ids, citations,
        metadata, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      finding.id,
      finding.researchId,
      finding.title,
      finding.statement || finding.description || '',
      finding.findingType || 'OBSERVATION',
      finding.status || 'CORROBORATED',
      finding.corroboratingSourceIds || finding.sourceIds ? JSON.stringify(finding.corroboratingSourceIds || finding.sourceIds) : null,
      finding.conflictingSourceIds ? JSON.stringify(finding.conflictingSourceIds) : null,
      finding.citations ? JSON.stringify(finding.citations) : null,
      finding.metadata ? JSON.stringify(finding.metadata) : null,
      finding.createdAt
    );

    return finding;
  }

  public get(id: string): IResearchFinding | undefined {
    const row = this.db.prepare('SELECT * FROM research_findings WHERE id = ?').get(id) as unknown as RawFindingRow | undefined;
    if (!row) return undefined;
    return this.rowToFinding(row);
  }

  public findById(id: string): IResearchFinding | undefined {
    return this.get(id);
  }

  public listByStudy(researchId: string): IResearchFinding[] {
    const rows = (this.db.prepare(
      'SELECT * FROM research_findings WHERE research_id = ? ORDER BY created_at ASC'
    ).all as (...args: unknown[]) => unknown[])(researchId) as unknown as RawFindingRow[];
    return rows.map((r) => this.rowToFinding(r));
  }

  public findByStudyId(researchId: string): IResearchFinding[] {
    return this.listByStudy(researchId);
  }

  public deleteByStudy(researchId: string): void {
    this.db.prepare('DELETE FROM research_findings WHERE research_id = ?').run(researchId);
  }

  private rowToFinding(row: RawFindingRow): IResearchFinding {
    const corroborating = row.corroborating_source_ids ? JSON.parse(row.corroborating_source_ids) : [];
    const conflicting = row.conflicting_source_ids ? JSON.parse(row.conflicting_source_ids) : [];
    const citations = row.citations ? (JSON.parse(row.citations) as ResearchCitation[]) : [];

    return {
      id: row.id,
      researchId: row.research_id,
      title: row.title,
      statement: row.statement,
      description: row.statement,
      findingType: row.finding_type as FindingType,
      status: row.status as FindingStatus,
      confidence: 0.85,
      corroboratingSourceIds: corroborating,
      conflictingSourceIds: conflicting,
      sourceIds: corroborating,
      citations,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at,
    };
  }
}
