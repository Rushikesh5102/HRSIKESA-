/**
 * HṚṢĪKEŚA (हृषीकेश) — Engineering Context & Requirement Extraction Engine
 *
 * FP-10: Parses natural-language engineering requests, extracts structured goals/constraints,
 * inspects project conventions, and builds bounded context tiers without dumping repositories.
 */

import { WorkspaceManager } from '../../ide/workspace/workspace.manager.js';
import { CodeSearchEngine } from '../../ide/search/code.search.js';
import { WorkspaceMetadata } from '../../ide/types/ide.types.js';
import {
  EngineeringPriority,
  EngineeringComplexity,
  EngineeringPlan,
} from '../types/engineering.types.js';

export interface ExtractedRequirements {
  objective: string;
  goal: string;
  constraints: string[];
  targetFiles: string[];
  expectedBehavior: string;
  acceptanceCriteria: string[];
  nonGoals: string[];
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  priority: EngineeringPriority;
  complexity: EngineeringComplexity;
  requiredVerification: string[];
}

export interface BoundedEngineeringContext {
  workspaceSummary: string;
  targetFilesSummary: string[];
  relevantSnippets: Array<{ file: string; line: number; content: string }>;
  conventions: string[];
  testCommand: string;
  buildCommand?: string;
  tier: 'T0' | 'T1' | 'T2' | 'T3' | 'T4';
}

export class EngineeringContextEngine {
  private readonly workspaceManager: WorkspaceManager;
  private readonly searchEngine: CodeSearchEngine;

  constructor(workspaceManager: WorkspaceManager, searchEngine: CodeSearchEngine) {
    this.workspaceManager = workspaceManager;
    this.searchEngine = searchEngine;
  }

  /**
   * Extracts structured requirements and constraints from natural language prompt.
   */
  public extractRequirements(prompt: string, _workspace: WorkspaceMetadata): ExtractedRequirements {
    const p = prompt.trim();
    const lower = p.toLowerCase();

    // Determine complexity & risk
    let risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    let complexity: EngineeringComplexity = 'STANDARD';
    let priority: EngineeringPriority = 'NORMAL';

    if (/\b(?:security|auth|token|password|credential|vulnerability|payment)\b/i.test(lower)) {
      risk = 'HIGH';
      complexity = 'COMPLEX';
      priority = 'HIGH';
    } else if (/\b(?:refactor|architecture|re-architect|rewrite)\b/i.test(lower)) {
      risk = 'MEDIUM';
      complexity = 'COMPLEX';
    } else if (/\b(?:typo|lint|comment|quick fix|fast edit)\b/i.test(lower)) {
      risk = 'LOW';
      complexity = 'SIMPLE';
    }

    // Extract target files mentioned in the prompt
    const targetFiles: string[] = [];
    const fileMatches = p.match(/(?:[a-zA-Z0-9_\-./\\]+\.[a-zA-Z0-9]+)/g) || [];
    for (const match of fileMatches) {
      if (!match.includes('http') && !targetFiles.includes(match)) {
        targetFiles.push(match.replace(/\\/g, '/'));
      }
    }

    // Constraints & non-goals
    const constraints: string[] = [
      'Preserve existing public API and method signatures',
      'Follow existing repository code conventions and linting',
      'Do not modify files outside workspace boundaries',
    ];

    if (lower.includes('faster') || lower.includes('performance')) {
      constraints.push('Ensure time complexity does not regress');
    }
    if (lower.includes("don't change") || lower.includes('do not change')) {
      const match = p.match(/(?:don't change|do not change)\s+([^.]+)/i);
      if (match) constraints.push(`Do not modify: ${match[1].trim()}`);
    }

    const nonGoals: string[] = [
      'Do not redesign unrelated UI components',
      'Do not perform unrequested dependency upgrades',
    ];

    const acceptanceCriteria: string[] = [
      'All relevant test suites must pass clean (exit code 0)',
      'TypeScript compilation check must produce zero diagnostics',
      'Changes must be verified via autonomous verification loop',
    ];

    return {
      objective: p,
      goal: p,
      constraints,
      targetFiles,
      expectedBehavior: `Satisfy requirement: "${p}" with zero regressions`,
      acceptanceCriteria,
      nonGoals,
      risk,
      priority,
      complexity,
      requiredVerification: ['build', 'test'],
    };
  }

  /**
   * Assembles bounded context for the model without loading the entire repository.
   */
  public async assembleContext(
    req: ExtractedRequirements,
    workspace: WorkspaceMetadata,
    tier: 'T0' | 'T1' | 'T2' | 'T3' | 'T4' = 'T2'
  ): Promise<BoundedEngineeringContext> {
    const arch = this.workspaceManager.detectArchitecture(workspace.rootPath);
    const workspaceSummary = [
      `Project: ${workspace.name}`,
      `Framework: ${arch.framework} (${arch.language})`,
      `Package Manager: ${arch.packageManager}`,
      `Build Command: ${arch.buildCommand || 'none'}`,
      `Test Command: ${arch.testCommand || 'npm test'}`,
    ].join(' | ');

    const relevantSnippets: Array<{ file: string; line: number; content: string }> = [];

    // Search keywords from objective in workspace
    const searchTerms = req.objective
      .replace(/[^a-zA-Z0-9_\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !['fix', 'this', 'that', 'make', 'update', 'test'].includes(w.toLowerCase()))
      .slice(0, 3);

    for (const term of searchTerms) {
      const matches = this.searchEngine.searchWorkspace(workspace, { query: term, maxResults: 3 });
      for (const m of matches) {
        relevantSnippets.push({
          file: m.file,
          line: m.line || 1,
          content: m.lineContent.trim(),
        });
      }
    }

    return {
      workspaceSummary,
      targetFilesSummary: req.targetFiles,
      relevantSnippets: relevantSnippets.slice(0, tier === 'T1' ? 3 : 10),
      conventions: [
        'Use TypeScript ES modules (.js in import paths)',
        'Maintain exact function contracts and return values',
        'Prefer minimal surgical replacements over full file rewrites',
      ],
      testCommand: arch.testCommand || 'npm test',
      buildCommand: arch.buildCommand,
      tier,
    };
  }

  /**
   * Generates a structured EngineeringPlan from requirements and context.
   */
  public createPlan(taskId: string, req: ExtractedRequirements, context: BoundedEngineeringContext): EngineeringPlan {
    const id = `plan_${Date.now()}`;
    return {
      id,
      taskId,
      architectureSummary: context.workspaceSummary,
      targetFiles: req.targetFiles,
      steps: [
        {
          sequence: 1,
          title: 'Understand and inspect target source files',
          description: 'Read and review current implementation of affected code modules',
          targetFiles: req.targetFiles,
          actionType: 'READ_FILE',
          dangerTier: 0,
          requiresApproval: false,
        },
        {
          sequence: 2,
          title: 'Execute precision modifications',
          description: req.expectedBehavior,
          targetFiles: req.targetFiles,
          actionType: 'EDIT_FILE',
          dangerTier: 1,
          requiresApproval: req.risk === 'CRITICAL',
        },
        {
          sequence: 3,
          title: 'Run test verification',
          description: `Execute ${context.testCommand} to verify behavioral correctness`,
          actionType: 'RUN_TEST',
          dangerTier: 1,
          requiresApproval: false,
        },
      ],
      verificationPlan: req.acceptanceCriteria,
      riskLevel: req.risk,
      requiresApproval: req.risk === 'CRITICAL',
      createdAt: new Date().toISOString(),
    };
  }
}
