/**
 * HṚṢĪKEŚA (हृषीकेश) — Migration 011: Skills & Procedural Intelligence Schema
 *
 * Phase 20: Reusable, Versioned, Permission-Aware Procedural Intelligence
 *
 * Tables:
 * 1. skills - Master catalog of registered procedural skills
 * 2. skill_versions - Immutable history and definition snapshots per version
 * 3. skill_steps - Structured DAG steps defining procedural workflows
 * 4. skill_permissions - Declared upper-bound permissions and required capabilities
 * 5. skill_usage - Telemetry, duration, and execution history
 * 6. skill_improvements - Safe human-reviewed improvement proposals
 */

import { DatabaseSync } from 'node:sqlite';
import { Migration } from './migration.types.js';

export const migration011: Migration = {
  version: 11,
  name: '011_skills_schema',
  up: (db: DatabaseSync): void => {
    // 1. Master Skills Catalog
    db.exec(`
      CREATE TABLE IF NOT EXISTS skills (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'CUSTOM',
        owner TEXT NOT NULL DEFAULT 'SYSTEM',
        scope TEXT NOT NULL DEFAULT 'GLOBAL',
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        version TEXT NOT NULL DEFAULT '1.0.0',
        risk_level TEXT NOT NULL DEFAULT 'TIER_1',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);
      CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);
      CREATE INDEX IF NOT EXISTS idx_skills_scope ON skills(scope);
      CREATE INDEX IF NOT EXISTS idx_skills_status ON skills(status);
      CREATE INDEX IF NOT EXISTS idx_skills_risk ON skills(risk_level);
    `);

    // 2. Skill Version Snapshots
    db.exec(`
      CREATE TABLE IF NOT EXISTS skill_versions (
        id TEXT PRIMARY KEY,
        skill_id TEXT NOT NULL,
        version TEXT NOT NULL,
        definition_json TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_at TEXT NOT NULL,
        FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
        UNIQUE (skill_id, version)
      );
      CREATE INDEX IF NOT EXISTS idx_skill_versions_skill ON skill_versions(skill_id);
      CREATE INDEX IF NOT EXISTS idx_skill_versions_ver ON skill_versions(version);
    `);

    // 3. Structured Procedural Steps
    db.exec(`
      CREATE TABLE IF NOT EXISTS skill_steps (
        id TEXT PRIMARY KEY,
        skill_id TEXT NOT NULL,
        version TEXT NOT NULL,
        step_index INTEGER NOT NULL,
        step_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        step_type TEXT NOT NULL DEFAULT 'TOOL',
        dependencies_json TEXT NOT NULL DEFAULT '[]',
        capability TEXT,
        tool TEXT,
        agent_id TEXT,
        inputs_json TEXT NOT NULL DEFAULT '{}',
        verification_json TEXT,
        timeout_ms INTEGER NOT NULL DEFAULT 60000,
        retry_policy_json TEXT NOT NULL DEFAULT '{"maxAttempts":1,"backoffMs":1000}',
        created_at TEXT NOT NULL,
        FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_skill_steps_skill ON skill_steps(skill_id, version);
      CREATE INDEX IF NOT EXISTS idx_skill_steps_type ON skill_steps(step_type);
    `);

    // 4. Declared Permissions & Capabilities
    db.exec(`
      CREATE TABLE IF NOT EXISTS skill_permissions (
        id TEXT PRIMARY KEY,
        skill_id TEXT NOT NULL,
        version TEXT NOT NULL,
        max_danger_tier INTEGER NOT NULL DEFAULT 1,
        required_capabilities_json TEXT NOT NULL DEFAULT '[]',
        required_tools_json TEXT NOT NULL DEFAULT '[]',
        requires_human_approval INTEGER NOT NULL DEFAULT 0,
        allowed_scopes_json TEXT NOT NULL DEFAULT '["GLOBAL"]',
        created_at TEXT NOT NULL,
        FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_skill_perms_skill ON skill_permissions(skill_id);
    `);

    // 5. Execution Metrics & Usage Telemetry
    db.exec(`
      CREATE TABLE IF NOT EXISTS skill_usage (
        id TEXT PRIMARY KEY,
        skill_id TEXT NOT NULL,
        version TEXT NOT NULL,
        mission_id TEXT,
        goal_id TEXT,
        agent_id TEXT,
        status TEXT NOT NULL,
        duration_ms INTEGER NOT NULL,
        step_count INTEGER NOT NULL DEFAULT 0,
        error TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_skill_usage_skill ON skill_usage(skill_id);
      CREATE INDEX IF NOT EXISTS idx_skill_usage_status ON skill_usage(status);
      CREATE INDEX IF NOT EXISTS idx_skill_usage_created ON skill_usage(created_at);
    `);

    // 6. Safe Skill Improvement Proposals (Self-evolution with human approval)
    db.exec(`
      CREATE TABLE IF NOT EXISTS skill_improvements (
        id TEXT PRIMARY KEY,
        skill_id TEXT NOT NULL,
        current_version TEXT NOT NULL,
        reason TEXT NOT NULL,
        evidence TEXT NOT NULL,
        proposed_changes_json TEXT NOT NULL,
        confidence REAL NOT NULL DEFAULT 0.8,
        status TEXT NOT NULL DEFAULT 'PROPOSED',
        created_at TEXT NOT NULL,
        reviewed_at TEXT,
        FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_skill_improvements_skill ON skill_improvements(skill_id);
      CREATE INDEX IF NOT EXISTS idx_skill_improvements_status ON skill_improvements(status);
    `);
  },
  down: (db: DatabaseSync): void => {
    db.exec(`
      DROP TABLE IF EXISTS skill_improvements;
      DROP TABLE IF EXISTS skill_usage;
      DROP TABLE IF EXISTS skill_permissions;
      DROP TABLE IF EXISTS skill_steps;
      DROP TABLE IF EXISTS skill_versions;
      DROP TABLE IF EXISTS skills;
    `);
  },
};
