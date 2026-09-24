/**
 * HṚṢĪKEŚA (हृषीकेश) — Company Operating System Service
 *
 * Central facade managing persistent organizations, projects, departments,
 * products, customers, decision registers, workforce assignments, and scoped context.
 */

import { randomUUID } from 'crypto';
import { CompanyRepository } from '../../persistence/repositories/company.repository.js';
import { ProjectRepository } from '../../persistence/repositories/project.repository.js';
import { DepartmentRepository } from '../../persistence/repositories/department.repository.js';
import { CompanyWorkforceRepository } from '../../persistence/repositories/company-workforce.repository.js';
import { ProductRepository } from '../../persistence/repositories/product.repository.js';
import { CustomerRepository } from '../../persistence/repositories/customer.repository.js';
import { DecisionRepository } from '../../persistence/repositories/decision.repository.js';
import { MissionRepository } from '../../persistence/repositories/mission.repository.js';
import { ArtifactRepository } from '../../persistence/repositories/artifact.repository.js';
import {
  ICompany,
  IProject,
  IDepartment,
  ICompanyWorkforce,
  IProduct,
  ICustomer,
  IDecision,
  CompanyOverview,
  ProjectOverview,
  CompanyStatus,
  ProjectStatus,
  ProjectPriority,
  ProductStatus,
  CustomerStatus,
  DecisionStatus
} from '../interfaces/company.types.js';
import { OrganizationArchitect } from '../roles/organization.architect.js';
import { IMission, MissionArtifact } from '../../agents/interfaces/mission.types.js';

export interface CreateCompanyInput {
  name: string;
  slug?: string;
  description?: string;
  mission?: string;
  vision?: string;
  industry?: string;
  createdBy?: string;
  metadata?: Record<string, unknown>;
  autoSetupDepartments?: boolean;
}

export interface CreateProjectInput {
  companyId?: string | null;
  name: string;
  slug?: string;
  description?: string;
  objective: string;
  priority?: ProjectPriority;
  metadata?: Record<string, unknown>;
}

export interface CreateProductInput {
  companyId: string;
  projectId?: string | null;
  name: string;
  description?: string;
  type?: 'product' | 'service';
  version?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateCustomerInput {
  companyId: string;
  name: string;
  type?: 'individual' | 'enterprise' | 'smb';
  contactReference?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateDecisionInput {
  companyId: string;
  projectId?: string | null;
  title: string;
  description?: string;
  decision: string;
  reasoning?: string;
  madeBy: string;
  supersedes?: string | null;
}

export class CompanyService {
  constructor(
    private readonly companyRepo: CompanyRepository,
    private readonly projectRepo: ProjectRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly workforceRepo: CompanyWorkforceRepository,
    private readonly productRepo: ProductRepository,
    private readonly customerRepo: CustomerRepository,
    private readonly decisionRepo: DecisionRepository,
    private readonly missionRepo: MissionRepository,
    private readonly artifactRepo: ArtifactRepository
  ) {}

  // ==========================================
  // COMPANY MANAGEMENT
  // ==========================================

  public createCompany(input: CreateCompanyInput): ICompany {
    const now = new Date().toISOString();
    const slug = input.slug || this.slugify(input.name);

    const existing = this.companyRepo.getBySlug(slug);
    if (existing) {
      throw new Error(`Company with slug '${slug}' already exists.`);
    }

    const company: ICompany = {
      id: randomUUID(),
      name: input.name,
      slug,
      description: input.description,
      mission: input.mission,
      vision: input.vision,
      status: 'PLANNING',
      industry: input.industry,
      createdBy: input.createdBy || 'hrisekesa',
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now
    };

    const created = this.companyRepo.create(company);

    if (input.autoSetupDepartments) {
      const blueprint = OrganizationArchitect.proposeInitialOrganization(created.id);
      for (const dept of blueprint.departments) {
        this.createDepartment(dept);
      }
      for (const assignment of blueprint.assignments) {
        const dept = this.departmentRepo.getByCompanyAndSlug(created.id, assignment.departmentSlug);
        this.assignAgentToCompany({
          companyId: created.id,
          agentId: assignment.agentId,
          departmentId: dept?.id,
          roleTitle: assignment.roleTitle
        });
      }
    }

    return created;
  }

  public getCompany(id: string): ICompany | undefined {
    return this.companyRepo.get(id);
  }

  public getCompanyBySlug(slug: string): ICompany | undefined {
    return this.companyRepo.getBySlug(slug);
  }

  public listCompanies(limit = 50, offset = 0): ICompany[] {
    return this.companyRepo.list(limit, offset);
  }

  public updateCompanyStatus(id: string, status: CompanyStatus): ICompany {
    return this.companyRepo.update(id, { status, updatedAt: new Date().toISOString() });
  }

  public updateCompany(id: string, updates: Partial<ICompany>): ICompany {
    return this.companyRepo.update(id, updates);
  }

  // ==========================================
  // PROJECT MANAGEMENT
  // ==========================================

  public createProject(input: CreateProjectInput): IProject {
    const now = new Date().toISOString();
    const slug = input.slug || this.slugify(input.name);

    const project: IProject = {
      id: randomUUID(),
      companyId: input.companyId || null,
      name: input.name,
      slug,
      description: input.description,
      objective: input.objective || input.description || input.name,
      status: 'PLANNING',
      priority: input.priority || 'normal',
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now
    };

    return this.projectRepo.create(project);
  }

  public getProject(id: string): IProject | undefined {
    return this.projectRepo.get(id);
  }

  public listProjects(limit = 50, offset = 0): IProject[] {
    return this.projectRepo.list(limit, offset);
  }

  public listProjectsByCompany(companyId: string): IProject[] {
    return this.projectRepo.listByCompany(companyId);
  }

  public updateProjectStatus(id: string, status: ProjectStatus): IProject {
    return this.projectRepo.update(id, { status, updatedAt: new Date().toISOString() });
  }

  public updateProject(id: string, updates: Partial<IProject>): IProject {
    return this.projectRepo.update(id, updates);
  }

  // ==========================================
  // DEPARTMENT & WORKFORCE
  // ==========================================

  public createDepartment(input: {
    companyId: string;
    name: string;
    slug?: string;
    description?: string;
    leadAgentId?: string;
    capabilities?: readonly string[] | string[];
  }): IDepartment {
    const now = new Date().toISOString();
    const slug = input.slug || this.slugify(input.name);

    const department: IDepartment = {
      id: randomUUID(),
      companyId: input.companyId,
      name: input.name,
      slug,
      description: input.description,
      leadAgentId: input.leadAgentId,
      capabilities: input.capabilities || [],
      createdAt: now,
      updatedAt: now
    };

    return this.departmentRepo.create(department);
  }

  public listDepartments(companyId: string): IDepartment[] {
    return this.departmentRepo.listByCompany(companyId);
  }

  public autoSetupDepartments(companyId: string): { departments: IDepartment[]; workforce: ICompanyWorkforce[] } {
    const blueprint = OrganizationArchitect.proposeInitialOrganization(companyId);
    const createdDepts: IDepartment[] = [];
    for (const dept of blueprint.departments) {
      const existing = this.departmentRepo.getByCompanyAndSlug(companyId, dept.slug);
      if (!existing) {
        createdDepts.push(this.createDepartment(dept));
      } else {
        createdDepts.push(existing);
      }
    }
    const createdWorkforce: ICompanyWorkforce[] = [];
    for (const assignment of blueprint.assignments) {
      const dept = this.departmentRepo.getByCompanyAndSlug(companyId, assignment.departmentSlug);
      createdWorkforce.push(this.assignAgentToCompany({
        companyId,
        agentId: assignment.agentId,
        departmentId: dept?.id,
        roleTitle: assignment.roleTitle
      }));
    }
    return { departments: createdDepts, workforce: createdWorkforce };
  }

  public assignAgentToCompany(input: {
    companyId: string;
    agentId: string;
    departmentId?: string | null;
    roleTitle?: string;
  }): ICompanyWorkforce {
    const existing = this.workforceRepo.getByCompanyAndAgent(input.companyId, input.agentId);
    if (existing) {
      return this.workforceRepo.update(existing.id, {
        departmentId: input.departmentId,
        roleTitle: input.roleTitle,
        status: 'active'
      });
    }

    const assignment: ICompanyWorkforce = {
      id: randomUUID(),
      companyId: input.companyId,
      agentId: input.agentId,
      departmentId: input.departmentId || null,
      roleTitle: input.roleTitle,
      status: 'active',
      joinedAt: new Date().toISOString()
    };

    return this.workforceRepo.create(assignment);
  }

  public listCompanyWorkforce(companyId: string): ICompanyWorkforce[] {
    return this.workforceRepo.listByCompany(companyId);
  }

  // ==========================================
  // PRODUCT & SERVICE CATALOG
  // ==========================================

  public createProduct(input: CreateProductInput): IProduct {
    const now = new Date().toISOString();
    const product: IProduct = {
      id: randomUUID(),
      companyId: input.companyId,
      projectId: input.projectId || null,
      name: input.name,
      description: input.description,
      type: input.type || 'product',
      status: 'IDEA',
      version: input.version || '0.1.0',
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now
    };

    return this.productRepo.create(product);
  }

  public listProductsByCompany(companyId: string): IProduct[] {
    return this.productRepo.listByCompany(companyId);
  }

  public listProductsByProject(projectId: string): IProduct[] {
    return this.productRepo.listByProject(projectId);
  }

  public updateProductStatus(id: string, status: ProductStatus): IProduct {
    return this.productRepo.update(id, { status, updatedAt: new Date().toISOString() });
  }

  // ==========================================
  // CUSTOMER REGISTRY
  // ==========================================

  public createCustomer(input: CreateCustomerInput): ICustomer {
    const now = new Date().toISOString();
    const customer: ICustomer = {
      id: randomUUID(),
      companyId: input.companyId,
      name: input.name,
      type: input.type || 'smb',
      status: 'PROSPECT',
      contactReference: input.contactReference,
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now
    };

    return this.customerRepo.create(customer);
  }

  public listCustomersByCompany(companyId: string): ICustomer[] {
    return this.customerRepo.listByCompany(companyId);
  }

  public updateCustomerStatus(id: string, status: CustomerStatus): ICustomer {
    return this.customerRepo.update(id, { status, updatedAt: new Date().toISOString() });
  }

  // ==========================================
  // DECISION REGISTER (ADR / PDR)
  // ==========================================

  public recordDecision(input: CreateDecisionInput): IDecision {
    const now = new Date().toISOString();
    const decision: IDecision = {
      id: randomUUID(),
      companyId: input.companyId,
      projectId: input.projectId || null,
      title: input.title,
      description: input.description,
      decision: input.decision,
      reasoning: input.reasoning,
      madeBy: input.madeBy,
      status: 'ACCEPTED',
      supersedes: input.supersedes || null,
      createdAt: now,
      updatedAt: now
    };

    return this.decisionRepo.create(decision);
  }

  public listDecisionsByCompany(companyId: string): IDecision[] {
    return this.decisionRepo.listByCompany(companyId);
  }

  public listDecisionsByProject(projectId: string): IDecision[] {
    return this.decisionRepo.listByProject(projectId);
  }

  public updateDecisionStatus(id: string, status: DecisionStatus): IDecision {
    return this.decisionRepo.update(id, { status, updatedAt: new Date().toISOString() });
  }

  // ==========================================
  // MISSIONS & ARTIFACTS LINKAGE
  // ==========================================

  public listMissionsByCompany(companyId: string): IMission[] {
    return this.missionRepo.listByCompany(companyId);
  }

  public listMissionsByProject(projectId: string): IMission[] {
    return this.missionRepo.listByProject(projectId);
  }

  public listArtifactsByCompany(companyId: string): MissionArtifact[] {
    return this.artifactRepo.listByCompany(companyId);
  }

  public listArtifactsByProject(projectId: string): MissionArtifact[] {
    return this.artifactRepo.listByProject(projectId);
  }

  // ==========================================
  // AGGREGATED OVERVIEWS
  // ==========================================

  public getCompanyOverview(companyId: string): CompanyOverview {
    const company = this.companyRepo.get(companyId);
    if (!company) throw new Error(`Company '${companyId}' not found.`);

    const projects = this.projectRepo.listByCompany(companyId);
    const products = this.productRepo.listByCompany(companyId);
    const customers = this.customerRepo.listByCompany(companyId);
    const workforce = this.workforceRepo.listByCompany(companyId);
    const departments = this.departmentRepo.listByCompany(companyId);
    const missions = this.missionRepo.listByCompany(companyId);
    const decisions = this.decisionRepo.listByCompany(companyId);

    const activeProjects = projects.filter((p) => p.status === 'ACTIVE' || p.status === 'PLANNING');
    const activeMissions = missions.filter((m) =>
      ['pending', 'planning', 'ready', 'running', 'waiting', 'blocked', 'verifying'].includes(m.status)
    );

    return {
      company,
      activeProjectsCount: activeProjects.length,
      productsCount: products.length,
      customersCount: customers.length,
      assignedAgentsCount: workforce.length,
      activeMissionsCount: activeMissions.length,
      recentDecisions: decisions.slice(0, 10),
      departments,
      workforce
    };
  }

  public getProjectOverview(projectId: string): ProjectOverview {
    const project = this.projectRepo.get(projectId);
    if (!project) throw new Error(`Project '${projectId}' not found.`);

    const company = project.companyId ? this.companyRepo.get(project.companyId) : undefined;
    const products = this.productRepo.listByProject(projectId);
    const missions = this.missionRepo.listByProject(projectId);
    const decisions = this.decisionRepo.listByProject(projectId);

    const activeMissions = missions.filter((m) =>
      ['pending', 'planning', 'ready', 'running', 'waiting', 'blocked', 'verifying'].includes(m.status)
    );

    return {
      project,
      company,
      products,
      activeMissionsCount: activeMissions.length,
      recentDecisions: decisions.slice(0, 10)
    };
  }

  // ==========================================
  // CONTEXTUAL SCOPED MEMORY INJECTION
  // ==========================================

  /**
   * Generates scoped context for mission execution.
   * STRICT INVARIANT: Company context supplements agent context without overwriting
   * HṚṢĪKEŚA global identity or creator profile.
   */
  public getScopedContext(companyId?: string, projectId?: string): string {
    const sections: string[] = [];

    if (companyId) {
      const company = this.companyRepo.get(companyId);
      if (company) {
        sections.push(
          `[COMPANY OPERATING CONTEXT]\n` +
            `Company: ${company.name} (Status: ${company.status})\n` +
            (company.mission ? `Mission: ${company.mission}\n` : '') +
            (company.vision ? `Vision: ${company.vision}\n` : '') +
            (company.description ? `Description: ${company.description}\n` : '')
        );
      }
    }

    if (projectId) {
      const project = this.projectRepo.get(projectId);
      if (project) {
        sections.push(
          `[PROJECT OPERATING CONTEXT]\n` +
            `Project: ${project.name} (Status: ${project.status}, Priority: ${project.priority})\n` +
            `Objective: ${project.objective}\n` +
            (project.description ? `Description: ${project.description}\n` : '')
        );
      }
    }

    return sections.join('\n');
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
