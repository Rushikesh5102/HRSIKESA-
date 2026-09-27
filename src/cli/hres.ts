#!/usr/bin/env node
/**
 * HṚṢĪKEŚA (हृषीकेश) — Unified CLI (hres)
 *
 * FP-07: Capability Fabric CLI Commands
 * Usage:
 *   hres capabilities list
 *   hres capabilities search <query>
 *   hres capabilities inspect <id>
 *   hres capabilities health <id>
 *   hres capabilities verify <id>
 *   hres capabilities revoke <id>
 *   hres capabilities invoke <id> [jsonInputs]
 */

import { DatabaseManager } from '../persistence/database/database.manager.js';
import { MigrationManager } from '../persistence/migrations/migration.manager.js';
import { UniversalCapabilityFabric } from '../capabilities/fabric/universal.capability.fabric.js';
import { GitHubFabric } from '../github/github.fabric.js';
import { IdeFabric } from '../ide/ide.fabric.js';
import { EngineeringFabric } from '../engineering/engineering.fabric.js';
import { WorkflowFabric } from '../workflows/workflow.fabric.js';
import { AccountFabric } from '../accounts/account.fabric.js';
import { ApplicationOperator } from '../operator/application.operator.js';
import { WorkspaceRepository } from '../operator/repository/workspace.repository.js';
import { UniversalAgenticMissionRuntime } from '../mission/mission.runtime.js';
import { UniversalEcosystemFabric } from '../ecosystem/ecosystem.fabric.js';
import { DemonstrationRepository } from '../demonstration/repositories/demonstration.repository.js';
import { DemonstrationSessionService } from '../demonstration/services/demonstration-session.service.js';
import { ProcedureInferenceService } from '../demonstration/services/procedure-inference.service.js';
import { DemonstrationValidatorService } from '../demonstration/services/demonstration-validator.service.js';
import { DemonstrationCompilerService } from '../demonstration/services/demonstration-compiler.service.js';
import { DemonstrationFabric } from '../demonstration/demonstration.fabric.js';
import { CreationRepository } from '../creation/repositories/creation.repository.js';
import { MediaCapabilityService } from '../creation/services/media-capability.service.js';
import { CreationVerifierService } from '../creation/services/creation-verifier.service.js';
import { CreationFabric } from '../creation/creation.fabric.js';
import { CreationJobType } from '../creation/interfaces/creation.types.js';
import { DecisionFabric } from '../decision/decision.fabric.js';
import { ExecutionFabric } from '../execution/execution.fabric.js';

export async function runHresCli(args: string[] = process.argv.slice(2), customDbManager?: any): Promise<string> {
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (...msgs: any[]) => {
    logs.push(msgs.map(m => String(m)).join(' '));
    originalLog(...msgs);
  };

  try {
    const [subsystem, command, ...params] = args;

    if (!subsystem || subsystem === '--help' || subsystem === '-h') {
      printHelp();
      return logs.join('\n');
    }

  if (subsystem === 'create' || subsystem === 'creation') {
    await handleCreation(command, params, customDbManager);
    return logs.join('\n');
  }

  if (subsystem === 'capabilities') {
    await handleCapabilities(command, params, customDbManager);
    return logs.join('\n');
  }

  if (subsystem === 'github') {
    await handleGitHub(command, params, customDbManager);
    return logs.join('\n');
  }

  if (subsystem === 'ide') {
    await handleIde(command, params, customDbManager);
    return logs.join('\n');
  }

  if (subsystem === 'engineering') {
    await handleEngineering(command, params, customDbManager);
    return logs.join('\n');
  }

  if (subsystem === 'workflow' || subsystem === 'workflows') {
    await handleWorkflow(command, params, customDbManager);
    return logs.join('\n');
  }

  if (subsystem === 'account' || subsystem === 'accounts') {
    await handleAccount(command, params, customDbManager);
    return logs.join('\n');
  }

  if (subsystem === 'provider' || subsystem === 'providers') {
    await handleProvider(command, params, customDbManager);
    return logs.join('\n');
  }

  if (subsystem === 'workspace' || subsystem === 'workspaces') {
    await handleWorkspace(command, params, customDbManager);
    return logs.join('\n');
  }

  if (subsystem === 'app' || subsystem === 'apps') {
    await handleApp(command, params, customDbManager);
    return logs.join('\n');
  }

  if (subsystem === 'operator') {
    await handleOperator(command, params, customDbManager);
    return logs.join('\n');
  }

  if (subsystem === 'mission' || subsystem === 'missions') {
    await handleMission(command, params, customDbManager);
    return logs.join('\n');
  }

  if (subsystem === 'ecosystem') {
    await handleEcosystem(command, params, customDbManager);
    return logs.join('\n');
  }

  if (subsystem === 'learn' || subsystem === 'demonstration' || subsystem === 'demonstrations') {
    await handleLearn(command, params, customDbManager);
    return logs.join('\n');
  }

  if (subsystem === 'research') {
    await handleResearch(command, params, customDbManager);
    return logs.join('\n');
  }

  if (subsystem === 'decision' || subsystem === 'decisions') {
    await handleDecision(command, params, customDbManager);
    return logs.join('\n');
  }

    if (subsystem === 'workers' || subsystem === 'worker') {
      await handleWorkers(command, params, customDbManager);
      return logs.join('\n');
    }

    if (subsystem === 'runtime' || subsystem === 'runtimes') {
      await handleRuntimes(command, params, customDbManager);
      return logs.join('\n');
    }

    if (subsystem === 'execution') {
      await handleExecution(command, params, customDbManager);
      return logs.join('\n');
    }

    console.log(`Unknown subsystem '${subsystem}'. Available: capabilities, github, ide, engineering, workflow, account, provider, workspace, app, operator, mission, ecosystem, learn, create, creation, research, decision, workers, runtime, execution`);
    printHelp();
    return logs.join('\n');
  } finally {
    console.log = originalLog;
  }
}

async function handleLearn(command?: string, params: string[] = [], customDbManager?: DatabaseManager): Promise<void> {
  const dbManager = customDbManager || new DatabaseManager(process.env.HRSIKESA_DB_PATH || 'data/hrisekesa.db');
  new MigrationManager(dbManager).runPending();

  const repo = new DemonstrationRepository(dbManager.getRawDb());
  const sessionService = new DemonstrationSessionService(repo);
  const inferenceService = new ProcedureInferenceService(repo);
  const validatorService = new DemonstrationValidatorService();
  const compilerService = new DemonstrationCompilerService(repo);
  const fabric = new DemonstrationFabric({
    repository: repo,
    sessionService,
    inferenceService,
    validatorService,
    compilerService,
  });

  switch (command) {
    case 'start': {
      const title = params[0] || 'CLI Demonstration';
      const objective = params.slice(1).join(' ') || 'Learn from this demonstration';
      const session = fabric.startSession({ owner: 'cli', title, objective });
      console.log(`\n=== DEMONSTRATION STARTED ===`);
      console.log(`ID:        ${session.id}`);
      console.log(`Title:     ${session.title}`);
      console.log(`Objective: ${session.objective}`);
      console.log(`Status:    ${session.status}`);
      console.log(`\nUse 'hres learn stop ${session.id}' to stop recording.`);
      break;
    }

    case 'stop': {
      const id = params[0];
      if (!id) { console.error('Error: Provide demonstration ID.'); process.exitCode = 1; return; }
      const session = fabric.stopSession(id);
      if (!session) { console.error(`Error: Session '${id}' not found.`); process.exitCode = 1; return; }
      console.log(`\n=== DEMONSTRATION STOPPED ===`);
      console.log(`Status:  ${session.status}`);
      console.log(`Actions: ${session.actionCount}`);
      console.log(`\nRun 'hres learn analyze ${id}' to infer a procedure.`);
      break;
    }

    case 'analyze': {
      const id = params[0];
      if (!id) { console.error('Error: Provide demonstration ID.'); process.exitCode = 1; return; }
      console.log(`Analyzing demonstration ${id}...`);
      const result = await fabric.analyze(id);
      if (result.rejection) {
        console.log(`\n=== ANALYSIS REJECTED ===`);
        console.log(`Reason:      ${result.rejection.reason}`);
        console.log(`Explanation: ${result.rejection.explanation}`);
      } else if (result.proposal) {
        console.log(`\n=== PROPOSAL READY ===`);
        console.log(`ID:         ${result.proposal.id}`);
        console.log(`Name:       ${result.proposal.name}`);
        console.log(`Purpose:    ${result.proposal.purpose}`);
        console.log(`Steps:      ${result.proposal.steps.length}`);
        console.log(`Confidence: ${Math.round(result.proposal.confidence * 100)}%`);
        console.log(`Risk:       ${result.proposal.riskLevel}`);
        console.log(`Target:     ${result.proposal.compilationTarget}`);
        console.log(`\nRun 'hres learn approve ${id}' to approve and compile.`);
      }
      break;
    }

    case 'approve': {
      const id = params[0];
      if (!id) { console.error('Error: Provide demonstration ID.'); process.exitCode = 1; return; }
      const proposal = fabric.getProposal(id);
      if (!proposal) { console.error(`Error: No proposal for demonstration '${id}'.`); process.exitCode = 1; return; }
      const validation = fabric.validateProposal(proposal.id);
      if (!validation?.isValid) {
        console.log(`\n=== VALIDATION FAILED ===`);
        console.log(`Errors: ${validation?.result.errors.join(', ')}`);
        process.exitCode = 1; return;
      }
      const result = fabric.approveProposal(proposal.id, { approvedBy: 'cli' });
      if (result?.success) {
        console.log(`\n=== PROCEDURE COMPILED ===`);
        console.log(`Learned Procedure ID: ${result.learnedProcedureId}`);
        console.log(`Compiled as:          ${result.compilationTarget}`);
        if (result.compiledSkillId) console.log(`Skill ID:             ${result.compiledSkillId}`);
        if (result.compiledWorkflowId) console.log(`Workflow ID:          ${result.compiledWorkflowId}`);
      } else {
        console.error(`Approval/compilation failed.`);
        process.exitCode = 1;
      }
      break;
    }

    case 'reject': {
      const id = params[0];
      const reason = params.slice(1).join(' ') || 'Rejected via CLI';
      if (!id) { console.error('Error: Provide demonstration ID.'); process.exitCode = 1; return; }
      const proposal = fabric.getProposal(id);
      if (!proposal) { console.error(`Error: No proposal for '${id}'.`); process.exitCode = 1; return; }
      fabric.rejectProposal(proposal.id, reason, 'cli');
      console.log(`Proposal rejected: ${reason}`);
      break;
    }

    case 'status': {
      const id = params[0];
      if (!id) {
        // List all active sessions
        const sessions = fabric.listSessions({ status: 'RECORDING' });
        console.log(`\n=== ACTIVE DEMONSTRATIONS (${sessions.length}) ===`);
        for (const s of sessions) {
          console.log(`[${s.id}] ${s.title} — ${s.status} — ${s.actionCount} actions`);
        }
      } else {
        const session = fabric.getSession(id);
        if (!session) { console.error(`Session '${id}' not found.`); process.exitCode = 1; return; }
        console.log(JSON.stringify(session, null, 2));
      }
      break;
    }

    case 'list': {
      const sessions = fabric.listSessions();
      console.log(`\n=== ALL DEMONSTRATIONS (${sessions.length}) ===`);
      console.table(sessions.map((s) => ({ ID: s.id, Title: s.title, Status: s.status, Actions: s.actionCount, Started: s.startedAt.substring(0, 16) })));
      break;
    }

    case 'procedures': {
      const procedures = fabric.listLearnedProcedures();
      console.log(`\n=== LEARNED PROCEDURES (${procedures.length}) ===`);
      console.table(procedures.map((p) => ({ ID: p.id, Name: p.name, Version: p.currentVersion, Scope: p.scope, Updated: p.updatedAt.substring(0, 16) })));
      break;
    }

    default:
      console.log(`\nUsage: hres learn <command> [options]`);
      console.log(`\nCommands:`);
      console.log(`  start <title> [objective]  Start a new demonstration session`);
      console.log(`  stop <id>                  Stop recording`);
      console.log(`  analyze <id>               Infer a procedure from the trace`);
      console.log(`  approve <id>               Validate, approve, and compile the procedure`);
      console.log(`  reject <id> [reason]       Reject the proposed procedure`);
      console.log(`  status [id]                Show session status or list active sessions`);
      console.log(`  list                       List all demonstration sessions`);
      console.log(`  procedures                 List all learned procedures`);
  }
}

async function handleCapabilities(command?: string, params: string[] = [], customDbManager?: DatabaseManager): Promise<void> {
  const dbManager = customDbManager || new DatabaseManager(process.env.HRSIKESA_DB_PATH || 'data/hrisekesa.db');
  new MigrationManager(dbManager).runPending();
  const fabric = new UniversalCapabilityFabric({ dbManager });
  await fabric.initialize();

  try {
    switch (command) {
      case 'list': {
        const caps = fabric.listCapabilities();
        console.log(`\n=== HṚṢĪKEŚA UNIVERSAL CAPABILITIES (${caps.length}) ===\n`);
        console.table(
          caps.map((c) => ({
            ID: c.id,
            Name: c.name,
            Category: c.category,
            Protocol: c.protocol,
            Status: c.status,
            Risk: c.riskLevel,
            Trust: c.trustLevel,
          }))
        );
        break;
      }

      case 'search': {
        const query = params.join(' ').trim();
        if (!query) {
          console.error('Error: Please provide a search query.');
          process.exitCode = 1;
          return;
        }
        const results = fabric.searchCapabilities(query);
        console.log(`\n=== SEARCH RESULTS FOR "${query}" (${results.length}) ===\n`);
        for (const c of results) {
          console.log(`- [${c.id}] ${c.name} (${c.protocol} / ${c.category})`);
          console.log(`  Description: ${c.description}`);
          console.log(`  Status: ${c.status} | Trust: ${c.trustLevel} | Risk: ${c.riskLevel}\n`);
        }
        break;
      }

      case 'inspect': {
        const id = params[0];
        if (!id) {
          console.error('Error: Please specify capability ID.');
          process.exitCode = 1;
          return;
        }
        const cap = fabric.getCapability(id);
        if (!cap) {
          console.error(`Error: Capability '${id}' not found.`);
          process.exitCode = 1;
          return;
        }
        console.log(`\n=== CAPABILITY: ${cap.name} [${cap.id}] ===`);
        console.log(JSON.stringify(cap, null, 2));
        break;
      }

      case 'health': {
        const id = params[0];
        if (!id) {
          console.error('Error: Please specify capability ID.');
          process.exitCode = 1;
          return;
        }
        const health = await fabric.checkHealth(id);
        console.log(`\n=== HEALTH STATUS: [${id}] ===`);
        console.log(`Status: ${health.status}`);
        console.log(`Latency: ${health.latencyMs ?? 'N/A'}ms`);
        console.log(`Failures: ${health.consecutiveFailures}`);
        console.log(`Message: ${health.message ?? 'None'}`);
        console.log(`Checked At: ${health.lastCheckedAt}\n`);
        break;
      }

      case 'verify': {
        const id = params[0];
        if (!id) {
          console.error('Error: Please specify capability ID.');
          process.exitCode = 1;
          return;
        }
        const verification = await fabric.verify(id);
        console.log(`\n=== VERIFICATION RESULT: [${id}] ===`);
        console.log(`Verified: ${verification.verified ? 'YES' : 'NO'}`);
        console.log(`Details: ${verification.details ?? 'N/A'}\n`);
        break;
      }

      case 'revoke': {
        const id = params[0];
        if (!id) {
          console.error('Error: Please specify capability ID.');
          process.exitCode = 1;
          return;
        }
        fabric.revokeCapability(id);
        console.log(`\n[SUCCESS] Capability '${id}' has been permanently REVOKED.\n`);
        break;
      }

      case 'invoke': {
        const id = params[0];
        if (!id) {
          console.error('Error: Please specify capability ID.');
          process.exitCode = 1;
          return;
        }
        let inputs: Record<string, unknown> = {};
        if (params[1]) {
          try {
            inputs = JSON.parse(params.slice(1).join(' '));
          } catch {
            inputs = { arg: params[1] };
          }
        }
        console.log(`\nInvoking capability '${id}'...`);
        const result = await fabric.invoke({
          invocationId: `cli_${Date.now()}`,
          capabilityId: id,
          operation: 'run',
          inputs,
          actor: 'CLI_USER',
          privacyClass: 'PRIVATE',
          requestedAt: new Date().toISOString(),
        });
        console.log(`\n=== INVOCATION RESULT ===`);
        console.log(`Status: ${result.status}`);
        console.log(`Verified: ${result.verification.verified ? 'YES' : 'NO'} (${result.verification.strategy})`);
        console.log(`Duration: ${result.durationMs}ms`);
        if (result.output) console.log('Output:', JSON.stringify(result.output, null, 2));
        if (result.error) console.error('Error:', result.error);
        break;
      }

      default:
        console.log(`Unknown capabilities command '${command}'. Available: list, search, inspect, health, verify, revoke, invoke`);
    }
  } finally {
    dbManager.close();
  }
}

async function handleGitHub(command?: string, params: string[] = [], customDbManager?: DatabaseManager): Promise<void> {
  const dbManager = customDbManager || new DatabaseManager(process.env.HRSIKESA_DB_PATH || 'data/hrisekesa.db');
  new MigrationManager(dbManager).runPending();
  const fabric = new UniversalCapabilityFabric({ dbManager });
  await fabric.initialize();
  const githubFabric = new GitHubFabric({ dbManager, fabric });
  await githubFabric.initialize();

  try {
    switch (command) {
      case 'search': {
        const query = params.join(' ').trim();
        if (!query) {
          console.error('Error: Please provide a search query. Example: hres github search "browser automation"');
          process.exitCode = 1;
          return;
        }
        console.log(`\nSearching GitHub for: "${query}"...`);
        const results = await githubFabric.search({ query, limit: 10 });
        console.log(`\n=== CANDIDATE REPOSITORIES (${results.length}) ===\n`);
        console.table(
          results.map((r) => ({
            Repository: r.fullName,
            Stars: r.stars,
            Language: r.language || 'Unknown',
            License: r.license?.spdxId || 'None',
            Updated: r.updatedAt.slice(0, 10),
          }))
        );
        break;
      }

      case 'inspect': {
        const repoArg = params[0];
        if (!repoArg || !repoArg.includes('/')) {
          console.error('Error: Please specify <owner>/<repo>, e.g. octocat/Hello-World');
          process.exitCode = 1;
          return;
        }
        const [owner, name] = repoArg.split('/');
        console.log(`\nFetching metadata for ${owner}/${name}...`);
        const repo = await githubFabric.getRepository(owner, name);
        console.log(`\n=== REPOSITORY: ${repo.fullName} ===`);
        console.log(JSON.stringify(repo, null, 2));
        break;
      }

      case 'analyze': {
        const repoArg = params[0];
        if (!repoArg || !repoArg.includes('/')) {
          console.error('Error: Please specify <owner>/<repo>, e.g. octocat/Hello-World');
          process.exitCode = 1;
          return;
        }
        const [owner, name] = repoArg.split('/');
        console.log(`\nAnalyzing repository intelligence for ${owner}/${name}...`);
        const result = await githubFabric.analyzeRepository(owner, name);
        console.log(`\n=== INTELLIGENCE ANALYSIS: ${result.repository.fullName} ===`);
        console.log(`Architecture:   ${result.intelligence.architecture}`);
        console.log(`License:        ${result.intelligence.license.spdxId || result.intelligence.license.spdx} (${result.intelligence.license.compatibility})`);
        console.log(`Compatibility:  ${result.intelligence.compatibility.status} (Score: ${result.intelligence.compatibility.score ?? 100}/100)`);
        console.log(`Dependencies:   ${result.intelligence.dependencies?.count ?? result.dependencies.length} (Risk: ${result.intelligence.dependencies?.riskLevel ?? 'LOW'})`);
        console.log(`Security Risk:  ${result.intelligence.security?.overallRisk ?? 'LOW'} (Findings: ${result.securityFindings.length})`);
        console.log(`Activity:       ${result.intelligence.activity.status}`);
        console.log(`RAM Estimate:   ${result.intelligence.resourceRequirements?.estimatedMemoryMb ?? result.intelligence.resourceEstimate.ramMb} MB`);
        console.log(`CPU Estimate:   ${result.intelligence.resourceRequirements?.estimatedCores ?? 2} cores`);
        break;
      }

      case 'license': {
        const repoArg = params[0];
        if (!repoArg || !repoArg.includes('/')) {
          console.error('Error: Please specify <owner>/<repo>, e.g. octocat/Hello-World');
          process.exitCode = 1;
          return;
        }
        const [owner, name] = repoArg.split('/');
        const result = await githubFabric.analyzeRepository(owner, name);
        console.log(`\n=== LICENSE ANALYSIS: ${result.repository.fullName} ===`);
        console.log(`SPDX ID:        ${result.intelligence.license.spdxId || result.intelligence.license.spdx}`);
        console.log(`Compatibility:  ${result.intelligence.license.compatibility}`);
        console.log(`Copyleft:       ${result.intelligence.license.isCopyleft ?? result.intelligence.license.copyleft ? 'YES' : 'NO'}`);
        console.log(`Legal Review:   ${result.intelligence.license.requiresLegalReview ? 'REQUIRED' : 'NOT REQUIRED'}`);
        console.log(`Attribution:    ${result.intelligence.license.attributionRequirements?.join(', ') || 'Standard'}`);
        break;
      }

      case 'dependencies': {
        const repoArg = params[0];
        if (!repoArg || !repoArg.includes('/')) {
          console.error('Error: Please specify <owner>/<repo>, e.g. octocat/Hello-World');
          process.exitCode = 1;
          return;
        }
        const [owner, name] = repoArg.split('/');
        const result = await githubFabric.analyzeRepository(owner, name);
        console.log(`\n=== DEPENDENCY INTELLIGENCE: ${result.repository.fullName} ===`);
        console.log(`Total Count:    ${result.intelligence.dependencies?.count ?? result.dependencies.length}`);
        console.log(`Risk Level:     ${result.intelligence.dependencies?.riskLevel ?? 'LOW'}`);
        console.log(`Lockfile:       ${result.intelligence.dependencies?.lockfilePresent ? 'YES' : 'NO'}`);
        console.log(`Manifests:      ${result.intelligence.dependencies?.manifests?.join(', ') || 'None'}`);
        if (result.dependencies.length > 0) {
          console.table(
            result.dependencies.slice(0, 20).map((d) => ({
              Name: d.name,
              Version: d.versionSpec,
              Runtime: d.runtime,
              Type: d.dependencyType,
            }))
          );
        }
        break;
      }

      case 'security': {
        const repoArg = params[0];
        if (!repoArg || !repoArg.includes('/')) {
          console.error('Error: Please specify <owner>/<repo>, e.g. octocat/Hello-World');
          process.exitCode = 1;
          return;
        }
        const [owner, name] = repoArg.split('/');
        const result = await githubFabric.analyzeRepository(owner, name);
        console.log(`\n=== SECURITY HEURISTICS: ${result.repository.fullName} ===`);
        console.log(`Overall Risk:   ${result.intelligence.security?.overallRisk ?? 'LOW'}`);
        console.log(`Findings Count: ${result.securityFindings.length}`);
        if (result.securityFindings.length > 0) {
          console.table(
            result.securityFindings.map((f) => ({
              Rule: f.ruleId || f.indicator,
              Severity: f.severity,
              Confidence: f.confidence,
              File: f.filePath,
              Description: f.description || f.evidence,
            }))
          );
        } else {
          console.log('No static security risk indicators detected.');
        }
        break;
      }

      case 'releases': {
        const repoArg = params[0];
        if (!repoArg || !repoArg.includes('/')) {
          console.error('Error: Please specify <owner>/<repo>, e.g. octocat/Hello-World');
          process.exitCode = 1;
          return;
        }
        const [owner, name] = repoArg.split('/');
        const result = await githubFabric.analyzeRepository(owner, name);
        console.log(`\n=== RELEASE & ACTIVITY ANALYSIS: ${result.repository.fullName} ===`);
        console.log(`Activity Status: ${result.intelligence.activity.status}`);
        console.log(`Total Releases:  ${result.intelligence.activity.releases?.length ?? 0}`);
        console.log(`Latest Release:  ${result.intelligence.activity.latestReleaseDate || 'None'}`);
        console.log(`Last Push Days:  ${result.intelligence.activity.lastPushDaysAgo}`);
        console.log(`Open Issues:     ${result.intelligence.activity.openIssuesCount}`);
        break;
      }

      case 'acquire': {
        const repoArg = params[0];
        if (!repoArg || !repoArg.includes('/')) {
          console.error('Error: Please specify <owner>/<repo>, e.g. octocat/Hello-World');
          process.exitCode = 1;
          return;
        }
        const [owner, name] = repoArg.split('/');
        console.log(`\nAcquiring repository ${owner}/${name} into isolated sandbox...`);
        const acq = await githubFabric.acquireRepository(owner, name, { shallow: true });
        console.log(`\n[SUCCESS] Acquisition Completed.`);
        console.log(`Sandbox Dir:  ${acq.targetPath}`);
        console.log(`Commit SHA:   ${acq.commitSha || 'Head'}`);
        console.log(`Status:       ${acq.status}`);
        break;
      }

      case 'build': {
        const repoArg = params[0];
        if (!repoArg || !repoArg.includes('/')) {
          console.error('Error: Please specify <owner>/<repo>, e.g. octocat/Hello-World');
          process.exitCode = 1;
          return;
        }
        const [owner, name] = repoArg.split('/');
        const repoId = `github_${owner}_${name}`;
        const cmd = params[1] || 'npm run build';
        console.log(`\nExecuting sandboxed build for ${repoId} [${cmd}]...`);
        const result = await githubFabric.build(repoId, cmd);
        console.log(`\n=== BUILD RESULT ===`);
        console.log(`Success:  ${result.success ? 'YES' : 'NO'}`);
        console.log(`ExitCode: ${result.exitCode}`);
        console.log(`Duration: ${result.durationMs}ms`);
        console.log(`Output:\n${result.output}`);
        break;
      }

      case 'test': {
        const repoArg = params[0];
        if (!repoArg || !repoArg.includes('/')) {
          console.error('Error: Please specify <owner>/<repo>, e.g. octocat/Hello-World');
          process.exitCode = 1;
          return;
        }
        const [owner, name] = repoArg.split('/');
        const repoId = `github_${owner}_${name}`;
        const cmd = params[1] || 'npm test';
        console.log(`\nExecuting sandboxed test for ${repoId} [${cmd}]...`);
        const result = await githubFabric.test(repoId, cmd);
        console.log(`\n=== TEST RESULT ===`);
        console.log(`Success:  ${result.success ? 'YES' : 'NO'}`);
        console.log(`ExitCode: ${result.exitCode}`);
        console.log(`Duration: ${result.durationMs}ms`);
        console.log(`Output:\n${result.output}`);
        break;
      }

      case 'provenance': {
        const repoArg = params[0];
        const [owner, name] = repoArg && repoArg.includes('/') ? repoArg.split('/') : [undefined, undefined];
        const records = githubFabric.listProvenance();
        const filtered = owner && name ? records.filter((p) => p.repository === name && p.owner === owner) : records;
        console.log(`\n=== REPOSITORY PROVENANCE RECORDS (${filtered.length}) ===\n`);
        console.table(
          filtered.map((p) => ({
            Repository: `${p.owner}/${p.repository}`,
            Commit: (p.commitSha || 'unknown').slice(0, 8),
            License: p.license,
            Acquired: (p.acquisitionTimestamp || p.createdAt).slice(0, 19),
            Integration: p.integrationStatus || 'PENDING',
          }))
        );
        break;
      }

      default:
        console.log(`Unknown github command '${command}'. Available: search, inspect, analyze, license, dependencies, security, releases, acquire, build, test, provenance`);
    }
  } finally {
    dbManager.close();
  }
}

async function handleIde(command?: string, params: string[] = [], customDbManager?: DatabaseManager): Promise<void> {
  const dbManager = customDbManager || new DatabaseManager(process.env.HRSIKESA_DB_PATH || 'data/hrisekesa.db');
  new MigrationManager(dbManager).runPending();
  const ideFabric = new IdeFabric({ dbManager });
  await ideFabric.initialize();

  try {
    switch (command) {
      case 'status': {
        const ws = await ideFabric.openWorkspace(process.cwd());
        const arch = ws.architecture as any;
        console.log(`\n=== HṚṢĪKEŚA IDE WORKSPACE STATUS ===\n`);
        console.log(`ID:           ${ws.id}`);
        console.log(`Name:         ${ws.name}`);
        console.log(`Root:         ${ws.rootPath}`);
        console.log(`Architecture: ${arch?.framework || ws.framework || 'unknown'} (${arch?.language || 'unknown'})`);
        console.log(`Entry Points: ${(arch?.entryPoints || []).join(', ') || 'none'}`);
        break;
      }
      case 'search': {
        const query = params.join(' ').trim();
        if (!query) {
          console.error('Error: Please provide search query.');
          process.exitCode = 1;
          return;
        }
        await ideFabric.openWorkspace(process.cwd());
        const results = await ideFabric.getCodeSearch().search({ query });
        console.log(`\n=== SEARCH RESULTS FOR "${query}" (${results.matches.length} matches across ${results.totalFiles} files) ===\n`);
        for (const m of results.matches.slice(0, 20)) {
          console.log(`${m.file}:${m.line || m.lineNumber}: ${(m.content || m.lineContent).trim()}`);
        }
        if (results.matches.length > 20) {
          console.log(`... and ${results.matches.length - 20} more matches`);
        }
        break;
      }
      case 'run': {
        const cmd = params.join(' ').trim();
        if (!cmd) {
          console.error('Error: Please provide terminal command to run.');
          process.exitCode = 1;
          return;
        }
        const ws = await ideFabric.openWorkspace(process.cwd());
        console.log(`Executing in [${ws.rootPath}]: ${cmd}\n`);
        const result = await ideFabric.executeCommand(cmd);
        console.log(`Exit Code: ${result.exitCode} | Duration: ${result.durationMs}ms`);
        console.log(`Output:\n${result.output}`);
        break;
      }
      case 'git-status': {
        await ideFabric.openWorkspace(process.cwd());
        const git = ideFabric.getGitWorkspace();
        const status = await git.getStatus();
        console.log(`\n=== GIT REPOSITORY STATUS (${status.branch || 'detached'}) ===\n`);
        console.log(`Clean: ${status.isClean}`);
        if (!status.isClean) {
          console.log(`Staged:    ${status.staged.length} files`);
          console.log(`Modified:  ${status.modified.length} files`);
          console.log(`Untracked: ${status.untracked.length} files`);
        }
        break;
      }
      case 'verify': {
        const instruction = params.join(' ').trim() || 'Verify workspace architecture and test integrity';
        const ws = await ideFabric.openWorkspace(process.cwd());
        console.log(`\n=== RUNNING 10-STAGE AUTONOMOUS VERIFICATION LOOP ===`);
        console.log(`Workspace: ${ws.name}`);
        console.log(`Instruction: ${instruction}\n`);
        const run = await ideFabric.runVerificationLoop({
          instruction,
          autoFix: true,
          maxCorrectionAttempts: 1,
        });
        console.log(`Status: ${run.status}`);
        console.log(`Summary: ${run.summary}`);
        console.log(`Stages Completed: ${run.stages.length}/10`);
        for (const s of run.stages) {
          console.log(`  - [${s.stage}] ${s.status} (${s.durationMs}ms)`);
        }
        break;
      }
      case 'workspaces': {
        const list = ideFabric.getRepository().listWorkspaces();
        console.log(`\n=== PERSISTED IDE WORKSPACES (${list.length}) ===\n`);
        console.table(
          list.map((w) => ({
            ID: w.id,
            Name: w.name,
            Root: w.rootPath,
            LastActive: (w.lastActiveAt || w.lastAccessedAt || w.createdAt).slice(0, 19),
          }))
        );
        break;
      }
      default:
        console.log(`Unknown ide command '${command}'. Available: status, search, run, git-status, verify, workspaces`);
    }
  } finally {
    await ideFabric.shutdown().catch(() => {});
    dbManager.close();
  }
}

async function handleEngineering(command?: string, params: string[] = [], customDbManager?: DatabaseManager): Promise<void> {
  const dbManager = customDbManager || new DatabaseManager(process.env.HRSIKESA_DB_PATH || 'data/hrisekesa.db');
  new MigrationManager(dbManager).runPending();
  const ideFabric = new IdeFabric({ dbManager });
  await ideFabric.initialize();
  const engineeringFabric = new EngineeringFabric({ dbManager, ideFabric });
  await engineeringFabric.initialize();

  try {
    switch (command) {
      case 'start': {
        const objective = params.join(' ').trim();
        if (!objective) {
          console.error('Error: Please provide an objective for the autonomous engineering task.');
          process.exitCode = 1;
          return;
        }
        console.log(`\n=== INITIALIZING AUTONOMOUS ENGINEERING TASK ===\nObjective: "${objective}"\n`);
        const task = engineeringFabric.createTask({
          objective,
          autoApprove: true,
        });
        console.log(`Created Task ID: ${task.id}`);
        console.log(`Starting autonomous execution loop...\n`);
        const result = await engineeringFabric.runTask(task.id);
        console.log(`\n=== TASK FINISHED ===`);
        console.log(`Status:       ${result.status}`);
        console.log(`Phase:        ${result.currentPhase}`);
        console.log(`Attempts:     ${result.attemptCount}`);
        console.log(`Changed:      ${result.changedFiles.join(', ') || 'none'}`);
        console.log(`Tests Run:    ${result.testsRun}`);
        console.log(`Summary:      ${result.finalSummary || result.failureReason || 'N/A'}\n`);
        break;
      }
      case 'list': {
        const list = engineeringFabric.getRepository().listTasks({ limit: 20 });
        console.log(`\n=== AUTONOMOUS ENGINEERING TASKS (${list.length}) ===\n`);
        console.table(
          list.map((t: any) => ({
            ID: t.id,
            Status: t.status,
            Phase: t.currentPhase,
            Attempts: t.attemptCount,
            Files: t.changedFiles.length,
            Objective: t.objective.length > 40 ? t.objective.slice(0, 37) + '...' : t.objective,
          }))
        );
        break;
      }
      case 'status': {
        const taskId = params[0];
        if (!taskId) {
          console.error('Error: Please provide a taskId.');
          process.exitCode = 1;
          return;
        }
        const task = engineeringFabric.getRepository().getTask(taskId);
        if (!task) {
          console.error(`Task '${taskId}' not found.`);
          process.exitCode = 1;
          return;
        }
        console.log(`\n=== ENGINEERING TASK DETAIL: ${task.id} ===\n`);
        console.log(`Objective:     ${task.objective}`);
        console.log(`Status:        ${task.status}`);
        console.log(`Current Phase: ${task.currentPhase}`);
        console.log(`Attempts:      ${task.attemptCount} / ${task.maxAttempts}`);
        console.log(`Changed Files: ${task.changedFiles.join(', ') || 'none'}`);
        console.log(`Verification:  ${task.verificationState}`);
        console.log(`Summary:       ${task.finalSummary || task.failureReason || 'In progress...'}\n`);
        break;
      }
      case 'plan': {
        const taskId = params[0];
        if (!taskId) {
          console.error('Error: Please provide a taskId.');
          process.exitCode = 1;
          return;
        }
        const plan = engineeringFabric.getRepository().getPlanByTask(taskId);
        if (!plan) {
          console.log(`No plan found for task '${taskId}'.`);
          return;
        }
        console.log(`\n=== PLAN FOR TASK ${taskId} ===\n`);
        console.log(`Summary: ${plan.summary || plan.architectureSummary}`);
        console.log(`Risk:    ${plan.riskAssessment || plan.riskLevel}`);
        console.log(`Steps (${plan.steps.length}):`);
        plan.steps.forEach((s: any, i: number) => console.log(`  ${i + 1}. [${s.actionType}] ${s.description}`));
        console.log(`Acceptance Criteria:`);
        (plan.acceptanceCriteria || plan.verificationPlan || []).forEach((c: any) => console.log(`  - ${c}`));
        break;
      }
      case 'pause': {
        const taskId = params[0];
        if (!taskId) return;
        const res = await engineeringFabric.pauseTask(taskId);
        console.log(`Task ${taskId} paused: ${res}`);
        break;
      }
      case 'resume': {
        const taskId = params[0];
        if (!taskId) return;
        const res = await engineeringFabric.resumeTask(taskId);
        console.log(`Task ${taskId} resumed: ${res}`);
        break;
      }
      case 'cancel': {
        const taskId = params[0];
        if (!taskId) return;
        const res = await engineeringFabric.cancelTask(taskId);
        console.log(`Task ${taskId} cancelled: ${res}`);
        break;
      }
      default:
        console.log(`Unknown engineering command '${command}'. Available: start, list, status, plan, pause, resume, cancel`);
    }
  } finally {
    await engineeringFabric.shutdown().catch(() => {});
    await ideFabric.shutdown().catch(() => {});
    dbManager.close();
  }
}

async function handleWorkflow(command?: string, params: string[] = [], customDbManager?: DatabaseManager): Promise<void> {
  const dbManager = customDbManager || new DatabaseManager(process.env.HRSIKESA_DB_PATH || 'data/hrisekesa.db');
  new MigrationManager(dbManager).runPending();
  const fabric = new WorkflowFabric({ dbManager });
  await fabric.initialize();

  try {
    switch (command) {
      case 'list': {
        const workflows = fabric.getRepository().listWorkflows();
        console.log(`\n=== HṚṢĪKEŚA WORKFLOWS (Total: ${workflows.length}) ===\n`);
        console.table(
          workflows.map(w => ({
            ID: w.id,
            Name: w.name,
            Category: w.category,
            Scope: w.scope,
            Status: w.status,
            Version: `v${w.activeVersion}`,
          }))
        );
        break;
      }
      case 'create': {
        const name = params[0] || 'Manual Workflow';
        const description = params.slice(1).join(' ') || name;
        const created = fabric.createWorkflow({
          name,
          description,
          graph: {
            nodes: [
              { id: 'start', name: 'Start', type: 'TRIGGER', config: {} },
              { id: 'action', name: 'Action', type: 'ACTION', config: { toolName: 'time_now', parameters: {} } },
              { id: 'report', name: 'Report', type: 'REPORT', config: { title: 'Finished', body: 'Executed successfully' }, isTerminal: true },
            ],
            edges: [
              { id: 'e1', fromNodeId: 'start', toNodeId: 'action' },
              { id: 'e2', fromNodeId: 'action', toNodeId: 'report' },
            ],
          },
        });
        console.log(`\n=== CREATED WORKFLOW [${created.workflow.id}] ===`);
        console.log(`Name:        ${created.workflow.name}`);
        console.log(`Status:      ${created.workflow.status}`);
        console.log(`Description: ${created.workflow.description}\n`);
        break;
      }
      case 'inspect': {
        const wfId = params[0];
        if (!wfId) {
          console.error('Error: Please specify workflow ID.');
          process.exitCode = 1;
          return;
        }
        const wf = fabric.getRepository().getWorkflow(wfId);
        if (!wf) {
          console.error(`Workflow '${wfId}' not found.`);
          process.exitCode = 1;
          return;
        }
        const version = fabric.getRepository().getVersion(wfId, wf.activeVersion);
        console.log(`\n=== WORKFLOW: ${wf.name} [${wf.id}] ===`);
        console.log(`Category: ${wf.category} | Scope: ${wf.scope} | Status: ${wf.status} | Version: v${wf.activeVersion}`);
        console.log(`Description: ${wf.description}`);
        console.log(`Nodes (${version?.graph.nodes.length || 0}):`);
        version?.graph.nodes.forEach(n => console.log(`  - [${n.id}] ${n.name} (${n.type})`));
        console.log(`Edges (${version?.graph.edges.length || 0}):`);
        version?.graph.edges.forEach(e => console.log(`  - ${e.fromNodeId} -> ${e.toNodeId}${e.condition ? ` [${e.condition}]` : ''}`));
        console.log('');
        break;
      }
      case 'validate': {
        const wfId = params[0];
        if (!wfId) return;
        const res = fabric.validateWorkflow(wfId);
        console.log(`\n=== VALIDATION RESULT FOR [${wfId}] ===`);
        console.log(`Valid:      ${res.valid ? 'PASS' : 'FAIL'}`);
        console.log(`Risk Level: ${res.riskLevel}`);
        if (res.errors.length > 0) console.log(`Errors:     ${res.errors.join('; ')}`);
        if (res.warnings.length > 0) console.log(`Warnings:   ${res.warnings.join('; ')}`);
        console.log('');
        break;
      }
      case 'activate': {
        const wfId = params[0];
        if (!wfId) return;
        const updated = fabric.activateWorkflow(wfId);
        console.log(`Workflow '${wfId}' is now ${updated.status}.`);
        break;
      }
      case 'pause': {
        const wfId = params[0];
        if (!wfId) return;
        const updated = fabric.pauseWorkflow(wfId);
        console.log(`Workflow '${wfId}' is now ${updated.status}.`);
        break;
      }
      case 'resume': {
        const wfId = params[0];
        if (!wfId) return;
        const updated = fabric.resumeWorkflow(wfId);
        console.log(`Workflow '${wfId}' resumed, status: ${updated.status}.`);
        break;
      }
      case 'disable': {
        const wfId = params[0];
        if (!wfId) return;
        const updated = fabric.disableWorkflow(wfId);
        console.log(`Workflow '${wfId}' is now ${updated.status}.`);
        break;
      }
      case 'run': {
        const wfId = params[0];
        if (!wfId) return;
        let inputs: Record<string, any> = {};
        if (params[1]) {
          try { inputs = JSON.parse(params[1]); } catch { inputs = { arg: params[1] }; }
        }
        const run = await fabric.runWorkflow(wfId, { inputVariables: inputs });
        console.log(`\n=== STARTED WORKFLOW RUN [${run.id}] ===`);
        console.log(`Workflow: ${wfId} | Version: v${run.versionNumber} | Status: ${run.status}\n`);
        break;
      }
      case 'runs': {
        const wfId = params[0];
        const runs = fabric.getRepository().listRuns({ workflowId: wfId });
        console.log(`\n=== WORKFLOW RUNS (${runs.length}) ===\n`);
        console.table(
          runs.map(r => ({
            RunID: r.id,
            WorkflowID: r.workflowId,
            Version: `v${r.versionNumber}`,
            Status: r.status,
            Trigger: r.triggerType,
            StartedAt: r.startedAt,
          }))
        );
        break;
      }
      case 'logs': {
        const runId = params[0];
        if (!runId) return;
        const nodes = fabric.getRepository().listRunNodes(runId);
        console.log(`\n=== EXECUTION LOGS FOR RUN [${runId}] (${nodes.length} nodes) ===\n`);
        nodes.forEach(n => {
          console.log(`[${n.startedAt}] [${n.status}] Node: ${n.nodeName} (${n.nodeType}) - Duration: ${n.durationMs}ms`);
          if (n.error) console.log(`   Error: ${n.error}`);
        });
        console.log('');
        break;
      }
      case 'templates': {
        const templates = fabric.listTemplates();
        console.log(`\n=== BUILT-IN WORKFLOW TEMPLATES (${templates.length}) ===\n`);
        templates.forEach((t, i) => {
          console.log(`${i + 1}. ${t.workflow.name} [${t.workflow.category}]`);
          console.log(`   ${t.workflow.description}\n`);
        });
        break;
      }
      default:
        console.log(`Unknown workflow command '${command}'. Available: list, create, inspect, validate, activate, pause, resume, disable, run, runs, logs, templates`);
    }
  } finally {
    dbManager.close();
  }
}

async function handleAccount(command?: string, params: string[] = [], customDbManager?: DatabaseManager): Promise<void> {
  const dbManager = customDbManager || new DatabaseManager(process.env.HRSIKESA_DB_PATH || 'data/hrisekesa.db');
  new MigrationManager(dbManager).runPending();
  const fabric = new AccountFabric(dbManager.open(), console as any);

  try {
    switch (command) {
      case 'list': {
        const accounts = fabric.listAccounts();
        console.log(`\n=== CONNECTED SERVICE ACCOUNTS (${accounts.length}) ===\n`);
        if (accounts.length === 0) {
          console.log('No accounts connected. Use "hres account connect <provider>" to connect.');
        } else {
          console.table(
            accounts.map(a => ({
              ID: a.id,
              Provider: a.providerId.toUpperCase(),
              Identity: a.accountName || a.email || a.ownerIdentity,
              ScopeType: a.scopeType,
              Status: a.status,
              Capabilities: (a.metadata?.capabilities as string[] | undefined)?.length || 0,
            }))
          );
        }
        break;
      }
      case 'connect': {
        const providerId = params[0];
        if (!providerId) {
          console.log('Error: Provider ID required (e.g. google, github, microsoft, slack)');
          return;
        }
        const authReq = await fabric.oauthManager.initiateAuthorization({
          providerId,
          ownerIdentity: 'rushi',
          scopeType: 'PERSONAL',
        });
        console.log(`\n=== OAUTH AUTHORIZATION INITIATED FOR [${providerId.toUpperCase()}] ===\n`);
        console.log(`Authorization URL: ${authReq.authorizationUrl}\n`);
        console.log(`State: ${authReq.state}`);
        console.log(`Expires: ${authReq.expiresAt}`);
        console.log(`\nPlease complete authorization in your browser.\n`);
        break;
      }
      case 'inspect': {
        const accountId = params[0];
        if (!accountId) return;
        const account = fabric.getAccount(accountId);
        if (!account) {
          console.log(`Account "${accountId}" not found`);
          return;
        }
        console.log(`\n=== ACCOUNT DETAILS [${account.id}] ===\n`);
        console.log(JSON.stringify(account, null, 2));
        break;
      }
      case 'verify': {
        const accountId = params[0];
        if (!accountId) return;
        console.log(`Verifying account "${accountId}"...`);
        const health = await fabric.verifyAccount(accountId);
        console.log(`Verification result: Status = ${health.status}, Latency = ${health.latencyMs}ms`);
        if (health.lastFailure) console.log(`Error: ${health.lastFailure}`);
        break;
      }
      case 'refresh': {
        const accountId = params[0];
        if (!accountId) return;
        const account = fabric.getAccount(accountId);
        if (!account) {
          console.log(`Account "${accountId}" not found`);
          return;
        }
        await fabric.oauthManager.refreshTokenIfNeeded(account);
        console.log(`Token refreshed successfully for account "${accountId}"`);
        break;
      }
      case 'revoke':
      case 'disconnect': {
        const accountId = params[0];
        if (!accountId) return;
        await fabric.revokeAccount(accountId);
        console.log(`Account "${accountId}" revoked and disconnected successfully.`);
        break;
      }
      case 'capabilities': {
        const accountId = params[0];
        if (!accountId) return;
        const account = fabric.getAccount(accountId);
        if (!account) {
          console.log(`Account "${accountId}" not found`);
          return;
        }
        const caps = (account.metadata?.capabilities as any[]) || fabric.getProvider(account.providerId)?.capabilities || [];
        caps.forEach((c: any) => {
          const capName = typeof c === 'string' ? c : c?.id || String(c);
          console.log(`- ${capName}`);
        });
        break;
      }
      case 'health': {
        const accountId = params[0];
        if (!accountId) return;
        const health = fabric.getAccountHealth(accountId);
        console.log(`\n=== HEALTH RECORD [${accountId}] ===\n`);
        console.log(JSON.stringify(health || { status: 'UNKNOWN' }, null, 2));
        break;
      }
      case 'usage': {
        const accountId = params[0];
        if (!accountId) return;
        const usage = fabric.getAccountUsage(accountId);
        console.log(`\n=== USAGE & QUOTA RECORD [${accountId}] ===\n`);
        console.log(JSON.stringify(usage || { requestsMade: 0, requestsRemaining: 'UNKNOWN' }, null, 2));
        break;
      }
      default:
        console.log(`Unknown account command '${command}'. Available: list, connect, inspect, verify, refresh, revoke, disconnect, capabilities, health, usage`);
    }
  } finally {
    dbManager.close();
  }
}

async function handleProvider(command?: string, params: string[] = [], customDbManager?: DatabaseManager): Promise<void> {
  const dbManager = customDbManager || new DatabaseManager(process.env.HRSIKESA_DB_PATH || 'data/hrisekesa.db');
  new MigrationManager(dbManager).runPending();
  const fabric = new AccountFabric(dbManager.open(), console as any);

  try {
    switch (command) {
      case 'list': {
        const providers = fabric.listProviders();
        console.log(`\n=== AVAILABLE SERVICE PROVIDERS (${providers.length}) ===\n`);
        console.table(
          providers.map(p => ({
            ID: p.id,
            Name: p.displayName,
            Category: p.category,
            AuthMethods: p.authMethods.join(', '),
            Capabilities: p.capabilities.length,
            Status: p.status,
          }))
        );
        break;
      }
      case 'inspect': {
        const providerId = params[0];
        if (!providerId) return;
        const provider = fabric.getProvider(providerId);
        if (!provider) {
          console.log(`Provider "${providerId}" not found`);
          return;
        }
        console.log(`\n=== PROVIDER DEFINITION [${provider.displayName}] ===\n`);
        console.log(JSON.stringify(provider, null, 2));
        break;
      }
      default:
        console.log(`Unknown provider command '${command}'. Available: list, inspect`);
    }
  } finally {
    dbManager.close();
  }
}

async function handleWorkspace(command?: string, params: string[] = [], customDbManager?: DatabaseManager): Promise<void> {
  const dbManager = customDbManager || new DatabaseManager(process.env.HRSIKESA_DB_PATH || 'data/hrisekesa.db');
  new MigrationManager(dbManager).runPending();
  const repo = new WorkspaceRepository(dbManager.open());
  const operator = new ApplicationOperator(repo, console as any);

  try {
    switch (command) {
      case 'list': {
        const list = operator.listWorkspaces();
        console.log(`\n=== DIGITAL WORKSPACES (${list.length}) ===\n`);
        console.table(
          list.map((w) => ({
            ID: w.workspaceId,
            Name: w.name,
            Type: w.workspaceType,
            Status: w.status,
            Target: w.targetUri || 'local',
          }))
        );
        break;
      }
      case 'inspect': {
        const id = params[0] || 'local_windows_main';
        const ws = operator.getWorkspace(id);
        console.log(`\n=== WORKSPACE DEFINITION [${ws.descriptor.name}] ===\n`);
        console.log(JSON.stringify(ws.descriptor, null, 2));
        break;
      }
      case 'connect': {
        const id = params[0] || 'local_windows_main';
        const success = await operator.connectWorkspace(id, 'agent_cli');
        console.log(`Workspace ${id} connect: ${success ? 'SUCCESS' : 'FAILED'}`);
        break;
      }
      case 'disconnect': {
        const id = params[0] || 'local_windows_main';
        const success = await operator.disconnectWorkspace(id);
        console.log(`Workspace ${id} disconnect: ${success ? 'SUCCESS' : 'FAILED'}`);
        break;
      }
      case 'observe': {
        const id = params[0] || 'local_windows_main';
        const obs = await operator.observe(id);
        console.log(`\n=== WORKSPACE OBSERVATION [${id}] ===\n`);
        console.log(JSON.stringify(obs, null, 2));
        break;
      }
      default:
        console.log(`Unknown workspace command '${command}'. Available: list, inspect, connect, disconnect, observe`);
    }
  } finally {
    dbManager.close();
  }
}

async function handleApp(command?: string, params: string[] = [], customDbManager?: DatabaseManager): Promise<void> {
  const dbManager = customDbManager || new DatabaseManager(process.env.HRSIKESA_DB_PATH || 'data/hrisekesa.db');
  new MigrationManager(dbManager).runPending();
  const repo = new WorkspaceRepository(dbManager.open());
  const operator = new ApplicationOperator(repo, console as any);

  try {
    switch (command) {
      case 'list': {
        const wsId = params[0] || 'local_windows_main';
        const apps = await operator.discoverApplications(wsId);
        console.log(`\n=== DISCOVERED APPLICATIONS (${apps.length}) ===\n`);
        console.table(
          apps.map((a) => ({
            ID: a.applicationId,
            Name: a.name,
            Display: a.displayName,
            Category: a.category,
            State: a.readinessState,
          }))
        );
        break;
      }
      case 'find': {
        const name = params[0];
        if (!name) return;
        const apps = await operator.discoverApplications('local_windows_main');
        const match = apps.find((a) => a.name.toLowerCase().includes(name.toLowerCase()));
        if (match) {
          console.log(`Found application: ${match.displayName} (${match.executablePath})`);
        } else {
          console.log(`Application "${name}" not found.`);
        }
        break;
      }
      case 'launch': {
        const name = params[0];
        if (!name) return;
        const session = await operator.launchApplication('local_windows_main', name);
        console.log(`Application launched successfully: Session ${session.sessionId}, PID: ${session.processId}`);
        break;
      }
      case 'inspect': {
        const id = params[0];
        if (!id) return;
        const app = repo.getApplication(id);
        console.log(JSON.stringify(app, null, 2));
        break;
      }
      case 'close': {
        const id = params[0];
        if (!id) return;
        const closed = await operator.closeApplication('local_windows_main', id);
        console.log(`Closed application ${id}: ${closed ? 'SUCCESS' : 'FAILED'}`);
        break;
      }
      default:
        console.log(`Unknown app command '${command}'. Available: list, find, launch, inspect, close`);
    }
  } finally {
    dbManager.close();
  }
}

async function handleOperator(command?: string, params: string[] = [], customDbManager?: DatabaseManager): Promise<void> {
  const dbManager = customDbManager || new DatabaseManager(process.env.HRSIKESA_DB_PATH || 'data/hrisekesa.db');
  new MigrationManager(dbManager).runPending();
  const repo = new WorkspaceRepository(dbManager.open());
  const operator = new ApplicationOperator(repo, console as any);

  try {
    switch (command) {
      case 'observe': {
        const wsId = params[0] || 'local_windows_main';
        const obs = await operator.observe(wsId);
        console.log(JSON.stringify(obs, null, 2));
        break;
      }
      case 'screenshot': {
        const wsId = params[0] || 'local_windows_main';
        const shot = await operator.captureScreenshot(wsId);
        console.log(`Screenshot captured: ${shot}`);
        break;
      }
      case 'action': {
        const actionType = (params[0] || 'CLICK').toUpperCase();
        const payloadJson = params[1] ? JSON.parse(params[1]) : {};
        const result = await operator.performAction({
          actionId: `act_cli_${Date.now()}`,
          workspaceId: payloadJson.workspaceId || 'local_windows_main',
          actionType: actionType as any,
          riskLevel: payloadJson.riskLevel || 'TIER_1_READ',
          target: payloadJson.target,
          parameters: payloadJson.parameters || {},
          confidence: 'HIGH',
        });
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case 'verify': {
        const actionId = params[0];
        const action = repo.getAction(actionId);
        console.log(JSON.stringify(action, null, 2));
        break;
      }
      case 'status': {
        const workspaces = operator.listWorkspaces();
        console.log(`Operator status: ACTIVE. ${workspaces.length} workspaces registered.`);
        break;
      }
      default:
        console.log(`Unknown operator command '${command}'. Available: observe, screenshot, action, verify, status`);
    }
  } finally {
    dbManager.close();
  }
}

async function handleMission(command?: string, params: string[] = [], customDbManager?: DatabaseManager): Promise<void> {
  const dbManager = customDbManager || new DatabaseManager(process.env.HRSIKESA_DB_PATH || 'data/hrisekesa.db');
  new MigrationManager(dbManager).runPending();
  const runtime = new UniversalAgenticMissionRuntime(undefined, dbManager.getPath());

  try {
    switch (command) {
      case 'list': {
        const missions = runtime.listMissions();
        console.log(`\n=== HṚṢĪKEŚA ACTIVE & QUEUED MISSIONS (${missions.length}) ===\n`);
        console.table(
          missions.map(m => ({
            id: m.missionId,
            title: m.title,
            status: m.status,
            health: m.health,
            priority: m.priority,
            progress: `${m.progress}%`,
            createdAt: m.createdAt
          }))
        );
        break;
      }
      case 'run':
      case 'create': {
        const objective = params.join(' ');
        if (!objective) {
          console.log('Error: objective is required. Usage: hres mission run "<objective>"');
          return;
        }
        console.log(`\nCompiling and orchestrating mission for objective: "${objective}"...`);
        const result = await runtime.submitObjective(objective, { owner: 'Rushikesh', autoStart: true });
        console.log(`\nMission Created & Started: [${result.mission.missionId}] ${result.mission.title}`);
        console.log(`Status: ${result.mission.status} | Progress: ${result.mission.progress}%`);
        console.log(`Outcomes (${result.outcomes.length}):`);
        for (const o of result.outcomes) {
          console.log(`  - [${o.status}] ${o.description}`);
        }
        console.log(`Tasks (${result.tasks.length}):`);
        for (const t of result.tasks) {
          console.log(`  - [${t.status}] (${t.assignedAgent || 'Unassigned'}) ${t.title}`);
        }
        break;
      }
      case 'inspect':
      case 'status': {
        const id = params[0];
        if (!id) {
          console.log('Error: mission id required. Usage: hres mission inspect <id>');
          return;
        }
        const mission = runtime.getMission(id);
        if (!mission) {
          console.log(`Mission not found: ${id}`);
          return;
        }
        console.log(`\n=== MISSION: ${mission.title} (${mission.missionId}) ===`);
        console.log(`Status: ${mission.status} | Health: ${mission.health} | Progress: ${mission.progress}%`);
        console.log(`Objective: ${mission.objective}`);
        console.log(`Started: ${mission.startedAt || 'N/A'} | Completed: ${mission.completedAt || 'N/A'}`);
        break;
      }
      case 'start': {
        const id = params[0];
        const mission = await runtime.startMission(id);
        console.log(`Mission [${id}] status: ${mission.status}`);
        break;
      }
      case 'pause': {
        const id = params[0];
        const mission = runtime.pauseMission(id, params.slice(1).join(' ') || 'Paused via CLI');
        console.log(`Mission [${id}] paused: ${mission.status}`);
        break;
      }
      case 'resume': {
        const id = params[0];
        const mission = await runtime.resumeMission(id);
        console.log(`Mission [${id}] resumed: ${mission.status}`);
        break;
      }
      case 'cancel': {
        const id = params[0];
        const mission = runtime.cancelMission(id, params.slice(1).join(' ') || 'Cancelled via CLI');
        console.log(`Mission [${id}] cancelled: ${mission.status}`);
        break;
      }
      case 'replan': {
        const id = params[0];
        const reason = params.slice(1).join(' ') || 'Replanned via CLI';
        const result = runtime.replanMission(id, reason, 'Rushikesh');
        console.log(`Mission [${id}] replanned (Version ${result.newVersion.version})`);
        break;
      }
      case 'approve': {
        const [missionId, taskId] = params;
        if (!missionId || !taskId) {
          console.log('Usage: hres mission approve <missionId> <taskId>');
          return;
        }
        await runtime.approveTask(missionId, taskId, 'Rushikesh');
        console.log(`Task [${taskId}] approved for mission [${missionId}]. Execution resumed.`);
        break;
      }
      case 'outcomes': {
        const id = params[0];
        const outcomes = runtime.getOutcomes(id);
        console.log(`\n=== MISSION OUTCOMES (${outcomes.length}) ===\n`);
        console.table(
          outcomes.map(o => ({
            id: o.outcomeId,
            description: o.description,
            status: o.status,
            verificationState: o.verificationState,
            confidence: o.confidence,
            weight: o.weight
          }))
        );
        break;
      }
      case 'tasks': {
        const id = params[0];
        const tasks = runtime.getTasks(id);
        console.log(`\n=== MISSION TASKS (${tasks.length}) ===\n`);
        console.table(
          tasks.map(t => ({
            id: t.taskId,
            title: t.title,
            agent: t.assignedAgent,
            status: t.status,
            kind: t.executionKind,
            retries: t.retryCount
          }))
        );
        break;
      }
      case 'artifacts': {
        const id = params[0];
        const artifacts = runtime.getArtifacts(id);
        console.log(`\n=== MISSION ARTIFACTS (${artifacts.length}) ===\n`);
        console.table(
          artifacts.map(a => ({
            id: a.artifactId,
            name: a.name,
            type: a.type,
            location: a.location,
            agent: a.ownerAgent,
            state: a.verificationState
          }))
        );
        break;
      }
      case 'report': {
        const id = params[0];
        const report = runtime.getMissionReport(id);
        console.log(`\n=== MISSION REPORT: ${report.title} ===`);
        console.log(JSON.stringify(report, null, 2));
        break;
      }
      case 'workforce': {
        const capacities = runtime.getWorkforceCapacities();
        console.log(`\n=== 17-AGENT WORKFORCE CAPACITY & MATRIX (${capacities.length}) ===\n`);
        console.table(
          capacities.map(c => ({
            agent: c.name,
            status: c.status,
            activeTasks: c.activeTaskIds.length,
            queuedTasks: c.queuedTaskIds.length,
            specialization: c.primarySpecialization,
            workload: c.currentWorkloadScore
          }))
        );
        break;
      }
      default:
        console.log(`Unknown mission command '${command}'. Available: list, run, create, inspect, start, pause, resume, cancel, replan, approve, outcomes, tasks, artifacts, report, workforce`);
    }
  } finally {
    dbManager.close();
  }
}

async function handleEcosystem(command?: string, params: string[] = [], customDbManager?: DatabaseManager): Promise<void> {
  const dbManager = customDbManager || new DatabaseManager(process.env.HRSIKESA_DB_PATH || 'data/hrisekesa.db');
  new MigrationManager(dbManager).runPending();
  const fabric = new UniversalEcosystemFabric(dbManager.getRawDb(), undefined as any);
  await fabric.discoverAll();

  try {
    switch (command) {
      case 'list':
      case 'services': {
        const services = fabric.listServices();
        console.log(`\n=== Discovered Ecosystem Services (${services.length}) ===\n`);
        for (const s of services) {
          console.log(`- [${s.availability}] ${s.displayName} (${s.providerId}) [${s.category}] — ${s.capabilities.length} capabilities`);
        }
        break;
      }
      case 'applications':
      case 'apps': {
        const apps = fabric.listApplications();
        console.log(`\n=== Discovered Ecosystem Applications (${apps.length}) ===\n`);
        for (const a of apps) {
          console.log(`- [${a.readinessState}] ${a.displayName} (${a.category}) — ${a.executablePath}`);
        }
        break;
      }
      case 'capabilities': {
        const services = fabric.listServices();
        const capabilities = Array.from(new Set(services.flatMap(s => s.capabilities)));
        console.log(`\n=== Ecosystem Capabilities (${capabilities.length}) ===\n`);
        for (const c of capabilities) {
          console.log(`- ${c}`);
        }
        break;
      }
      case 'search': {
        const query = params.join(' ');
        if (!query) {
          console.log('Usage: hres ecosystem search <query>');
          return;
        }
        const services = fabric.listServices();
        const matches = services.flatMap(s =>
          s.capabilities
            .filter(c => c.toLowerCase().includes(query.toLowerCase()))
            .map(cap => ({ cap, svc: s.displayName }))
        );
        console.log(`\n=== Search Results for "${query}" (${matches.length}) ===\n`);
        for (const m of matches) {
          console.log(`- ${m.cap} (provided by ${m.svc})`);
        }
        break;
      }
      case 'health': {
        const health = fabric.getHealth();
        console.log(`\n=== Ecosystem Health Telemetry ===\n`);
        console.log(`Status: ${health.status}`);
        console.log(`Total Services: ${health.totalServices}`);
        console.log(`Available Services: ${health.availableServices}`);
        console.log(`Total Applications: ${health.totalApplications}`);
        console.log(`Connected Accounts: ${health.connectedAccounts}`);
        break;
      }
      case 'refresh':
      case 'discover': {
        const result = await fabric.discoverAll();
        console.log(`Discovered ${result.services.length} services and ${result.applications.length} applications.`);
        break;
      }
      default:
        console.log(`Unknown ecosystem command '${command}'. Available: list, services, applications, capabilities, search, health, refresh`);
    }
  } finally {
    dbManager.close();
  }
}

function printHelp(): void {
  console.log(`
HṚṢĪKEŚA CLI (hres)

Universal Application & Service Ecosystem:
  hres ecosystem list                   List all discovered ecosystem services
  hres ecosystem services               List all registered services with health & availability
  hres ecosystem applications           List all discovered desktop/web applications
  hres ecosystem capabilities           List all normalized ecosystem capabilities
  hres ecosystem search <query>         Search ecosystem capabilities by keyword
  hres ecosystem health                 Inspect aggregate ecosystem health telemetry
  hres ecosystem refresh                Trigger dynamic ecosystem discovery across accounts, apps, CLI

Capabilities:
  hres capabilities list                List all registered capabilities
  hres capabilities search <query>      Search capabilities by name, description, or tag
  hres capabilities inspect <id>        Show full metadata and schemas for a capability
  hres capabilities health <id>         Check live health of a capability
  hres capabilities verify <id>         Run deterministic verification check
  hres capabilities revoke <id>         Security revocation of a capability
  hres capabilities invoke <id> [json]  Invoke a capability through the governed fabric

GitHub & Open-Source Intelligence:
  hres github search <query>            Discover open-source repositories matching capability need
  hres github inspect <owner>/<repo>    Inspect real-time repository metadata
  hres github analyze <owner>/<repo>    Run static architecture, security & compatibility analysis
  hres github license <owner>/<repo>    Inspect SPDX license & compatibility rating
  hres github dependencies <owner>/<repo> Inspect package manifests and lockfiles
  hres github security <owner>/<repo>   Inspect static security heuristics & risk findings
  hres github releases <owner>/<repo>   Inspect activity metrics & release cadence
  hres github acquire <owner>/<repo>    Perform safe sandboxed repository acquisition
  hres github build <owner>/<repo> [cmd] Execute isolated sandboxed build
  hres github test <owner>/<repo> [cmd]  Execute isolated sandboxed tests
  hres github provenance <owner>/<repo> Track immutable provenance, license & acquisition records

Universal IDE & Workspace:
  hres ide status                       Inspect workspace architecture, language, framework & entrypoints
  hres ide search <query>               Ripgrep-style search across workspace files
  hres ide run <cmd>                    Execute command within workspace terminal with safety governance
  hres ide git-status                   Inspect working-tree status, staged and untracked files
  hres ide verify [instruction]         Execute 10-stage autonomous verification loop with self-correction
  hres ide workspaces                   List all tracked IDE workspaces

Autonomous Software Engineering:
  hres engineering start <objective>    Execute end-to-end autonomous engineering loop
  hres engineering list                 List all engineering tasks and status
  hres engineering status <taskId>      Inspect task lifecycle phase, attempts, budget, changed files
  hres engineering plan <taskId>        Inspect plan, steps, acceptance criteria
  hres engineering pause <taskId>       Pause active engineering task
  hres engineering resume <taskId>      Resume paused engineering task
  hres engineering cancel <taskId>      Cancel running engineering task

Native Universal Workflow & Automation:
  hres workflow list                    List all workflows and status
  hres workflow create <name> [desc]    Create a new persistent workflow
  hres workflow inspect <id>            Inspect workflow graph topology, nodes & edges
  hres workflow validate <id>           Validate graph structure, reachability & cycles
  hres workflow activate <id>           Activate workflow for triggers and execution
  hres workflow pause <id>              Pause workflow
  hres workflow resume <id>             Resume workflow
  hres workflow disable <id>            Disable workflow
  hres workflow run <id> [inputsJson]   Execute workflow run
  hres workflow runs [id]               List workflow runs
  hres workflow logs <runId>            Inspect execution node timeline & output
  hres workflow templates               List 10 built-in production workflow templates

Universal Service & Account Integration Fabric:
  hres account list                     List all connected external service accounts
  hres account connect <provider>       Initiate OAuth connection for a provider (google, github, etc.)
  hres account inspect <id>             Inspect account configuration, scopes, identity
  hres account verify <id>              Verify live provider connectivity & authentication
  hres account refresh <id>             Refresh OAuth access token
  hres account revoke <id>              Revoke and disconnect account
  hres account capabilities <id>        List active capabilities for an account
  hres account health <id>              Inspect health and error logs for an account
  hres account usage <id>               Inspect API usage & quota statistics
  hres provider list                    List all supported external service providers
  hres provider inspect <id>            Inspect provider definition and supported scopes

Universal Digital Workspace & Application Operator:
  hres workspace list                   List all registered workspaces (local, browser, IDE, VDI)
  hres workspace inspect <id>           Inspect workspace status and capabilities
  hres workspace connect [id]           Connect to workspace session
  hres workspace disconnect <id>        Disconnect workspace session
  hres workspace observe <id>           Capture multi-layer workspace observation
  hres app list [workspaceId]           List installed/discovered applications
  hres app find <name>                  Locate application executable and provenance
  hres app launch <name>                Launch application and wait for readiness
  hres app inspect <id>                 Inspect application descriptor and capabilities
  hres app close <id>                   Close application session
  hres operator observe [workspaceId]   Capture observation envelope
  hres operator screenshot [wsId]       Capture operator screenshot
  hres operator action <type> [json]    Execute structured operator action with pre/post verification
  hres operator verify <actionId>       Inspect post-action verification result
  hres operator status                  Inspect operator health, active locks and traces

Universal Agentic Mission & Workforce Runtime:
  hres mission list                     List all active, queued and completed missions
  hres mission run "<objective>"        Natural language objective compilation & autonomous execution
  hres mission inspect <id>             Inspect mission metadata, status, health and progress
  hres mission start <id>               Start mission execution
  hres mission pause <id>               Pause running mission
  hres mission resume <id>              Resume paused mission
  hres mission cancel <id>              Cancel mission
  hres mission replan <id> <reason>     Dynamically replan mission with work preservation
  hres mission approve <id> <taskId>    Approve gated high-risk or financial task
  hres mission outcomes <id>            List outcome verification states and confidence
  hres mission tasks <id>               List decomposed tasks and agent assignments
  hres mission artifacts <id>           List generated artifacts and verification state
  hres mission report <id>              Generate comprehensive evidence-based mission report
  hres mission workforce                Inspect 17-agent capacity matrix and workload scores

Universal Digital Creation & Media Studio:
  hres create <type> "<objective>" [prompt] Create media artifact (image, video, audio, music, voice, 3d, doc, presentation, package)
  hres creation list                    List all creation jobs
  hres creation status <id>             Inspect creation job status, verification, and artifacts
  hres creation verify <id>             Run verification on generated artifacts
  hres creation cancel <id>             Cancel active creation job

Real-World Research & Decision Intelligence:
  hres research start "<objective>"     Start evidence-grounded research case
  hres research status <id>             Inspect research case lifecycle, subquestions, and findings
  hres research evidence <id>           List claims and verified evidence ledger
  hres research compare <id>            Show qualitative candidate comparison matrix
  hres research report <id>             Export 16-section Decision Brief markdown artifact
  hres research cancel <id>             Cancel active research case
  hres decision list                    List immutable decision records
  hres decision show <id>               Inspect decision record and rationale
  hres decision review <id> <caseId>    Review historical decision against new evidence

Persistent Distributed Execution & 24/7 Operations:
  hres workers list                     List all registered workers and health
  hres worker status <id>               Inspect worker hardware, runtime, and workload
  hres worker register <name> <type>    Register execution worker
  hres worker authorize <id>            Authorize registered worker
  hres worker drain <id>                Transition worker to draining state
  hres runtime list                     List execution runtimes and capacity
  hres runtime status <id>              Inspect runtime architecture and software
  hres execution list                   List persistent execution jobs
  hres execution status <id>            Inspect job status, lease, and checkpoint
  hres execution pause <id>             Pause in-flight execution job
  hres execution resume <id>            Resume paused execution job
  hres execution cancel <id>            Cancel execution job
  hres execution migrate <id> <worker>  Migrate job to another authorized worker
  hres execution trace <id>             View auditable timeline trace of job
  hres execution summary                View 24/7 operational summary and pool health
`);
}

async function handleCreation(command?: string, params: string[] = [], customDbManager?: DatabaseManager): Promise<void> {
  const dbManager = customDbManager || new DatabaseManager(process.env.HRSIKESA_DB_PATH || 'data/hrisekesa.db');
  new MigrationManager(dbManager).runPending();

  const repo = new CreationRepository(dbManager.getRawDb());
  const capService = new MediaCapabilityService();
  const verifier = new CreationVerifierService();
  const fabric = new CreationFabric({
    repository: repo,
    capabilityService: capService,
    verifierService: verifier,
  });

  const validTypes = ['image', 'video', 'audio', 'music', 'voice', '3d', 'document', 'presentation', 'package'];

  try {
    // If the command is a creation type (e.g., `hres create image "A cosmic logo"`)
    if (command && validTypes.includes(command.toLowerCase())) {
      const typeMap: Record<string, CreationJobType> = {
        image: 'IMAGE',
        video: 'VIDEO',
        audio: 'AUDIO',
        music: 'MUSIC',
        voice: 'VOICE',
        '3d': 'THREE_D',
        document: 'DOCUMENT',
        presentation: 'PRESENTATION',
        package: 'MEDIA_PACKAGE',
      };
      const creationType = typeMap[command.toLowerCase()] || 'IMAGE';
      const objective = params[0] || `Generate ${creationType} artifact`;
      const prompt = params.slice(1).join(' ') || objective;

      console.log(`\n=== CREATING ${creationType} ARTIFACT ===`);
      const job = fabric.createJob({
        type: creationType,
        objective,
        prompt,
      });

      console.log(`Job Created: ${job.id}`);
      console.log(`Status:      ${job.status}`);
      console.log(`Executing creation pipeline...`);

      const executed = await fabric.executeJob(job.id);
      console.log(`Status:      ${executed.status}`);
      console.log(`Progress:    ${executed.progressPercentage}%`);
      if (executed.outputArtifacts.length > 0) {
        console.log(`Artifacts:   ${executed.outputArtifacts.map(a => a.location).join(', ')}`);
        console.log(`Verified:    ${executed.verification?.verified ? 'YES' : 'NO'}`);
      }
      if (executed.errorMessage) {
        console.log(`Notice:      ${executed.errorMessage}`);
      }
      return;
    }

    switch (command) {
      case 'list': {
        const jobs = fabric.listJobs();
        console.log(`\n=== CREATION JOBS (${jobs.length}) ===\n`);
        console.table(
          jobs.map(j => ({
            id: j.id,
            type: j.type,
            status: j.status,
            progress: `${j.progressPercentage}%`,
            artifacts: j.outputArtifacts.length,
            provider: j.modelProvider || 'N/A',
            created: j.createdAt,
          }))
        );
        break;
      }
      case 'status':
      case 'inspect': {
        const id = params[0];
        if (!id) {
          console.log('Usage: hres creation status <jobId>');
          return;
        }
        const job = fabric.getJob(id);
        if (!job) {
          console.log(`Job '${id}' not found.`);
          return;
        }
        console.log(`\n=== CREATION JOB [${job.id}] ===`);
        console.log(`Type:       ${job.type}`);
        console.log(`Objective:  ${job.objective}`);
        console.log(`Status:     ${job.status}`);
        console.log(`Progress:   ${job.progressPercentage}%`);
        console.log(`Provider:   ${job.modelProvider || 'None'}`);
        console.log(`Artifacts:  ${job.outputArtifacts.length}`);
        if (job.outputArtifacts.length > 0) {
          job.outputArtifacts.forEach(a => console.log(`  - ${a.name} (${a.format}, ${a.sizeBytes}b, verified: ${a.verified})`));
        }
        if (job.verification) {
          console.log(`Verification: Score ${job.verification.score}, Verified: ${job.verification.verified}`);
        }
        break;
      }
      case 'cancel': {
        const id = params[0];
        if (!id) {
          console.log('Usage: hres creation cancel <jobId>');
          return;
        }
        const job = fabric.cancelJob(id);
        console.log(`Job '${job.id}' status: ${job.status}`);
        break;
      }
      case 'verify': {
        const id = params[0];
        if (!id) {
          console.log('Usage: hres creation verify <jobId>');
          return;
        }
        const job = fabric.getJob(id);
        if (!job || job.outputArtifacts.length === 0) {
          console.log(`Job '${id}' not found or has no artifacts.`);
          return;
        }
        const res = await verifier.verifyArtifact(job, job.outputArtifacts[0]);
        console.log(`\n=== VERIFICATION RESULT ===`);
        console.log(`Verified: ${res.verified}`);
        console.log(`Score:    ${res.score}`);
        console.log(`Details:  ${res.details}`);
        break;
      }
      default:
        console.log(`Unknown creation command '${command}'. Available: <type>, list, status, verify, cancel`);
    }
  } finally {
    if (!customDbManager) {
      dbManager.close();
    }
  }
}

async function handleResearch(command?: string, params: string[] = [], customDbManager?: DatabaseManager): Promise<void> {
  const dbManager = customDbManager || new DatabaseManager(process.env.HRSIKESA_DB_PATH || 'data/hrisekesa.db');
  new MigrationManager(dbManager).runPending();
  const fabric = new DecisionFabric({ dbManager });

  try {
    switch (command) {
      case 'start': {
        const question = params.join(' ');
        if (!question) {
          console.log('Usage: hres research start <question or objective>');
          return;
        }
        const rCase = fabric.createCase({
          owner: 'cli',
          question,
        });
        const completed = await fabric.startCase(rCase.id);
        console.log(`\n=== RESEARCH CASE COMPLETED ===`);
        console.log(`ID:         ${completed.id}`);
        console.log(`Status:     ${completed.status}`);
        console.log(`Question:   ${completed.question}`);
        console.log(`Candidates: ${completed.candidates.length}`);
        console.log(`Claims:     ${completed.claims.length}`);
        if (completed.decisionBrief) {
          console.log(`\nKey Findings:`);
          completed.decisionBrief.keyFindings.forEach((kf) => console.log(`- ${kf}`));
        }
        break;
      }
      case 'status': {
        const id = params[0];
        if (!id) {
          console.log('Usage: hres research status <caseId>');
          return;
        }
        const c = fabric.repository.getCaseById(id);
        if (!c) {
          console.log(`ResearchCase '${id}' not found.`);
          return;
        }
        console.log(`\n=== RESEARCH STATUS ===`);
        console.log(`ID:       ${c.id}`);
        console.log(`Status:   ${c.status}`);
        console.log(`Question: ${c.question}`);
        console.log(`Depth:    ${c.depth}`);
        break;
      }
      case 'evidence': {
        const id = params[0];
        if (!id) {
          console.log('Usage: hres research evidence <caseId>');
          return;
        }
        const c = fabric.repository.getCaseById(id);
        if (!c) {
          console.log(`ResearchCase '${id}' not found.`);
          return;
        }
        console.log(`\n=== EVIDENCE & CLAIMS (${c.claims.length}) ===`);
        c.claims.forEach((cl) => {
          console.log(`- [${cl.claimType} | ${cl.uncertainty}] ${cl.subject} ${cl.predicate} ${cl.object}`);
          console.log(`  Source: ${cl.sourceTitle} (${cl.sourceTier})`);
          console.log(`  Quote: "${cl.quote}"`);
        });
        break;
      }
      case 'compare': {
        const id = params[0];
        if (!id) {
          console.log('Usage: hres research compare <caseId>');
          return;
        }
        const comp = fabric.repository.getComparisonByCaseId(id);
        if (!comp) {
          console.log(`No comparison matrix found for case '${id}'.`);
          return;
        }
        console.log(`\n=== CANDIDATE COMPARISON ===`);
        console.log(`Tradeoff Summary:\n${comp.tradeoffSummary}`);
        if (comp.recommendedCandidateId) {
          console.log(`\nRecommended: ${comp.recommendedCandidateId}`);
          console.log(`Rationale:   ${comp.recommendationRationale}`);
        }
        break;
      }
      case 'report': {
        const id = params[0];
        if (!id) {
          console.log('Usage: hres research report <caseId>');
          return;
        }
        const md = fabric.exportDecisionBriefArtifact(id);
        console.log(md);
        break;
      }
      case 'cancel': {
        const id = params[0];
        if (!id) {
          console.log('Usage: hres research cancel <caseId>');
          return;
        }
        fabric.cancelCase(id);
        console.log(`Case '${id}' cancelled.`);
        break;
      }
      default:
        console.log(`Unknown research command '${command}'. Available: start, status, evidence, compare, report, cancel`);
    }
  } finally {
    if (!customDbManager) {
      dbManager.close();
    }
  }
}

async function handleDecision(command?: string, params: string[] = [], customDbManager?: DatabaseManager): Promise<void> {
  const dbManager = customDbManager || new DatabaseManager(process.env.HRSIKESA_DB_PATH || 'data/hrisekesa.db');
  new MigrationManager(dbManager).runPending();
  const fabric = new DecisionFabric({ dbManager });

  try {
    switch (command) {
      case 'list': {
        const records = fabric.repository.listDecisionRecords();
        console.log(`\n=== DECISION RECORDS (${records.length}) ===`);
        for (const r of records) {
          console.log(`- [${r.id}] ${r.objective} -> Selected: ${r.selectedOption.name} (${r.status})`);
        }
        break;
      }
      case 'show': {
        const id = params[0];
        if (!id) {
          console.log('Usage: hres decision show <decisionId>');
          return;
        }
        const rec = fabric.repository.getDecisionRecordById(id);
        if (!rec) {
          console.log(`DecisionRecord '${id}' not found.`);
          return;
        }
        console.log(`\n=== DECISION RECORD ===`);
        console.log(`ID:              ${rec.id}`);
        console.log(`Objective:       ${rec.objective}`);
        console.log(`Selected Option: ${rec.selectedOption.name}`);
        console.log(`Rationale:       ${rec.rationale}`);
        console.log(`Status:          ${rec.status}`);
        console.log(`Approver:        ${rec.approver}`);
        console.log(`Timestamp:       ${rec.timestamp}`);
        break;
      }
      case 'review': {
        const id = params[0];
        const newCaseId = params[1];
        if (!id || !newCaseId) {
          console.log('Usage: hres decision review <decisionId> <newCaseId>');
          return;
        }
        const rev = fabric.reviewDecision(id, newCaseId);
        console.log(`\n=== DECISION REVIEW RESULT ===`);
        console.log(`Review Warranted: ${rev.reviewWarranted}`);
        console.log(`Recommendation:   ${rev.recommendation}`);
        console.log(`Rationale:        ${rev.rationale}`);
        break;
      }
      default:
        console.log(`Unknown decision command '${command}'. Available: list, show, review`);
    }
  } finally {
    if (!customDbManager) {
      dbManager.close();
    }
  }
}

async function handleWorkers(command?: string, params: string[] = [], customDbManager?: any): Promise<void> {
  const passedFabric: ExecutionFabric | undefined = customDbManager?.executionFabric;
  const dbManager = passedFabric ? (passedFabric as any).repository?.dbManager : (customDbManager || new DatabaseManager(process.env.HRSIKESA_DB_PATH || 'data/hrisekesa.db'));
  if (!passedFabric) {
    new MigrationManager(dbManager).runPending();
  }
  const fabric = passedFabric || new ExecutionFabric(dbManager);
  if (!passedFabric) {
    await fabric.start();
  }

  try {
    switch (command) {
      case 'list': {
        const workers = fabric.workerRegistry.listWorkers();
        console.log(`\n=== REGISTERED EXECUTION WORKERS (${workers.length}) ===\n`);
        for (const w of workers) {
          console.log(`- [${w.status}] ${w.name} (${w.id}) — Trust: ${w.trustLevel} — Workload: ${w.currentWorkload}`);
        }
        break;
      }
      case 'status': {
        const id = params[0];
        if (!id) {
          console.log('Usage: hres worker status <workerId>');
          return;
        }
        const w = fabric.workerRegistry.getWorker(id);
        if (!w) {
          console.log(`Worker '${id}' not found.`);
          return;
        }
        console.log(`\n=== WORKER DETAILS: ${w.name} ===`);
        console.log(`ID:           ${w.id}`);
        console.log(`Status:       ${w.status}`);
        console.log(`Host:         ${w.host}`);
        console.log(`Trust Level:  ${w.trustLevel}`);
        console.log(`Cores:        ${w.resources.cpuCores}`);
        console.log(`RAM (MB):     ${w.resources.memoryTotalMb}`);
        console.log(`Active Jobs:  ${w.activeJobIds.length}`);
        console.log(`Drain State:  ${w.drainState}`);
        break;
      }
      case 'register': {
        const name = params[0] || 'Manual Worker';
        const type = (params[1] as any) || 'LOCAL';
        const res = fabric.workerRegistry.registerWorker({
          name,
          runtimeType: type,
          host: '127.0.0.1',
          architecture: 'x64',
          operatingSystem: 'windows',
          cpuCores: 4,
          memoryMb: 8192,
          capabilities: ['system.info', 'filesystem.read'],
        });
        console.log(`Worker registered: [${res.worker.id}] (${res.worker.name}) on runtime [${res.runtime.id}]`);
        break;
      }
      case 'authorize': {
        const id = params[0];
        if (!id) {
          console.log('Usage: hres worker authorize <workerId>');
          return;
        }
        const w = fabric.workerRegistry.authorizeWorker(id, 'AUTHORIZED');
        console.log(`Worker '${w.id}' trust level set to ${w.trustLevel}.`);
        break;
      }
      case 'drain': {
        const id = params[0];
        if (!id) {
          console.log('Usage: hres worker drain <workerId>');
          return;
        }
        const w = fabric.workerRegistry.drainWorker(id);
        console.log(`Worker '${w.id}' DRAIN TOGGLED to ${w.drainState} (status: ${w.status}).`);
        break;
      }
      default:
        console.log(`Unknown worker command '${command}'. Available: list, status, register, authorize, drain`);
    }
  } finally {
    if (!customDbManager && !passedFabric) {
      dbManager.close();
    }
  }
}

async function handleRuntimes(command?: string, params: string[] = [], customDbManager?: any): Promise<void> {
  const passedFabric: ExecutionFabric | undefined = customDbManager?.executionFabric;
  const dbManager = passedFabric ? (passedFabric as any).repository?.dbManager : (customDbManager || new DatabaseManager(process.env.HRSIKESA_DB_PATH || 'data/hrisekesa.db'));
  if (!passedFabric) {
    new MigrationManager(dbManager).runPending();
  }
  const fabric = passedFabric || new ExecutionFabric(dbManager);
  if (!passedFabric) {
    await fabric.start();
  }

  try {
    switch (command) {
      case 'list': {
        const runtimes = fabric.workerRegistry.listRuntimes();
        console.log(`\n=== EXECUTION RUNTIMES (${runtimes.length}) ===\n`);
        for (const r of runtimes) {
          console.log(`- [${r.availability}] ${r.name} (${r.id}) — Type: ${r.type} — Locality: ${r.networkLocality} — Cores: ${r.cpuCores}`);
        }
        break;
      }
      case 'status': {
        const id = params[0];
        if (!id) {
          console.log('Usage: hres runtime status <runtimeId>');
          return;
        }
        const r = fabric.workerRegistry.getRuntime(id);
        if (!r) {
          console.log(`Runtime '${id}' not found.`);
          return;
        }
        console.log(`\n=== RUNTIME DETAILS: ${r.name} ===`);
        console.log(`ID:           ${r.id}`);
        console.log(`Type:         ${r.type}`);
        console.log(`Locality:     ${r.networkLocality}`);
        console.log(`OS:           ${r.operatingSystem}`);
        console.log(`Arch:         ${r.architecture}`);
        console.log(`Memory:       ${r.memoryMb} MB`);
        console.log(`Health:       ${r.health}`);
        break;
      }
      default:
        console.log(`Unknown runtime command '${command}'. Available: list, status`);
    }
  } finally {
    if (!customDbManager && !passedFabric) {
      dbManager.close();
    }
  }
}

async function handleExecution(command?: string, params: string[] = [], customDbManager?: any): Promise<void> {
  const passedFabric: ExecutionFabric | undefined = customDbManager?.executionFabric;
  const dbManager = passedFabric ? (passedFabric as any).repository?.dbManager : (customDbManager || new DatabaseManager(process.env.HRSIKESA_DB_PATH || 'data/hrisekesa.db'));
  if (!passedFabric) {
    new MigrationManager(dbManager).runPending();
  }
  const fabric = passedFabric || new ExecutionFabric(dbManager);
  if (!passedFabric) {
    await fabric.start();
  }

  try {
    switch (command) {
      case 'list': {
        const jobs = fabric.repository.listJobs();
        console.log(`\n=== PERSISTENT EXECUTION JOBS (${jobs.length}) ===\n`);
        for (const j of jobs) {
          console.log(`- [${j.state}] ${j.id} — ${j.objective} (Worker: ${j.assignedWorkerId || 'none'}, Progress: ${Math.round((j.progress ?? 0) * 100)}%)`);
        }
        break;
      }
      case 'status': {
        const id = params[0];
        if (!id) {
          console.log('Usage: hres execution status <jobId>');
          return;
        }
        const j = fabric.repository.getJobById(id);
        if (!j) {
          console.log(`ExecutionJob '${id}' not found.`);
          return;
        }
        console.log(`\n=== JOB INSPECTOR: ${j.id} ===`);
        console.log(`ID:           ${j.id}`);
        console.log(`Objective:    ${j.objective}`);
        console.log(`State:        ${j.state}`);
        console.log(`Priority:     ${j.priority}`);
        console.log(`Worker:       ${j.assignedWorkerId || 'unassigned'}`);
        console.log(`Lease Token:  ${j.leaseToken || 'none'}`);
        console.log(`Fence Token:  ${j.fencingToken}`);
        console.log(`Progress:     ${Math.round((j.progress ?? 0) * 100)}%`);
        console.log(`Attempts:     ${j.attempt ?? 0}/${j.maxAttempts ?? 3}`);
        break;
      }
      case 'pause': {
        const id = params[0];
        if (!id) { console.log('Usage: hres execution pause <jobId>'); return; }
        const j = fabric.pauseJob(id);
        console.log(`Job '${j.id}' paused (state: ${j.state}).`);
        break;
      }
      case 'resume': {
        const id = params[0];
        if (!id) { console.log('Usage: hres execution resume <jobId>'); return; }
        const j = fabric.resumeJob(id);
        console.log(`Job '${j.id}' RESUMED (state: ${j.state}).`);
        break;
      }
      case 'cancel': {
        const id = params[0];
        if (!id) { console.log('Usage: hres execution cancel <jobId>'); return; }
        const j = fabric.cancelJob(id, 'Cancelled via CLI');
        console.log(`Job '${j.id}' cancelled (state: ${j.state}).`);
        break;
      }
      case 'migrate': {
        const id = params[0];
        const targetWorkerId = params[1];
        if (!id || !targetWorkerId) {
          console.log('Usage: hres execution migrate <jobId> <targetWorkerId>');
          return;
        }
        const j = fabric.migrateJob(id, targetWorkerId);
        console.log(`Job '${j.id}' migrated to worker '${targetWorkerId}' (fenceToken: ${j.fencingToken}).`);
        break;
      }
      case 'trace': {
        const id = params[0];
        if (!id) { console.log('Usage: hres execution trace <jobId>'); return; }
        const traces = fabric.repository.listTracesForJob(id);
        console.log(`\n=== EXECUTION TRACES (${traces.length}) ===\n`);
        for (const t of traces) {
          console.log(`- [${t.timestamp}] ${t.eventType}: ${t.fromState || 'START'} -> ${t.toState || 'END'} (Worker: ${t.workerId || 'none'}, Token: ${t.fencingToken ?? '-'})`);
        }
        break;
      }
      case 'summary': {
        const sum = fabric.getOperationsSummary();
        console.log(`\n=== 24/7 PERSISTENT OPERATIONS SUMMARY ===\n`);
        console.log(`Active Workers:    ${sum.activeWorkersCount} (${sum.onlineWorkersCount} Online)`);
        console.log(`Active Jobs:       ${sum.activeJobsCount} Running, ${sum.queuedJobsCount} Queued, ${sum.recoveringJobsCount} Recovering`);
        console.log(`Failed Jobs:       ${sum.failedJobsCount}`);
        console.log(`Completed Jobs:    ${sum.completedJobsCount}`);
        console.log(`Local Load:        ${Math.round(sum.localLoad * 100)}%`);
        console.log(`LAN Load:          ${sum.pools.lan.busy}/${sum.pools.lan.total} busy`);
        console.log(`Remote Load:       ${Math.round(sum.remoteLoad * 100)}%`);
        console.log(`Cloud Load:        ${Math.round(sum.cloudLoad * 100)}%`);
        console.log(`24/7 Capable:      ${sum.hasPersistentWorker24x7 ? 'YES (Persistent worker online)' : 'NO (Local-only mode)'}`);
        console.log(`Total Est. Cost:   $${sum.estimatedCostTotalUsd}`);
        break;
      }
      default:
        console.log(`Unknown execution command '${command}'. Available: list, status, pause, resume, cancel, migrate, trace, summary`);
    }
  } finally {
    if (!customDbManager && !passedFabric) {
      dbManager.close();
    }
  }
}


const isMain = process.argv[1] && (process.argv[1].endsWith('hres.ts') || process.argv[1].endsWith('hres.js'));
if (isMain) {
  runHresCli().catch((err) => {
    console.error('Fatal CLI Error:', err);
    process.exit(1);
  });
}

