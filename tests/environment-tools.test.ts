/**
 * HṚṢĪKEŚA (हृषीकेश) — Environment Tools & Bus Execution Unit Tests
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { EventBus } from '../src/core/events/event-bus.js';
import { Logger } from '../src/core/logging/logger.js';
import { DatabaseManager } from '../src/persistence/database/database.manager.js';
import { MigrationManager } from '../src/persistence/migrations/migration.manager.js';
import { ToolRegistry } from '../src/tools/registry/tool.registry.js';
import { PermissionManager } from '../src/tools/permissions/permission.manager.js';
import { ToolAuditManager } from '../src/tools/audit/tool.audit.js';
import { ToolExecutionBus } from '../src/tools/execution/tool.bus.js';
import { EnvironmentManager } from '../src/environment/environment.manager.js';
import { createEnvironmentTools } from '../src/tools/builtin/environment/environment.tools.js';
import { DangerTier } from '../src/tools/interfaces/danger.types.js';

describe('Environment Tools & Execution Bus Subsystem', () => {
  let db: DatabaseManager;
  let eventBus: EventBus;
  let logger: Logger;
  let toolRegistry: ToolRegistry;
  let permissionManager: PermissionManager;
  let toolAudit: ToolAuditManager;
  let toolBus: ToolExecutionBus;
  let envManager: EnvironmentManager;

  const testDbPath = 'data/test_env_tools.db';

  before(async () => {
    eventBus = new EventBus();
    logger = new Logger('TestEnvTools', 'error');
    db = new DatabaseManager(testDbPath, logger);
    db.open();

    const migrations = new MigrationManager(db, logger);
    migrations.runPending();

    toolRegistry = new ToolRegistry(eventBus, logger);
    permissionManager = new PermissionManager(
      { allowedWorkspaceRoots: [process.cwd()] },
      eventBus,
      logger
    );
    toolAudit = new ToolAuditManager(db, eventBus, logger);
    toolBus = new ToolExecutionBus(toolRegistry, permissionManager, toolAudit, eventBus, logger);

    envManager = new EnvironmentManager();
    const envTools = createEnvironmentTools(envManager);
    for (const tool of envTools) {
      toolRegistry.register(tool);
    }
  });

  after(async () => {
    db.close();
  });

  test('All 10 environment tools should be registered with appropriate danger tiers', () => {
    const listTool = toolRegistry.get('environment.applications.list');
    assert.ok(listTool);
    assert.equal(listTool.riskLevel, DangerTier.TIER_0);

    const findTool = toolRegistry.get('environment.application.find');
    assert.ok(findTool);
    assert.equal(findTool.riskLevel, DangerTier.TIER_0);

    const statusTool = toolRegistry.get('environment.application.status');
    assert.ok(statusTool);
    assert.equal(statusTool.riskLevel, DangerTier.TIER_0);

    const launchTool = toolRegistry.get('environment.application.launch');
    assert.ok(launchTool);
    assert.equal(launchTool.riskLevel, DangerTier.TIER_1);

    const procListTool = toolRegistry.get('environment.process.list');
    assert.ok(procListTool);
    assert.equal(procListTool.riskLevel, DangerTier.TIER_0);

    const procInspectTool = toolRegistry.get('environment.process.inspect');
    assert.ok(procInspectTool);
    assert.equal(procInspectTool.riskLevel, DangerTier.TIER_0);

    const procTermTool = toolRegistry.get('environment.process.terminate');
    assert.ok(procTermTool);
    assert.equal(procTermTool.riskLevel, DangerTier.TIER_2);

    const pkgSearchTool = toolRegistry.get('environment.package.search');
    assert.ok(pkgSearchTool);
    assert.equal(pkgSearchTool.riskLevel, DangerTier.TIER_0);

    const pkgInspectTool = toolRegistry.get('environment.package.inspect');
    assert.ok(pkgInspectTool);
    assert.equal(pkgInspectTool.riskLevel, DangerTier.TIER_0);

    const pkgInstallTool = toolRegistry.get('environment.package.install');
    assert.ok(pkgInstallTool);
    assert.equal(pkgInstallTool.riskLevel, DangerTier.TIER_2);
    assert.equal(pkgInstallTool.requiresApproval, true);
  });

  test('ToolBus should execute environment.applications.list and record audit', async () => {
    const res = await toolBus.execute(
      'environment.applications.list',
      {},
      {
        requestId: 'req_env_list_1',
        sessionId: 'sess_test',
        userId: 'rushikesh',
        environment: 'local',
        workspaceRoot: process.cwd(),
        allowedTools: ['*']
      }
    );

    assert.equal(res.success, true);
    const output = res.output as { totalCount: number; applications: unknown[] };
    assert.ok(typeof output.totalCount === 'number');
    assert.ok(output.totalCount > 0);
  });

  test('ToolBus should execute environment.application.find for notepad', async () => {
    const res = await toolBus.execute(
      'environment.application.find',
      { query: 'notepad' },
      {
        requestId: 'req_env_find_1',
        sessionId: 'sess_test',
        userId: 'rushikesh',
        environment: 'local',
        workspaceRoot: process.cwd(),
        allowedTools: ['*']
      }
    );

    assert.equal(res.success, true);
    const output = res.output as { found: boolean; application: { id: string; installed: boolean } };
    assert.equal(output.found, true);
    assert.equal(output.application.id, 'notepad');
    assert.equal(output.application.installed, true);
  });

  test('ToolBus should execute environment.process.list and return annotated processes', async () => {
    const res = await toolBus.execute(
      'environment.process.list',
      {},
      {
        requestId: 'req_env_procs_1',
        sessionId: 'sess_test',
        userId: 'rushikesh',
        environment: 'local',
        workspaceRoot: process.cwd(),
        allowedTools: ['*']
      }
    );

    assert.equal(res.success, true);
    const output = res.output as { totalCount: number; processes: unknown[] };
    assert.ok(output.totalCount > 0);
  });

  test('CRITICAL SECURITY: ToolBus must reject environment.package.install without explicit human approval', async () => {
    // When approval is not pre-granted, Tier 2 tools with requiresApproval: true return approval required error
    const res = await toolBus.execute(
      'environment.package.install',
      { packageId: 'BlenderFoundation.Blender' },
      {
        requestId: 'req_env_install_unapproved',
        sessionId: 'sess_test',
        userId: 'rushikesh',
        environment: 'local',
        workspaceRoot: process.cwd(),
        allowedTools: ['*']
      }
    );

    assert.equal(res.success, false);
    assert.ok(
      res.error?.includes('human authorization') ||
      res.error?.includes('Approval') ||
      res.error?.includes('approval')
    );
  });
});
