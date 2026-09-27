/**
 * HṚṢĪKEŚA (हृषीकेश) — Tool Audit Manager
 */

import { randomUUID } from 'node:crypto';
import { ToolAuditRecord, ToolExecutionStatus } from '../interfaces/audit.types.js';
import { DangerTier } from '../interfaces/danger.types.js';
import { PermissionDecision } from '../interfaces/permission.types.js';
import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';
import { DatabaseManager } from '../../persistence/database/database.manager.js';

export interface AuditRecordInput {
  readonly requestId: string;
  readonly sessionId?: string;
  readonly toolId: string;
  readonly rawInput: Record<string, unknown>;
  readonly riskLevel: DangerTier;
  readonly permissionDecision: PermissionDecision;
  readonly approvalId?: string;
  readonly executionStatus: ToolExecutionStatus;
  readonly durationMs: number;
  readonly errorSummary?: string;
  readonly userId: string;
}

export class ToolAuditManager {
  private readonly records: ToolAuditRecord[] = [];
  private readonly maxInMemoryRecords = 1000;
  private readonly db?: DatabaseManager;
  private readonly logger?: ILogger;
  private readonly eventBus?: EventBus;

  constructor(db?: DatabaseManager, eventBus?: EventBus, logger?: ILogger) {
    this.db = db;
    this.eventBus = eventBus;
    this.logger = logger?.child('ToolAuditManager');
  }

  /**
   * Record a tool execution into the append-only audit trail with secret redaction.
   */
  public record(input: AuditRecordInput): ToolAuditRecord {
    const id = `aud_${Date.now()}_${randomUUID().substring(0, 8)}`;
    const sanitizedInput = this.redactSecrets(input.rawInput);

    const record: ToolAuditRecord = {
      id,
      timestamp: new Date().toISOString(),
      requestId: input.requestId,
      sessionId: input.sessionId,
      toolId: input.toolId,
      inputSummary: sanitizedInput,
      riskLevel: input.riskLevel,
      permissionDecision: input.permissionDecision,
      approvalId: input.approvalId,
      executionStatus: input.executionStatus,
      durationMs: input.durationMs,
      errorSummary: input.errorSummary ? this.maskStringSecrets(input.errorSummary) : undefined,
      userId: input.userId
    };

    this.records.push(record);
    if (this.records.length > this.maxInMemoryRecords) {
      this.records.shift();
    }

    // Persist to database under audit_history if DB is available
    if (this.db) {
      try {
        const stmt = this.db.prepare(`
          INSERT INTO memory_items (id, tier, key, content, source, provenance, confidence, created_at, updated_at, metadata)
          VALUES (?, 'audit_history', ?, ?, 'tool_bus', 'explicit', 1.0, ?, ?, ?)
        `);
        const nowMs = Date.now();
        stmt.run(
          record.id,
          `audit:${record.toolId}:${record.id}`,
          JSON.stringify({
            tool: record.toolId,
            status: record.executionStatus,
            decision: record.permissionDecision,
            durationMs: record.durationMs,
            error: record.errorSummary
          }),
          new Date(nowMs).toISOString(),
          new Date(nowMs).toISOString(),
          JSON.stringify(record)
        );
      } catch (err) {
        this.logger?.warn(`Failed to write audit record to database: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    this.eventBus?.emit('tool.executed.audited', {
      id: record.id,
      toolId: record.toolId,
      status: record.executionStatus,
      durationMs: record.durationMs
    });

    return record;
  }

  public listRecords(options: {
    limit?: number;
    toolId?: string;
    status?: ToolExecutionStatus;
  } = {}): readonly ToolAuditRecord[] {
    let filtered = this.records;
    if (options.toolId) {
      filtered = filtered.filter((r) => r.toolId === options.toolId);
    }
    if (options.status) {
      filtered = filtered.filter((r) => r.executionStatus === options.status);
    }
    const limit = options.limit ?? 50;
    return filtered.slice(-limit).reverse();
  }

  public getRecord(id: string): ToolAuditRecord | undefined {
    return this.records.find((r) => r.id === id);
  }

  public count(): number {
    return this.records.length;
  }

  /**
   * Recursively sanitizes and redacts passwords, tokens, keys, and cookies.
   */
  public redactSecrets(data: unknown): Record<string, unknown> {
    if (!data || typeof data !== 'object') {
      return {};
    }

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (/password|secret|key|token|cookie|auth|credential|private_key/i.test(key)) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'string') {
        result[key] = this.maskStringSecrets(value);
      } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.redactSecrets(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  private maskStringSecrets(str: string): string {
    return str
      .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]')
      .replace(/sk-[A-Za-z0-9_-]{20,}/g, 'sk-[REDACTED]')
      .replace(/AIza[0-9A-Za-z-_]{35}/g, 'AIza[REDACTED]');
  }
}
