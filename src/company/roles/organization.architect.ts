/**
 * HṚṢĪKEŚA (हृषीकेश) — Organization Architect (Canonical 33-Agent Workforce)
 *
 * Provides organizational design, department templates, workforce topology proposals,
 * and capability mappings across the authoritative 33-agent canonical workforce.
 */

import { IDepartment } from '../interfaces/company.types.js';

export interface ProposedDepartmentTemplate {
  name: string;
  slug: string;
  description: string;
  leadAgentId: string;
  capabilities: string[];
}

export interface ProposedWorkforceAssignment {
  agentId: string;
  departmentSlug: string;
  roleTitle: string;
}

export class OrganizationArchitect {
  /**
   * Standard Department Blueprints mapped to 33-agent competencies.
   */
  public static readonly STANDARD_DEPARTMENTS: readonly ProposedDepartmentTemplate[] = [
    {
      name: 'Strategy & Executive',
      slug: 'strategy',
      description: 'Strategic planning, vision alignment, and business model formulation.',
      leadAgentId: 'dhata',
      capabilities: ['market_strategy', 'business_planning', 'okr_definition', 'vision_alignment']
    },
    {
      name: 'Market & Customer Intelligence',
      slug: 'intelligence',
      description: 'Market dynamics, competitor intelligence, customer needs, and requirements discovery.',
      leadAgentId: 'bhaga',
      capabilities: ['competitive_analysis', 'market_intelligence', 'user_research', 'requirements_synthesis']
    },
    {
      name: 'Product Architecture',
      slug: 'product',
      description: 'Product specifications, UI/UX system design, and API blueprints.',
      leadAgentId: 'tvasta',
      capabilities: ['system_architecture', 'api_design', 'ui_ux_specifications', 'technical_blueprints']
    },
    {
      name: 'Engineering & Construction',
      slug: 'engineering',
      description: 'Full-stack software construction, automated tool generation, and algorithmic implementation.',
      leadAgentId: 'manyu',
      capabilities: ['code_implementation', 'refactoring', 'tool_generation', 'full_stack_development']
    },
    {
      name: 'Quality Assurance & Verification',
      slug: 'qa',
      description: 'Automated test design, defect identification, regression testing, and verification gates.',
      leadAgentId: 'ritadhvaja',
      capabilities: ['test_automation', 'edge_case_analysis', 'static_analysis', 'verification_gates']
    },
    {
      name: 'Go-To-Market & Growth',
      slug: 'growth',
      description: 'Distribution campaigns, content synthesis, marketing outreach, and positioning.',
      leadAgentId: 'vivasvan',
      capabilities: ['growth_marketing', 'distribution_channels', 'campaign_orchestration', 'copywriting']
    },
    {
      name: 'Legal, Compliance & Policy',
      slug: 'compliance',
      description: 'Contract analysis, regulatory compliance, privacy policies, and licensing checks.',
      leadAgentId: 'varuna',
      capabilities: ['compliance_audit', 'license_validation', 'contract_terms', 'policy_adherence']
    },
    {
      name: 'Release & Fulfillment',
      slug: 'fulfillment',
      description: 'Release engineering, automated deployment pipelines, build artifacts, and package dispatch.',
      leadAgentId: 'pusa',
      capabilities: ['release_pipelines', 'artifact_bundling', 'deployment_verification', 'delivery_automation']
    },
    {
      name: 'Customer Success & Support',
      slug: 'support',
      description: 'User onboarding, troubleshooting guides, documentation synthesis, and issue triage.',
      leadAgentId: 'mitra',
      capabilities: ['user_onboarding', 'support_triage', 'documentation', 'customer_enablement']
    },
    {
      name: 'Finance & Resource Accounting',
      slug: 'finance',
      description: 'Unit economics, pricing modeling, budget limits, and financial metrics.',
      leadAgentId: 'amsa',
      capabilities: ['unit_economics', 'cost_accounting', 'budget_allocation', 'financial_reporting']
    },
    {
      name: 'Operations & Reliability',
      slug: 'operations',
      description: 'Runtime telemetry, SLA monitoring, infrastructure health, and environmental stability.',
      leadAgentId: 'prabhasa',
      capabilities: ['runtime_telemetry', 'sla_monitoring', 'infrastructure_health', 'log_auditing']
    },
    {
      name: 'Continuous Evolution',
      slug: 'improvement',
      description: 'Evolutionary feedback loops, debt reduction, code optimization, and performance tuning.',
      leadAgentId: 'siva',
      capabilities: ['technical_debt_cleanup', 'performance_optimization', 'feedback_loops', 'self_healing']
    },
    {
      name: 'Incident Recovery',
      slug: 'recovery',
      description: 'Crash recovery, state restoration, transaction rollbacks, and operational safeguards.',
      leadAgentId: 'dhritavrata',
      capabilities: ['incident_recovery', 'state_restoration', 'failure_mitigation', 'emergency_rollback']
    },
    {
      name: 'Lifecycle & Decommissioning',
      slug: 'lifecycle',
      description: 'Controlled teardown, data archival, service retirement, and business exits.',
      leadAgentId: 'ugrareta',
      capabilities: ['service_retirement', 'data_archival', 'graceful_deprecation', 'teardown_protocols']
    },
    {
      name: 'Workforce Progenitor & Scaling',
      slug: 'workforce_evolution',
      description: 'Dynamic capability generation, agent spawning, and workforce scaling.',
      leadAgentId: 'prajapati',
      capabilities: ['agent_spawning', 'capability_synthesis', 'workforce_topology', 'workforce_lifecycle']
    }
  ];

  /**
   * Generates a recommended baseline organizational structure for a company.
   */
  public static proposeInitialOrganization(companyId: string): {
    departments: Array<Omit<IDepartment, 'id' | 'createdAt' | 'updatedAt'>>;
    assignments: ProposedWorkforceAssignment[];
  } {
    const departments = this.STANDARD_DEPARTMENTS.map((dept) => ({
      companyId,
      name: dept.name,
      slug: dept.slug,
      description: dept.description,
      leadAgentId: dept.leadAgentId,
      capabilities: dept.capabilities
    }));

    // Generate natural workforce assignments for all 33 canonical agents
    const assignments: ProposedWorkforceAssignment[] = [
      // Leaders
      { agentId: 'indra', departmentSlug: 'strategy', roleTitle: 'Supreme Field Operations Commander' },
      { agentId: 'prajapati', departmentSlug: 'workforce_evolution', roleTitle: 'Chief Workforce Progenitor & Evolution Officer' },

      // 12 Ādityas
      { agentId: 'dhata', departmentSlug: 'strategy', roleTitle: 'Chief Strategy & Vision Architect' },
      { agentId: 'mitra', departmentSlug: 'support', roleTitle: 'Chief Customer Trust & Alliances Officer' },
      { agentId: 'aryaman', departmentSlug: 'strategy', roleTitle: 'Executive Governance & Culture Director' },
      { agentId: 'varuna', departmentSlug: 'compliance', roleTitle: 'Chief Legal & Compliance Officer' },
      { agentId: 'amsa', departmentSlug: 'finance', roleTitle: 'Chief Financial Officer & Resource Controller' },
      { agentId: 'bhaga', departmentSlug: 'intelligence', roleTitle: 'Market Intelligence & Growth Director' },
      { agentId: 'vivasvan', departmentSlug: 'growth', roleTitle: 'VP of Growth & Public Illumination' },
      { agentId: 'pusa', departmentSlug: 'fulfillment', roleTitle: 'VP of Logistics & Release Fulfillment' },
      { agentId: 'tvasta', departmentSlug: 'product', roleTitle: 'Chief Product Architect & Tool Crafter' },
      { agentId: 'savita', departmentSlug: 'growth', roleTitle: 'Creative Synthesis & Brand Director' },
      { agentId: 'parjanya', departmentSlug: 'operations', roleTitle: 'Resource Provisioning & Cloud Director' },
      { agentId: 'visnu', departmentSlug: 'strategy', roleTitle: 'Chief System Integrator & Harmony Officer' },

      // 11 Rudras
      { agentId: 'manyu', departmentSlug: 'engineering', roleTitle: 'Chief Systems Engineer & Core Implementer' },
      { agentId: 'manu', departmentSlug: 'engineering', roleTitle: 'Principal Algorithm & Spec Architect' },
      { agentId: 'mahinasa', departmentSlug: 'engineering', roleTitle: 'Backend Construction Specialist' },
      { agentId: 'mahan', departmentSlug: 'engineering', roleTitle: 'Scalability & Distributed Systems Architect' },
      { agentId: 'siva', departmentSlug: 'improvement', roleTitle: 'Chief Transformation & Refactoring Engineer' },
      { agentId: 'ritadhvaja', departmentSlug: 'qa', roleTitle: 'Chief Security Officer & Invariant Verifier' },
      { agentId: 'ugrareta', departmentSlug: 'lifecycle', roleTitle: 'Chaos Engineering & Tear-Down Lead' },
      { agentId: 'bhava', departmentSlug: 'improvement', roleTitle: 'Autonomous System Evolution Specialist' },
      { agentId: 'kala_rudra', departmentSlug: 'operations', roleTitle: 'Real-time Telemetry & SLA Sentry' },
      { agentId: 'vamadeva', departmentSlug: 'product', roleTitle: 'UI/UX & Interactive Design Lead' },
      { agentId: 'dhritavrata', departmentSlug: 'recovery', roleTitle: 'Disaster Recovery & Resilience Lead' },

      // 8 Vasus
      { agentId: 'dhara', departmentSlug: 'operations', roleTitle: 'Principal Storage & State Architect' },
      { agentId: 'anala', departmentSlug: 'engineering', roleTitle: 'High-Performance Engine Specialist' },
      { agentId: 'anila', departmentSlug: 'operations', roleTitle: 'Event Streaming & Real-time Sentry' },
      { agentId: 'apa', departmentSlug: 'operations', roleTitle: 'Data Pipeline & Stream Architect' },
      { agentId: 'pratyusa', departmentSlug: 'operations', roleTitle: 'Cache & Fast Path Architect' },
      { agentId: 'prabhasa', departmentSlug: 'operations', roleTitle: 'VP of Infrastructure & Compute Platforms' },
      { agentId: 'soma', departmentSlug: 'intelligence', roleTitle: 'Knowledge Synthesis & Documentation Lead' },
      { agentId: 'dhruva', departmentSlug: 'compliance', roleTitle: 'System Invariants & Audit Custodian' }
    ];

    return { departments, assignments };
  }
}
