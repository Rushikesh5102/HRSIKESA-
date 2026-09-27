/**
 * HṚṢĪKEŚA (हृषीकेश) — Migration 034: Self-Evolution Engine & Worktree Schema
 *
 * Connects the self-improvement and autonomous software-engineering infrastructure
 * to HṚṢĪKEŚA's own source code through a controlled, observable, reversible development environment.
 *
 * Tables:
 * 1. evolution_objectives - Measurable self-evolution objectives with acceptance criteria & budgets
 * 2. evolution_experiments - Isolated worktree experiments, hypotheses, test/benchmark results
 * 3. evolution_checkpoints - Durable execution checkpoints with rollback info & FP-19 integration
 * 4. evolution_supervisor_reviews - Independent reviews and votes from Antigravity, Jules, and Spark
 * 5. evolution_audit_logs - Durable audit trail for gateway capabilities and safety operations
 */

import { DatabaseSync } from 'node:sqlite';
import { Migration } from './migration.types.js';

export const migration034: Migration = {
  version: 34,
  name: '034_self_evolution_engine_schema',
  up: (db: DatabaseSync): void => {
    // 1. Evolution Objectives Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS evolution_objectives (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        acceptance_criteria_json TEXT NOT NULL DEFAULT '[]',
        baseline_measurements_json TEXT NOT NULL DEFAULT '{}',
        allowed_scope_json TEXT NOT NULL DEFAULT '[]',
        prohibited_actions_json TEXT NOT NULL DEFAULT '[]',
        resource_budget_json TEXT NOT NULL DEFAULT '{}',
        time_budget_ms INTEGER NOT NULL DEFAULT 3600000,
        max_experiments INTEGER NOT NULL DEFAULT 10,
        max_consecutive_failures INTEGER NOT NULL DEFAULT 3,
        stagnation_threshold INTEGER NOT NULL DEFAULT 3,
        required_regression_suites_json TEXT NOT NULL DEFAULT '[]',
        required_security_checks_json TEXT NOT NULL DEFAULT '[]',
        supervisor_quorum TEXT NOT NULL DEFAULT 'UNANIMOUS_SAFETY',
        termination_conditions_json TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'ACCEPTED',
        progress_percentage REAL NOT NULL DEFAULT 0.0,
        created_at TEXT NOT NULL,
        started_at TEXT,
        completed_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_evo_obj_status ON evolution_objectives(status);
      CREATE INDEX IF NOT EXISTS idx_evo_obj_created ON evolution_objectives(created_at);
    `);

    // 2. Evolution Experiments Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS evolution_experiments (
        id TEXT PRIMARY KEY,
        objective_id TEXT NOT NULL,
        experiment_number INTEGER NOT NULL,
        hypothesis TEXT NOT NULL,
        baseline_commit TEXT NOT NULL,
        worktree_path TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'WORKTREE_CREATED',
        changed_files_json TEXT NOT NULL DEFAULT '[]',
        diff TEXT,
        test_results_json TEXT NOT NULL DEFAULT '{}',
        benchmark_results_json TEXT NOT NULL DEFAULT '{}',
        security_results_json TEXT NOT NULL DEFAULT '{}',
        supervisor_results_json TEXT NOT NULL DEFAULT '{}',
        decision TEXT NOT NULL DEFAULT 'PENDING',
        decision_reason TEXT,
        checkpoint_id TEXT,
        rollback_info_json TEXT,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        FOREIGN KEY (objective_id) REFERENCES evolution_objectives(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_evo_exp_objective ON evolution_experiments(objective_id);
      CREATE INDEX IF NOT EXISTS idx_evo_exp_status ON evolution_experiments(status);
      CREATE INDEX IF NOT EXISTS idx_evo_exp_decision ON evolution_experiments(decision);
    `);

    // 3. Evolution Checkpoints Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS evolution_checkpoints (
        id TEXT PRIMARY KEY,
        objective_id TEXT NOT NULL,
        experiment_id TEXT,
        milestone_name TEXT NOT NULL,
        git_commit_sha TEXT NOT NULL,
        worktree_snapshot_path TEXT,
        state_snapshot_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        FOREIGN KEY (objective_id) REFERENCES evolution_objectives(id) ON DELETE CASCADE,
        FOREIGN KEY (experiment_id) REFERENCES evolution_experiments(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_evo_chk_obj ON evolution_checkpoints(objective_id);
      CREATE INDEX IF NOT EXISTS idx_evo_chk_exp ON evolution_checkpoints(experiment_id);
    `);

    // 4. Evolution Supervisor Reviews Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS evolution_supervisor_reviews (
        id TEXT PRIMARY KEY,
        experiment_id TEXT NOT NULL,
        supervisor_name TEXT NOT NULL, -- 'antigravity' | 'jules' | 'spark'
        vote TEXT NOT NULL,            -- 'APPROVE' | 'REJECT' | 'PAUSE' | 'EMERGENCY_STOP'
        confidence REAL NOT NULL DEFAULT 1.0,
        findings_json TEXT NOT NULL DEFAULT '[]',
        violations_json TEXT NOT NULL DEFAULT '[]',
        recommendation TEXT NOT NULL,
        evaluated_at TEXT NOT NULL,
        FOREIGN KEY (experiment_id) REFERENCES evolution_experiments(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_evo_sup_exp ON evolution_supervisor_reviews(experiment_id);
      CREATE INDEX IF NOT EXISTS idx_evo_sup_name ON evolution_supervisor_reviews(supervisor_name);
    `);

    // 5. Evolution Audit Logs Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS evolution_audit_logs (
        id TEXT PRIMARY KEY,
        objective_id TEXT,
        experiment_id TEXT,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        capability TEXT NOT NULL,
        files_touched_json TEXT NOT NULL DEFAULT '[]',
        result TEXT NOT NULL,
        evidence_json TEXT NOT NULL DEFAULT '{}',
        resource_usage_json TEXT NOT NULL DEFAULT '{}',
        timestamp TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_evo_audit_obj ON evolution_audit_logs(objective_id);
      CREATE INDEX IF NOT EXISTS idx_evo_audit_exp ON evolution_audit_logs(experiment_id);
      CREATE INDEX IF NOT EXISTS idx_evo_audit_time ON evolution_audit_logs(timestamp);
    `);
  },
  down: (db: DatabaseSync): void => {
    db.exec(`
      DROP TABLE IF EXISTS evolution_audit_logs;
      DROP TABLE IF EXISTS evolution_supervisor_reviews;
      DROP TABLE IF EXISTS evolution_checkpoints;
      DROP TABLE IF EXISTS evolution_experiments;
      DROP TABLE IF EXISTS evolution_objectives;
    `);
  },
};
