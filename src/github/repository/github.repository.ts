/**
 * HṚṢĪKEŚA (हृषीकेश) — GitHub & Open-Source Intelligence Repository
 *
 * Persistent SQLite storage & dual-layer caching for repositories, analysis,
 * dependencies, security findings, acquisitions, artifacts, provenance, and proposals.
 */

import { DatabaseSync } from 'node:sqlite';
import { DatabaseManager } from '../../persistence/database/database.manager.js';
import { ILogger } from '../../core/logging/logger.types.js';
import {
  GitHubRepository,
  RepositoryIntelligence,
  DependencyRecord,
  SecurityFinding,
  RepositoryAcquisition,
  AcquisitionArtifact,
  RepositoryProvenance,
  IntegrationProposal,
} from '../types/github.types.js';

export class GitHubIntelligenceRepository {
  private readonly dbManager: DatabaseManager;
  private readonly db: DatabaseSync;
  private readonly logger?: ILogger;

  // In-memory dual-layer caches for deterministic sub-10ms lookups
  private readonly repoCache = new Map<string, GitHubRepository>();
  private readonly analysisCache = new Map<string, RepositoryIntelligence>();

  constructor(dbManager: DatabaseManager, logger?: ILogger) {
    this.dbManager = dbManager;
    this.db = dbManager.getRawDb();
    this.logger = logger?.child('GitHubIntelligenceRepository');
    this.warmCache();
  }

  public getDbManager(): DatabaseManager {
    return this.dbManager;
  }

  public getLogger(): ILogger | undefined {
    return this.logger;
  }

  private warmCache(): void {
    try {
      const rows = this.db.prepare('SELECT * FROM github_repositories LIMIT 500').all() as Record<string, unknown>[];
      for (const row of rows) {
        const repo = this.rowToRepo(row);
        this.repoCache.set(repo.id, repo);
        this.repoCache.set(repo.fullName.toLowerCase(), repo);
      }
    } catch {
      // Migrations may not have run yet during early constructor
    }
  }

  public saveRepository(repo: GitHubRepository): void {
    const stmt = this.db.prepare(`
      INSERT INTO github_repositories (
        id, github_id, owner, name, full_name, url, default_branch, description,
        stars, forks, watchers, open_issues, language, languages_json, license_spdx,
        license_name, topics_json, created_at, updated_at, pushed_at, archived,
        fork, size_kb, visibility, discovered_at, last_analyzed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(full_name) DO UPDATE SET
        stars = excluded.stars,
        forks = excluded.forks,
        watchers = excluded.watchers,
        open_issues = excluded.open_issues,
        description = excluded.description,
        language = excluded.language,
        languages_json = excluded.languages_json,
        license_spdx = excluded.license_spdx,
        license_name = excluded.license_name,
        topics_json = excluded.topics_json,
        updated_at = excluded.updated_at,
        pushed_at = excluded.pushed_at,
        archived = excluded.archived,
        size_kb = excluded.size_kb,
        last_analyzed_at = COALESCE(excluded.last_analyzed_at, github_repositories.last_analyzed_at)
    `);

    stmt.run(
      repo.id,
      repo.githubId,
      repo.owner,
      repo.name,
      repo.fullName,
      repo.url,
      repo.defaultBranch,
      repo.description || null,
      repo.stars,
      repo.forks,
      repo.watchers,
      repo.openIssues,
      repo.language || null,
      JSON.stringify(repo.languages || {}),
      repo.licenseSpdx || null,
      repo.licenseName || null,
      JSON.stringify(repo.topics || []),
      repo.createdAt,
      repo.updatedAt,
      repo.pushedAt || null,
      repo.archived ? 1 : 0,
      repo.fork ? 1 : 0,
      repo.sizeKb,
      repo.visibility,
      repo.discoveredAt,
      repo.lastAnalyzedAt || null
    );

    this.repoCache.set(repo.id, repo);
    this.repoCache.set(repo.fullName.toLowerCase(), repo);
  }

  public getRepository(idOrFullName: string): GitHubRepository | undefined {
    const cached = this.repoCache.get(idOrFullName) || this.repoCache.get(idOrFullName.toLowerCase());
    if (cached) return cached;

    const row = this.db.prepare(
      'SELECT * FROM github_repositories WHERE id = ? OR LOWER(full_name) = LOWER(?)'
    ).get(idOrFullName, idOrFullName) as Record<string, unknown> | undefined;

    if (!row) return undefined;
    const repo = this.rowToRepo(row);
    this.repoCache.set(repo.id, repo);
    this.repoCache.set(repo.fullName.toLowerCase(), repo);
    return repo;
  }

  public listRepositories(limit: number = 100): GitHubRepository[] {
    const rows = this.db.prepare(
      'SELECT * FROM github_repositories ORDER BY stars DESC LIMIT ?'
    ).all(limit) as Record<string, unknown>[];
    return rows.map((r) => this.rowToRepo(r));
  }

  public searchLocalRepositories(query: string, limit: number = 50): GitHubRepository[] {
    const pattern = `%${query.toLowerCase()}%`;
    const rows = this.db.prepare(`
      SELECT * FROM github_repositories
      WHERE LOWER(name) LIKE ? OR LOWER(full_name) LIKE ? OR LOWER(description) LIKE ?
      ORDER BY stars DESC LIMIT ?
    `).all(pattern, pattern, pattern, limit) as Record<string, unknown>[];
    return rows.map((r) => this.rowToRepo(r));
  }

  public saveAnalysis(analysis: RepositoryIntelligence): void {
    const stmt = this.db.prepare(`
      INSERT INTO github_repository_analysis (
        id, repository_id, architecture, license_status, license_details_json,
        activity_status, activity_details_json, compatibility_status,
        compatibility_details_json, resource_estimate_json, readme_summary, analyzed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        architecture = excluded.architecture,
        license_status = excluded.license_status,
        license_details_json = excluded.license_details_json,
        activity_status = excluded.activity_status,
        activity_details_json = excluded.activity_details_json,
        compatibility_status = excluded.compatibility_status,
        compatibility_details_json = excluded.compatibility_details_json,
        resource_estimate_json = excluded.resource_estimate_json,
        readme_summary = excluded.readme_summary,
        analyzed_at = excluded.analyzed_at
    `);

    stmt.run(
      `analysis_${analysis.repositoryId}`,
      analysis.repositoryId,
      analysis.architecture,
      analysis.license.compatibility,
      JSON.stringify(analysis.license),
      analysis.activity.status,
      JSON.stringify(analysis.activity),
      analysis.compatibility.status,
      JSON.stringify(analysis.compatibility),
      JSON.stringify(analysis.resourceEstimate),
      analysis.readme.defangedSummary || null,
      analysis.analyzedAt
    );

    this.analysisCache.set(analysis.repositoryId, analysis);

    // Update repository last_analyzed_at
    this.db.prepare('UPDATE github_repositories SET last_analyzed_at = ? WHERE id = ?')
      .run(analysis.analyzedAt, analysis.repositoryId);
  }

  public getAnalysis(repositoryId: string): RepositoryIntelligence | undefined {
    const cached = this.analysisCache.get(repositoryId);
    if (cached) return cached;

    const row = this.db.prepare(
      'SELECT * FROM github_repository_analysis WHERE repository_id = ?'
    ).get(repositoryId) as Record<string, unknown> | undefined;

    if (!row) return undefined;

    const parsed: RepositoryIntelligence = {
      repositoryId: String(row.repository_id),
      architecture: String(row.architecture) as any,
      license: JSON.parse(String(row.license_details_json || '{}')),
      activity: JSON.parse(String(row.activity_details_json || '{}')),
      release: {
        latestTag: undefined,
        releaseDate: undefined,
      },
      compatibility: JSON.parse(String(row.compatibility_details_json || '{}')),
      resourceEstimate: JSON.parse(String(row.resource_estimate_json || '{}')),
      readme: {
        features: [],
        requirements: [],
        defangedSummary: String(row.readme_summary || ''),
      },
      analyzedAt: String(row.analyzed_at),
    };

    this.analysisCache.set(repositoryId, parsed);
    return parsed;
  }

  public saveDependencies(repositoryId: string, deps: DependencyRecord[]): void {
    const del = this.db.prepare('DELETE FROM github_dependencies WHERE repository_id = ?');
    del.run(repositoryId);

    const insert = this.db.prepare(`
      INSERT INTO github_dependencies (
        id, repository_id, manifest_file, name, version_spec, dependency_type,
        runtime, risk_level, risk_reasons_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const d of deps) {
      insert.run(
        d.id,
        repositoryId,
        d.manifestFile,
        d.name,
        d.versionSpec || null,
        d.dependencyType,
        d.runtime,
        d.riskLevel,
        JSON.stringify(d.riskReasons || [])
      );
    }
  }

  public getDependencies(repositoryId: string): DependencyRecord[] {
    const rows = this.db.prepare(
      'SELECT * FROM github_dependencies WHERE repository_id = ?'
    ).all(repositoryId) as Record<string, unknown>[];

    return rows.map((r) => ({
      id: String(r.id),
      repositoryId: String(r.repository_id),
      manifestFile: String(r.manifest_file),
      name: String(r.name),
      versionSpec: String(r.version_spec || ''),
      dependencyType: String(r.dependency_type) as any,
      runtime: String(r.runtime) as any,
      riskLevel: String(r.risk_level) as any,
      riskReasons: JSON.parse(String(r.risk_reasons_json || '[]')),
    }));
  }

  public saveSecurityFindings(repositoryId: string, findings: SecurityFinding[]): void {
    const del = this.db.prepare('DELETE FROM github_security_findings WHERE repository_id = ?');
    del.run(repositoryId);

    const insert = this.db.prepare(`
      INSERT INTO github_security_findings (
        id, repository_id, category, indicator, evidence, file_path, line_number,
        severity, confidence, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const f of findings) {
      insert.run(
        f.id,
        repositoryId,
        f.category,
        f.indicator,
        f.evidence,
        f.filePath || null,
        f.lineNumber || null,
        f.severity,
        f.confidence,
        f.createdAt
      );
    }
  }

  public getSecurityFindings(repositoryId: string): SecurityFinding[] {
    const rows = this.db.prepare(
      'SELECT * FROM github_security_findings WHERE repository_id = ? ORDER BY severity DESC'
    ).all(repositoryId) as Record<string, unknown>[];

    return rows.map((r) => ({
      id: String(r.id),
      repositoryId: String(r.repository_id),
      category: String(r.category),
      indicator: String(r.indicator),
      evidence: String(r.evidence),
      filePath: r.file_path ? String(r.file_path) : undefined,
      lineNumber: r.line_number ? Number(r.line_number) : undefined,
      severity: String(r.severity) as any,
      confidence: String(r.confidence) as any,
      createdAt: String(r.created_at),
    }));
  }

  public saveAcquisition(acq: RepositoryAcquisition): void {
    const stmt = this.db.prepare(`
      INSERT INTO github_acquisitions (
        id, repository_id, target_path, commit_sha, ref_name, status, acquired_by,
        company_id, project_id, acquired_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        commit_sha = excluded.commit_sha
    `);

    stmt.run(
      acq.id,
      acq.repositoryId,
      acq.targetPath,
      acq.commitSha,
      acq.refName,
      acq.status,
      acq.acquiredBy,
      acq.companyId || null,
      acq.projectId || null,
      acq.acquiredAt
    );
  }

  public listAcquisitions(limit: number = 50): RepositoryAcquisition[] {
    const rows = this.db.prepare(
      'SELECT * FROM github_acquisitions ORDER BY acquired_at DESC LIMIT ?'
    ).all(limit) as Record<string, unknown>[];

    return rows.map((r) => ({
      id: String(r.id),
      repositoryId: String(r.repository_id),
      targetPath: String(r.target_path),
      commitSha: String(r.commit_sha),
      refName: String(r.ref_name),
      status: String(r.status) as any,
      acquiredBy: String(r.acquired_by),
      companyId: r.company_id ? String(r.company_id) : undefined,
      projectId: r.project_id ? String(r.project_id) : undefined,
      acquiredAt: String(r.acquired_at),
    }));
  }

  public saveArtifact(artifact: AcquisitionArtifact): void {
    const stmt = this.db.prepare(`
      INSERT INTO github_artifacts (
        id, acquisition_id, file_path, artifact_type, checksum_sha256, size_bytes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      artifact.id,
      artifact.acquisitionId,
      artifact.filePath,
      artifact.artifactType,
      artifact.checksumSha256,
      artifact.sizeBytes,
      artifact.createdAt
    );
  }

  public listArtifacts(acquisitionId?: string): AcquisitionArtifact[] {
    const query = acquisitionId
      ? 'SELECT * FROM github_artifacts WHERE acquisition_id = ?'
      : 'SELECT * FROM github_artifacts ORDER BY created_at DESC';
    const rows = (acquisitionId
      ? this.db.prepare(query).all(acquisitionId)
      : this.db.prepare(query).all()) as Record<string, unknown>[];

    return rows.map((r) => ({
      id: String(r.id),
      acquisitionId: String(r.acquisition_id),
      filePath: String(r.file_path),
      artifactType: String(r.artifact_type) as any,
      checksumSha256: String(r.checksum_sha256),
      sizeBytes: Number(r.size_bytes),
      createdAt: String(r.created_at),
    }));
  }

  public getArtifacts(acquisitionId: string): AcquisitionArtifact[] {
    return this.listArtifacts(acquisitionId);
  }

  public saveProvenance(prov: RepositoryProvenance): RepositoryProvenance {
    const stmt = this.db.prepare(`
      INSERT INTO github_provenance (
        id, repository_id, acquisition_id, url, owner, repository, commit_sha,
        branch_or_tag, license, original_copyright, modifications, integration_location,
        discovered_source, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        commit_sha = excluded.commit_sha,
        license = excluded.license,
        modifications = excluded.modifications
    `);

    stmt.run(
      prov.id,
      prov.repositoryId,
      prov.acquisitionId || null,
      prov.url,
      prov.owner,
      prov.repository,
      prov.commitSha || null,
      prov.branchOrTag || null,
      prov.license,
      prov.originalCopyright || null,
      prov.modifications || null,
      prov.integrationLocation || null,
      prov.discoveredSource,
      prov.createdAt
    );

    return prov;
  }

  public getProvenance(repositoryId: string): RepositoryProvenance | undefined {
    const row = this.db.prepare(
      'SELECT * FROM github_provenance WHERE repository_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(repositoryId) as Record<string, unknown> | undefined;

    if (!row) return undefined;

    return {
      id: String(row.id),
      repositoryId: String(row.repository_id),
      acquisitionId: row.acquisition_id ? String(row.acquisition_id) : undefined,
      url: String(row.url),
      owner: String(row.owner),
      repository: String(row.repository),
      commitSha: row.commit_sha ? String(row.commit_sha) : undefined,
      branchOrTag: row.branch_or_tag ? String(row.branch_or_tag) : undefined,
      license: String(row.license),
      originalCopyright: row.original_copyright ? String(row.original_copyright) : undefined,
      modifications: row.modifications ? String(row.modifications) : undefined,
      integrationLocation: row.integration_location ? String(row.integration_location) : undefined,
      discoveredSource: String(row.discovered_source),
      createdAt: String(row.created_at),
    };
  }

  public listProvenance(limit: number = 50): RepositoryProvenance[] {
    const rows = this.db.prepare(
      'SELECT * FROM github_provenance ORDER BY created_at DESC LIMIT ?'
    ).all(limit) as Record<string, unknown>[];

    return rows.map((r) => ({
      id: String(r.id),
      repositoryId: String(r.repository_id),
      acquisitionId: r.acquisition_id ? String(r.acquisition_id) : undefined,
      url: String(r.url),
      owner: String(r.owner),
      repository: String(r.repository),
      commitSha: r.commit_sha ? String(r.commit_sha) : undefined,
      branchOrTag: r.branch_or_tag ? String(r.branch_or_tag) : undefined,
      license: String(r.license),
      originalCopyright: r.original_copyright ? String(r.original_copyright) : undefined,
      modifications: r.modifications ? String(r.modifications) : undefined,
      integrationLocation: r.integration_location ? String(r.integration_location) : undefined,
      discoveredSource: String(r.discovered_source),
      createdAt: String(r.created_at),
    }));
  }

  public saveProposal(proposal: IntegrationProposal): void {
    const stmt = this.db.prepare(`
      INSERT INTO github_integration_proposals (
        id, repository_id, capability_id, name, description, category, protocol,
        status, risk_level, trust_level, execution_command, requires_human_approval,
        decision_reason, decided_by, decided_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        decision_reason = excluded.decision_reason,
        decided_by = excluded.decided_by,
        decided_at = excluded.decided_at
    `);

    stmt.run(
      proposal.id,
      proposal.repositoryId,
      proposal.capabilityId,
      proposal.name,
      proposal.description,
      proposal.category,
      proposal.protocol,
      proposal.status,
      proposal.riskLevel,
      proposal.trustLevel,
      proposal.executionCommand || null,
      proposal.requiresHumanApproval ? 1 : 0,
      proposal.decisionReason || null,
      proposal.decidedBy || null,
      proposal.decidedAt || null,
      proposal.createdAt
    );
  }

  public listProposals(repositoryId?: string): IntegrationProposal[] {
    let rows: Record<string, unknown>[];
    if (repositoryId) {
      rows = this.db.prepare(
        'SELECT * FROM github_integration_proposals WHERE repository_id = ? ORDER BY created_at DESC'
      ).all(repositoryId) as Record<string, unknown>[];
    } else {
      rows = this.db.prepare(
        'SELECT * FROM github_integration_proposals ORDER BY created_at DESC'
      ).all() as Record<string, unknown>[];
    }

    return rows.map((r) => ({
      id: String(r.id),
      repositoryId: String(r.repository_id),
      capabilityId: String(r.capability_id),
      name: String(r.name),
      description: String(r.description),
      category: String(r.category),
      protocol: String(r.protocol) as any,
      status: String(r.status) as any,
      riskLevel: String(r.risk_level) as any,
      trustLevel: String(r.trust_level) as any,
      executionCommand: r.execution_command ? String(r.execution_command) : undefined,
      requiresHumanApproval: Boolean(r.requires_human_approval),
      decisionReason: r.decision_reason ? String(r.decision_reason) : undefined,
      decidedBy: r.decided_by ? String(r.decided_by) : undefined,
      decidedAt: r.decided_at ? String(r.decided_at) : undefined,
      createdAt: String(r.created_at),
    }));
  }

  private rowToRepo(row: Record<string, unknown>): GitHubRepository {
    return {
      id: String(row.id),
      githubId: Number(row.github_id || 0),
      owner: String(row.owner),
      name: String(row.name),
      fullName: String(row.full_name),
      url: String(row.url),
      defaultBranch: String(row.default_branch || 'main'),
      description: String(row.description || ''),
      stars: Number(row.stars || 0),
      forks: Number(row.forks || 0),
      watchers: Number(row.watchers || 0),
      openIssues: Number(row.open_issues || 0),
      language: String(row.language || ''),
      languages: JSON.parse(String(row.languages_json || '{}')),
      licenseSpdx: String(row.license_spdx || 'UNKNOWN'),
      licenseName: String(row.license_name || 'Unknown License'),
      topics: JSON.parse(String(row.topics_json || '[]')),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      pushedAt: String(row.pushed_at || ''),
      archived: Boolean(row.archived),
      fork: Boolean(row.fork),
      sizeKb: Number(row.size_kb || 0),
      visibility: (row.visibility as any) || 'public',
      discoveredAt: String(row.discovered_at),
      lastAnalyzedAt: row.last_analyzed_at ? String(row.last_analyzed_at) : undefined,
    };
  }
}
