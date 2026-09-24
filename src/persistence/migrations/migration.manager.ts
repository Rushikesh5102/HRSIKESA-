/**
 * HṚṢĪKEŚA (हृषीकेश) — Database Migration Manager
 */

import { DatabaseManager } from '../database/database.manager.js';
import { Migration, AppliedMigration } from './migration.types.js';
import { migration001 } from './001_initial_schema.js';
import { migration002 } from './002_agent_tasks_schema.js';
import { migration003 } from './003_semantic_memory_schema.js';
import { migration004 } from './004_autonomous_mission_schema.js';
import { migration005 } from './005_company_os_schema.js';
import { migration006 } from './006_goal_engine_schema.js';
import { migration007 } from './007_persistent_operations_schema.js';
import { migration008 } from './008_research_intelligence_schema.js';
import { migration009 } from './009_model_routing_schema.js';
import { migration010 } from './010_knowledge_graph_schema.js';
import { migration011 } from './011_skills_schema.js';
import { migration012 } from './012_mcp_capability_ecosystem_schema.js';
import { migration013 } from './013_computer_operator_schema.js';
import { migration014 } from './014_external_environments_schema.js';
import { migration015 } from './015_multimodal_vision_voice_schema.js';
import { migration016 } from './016_autonomous_company_operations_schema.js';
import { migration017 } from './017_safe_self_improvement_schema.js';
import { ILogger } from '../../core/logging/logger.types.js';

export class MigrationManager {
  private readonly dbManager: DatabaseManager;
  private readonly migrations: Migration[];
  private readonly logger?: ILogger;

  constructor(dbManager: DatabaseManager, logger?: ILogger, customMigrations?: Migration[]) {
    this.dbManager = dbManager;
    this.logger = logger?.child('MigrationManager');
    this.migrations = customMigrations || [
      migration001,
      migration002,
      migration003,
      migration004,
      migration005,
      migration006,
      migration007,
      migration008,
      migration009,
      migration010,
      migration011,
      migration012,
      migration013,
      migration014,
      migration015,
      migration016,
      migration017,
    ];
  }

  /**
   * Initializes the schema_migrations tracking table if absent.
   */
  public initMigrationTable(): void {
    this.dbManager.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
    `);
  }

  /**
   * Retrieves all applied migrations sorted ascending by version.
   */
  public getAppliedMigrations(): AppliedMigration[] {
    this.initMigrationTable();
    const rows = this.dbManager.prepare(
      'SELECT version, name, applied_at as appliedAt FROM schema_migrations ORDER BY version ASC;'
    ).all() as unknown as AppliedMigration[];

    return rows.map((r) => ({
      version: Number(r.version),
      name: String(r.name),
      appliedAt: String(r.appliedAt)
    }));
  }

  public getCurrentVersion(): number {
    const applied = this.getAppliedMigrations();
    if (applied.length === 0) {
      return 0;
    }
    return applied[applied.length - 1].version;
  }

  /**
   * Runs all pending migrations in ascending version order.
   * Returns count of migrations applied in this execution.
   */
  public runPending(): number {
    this.initMigrationTable();
    const currentVersion = this.getCurrentVersion();
    const pending = this.migrations
      .filter((m) => m.version > currentVersion)
      .sort((a, b) => a.version - b.version);

    if (pending.length === 0) {
      this.logger?.debug(`Schema is up to date at version ${currentVersion}.`);
      return 0;
    }

    this.logger?.info(`Applying ${pending.length} pending database migration(s)...`);

    for (const migration of pending) {
      this.logger?.info(`Executing migration v${migration.version}: [${migration.name}]`);

      this.dbManager.transaction(() => {
        const rawDb = this.dbManager.getRawDb();
        migration.up(rawDb);

        const recordStmt = this.dbManager.prepare(`
          INSERT INTO schema_migrations (version, name, applied_at)
          VALUES (?, ?, ?);
        `);
        recordStmt.run(migration.version, migration.name, new Date().toISOString());
      });

      this.logger?.info(`Successfully applied migration v${migration.version}: [${migration.name}]`);
    }

    return pending.length;
  }
}
