/**
 * HṚṢĪKEŚA (हृषीकेश) — Migration 017: Safe Self-Improvement & Self-Maintenance Schema
 *
 * Tables for Phase 26:
 * 1. self_observations - Raw system metrics, errors, performance samples, and events
 * 2. self_anomalies - Detected anomalies, degradation patterns, and regression events
 * 3. improvement_proposals - Formal 20-category improvement proposals across 20 lifecycle states
 * 4. improvement_evidence - Cryptographically hashed evidence items (logs, metrics, stack traces)
 * 5. improvement_changesets - Isolated changesets, diffs, and sandboxed file records
 * 6. improvement_tests - Deterministic test execution results and delta evaluations
 * 7. improvement_benchmarks - Performance benchmark samples (latency, throughput, memory, CPU)
 * 8. improvement_approvals - Human-in-the-Loop (HITL) approval requests and sovereign decisions
 * 9. improvement_deployments - Staged/canary deployment lifecycle tracking
 * 10. improvement_rollbacks - Pre-change snapshots and automated rollback execution logs
 * 11. maintenance_jobs - Scheduled/executed self-maintenance jobs
 * 12. dependency_findings - Package version drift, vulnerability findings, and recommendations
 */

import { DatabaseSync } from 'node:sqlite';
import { Migration } from './migration.types.js';

export const migration017: Migration = {
  version: 17,
  name: '017_safe_self_improvement_schema',
  up: (db: DatabaseSync): void => {
    // 1. Self Observations Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS self_observations (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        source TEXT NOT NULL,
        category TEXT NOT NULL,
        metric_name TEXT,
        metric_value REAL,
        details TEXT NOT NULL,
        level TEXT NOT NULL DEFAULT 'INFO',
        timestamp TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_self_obs_source ON self_observations(source);
      CREATE INDEX IF NOT EXISTS idx_self_obs_category ON self_observations(category);
      CREATE INDEX IF NOT EXISTS idx_self_obs_level ON self_observations(level);
      CREATE INDEX IF NOT EXISTS idx_self_obs_timestamp ON self_observations(timestamp);
      CREATE INDEX IF NOT EXISTS idx_self_obs_company ON self_observations(company_id);
    `);

    // 2. Self Anomalies Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS self_anomalies (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        title TEXT NOT NULL,
        component TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'MEDIUM',
        description TEXT NOT NULL,
        evidence_summary TEXT NOT NULL,
        observation_ids TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        detected_at TEXT NOT NULL,
        resolved_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_self_anom_component ON self_anomalies(component);
      CREATE INDEX IF NOT EXISTS idx_self_anom_severity ON self_anomalies(severity);
      CREATE INDEX IF NOT EXISTS idx_self_anom_status ON self_anomalies(status);
      CREATE INDEX IF NOT EXISTS idx_self_anom_detected ON self_anomalies(detected_at);
      CREATE INDEX IF NOT EXISTS idx_self_anom_company ON self_anomalies(company_id);
    `);

    // 3. Improvement Proposals Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS improvement_proposals (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        anomaly_id TEXT,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        state TEXT NOT NULL DEFAULT 'PROPOSED',
        problem_statement TEXT NOT NULL,
        evidence_summary TEXT NOT NULL,
        expected_benefit TEXT NOT NULL,
        affected_components TEXT NOT NULL,
        risk_level TEXT NOT NULL DEFAULT 'LOW',
        confidence_score REAL NOT NULL DEFAULT 1.0,
        proposed_implementation TEXT NOT NULL,
        rollback_strategy TEXT NOT NULL,
        test_plan TEXT NOT NULL,
        benchmark_plan TEXT,
        requires_human_approval INTEGER NOT NULL DEFAULT 0,
        estimated_resource_cost TEXT NOT NULL DEFAULT 'LOW',
        version INTEGER NOT NULL DEFAULT 1,
        created_by_agent TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        expires_at TEXT,
        FOREIGN KEY (anomaly_id) REFERENCES self_anomalies(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_imp_prop_state ON improvement_proposals(state);
      CREATE INDEX IF NOT EXISTS idx_imp_prop_category ON improvement_proposals(category);
      CREATE INDEX IF NOT EXISTS idx_imp_prop_risk ON improvement_proposals(risk_level);
      CREATE INDEX IF NOT EXISTS idx_imp_prop_agent ON improvement_proposals(created_by_agent);
      CREATE INDEX IF NOT EXISTS idx_imp_prop_company ON improvement_proposals(company_id);
    `);

    // 4. Improvement Evidence Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS improvement_evidence (
        id TEXT PRIMARY KEY,
        proposal_id TEXT NOT NULL,
        evidence_type TEXT NOT NULL,
        title TEXT NOT NULL,
        data TEXT NOT NULL,
        hash TEXT NOT NULL,
        captured_at TEXT NOT NULL,
        FOREIGN KEY (proposal_id) REFERENCES improvement_proposals(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_imp_evid_proposal ON improvement_evidence(proposal_id);
      CREATE INDEX IF NOT EXISTS idx_imp_evid_type ON improvement_evidence(evidence_type);
    `);

    // 5. Improvement ChangeSets Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS improvement_changesets (
        id TEXT PRIMARY KEY,
        proposal_id TEXT NOT NULL,
        files TEXT NOT NULL,
        summary TEXT NOT NULL,
        author_agent TEXT NOT NULL,
        is_sandboxed INTEGER NOT NULL DEFAULT 0,
        sandbox_path TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (proposal_id) REFERENCES improvement_proposals(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_imp_cs_proposal ON improvement_changesets(proposal_id);
      CREATE INDEX IF NOT EXISTS idx_imp_cs_author ON improvement_changesets(author_agent);
    `);

    // 6. Improvement Tests Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS improvement_tests (
        id TEXT PRIMARY KEY,
        proposal_id TEXT NOT NULL,
        changeset_id TEXT NOT NULL,
        suite_name TEXT NOT NULL,
        total_tests INTEGER NOT NULL DEFAULT 0,
        passed_tests INTEGER NOT NULL DEFAULT 0,
        failed_tests INTEGER NOT NULL DEFAULT 0,
        skipped_tests INTEGER NOT NULL DEFAULT 0,
        duration_ms REAL NOT NULL DEFAULT 0,
        errors TEXT NOT NULL DEFAULT '[]',
        passed INTEGER NOT NULL DEFAULT 0,
        executed_at TEXT NOT NULL,
        FOREIGN KEY (proposal_id) REFERENCES improvement_proposals(id) ON DELETE CASCADE,
        FOREIGN KEY (changeset_id) REFERENCES improvement_changesets(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_imp_test_proposal ON improvement_tests(proposal_id);
      CREATE INDEX IF NOT EXISTS idx_imp_test_changeset ON improvement_tests(changeset_id);
      CREATE INDEX IF NOT EXISTS idx_imp_test_passed ON improvement_tests(passed);
    `);

    // 7. Improvement Benchmarks Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS improvement_benchmarks (
        id TEXT PRIMARY KEY,
        proposal_id TEXT NOT NULL,
        changeset_id TEXT NOT NULL,
        metric_name TEXT NOT NULL,
        unit TEXT NOT NULL,
        before_value REAL NOT NULL,
        after_value REAL NOT NULL,
        delta REAL NOT NULL,
        delta_percentage REAL NOT NULL,
        outcome TEXT NOT NULL DEFAULT 'UNCHANGED',
        executed_at TEXT NOT NULL,
        FOREIGN KEY (proposal_id) REFERENCES improvement_proposals(id) ON DELETE CASCADE,
        FOREIGN KEY (changeset_id) REFERENCES improvement_changesets(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_imp_bm_proposal ON improvement_benchmarks(proposal_id);
      CREATE INDEX IF NOT EXISTS idx_imp_bm_outcome ON improvement_benchmarks(outcome);
    `);

    // 8. Improvement Approvals Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS improvement_approvals (
        id TEXT PRIMARY KEY,
        proposal_id TEXT NOT NULL,
        requested_by TEXT NOT NULL,
        required_role TEXT NOT NULL DEFAULT 'RUSHIKESH',
        risk_level TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        resolution_rationale TEXT,
        resolved_by TEXT,
        resolved_at TEXT,
        requested_at TEXT NOT NULL,
        FOREIGN KEY (proposal_id) REFERENCES improvement_proposals(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_imp_appr_proposal ON improvement_approvals(proposal_id);
      CREATE INDEX IF NOT EXISTS idx_imp_appr_status ON improvement_approvals(status);
    `);

    // 9. Improvement Deployments Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS improvement_deployments (
        id TEXT PRIMARY KEY,
        proposal_id TEXT NOT NULL,
        changeset_id TEXT NOT NULL,
        stage TEXT NOT NULL DEFAULT 'SANDBOX',
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        deployed_at TEXT NOT NULL,
        verified_at TEXT,
        FOREIGN KEY (proposal_id) REFERENCES improvement_proposals(id) ON DELETE CASCADE,
        FOREIGN KEY (changeset_id) REFERENCES improvement_changesets(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_imp_dep_proposal ON improvement_deployments(proposal_id);
      CREATE INDEX IF NOT EXISTS idx_imp_dep_stage ON improvement_deployments(stage);
      CREATE INDEX IF NOT EXISTS idx_imp_dep_status ON improvement_deployments(status);
    `);

    // 10. Improvement Rollbacks Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS improvement_rollbacks (
        id TEXT PRIMARY KEY,
        proposal_id TEXT NOT NULL,
        deployment_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        snapshot_reference TEXT NOT NULL,
        verified_restored INTEGER NOT NULL DEFAULT 0,
        executed_at TEXT NOT NULL,
        FOREIGN KEY (proposal_id) REFERENCES improvement_proposals(id) ON DELETE CASCADE,
        FOREIGN KEY (deployment_id) REFERENCES improvement_deployments(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_imp_rb_proposal ON improvement_rollbacks(proposal_id);
      CREATE INDEX IF NOT EXISTS idx_imp_rb_dep ON improvement_rollbacks(deployment_id);
    `);

    // 11. Maintenance Jobs Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS maintenance_jobs (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        target TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'SCHEDULED',
        details TEXT NOT NULL,
        reclaimed_bytes INTEGER,
        duration_ms REAL,
        scheduled_at TEXT NOT NULL,
        executed_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_maint_type ON maintenance_jobs(type);
      CREATE INDEX IF NOT EXISTS idx_maint_status ON maintenance_jobs(status);
      CREATE INDEX IF NOT EXISTS idx_maint_sched ON maintenance_jobs(scheduled_at);
    `);

    // 12. Dependency Findings Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS dependency_findings (
        id TEXT PRIMARY KEY,
        package_name TEXT NOT NULL,
        current_version TEXT NOT NULL,
        latest_version TEXT NOT NULL,
        is_outdated INTEGER NOT NULL DEFAULT 0,
        has_breaking_changes INTEGER NOT NULL DEFAULT 0,
        vulnerability_severity TEXT,
        recommendation TEXT NOT NULL,
        detected_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_dep_pkg ON dependency_findings(package_name);
      CREATE INDEX IF NOT EXISTS idx_dep_outdated ON dependency_findings(is_outdated);
    `);
  },
  down: (db: DatabaseSync): void => {
    db.exec(`
      DROP TABLE IF EXISTS dependency_findings;
      DROP TABLE IF EXISTS maintenance_jobs;
      DROP TABLE IF EXISTS improvement_rollbacks;
      DROP TABLE IF EXISTS improvement_deployments;
      DROP TABLE IF EXISTS improvement_approvals;
      DROP TABLE IF EXISTS improvement_benchmarks;
      DROP TABLE IF EXISTS improvement_tests;
      DROP TABLE IF EXISTS improvement_changesets;
      DROP TABLE IF EXISTS improvement_evidence;
      DROP TABLE IF EXISTS improvement_proposals;
      DROP TABLE IF EXISTS self_anomalies;
      DROP TABLE IF EXISTS self_observations;
    `);
  },
};
