/**
 * HṚṢĪKEŚA (हृषीकेश) — Skill Matcher Service
 *
 * Phase 20: Deterministic + Capability-Aware Skill Discovery & Disambiguation
 */

import { SkillRegistry } from './skill-registry.service.js';
import { CapabilityRegistry } from '../../capabilities/registry/capability.registry.js';
import { ModelRouter } from '../../models/router/model.router.js';
import {
  SkillMatchResult,
} from '../interfaces/skill.types.js';
import { ILogger } from '../../core/logging/logger.types.js';

export class SkillMatcher {
  private readonly registry: SkillRegistry;
  private readonly capabilityRegistry?: CapabilityRegistry;
  private readonly router?: ModelRouter;
  private readonly logger?: ILogger;

  constructor(
    registry: SkillRegistry,
    capabilityRegistry?: CapabilityRegistry,
    router?: ModelRouter,
    logger?: ILogger
  ) {
    this.registry = registry;
    this.capabilityRegistry = capabilityRegistry;
    this.router = router;
    this.logger = logger?.child('SkillMatcher');
  }

  /**
   * Matches a natural language query or task request to registered skills.
   */
  public async match(
    query: string,
    options?: {
      scope?: string;
      category?: string;
      preferredRiskLevel?: string;
      minConfidence?: number;
    }
  ): Promise<SkillMatchResult | null> {
    if (!query || query.trim().length === 0) return null;
    const minConf = options?.minConfidence ?? 0.3;

    const availableSkills = this.registry.list({
      status: 'ACTIVE',
      scope: options?.scope,
      category: options?.category,
    });

    if (availableSkills.length === 0) return null;

    const scored = this.scoreSkills(query, availableSkills, minConf);
    if (scored.length === 0) {
      this.logger?.debug(`No skill matched query '${query}' above threshold ${minConf}`);
      return null;
    }

    const top = scored[0];
    const isAmbiguous = scored.length > 1 && (top.confidence - scored[1].confidence) < 0.10;

    return {
      skill: top.skill,
      confidence: top.confidence,
      reason: top.reason,
      matchedCapabilities: top.matchedCaps,
      missingCapabilities: top.missingCaps,
      isAmbiguous,
      alternativeSkills: isAmbiguous
        ? scored.slice(1, 4).map((s) => ({ skillId: s.skill.id, name: s.skill.name, confidence: s.confidence }))
        : undefined,
    };
  }

  /**
   * Matches candidate skills based on rich criteria.
   */
  public matchSkills(criteria: {
    request: string;
    goal?: string;
    mission?: string;
    task?: string;
    context?: Record<string, unknown>;
  }): SkillMatchResult[] {
    const query = [criteria.request, criteria.goal, criteria.mission, criteria.task]
      .filter(Boolean)
      .join(' ')
      .trim();

    const availableSkills = this.registry.list({ status: 'ACTIVE' });
    if (!query || availableSkills.length === 0) return [];

    const scored = this.scoreSkills(query, availableSkills, 0.25);
    if (scored.length === 0) return [];

    const isAmbiguous = scored.length > 1 && (scored[0].confidence - scored[1].confidence) < 0.10;

    return scored.map((s, idx) => ({
      skill: s.skill,
      confidence: s.confidence,
      reason: s.reason,
      matchedCapabilities: s.matchedCaps,
      missingCapabilities: s.missingCaps,
      isAmbiguous: idx === 0 ? isAmbiguous : false,
      alternativeSkills: idx === 0 && isAmbiguous
        ? scored.slice(1, 4).map((alt) => ({ skillId: alt.skill.id, name: alt.skill.name, confidence: alt.confidence }))
        : undefined,
    }));
  }

  /**
   * Helper to score candidate skills deterministically against a query.
   */
  private scoreSkills(
    query: string,
    availableSkills: ReturnType<SkillRegistry['list']>,
    minConf = 0.3
  ): Array<{
    skill: ReturnType<SkillRegistry['list']>[0];
    confidence: number;
    reason: string;
    matchedCaps: string[];
    missingCaps: string[];
  }> {
    const clean = query.trim().toLowerCase();
    const scored: Array<{
      skill: ReturnType<SkillRegistry['list']>[0];
      confidence: number;
      reason: string;
      matchedCaps: string[];
      missingCaps: string[];
    }> = [];

    const availableCaps = this.capabilityRegistry
      ? new Set(this.capabilityRegistry.listMetadata().map((c) => c.id.toLowerCase()))
      : new Set<string>();

    for (const skill of availableSkills) {
      let score = 0;
      let reason = '';
      const matchedCaps: string[] = [];
      const missingCaps: string[] = [];

      // Check capabilities
      for (const cap of skill.requiredCapabilities) {
        if (availableCaps.size === 0 || availableCaps.has(cap.toLowerCase())) {
          matchedCaps.push(cap);
        } else {
          missingCaps.push(cap);
        }
      }

      // 1. Exact name match
      if (clean === skill.name.toLowerCase() || clean.includes(skill.name.toLowerCase())) {
        score = 0.95;
        reason = `Direct match on skill name '${skill.name}'`;
      }
      // 2. Display name match
      else if (clean.includes(skill.displayName.toLowerCase())) {
        score = 0.90;
        reason = `Match on display name '${skill.displayName}'`;
      }
      // 3. Trigger phrase match
      else if (skill.triggerPhrases && skill.triggerPhrases.some((t) => clean.includes(t.toLowerCase()))) {
        score = 0.85;
        reason = `Match on declared trigger phrase`;
      }
      // 4. Token overlap in description / keywords
      else {
        const queryTokens = new Set(clean.split(/\s+/).filter((w) => w.length > 2));
        const skillTokens = new Set(
          `${skill.name} ${skill.displayName} ${skill.description}`.toLowerCase().split(/\s+/).filter((w) => w.length > 2)
        );

        let overlap = 0;
        for (const qt of queryTokens) {
          if (skillTokens.has(qt)) overlap++;
        }

        if (queryTokens.size > 0 && overlap > 0) {
          const ratio = overlap / queryTokens.size;
          score = Math.min(0.75, Math.round(ratio * 100) / 100);
          reason = `Matched ${overlap} keyword(s) with skill definition`;
        }
      }

      // Deduct score if required capabilities are missing
      if (missingCaps.length > 0 && availableCaps.size > 0) {
        score = Math.max(0.1, score - 0.25 * missingCaps.length);
        reason += ` (Missing capabilities: ${missingCaps.join(', ')})`;
      }

      if (score >= minConf) {
        scored.push({
          skill,
          confidence: score,
          reason,
          matchedCaps,
          missingCaps,
        });
      }
    }

    // Sort descending by confidence score
    scored.sort((a, b) => b.confidence - a.confidence);
    return scored;
  }

  /**
   * Generates a deterministic preview of skill execution without side effects.
   */
  public preview(
    skillName: string,
    inputs: Record<string, unknown> = {}
  ): {
    skillName: string;
    version: string;
    stepCount: number;
    requiredCapabilities: string[];
    requiredTools: string[];
    riskLevel: string;
    requiresHumanApproval: boolean;
    inputs: Record<string, unknown>;
    expectedOutputs: string[];
    procedureSteps: Array<{
      stepId: string;
      name: string;
      stepType: string;
      tool?: string;
      capability?: string;
    }>;
  } | null {
    const skill = this.registry.get(skillName);
    if (!skill) return null;

    return {
      skillName: skill.name,
      version: skill.version,
      stepCount: skill.steps.length,
      requiredCapabilities: skill.requiredCapabilities,
      requiredTools: skill.requiredTools,
      riskLevel: skill.riskLevel,
      requiresHumanApproval: skill.permissions.requiresHumanApproval,
      inputs,
      expectedOutputs: Object.keys(skill.outputsSchema),
      procedureSteps: skill.steps.map((s) => ({
        stepId: s.stepId,
        name: s.name,
        stepType: s.stepType,
        tool: s.tool,
        capability: s.capability,
      })),
    };
  }

  public generatePreview(
    skillId: string,
    inputs: Record<string, unknown> = {},
    _version?: string
  ): any {
    return this.preview(skillId, inputs);
  }

  public getRouter(): ModelRouter | undefined {
    return this.router;
  }
}
