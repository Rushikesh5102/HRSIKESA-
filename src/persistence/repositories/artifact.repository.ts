/**
 * HRSIKESA (हृषीकेश) — Mission Artifact Repository
 *
 * Persists and tracks files, URLs, screenshots, code, and documents produced during missions.
 */

import { DatabaseManager } from '../database/database.manager.js';
import { MissionArtifact, ArtifactType } from '../../agents/interfaces/mission.types.js';

interface RawArtifactRow {
  id: string;
  mission_id: string;
  task_id: string;
  company_id: string | null;
  project_id: string | null;
  type: string;
  location: string;
  name: string;
  metadata: string | null;
  verified: number;
  created_at: string;
}

export class ArtifactRepository {
  private readonly db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  public create(artifact: MissionArtifact): MissionArtifact {
    const stmt = this.db.prepare(`
      INSERT INTO mission_artifacts (
        id, mission_id, task_id, company_id, project_id,
        type, location, name, metadata, verified, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      artifact.id,
      artifact.missionId,
      artifact.taskId,
      artifact.companyId || null,
      artifact.projectId || null,
      artifact.type,
      artifact.location,
      artifact.name,
      artifact.metadata ? JSON.stringify(artifact.metadata) : null,
      artifact.verified ? 1 : 0,
      artifact.createdAt
    );
    return artifact;
  }

  public get(id: string): MissionArtifact | undefined {
    const row = this.db.prepare(
      'SELECT * FROM mission_artifacts WHERE id = ?'
    ).get(id) as unknown as RawArtifactRow | undefined;
    if (!row) return undefined;
    return this.rowToArtifact(row);
  }

  public listByMission(missionId: string): MissionArtifact[] {
    const rows = this.db.prepare(
      'SELECT * FROM mission_artifacts WHERE mission_id = ? ORDER BY created_at ASC'
    ).all(missionId) as unknown as RawArtifactRow[];
    return rows.map(r => this.rowToArtifact(r));
  }

  public listByTask(taskId: string): MissionArtifact[] {
    const rows = this.db.prepare(
      'SELECT * FROM mission_artifacts WHERE task_id = ? ORDER BY created_at ASC'
    ).all(taskId) as unknown as RawArtifactRow[];
    return rows.map(r => this.rowToArtifact(r));
  }

  public listByCompany(companyId: string, limit = 50): MissionArtifact[] {
    const rows = this.db.prepare(
      'SELECT * FROM mission_artifacts WHERE company_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(companyId, limit) as unknown as RawArtifactRow[];
    return rows.map(r => this.rowToArtifact(r));
  }

  public listByProject(projectId: string, limit = 50): MissionArtifact[] {
    const rows = this.db.prepare(
      'SELECT * FROM mission_artifacts WHERE project_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(projectId, limit) as unknown as RawArtifactRow[];
    return rows.map(r => this.rowToArtifact(r));
  }

  public updateVerified(id: string, verified: boolean): void {
    const stmt = this.db.prepare(`
      UPDATE mission_artifacts SET verified = ? WHERE id = ?
    `);
    stmt.run(verified ? 1 : 0, id);
  }

  public delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM mission_artifacts WHERE id = ?').run(id);
    return Number(result.changes) > 0;
  }

  private rowToArtifact(row: RawArtifactRow): MissionArtifact {
    return {
      id: row.id,
      missionId: row.mission_id,
      taskId: row.task_id,
      companyId: row.company_id || undefined,
      projectId: row.project_id || undefined,
      type: row.type as ArtifactType,
      location: row.location,
      name: row.name,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      verified: Boolean(row.verified),
      createdAt: row.created_at
    };
  }
}
