/**
 * HṚṢĪKEŚA (हृषीकेश) — Database Migration Types
 */

import { DatabaseSync } from 'node:sqlite';

export interface Migration {
  /** Numeric version increment (e.g. 1, 2, 3...) */
  readonly version: number;
  /** Human-readable identifier for the migration */
  readonly name: string;
  /** Applies schema changes */
  readonly up: (db: DatabaseSync) => void;
  /** Rollback changes (optional) */
  readonly down?: (db: DatabaseSync) => void;
}

export interface AppliedMigration {
  readonly version: number;
  readonly name: string;
  readonly appliedAt: string;
}
