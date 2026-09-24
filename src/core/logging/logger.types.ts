/**
 * HṚṢĪKEŚA (हृषीकेश) — Logging Subsystem Types
 */

import { LogLevel } from '../configuration/config.types.js';

export interface StructuredLogEntry {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly component: string;
  readonly event?: string;
  readonly requestId?: string;
  readonly message: string;
  readonly metadata?: Record<string, unknown>;
}

export interface ILogger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void;
  child(component: string): ILogger;
}
