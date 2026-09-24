/**
 * HṚṢĪKEŚA (हृषीकेश) — Skill Security & DAG Validator
 *
 * Phase 20: Comprehensive Verification of Procedures, DAGs, Capabilities, and Permission Tiers
 */

import {
  SkillDefinition,
} from '../interfaces/skill.types.js';

export interface ValidationIssue {
  severity: 'ERROR' | 'WARNING';
  code: string;
  message: string;
  stepId?: string;
}

export interface SkillValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  maxDepth: number;
  totalSteps: number;
}

export class SkillSecurityValidator {
  private static readonly MAX_STEPS = 30;
  private static readonly MAX_DEPTH = 10;
  private static readonly MAX_COMPOSITION_DEPTH = 3;

  private static readonly FORBIDDEN_PATTERNS = [
    /bypass.*auth/i,
    /bypass.*mfa/i,
    /bypass.*captcha/i,
    /disable.*security/i,
    /evade.*monitor/i,
    /steal.*cred/i,
    /dump.*sam/i,
    /rmdir\s+\/s\s+\/q\s+c:\\windows/i,
    /format\s+c:/i,
  ];

  /**
   * Validates a complete skill definition before registration or execution.
   */
  public validateSkill(skill: SkillDefinition): SkillValidationResult {
    return this.validate(skill);
  }

  /**
   * Validates a complete skill definition before registration or execution.
   */
  public validate(skill: SkillDefinition): SkillValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Identity & Name validation
    if (!skill.name || skill.name.trim().length === 0) {
      errors.push('Skill name is required.');
    } else if (!/^[a-z0-9\-_]+$/i.test(skill.name)) {
      errors.push(`Skill name '${skill.name}' contains invalid characters. Use alphanumeric, hyphens, and underscores only.`);
    }

    if (!skill.displayName || skill.displayName.trim().length === 0) {
      errors.push('Skill display name is required.');
    }

    if (!skill.description || skill.description.trim().length === 0) {
      errors.push('Skill description is required.');
    }

    // 2. Dangerous description / pattern checks
    const combinedText = `${skill.name} ${skill.description} ${(skill.steps || []).map((s) => s.name + ' ' + (s.description || '')).join(' ')}`;
    for (const pattern of SkillSecurityValidator.FORBIDDEN_PATTERNS) {
      if (pattern.test(combinedText)) {
        errors.push(`Security Violation: Skill contains forbidden pattern '${pattern.source}'.`);
      }
    }

    // 3. Step bounds
    if (!skill.steps || skill.steps.length === 0) {
      errors.push('Skill must contain at least one procedural step.');
      return { valid: false, errors, warnings, maxDepth: 0, totalSteps: 0 };
    }

    if (skill.steps.length > SkillSecurityValidator.MAX_STEPS) {
      errors.push(`Skill step count (${skill.steps.length}) exceeds maximum limit (${SkillSecurityValidator.MAX_STEPS}).`);
    }

    // 4. DAG and dependency validation
    const stepIds = new Set<string>();
    for (const step of skill.steps) {
      if (!step.stepId || step.stepId.trim().length === 0) {
        errors.push(`Step at index ${step.stepIndex} has missing or empty stepId.`);
        continue;
      }
      if (stepIds.has(step.stepId)) {
        errors.push(`Duplicate stepId '${step.stepId}' detected in skill.`);
      }
      stepIds.add(step.stepId);
    }

    // Dependency graph for cycle detection and depth calculation
    const adj = new Map<string, string[]>();
    for (const step of skill.steps) {
      adj.set(step.stepId, step.dependencies || []);
      for (const dep of step.dependencies || []) {
        if (dep === step.stepId) {
          errors.push(`Step '${step.stepId}' has a self-dependency.`);
        } else if (!stepIds.has(dep)) {
          errors.push(`Step '${step.stepId}' depends on unknown step '${dep}'.`);
        }
      }
    }

    // Cycle detection using DFS
    const visited = new Map<string, number>(); // 0: unvisited, 1: visiting, 2: visited
    let hasCycle = false;

    const detectCycle = (u: string) => {
      visited.set(u, 1);
      for (const v of adj.get(u) || []) {
        if (visited.get(v) === 1) {
          hasCycle = true;
          errors.push(`Circular dependency detected involving steps '${u}' and '${v}'.`);
          return;
        }
        if (!visited.has(v) || visited.get(v) === 0) {
          detectCycle(v);
        }
      }
      visited.set(u, 2);
    };

    for (const stepId of stepIds) {
      if (!visited.has(stepId) || visited.get(stepId) === 0) {
        detectCycle(stepId);
      }
    }

    // Depth calculation
    let maxDepth = 1;
    if (!hasCycle) {
      const depthMemo = new Map<string, number>();
      const calcDepth = (u: string): number => {
        if (depthMemo.has(u)) return depthMemo.get(u)!;
        const deps = adj.get(u) || [];
        if (deps.length === 0) {
          depthMemo.set(u, 1);
          return 1;
        }
        let d = 1;
        for (const dep of deps) {
          if (stepIds.has(dep)) {
            d = Math.max(d, 1 + calcDepth(dep));
          }
        }
        depthMemo.set(u, d);
        return d;
      };

      for (const stepId of stepIds) {
        maxDepth = Math.max(maxDepth, calcDepth(stepId));
      }

      if (maxDepth > SkillSecurityValidator.MAX_DEPTH) {
        errors.push(`Skill DAG depth (${maxDepth}) exceeds maximum depth limit (${SkillSecurityValidator.MAX_DEPTH}).`);
      }
    }

    // 5. Permission & Risk Tier consistency
    if (skill.riskLevel === 'TIER_3' || skill.riskLevel === 'TIER_4') {
      if (!skill.permissions.requiresHumanApproval) {
        errors.push(`High risk skill (${skill.riskLevel}) must require human approval.`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      maxDepth,
      totalSteps: skill.steps.length,
    };
  }

  /**
   * Validates skill composition to prevent recursive or circular skill execution loops.
   */
  public validateComposition(
    parentSkillName: string,
    composedSkillNames: string[],
    existingChain: string[] = []
  ): { valid: boolean; error?: string } {
    if (existingChain.includes(parentSkillName)) {
      return {
        valid: false,
        error: `Circular skill composition detected: ${[...existingChain, parentSkillName].join(' -> ')}`,
      };
    }

    const newChain = [...existingChain, parentSkillName];
    if (newChain.length > SkillSecurityValidator.MAX_COMPOSITION_DEPTH) {
      return {
        valid: false,
        error: `Skill composition chain length (${newChain.length}) exceeds maximum limit (${SkillSecurityValidator.MAX_COMPOSITION_DEPTH}).`,
      };
    }

    for (const child of composedSkillNames) {
      if (newChain.includes(child)) {
        return {
          valid: false,
          error: `Circular skill composition detected: ${[...newChain, child].join(' -> ')}`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Validates runtime inputs against a skill's inputsSchema.
   */
  public validateInputs(
    skill: SkillDefinition,
    inputs: Record<string, unknown>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const schema = (skill.inputsSchema as any) || {};
    const required = Array.isArray(schema.required) ? schema.required : [];
    for (const req of required) {
      if (inputs[req] === undefined || inputs[req] === null || inputs[req] === '') {
        errors.push(`Missing required input '${req}' for skill '${skill.name}'.`);
      }
    }
    return { valid: errors.length === 0, errors };
  }

  /**
   * Validates runtime outputs against a skill's outputsSchema.
   */
  public validateOutputs(
    skill: SkillDefinition,
    outputs: Record<string, unknown>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const schema = (skill.outputsSchema as any) || {};
    const required = Array.isArray(schema.required) ? schema.required : [];
    for (const req of required) {
      if (outputs[req] === undefined || outputs[req] === null) {
        errors.push(`Missing required output '${req}' for skill '${skill.name}'.`);
      }
    }
    return { valid: errors.length === 0, errors };
  }

  /**
   * Redacts sensitive credentials, passwords, and tokens from input/output telemetry.
   */
  public redactSecrets(data: Record<string, unknown>): Record<string, unknown> {
    const redacted: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (/key|secret|password|token|auth/i.test(k)) {
        redacted[k] = '[REDACTED]';
      } else if (typeof v === 'string') {
        redacted[k] = v.replace(/(sk-[a-zA-Z0-9_\-]{15,}|ghp_[a-zA-Z0-9]{20,})/g, '[REDACTED]');
      } else if (v && typeof v === 'object' && !Array.isArray(v)) {
        redacted[k] = this.redactSecrets(v as Record<string, unknown>);
      } else {
        redacted[k] = v;
      }
    }
    return redacted;
  }
}
