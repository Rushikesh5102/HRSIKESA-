/**
 * HṚṢĪKEŚA (हृषीकेश) — Migration 009: Advanced Model Routing Schema
 *
 * Phase 18: Provider- & Model-Agnostic Intelligent Routing
 *
 * New tables:
 * 1. model_usage_audits - Persistent audit log of all routed model calls, tokens, latency, cost, and reasons
 * 2. model_preferences - User routing preferences, active policy, and budget/privacy thresholds
 */

import { DatabaseSync } from 'node:sqlite';
import { Migration } from './migration.types.js';

export const migration009: Migration = {
  version: 9,
  name: '009_model_routing_schema',
  up: (db: DatabaseSync): void => {
    // 1. Model Usage Audits Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS model_usage_audits (
        id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL,
        model_id TEXT NOT NULL,
        task_type TEXT NOT NULL DEFAULT 'CONVERSATION',
        complexity TEXT NOT NULL DEFAULT 'STANDARD',
        agent_id TEXT,
        goal_id TEXT,
        mission_id TEXT,
        prompt_tokens INTEGER DEFAULT 0,
        completion_tokens INTEGER DEFAULT 0,
        total_tokens INTEGER DEFAULT 0,
        estimated_cost_usd REAL DEFAULT 0.0,
        latency_ms INTEGER DEFAULT 0,
        success INTEGER NOT NULL DEFAULT 1, -- 1=true, 0=false
        error_message TEXT,
        fallback_occurred INTEGER NOT NULL DEFAULT 0,
        fallback_reason TEXT,
        routing_reason TEXT,
        policy_applied TEXT DEFAULT 'BALANCED',
        created_at TEXT NOT NULL,
        FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL,
        FOREIGN KEY (mission_id) REFERENCES agent_missions(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_model_audits_provider ON model_usage_audits(provider_id);
      CREATE INDEX IF NOT EXISTS idx_model_audits_model ON model_usage_audits(model_id);
      CREATE INDEX IF NOT EXISTS idx_model_audits_task_type ON model_usage_audits(task_type);
      CREATE INDEX IF NOT EXISTS idx_model_audits_agent ON model_usage_audits(agent_id);
      CREATE INDEX IF NOT EXISTS idx_model_audits_created ON model_usage_audits(created_at);
    `);

    // 2. Model Preferences Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS model_preferences (
        id TEXT PRIMARY KEY DEFAULT 'default',
        active_policy TEXT NOT NULL DEFAULT 'BALANCED', -- 'BALANCED' | 'LOCAL_FIRST' | 'QUALITY_FIRST' | 'SPEED_FIRST' | 'COST_FIRST' | 'PRIVACY_FIRST'
        privacy_threshold TEXT NOT NULL DEFAULT 'NORMAL', -- 'PUBLIC' | 'NORMAL' | 'PRIVATE' | 'HIGHLY_PRIVATE'
        cost_limit_usd REAL DEFAULT 10.0,
        default_local_model TEXT DEFAULT 'qwen2.5:7b',
        default_cloud_model TEXT DEFAULT 'gpt-4o',
        metadata TEXT,
        updated_at TEXT NOT NULL
      );
    `);
  }
};
