/**
 * HṚṢĪKEŚA (हृषीकेश) — Migration 035: Deduplicate Self-Improvement Anomalies & Proposals
 *
 * Consolidates duplicate active anomaly records and duplicate active improvement proposals
 * resulting from repeated detection of identical historical error clusters.
 * Merges evidence and observation IDs into canonical active records and marks duplicates resolved.
 */

import { DatabaseSync } from 'node:sqlite';
import { Migration } from './migration.types.js';

export const migration035: Migration = {
  version: 35,
  name: '035_deduplicate_self_anomalies_and_proposals',
  up: (db: DatabaseSync): void => {
    // 1. Check if self_anomalies table exists
    const anomalyTableExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='self_anomalies'")
      .get() as any;

    if (anomalyTableExists) {
      const activeAnomalies = db
        .prepare("SELECT id, company_id, component, title, description, evidence_summary, observation_ids, status, detected_at FROM self_anomalies WHERE status = 'ACTIVE' ORDER BY detected_at ASC")
        .all() as any[];

      const anomalyGroups = new Map<string, any[]>();
      for (const anom of activeAnomalies) {
        const key = `${anom.company_id || 'global'}::${anom.component}::${anom.title}`;
        if (!anomalyGroups.has(key)) {
          anomalyGroups.set(key, []);
        }
        anomalyGroups.get(key)!.push(anom);
      }

      for (const group of anomalyGroups.values()) {
        if (group.length > 1) {
          const canonical = group[0];
          const allObservationIds = new Set<string>();

          for (const item of group) {
            try {
              const ids = JSON.parse(item.observation_ids || '[]');
              if (Array.isArray(ids)) {
                for (const id of ids) allObservationIds.add(id);
              }
            } catch {
              // ignore parse errors
            }
          }

          const mergedObservationIds = Array.from(allObservationIds);

          // Update canonical anomaly
          db.prepare(
            `UPDATE self_anomalies 
             SET observation_ids = ?, evidence_summary = ?
             WHERE id = ?`
          ).run(
            JSON.stringify(mergedObservationIds),
            `${mergedObservationIds.length} failure events registered`,
            canonical.id
          );

          // Resolve duplicates and update proposal references
          for (let i = 1; i < group.length; i++) {
            const dup = group[i];

            // Re-link proposals
            try {
              db.prepare('UPDATE improvement_proposals SET anomaly_id = ? WHERE anomaly_id = ?').run(
                canonical.id,
                dup.id
              );
            } catch {
              // Table might not exist yet in fresh schema
            }

            // Mark duplicate as resolved
            db.prepare(
              `UPDATE self_anomalies 
               SET status = 'RESOLVED', resolved_at = datetime('now')
               WHERE id = ?`
            ).run(dup.id);
          }
        }
      }
    }

    // 2. Deduplicate active proposals if improvement_proposals exists
    const proposalTableExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='improvement_proposals'")
      .get() as any;

    if (proposalTableExists) {
      const activeProposals = db
        .prepare(
          "SELECT id, company_id, anomaly_id, title, state, created_at FROM improvement_proposals WHERE state NOT IN ('ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED') ORDER BY created_at ASC"
        )
        .all() as any[];

      const proposalGroups = new Map<string, any[]>();
      for (const prop of activeProposals) {
        const key = `${prop.company_id || 'global'}::${prop.anomaly_id || 'none'}::${prop.title}`;
        if (!proposalGroups.has(key)) {
          proposalGroups.set(key, []);
        }
        proposalGroups.get(key)!.push(prop);
      }

      for (const group of proposalGroups.values()) {
        if (group.length > 1) {
          // Keep first active proposal, cancel subsequent duplicate proposals
          for (let i = 1; i < group.length; i++) {
            const dup = group[i];
            db.prepare("UPDATE improvement_proposals SET state = 'CANCELLED' WHERE id = ?").run(dup.id);
          }
        }
      }
    }
  },
  down: (_db: DatabaseSync): void => {
    // Non-destructive data consolidation migration
  },
};
