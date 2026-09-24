/**
 * HṚṢĪKEŚA (हृषीकेश) — Company & Project Operating System Types
 *
 * Domain types for persistent organizations, projects, departments,
 * products, customers, decision records, workforce assignments, and lifecycles.
 */

export type CompanyStatus =
  | 'PLANNING'
  | 'ACTIVE'
  | 'PAUSED'
  | 'SCALING'
  | 'RESTRUCTURING'
  | 'RETIRING'
  | 'RETIRED';

export interface ICompany {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description?: string;
  readonly mission?: string;
  readonly vision?: string;
  status: CompanyStatus;
  readonly industry?: string;
  readonly createdBy: string;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: string;
  updatedAt: string;
}

export type ProjectStatus =
  | 'PLANNING'
  | 'ACTIVE'
  | 'BLOCKED'
  | 'PAUSED'
  | 'COMPLETED'
  | 'ARCHIVED';

export type ProjectPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface IProject {
  readonly id: string;
  readonly companyId?: string | null;
  readonly name: string;
  readonly slug: string;
  readonly description?: string;
  readonly objective: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: string;
  updatedAt: string;
}

export interface IDepartment {
  readonly id: string;
  readonly companyId: string;
  readonly name: string;
  readonly slug: string;
  readonly description?: string;
  readonly leadAgentId?: string;
  readonly capabilities: readonly string[];
  readonly createdAt: string;
  updatedAt: string;
}

export type CompanyWorkforceStatus = 'active' | 'standby' | 'reassigned';

export interface ICompanyWorkforce {
  readonly id: string;
  readonly companyId: string;
  readonly agentId: string;
  readonly departmentId?: string | null;
  readonly roleTitle?: string;
  status: CompanyWorkforceStatus;
  readonly joinedAt: string;
}

export type ProductType = 'product' | 'service';

export type ProductStatus =
  | 'IDEA'
  | 'RESEARCH'
  | 'DESIGN'
  | 'DEVELOPMENT'
  | 'QA'
  | 'LAUNCH_READY'
  | 'ACTIVE'
  | 'IMPROVING'
  | 'SUNSETTING'
  | 'RETIRED';

export interface IProduct {
  readonly id: string;
  readonly companyId: string;
  readonly projectId?: string | null;
  readonly name: string;
  readonly description?: string;
  readonly type: ProductType;
  status: ProductStatus;
  version: string;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: string;
  updatedAt: string;
}

export type CustomerType = 'individual' | 'enterprise' | 'smb';

export type CustomerStatus =
  | 'PROSPECT'
  | 'LEAD'
  | 'QUALIFIED'
  | 'CONTRACTED'
  | 'ONBOARDING'
  | 'ACTIVE'
  | 'SUPPORT'
  | 'SUSPENDED'
  | 'CHURNED'
  | 'ARCHIVED';

export interface ICustomer {
  readonly id: string;
  readonly companyId: string;
  readonly name: string;
  readonly type: CustomerType;
  status: CustomerStatus;
  readonly contactReference?: string; // Token / identifier only, no raw credentials
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: string;
  updatedAt: string;
}

export type DecisionStatus =
  | 'PROPOSED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'SUPERSEDED'
  | 'RETIRED';

export interface IDecision {
  readonly id: string;
  readonly companyId: string;
  readonly projectId?: string | null;
  readonly title: string;
  readonly description?: string;
  readonly decision: string;
  readonly reasoning?: string;
  readonly madeBy: string; // Agent ID or Sovereign Operator identifier
  status: DecisionStatus;
  readonly supersedes?: string | null;
  readonly createdAt: string;
  updatedAt: string;
}

export type CompanyLifecycleStage =
  | 'market_need'
  | 'strategy_planning'
  | 'organization_setup'
  | 'customer_research'
  | 'product_design'
  | 'development'
  | 'quality_assurance'
  | 'marketing_sales'
  | 'contract_order'
  | 'fulfillment_delivery'
  | 'customer_onboarding'
  | 'billing_payment'
  | 'operations_monitoring'
  | 'continuous_improvement'
  | 'business_exit';

export interface LifecycleStageDefinition {
  readonly stage: CompanyLifecycleStage;
  readonly displayName: string;
  readonly description: string;
  readonly responsibleAgentIds: readonly string[];
  readonly defaultNextStage?: CompanyLifecycleStage;
}

export interface CompanyOverview {
  readonly company: ICompany;
  readonly activeProjectsCount: number;
  readonly productsCount: number;
  readonly customersCount: number;
  readonly assignedAgentsCount: number;
  readonly activeMissionsCount: number;
  readonly recentDecisions: readonly IDecision[];
  readonly departments: readonly IDepartment[];
  readonly workforce: readonly ICompanyWorkforce[];
}

export interface ProjectOverview {
  readonly project: IProject;
  readonly company?: ICompany;
  readonly products: readonly IProduct[];
  readonly activeMissionsCount: number;
  readonly recentDecisions: readonly IDecision[];
}
