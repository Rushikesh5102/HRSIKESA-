/**
 * HṚṢĪKEŚA (हृषीकेश) — Migration 031: Universal Creation & Media Studio Schema
 *
 * FP-17: Persistent storage for CreationJobs, CreationArtifacts, Iterations,
 * Verifications, Provenance Records, DesignContexts, and Reference Assets.
 *
 * Designed following strict SQLite best practices learned from FP-16:
 * - Proper foreign keys and cascade rules
 * - Defensive nullable fields & JSON defaults
 * - Non-destructive index creation
 */

import { DatabaseSync } from 'node:sqlite';
import { Migration } from './migration.types.js';

export const migration031: Migration = {
  version: 31,
  name: '031_creation_media_schema',
  up: (db: DatabaseSync): void => {
    // 1. Design Contexts
    db.exec(`
      CREATE TABLE IF NOT EXISTS design_contexts (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        company_id TEXT,
        name TEXT NOT NULL,
        brand_identity_json TEXT NOT NULL DEFAULT '{}',
        visual_references_json TEXT NOT NULL DEFAULT '[]',
        spacing_rules_json TEXT NOT NULL DEFAULT '{}',
        accessibility_requirements_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_design_contexts_proj ON design_contexts(project_id);
      CREATE INDEX IF NOT EXISTS idx_design_contexts_comp ON design_contexts(company_id);
    `);

    // 2. Creation Jobs
    db.exec(`
      CREATE TABLE IF NOT EXISTS creation_jobs (
        id TEXT PRIMARY KEY,
        owner TEXT NOT NULL,
        company_id TEXT,
        project_id TEXT,
        type TEXT NOT NULL,
        objective TEXT NOT NULL,
        prompt TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'DRAFT',
        progress_percentage REAL NOT NULL DEFAULT 0.0,
        input_artifacts_json TEXT NOT NULL DEFAULT '[]',
        model_provider TEXT,
        selected_model TEXT,
        application_or_tool TEXT,
        workflow_id TEXT,
        skill_id TEXT,
        parameters_json TEXT NOT NULL DEFAULT '{}',
        constraints_json TEXT NOT NULL DEFAULT '{}',
        style TEXT,
        design_context_id TEXT,
        current_iteration INTEGER NOT NULL DEFAULT 0,
        max_iterations INTEGER NOT NULL DEFAULT 3,
        cost_estimate_usd REAL,
        actual_cost_usd REAL,
        requires_approval INTEGER NOT NULL DEFAULT 0,
        approval_status TEXT,
        approved_by TEXT,
        approved_at TEXT,
        verification_json TEXT,
        provenance_json TEXT NOT NULL DEFAULT '{}',
        license_information TEXT NOT NULL DEFAULT 'PROPRIETARY',
        error_message TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_creation_jobs_owner ON creation_jobs(owner);
      CREATE INDEX IF NOT EXISTS idx_creation_jobs_type ON creation_jobs(type);
      CREATE INDEX IF NOT EXISTS idx_creation_jobs_status ON creation_jobs(status);
      CREATE INDEX IF NOT EXISTS idx_creation_jobs_company ON creation_jobs(company_id);
      CREATE INDEX IF NOT EXISTS idx_creation_jobs_project ON creation_jobs(project_id);
    `);

    // 3. Creation Artifacts
    db.exec(`
      CREATE TABLE IF NOT EXISTS creation_artifacts (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        location TEXT NOT NULL,
        format TEXT NOT NULL,
        size_bytes INTEGER NOT NULL DEFAULT 0,
        dimensions_json TEXT,
        duration_seconds REAL,
        mime_type TEXT NOT NULL,
        sha256 TEXT,
        version INTEGER NOT NULL DEFAULT 1,
        verified INTEGER NOT NULL DEFAULT 0,
        verification_json TEXT,
        provenance_json TEXT NOT NULL DEFAULT '{}',
        license_info TEXT NOT NULL DEFAULT 'PROPRIETARY',
        preview_url_or_path TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(job_id) REFERENCES creation_jobs(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_creation_artifacts_job ON creation_artifacts(job_id);
      CREATE INDEX IF NOT EXISTS idx_creation_artifacts_type ON creation_artifacts(type);
    `);

    // 4. Creation Iterations
    db.exec(`
      CREATE TABLE IF NOT EXISTS creation_iterations (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        iteration_number INTEGER NOT NULL,
        reason TEXT NOT NULL,
        modifications_requested TEXT NOT NULL,
        result_artifact_id TEXT,
        verification_json TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY(job_id) REFERENCES creation_jobs(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_creation_iterations_job ON creation_iterations(job_id);
    `);

    // 5. Reference Assets
    db.exec(`
      CREATE TABLE IF NOT EXISTS creation_reference_assets (
        id TEXT PRIMARY KEY,
        job_id TEXT,
        source TEXT NOT NULL,
        owner TEXT,
        url_or_path TEXT NOT NULL,
        retrieval_time TEXT NOT NULL,
        license TEXT NOT NULL,
        intended_use TEXT NOT NULL,
        transformation_relationship TEXT,
        sha256 TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_creation_references_job ON creation_reference_assets(job_id);
    `);
  },
};
