/**
 * HṚṢĪKEŚA (हृषीकेश) — Multimodal Vision + Advanced Voice Schema
 *
 * Migration 015: Establishes durable persistence for unified multimodal perception,
 * vision observations, bounded voice interactions, session history, and preferences.
 */

import { Migration } from './migration.types.js';

export const migration015: Migration = {
  version: 15,
  name: '015_multimodal_vision_voice_schema',
  up: (db) => {
    // 1. Multimodal Sessions Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS multimodal_sessions (
        id TEXT PRIMARY KEY,
        session_type TEXT NOT NULL DEFAULT 'INTERACTIVE',
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        user_id TEXT NOT NULL DEFAULT 'Rushikesh Pattiwar',
        active_modalities TEXT NOT NULL,
        current_app TEXT,
        current_window TEXT,
        camera_state TEXT NOT NULL DEFAULT 'OFF',
        microphone_state TEXT NOT NULL DEFAULT 'IDLE',
        speaker_state TEXT NOT NULL DEFAULT 'IDLE',
        started_at TEXT NOT NULL,
        ended_at TEXT,
        metadata TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_multimodal_sessions_status ON multimodal_sessions(status);
      CREATE INDEX IF NOT EXISTS idx_multimodal_sessions_started ON multimodal_sessions(started_at);
    `);

    // 2. Multimodal Interactions Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS multimodal_interactions (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        input_type TEXT NOT NULL,
        raw_text TEXT,
        transcript_confidence REAL,
        language TEXT DEFAULT 'en',
        audio_duration_ms INTEGER,
        image_dimensions TEXT,
        privacy_tier TEXT NOT NULL DEFAULT 'PRIVATE',
        response_text TEXT,
        response_audio_duration_ms INTEGER,
        model_id TEXT,
        latency_ms INTEGER,
        created_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES multimodal_sessions(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_mm_interact_session ON multimodal_interactions(session_id);
      CREATE INDEX IF NOT EXISTS idx_mm_interact_type ON multimodal_interactions(input_type);
      CREATE INDEX IF NOT EXISTS idx_mm_interact_privacy ON multimodal_interactions(privacy_tier);
      CREATE INDEX IF NOT EXISTS idx_mm_interact_created ON multimodal_interactions(created_at);
    `);

    // 3. Vision Observations Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS vision_observations (
        id TEXT PRIMARY KEY,
        interaction_id TEXT,
        source_type TEXT NOT NULL,
        target_app TEXT,
        target_window TEXT,
        ocr_text_summary TEXT,
        uia_elements_count INTEGER DEFAULT 0,
        visual_elements_count INTEGER DEFAULT 0,
        confidence REAL NOT NULL DEFAULT 1.0,
        detected_challenges TEXT,
        comparison_state TEXT DEFAULT 'UNCHANGED',
        verification_status TEXT DEFAULT 'PENDING',
        verification_evidence TEXT,
        captured_at TEXT NOT NULL,
        FOREIGN KEY (interaction_id) REFERENCES multimodal_interactions(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_vision_obs_interaction ON vision_observations(interaction_id);
      CREATE INDEX IF NOT EXISTS idx_vision_obs_source ON vision_observations(source_type);
      CREATE INDEX IF NOT EXISTS idx_vision_obs_app ON vision_observations(target_app);
      CREATE INDEX IF NOT EXISTS idx_vision_obs_captured ON vision_observations(captured_at);
    `);

    // 4. Voice Interactions Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS voice_interactions (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        vad_triggered INTEGER NOT NULL DEFAULT 0,
        partial_transcripts_count INTEGER NOT NULL DEFAULT 0,
        final_transcript TEXT,
        stt_confidence REAL DEFAULT 1.0,
        language_detected TEXT DEFAULT 'en',
        audio_duration_ms INTEGER DEFAULT 0,
        tts_duration_ms INTEGER DEFAULT 0,
        interrupted_by_barge_in INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES multimodal_sessions(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_voice_interact_session ON voice_interactions(session_id);
      CREATE INDEX IF NOT EXISTS idx_voice_interact_created ON voice_interactions(created_at);
    `);

    // 5. Multimodal Preferences Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS multimodal_preferences (
        id TEXT PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_mm_pref_key ON multimodal_preferences(key);
    `);
  },
  down: (db) => {
    db.exec(`
      DROP TABLE IF EXISTS multimodal_preferences;
      DROP TABLE IF EXISTS voice_interactions;
      DROP TABLE IF EXISTS vision_observations;
      DROP TABLE IF EXISTS multimodal_interactions;
      DROP TABLE IF EXISTS multimodal_sessions;
    `);
  },
};
