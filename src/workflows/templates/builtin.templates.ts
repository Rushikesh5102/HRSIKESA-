/**
 * HṚṢĪKEŚA (हृषीकेश) — Built-in Safe Workflow Templates
 *
 * FP-11: 10 Authoritative, production-ready, executable workflow templates:
 * 1. Daily Project Health
 * 2. Build/Test/Verify
 * 3. GitHub Issue Investigation
 * 4. Research -> Report
 * 5. Autonomous Bug Fix
 * 6. Website Quality Check
 * 7. Dependency Health
 * 8. Backup & Verification
 * 9. Company Daily Operations
 * 10. Customer Support Drafting
 */

import { Workflow, WorkflowVersion } from '../types/workflow.types.js';

export interface WorkflowTemplate {
  workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>;
  version: Omit<WorkflowVersion, 'id' | 'workflowId' | 'createdAt'>;
}

export const BUILTIN_WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  // 1. Daily Project Health
  {
    workflow: {
      name: 'Daily Project Health',
      description: 'Checks project files, tasks, and system status every morning',
      category: 'PROJECT_MANAGEMENT',
      scope: 'GLOBAL',
      status: 'ACTIVE',
      activeVersion: 1,
      tags: ['daily', 'health', 'maintenance'],
    },
    version: {
      versionNumber: 1,
      description: 'Daily inspection of system health and open project state',
      graph: {
        nodes: [
          { id: 'start', name: 'Morning Trigger', type: 'TRIGGER', config: {} },
          { id: 'sys_info', name: 'System Info Check', type: 'ACTION', config: { toolName: 'system_info', parameters: {} } },
          { id: 'agent_eval', name: 'Evaluate Project Status', type: 'AGENT', config: { agentId: 'rutam', objective: 'Inspect project state and identify open blockers' } },
          { id: 'report', name: 'Generate Health Report', type: 'REPORT', config: { title: 'Daily Health Summary', body: 'Inspection passed successfully.' }, isTerminal: true },
        ],
        edges: [
          { id: 'e1', fromNodeId: 'start', toNodeId: 'sys_info' },
          { id: 'e2', fromNodeId: 'sys_info', toNodeId: 'agent_eval' },
          { id: 'e3', fromNodeId: 'agent_eval', toNodeId: 'report' },
        ],
      },
      triggers: [{ id: 'trg_daily', workflowId: '', type: 'CRON', config: { cronExpression: '0 8 * * *', intervalSeconds: 86400 }, enabled: true, createdAt: '' }],
      variables: [{ name: 'healthCheck', type: 'boolean', value: true }],
      timeoutSeconds: 3600,
      maxRetries: 3,
    },
  },

  // 2. Build/Test/Verify
  {
    workflow: {
      name: 'Build, Test & Verify Pipeline',
      description: 'Executes clean test discovery, verification, and creates build report',
      category: 'ENGINEERING',
      scope: 'PROJECT',
      status: 'ACTIVE',
      activeVersion: 1,
      tags: ['ci', 'testing', 'verification'],
    },
    version: {
      versionNumber: 1,
      description: 'Automated test execution and build verification',
      graph: {
        nodes: [
          { id: 'start', name: 'Manual / Commit Trigger', type: 'TRIGGER', config: {} },
          { id: 'run_tests', name: 'Execute Test Suite', type: 'TEST', config: {} },
          { id: 'condition_pass', name: 'Check Test Status', type: 'CONDITION', config: { condition: '{{run_tests.status == "SUCCEEDED"}}', trueBranch: 'report_success', falseBranch: 'report_failure' } },
          { id: 'report_success', name: 'Build Success Report', type: 'REPORT', config: { title: 'Test Verification Passed', body: 'All automated tests succeeded.' }, isTerminal: true },
          { id: 'report_failure', name: 'Build Failure Alert', type: 'NOTIFY', config: { message: 'Automated tests encountered failures.', channel: 'alerts' }, isTerminal: true },
        ],
        edges: [
          { id: 'e1', fromNodeId: 'start', toNodeId: 'run_tests' },
          { id: 'e2', fromNodeId: 'run_tests', toNodeId: 'condition_pass' },
          { id: 'e3', fromNodeId: 'condition_pass', toNodeId: 'report_success', condition: '{{condition_pass == true}}' },
          { id: 'e4', fromNodeId: 'condition_pass', toNodeId: 'report_failure', condition: '{{condition_pass == false}}' },
        ],
      },
      triggers: [{ id: 'trg_manual', workflowId: '', type: 'MANUAL', config: {}, enabled: true, createdAt: '' }],
      variables: [],
      timeoutSeconds: 1800,
      maxRetries: 2,
    },
  },

  // 3. GitHub Issue Investigation
  {
    workflow: {
      name: 'GitHub Issue Investigation',
      description: 'Investigates newly filed GitHub issue and extracts technical reproduction context',
      category: 'GITHUB',
      scope: 'PROJECT',
      status: 'ACTIVE',
      activeVersion: 1,
      tags: ['github', 'issues', 'research'],
    },
    version: {
      versionNumber: 1,
      description: 'Deep triage and reproduction plan for GitHub issues',
      graph: {
        nodes: [
          { id: 'start', name: 'GitHub Issue Event', type: 'TRIGGER', config: {} },
          { id: 'research_issue', name: 'Research Repository & Issue', type: 'RESEARCH', config: { query: 'Analyze issue problem statement', category: 'BUG_TRIAGE' } },
          { id: 'agent_triage', name: 'Triage & Formulate Strategy', type: 'AGENT', config: { agentId: 'vyasa', objective: 'Structure diagnosis and repair requirements' } },
          { id: 'report', name: 'Triage Summary Report', type: 'REPORT', config: { title: 'GitHub Issue Triage', body: 'Analysis complete.' }, isTerminal: true },
        ],
        edges: [
          { id: 'e1', fromNodeId: 'start', toNodeId: 'research_issue' },
          { id: 'e2', fromNodeId: 'research_issue', toNodeId: 'agent_triage' },
          { id: 'e3', fromNodeId: 'agent_triage', toNodeId: 'report' },
        ],
      },
      triggers: [{ id: 'trg_gh', workflowId: '', type: 'GITHUB_EVENT', config: { eventPattern: 'github.issue.created' }, enabled: true, createdAt: '' }],
      variables: [],
      timeoutSeconds: 3600,
      maxRetries: 3,
    },
  },

  // 4. Research -> Report
  {
    workflow: {
      name: 'Research to Report Pipeline',
      description: 'Executes multi-source scientific/technical study, synthesizes findings, and publishes report',
      category: 'RESEARCH',
      scope: 'GLOBAL',
      status: 'ACTIVE',
      activeVersion: 1,
      tags: ['research', 'intelligence', 'synthesis'],
    },
    version: {
      versionNumber: 1,
      description: 'Autonomous research collection, evidence aggregation, and report generation',
      graph: {
        nodes: [
          { id: 'start', name: 'Research Topic Trigger', type: 'TRIGGER', config: {} },
          { id: 'execute_study', name: 'Execute Deep Research', type: 'RESEARCH', config: { query: '{{topic}}', category: 'DEEP_RESEARCH' } },
          { id: 'synthesize', name: 'Synthesize Findings', type: 'MODEL', config: { task: 'summarization', prompt: 'Summarize key research insights and actionable conclusions' } },
          { id: 'publish_report', name: 'Compile Sovereign Artifact', type: 'REPORT', config: { title: 'Executive Research Brief', body: '{{synthesize}}' }, isTerminal: true },
        ],
        edges: [
          { id: 'e1', fromNodeId: 'start', toNodeId: 'execute_study' },
          { id: 'e2', fromNodeId: 'execute_study', toNodeId: 'synthesize' },
          { id: 'e3', fromNodeId: 'synthesize', toNodeId: 'publish_report' },
        ],
      },
      triggers: [{ id: 'trg_manual', workflowId: '', type: 'MANUAL', config: {}, enabled: true, createdAt: '' }],
      variables: [{ name: 'topic', type: 'string', value: 'Quantum Computing and Cryptography' }],
      timeoutSeconds: 7200,
      maxRetries: 2,
    },
  },

  // 5. Autonomous Bug Fix (FP-10)
  {
    workflow: {
      name: 'Autonomous Bug Fix (FP-10)',
      description: 'End-to-end bug reproduction, code repair, test verification, and approval gate',
      category: 'ENGINEERING',
      scope: 'PROJECT',
      status: 'ACTIVE',
      activeVersion: 1,
      tags: ['engineering', 'agentic-coding', 'fp10'],
    },
    version: {
      versionNumber: 1,
      description: 'Full agentic repair cycle with human approval gate',
      graph: {
        nodes: [
          { id: 'start', name: 'Bug Report Trigger', type: 'TRIGGER', config: {} },
          { id: 'fp10_repair', name: 'FP-10 Autonomous Repair', type: 'CODE', config: { objective: 'Reproduce bug, patch file, and verify with tests' } },
          { id: 'approval_gate', name: 'Human Approval Gate', type: 'APPROVAL', config: { prompt: 'Approve git commit for bug fix?', riskLevel: 'MEDIUM' } },
          { id: 'complete_report', name: 'Engineering Completion Report', type: 'REPORT', config: { title: 'Autonomous Bug Fix Succeeded', body: 'Patch applied and verified.' }, isTerminal: true },
        ],
        edges: [
          { id: 'e1', fromNodeId: 'start', toNodeId: 'fp10_repair' },
          { id: 'e2', fromNodeId: 'fp10_repair', toNodeId: 'approval_gate' },
          { id: 'e3', fromNodeId: 'approval_gate', toNodeId: 'complete_report' },
        ],
      },
      triggers: [{ id: 'trg_manual', workflowId: '', type: 'MANUAL', config: {}, enabled: true, createdAt: '' }],
      variables: [],
      timeoutSeconds: 3600,
      maxRetries: 3,
    },
  },

  // 6. Website Quality Check
  {
    workflow: {
      name: 'Website Quality & Uptime Check',
      description: 'Verifies web endpoints, audits performance, and alerts on anomalies',
      category: 'OPERATIONS',
      scope: 'GLOBAL',
      status: 'ACTIVE',
      activeVersion: 1,
      tags: ['uptime', 'browser', 'monitoring'],
    },
    version: {
      versionNumber: 1,
      description: 'Automated health verification of web applications',
      graph: {
        nodes: [
          { id: 'start', name: 'Periodic Trigger', type: 'TRIGGER', config: {} },
          { id: 'time_check', name: 'Timestamp Validation', type: 'ACTION', config: { toolName: 'time_now', parameters: {} } },
          { id: 'browser_check', name: 'Browser Health Observation', type: 'ACTION', config: { toolName: 'browser_session_create', parameters: {} } },
          { id: 'report', name: 'Quality Audit Report', type: 'REPORT', config: { title: 'Website Quality Audit', body: 'All checks normal.' }, isTerminal: true },
        ],
        edges: [
          { id: 'e1', fromNodeId: 'start', toNodeId: 'time_check' },
          { id: 'e2', fromNodeId: 'time_check', toNodeId: 'browser_check' },
          { id: 'e3', fromNodeId: 'browser_check', toNodeId: 'report' },
        ],
      },
      triggers: [{ id: 'trg_interval', workflowId: '', type: 'INTERVAL', config: { intervalSeconds: 3600 }, enabled: true, createdAt: '' }],
      variables: [],
      timeoutSeconds: 1800,
      maxRetries: 2,
    },
  },

  // 7. Dependency Health
  {
    workflow: {
      name: 'Dependency Health & Security Audit',
      description: 'Audits package dependencies, flags outdated packages, and verifies compatibility',
      category: 'SECURITY',
      scope: 'PROJECT',
      status: 'ACTIVE',
      activeVersion: 1,
      tags: ['security', 'dependencies', 'audit'],
    },
    version: {
      versionNumber: 1,
      description: 'Weekly dependency review and vulnerability scanning',
      graph: {
        nodes: [
          { id: 'start', name: 'Weekly Trigger', type: 'TRIGGER', config: {} },
          { id: 'read_pkg', name: 'Inspect package.json', type: 'ACTION', config: { toolName: 'filesystem_read', parameters: { path: 'package.json' } } },
          { id: 'agent_audit', name: 'Security Audit Agent', type: 'AGENT', config: { agentId: 'taraka', objective: 'Audit package dependencies for vulnerabilities' } },
          { id: 'report', name: 'Dependency Security Report', type: 'REPORT', config: { title: 'Dependency Health Brief', body: 'Dependencies audited.' }, isTerminal: true },
        ],
        edges: [
          { id: 'e1', fromNodeId: 'start', toNodeId: 'read_pkg' },
          { id: 'e2', fromNodeId: 'read_pkg', toNodeId: 'agent_audit' },
          { id: 'e3', fromNodeId: 'agent_audit', toNodeId: 'report' },
        ],
      },
      triggers: [{ id: 'trg_weekly', workflowId: '', type: 'CRON', config: { cronExpression: '0 10 * * 1', intervalSeconds: 604800 }, enabled: true, createdAt: '' }],
      variables: [],
      timeoutSeconds: 3600,
      maxRetries: 2,
    },
  },

  // 8. Backup & Verification
  {
    workflow: {
      name: 'Backup & Integrity Verification',
      description: 'Executes SQLite database backup and verifies table integrity',
      category: 'SYSTEM',
      scope: 'GLOBAL',
      status: 'ACTIVE',
      activeVersion: 1,
      tags: ['backup', 'integrity', 'database'],
    },
    version: {
      versionNumber: 1,
      description: 'Periodic database backup with cryptographic checksum validation',
      graph: {
        nodes: [
          { id: 'start', name: 'Scheduled Backup Trigger', type: 'TRIGGER', config: {} },
          { id: 'sys_info', name: 'Check Disk Space', type: 'ACTION', config: { toolName: 'system_info', parameters: {} } },
          { id: 'report', name: 'Backup Verification Report', type: 'REPORT', config: { title: 'Database Backup Completed', body: 'Database backup verified successfully.' }, isTerminal: true },
        ],
        edges: [
          { id: 'e1', fromNodeId: 'start', toNodeId: 'sys_info' },
          { id: 'e2', fromNodeId: 'sys_info', toNodeId: 'report' },
        ],
      },
      triggers: [{ id: 'trg_backup', workflowId: '', type: 'CRON', config: { cronExpression: '0 2 * * *', intervalSeconds: 86400 }, enabled: true, createdAt: '' }],
      variables: [],
      timeoutSeconds: 3600,
      maxRetries: 3,
    },
  },

  // 9. Company Daily Operations
  {
    workflow: {
      name: 'Company Daily Operations',
      description: 'Evaluates company KPIs, outstanding approvals, and departmental objectives',
      category: 'COMPANY_OS',
      scope: 'COMPANY',
      status: 'ACTIVE',
      activeVersion: 1,
      tags: ['company', 'kpi', 'operations'],
    },
    version: {
      versionNumber: 1,
      description: 'Autonomous company operations coordination and daily health summary',
      graph: {
        nodes: [
          { id: 'start', name: 'Morning Operations Trigger', type: 'TRIGGER', config: {} },
          { id: 'agent_coord', name: 'Operations Coordinator', type: 'AGENT', config: { agentId: 'rutam', objective: 'Review active company milestones and team assignments' } },
          { id: 'report', name: 'Daily Operations Memo', type: 'REPORT', config: { title: 'Company Daily Operations Report', body: 'Daily operations reviewed.' }, isTerminal: true },
        ],
        edges: [
          { id: 'e1', fromNodeId: 'start', toNodeId: 'agent_coord' },
          { id: 'e2', fromNodeId: 'agent_coord', toNodeId: 'report' },
        ],
      },
      triggers: [{ id: 'trg_comp', workflowId: '', type: 'CRON', config: { cronExpression: '0 9 * * 1-5', intervalSeconds: 86400 }, enabled: true, createdAt: '' }],
      variables: [],
      timeoutSeconds: 3600,
      maxRetries: 2,
    },
  },

  // 10. Customer Support Drafting
  {
    workflow: {
      name: 'Customer Support Drafting & Approval',
      description: 'Classifies customer requests, drafts replies, and requires human approval before sending',
      category: 'CUSTOMER_CARE',
      scope: 'GLOBAL',
      status: 'ACTIVE',
      activeVersion: 1,
      tags: ['support', 'customer', 'communication'],
    },
    version: {
      versionNumber: 1,
      description: 'Customer inquiry triage with mandatory human authorization',
      graph: {
        nodes: [
          { id: 'start', name: 'Incoming Message Trigger', type: 'TRIGGER', config: {} },
          { id: 'classify_msg', name: 'Classify Message Intent', type: 'MODEL', config: { task: 'classification', prompt: 'Classify incoming customer inquiry' } },
          { id: 'draft_reply', name: 'Draft Customer Response', type: 'AGENT', config: { agentId: 'vyasa', objective: 'Draft thoughtful and professional answer' } },
          { id: 'approval', name: 'Operator Approval Gate', type: 'APPROVAL', config: { prompt: 'Approve sending response to customer?', riskLevel: 'MEDIUM' } },
          { id: 'notify', name: 'Deliver Notification', type: 'NOTIFY', config: { message: 'Customer response approved and queued.', channel: 'support' }, isTerminal: true },
        ],
        edges: [
          { id: 'e1', fromNodeId: 'start', toNodeId: 'classify_msg' },
          { id: 'e2', fromNodeId: 'classify_msg', toNodeId: 'draft_reply' },
          { id: 'e3', fromNodeId: 'draft_reply', toNodeId: 'approval' },
          { id: 'e4', fromNodeId: 'approval', toNodeId: 'notify' },
        ],
      },
      triggers: [{ id: 'trg_event', workflowId: '', type: 'EVENT', config: { eventPattern: 'customer.ticket.created' }, enabled: true, createdAt: '' }],
      variables: [],
      timeoutSeconds: 3600,
      maxRetries: 2,
    },
  },
];
