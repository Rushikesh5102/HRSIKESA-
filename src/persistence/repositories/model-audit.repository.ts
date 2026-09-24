/**
 * HṚṢĪKEŚA (हृषीकेश) — Model Usage Audit Repository
 *
 * Phase 18: Persistent Model Auditing, Token Accounting & Cost Tracking
 */

import { randomUUID } from 'node:crypto';
import { DatabaseManager } from '../database/database.manager.js';
import {
  ModelUsageAuditRecord,
  ModelPreferenceConfig,
  TaskType,
  TaskComplexity,
  RoutingPolicy,
  PrivacyLevel,
} from '../../models/interfaces/model.types.js';

interface RawAuditRow {
  id: string;
  provider_id: string;
  model_id: string;
  task_type: string;
  complexity: string;
  agent_id: string | null;
  goal_id: string | null;
  mission_id: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  latency_ms: number;
  success: number;
  error_message: string | null;
  fallback_occurred: number;
  fallback_reason: string | null;
  routing_reason: string | null;
  policy_applied: string;
  created_at: string;
}

interface RawPrefRow {
  id: string;
  active_policy: string;
  privacy_threshold: string;
  cost_limit_usd: number;
  default_local_model: string;
  default_cloud_model: string;
  metadata: string | null;
  updated_at: string;
}

export class ModelAuditRepository {
  private readonly db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  public recordUsage(audit: Omit<ModelUsageAuditRecord, 'id' | 'createdAt'>): ModelUsageAuditRecord {
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO model_usage_audits (
        id, provider_id, model_id, task_type, complexity,
        agent_id, goal_id, mission_id, prompt_tokens,
        completion_tokens, total_tokens, estimated_cost_usd,
        latency_ms, success, error_message, fallback_occurred,
        fallback_reason, routing_reason, policy_applied, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      audit.providerId,
      audit.modelId,
      audit.taskType || 'CONVERSATION',
      audit.complexity || 'STANDARD',
      audit.agentId || null,
      audit.goalId || null,
      audit.missionId || null,
      audit.promptTokens || 0,
      audit.completionTokens || 0,
      audit.totalTokens || 0,
      audit.estimatedCostUsd || 0.0,
      audit.latencyMs || 0,
      audit.success ? 1 : 0,
      audit.errorMessage || null,
      audit.fallbackOccurred ? 1 : 0,
      audit.fallbackReason || null,
      audit.routingReason || null,
      audit.policyApplied || 'BALANCED',
      createdAt
    );

    return {
      id,
      ...audit,
      createdAt,
    };
  }

  public list(options: {
    providerId?: string;
    modelId?: string;
    taskType?: TaskType;
    agentId?: string;
    limit?: number;
    offset?: number;
  } = {}): ModelUsageAuditRecord[] {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (options.providerId) {
      conditions.push('provider_id = ?');
      params.push(options.providerId);
    }
    if (options.modelId) {
      conditions.push('model_id = ?');
      params.push(options.modelId);
    }
    if (options.taskType) {
      conditions.push('task_type = ?');
      params.push(options.taskType);
    }
    if (options.agentId) {
      conditions.push('agent_id = ?');
      params.push(options.agentId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitClause = options.limit ? `LIMIT ${options.limit}` : 'LIMIT 100';
    const offsetClause = options.offset ? `OFFSET ${options.offset}` : '';

    const rows = (this.db
      .prepare(`SELECT * FROM model_usage_audits ${whereClause} ORDER BY created_at DESC ${limitClause} ${offsetClause}`) as any)
      .all(...params) as unknown as RawAuditRow[];

    return rows.map((r) => this.mapAuditRow(r));
  }

  public findAudits(options: {
    providerId?: string;
    modelId?: string;
    taskType?: TaskType;
    agentId?: string;
    limit?: number;
    offset?: number;
  } = {}): ModelUsageAuditRecord[] {
    return this.list(options);
  }

  public findRecent(limit: number = 50): ModelUsageAuditRecord[] {
    return this.list({ limit });
  }

  public getUsageStats(): {
    totalCalls: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCostUsd: number;
    fallbackCount: number;
  } {
    const row = (this.db
      .prepare(`
        SELECT
          COUNT(*) as totalCalls,
          SUM(prompt_tokens) as totalInputTokens,
          SUM(completion_tokens) as totalOutputTokens,
          SUM(estimated_cost_usd) as totalCostUsd,
          SUM(CASE WHEN fallback_occurred = 1 THEN 1 ELSE 0 END) as fallbackCount
        FROM model_usage_audits
      `) as any)
      .get() as any;

    return {
      totalCalls: Number(row?.totalCalls || 0),
      totalInputTokens: Number(row?.totalInputTokens || 0),
      totalOutputTokens: Number(row?.totalOutputTokens || 0),
      totalCostUsd: Number(row?.totalCostUsd || 0),
      fallbackCount: Number(row?.fallbackCount || 0),
    };
  }

  public getSummary(): {
    totalCalls: number;
    totalTokens: number;
    totalCostUsd: number;
    localCalls: number;
    cloudCalls: number;
    fallbackCount: number;
    avgLatencyMs: number;
  } {
    const row = (this.db
      .prepare(`
        SELECT
          COUNT(*) as totalCalls,
          SUM(total_tokens) as totalTokens,
          SUM(estimated_cost_usd) as totalCostUsd,
          SUM(CASE WHEN provider_id = 'ollama' THEN 1 ELSE 0 END) as localCalls,
          SUM(CASE WHEN provider_id != 'ollama' THEN 1 ELSE 0 END) as cloudCalls,
          SUM(CASE WHEN fallback_occurred = 1 THEN 1 ELSE 0 END) as fallbackCount,
          AVG(latency_ms) as avgLatencyMs
        FROM model_usage_audits
      `) as any)
      .get() as any;

    return {
      totalCalls: Number(row?.totalCalls || 0),
      totalTokens: Number(row?.totalTokens || 0),
      totalCostUsd: Number(row?.totalCostUsd || 0),
      localCalls: Number(row?.localCalls || 0),
      cloudCalls: Number(row?.cloudCalls || 0),
      fallbackCount: Number(row?.fallbackCount || 0),
      avgLatencyMs: Math.round(Number(row?.avgLatencyMs || 0)),
    };
  }

  public getPreferences(): ModelPreferenceConfig {
    const row = this.db
      .prepare(`SELECT * FROM model_preferences WHERE id = 'default' LIMIT 1`)
      .get() as unknown as RawPrefRow | undefined;

    if (!row) {
      const defaultPref: ModelPreferenceConfig = {
        id: 'default',
        activePolicy: 'BALANCED',
        privacyThreshold: 'NORMAL',
        costLimitUsd: 10.0,
        defaultLocalModel: 'qwen2.5:7b',
        defaultCloudModel: 'gpt-4o',
        updatedAt: new Date().toISOString(),
      };
      this.db
        .prepare(`
          INSERT INTO model_preferences (id, active_policy, privacy_threshold, cost_limit_usd, default_local_model, default_cloud_model, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          defaultPref.id,
          defaultPref.activePolicy,
          defaultPref.privacyThreshold,
          defaultPref.costLimitUsd,
          defaultPref.defaultLocalModel,
          defaultPref.defaultCloudModel,
          defaultPref.updatedAt
        );
      return defaultPref;
    }

    return {
      id: row.id,
      activePolicy: row.active_policy as RoutingPolicy,
      privacyThreshold: row.privacy_threshold as PrivacyLevel,
      costLimitUsd: row.cost_limit_usd,
      defaultLocalModel: row.default_local_model,
      defaultCloudModel: row.default_cloud_model,
      updatedAt: row.updated_at,
    };
  }

  public updatePreferences(pref: Partial<ModelPreferenceConfig>): ModelPreferenceConfig {
    const current = this.getPreferences();
    const updated: ModelPreferenceConfig = {
      ...current,
      ...pref,
      updatedAt: new Date().toISOString(),
    };

    this.db
      .prepare(`
        UPDATE model_preferences
        SET active_policy = ?, privacy_threshold = ?, cost_limit_usd = ?, default_local_model = ?, default_cloud_model = ?, updated_at = ?
        WHERE id = 'default'
      `)
      .run(
        updated.activePolicy,
        updated.privacyThreshold,
        updated.costLimitUsd,
        updated.defaultLocalModel,
        updated.defaultCloudModel,
        updated.updatedAt
      );

    return updated;
  }

  private mapAuditRow(r: RawAuditRow): ModelUsageAuditRecord {
    return {
      id: r.id,
      providerId: r.provider_id,
      modelId: r.model_id,
      taskType: r.task_type as TaskType,
      complexity: r.complexity as TaskComplexity,
      agentId: r.agent_id || undefined,
      goalId: r.goal_id || undefined,
      missionId: r.mission_id || undefined,
      promptTokens: Number(r.prompt_tokens || 0),
      completionTokens: Number(r.completion_tokens || 0),
      totalTokens: Number(r.total_tokens || 0),
      estimatedCostUsd: Number(r.estimated_cost_usd || 0),
      latencyMs: Number(r.latency_ms || 0),
      success: r.success === 1,
      errorMessage: r.error_message || undefined,
      fallbackOccurred: r.fallback_occurred === 1,
      fallbackReason: r.fallback_reason || undefined,
      routingReason: r.routing_reason || '',
      policyApplied: (r.policy_applied || 'BALANCED') as RoutingPolicy,
      createdAt: r.created_at,
    };
  }
}
