/**
 * HṚṢĪKEŚA (हृषीकेश) — Foundation Performance & Execution (FP-01)
 * Execution-First Policy & Autonomous Decision Engine
 *
 * Rules:
 * If the request is actionable and sufficiently specified, EXECUTE.
 * Do not ask unnecessary clarification questions.
 *
 * ASK ONLY when:
 * 1. Required information genuinely cannot be obtained
 * 2. Action is irreversible / high-risk (Tier 2 or Tier 3 actions)
 * 3. Financial, legal, or identity approval is required
 * 4. Explicit human approval policy requires it
 * 5. Proceeding would create materially different outcomes and no safe default exists
 *
 * Otherwise:
 * UNDERSTAND → DECIDE → EXECUTE → VERIFY → REPORT
 */

import { ExecutionDecision, AssumptionRecord } from '../inference/backend.types.js';

export class ExecutionPolicyEngine {
  private static recordedAssumptions: AssumptionRecord[] = [];

  /**
   * Evaluates if a request should immediately execute or ask for clarification.
   */
  public static evaluate(
    userMessage: string,
    context: {
      intent?: string;
      hasTools?: boolean;
      riskTier?: 'TIER_0' | 'TIER_1' | 'TIER_2' | 'TIER_3';
      requiresFinancialOrLegal?: boolean;
    } = {}
  ): ExecutionDecision {
    const trimmed = userMessage.trim();
    const lower = trimmed.toLowerCase();
    const assumptions: AssumptionRecord[] = [];

    // Rule 2 & 3 & 4: Irreversible, high-risk, or explicit approval required
    if (context.riskTier === 'TIER_3' || context.requiresFinancialOrLegal) {
      return {
        action: 'ASK_CLARIFICATION',
        reason: 'Action requires explicit human authorization under sovereign safety policy.',
        assumptions: [],
        blockingQuestion: `This operation involves elevated risk (${context.riskTier || 'RESTRICTED'}). Do you authorize HṚṢĪKEŚA to proceed?`,
        riskTier: context.riskTier || 'TIER_3',
      };
    }

    // Check for irreversible system destruction without specification
    if (
      (lower.includes('delete everything') || lower.includes('drop database') || lower.includes('format drive') || lower.includes('rm -rf /')) &&
      !lower.includes('confirm')
    ) {
      return {
        action: 'ASK_CLARIFICATION',
        reason: 'Destructive system action without explicit confirmation target.',
        assumptions: [],
        blockingQuestion: 'This operation is destructive and irreversible. Please explicitly specify the target or confirm authorization.',
        riskTier: 'TIER_3',
      };
    }

    // Generate safe default assumptions for execution-first behavior
    if (lower.includes('code') || lower.includes('function') || lower.includes('script') || lower.includes('write')) {
      if (!lower.includes('python') && !lower.includes('javascript') && !lower.includes('typescript') && !lower.includes('rust')) {
        assumptions.push(this.recordAssumption(
          'Used modern TypeScript / Python as safe default programming language.',
          'Language not specified in coding request.',
          'DEFAULTS'
        ));
      }
    }

    if (lower.includes('website') || lower.includes('ui') || lower.includes('page') || lower.includes('frontend')) {
      if (!lower.includes('tailwind') && !lower.includes('css')) {
        assumptions.push(this.recordAssumption(
          'Adopted HṚṢĪKEŚA Temple Civilization theme tokens and vanilla CSS for styling.',
          'Visual design style not specified.',
          'STYLING'
        ));
      }
      assumptions.push(this.recordAssumption(
        'Assumed fully responsive mobile & desktop viewport compatibility.',
        'Viewport target not specified.',
        'STYLING'
      ));
    }

    if (lower.includes('data') || lower.includes('save') || lower.includes('store')) {
      assumptions.push(this.recordAssumption(
        'Defaulted persistence to project-local SQLite storage (data/hrisekesa.db).',
        'Database backend not specified.',
        'DEFAULTS'
      ));
    }

    // Default: EXECUTE immediately
    return {
      action: 'EXECUTE',
      reason: 'Request is actionable and sufficiently specified with safe defaults applied.',
      assumptions,
      riskTier: context.riskTier || 'TIER_0',
    };
  }

  public static recordAssumption(
    assumption: string,
    context: string,
    category: AssumptionRecord['category'] = 'GENERAL'
  ): AssumptionRecord {
    const record: AssumptionRecord = {
      id: `asm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      assumption,
      context,
      category,
      timestamp: new Date().toISOString(),
    };
    this.recordedAssumptions.push(record);
    if (this.recordedAssumptions.length > 200) {
      this.recordedAssumptions.shift();
    }
    return record;
  }

  public static getRecentAssumptions(): readonly AssumptionRecord[] {
    return this.recordedAssumptions;
  }
}
