/**
 * HṚṢĪKEŚA (हृषीकेश) — Company & Product Lifecycle Engine
 *
 * Deterministic business lifecycle state machine mapping business stages
 * to the authoritative 17-agent workforce. Supports stage transitions, validation,
 * skipping irrelevant stages, and responsible agent resolution.
 */

import { CompanyLifecycleStage, LifecycleStageDefinition } from '../interfaces/company.types.js';

export class LifecycleEngine {
  private static readonly STAGE_DEFINITIONS: Record<CompanyLifecycleStage, LifecycleStageDefinition> = {
    market_need: {
      stage: 'market_need',
      displayName: 'Market Need Identification',
      description: 'Identify unserved market demand, competitor blind spots, and opportunities.',
      responsibleAgentIds: ['rahu', 'tvas'],
      defaultNextStage: 'strategy_planning'
    },
    strategy_planning: {
      stage: 'strategy_planning',
      displayName: 'Strategy & Business Planning',
      description: 'Define business model, competitive strategy, value proposition, and roadmaps.',
      responsibleAgentIds: ['aja'],
      defaultNextStage: 'organization_setup'
    },
    organization_setup: {
      stage: 'organization_setup',
      displayName: 'Company & Team Setup',
      description: 'Structure departments, establish workforce topologies, and configure roles.',
      responsibleAgentIds: ['ritvan'],
      defaultNextStage: 'customer_research'
    },
    customer_research: {
      stage: 'customer_research',
      displayName: 'Customer & Requirements Research',
      description: 'Deep-dive user needs, user personas, friction points, and feature specifications.',
      responsibleAgentIds: ['tvas'],
      defaultNextStage: 'product_design'
    },
    product_design: {
      stage: 'product_design',
      displayName: 'Product & Service Design',
      description: 'System architecture, API contracts, UI/UX specification, and design blueprints.',
      responsibleAgentIds: ['spoota'],
      defaultNextStage: 'development'
    },
    development: {
      stage: 'development',
      displayName: 'Development & Production',
      description: 'Full-stack software engineering, build automation, and system implementation.',
      responsibleAgentIds: ['gandiva'],
      defaultNextStage: 'quality_assurance'
    },
    quality_assurance: {
      stage: 'quality_assurance',
      displayName: 'Quality Assurance & Verification',
      description: 'Comprehensive testing, edge-case analysis, defect verification, and gate validation.',
      responsibleAgentIds: ['vighna'],
      defaultNextStage: 'marketing_sales'
    },
    marketing_sales: {
      stage: 'marketing_sales',
      displayName: 'Marketing & Sales Orchestration',
      description: 'Go-to-market distribution, audience targeting, and outreach positioning.',
      responsibleAgentIds: ['raudra'],
      defaultNextStage: 'contract_order'
    },
    contract_order: {
      stage: 'contract_order',
      displayName: 'Contracts & Compliance Verification',
      description: 'Legal terms, regulatory compliance check, terms of service, and order validation.',
      responsibleAgentIds: ['rutam'],
      defaultNextStage: 'fulfillment_delivery'
    },
    fulfillment_delivery: {
      stage: 'fulfillment_delivery',
      displayName: 'Fulfillment & Delivery',
      description: 'Release engineering, automated delivery pipeline, packaging, and dispatch.',
      responsibleAgentIds: ['arvan'],
      defaultNextStage: 'customer_onboarding'
    },
    customer_onboarding: {
      stage: 'customer_onboarding',
      displayName: 'Customer Onboarding & Success',
      description: 'User enablement, documentation walkthroughs, support triage, and issue resolution.',
      responsibleAgentIds: ['taraka'],
      defaultNextStage: 'billing_payment'
    },
    billing_payment: {
      stage: 'billing_payment',
      displayName: 'Billing & Financial Accounting',
      description: 'Pricing models, invoicing schedules, cost accounting, and financial reporting.',
      responsibleAgentIds: ['kalki'],
      defaultNextStage: 'operations_monitoring'
    },
    operations_monitoring: {
      stage: 'operations_monitoring',
      displayName: 'Operations & SRE Monitoring',
      description: 'Runtime telemetry, infrastructure health, uptime monitoring, and SLA tracking.',
      responsibleAgentIds: ['garuda'],
      defaultNextStage: 'continuous_improvement'
    },
    continuous_improvement: {
      stage: 'continuous_improvement',
      displayName: 'Continuous Improvement & Evolution',
      description: 'Self-correcting feedback loops, architectural refactoring, and performance tuning.',
      responsibleAgentIds: ['kali'],
      defaultNextStage: 'business_exit'
    },
    business_exit: {
      stage: 'business_exit',
      displayName: 'Product Retirement & Business Exit',
      description: 'Safe decommission, data archival, graceful deprecation, and lifecycle teardown.',
      responsibleAgentIds: ['mrtyu']
    }
  };

  private static readonly STAGE_ORDER: CompanyLifecycleStage[] = [
    'market_need',
    'strategy_planning',
    'organization_setup',
    'customer_research',
    'product_design',
    'development',
    'quality_assurance',
    'marketing_sales',
    'contract_order',
    'fulfillment_delivery',
    'customer_onboarding',
    'billing_payment',
    'operations_monitoring',
    'continuous_improvement',
    'business_exit'
  ];

  /**
   * Returns metadata and definitions for all 15 business lifecycle stages.
   */
  public static getAllStages(): LifecycleStageDefinition[] {
    return this.STAGE_ORDER.map((s) => this.STAGE_DEFINITIONS[s]);
  }

  /**
   * Retrieves definition for a specific lifecycle stage.
   */
  public static getStage(stage: CompanyLifecycleStage): LifecycleStageDefinition | undefined {
    return this.STAGE_DEFINITIONS[stage];
  }

  /**
   * Resolves authoritative specialist agents responsible for a lifecycle stage.
   */
  public static getResponsibleAgents(stage: CompanyLifecycleStage): readonly string[] {
    const def = this.STAGE_DEFINITIONS[stage];
    return def ? def.responsibleAgentIds : [];
  }

  /**
   * Validates whether a transition from currentStage to targetStage is permissible.
   * Supports forward progression, skipping stages when explicitly requested, or rewinding
   * for rework (e.g. from QA back to Development). Business exit can only transition to terminal state.
   */
  public static validateTransition(
    currentStage: CompanyLifecycleStage,
    targetStage: CompanyLifecycleStage
  ): { valid: boolean; reason?: string } {
    if (!this.STAGE_DEFINITIONS[currentStage]) {
      return { valid: false, reason: `Unknown current lifecycle stage: ${currentStage}` };
    }
    if (!this.STAGE_DEFINITIONS[targetStage]) {
      return { valid: false, reason: `Unknown target lifecycle stage: ${targetStage}` };
    }

    if (currentStage === 'business_exit' && targetStage !== 'business_exit') {
      return { valid: false, reason: 'Cannot transition away from terminal business_exit stage.' };
    }

    return { valid: true };
  }

  /**
   * Computes the next logical default stage.
   */
  public static getNextDefaultStage(currentStage: CompanyLifecycleStage): CompanyLifecycleStage | undefined {
    const def = this.STAGE_DEFINITIONS[currentStage];
    return def?.defaultNextStage;
  }
}
