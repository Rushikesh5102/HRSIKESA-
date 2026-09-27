/**
 * HṚṢĪKEŚA (हृषीकेश) — Migration 019: Persistent Working Memory & Conversational Continuity Schema
 *
 * Track A / INT-008: Persistent Working Memory & Conversational Continuity Engine
 *
 * Adds:
 * 1. conversation_threads - Bounded, state-aware conversational threads
 * 2. working_memory_items - Short/medium-lived, task-oriented active items
 * 3. conversation_checkpoints - Resumable work snapshots surviving restarts
 * 4. pending_items - Active questions, actions, blockers, and next steps
 */

import { DatabaseSync } from 'node:sqlite';
import { Migration } from './migration.types.js';

export const migration019: Migration = {
  version: 19,
  name: '019_working_memory_schema',
  up: (db: DatabaseSync): void => {
    // 1. Conversation Threads Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS conversation_threads (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        target_project_id TEXT,
        target_company_id TEXT,
        target_goal_id TEXT,
        target_mission_id TEXT,
        active_task_id TEXT,
        priority INTEGER NOT NULL DEFAULT 50,
        summary TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_active_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_conv_threads_session ON conversation_threads(session_id);
      CREATE INDEX IF NOT EXISTS idx_conv_threads_status ON conversation_threads(status);
      CREATE INDEX IF NOT EXISTS idx_conv_threads_project ON conversation_threads(target_project_id);
      CREATE INDEX IF NOT EXISTS idx_conv_threads_last_active ON conversation_threads(last_active_at);
    `);

    // 2. Working Memory Items Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS working_memory_items (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        thread_id TEXT,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        scope TEXT NOT NULL DEFAULT 'SESSION',
        source TEXT NOT NULL DEFAULT 'SYSTEM',
        confidence REAL NOT NULL DEFAULT 1.0,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        priority INTEGER NOT NULL DEFAULT 50,
        related_entity_id TEXT,
        related_project_id TEXT,
        related_company_id TEXT,
        related_goal_id TEXT,
        related_mission_id TEXT,
        related_task_id TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_referenced_at TEXT NOT NULL,
        expires_at TEXT,
        FOREIGN KEY (thread_id) REFERENCES conversation_threads(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_wm_items_session ON working_memory_items(session_id);
      CREATE INDEX IF NOT EXISTS idx_wm_items_thread ON working_memory_items(thread_id);
      CREATE INDEX IF NOT EXISTS idx_wm_items_type ON working_memory_items(type);
      CREATE INDEX IF NOT EXISTS idx_wm_items_status ON working_memory_items(status);
      CREATE INDEX IF NOT EXISTS idx_wm_items_project ON working_memory_items(related_project_id);
      CREATE INDEX IF NOT EXISTS idx_wm_items_expires ON working_memory_items(expires_at);
    `);

    // 3. Conversation Checkpoints Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS conversation_checkpoints (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        thread_id TEXT NOT NULL,
        title TEXT NOT NULL,
        project_id TEXT,
        company_id TEXT,
        goal_id TEXT,
        mission_id TEXT,
        task_id TEXT,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        state_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (thread_id) REFERENCES conversation_threads(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_conv_chk_session ON conversation_checkpoints(session_id);
      CREATE INDEX IF NOT EXISTS idx_conv_chk_thread ON conversation_checkpoints(thread_id);
      CREATE INDEX IF NOT EXISTS idx_conv_chk_status ON conversation_checkpoints(status);
      CREATE INDEX IF NOT EXISTS idx_conv_chk_created ON conversation_checkpoints(created_at);
    `);

    // 4. Pending Items Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS pending_items (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        thread_id TEXT,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'OPEN',
        priority INTEGER NOT NULL DEFAULT 50,
        assigned_agent_id TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        expires_at TEXT,
        FOREIGN KEY (thread_id) REFERENCES conversation_threads(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_pending_items_session ON pending_items(session_id);
      CREATE INDEX IF NOT EXISTS idx_pending_items_thread ON pending_items(thread_id);
      CREATE INDEX IF NOT EXISTS idx_pending_items_status ON pending_items(status);
    `);
  },
};
