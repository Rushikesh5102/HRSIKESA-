/**
 * HṚṢĪKEŚA (हृषीकेश) — Migration 022: GitHub & Open-Source Intelligence / Acquisition Fabric Schema
 *
 * FP-08: Persistent Repositories Intelligence, Analysis Findings, Dependency Graph,
 * Security Indicators, Sandboxed Acquisitions, Artifacts, Provenance, and Capability Proposals.
 */

import { DatabaseSync } from 'node:sqlite';
import { Migration } from './migration.types.js';

export const migration022: Migration = {
  version: 22,
  name: '022_github_intelligence_fabric_schema',
  up: (db: DatabaseSync): void => {
    // 1. GitHub Repositories Master Cache / Index
    db.exec(`
      CREATE TABLE IF NOT EXISTS github_repositories (
        id TEXT PRIMARY KEY,
        github_id INTEGER,
        owner TEXT NOT NULL,
        name TEXT NOT NULL,
        full_name TEXT NOT NULL UNIQUE,
        url TEXT NOT NULL,
        default_branch TEXT NOT NULL DEFAULT 'main',
        description TEXT,
        stars INTEGER NOT NULL DEFAULT 0,
        forks INTEGER NOT NULL DEFAULT 0,
        watchers INTEGER NOT NULL DEFAULT 0,
        open_issues INTEGER NOT NULL DEFAULT 0,
        language TEXT,
        languages_json TEXT NOT NULL DEFAULT '{}',
        license_spdx TEXT,
        license_name TEXT,
        topics_json TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        pushed_at TEXT,
        archived INTEGER NOT NULL DEFAULT 0,
        fork INTEGER NOT NULL DEFAULT 0,
        size_kb INTEGER NOT NULL DEFAULT 0,
        visibility TEXT NOT NULL DEFAULT 'public',
        discovered_at TEXT NOT NULL,
        last_analyzed_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_gh_repo_full_name ON github_repositories(full_name);
      CREATE INDEX IF NOT EXISTS idx_gh_repo_owner ON github_repositories(owner);
      CREATE INDEX IF NOT EXISTS idx_gh_repo_lang ON github_repositories(language);
      CREATE INDEX IF NOT EXISTS idx_gh_repo_stars ON github_repositories(stars);
    `);

    // 2. Repository Intelligence & Analysis
    db.exec(`
      CREATE TABLE IF NOT EXISTS github_repository_analysis (
        id TEXT PRIMARY KEY,
        repository_id TEXT NOT NULL,
        architecture TEXT NOT NULL,
        license_status TEXT NOT NULL,
        license_details_json TEXT NOT NULL DEFAULT '{}',
        activity_status TEXT NOT NULL,
        activity_details_json TEXT NOT NULL DEFAULT '{}',
        compatibility_status TEXT NOT NULL,
        compatibility_details_json TEXT NOT NULL DEFAULT '{}',
        resource_estimate_json TEXT NOT NULL DEFAULT '{}',
        readme_summary TEXT,
        analyzed_at TEXT NOT NULL,
        FOREIGN KEY (repository_id) REFERENCES github_repositories(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_gh_analysis_repo ON github_repository_analysis(repository_id);
    `);

    // 3. Dependency Intelligence Graph
    db.exec(`
      CREATE TABLE IF NOT EXISTS github_dependencies (
        id TEXT PRIMARY KEY,
        repository_id TEXT NOT NULL,
        manifest_file TEXT NOT NULL,
        name TEXT NOT NULL,
        version_spec TEXT,
        dependency_type TEXT NOT NULL, -- 'PROD' | 'DEV' | 'PEER'
        runtime TEXT NOT NULL, -- 'nodejs' | 'python' | 'rust' | 'go' | 'unknown'
        risk_level TEXT NOT NULL DEFAULT 'LOW', -- 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
        risk_reasons_json TEXT NOT NULL DEFAULT '[]',
        FOREIGN KEY (repository_id) REFERENCES github_repositories(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_gh_dep_repo ON github_dependencies(repository_id);
      CREATE INDEX IF NOT EXISTS idx_gh_dep_name ON github_dependencies(name);
    `);

    // 4. Security Indicators & Heuristics
    db.exec(`
      CREATE TABLE IF NOT EXISTS github_security_findings (
        id TEXT PRIMARY KEY,
        repository_id TEXT NOT NULL,
        category TEXT NOT NULL,
        indicator TEXT NOT NULL,
        evidence TEXT NOT NULL,
        file_path TEXT,
        line_number INTEGER,
        severity TEXT NOT NULL, -- 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
        confidence TEXT NOT NULL DEFAULT 'HIGH', -- 'LOW' | 'MEDIUM' | 'HIGH'
        created_at TEXT NOT NULL,
        FOREIGN KEY (repository_id) REFERENCES github_repositories(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_gh_sec_repo ON github_security_findings(repository_id);
      CREATE INDEX IF NOT EXISTS idx_gh_sec_severity ON github_security_findings(severity);
    `);

    // 5. Sandboxed Acquisitions
    db.exec(`
      CREATE TABLE IF NOT EXISTS github_acquisitions (
        id TEXT PRIMARY KEY,
        repository_id TEXT NOT NULL,
        target_path TEXT NOT NULL,
        commit_sha TEXT NOT NULL,
        ref_name TEXT NOT NULL,
        status TEXT NOT NULL, -- 'PENDING' | 'CLONED' | 'BUILDING' | 'TESTING' | 'COMPLETED' | 'FAILED' | 'PURGED'
        acquired_by TEXT NOT NULL,
        company_id TEXT,
        project_id TEXT,
        acquired_at TEXT NOT NULL,
        FOREIGN KEY (repository_id) REFERENCES github_repositories(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_gh_acq_repo ON github_acquisitions(repository_id);
      CREATE INDEX IF NOT EXISTS idx_gh_acq_status ON github_acquisitions(status);
    `);

    // 6. Sandboxed Artifacts
    db.exec(`
      CREATE TABLE IF NOT EXISTS github_artifacts (
        id TEXT PRIMARY KEY,
        acquisition_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        artifact_type TEXT NOT NULL, -- 'SOURCE' | 'LOG' | 'BUILD_OUTPUT' | 'TEST_OUTPUT' | 'BINARY'
        checksum_sha256 TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (acquisition_id) REFERENCES github_acquisitions(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_gh_art_acq ON github_artifacts(acquisition_id);
    `);

    // 7. Provenance & Copyright Preservation Ledger
    db.exec(`
      CREATE TABLE IF NOT EXISTS github_provenance (
        id TEXT PRIMARY KEY,
        repository_id TEXT NOT NULL,
        acquisition_id TEXT,
        url TEXT NOT NULL,
        owner TEXT NOT NULL,
        repository TEXT NOT NULL,
        commit_sha TEXT,
        branch_or_tag TEXT,
        license TEXT NOT NULL,
        original_copyright TEXT,
        modifications TEXT,
        integration_location TEXT,
        discovered_source TEXT NOT NULL DEFAULT 'GITHUB_SEARCH',
        created_at TEXT NOT NULL,
        FOREIGN KEY (repository_id) REFERENCES github_repositories(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_gh_prov_repo ON github_provenance(repository_id);
    `);

    // 8. Integration Proposals (Bridge to FP-07 Capability Fabric)
    db.exec(`
      CREATE TABLE IF NOT EXISTS github_integration_proposals (
        id TEXT PRIMARY KEY,
        repository_id TEXT NOT NULL,
        capability_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        protocol TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PROPOSED', -- 'PROPOSED' | 'REVIEWED' | 'APPROVED' | 'REJECTED' | 'REGISTERED'
        risk_level TEXT NOT NULL,
        trust_level TEXT NOT NULL DEFAULT 'UNVERIFIED',
        execution_command TEXT,
        requires_human_approval INTEGER NOT NULL DEFAULT 1,
        decision_reason TEXT,
        decided_by TEXT,
        decided_at TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (repository_id) REFERENCES github_repositories(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_gh_prop_repo ON github_integration_proposals(repository_id);
      CREATE INDEX IF NOT EXISTS idx_gh_prop_status ON github_integration_proposals(status);
    `);
  },
  down: (db: DatabaseSync): void => {
    db.exec(`
      DROP TABLE IF EXISTS github_integration_proposals;
      DROP TABLE IF EXISTS github_provenance;
      DROP TABLE IF EXISTS github_artifacts;
      DROP TABLE IF EXISTS github_acquisitions;
      DROP TABLE IF EXISTS github_security_findings;
      DROP TABLE IF EXISTS github_dependencies;
      DROP TABLE IF EXISTS github_repository_analysis;
      DROP TABLE IF EXISTS github_repositories;
    `);
  },
};
