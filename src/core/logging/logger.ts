/**
 * HṚṢĪKEŚA (हृषीकेश) — Structured Logger with Secret Redaction
 */

import { LogLevel } from '../configuration/config.types.js';
import { StructuredLogEntry, ILogger } from './logger.types.js';

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /apikey/i,
  /api_key/i,
  /authorization/i,
  /auth_header/i,
  /cookie/i,
  /private_key/i,
  /session/i
];

const SENSITIVE_VALUE_PATTERNS = [
  /sk-[a-zA-Z0-9_-]{20,}/g,          // OpenAI style
  /sk-ant-[a-zA-Z0-9_-]{20,}/g,      // Anthropic style
  /AIza[0-9A-Za-z-_]{35}/g,          // Google API key style
  /Bearer\s+[a-zA-Z0-9._-]+/gi       // Bearer tokens
];

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

export class Logger implements ILogger {
  private readonly component: string;
  private minLevel: LogLevel;
  private readonly isDevMode: boolean;

  constructor(component: string = 'HṚṢĪKEŚA', minLevel: LogLevel = 'info', isDevMode: boolean = true) {
    this.component = component;
    this.minLevel = minLevel;
    this.isDevMode = isDevMode;
  }

  public setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  public debug(message: string, meta?: Record<string, unknown>): void {
    this.writeLog('debug', message, undefined, meta);
  }

  public info(message: string, meta?: Record<string, unknown>): void {
    this.writeLog('info', message, undefined, meta);
  }

  public warn(message: string, meta?: Record<string, unknown>): void {
    this.writeLog('warn', message, undefined, meta);
  }

  public error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void {
    const errorMeta = error instanceof Error
      ? { ...meta, error: { message: error.message, stack: error.stack, name: error.name } }
      : (error ? { ...meta, error: String(error) } : meta);

    this.writeLog('error', message, undefined, errorMeta);
  }

  public child(childComponent: string): ILogger {
    return new Logger(`${this.component}:${childComponent}`, this.minLevel, this.isDevMode);
  }

  private writeLog(
    level: LogLevel,
    message: string,
    requestId?: string,
    metadata?: Record<string, unknown>
  ): void {
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.minLevel]) {
      return;
    }

    const sanitizedMessage = this.redactString(message);
    const sanitizedMetadata = metadata ? this.redactObject(metadata) : undefined;

    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component: this.component,
      requestId,
      message: sanitizedMessage,
      metadata: sanitizedMetadata
    };

    if (this.isDevMode) {
      this.writeDevFormat(entry);
    } else {
      console.log(JSON.stringify(entry));
    }
  }

  private writeDevFormat(entry: StructuredLogEntry): void {
    const colors = {
      debug: '\x1b[90m',
      info: '\x1b[36m',
      warn: '\x1b[33m',
      error: '\x1b[31m',
      reset: '\x1b[0m',
      bold: '\x1b[1m'
    };

    const color = colors[entry.level];
    const prefix = `${colors.bold}[${entry.timestamp.substring(11, 19)}]${colors.reset} ${color}${entry.level.toUpperCase().padEnd(5)}${colors.reset} [${entry.component}]`;
    const metaStr = entry.metadata && Object.keys(entry.metadata).length > 0
      ? `\n  ${JSON.stringify(entry.metadata, null, 2).replace(/\n/g, '\n  ')}`
      : '';

    const stream = entry.level === 'error' ? console.error : console.log;
    stream(`${prefix} ${entry.message}${metaStr}`);
  }

  private redactString(str: string): string {
    let result = str;
    for (const pattern of SENSITIVE_VALUE_PATTERNS) {
      result = result.replace(pattern, '[REDACTED]');
    }
    return result;
  }

  private redactObject(obj: Record<string, unknown>): Record<string, unknown> {
    const output: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const isSensitiveKey = SENSITIVE_KEY_PATTERNS.some((p) => p.test(key));
      if (isSensitiveKey) {
        output[key] = '[REDACTED]';
      } else if (typeof value === 'string') {
        output[key] = this.redactString(value);
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        output[key] = this.redactObject(value as Record<string, unknown>);
      } else {
        output[key] = value;
      }
    }

    return output;
  }
}
