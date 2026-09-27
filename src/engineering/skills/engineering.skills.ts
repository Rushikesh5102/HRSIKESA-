/**
 * HṚṢĪKEŚA (हृषीकेश) — Autonomous Engineering Skills
 *
 * FP-10: 9 Reusable Autonomous Engineering Skills
 *
 * 1. fix-build
 * 2. fix-test
 * 3. add-test
 * 4. refactor-code
 * 5. review-code
 * 6. security-review
 * 7. performance-analysis
 * 8. dependency-upgrade
 * 9. implement-feature
 */

import { SkillDefinition } from '../../skills/interfaces/skill.types.js';

export const ENGINEERING_SKILLS: SkillDefinition[] = [
  // 1. fix-build
  {
    id: 'skill-fix-build',
    name: 'fix-build',
    displayName: 'Fix Project Build',
    description: 'Diagnoses compile errors, syntax anomalies, and type check breaks, then synthesizes minimal verified patches.',
    category: 'SOFTWARE',
    owner: 'SYSTEM',
    scope: 'GLOBAL',
    status: 'ACTIVE',
    version: '1.0.0',
    riskLevel: 'TIER_2',
    triggerPhrases: ['fix build', 'fix the build', 'build failing', 'repair compile error', 'fix compilation'],
    requiredCapabilities: ['workspace.edit', 'terminal.execute', 'testing.run'],
    requiredTools: ['editor_replace', 'terminal_execute'],
    inputsSchema: {
      type: 'object',
      properties: {
        workspaceId: { type: 'string' },
        buildCommand: { type: 'string', default: 'npm run build' },
      },
      required: ['workspaceId'],
    },
    outputsSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        repairedFiles: { type: 'array' },
        attempts: { type: 'number' },
      },
    },
    steps: [
      {
        stepIndex: 0,
        stepId: 'run_build_diagnostic',
        name: 'Execute Build To Reproduce Failure',
        stepType: 'TOOL',
        tool: 'terminal_execute',
        dependencies: [],
        inputs: { command: '{{inputs.buildCommand}}' },
        timeoutMs: 120000,
      },
      {
        stepIndex: 1,
        stepId: 'synthesize_build_patch',
        name: 'Synthesize Minimal Build Repair Patch',
        stepType: 'MODEL',
        dependencies: ['run_build_diagnostic'],
        timeoutMs: 90000,
      },
      {
        stepIndex: 2,
        stepId: 'verify_build_repair',
        name: 'Verify Clean Rebuild',
        stepType: 'VERIFY',
        dependencies: ['synthesize_build_patch'],
        verification: {
          type: 'command_exit_code',
          target: 'npm run build',
          expectedValue: 0,
        },
        timeoutMs: 120000,
      },
    ],
    permissions: {
      maxDangerTier: 2,
      requiredCapabilities: ['workspace.edit', 'terminal.execute'],
      requiredTools: ['editor_replace', 'terminal_execute'],
      requiresHumanApproval: false,
      allowedScopes: ['GLOBAL', 'PROJECT'],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 2. fix-test
  {
    id: 'skill-fix-test',
    name: 'fix-test',
    displayName: 'Fix Broken Tests',
    description: 'Runs targeted tests, extracts failure diagnostics, hypothesizes root causes, and applies verified fixes.',
    category: 'SOFTWARE',
    owner: 'SYSTEM',
    scope: 'GLOBAL',
    status: 'ACTIVE',
    version: '1.0.0',
    riskLevel: 'TIER_2',
    triggerPhrases: ['fix test', 'fix failing test', 'fix the tests', 'repair broken test', 'test failed'],
    requiredCapabilities: ['workspace.edit', 'terminal.execute', 'testing.run'],
    requiredTools: ['editor_replace', 'terminal_execute'],
    inputsSchema: {
      type: 'object',
      properties: {
        workspaceId: { type: 'string' },
        testFile: { type: 'string' },
      },
      required: ['workspaceId'],
    },
    outputsSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        passedTests: { type: 'number' },
        repairedFiles: { type: 'array' },
      },
    },
    steps: [
      {
        stepIndex: 0,
        stepId: 'run_test_suite',
        name: 'Run Target Test Suite',
        stepType: 'TOOL',
        tool: 'terminal_execute',
        dependencies: [],
        inputs: { command: 'npm test' },
        timeoutMs: 120000,
      },
      {
        stepIndex: 1,
        stepId: 'diagnose_and_patch',
        name: 'Diagnose and Synthesize Test Fix',
        stepType: 'MODEL',
        dependencies: ['run_test_suite'],
        timeoutMs: 90000,
      },
      {
        stepIndex: 2,
        stepId: 'verify_test_suite',
        name: 'Verify All Tests Pass',
        stepType: 'VERIFY',
        dependencies: ['diagnose_and_patch'],
        verification: {
          type: 'command_exit_code',
          target: 'npm test',
          expectedValue: 0,
        },
        timeoutMs: 120000,
      },
    ],
    permissions: {
      maxDangerTier: 2,
      requiredCapabilities: ['workspace.edit', 'terminal.execute', 'testing.run'],
      requiredTools: ['editor_replace', 'terminal_execute'],
      requiresHumanApproval: false,
      allowedScopes: ['GLOBAL', 'PROJECT'],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 3. add-test
  {
    id: 'skill-add-test',
    name: 'add-test',
    displayName: 'Generate & Add Automated Tests',
    description: 'Inspects source file signatures, discovers testing frameworks, synthesizes comprehensive test cases, and executes them.',
    category: 'SOFTWARE',
    owner: 'SYSTEM',
    scope: 'GLOBAL',
    status: 'ACTIVE',
    version: '1.0.0',
    riskLevel: 'TIER_1',
    triggerPhrases: ['add test', 'add tests', 'create unit test', 'test coverage', 'write tests for'],
    requiredCapabilities: ['workspace.edit', 'terminal.execute', 'testing.run'],
    requiredTools: ['editor_create', 'terminal_execute'],
    inputsSchema: {
      type: 'object',
      properties: {
        workspaceId: { type: 'string' },
        sourceFile: { type: 'string' },
      },
      required: ['workspaceId', 'sourceFile'],
    },
    outputsSchema: {
      type: 'object',
      properties: {
        testFilePath: { type: 'string' },
        testsGenerated: { type: 'number' },
        passed: { type: 'boolean' },
      },
    },
    steps: [
      {
        stepIndex: 0,
        stepId: 'inspect_source_file',
        name: 'Inspect Source File Signatures',
        stepType: 'TOOL',
        tool: 'file_read',
        dependencies: [],
        timeoutMs: 30000,
      },
      {
        stepIndex: 1,
        stepId: 'generate_test_suite',
        name: 'Synthesize Conforming Test Suite',
        stepType: 'MODEL',
        dependencies: ['inspect_source_file'],
        timeoutMs: 90000,
      },
      {
        stepIndex: 2,
        stepId: 'execute_new_test',
        name: 'Execute Generated Test File',
        stepType: 'TOOL',
        tool: 'terminal_execute',
        dependencies: ['generate_test_suite'],
        timeoutMs: 120000,
      },
    ],
    permissions: {
      maxDangerTier: 1,
      requiredCapabilities: ['workspace.edit', 'terminal.execute'],
      requiredTools: ['editor_create', 'terminal_execute'],
      requiresHumanApproval: false,
      allowedScopes: ['GLOBAL', 'PROJECT'],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 4. refactor-code
  {
    id: 'skill-refactor-code',
    name: 'refactor-code',
    displayName: 'Refactor Code Behavior-Preserving',
    description: 'Performs structural refactoring, extracts functions/classes, improves maintainability while preserving verified test invariants.',
    category: 'SOFTWARE',
    owner: 'SYSTEM',
    scope: 'GLOBAL',
    status: 'ACTIVE',
    version: '1.0.0',
    riskLevel: 'TIER_2',
    triggerPhrases: ['refactor code', 'clean up component', 'restructure file', 'refactor function'],
    requiredCapabilities: ['workspace.edit', 'testing.run'],
    requiredTools: ['editor_replace', 'terminal_execute'],
    inputsSchema: {
      type: 'object',
      properties: {
        workspaceId: { type: 'string' },
        filePath: { type: 'string' },
        refactorGoal: { type: 'string' },
      },
      required: ['workspaceId', 'filePath'],
    },
    outputsSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        diff: { type: 'string' },
      },
    },
    steps: [
      {
        stepIndex: 0,
        stepId: 'read_and_test_baseline',
        name: 'Verify Baseline Passing Tests',
        stepType: 'TOOL',
        tool: 'terminal_execute',
        dependencies: [],
        inputs: { command: 'npm test' },
        timeoutMs: 120000,
      },
      {
        stepIndex: 1,
        stepId: 'apply_refactor',
        name: 'Apply Surgical Refactoring',
        stepType: 'MODEL',
        dependencies: ['read_and_test_baseline'],
        timeoutMs: 90000,
      },
      {
        stepIndex: 2,
        stepId: 'verify_behavior_preserved',
        name: 'Verify Invariants & Tests Still Pass',
        stepType: 'VERIFY',
        dependencies: ['apply_refactor'],
        verification: {
          type: 'command_exit_code',
          target: 'npm test',
          expectedValue: 0,
        },
        timeoutMs: 120000,
      },
    ],
    permissions: {
      maxDangerTier: 2,
      requiredCapabilities: ['workspace.edit', 'testing.run'],
      requiredTools: ['editor_replace', 'terminal_execute'],
      requiresHumanApproval: false,
      allowedScopes: ['GLOBAL', 'PROJECT'],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 5. review-code
  {
    id: 'skill-review-code',
    name: 'review-code',
    displayName: 'Automated Code Review',
    description: 'Inspects diffs and source files for bugs, security risks, performance regressions, type hazards, and architectural anti-patterns.',
    category: 'SOFTWARE',
    owner: 'SYSTEM',
    scope: 'GLOBAL',
    status: 'ACTIVE',
    version: '1.0.0',
    riskLevel: 'TIER_0',
    triggerPhrases: ['review code', 'code review', 'review this pull request', 'audit changes'],
    requiredCapabilities: ['workspace.read', 'code-analysis'],
    requiredTools: ['file_read'],
    inputsSchema: {
      type: 'object',
      properties: {
        workspaceId: { type: 'string' },
        targetPath: { type: 'string' },
      },
      required: ['workspaceId'],
    },
    outputsSchema: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        findings: { type: 'array' },
        riskRating: { type: 'string' },
      },
    },
    steps: [
      {
        stepIndex: 0,
        stepId: 'inspect_git_diff',
        name: 'Read Git Diff or Target File',
        stepType: 'TOOL',
        tool: 'git_diff',
        dependencies: [],
        timeoutMs: 30000,
      },
      {
        stepIndex: 1,
        stepId: 'synthesize_review',
        name: 'Synthesize Multi-Perspective Review',
        stepType: 'MODEL',
        dependencies: ['inspect_git_diff'],
        timeoutMs: 60000,
      },
    ],
    permissions: {
      maxDangerTier: 0,
      requiredCapabilities: ['workspace.read'],
      requiredTools: ['file_read'],
      requiresHumanApproval: false,
      allowedScopes: ['GLOBAL', 'PROJECT'],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 6. security-review
  {
    id: 'skill-security-review',
    name: 'security-review',
    displayName: 'Security Engineering Review',
    description: 'Analyzes code for OWASP Top 10 vulnerabilities, injection flaws, unsafe deserialization, credential leakage, and boundary enforcement.',
    category: 'SECURITY',
    owner: 'SYSTEM',
    scope: 'GLOBAL',
    status: 'ACTIVE',
    version: '1.0.0',
    riskLevel: 'TIER_0',
    triggerPhrases: ['security review', 'security audit', 'secure this endpoint', 'check vulnerability'],
    requiredCapabilities: ['workspace.read', 'code-analysis'],
    requiredTools: ['file_read'],
    inputsSchema: {
      type: 'object',
      properties: {
        workspaceId: { type: 'string' },
        targetFile: { type: 'string' },
      },
      required: ['workspaceId'],
    },
    outputsSchema: {
      type: 'object',
      properties: {
        vulnerabilities: { type: 'array' },
        recommendations: { type: 'array' },
        safe: { type: 'boolean' },
      },
    },
    steps: [
      {
        stepIndex: 0,
        stepId: 'scan_source_files',
        name: 'Scan Source for Secret Leakage and Injection Sinks',
        stepType: 'TOOL',
        tool: 'file_read',
        dependencies: [],
        timeoutMs: 30000,
      },
      {
        stepIndex: 1,
        stepId: 'model_security_audit',
        name: 'Perform Deep Threat Model Audit',
        stepType: 'MODEL',
        dependencies: ['scan_source_files'],
        timeoutMs: 60000,
      },
    ],
    permissions: {
      maxDangerTier: 0,
      requiredCapabilities: ['workspace.read'],
      requiredTools: ['file_read'],
      requiresHumanApproval: false,
      allowedScopes: ['GLOBAL', 'PROJECT'],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 7. performance-analysis
  {
    id: 'skill-performance-analysis',
    name: 'performance-analysis',
    displayName: 'Performance Engineering & Benchmark',
    description: 'Profiles bottlenecks, algorithmic complexity, query volume, bundle sizes, and memory retention.',
    category: 'SOFTWARE',
    owner: 'SYSTEM',
    scope: 'GLOBAL',
    status: 'ACTIVE',
    version: '1.0.0',
    riskLevel: 'TIER_1',
    triggerPhrases: ['performance analysis', 'make it faster', 'optimize performance', 'profile speed'],
    requiredCapabilities: ['workspace.read', 'terminal.execute'],
    requiredTools: ['file_read', 'terminal_execute'],
    inputsSchema: {
      type: 'object',
      properties: {
        workspaceId: { type: 'string' },
        targetComponent: { type: 'string' },
      },
      required: ['workspaceId'],
    },
    outputsSchema: {
      type: 'object',
      properties: {
        bottlenecks: { type: 'array' },
        estimatedGain: { type: 'string' },
        proposals: { type: 'array' },
      },
    },
    steps: [
      {
        stepIndex: 0,
        stepId: 'measure_baseline',
        name: 'Benchmark Baseline Performance',
        stepType: 'TOOL',
        tool: 'terminal_execute',
        dependencies: [],
        timeoutMs: 60000,
      },
      {
        stepIndex: 1,
        stepId: 'synthesize_optimizations',
        name: 'Synthesize Optimization Hypotheses',
        stepType: 'MODEL',
        dependencies: ['measure_baseline'],
        timeoutMs: 60000,
      },
    ],
    permissions: {
      maxDangerTier: 1,
      requiredCapabilities: ['workspace.read', 'terminal.execute'],
      requiredTools: ['file_read', 'terminal_execute'],
      requiresHumanApproval: false,
      allowedScopes: ['GLOBAL', 'PROJECT'],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 8. dependency-upgrade
  {
    id: 'skill-dependency-upgrade',
    name: 'dependency-upgrade',
    displayName: 'Safe Dependency Upgrade',
    description: 'Inspects release notes, evaluates breaking changes, upgrades package manifests, and verifies test suites.',
    category: 'DEVOPS',
    owner: 'SYSTEM',
    scope: 'GLOBAL',
    status: 'ACTIVE',
    version: '1.0.0',
    riskLevel: 'TIER_2',
    triggerPhrases: ['upgrade dependency', 'update packages', 'bump version', 'upgrade framework'],
    requiredCapabilities: ['workspace.edit', 'terminal.execute', 'testing.run'],
    requiredTools: ['editor_replace', 'terminal_execute'],
    inputsSchema: {
      type: 'object',
      properties: {
        workspaceId: { type: 'string' },
        packageName: { type: 'string' },
        targetVersion: { type: 'string' },
      },
      required: ['workspaceId', 'packageName'],
    },
    outputsSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        upgradedVersion: { type: 'string' },
      },
    },
    steps: [
      {
        stepIndex: 0,
        stepId: 'check_breaking_changes',
        name: 'Check Breaking Changes & Compatibility',
        stepType: 'MODEL',
        dependencies: [],
        timeoutMs: 60000,
      },
      {
        stepIndex: 1,
        stepId: 'apply_package_update',
        name: 'Update Package Manifest',
        stepType: 'TOOL',
        tool: 'editor_replace',
        dependencies: ['check_breaking_changes'],
        timeoutMs: 30000,
      },
      {
        stepIndex: 2,
        stepId: 'verify_post_upgrade_tests',
        name: 'Verify Clean Tests After Upgrade',
        stepType: 'VERIFY',
        dependencies: ['apply_package_update'],
        verification: {
          type: 'command_exit_code',
          target: 'npm test',
          expectedValue: 0,
        },
        timeoutMs: 120000,
      },
    ],
    permissions: {
      maxDangerTier: 2,
      requiredCapabilities: ['workspace.edit', 'terminal.execute'],
      requiredTools: ['editor_replace', 'terminal_execute'],
      requiresHumanApproval: false,
      allowedScopes: ['GLOBAL', 'PROJECT'],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 9. implement-feature
  {
    id: 'skill-implement-feature',
    name: 'implement-feature',
    displayName: 'Implement Software Feature End-to-End',
    description: 'Understands feature requirements, generates structured changes, updates code, writes tests, and runs complete verification loop.',
    category: 'SOFTWARE',
    owner: 'SYSTEM',
    scope: 'GLOBAL',
    status: 'ACTIVE',
    version: '1.0.0',
    riskLevel: 'TIER_2',
    triggerPhrases: ['implement feature', 'add feature', 'build feature', 'implement functionality'],
    requiredCapabilities: ['workspace.edit', 'terminal.execute', 'testing.run'],
    requiredTools: ['editor_replace', 'editor_create', 'terminal_execute'],
    inputsSchema: {
      type: 'object',
      properties: {
        workspaceId: { type: 'string' },
        featureDescription: { type: 'string' },
      },
      required: ['workspaceId', 'featureDescription'],
    },
    outputsSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        createdFiles: { type: 'array' },
        modifiedFiles: { type: 'array' },
        verified: { type: 'boolean' },
      },
    },
    steps: [
      {
        stepIndex: 0,
        stepId: 'plan_feature',
        name: 'Plan Architecture and Target Modifications',
        stepType: 'MODEL',
        dependencies: [],
        timeoutMs: 90000,
      },
      {
        stepIndex: 1,
        stepId: 'execute_modifications',
        name: 'Execute Surgical Code Modifications',
        stepType: 'TOOL',
        tool: 'editor_replace',
        dependencies: ['plan_feature'],
        timeoutMs: 60000,
      },
      {
        stepIndex: 2,
        stepId: 'verify_feature_tests',
        name: 'Execute Verification Test Suite',
        stepType: 'VERIFY',
        dependencies: ['execute_modifications'],
        verification: {
          type: 'command_exit_code',
          target: 'npm test',
          expectedValue: 0,
        },
        timeoutMs: 120000,
      },
    ],
    permissions: {
      maxDangerTier: 2,
      requiredCapabilities: ['workspace.edit', 'terminal.execute', 'testing.run'],
      requiredTools: ['editor_replace', 'editor_create', 'terminal_execute'],
      requiresHumanApproval: false,
      allowedScopes: ['GLOBAL', 'PROJECT'],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
