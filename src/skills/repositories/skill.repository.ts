/**
 * HṚṢĪKEŚA (हृषीकेश) — Skill Repository
 *
 * Phase 20: Persistent Storage for Procedural Skills, Versions, Steps, Usage, and Improvement Proposals
 */

import { randomUUID } from 'node:crypto';
import { DatabaseManager } from '../../persistence/database/database.manager.js';
import {
  SkillDefinition,
  SkillStatus,
  SkillCategory,
  SkillRiskLevel,
  SkillStep,
  SkillVersionSnapshot,
  SkillUsageRecord,
  SkillImprovementProposal,
  SkillStatistics,
  StepType,
} from '../interfaces/skill.types.js';

interface RawSkillRow {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  owner: string;
  scope: string;
  status: string;
  version: string;
  risk_level: string;
  created_at: string;
  updated_at: string;
}

interface RawStepRow {
  id: string;
  skill_id: string;
  version: string;
  step_index: number;
  step_id: string;
  name: string;
  description: string | null;
  step_type: string;
  dependencies_json: string;
  capability: string | null;
  tool: string | null;
  agent_id: string | null;
  inputs_json: string;
  verification_json: string | null;
  timeout_ms: number;
  retry_policy_json: string;
  created_at: string;
}

interface RawVersionRow {
  id: string;
  skill_id: string;
  version: string;
  definition_json: string;
  status: string;
  created_at: string;
}

interface RawUsageRow {
  id: string;
  skill_id: string;
  version: string;
  mission_id: string | null;
  goal_id: string | null;
  agent_id: string | null;
  status: string;
  duration_ms: number;
  step_count: number;
  error: string | null;
  created_at: string;
}

interface RawImprovementRow {
  id: string;
  skill_id: string;
  current_version: string;
  reason: string;
  evidence: string;
  proposed_changes_json: string;
  confidence: number;
  status: string;
  created_at: string;
  reviewed_at: string | null;
}

export class SkillRepository {
  private readonly db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  public createSkill(data: {
    id?: string;
    name: string;
    displayName?: string;
    description: string;
    category?: SkillCategory;
    owner?: string;
    scope?: string;
    status?: SkillStatus;
    version?: string;
    riskLevel?: SkillRiskLevel;
    triggerPhrases?: string[];
    requiredCapabilities?: string[];
    requiredTools?: string[];
    inputsSchema?: Record<string, unknown>;
    outputsSchema?: Record<string, unknown>;
    steps?: SkillStep[];
    permissions?: {
      maxDangerTier?: number;
      requiredCapabilities?: string[];
      requiredTools?: string[];
      requiresHumanApproval?: boolean;
      allowedScopes?: string[];
    };
  }): SkillDefinition {
    const id = data.id || randomUUID();
    const now = new Date().toISOString();
    const displayName = data.displayName || data.name;
    const category = data.category || 'CUSTOM';
    const owner = data.owner || 'SYSTEM';
    const scope = data.scope || 'GLOBAL';
    const status = data.status || 'ACTIVE';
    const version = data.version || '1.0.0';
    const riskLevel = data.riskLevel || 'TIER_1';
    const steps = data.steps || [];

    const perms = {
      maxDangerTier: data.permissions?.maxDangerTier ?? 1,
      requiredCapabilities: data.permissions?.requiredCapabilities || data.requiredCapabilities || [],
      requiredTools: data.permissions?.requiredTools || data.requiredTools || [],
      requiresHumanApproval: data.permissions?.requiresHumanApproval || riskLevel === 'TIER_3' || riskLevel === 'TIER_4',
      allowedScopes: data.permissions?.allowedScopes || ['GLOBAL'],
    };

    this.db.prepare(`
      INSERT INTO skills (
        id, name, display_name, description, category, owner, scope, status,
        version, risk_level, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.name.trim().toLowerCase(),
      displayName,
      data.description,
      category,
      owner,
      scope,
      status,
      version,
      riskLevel,
      now,
      now
    );

    // Persist permissions
    this.db.prepare(`
      INSERT INTO skill_permissions (
        id, skill_id, version, max_danger_tier, required_capabilities_json,
        required_tools_json, requires_human_approval, allowed_scopes_json, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      id,
      version,
      perms.maxDangerTier,
      JSON.stringify(perms.requiredCapabilities),
      JSON.stringify(perms.requiredTools),
      perms.requiresHumanApproval ? 1 : 0,
      JSON.stringify(perms.allowedScopes),
      now
    );

    // Persist steps
    if (steps.length > 0) {
      this.saveSteps(id, version, steps);
    }

    const fullSkill: SkillDefinition = {
      id,
      name: data.name.trim().toLowerCase(),
      displayName,
      description: data.description,
      category,
      owner,
      scope,
      status,
      version,
      riskLevel,
      triggerPhrases: data.triggerPhrases || [],
      requiredCapabilities: perms.requiredCapabilities,
      requiredTools: perms.requiredTools,
      inputsSchema: data.inputsSchema || {},
      outputsSchema: data.outputsSchema || {},
      steps,
      permissions: perms,
      createdAt: now,
      updatedAt: now,
    };

    // Save initial version snapshot
    this.createVersionSnapshot(id, version, fullSkill);

    return fullSkill;
  }

  public getSkill(id: string): SkillDefinition | null {
    const row = this.db.prepare(
      'SELECT * FROM skills WHERE id = ?'
    ).get(id) as unknown as RawSkillRow | undefined;

    if (!row) return null;
    return this.hydrateSkill(row);
  }

  public findById(id: string): SkillDefinition | null {
    return this.getSkill(id);
  }

  public getSkillByName(name: string): SkillDefinition | null {
    const row = this.db.prepare(
      'SELECT * FROM skills WHERE name = ?'
    ).get(name.trim().toLowerCase()) as unknown as RawSkillRow | undefined;

    if (!row) return null;
    return this.hydrateSkill(row);
  }

  public listSkills(filter?: {
    category?: string;
    status?: SkillStatus;
    scope?: string;
    limit?: number;
  }): SkillDefinition[] {
    let sql = 'SELECT * FROM skills WHERE 1=1';
    const params: any[] = [];

    if (filter?.category) {
      sql += ' AND category = ?';
      params.push(filter.category);
    }
    if (filter?.status) {
      sql += ' AND status = ?';
      params.push(filter.status);
    }
    if (filter?.scope) {
      sql += ' AND (scope = ? OR scope = \'GLOBAL\')';
      params.push(filter.scope);
    }

    sql += ' ORDER BY name ASC';
    if (filter?.limit) {
      sql += ' LIMIT ?';
      params.push(filter.limit);
    }

    const rows = this.db.prepare(sql).all(...params) as unknown as RawSkillRow[];
    return rows.map((r) => this.hydrateSkill(r));
  }

  public updateSkill(
    id: string,
    updates: Partial<SkillDefinition>
  ): SkillDefinition | null {
    const existing = this.getSkill(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const newVersion = updates.version || existing.version;
    const isNewVersion = newVersion !== existing.version;

    this.db.prepare(`
      UPDATE skills
      SET display_name = ?, description = ?, category = ?, status = ?,
          version = ?, risk_level = ?, updated_at = ?
      WHERE id = ?
    `).run(
      updates.displayName || existing.displayName,
      updates.description || existing.description,
      updates.category || existing.category,
      updates.status || existing.status,
      newVersion,
      updates.riskLevel || existing.riskLevel,
      now,
      id
    );

    if (updates.steps && updates.steps.length > 0) {
      this.saveSteps(id, newVersion, updates.steps);
    }

    const updated = this.getSkill(id)!;
    updated.inputsSchema = updates.inputsSchema || existing.inputsSchema || {};
    updated.outputsSchema = updates.outputsSchema || existing.outputsSchema || {};
    updated.triggerPhrases = updates.triggerPhrases || existing.triggerPhrases || [];

    if (isNewVersion) {
      this.createVersionSnapshot(id, newVersion, updated);
    }

    return updated;
  }

  public deleteSkill(id: string): boolean {
    const res = this.db.prepare('DELETE FROM skills WHERE id = ?').run(id);
    return (res.changes ?? 0) > 0;
  }

  public saveSteps(skillId: string, version: string, steps: SkillStep[]): void {
    const now = new Date().toISOString();
    // Clear any previous steps for this version
    this.db.prepare('DELETE FROM skill_steps WHERE skill_id = ? AND version = ?').run(skillId, version);

    const insertStmt = this.db.prepare(`
      INSERT INTO skill_steps (
        id, skill_id, version, step_index, step_id, name, description,
        step_type, dependencies_json, capability, tool, agent_id,
        inputs_json, verification_json, timeout_ms, retry_policy_json, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      insertStmt.run(
        step.id || randomUUID(),
        skillId,
        version,
        i,
        step.stepId || `step_${i + 1}`,
        step.name,
        step.description || null,
        step.stepType || 'TOOL',
        JSON.stringify(step.dependencies || []),
        step.capability || null,
        step.tool || null,
        step.agentId || null,
        JSON.stringify(step.inputs || {}),
        step.verification ? JSON.stringify(step.verification) : null,
        step.timeoutMs || 60000,
        JSON.stringify(step.retryPolicy || { maxAttempts: 1, backoffMs: 1000 }),
        now
      );
    }
  }

  public getSteps(skillId: string, version: string): SkillStep[] {
    const rows = this.db.prepare(
      'SELECT * FROM skill_steps WHERE skill_id = ? AND version = ? ORDER BY step_index ASC'
    ).all(skillId, version) as unknown as RawStepRow[];

    return rows.map((r) => ({
      id: r.id,
      stepIndex: r.step_index,
      stepId: r.step_id,
      name: r.name,
      description: r.description || undefined,
      stepType: r.step_type as StepType,
      dependencies: JSON.parse(r.dependencies_json || '[]'),
      capability: r.capability || undefined,
      tool: r.tool || undefined,
      agentId: r.agent_id || undefined,
      inputs: JSON.parse(r.inputs_json || '{}'),
      verification: r.verification_json ? JSON.parse(r.verification_json) : undefined,
      timeoutMs: r.timeout_ms,
      retryPolicy: JSON.parse(r.retry_policy_json || '{"maxAttempts":1,"backoffMs":1000}'),
    }));
  }

  public createVersionSnapshot(
    skillId: string,
    version: string,
    definition: SkillDefinition
  ): SkillVersionSnapshot {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT OR REPLACE INTO skill_versions (id, skill_id, version, definition_json, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, skillId, version, JSON.stringify(definition), definition.status, now);

    return {
      id,
      skillId,
      version,
      definition,
      status: definition.status,
      createdAt: now,
    };
  }

  public getVersions(skillId: string): SkillVersionSnapshot[] {
    const rows = this.db.prepare(
      'SELECT * FROM skill_versions WHERE skill_id = ? ORDER BY created_at DESC'
    ).all(skillId) as unknown as RawVersionRow[];

    return rows.map((r) => ({
      id: r.id,
      skillId: r.skill_id,
      version: r.version,
      definition: JSON.parse(r.definition_json),
      status: r.status as SkillStatus,
      createdAt: r.created_at,
    }));
  }

  public getVersion(skillId: string, version: string): SkillVersionSnapshot | null {
    const row = this.db.prepare(
      'SELECT * FROM skill_versions WHERE skill_id = ? AND version = ?'
    ).get(skillId, version) as unknown as RawVersionRow | undefined;

    if (!row) return null;
    return {
      id: row.id,
      skillId: row.skill_id,
      version: row.version,
      definition: JSON.parse(row.definition_json),
      status: row.status as SkillStatus,
      createdAt: row.created_at,
    };
  }

  public recordUsage(record: {
    skillId: string;
    version: string;
    missionId?: string;
    goalId?: string;
    agentId?: string;
    status: 'SUCCESS' | 'FAILURE' | 'CANCELLED' | 'PAUSED';
    durationMs: number;
    stepCount?: number;
    error?: string;
  }): SkillUsageRecord {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO skill_usage (
        id, skill_id, version, mission_id, goal_id, agent_id, status,
        duration_ms, step_count, error, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      record.skillId,
      record.version,
      record.missionId || null,
      record.goalId || null,
      record.agentId || null,
      record.status,
      record.durationMs,
      record.stepCount || 0,
      record.error || null,
      now
    );

    return {
      id,
      skillId: record.skillId,
      version: record.version,
      missionId: record.missionId,
      goalId: record.goalId,
      agentId: record.agentId,
      status: record.status,
      durationMs: record.durationMs,
      stepCount: record.stepCount || 0,
      error: record.error,
      createdAt: now,
    };
  }

  public getUsageHistory(skillId?: string, limit = 50): SkillUsageRecord[] {
    let sql = 'SELECT * FROM skill_usage';
    const params: any[] = [];

    if (skillId) {
      sql += ' WHERE skill_id = ?';
      params.push(skillId);
    }
    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const rows = this.db.prepare(sql).all(...params) as unknown as RawUsageRow[];
    return rows.map((r) => ({
      id: r.id,
      skillId: r.skill_id,
      version: r.version,
      missionId: r.mission_id || undefined,
      goalId: r.goal_id || undefined,
      agentId: r.agent_id || undefined,
      status: r.status as 'SUCCESS' | 'FAILURE' | 'CANCELLED' | 'PAUSED',
      durationMs: r.duration_ms,
      stepCount: r.step_count,
      error: r.error || undefined,
      createdAt: r.created_at,
    }));
  }

  public getStatistics(skillId?: string): SkillStatistics {
    const history = this.getUsageHistory(skillId, 1000);
    const totalExecutions = history.length;
    const successCount = history.filter((h) => h.status === 'SUCCESS').length;
    const failureCount = history.filter((h) => h.status === 'FAILURE').length;
    const pausedCount = history.filter((h) => h.status === 'PAUSED').length;
    const cancelledCount = history.filter((h) => h.status === 'CANCELLED').length;
    const totalDuration = history.reduce((acc, h) => acc + h.durationMs, 0);

    return {
      skillId: skillId || 'all',
      totalExecutions,
      successCount,
      failureCount,
      pausedCount,
      cancelledCount,
      successRate: totalExecutions > 0 ? successCount / totalExecutions : 1.0,
      averageDurationMs: totalExecutions > 0 ? Math.round(totalDuration / totalExecutions) : 0,
      lastExecutedAt: history.length > 0 ? history[0].createdAt : undefined,
    };
  }

  public createImprovementProposal(proposal: {
    skillId: string;
    currentVersion: string;
    reason: string;
    evidence?: any;
    proposedChanges?: Record<string, unknown>;
    confidence?: number;
    status?: string;
  }): SkillImprovementProposal {
    const id = `prop-${randomUUID()}`;
    const now = new Date().toISOString();
    const conf = proposal.confidence ?? 0.8;
    const evidenceStr = typeof proposal.evidence === 'string'
      ? proposal.evidence
      : JSON.stringify(proposal.evidence ?? {});

    this.db.prepare(`
      INSERT INTO skill_improvements (
        id, skill_id, current_version, reason, evidence,
        proposed_changes_json, confidence, status, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'PROPOSED', ?)
    `).run(
      id,
      proposal.skillId,
      proposal.currentVersion,
      proposal.reason,
      evidenceStr,
      JSON.stringify(proposal.proposedChanges || {}),
      conf,
      now
    );

    return {
      id,
      skillId: proposal.skillId,
      currentVersion: proposal.currentVersion,
      reason: proposal.reason,
      evidence: evidenceStr,
      proposedChanges: proposal.proposedChanges || {},
      confidence: conf,
      status: 'PROPOSED',
      createdAt: now,
    };
  }

  public listImprovementProposals(filter?: {
    skillId?: string;
    status?: string;
  }): SkillImprovementProposal[] {
    let sql = 'SELECT * FROM skill_improvements WHERE 1=1';
    const params: any[] = [];

    if (filter?.skillId) {
      sql += ' AND skill_id = ?';
      params.push(filter.skillId);
    }
    if (filter?.status) {
      sql += ' AND status = ?';
      params.push(filter.status);
    }

    sql += ' ORDER BY created_at DESC';
    const rows = this.db.prepare(sql).all(...params) as unknown as RawImprovementRow[];

    return rows.map((r) => ({
      id: r.id,
      skillId: r.skill_id,
      currentVersion: r.current_version,
      reason: r.reason,
      evidence: r.evidence,
      proposedChanges: JSON.parse(r.proposed_changes_json || '{}'),
      confidence: r.confidence,
      status: r.status as 'PROPOSED' | 'REVIEWED' | 'APPROVED' | 'REJECTED' | 'IMPLEMENTED',
      createdAt: r.created_at,
      reviewedAt: r.reviewed_at || undefined,
    }));
  }

  public getImprovementProposals(skillId?: string): SkillImprovementProposal[] {
    return this.listImprovementProposals(skillId ? { skillId } : undefined);
  }

  public updateImprovementProposalStatus(
    id: string,
    status: 'PROPOSED' | 'REVIEWED' | 'APPROVED' | 'REJECTED' | 'IMPLEMENTED'
  ): SkillImprovementProposal | null {
    const now = new Date().toISOString();
    const res = this.db.prepare(`
      UPDATE skill_improvements
      SET status = ?, reviewed_at = ?
      WHERE id = ?
    `).run(status, now, id);

    if ((res.changes ?? 0) === 0) return null;
    const rows = this.listImprovementProposals();
    return rows.find((p) => p.id === id) || null;
  }

  public updateImprovementProposal(
    id: string,
    status: 'APPROVED' | 'REJECTED' | 'IMPLEMENTED'
  ): boolean {
    return this.updateImprovementProposalStatus(id, status) !== null;
  }

  private hydrateSkill(row: RawSkillRow): SkillDefinition {
    const steps = this.getSteps(row.id, row.version);

    // Query permissions
    const permRow = this.db.prepare(
      'SELECT * FROM skill_permissions WHERE skill_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(row.id) as any;

    const perms = permRow
      ? {
          maxDangerTier: permRow.max_danger_tier,
          requiredCapabilities: JSON.parse(permRow.required_capabilities_json || '[]'),
          requiredTools: JSON.parse(permRow.required_tools_json || '[]'),
          requiresHumanApproval: permRow.requires_human_approval === 1,
          allowedScopes: JSON.parse(permRow.allowed_scopes_json || '["GLOBAL"]'),
        }
      : {
          maxDangerTier: 1,
          requiredCapabilities: [],
          requiredTools: [],
          requiresHumanApproval: false,
          allowedScopes: ['GLOBAL'],
        };

    // Query latest version snapshot to retrieve inputsSchema, outputsSchema, triggerPhrases
    const versionRow = this.db.prepare(
      'SELECT definition_json FROM skill_versions WHERE skill_id = ? AND version = ?'
    ).get(row.id, row.version) as { definition_json: string } | undefined;

    let snapshotDef: any = {};
    if (versionRow) {
      try {
        snapshotDef = JSON.parse(versionRow.definition_json);
      } catch {}
    }

    return {
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      category: row.category as SkillCategory,
      owner: row.owner,
      scope: row.scope,
      status: row.status as SkillStatus,
      version: row.version,
      riskLevel: row.risk_level as SkillRiskLevel,
      triggerPhrases: snapshotDef.triggerPhrases || [],
      requiredCapabilities: perms.requiredCapabilities,
      requiredTools: perms.requiredTools,
      inputsSchema: snapshotDef.inputsSchema || {},
      outputsSchema: snapshotDef.outputsSchema || {},
      steps,
      permissions: perms,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
