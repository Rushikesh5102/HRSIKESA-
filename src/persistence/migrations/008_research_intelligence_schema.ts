/**
 * HṚṢĪKEŚA (हृषीकेश) — Migration 008: Research Intelligence Schema
 *
 * Phase 17: Advanced Research & Web Intelligence
 *
 * New tables:
 * 1. research_studies - Persistent research study entities with lifecycle, budget, question, and synthesis
 * 2. research_sources - Normalized source catalog with provenance, content hashes, credibility tiers, and freshness
 * 3. research_evidence - Extracted quotes, facts, claims, and inferences linked to sources
 * 4. research_findings - Synthesized findings with corroboration, contradiction records, and citations
 */

import { DatabaseSync } from 'node:sqlite';
import { Migration } from './migration.types.js';

export const migration008: Migration = {
  version: 8,
  name: '008_research_intelligence_schema',
  up: (db: DatabaseSync): void => {
    // 1. Research Studies Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS research_studies (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        question TEXT NOT NULL,
        objective TEXT NOT NULL,
        scope TEXT,
        status TEXT NOT NULL DEFAULT 'DRAFT', -- 'DRAFT' | 'PLANNING' | 'RESEARCHING' | 'VERIFYING' | 'WAITING' | 'BLOCKED' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'PAUSED'
        depth TEXT NOT NULL DEFAULT 'STANDARD', -- 'QUICK' | 'STANDARD' | 'DEEP'
        budget TEXT, -- JSON GoalBudget/ResearchBudget
        summary TEXT,
        conclusion TEXT,
        confidence_score REAL DEFAULT 0.0,
        company_id TEXT,
        project_id TEXT,
        goal_id TEXT,
        created_by TEXT NOT NULL DEFAULT 'rushikesh',
        metadata TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
        FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_research_studies_status ON research_studies(status);
      CREATE INDEX IF NOT EXISTS idx_research_studies_company ON research_studies(company_id);
      CREATE INDEX IF NOT EXISTS idx_research_studies_project ON research_studies(project_id);
      CREATE INDEX IF NOT EXISTS idx_research_studies_created ON research_studies(created_at);
    `);

    // 2. Research Sources Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS research_sources (
        id TEXT PRIMARY KEY,
        research_id TEXT NOT NULL,
        url TEXT NOT NULL,
        canonical_url TEXT,
        title TEXT NOT NULL,
        publisher TEXT,
        author TEXT,
        source_type TEXT NOT NULL DEFAULT 'SEARCH_RESULT', -- 'OFFICIAL_DOCUMENTATION' | 'OFFICIAL_REPOSITORY' | 'ACADEMIC_PAPER' | 'NEWS' | 'COMPANY' | 'BLOG' | 'FORUM' | 'SEARCH_RESULT' | 'USER_PROVIDED' | 'OTHER'
        domain TEXT NOT NULL,
        published_at TEXT,
        retrieved_at TEXT NOT NULL,
        freshness TEXT NOT NULL DEFAULT 'UNKNOWN', -- 'CURRENT' | 'RECENT' | 'DATED' | 'HISTORICAL' | 'UNKNOWN'
        content_hash TEXT NOT NULL,
        clean_text TEXT,
        credibility_tier TEXT NOT NULL DEFAULT 'SECONDARY', -- 'AUTHORITATIVE' | 'PRIMARY' | 'SECONDARY' | 'COMMUNITY' | 'UNVERIFIED'
        credibility_reason TEXT,
        is_duplicate INTEGER NOT NULL DEFAULT 0,
        duplicate_of_id TEXT,
        status TEXT NOT NULL DEFAULT 'ACQUIRED', -- 'PENDING' | 'ACQUIRED' | 'EXTRACTED' | 'FAILED' | 'REJECTED'
        metadata TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (research_id) REFERENCES research_studies(id) ON DELETE CASCADE,
        FOREIGN KEY (duplicate_of_id) REFERENCES research_sources(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_research_sources_study ON research_sources(research_id);
      CREATE INDEX IF NOT EXISTS idx_research_sources_domain ON research_sources(domain);
      CREATE INDEX IF NOT EXISTS idx_research_sources_hash ON research_sources(content_hash);
      CREATE INDEX IF NOT EXISTS idx_research_sources_dup ON research_sources(is_duplicate);
    `);

    // 3. Research Evidence Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS research_evidence (
        id TEXT PRIMARY KEY,
        research_id TEXT NOT NULL,
        source_id TEXT NOT NULL,
        claim_text TEXT NOT NULL,
        quote_text TEXT,
        claim_type TEXT NOT NULL DEFAULT 'CLAIM', -- 'FACT' | 'CLAIM' | 'INFERENCE' | 'OPINION' | 'UNKNOWN'
        confidence REAL NOT NULL DEFAULT 0.8,
        location TEXT, -- section heading / paragraph offset
        metadata TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (research_id) REFERENCES research_studies(id) ON DELETE CASCADE,
        FOREIGN KEY (source_id) REFERENCES research_sources(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_research_evidence_study ON research_evidence(research_id);
      CREATE INDEX IF NOT EXISTS idx_research_evidence_source ON research_evidence(source_id);
      CREATE INDEX IF NOT EXISTS idx_research_evidence_type ON research_evidence(claim_type);
    `);

    // 4. Research Findings Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS research_findings (
        id TEXT PRIMARY KEY,
        research_id TEXT NOT NULL,
        title TEXT NOT NULL,
        statement TEXT NOT NULL,
        finding_type TEXT NOT NULL DEFAULT 'OBSERVATION', -- 'KEY_FINDING' | 'COMPARISON' | 'DISCREPANCY' | 'LIMITATION' | 'OBSERVATION'
        status TEXT NOT NULL DEFAULT 'CORROBORATED', -- 'CONFIRMED' | 'CORROBORATED' | 'CONFLICTING' | 'UNVERIFIED' | 'INSUFFICIENT_EVIDENCE'
        corroborating_source_ids TEXT, -- JSON array of source IDs
        conflicting_source_ids TEXT, -- JSON array of source IDs
        citations TEXT, -- JSON array of citation objects
        metadata TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (research_id) REFERENCES research_studies(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_research_findings_study ON research_findings(research_id);
      CREATE INDEX IF NOT EXISTS idx_research_findings_status ON research_findings(status);
    `);
  },
  down: (db: DatabaseSync): void => {
    db.exec(`
      DROP TABLE IF EXISTS research_findings;
      DROP TABLE IF EXISTS research_evidence;
      DROP TABLE IF EXISTS research_sources;
      DROP TABLE IF EXISTS research_studies;
    `);
  }
};
