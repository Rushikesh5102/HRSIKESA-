/**
 * HRSIKESA - Migration 006: Goal Engine Schema
 *
 * New tables for Phase 15 Autonomous Goal Engine:
 * 1. goals - Persistent high-level goal records with lifecycle, budget, and provenance
 * 2. goal_milestones - Ordered milestone records that map to existing missions
 * Schema extensions:
 * 3. agent_missions.goal_id + agent_missions.milestone_id — foreign key provenance
 * 4. mission_artifacts.goal_id — artifact provenance chain
 */

import { DatabaseSync } from 'node:sqlite';
import { Migration } from './migration.types.js';

export const migration006: Migration = {
  version: 6,
  name: '006_goal_engine_schema',
  up: (db: DatabaseSync): void => {
    // 1. Goals Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        project_id TEXT,
        product_id TEXT,
        parent_goal_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        objective TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'DRAFT',
        priority TEXT NOT NULL DEFAULT 'NORMAL',
        deadline TEXT,
        budget TEXT,
        constraints TEXT,
        success_criteria TEXT,
        failure_criteria TEXT,
        verification_plan TEXT,
        plan TEXT,
        report TEXT,
        verification_result TEXT,
        blocked_reason TEXT,
        created_by TEXT NOT NULL DEFAULT 'rushikesh',
        metadata TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
        FOREIGN KEY (parent_goal_id) REFERENCES goals(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
      CREATE INDEX IF NOT EXISTS idx_goals_company ON goals(company_id);
      CREATE INDEX IF NOT EXISTS idx_goals_project ON goals(project_id);
      CREATE INDEX IF NOT EXISTS idx_goals_priority ON goals(priority);
    `);

    // 2. Goal Milestones Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS goal_milestones (
        id TEXT PRIMARY KEY,
        goal_id TEXT NOT NULL,
        mission_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        sequence INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'PENDING',
        success_criteria TEXT,
        verification_criteria TEXT,
        required_agent_ids TEXT,
        required_capabilities TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE,
        FOREIGN KEY (mission_id) REFERENCES agent_missions(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal ON goal_milestones(goal_id);
      CREATE INDEX IF NOT EXISTS idx_goal_milestones_status ON goal_milestones(status);
      CREATE INDEX IF NOT EXISTS idx_goal_milestones_sequence ON goal_milestones(goal_id, sequence);
    `);

    // 3. Extend agent_missions with goal_id and milestone_id
    const missionColumns = db.prepare('PRAGMA table_info(agent_missions)').all() as { name: string }[];
    const missionColNames = new Set(missionColumns.map(c => c.name));

    if (!missionColNames.has('goal_id')) {
      db.exec('ALTER TABLE agent_missions ADD COLUMN goal_id TEXT;');
    }
    if (!missionColNames.has('milestone_id')) {
      db.exec('ALTER TABLE agent_missions ADD COLUMN milestone_id TEXT;');
    }

    // 4. Extend mission_artifacts with goal_id and milestone_id
    const artifactColumns = db.prepare('PRAGMA table_info(mission_artifacts)').all() as { name: string }[];
    const artifactColNames = new Set(artifactColumns.map(c => c.name));

    if (!artifactColNames.has('goal_id')) {
      db.exec('ALTER TABLE mission_artifacts ADD COLUMN goal_id TEXT;');
    }
    if (!artifactColNames.has('milestone_id')) {
      db.exec('ALTER TABLE mission_artifacts ADD COLUMN milestone_id TEXT;');
    }
  },

  down: (db: DatabaseSync): void => {
    db.exec(`
      DROP TABLE IF EXISTS goal_milestones;
      DROP TABLE IF EXISTS goals;
    `);
  }
};
