/**
 * HṚṢĪKEŚA (हृषीकेश) — Native SQLite Database Manager
 *
 * Utilizes Node.js 24 native `node:sqlite` (DatabaseSync) with WAL mode,
 * foreign key constraints, and safe connection lifecycle management.
 */

import { DatabaseSync, StatementSync } from 'node:sqlite';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ILogger } from '../../core/logging/logger.types.js';

export interface DatabaseConfig {
  /** File path to SQLite database or ':memory:' */
  readonly path: string;
  readonly verbose?: boolean;
}

export interface DatabaseDiagnostics {
  readonly path: string;
  readonly isOpen: boolean;
  readonly fileSizeBytes: number;
  readonly journalMode: string;
  readonly foreignKeys: boolean;
}

export class DatabaseManager {
  private db: DatabaseSync | null = null;
  private readonly dbPath: string;
  private readonly logger?: ILogger;

  constructor(dbPath: string = 'data/hrisekesa.db', logger?: ILogger) {
    this.dbPath = dbPath;
    this.logger = logger?.child('DatabaseManager');
  }

  /**
   * Initializes and opens the SQLite connection. Configures WAL and foreign keys.
   */
  public open(): DatabaseSync {
    if (this.db) {
      return this.db;
    }

    if (this.dbPath !== ':memory:') {
      const dir = path.dirname(path.resolve(this.dbPath));
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.logger?.info(`Created database directory: ${dir}`);
      }
    }

    this.logger?.info(`Opening SQLite database at [${this.dbPath}]`);
    this.db = new DatabaseSync(this.dbPath, {
      enableForeignKeyConstraints: true
    });

    // Configure resilient performance PRAGMAs
    if (this.dbPath !== ':memory:') {
      this.db.exec('PRAGMA journal_mode = WAL;');
      this.db.exec('PRAGMA synchronous = NORMAL;');
      this.db.exec('PRAGMA busy_timeout = 5000;');
    }
    this.db.exec('PRAGMA foreign_keys = ON;');

    return this.db;
  }

  /**
   * Returns the active raw DatabaseSync instance. Opens connection if not yet open.
   */
  public getRawDb(): DatabaseSync {
    if (!this.db) {
      return this.open();
    }
    return this.db;
  }

  public isOpen(): boolean {
    return this.db !== null;
  }

  /**
   * Executes one or more raw SQL statements directly.
   */
  public exec(sql: string): void {
    const db = this.getRawDb();
    db.exec(sql);
  }

  /**
   * Prepares a SQL statement with native parameter binding.
   */
  public prepare(sql: string): StatementSync {
    const db = this.getRawDb();
    return db.prepare(sql);
  }

  /**
   * Runs an operation inside an atomic database transaction.
   */
  public transaction<T>(fn: () => T): T {
    const db = this.getRawDb();
    db.exec('BEGIN IMMEDIATE;');
    try {
      const result = fn();
      db.exec('COMMIT;');
      return result;
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  }

  /**
   * Gracefully closes the database connection.
   */
  public close(): void {
    if (this.db) {
      this.logger?.info(`Closing SQLite database at [${this.dbPath}]`);
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Collects diagnostic metadata about the current database state.
   */
  public getDiagnostics(): DatabaseDiagnostics {
    if (!this.db) {
      return {
        path: this.dbPath,
        isOpen: false,
        fileSizeBytes: 0,
        journalMode: 'closed',
        foreignKeys: false
      };
    }

    let fileSizeBytes = 0;
    if (this.dbPath !== ':memory:' && fs.existsSync(this.dbPath)) {
      fileSizeBytes = fs.statSync(this.dbPath).size;
    }

    const journalRow = this.db.prepare('PRAGMA journal_mode;').get() as { journal_mode?: string } | undefined;
    const fkRow = this.db.prepare('PRAGMA foreign_keys;').get() as { foreign_keys?: number } | undefined;

    return {
      path: this.dbPath,
      isOpen: true,
      fileSizeBytes,
      journalMode: journalRow?.journal_mode || 'unknown',
      foreignKeys: fkRow?.foreign_keys === 1
    };
  }

  public getPath(): string {
    return this.dbPath;
  }
}
