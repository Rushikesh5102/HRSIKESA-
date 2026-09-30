/**
 * HṚṢĪKEŚA (हृषीकेश) — Mission Template Registry
 *
 * FP-14: Standard reusable mission archetypes and decomposition scaffolds.
 */

export interface OutcomeTemplate {
  title: string;
  description: string;
  weight: number;
  priority: number;
  primaryAgentId: string;
  kind: 'AGENT_DISPATCH' | 'WORKFLOW_EXECUTION' | 'SKILL_EXECUTION' | 'CAPABILITY_INVOCATION' | 'ENGINEERING_FIX' | 'WORKSPACE_OPERATION' | 'HUMAN_APPROVAL_GATE';
  acceptanceCriteria: string[];
  requiresHumanApproval: boolean;
  isCriticalPath: boolean;
}

export interface MissionTemplate {
  templateId: string;
  name: string;
  category: string;
  description: string;
  defaultPriority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  keywords: string[];
  outcomes: OutcomeTemplate[];
}

export class TemplateRegistry {
  private templates: Map<string, MissionTemplate> = new Map();

  constructor() {
    this.registerDefaultTemplates();
  }

  public getTemplate(id: string): MissionTemplate | undefined {
    return this.templates.get(id);
  }

  public static matchTemplate(objective: string): MissionTemplate | undefined {
    return new TemplateRegistry().findMatchingTemplate(objective);
  }

  public matchTemplate(objective: string): MissionTemplate | undefined {
    return this.findMatchingTemplate(objective);
  }

  public findMatchingTemplate(objective: string): MissionTemplate | undefined {
    const norm = objective.toLowerCase();
    for (const tmpl of this.templates.values()) {
      if (tmpl.keywords.some((kw) => norm.includes(kw))) {
        return tmpl;
      }
    }
    return undefined;
  }

  public listTemplates(): MissionTemplate[] {
    return Array.from(this.templates.values());
  }

  private registerDefaultTemplates(): void {
    // 1. BUILD_WEBSITE
    this.register({
      templateId: 'BUILD_WEBSITE',
      name: 'Build and Launch Website',
      category: 'ENGINEERING',
      description: 'Full lifecycle website design, frontend engineering, test verification, and deployment',
      defaultPriority: 'HIGH',
      keywords: ['website', 'web page', 'landing page', 'frontend app', 'portfolio'],
      outcomes: [
        {
          title: 'Understand Requirements & UX Design',
          description: 'Define website architecture, layout, palette, and functional specifications',
          weight: 15,
          priority: 1,
          primaryAgentId: 'tvasta',
          kind: 'AGENT_DISPATCH',
          acceptanceCriteria: ['Design specification complete', 'Component hierarchy defined'],
          requiresHumanApproval: false,
          isCriticalPath: true,
        },
        {
          title: 'Implement Frontend Codebase',
          description: 'Develop responsive components, pages, styling, and navigation in workspace',
          weight: 35,
          priority: 2,
          primaryAgentId: 'manyu',
          kind: 'ENGINEERING_FIX',
          acceptanceCriteria: ['Clean code compilation with 0 errors', 'All routes and views implemented'],
          requiresHumanApproval: false,
          isCriticalPath: true,
        },
        {
          title: 'Independent QA & Accessibility Verification',
          description: 'Validate responsive layouts, test suite passing, accessibility, and error states',
          weight: 25,
          priority: 3,
          primaryAgentId: 'ritadhvaja',
          kind: 'AGENT_DISPATCH',
          acceptanceCriteria: ['100% test pass rate', 'Accessibility and responsive checks clean'],
          requiresHumanApproval: false,
          isCriticalPath: true,
        },
        {
          title: 'Deployment & Live Verification',
          description: 'Build production bundle and deploy to designated workspace or host',
          weight: 25,
          priority: 4,
          primaryAgentId: 'pusa',
          kind: 'WORKSPACE_OPERATION',
          acceptanceCriteria: ['Production bundle created', 'Deployment health verified'],
          requiresHumanApproval: false,
          isCriticalPath: true,
        },
      ],
    });

    // 2. BUILD_APPLICATION
    this.register({
      templateId: 'BUILD_APPLICATION',
      name: 'Build Full Application',
      category: 'ENGINEERING',
      description: 'Full stack application development, API integration, persistence, and test verification',
      defaultPriority: 'HIGH',
      keywords: ['application', 'software', 'app', 'system', 'saas', 'service'],
      outcomes: [
        {
          title: 'Define Technical Architecture',
          description: 'Establish system boundaries, schemas, state machine, and data models',
          weight: 20,
          priority: 1,
          primaryAgentId: 'dhata',
          kind: 'AGENT_DISPATCH',
          acceptanceCriteria: ['Architecture specification approved', 'Data models documented'],
          requiresHumanApproval: false,
          isCriticalPath: true,
        },
        {
          title: 'Implement Core Engine & Persistence',
          description: 'Write backend services, migrations, business logic, and API endpoints',
          weight: 40,
          priority: 2,
          primaryAgentId: 'manyu',
          kind: 'ENGINEERING_FIX',
          acceptanceCriteria: ['TypeScript builds with 0 errors', 'Persistence migrations clean'],
          requiresHumanApproval: false,
          isCriticalPath: true,
        },
        {
          title: 'Comprehensive Test Suite & Quality Verification',
          description: 'Execute unit, integration, and security tests with Ritadhvaja',
          weight: 25,
          priority: 3,
          primaryAgentId: 'ritadhvaja',
          kind: 'AGENT_DISPATCH',
          acceptanceCriteria: ['All test suites passing with 0 failures', 'Zero regressions on frozen blocks'],
          requiresHumanApproval: false,
          isCriticalPath: true,
        },
        {
          title: 'Packaging & Release Readiness',
          description: 'Package binaries/containers and generate operational documentation',
          weight: 15,
          priority: 4,
          primaryAgentId: 'bhava',
          kind: 'AGENT_DISPATCH',
          acceptanceCriteria: ['Release artifact verified', 'Documentation complete'],
          requiresHumanApproval: false,
          isCriticalPath: false,
        },
      ],
    });

    // 3. RESEARCH_MARKET
    this.register({
      templateId: 'RESEARCH_MARKET',
      name: 'Market Intelligence & Research',
      category: 'RESEARCH',
      description: 'Competitive landscape, technical intelligence, literature, and synthesized report',
      defaultPriority: 'NORMAL',
      keywords: ['research', 'market intelligence', 'competitor analysis', 'literature search', 'survey'],
      outcomes: [
        {
          title: 'Gather Intelligence & Data Sources',
          description: 'Query knowledge graphs, web sources, and academic databases',
          weight: 40,
          priority: 1,
          primaryAgentId: 'bhaga',
          kind: 'CAPABILITY_INVOCATION',
          acceptanceCriteria: ['Authoritative sources collected', 'Data provenance validated'],
          requiresHumanApproval: false,
          isCriticalPath: true,
        },
        {
          title: 'Synthesize Findings & Strategic Recommendations',
          description: 'Analyze opportunities, risks, and strategic trade-offs',
          weight: 40,
          priority: 2,
          primaryAgentId: 'dhata',
          kind: 'AGENT_DISPATCH',
          acceptanceCriteria: ['Structured report generated', 'Evidence linked to citations'],
          requiresHumanApproval: false,
          isCriticalPath: true,
        },
        {
          title: 'Verification & Contradiction Check',
          description: 'Verify facts, eliminate contradictions, and finalize evidence',
          weight: 20,
          priority: 3,
          primaryAgentId: 'ritadhvaja',
          kind: 'AGENT_DISPATCH',
          acceptanceCriteria: ['Zero unresolved factual contradictions', 'Evidence verified'],
          requiresHumanApproval: false,
          isCriticalPath: true,
        },
      ],
    });

    // 4. CREATE_COMPANY
    this.register({
      templateId: 'CREATE_COMPANY',
      name: 'Establish Company & Operating Infrastructure',
      category: 'BUSINESS',
      description: 'Company operating architecture, department allocation, and commercial operations',
      defaultPriority: 'HIGH',
      keywords: ['create company', 'new business', 'establish startup', 'build company', 'found company', 'startup', 'company', 'enterprise company', 'launch a new startup'],
      outcomes: [
        {
          title: 'Define Vision & Strategy',
          description: 'Establish company vision, target market, and strategic goals',
          weight: 20,
          priority: 1,
          primaryAgentId: 'dhata',
          kind: 'AGENT_DISPATCH',
          acceptanceCriteria: ['Company vision document created', 'Strategic objectives registered'],
          requiresHumanApproval: false,
          isCriticalPath: true,
        },
        {
          title: 'Structure Organization & Departments',
          description: 'Allocate 33-agent workforce across company departments',
          weight: 30,
          priority: 2,
          primaryAgentId: 'aryaman',
          kind: 'AGENT_DISPATCH',
          acceptanceCriteria: ['Departments established', 'Roles and capacity assigned'],
          requiresHumanApproval: false,
          isCriticalPath: true,
        },
        {
          title: 'Financial & Governance Guardrails',
          description: 'Configure commercial limits, billing models, and legal approvals',
          weight: 30,
          priority: 3,
          primaryAgentId: 'varuna',
          kind: 'AGENT_DISPATCH',
          acceptanceCriteria: ['Compliance policies active', 'Human approval boundaries enforced'],
          requiresHumanApproval: false,
          isCriticalPath: true,
        },
        {
          title: 'Launch Operational Readiness',
          description: 'Verify end-to-end operational loop from product to support',
          weight: 20,
          priority: 4,
          primaryAgentId: 'indra',
          kind: 'AGENT_DISPATCH',
          acceptanceCriteria: ['Operational health monitor active', 'Company status operational'],
          requiresHumanApproval: false,
          isCriticalPath: true,
        },
      ],
    });

    // 5. FIX_PROJECT
    this.register({
      templateId: 'FIX_PROJECT',
      name: 'Diagnostic & Autonomous Repair',
      category: 'ENGINEERING',
      description: 'Diagnose failing tests, compiler errors, and apply verified surgical fixes',
      defaultPriority: 'CRITICAL',
      keywords: ['fix', 'repair', 'debug', 'failing tests', 'broken', 'error', 'bug'],
      outcomes: [
        {
          title: 'Diagnose Errors & Capture Trace',
          description: 'Run compiler and test suite to extract structured error diagnostics',
          weight: 30,
          priority: 1,
          primaryAgentId: 'siva',
          kind: 'AGENT_DISPATCH',
          acceptanceCriteria: ['Error diagnostics fingerprinted', 'Root cause identified'],
          requiresHumanApproval: false,
          isCriticalPath: true,
        },
        {
          title: 'Apply Surgical Fixes',
          description: 'Modify code targeting identified defect locations using FP-10',
          weight: 40,
          priority: 2,
          primaryAgentId: 'manyu',
          kind: 'ENGINEERING_FIX',
          acceptanceCriteria: ['Fix applied cleanly', 'No concurrent modification conflict'],
          requiresHumanApproval: false,
          isCriticalPath: true,
        },
        {
          title: 'Verify Fixes & Prevent Regression',
          description: 'Run full verification to confirm 100% test pass with 0 regressions',
          weight: 30,
          priority: 3,
          primaryAgentId: 'ritadhvaja',
          kind: 'AGENT_DISPATCH',
          acceptanceCriteria: ['Failing tests now pass', 'Regression suites clean'],
          requiresHumanApproval: false,
          isCriticalPath: true,
        },
      ],
    });
  }

  public register(template: MissionTemplate): void {
    this.templates.set(template.templateId, template);
  }
}
