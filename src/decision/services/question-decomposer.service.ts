/**
 * HṚṢĪKEŚA (हृषीकेश) — Question Decomposer & Research Planner Service
 *
 * FP-18: Converts high-level objectives/questions into structured, bounded subquestions,
 * criteria, and stopping conditions across technical, hardware, license, and operational dimensions.
 */

import {
  ResearchPlan,
  EvaluationCriterion,
  SourceHierarchyTier,
} from '../interfaces/decision.types.js';

export interface DecomposedQuestionPlan {
  plan: ResearchPlan;
  inferredCriteria: EvaluationCriterion[];
}

export class QuestionDecomposerService {
  /**
   * Decomposes a question into targeted subquestions and research plan.
   */
  public decompose(
    caseId: string,
    question: string,
    depth: 'QUICK' | 'NORMAL' | 'DEEP' | 'COMPREHENSIVE' = 'NORMAL'
  ): DecomposedQuestionPlan {
    const qLower = question.toLowerCase();
    const subquestions: string[] = [];
    const inferredCriteria: EvaluationCriterion[] = [];
    const evidenceRequirements: string[] = [];

    // 1. Identify domain & extract subquestions
    const isLocalHardware =
      qLower.includes('laptop') ||
      qLower.includes('machine') ||
      qLower.includes('compatible') ||
      qLower.includes('local') ||
      qLower.includes('hardware') ||
      qLower.includes('run on') ||
      qLower.includes('intel') ||
      qLower.includes('arc') ||
      qLower.includes('vram');

    const isSoftwareOrLibrary =
      qLower.includes('stack') ||
      qLower.includes('library') ||
      qLower.includes('framework') ||
      qLower.includes('open-source') ||
      qLower.includes('tool') ||
      qLower.includes('model') ||
      qLower.includes('maintained') ||
      qLower.includes('maintenance') ||
      qLower.includes('project') ||
      qLower.includes('image generation');

    const isLaunchOrBusiness =
      qLower.includes('launch') ||
      qLower.includes('market') ||
      qLower.includes('product') ||
      qLower.includes('competitor') ||
      qLower.includes('annapurna') ||
      qLower.includes('pricing') ||
      qLower.includes('customer');

    // Subquestion decomposition
    if (isSoftwareOrLibrary) {
      subquestions.push('What are the primary actively-maintained open-source candidate solutions?');
      subquestions.push('What are the official license types (MIT, Apache-2.0, GPL, Commercial, Proprietary)?');
      subquestions.push('What are the primary capabilities, limitations, and architectural dependencies?');

      inferredCriteria.push({
        id: 'crit_license',
        name: 'Open Source License',
        description: 'Permissive vs copyleft vs commercial licensing terms',
        weight: 0.2,
        isMandatory: true,
        targetDirection: 'QUALITATIVE',
      });
      inferredCriteria.push({
        id: 'crit_quality',
        name: 'Output Quality & Capabilities',
        description: 'Feature set, fidelity, supported formats, and architectural maturity',
        weight: 0.25,
        isMandatory: false,
        targetDirection: 'HIGHER_IS_BETTER',
      });
    }

    if (isLocalHardware) {
      subquestions.push('What are the minimum and recommended system RAM and storage footprints?');
      subquestions.push('Is discrete NVIDIA CUDA strictly required, or is there native CPU / Vulkan / Intel Arc support?');
      subquestions.push('Does the solution support model quantization (e.g., GGUF, FP8, INT4) to fit within 16 GB RAM?');

      inferredCriteria.push({
        id: 'crit_hardware_compat',
        name: 'Host Hardware Compatibility',
        description: 'Runs on Intel Core Ultra 5 125H with Intel Arc GPU and 16 GB RAM',
        weight: 0.35,
        isMandatory: true,
        targetDirection: 'QUALITATIVE',
      });
      inferredCriteria.push({
        id: 'crit_install_complexity',
        name: 'Installation Complexity',
        description: 'Ease of setup, container availability, or single-binary runtime',
        weight: 0.15,
        isMandatory: false,
        targetDirection: 'LOWER_IS_BETTER',
      });

      evidenceRequirements.push('Hardware benchmarks on non-NVIDIA or integrated GPUs');
      evidenceRequirements.push('Memory profiling measurements during inference/execution');
    }

    if (isLaunchOrBusiness) {
      subquestions.push('What is the target customer segment, pain point, and market landscape?');
      subquestions.push('Who are the direct and indirect competitors, and what are their pricing models?');
      subquestions.push('What are the critical regulatory, legal, and compliance considerations?');
      subquestions.push('What are the infrastructure, cost, and operational requirements for launching?');

      inferredCriteria.push({
        id: 'crit_feasibility',
        name: 'Operational Feasibility',
        description: 'Resource requirements, operational overhead, and time to launch',
        weight: 0.3,
        isMandatory: true,
        targetDirection: 'QUALITATIVE',
      });
      inferredCriteria.push({
        id: 'crit_cost',
        name: 'Cost & Margin Impact',
        description: 'Setup and running cost structure',
        weight: 0.25,
        isMandatory: false,
        targetDirection: 'LOWER_IS_BETTER',
      });
    }

    // Fallback baseline if generic
    if (subquestions.length === 0) {
      subquestions.push(`What are the key facts and evidence directly answering: "${question}"?`);
      subquestions.push('What are the primary tradeoffs, limitations, and alternative viewpoints?');
      subquestions.push('What assumptions remain unverified or uncertain?');

      inferredCriteria.push({
        id: 'crit_evidence_strength',
        name: 'Evidence Strength',
        description: 'Corroboration from primary and authoritative sources',
        weight: 0.5,
        isMandatory: true,
        targetDirection: 'HIGHER_IS_BETTER',
      });
    }

    // Budget constraints based on depth
    const budgetMap = {
      QUICK: { maxSources: 5, maxSearches: 3, maxPages: 6, maxModelCalls: 3, maxDurationMs: 60_000 },
      NORMAL: { maxSources: 12, maxSearches: 8, maxPages: 16, maxModelCalls: 8, maxDurationMs: 180_000 },
      DEEP: { maxSources: 25, maxSearches: 15, maxPages: 35, maxModelCalls: 20, maxDurationMs: 600_000 },
      COMPREHENSIVE: { maxSources: 40, maxSearches: 25, maxPages: 50, maxModelCalls: 35, maxDurationMs: 900_000 },
    };

    const budget = budgetMap[depth];

    const plan: ResearchPlan = {
      id: `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      caseId,
      questions: [question],
      subquestions,
      sourcesToInspect: [
        'Official Documentation',
        'GitHub Repositories & Release Notes',
        'Hardware Compatibility Lists & Benchmarks',
      ],
      sourcePriority: [
        SourceHierarchyTier.PRIMARY,
        SourceHierarchyTier.SECONDARY,
        SourceHierarchyTier.COMMUNITY,
      ],
      searchStrategy: `Target primary repository documentation, compatibility matrices, and issue trackers for: ${question}`,
      extractionStrategy: 'Extract facts, claims, hardware requirements, and license text with exact source attribution',
      evidenceRequirements: evidenceRequirements.length > 0 ? evidenceRequirements : ['Direct verifiable source quotes'],
      contradictionStrategy: 'Flag conflicting numbers or hardware requirements and inspect version/quantization differences',
      stoppingConditions: [
        'All primary candidate solutions evaluated against criteria',
        'Hardware compatibility determined for host envelope',
        'Budget limit reached or no new evidence discovered',
      ],
      resourceBudget: budget,
      timeBudgetMs: budget.maxDurationMs,
      confidenceThreshold: 0.75,
    };

    return { plan, inferredCriteria };
  }
}
