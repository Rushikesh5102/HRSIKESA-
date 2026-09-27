/**
 * HṚṢĪKEŚA (हृषीकेश) — Universal IDE Workspace Persistence Repository
 *
 * FP-09: SQLite persistence and fast dual-layer caching for workspaces,
 * changesets, terminals, preview servers, and verification runs.
 */

import { DatabaseManager } from '../../persistence/database/database.manager.js';
import {
  WorkspaceMetadata,
  StagedChangeset,
  TerminalSession,
  PreviewServer,
  VerificationRun,
  ChangesetStatus,
} from '../types/ide.types.js';

export class IdeRepository {
  private readonly db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  // ==========================================
  // 1. Workspaces
  // ==========================================

  public saveWorkspace(ws: WorkspaceMetadata): void {
    const stmt = this.db.prepare(`
      INSERT INTO ide_workspaces (
        id, name, root_path, company_id, project_id,
        architecture, framework, package_manager, settings_json,
        created_at, last_accessed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        company_id = excluded.company_id,
        project_id = excluded.project_id,
        architecture = excluded.architecture,
        framework = excluded.framework,
        package_manager = excluded.package_manager,
        settings_json = excluded.settings_json,
        last_accessed_at = excluded.last_accessed_at
    `);
    stmt.run(
      ws.id,
      ws.name,
      ws.rootPath,
      ws.companyId || null,
      ws.projectId || null,
      typeof ws.architecture === 'string' ? ws.architecture : JSON.stringify(ws.architecture || 'GENERIC'),
      ws.framework || null,
      ws.packageManager || null,
      JSON.stringify(ws.settings || {}),
      ws.createdAt,
      ws.lastAccessedAt
    );
  }

  public getWorkspace(id: string): WorkspaceMetadata | undefined {
    const row = this.db.prepare(`SELECT * FROM ide_workspaces WHERE id = ?`).get(id) as any;
    if (!row) return undefined;
    return this.mapWorkspaceRow(row);
  }

  public getWorkspaceByPath(rootPath: string): WorkspaceMetadata | undefined {
    const row = this.db.prepare(`SELECT * FROM ide_workspaces WHERE root_path = ?`).get(rootPath) as any;
    if (!row) return undefined;
    return this.mapWorkspaceRow(row);
  }

  public listWorkspaces(): WorkspaceMetadata[] {
    const rows = this.db.prepare(`SELECT * FROM ide_workspaces ORDER BY last_accessed_at DESC`).all() as any[];
    return rows.map((r) => this.mapWorkspaceRow(r));
  }

  private mapWorkspaceRow(row: any): WorkspaceMetadata {
    let architecture: any = row.architecture;
    if (typeof architecture === 'string' && (architecture.startsWith('{') || architecture.startsWith('['))) {
      try {
        architecture = JSON.parse(architecture);
      } catch {}
    }

    return {
      id: row.id,
      name: row.name,
      rootPath: row.root_path,
      companyId: row.company_id || undefined,
      projectId: row.project_id || undefined,
      architecture,
      framework: row.framework || undefined,
      packageManager: row.package_manager || undefined,
      settings: JSON.parse(row.settings_json || '{}'),
      createdAt: row.created_at,
      lastAccessedAt: row.last_accessed_at,
    };
  }

  // ==========================================
  // 2. Changesets
  // ==========================================

  public saveChangeset(cs: StagedChangeset): void {
    if (cs.workspaceId) {
      const wsExists = this.db.prepare(`SELECT 1 FROM ide_workspaces WHERE id = ?`).get(cs.workspaceId);
      if (!wsExists) {
        this.db.prepare(`
          INSERT INTO ide_workspaces (id, name, root_path, created_at, last_accessed_at)
          VALUES (?, 'Default Workspace', ?, ?, ?)
        `).run(cs.workspaceId, process.cwd(), new Date().toISOString(), new Date().toISOString());
      }
    }

    const stmt = this.db.prepare(`
      INSERT INTO ide_changesets (
        id, workspace_id, title, description, status,
        author_agent, danger_tier, files_json, diff_unified,
        diff_checksum, created_at, applied_at, reviewed_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        applied_at = excluded.applied_at,
        reviewed_by = excluded.reviewed_by
    `);
    stmt.run(
      cs.id,
      cs.workspaceId,
      cs.title,
      cs.description || null,
      cs.status,
      cs.authorAgent,
      cs.dangerTier,
      JSON.stringify(cs.files || []),
      cs.diffUnified,
      cs.diffChecksum,
      cs.createdAt,
      cs.appliedAt || null,
      cs.reviewedBy || null
    );
  }

  public getChangeset(id: string): StagedChangeset | undefined {
    const row = this.db.prepare(`SELECT * FROM ide_changesets WHERE id = ?`).get(id) as any;
    if (!row) return undefined;
    return this.mapChangesetRow(row);
  }

  public listChangesets(workspaceId: string, status?: ChangesetStatus): StagedChangeset[] {
    let sql = `SELECT * FROM ide_changesets WHERE workspace_id = ?`;
    const params: any[] = [workspaceId];
    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }
    sql += ` ORDER BY created_at DESC`;
    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map((r) => this.mapChangesetRow(r));
  }

  private mapChangesetRow(row: any): StagedChangeset {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      title: row.title,
      description: row.description || undefined,
      status: row.status as ChangesetStatus,
      authorAgent: row.author_agent,
      dangerTier: Number(row.danger_tier),
      files: JSON.parse(row.files_json || '[]'),
      diffUnified: row.diff_unified,
      diffChecksum: row.diff_checksum,
      createdAt: row.created_at,
      appliedAt: row.applied_at || undefined,
      reviewedBy: row.reviewed_by || undefined,
    };
  }

  // ==========================================
  // 3. Terminals
  // ==========================================

  public saveTerminal(term: TerminalSession): void {
    const wsId = typeof term.workspaceId === 'object' && term.workspaceId !== null ? (term.workspaceId as any).id : term.workspaceId || 'default_ws';
    const wsExists = this.db.prepare(`SELECT 1 FROM ide_workspaces WHERE id = ?`).get(wsId);
    if (!wsExists) {
      this.db.prepare(`
        INSERT INTO ide_workspaces (id, name, root_path, created_at, last_accessed_at)
        VALUES (?, 'Default Workspace', ?, ?, ?)
      `).run(wsId, term.cwd || process.cwd(), new Date().toISOString(), new Date().toISOString());
    }
    const stmt = this.db.prepare(`
      INSERT INTO ide_terminals (
        id, workspace_id, name, shell_path, cwd,
        pid, status, created_at, last_active_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        pid = excluded.pid,
        last_active_at = excluded.last_active_at
    `);
    stmt.run(
      term.id,
      wsId,
      term.name || 'Terminal',
      term.shellPath || '',
      term.cwd || '',
      term.pid ?? null,
      term.status || 'ACTIVE',
      term.createdAt || new Date().toISOString(),
      term.lastActiveAt || new Date().toISOString()
    );
  }

  public getTerminal(id: string): TerminalSession | undefined {
    const row = this.db.prepare(`SELECT * FROM ide_terminals WHERE id = ?`).get(id) as any;
    if (!row) return undefined;
    return this.mapTerminalRow(row);
  }

  public listTerminals(workspaceId: string): TerminalSession[] {
    const rows = this.db.prepare(`SELECT * FROM ide_terminals WHERE workspace_id = ? ORDER BY created_at ASC`).all(workspaceId) as any[];
    return rows.map((r) => this.mapTerminalRow(r));
  }

  private mapTerminalRow(row: any): TerminalSession {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      name: row.name,
      shellPath: row.shell_path,
      cwd: row.cwd,
      pid: row.pid ? Number(row.pid) : undefined,
      status: row.status,
      createdAt: row.created_at,
      lastActiveAt: row.last_active_at,
    };
  }

  // ==========================================
  // 4. Preview Servers
  // ==========================================

  public savePreviewServer(server: PreviewServer): void {
    const stmt = this.db.prepare(`
      INSERT INTO ide_preview_servers (
        id, workspace_id, framework, port, url,
        pid, status, health_status, started_at, stopped_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        health_status = excluded.health_status,
        stopped_at = excluded.stopped_at
    `);
    stmt.run(
      server.id,
      server.workspaceId,
      server.framework,
      server.port,
      server.url,
      server.pid || null,
      server.status,
      server.healthStatus,
      server.startedAt,
      server.stoppedAt || null
    );
  }

  public getPreviewServer(id: string): PreviewServer | undefined {
    const row = this.db.prepare(`SELECT * FROM ide_preview_servers WHERE id = ?`).get(id) as any;
    if (!row) return undefined;
    return this.mapPreviewRow(row);
  }

  public listPreviewServers(workspaceId: string): PreviewServer[] {
    const rows = this.db.prepare(`SELECT * FROM ide_preview_servers WHERE workspace_id = ? ORDER BY started_at DESC`).all(workspaceId) as any[];
    return rows.map((r) => this.mapPreviewRow(r));
  }

  private mapPreviewRow(row: any): PreviewServer {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      framework: row.framework,
      port: Number(row.port),
      url: row.url,
      pid: row.pid ? Number(row.pid) : undefined,
      status: row.status,
      healthStatus: row.health_status,
      startedAt: row.started_at,
      stoppedAt: row.stopped_at || undefined,
    };
  }

  // ==========================================
  // 5. Verification Runs
  // ==========================================

  public saveVerificationRun(run: VerificationRun): void {
    const stmt = this.db.prepare(`
      INSERT INTO ide_verification_runs (
        id, workspace_id, objective, current_stage, status,
        stages_log_json, tests_passed, tests_failed,
        iterations_count, started_at, completed_at, summary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        current_stage = excluded.current_stage,
        status = excluded.status,
        stages_log_json = excluded.stages_log_json,
        tests_passed = excluded.tests_passed,
        tests_failed = excluded.tests_failed,
        iterations_count = excluded.iterations_count,
        completed_at = excluded.completed_at,
        summary = excluded.summary
    `);
    stmt.run(
      run.id,
      run.workspaceId,
      run.objective,
      run.currentStage,
      run.status,
      JSON.stringify(run.stagesLog || []),
      run.testsPassed,
      run.testsFailed,
      run.iterationsCount,
      run.startedAt,
      run.completedAt || null,
      run.summary || null
    );
  }

  public getVerificationRun(id: string): VerificationRun | undefined {
    const row = this.db.prepare(`SELECT * FROM ide_verification_runs WHERE id = ?`).get(id) as any;
    if (!row) return undefined;
    return this.mapVerificationRow(row);
  }

  public listVerificationRuns(workspaceId: string): VerificationRun[] {
    const rows = this.db.prepare(`SELECT * FROM ide_verification_runs WHERE workspace_id = ? ORDER BY started_at DESC`).all(workspaceId) as any[];
    return rows.map((r) => this.mapVerificationRow(r));
  }

  private mapVerificationRow(row: any): VerificationRun {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      objective: row.objective,
      currentStage: row.current_stage,
      status: row.status,
      stagesLog: JSON.parse(row.stages_log_json || '[]'),
      testsPassed: Number(row.tests_passed),
      testsFailed: Number(row.tests_failed),
      iterationsCount: Number(row.iterations_count),
      startedAt: row.started_at,
      completedAt: row.completed_at || undefined,
      summary: row.summary || undefined,
    };
  }
}
