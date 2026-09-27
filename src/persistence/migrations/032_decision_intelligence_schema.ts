/**
 * HṚṢĪKEŚA (हृषीकेश) — Migration 032: Universal Decision Intelligence Schema
 *
 * FP-18: Persistent storage for ResearchCases, ResearchCandidates,
 * CandidateComparisons, DecisionRecords, DecisionReviews, and ProposedActions.
 */

import { DatabaseSync } from 'node:sqlite';
import { Migration } from './migration.types.js';

export const migration032: Migration = {
  version: 32,
  name: '032_decision_intelligence_schema',
  up: (db: DatabaseSync): void => {
    // 1. Research Cases
    db.exec(`
      CREATE TABLE IF NOT EXISTS research_cases (
        id TEXT PRIMARY KEY,
        owner TEXT NOT NULL,
        company_id TEXT,
        project_id TEXT,
        objective TEXT NOT NULL,
        question TEXT NOT NULL,
        scope TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'DRAFT',
        research_type TEXT NOT NULL DEFAULT 'TECHNICAL_RESEARCH',
        depth TEXT NOT NULL DEFAULT 'NORMAL',
        criteria_json TEXT NOT NULL DEFAULT '[]',
        constraints_json TEXT NOT NULL DEFAULT '[]',
        plan_json TEXT NOT NULL DEFAULT '{}',
        sources_json TEXT NOT NULL DEFAULT '[]',
        claims_json TEXT NOT NULL DEFAULT '[]',
        contradictions_json TEXT NOT NULL DEFAULT '[]',
        unknowns_json TEXT NOT NULL DEFAULT '[]',
        artifacts_json TEXT NOT NULL DEFAULT '[]',
        decision_brief_json TEXT,
        decision_record_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_research_cases_status ON research_cases(status);
      CREATE INDEX IF NOT EXISTS idx_research_cases_comp ON research_cases(company_id);
      CREATE INDEX IF NOT EXISTS idx_research_cases_proj ON research_cases(project_id);
    `);

    // 2. Research Candidates
    db.exec(`
      CREATE TABLE IF NOT EXISTS research_candidates (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        source_url TEXT NOT NULL DEFAULT '',
        repository_url TEXT,
        license TEXT NOT NULL DEFAULT 'UNKNOWN',
        license_category TEXT NOT NULL DEFAULT 'UNKNOWN',
        compatibility_status TEXT NOT NULL DEFAULT 'UNKNOWN',
        compatibility_details_json TEXT NOT NULL DEFAULT '{}',
        capabilities_json TEXT NOT NULL DEFAULT '[]',
        limitations_json TEXT NOT NULL DEFAULT '[]',
        cost_summary TEXT NOT NULL DEFAULT '',
        operational_complexity TEXT NOT NULL DEFAULT 'MEDIUM',
        confidence REAL NOT NULL DEFAULT 0.5,
        evidence_ids_json TEXT NOT NULL DEFAULT '[]',
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        FOREIGN KEY (case_id) REFERENCES research_cases(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_research_candidates_case ON research_candidates(case_id);
    `);

    // 3. Research Comparisons
    db.exec(`
      CREATE TABLE IF NOT EXISTS research_comparisons (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL UNIQUE,
        criteria_json TEXT NOT NULL DEFAULT '[]',
        candidates_json TEXT NOT NULL DEFAULT '[]',
        matrix_json TEXT NOT NULL DEFAULT '[]',
        tradeoff_summary TEXT NOT NULL DEFAULT '',
        unknowns_json TEXT NOT NULL DEFAULT '[]',
        confidence_score REAL NOT NULL DEFAULT 0.0,
        recommended_candidate_id TEXT,
        recommendation_rationale TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (case_id) REFERENCES research_cases(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_research_comparisons_case ON research_comparisons(case_id);
    `);

    // 4. Decision Records
    db.exec(`
      CREATE TABLE IF NOT EXISTS decision_records (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        company_id TEXT,
        project_id TEXT,
        context TEXT NOT NULL,
        objective TEXT NOT NULL,
        options_considered_json TEXT NOT NULL DEFAULT '[]',
        criteria_json TEXT NOT NULL DEFAULT '[]',
        evidence_summary TEXT NOT NULL DEFAULT '',
        assumptions_json TEXT NOT NULL DEFAULT '[]',
        selected_option_json TEXT NOT NULL DEFAULT '{}',
        rationale TEXT NOT NULL,
        approver TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        superseded_decision_id TEXT,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_decision_records_case ON decision_records(case_id);
      CREATE INDEX IF NOT EXISTS idx_decision_records_comp ON decision_records(company_id);
      CREATE INDEX IF NOT EXISTS idx_decision_records_status ON decision_records(status);
    `);

    // 5. Decision Reviews
    db.exec(`
      CREATE TABLE IF NOT EXISTS decision_reviews (
        id TEXT PRIMARY KEY,
        decision_id TEXT NOT NULL,
        review_trigger TEXT NOT NULL,
        original_evidence_summary TEXT NOT NULL DEFAULT '',
        new_evidence_summary TEXT NOT NULL DEFAULT '',
        changed_assumptions_json TEXT NOT NULL DEFAULT '[]',
        changed_constraints_json TEXT NOT NULL DEFAULT '[]',
        contradictions_identified_json TEXT NOT NULL DEFAULT '[]',
        review_warranted INTEGER NOT NULL DEFAULT 0,
        recommendation TEXT NOT NULL DEFAULT 'MAINTAIN',
        rationale TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (decision_id) REFERENCES decision_records(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_decision_reviews_dec ON decision_reviews(decision_id);
    `);

    // 6. Proposed Actions
    db.exec(`
      CREATE TABLE IF NOT EXISTS decision_proposed_actions (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        decision_id TEXT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        parameters_json TEXT NOT NULL DEFAULT '{}',
        requires_approval INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
        dispatched_entity_id TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_proposed_actions_case ON decision_proposed_actions(case_id);
      CREATE INDEX IF NOT EXISTS idx_proposed_actions_dec ON decision_proposed_actions(decision_id);
      CREATE INDEX IF NOT EXISTS idx_proposed_actions_status ON decision_proposed_actions(status);
    `);
  },
  down: (db: DatabaseSync): void => {
    db.exec(`
      DROP TABLE IF EXISTS decision_proposed_actions;
      DROP TABLE IF EXISTS decision_reviews;
      DROP TABLE IF EXISTS decision_records;
      DROP TABLE IF EXISTS research_comparisons;
      DROP TABLE IF EXISTS research_candidates;
      DROP TABLE IF EXISTS research_cases;
    `);
  },
};
