/**
 * HṚṢĪKEŚA (हृषीकेश) — Organization Architect (Ritvan's Functional Domain)
 *
 * Provides organizational design, department templates, workforce topology proposals,
 * and capability mappings across the authoritative 17-agent workforce.
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
   * Standard Department Blueprints mapped to 17-agent competencies.
   */
  public static readonly STANDARD_DEPARTMENTS: readonly ProposedDepartmentTemplate[] = [
    {
      name: 'Strategy & Executive',
      slug: 'strategy',
      description: 'Strategic planning, vision alignment, and business model formulation.',
      leadAgentId: 'aja',
      capabilities: ['market_strategy', 'business_planning', 'okr_definition', 'vision_alignment']
    },
    {
      name: 'Market & Customer Intelligence',
      slug: 'intelligence',
      description: 'Market dynamics, competitor intelligence, customer needs, and requirements discovery.',
      leadAgentId: 'rahu',
      capabilities: ['competitive_analysis', 'market_intelligence', 'user_research', 'requirements_synthesis']
    },
    {
      name: 'Product Architecture',
      slug: 'product',
      description: 'Product specifications, UI/UX system design, and API blueprints.',
      leadAgentId: 'spoota',
      capabilities: ['system_architecture', 'api_design', 'ui_ux_specifications', 'technical_blueprints']
    },
    {
      name: 'Engineering & Construction',
      slug: 'engineering',
      description: 'Full-stack software construction, automated tool generation, and algorithmic implementation.',
      leadAgentId: 'gandiva',
      capabilities: ['code_implementation', 'refactoring', 'tool_generation', 'full_stack_development']
    },
    {
      name: 'Quality Assurance & Verification',
      slug: 'qa',
      description: 'Automated test design, defect identification, regression testing, and verification gates.',
      leadAgentId: 'vighna',
      capabilities: ['test_automation', 'edge_case_analysis', 'static_analysis', 'verification_gates']
    },
    {
      name: 'Go-To-Market & Growth',
      slug: 'growth',
      description: 'Distribution campaigns, content synthesis, marketing outreach, and positioning.',
      leadAgentId: 'raudra',
      capabilities: ['growth_marketing', 'distribution_channels', 'campaign_orchestration', 'copywriting']
    },
    {
      name: 'Legal, Compliance & Policy',
      slug: 'compliance',
      description: 'Contract analysis, regulatory compliance, privacy policies, and licensing checks.',
      leadAgentId: 'rutam',
      capabilities: ['compliance_audit', 'license_validation', 'contract_terms', 'policy_adherence']
    },
    {
      name: 'Release & Fulfillment',
      slug: 'fulfillment',
      description: 'Release engineering, automated deployment pipelines, build artifacts, and package dispatch.',
      leadAgentId: 'arvan',
      capabilities: ['release_pipelines', 'artifact_bundling', 'deployment_verification', 'delivery_automation']
    },
    {
      name: 'Customer Success & Support',
      slug: 'support',
      description: 'User onboarding, troubleshooting guides, documentation synthesis, and issue triage.',
      leadAgentId: 'taraka',
      capabilities: ['user_onboarding', 'support_triage', 'documentation', 'customer_enablement']
    },
    {
      name: 'Finance & Resource Accounting',
      slug: 'finance',
      description: 'Unit economics, pricing modeling, budget limits, and financial metrics.',
      leadAgentId: 'kalki',
      capabilities: ['unit_economics', 'cost_accounting', 'budget_allocation', 'financial_reporting']
    },
    {
      name: 'Operations & Reliability',
      slug: 'operations',
      description: 'Runtime telemetry, SLA monitoring, infrastructure health, and environmental stability.',
      leadAgentId: 'garuda',
      capabilities: ['runtime_telemetry', 'sla_monitoring', 'infrastructure_health', 'log_auditing']
    },
    {
      name: 'Continuous Evolution',
      slug: 'improvement',
      description: 'Evolutionary feedback loops, debt reduction, code optimization, and performance tuning.',
      leadAgentId: 'kali',
      capabilities: ['technical_debt_cleanup', 'performance_optimization', 'feedback_loops', 'self_healing']
    },
    {
      name: 'Incident Recovery',
      slug: 'recovery',
      description: 'Crash recovery, state restoration, transaction rollbacks, and operational safeguards.',
      leadAgentId: 'yama',
      capabilities: ['incident_recovery', 'state_restoration', 'failure_mitigation', 'emergency_rollback']
    },
    {
      name: 'Lifecycle & Decommissioning',
      slug: 'lifecycle',
      description: 'Controlled teardown, data archival, service retirement, and business exits.',
      leadAgentId: 'mrtyu',
      capabilities: ['service_retirement', 'data_archival', 'graceful_deprecation', 'teardown_protocols']
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

    // Generate natural workforce assignments
    const assignments: ProposedWorkforceAssignment[] = [
      { agentId: 'aja', departmentSlug: 'strategy', roleTitle: 'Chief Strategy Architect' },
      { agentId: 'rahu', departmentSlug: 'intelligence', roleTitle: 'Market Intelligence Lead' },
      { agentId: 'tvas', departmentSlug: 'intelligence', roleTitle: 'Customer Research Specialist' },
      { agentId: 'spoota', departmentSlug: 'product', roleTitle: 'Principal Product Architect' },
      { agentId: 'gandiva', departmentSlug: 'engineering', roleTitle: 'Lead Software Engineer' },
      { agentId: 'vighna', departmentSlug: 'qa', roleTitle: 'Principal QA & Verification Lead' },
      { agentId: 'raudra', departmentSlug: 'growth', roleTitle: 'Go-To-Market Strategist' },
      { agentId: 'rutam', departmentSlug: 'compliance', roleTitle: 'Legal & Policy Custodian' },
      { agentId: 'arvan', departmentSlug: 'fulfillment', roleTitle: 'Release & Delivery Master' },
      { agentId: 'taraka', departmentSlug: 'support', roleTitle: 'Customer Success Advocate' },
      { agentId: 'kalki', departmentSlug: 'finance', roleTitle: 'Financial & Resource Controller' },
      { agentId: 'garuda', departmentSlug: 'operations', roleTitle: 'Operations & Reliability Sentinel' },
      { agentId: 'kali', departmentSlug: 'improvement', roleTitle: 'Continuous Improvement Engineer' },
      { agentId: 'yama', departmentSlug: 'recovery', roleTitle: 'Resilience & Recovery Custodian' },
      { agentId: 'mrtyu', departmentSlug: 'lifecycle', roleTitle: 'Lifecycle & Decommissioning Officer' },
      { agentId: 'ritvan', departmentSlug: 'strategy', roleTitle: 'Organizational Architecture Director' },
      { agentId: 'kaala', departmentSlug: 'operations', roleTitle: 'Temporal & Resource Scheduler' }
    ];

    return { departments, assignments };
  }
}
