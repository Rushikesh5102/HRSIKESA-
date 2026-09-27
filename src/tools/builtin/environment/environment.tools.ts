/**
 * HṚṢĪKEŚA (हृषीकेश) — Built-in Environment & Software Tools (Phase 10)
 *
 * Exposes controlled software discovery, verified application lifecycle,
 * process tracking, and package management to HṚṢĪKEŚA's Tool Execution Bus.
 */

import { ITool } from '../../interfaces/tool.types.js';
import { DangerTier } from '../../interfaces/danger.types.js';
import { ToolExecutionContext, ToolExecutionResult, JsonSchemaObject } from '../../interfaces/execution.types.js';
import { IEnvironmentManager } from '../../../environment/interfaces/environment.types.js';

// 1. environment.applications.list
export class EnvironmentApplicationsListTool implements ITool {
  public readonly id = 'environment.applications.list';
  public readonly name = 'List Installed Applications';
  public readonly description = 'Discover and list all verified installed applications on the Windows machine.';
  public readonly version = '1.0.0';
  public readonly category = 'environment';
  public readonly riskLevel = DangerTier.TIER_0;
  public readonly requiresApproval = false;
  public readonly capabilities = ['environment', 'environment:discover'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {}
  };

  constructor(private readonly manager: IEnvironmentManager) {}

  public async execute(
    _input: Record<string, unknown>,
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    try {
      const apps = await this.manager.listApplications();
      return {
        success: true,
        output: {
          totalCount: apps.length,
          applications: apps.map(a => ({
            id: a.id,
            name: a.name,
            publisher: a.publisher,
            version: a.version,
            source: a.source,
            installed: a.installed,
            running: a.running,
            processIds: a.processIds,
            capabilities: a.capabilities
          }))
        },
        durationMs: Date.now() - startTime
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime
      };
    }
  }
}

// 2. environment.application.find
export class EnvironmentApplicationFindTool implements ITool {
  public readonly id = 'environment.application.find';
  public readonly name = 'Find Application';
  public readonly description = 'Search for an installed application by name, ID, alias, or executable name.';
  public readonly version = '1.0.0';
  public readonly category = 'environment';
  public readonly riskLevel = DangerTier.TIER_0;
  public readonly requiresApproval = false;
  public readonly capabilities = ['environment', 'environment:discover'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Application name, ID, alias, or command (e.g., "Blender", "vscode", "git", "notepad")'
      }
    },
    required: ['query']
  };

  constructor(private readonly manager: IEnvironmentManager) {}

  public async execute(
    input: { query: string },
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    try {
      const app = await this.manager.findApplication(input.query);
      if (!app) {
        return {
          success: true,
          output: {
            found: false,
            query: input.query,
            message: `Application "${input.query}" was not found among installed software.`
          },
          durationMs: Date.now() - startTime
        };
      }

      return {
        success: true,
        output: {
          found: true,
          application: app
        },
        durationMs: Date.now() - startTime
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime
      };
    }
  }
}

// 3. environment.application.status
export class EnvironmentApplicationStatusTool implements ITool {
  public readonly id = 'environment.application.status';
  public readonly name = 'Get Application Status';
  public readonly description = 'Check whether an application is installed, running, and inspect its active PIDs.';
  public readonly version = '1.0.0';
  public readonly category = 'environment';
  public readonly riskLevel = DangerTier.TIER_0;
  public readonly requiresApproval = false;
  public readonly capabilities = ['environment', 'environment:inspect'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      appId: {
        type: 'string',
        description: 'Application ID or alias (e.g., "blender", "notepad", "git")'
      }
    },
    required: ['appId']
  };

  constructor(private readonly manager: IEnvironmentManager) {}

  public async execute(
    input: { appId: string },
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    try {
      const status = await this.manager.getApplicationStatus(input.appId);
      return {
        success: true,
        output: status,
        durationMs: Date.now() - startTime
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime
      };
    }
  }
}

// 4. environment.application.launch
export class EnvironmentApplicationLaunchTool implements ITool {
  public readonly id = 'environment.application.launch';
  public readonly name = 'Launch Application';
  public readonly description = 'Launch a verified application through the Environment Manager and await readiness.';
  public readonly version = '1.0.0';
  public readonly category = 'environment';
  public readonly riskLevel = DangerTier.TIER_1;
  public readonly requiresApproval = false;
  public readonly capabilities = ['environment', 'environment:launch'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      appName: {
        type: 'string',
        description: 'Application name or ID (e.g., "Blender", "Notepad", "VS Code", "Calculator")'
      },
      args: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional command-line arguments to pass to the application'
      }
    },
    required: ['appName']
  };

  constructor(private readonly manager: IEnvironmentManager) {}

  public async execute(
    input: { appName: string; args?: string[] },
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    try {
      const result = await this.manager.launchApplication(input.appName, input.args);
      return {
        success: result.success,
        output: result,
        error: result.error,
        durationMs: Date.now() - startTime
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime
      };
    }
  }
}

// 5. environment.process.list
export class EnvironmentProcessListTool implements ITool {
  public readonly id = 'environment.process.list';
  public readonly name = 'List Desktop Processes';
  public readonly description = 'List active processes with HṚṢĪKEŚA ownership annotations.';
  public readonly version = '1.0.0';
  public readonly category = 'environment';
  public readonly riskLevel = DangerTier.TIER_0;
  public readonly requiresApproval = false;
  public readonly capabilities = ['environment', 'environment:process'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {}
  };

  constructor(private readonly manager: IEnvironmentManager) {}

  public async execute(
    _input: Record<string, unknown>,
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    try {
      const list = await this.manager.listProcesses();
      return {
        success: true,
        output: {
          totalCount: list.length,
          hrisekesaSpawnedCount: list.filter(p => p.isHrisekesaSpawned).length,
          processes: list.slice(0, 100) // Compact limit for LLM context
        },
        durationMs: Date.now() - startTime
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime
      };
    }
  }
}

// 6. environment.process.inspect
export class EnvironmentProcessInspectTool implements ITool {
  public readonly id = 'environment.process.inspect';
  public readonly name = 'Inspect Process';
  public readonly description = 'Retrieve detailed metadata and ownership status for a specific process PID.';
  public readonly version = '1.0.0';
  public readonly category = 'environment';
  public readonly riskLevel = DangerTier.TIER_0;
  public readonly requiresApproval = false;
  public readonly capabilities = ['environment', 'environment:process'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      pid: {
        type: 'number',
        description: 'Process ID (PID) to inspect'
      }
    },
    required: ['pid']
  };

  constructor(private readonly manager: IEnvironmentManager) {}

  public async execute(
    input: { pid: number },
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    try {
      const proc = await this.manager.inspectProcess(input.pid);
      if (!proc) {
        return {
          success: true,
          output: { found: false, pid: input.pid },
          durationMs: Date.now() - startTime
        };
      }
      return {
        success: true,
        output: { found: true, process: proc },
        durationMs: Date.now() - startTime
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime
      };
    }
  }
}

// 7. environment.process.terminate
export class EnvironmentProcessTerminateTool implements ITool {
  public readonly id = 'environment.process.terminate';
  public readonly name = 'Terminate Process';
  public readonly description = 'Safely terminate a HṚṢĪKEŚA-spawned process or authorized PID. System components cannot be terminated.';
  public readonly version = '1.0.0';
  public readonly category = 'environment';
  public readonly riskLevel = DangerTier.TIER_2;
  public readonly requiresApproval = false;
  public readonly capabilities = ['environment', 'environment:process'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      pid: {
        type: 'number',
        description: 'Process ID (PID) to terminate'
      },
      force: {
        type: 'boolean',
        description: 'Whether to force termination (/F)'
      }
    },
    required: ['pid']
  };

  constructor(private readonly manager: IEnvironmentManager) {}

  public async execute(
    input: { pid: number; force?: boolean },
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    try {
      const res = await this.manager.terminateProcess(input.pid, input.force);
      return {
        success: res.success,
        output: { pid: input.pid, terminated: res.success },
        error: res.error,
        durationMs: Date.now() - startTime
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime
      };
    }
  }
}

// 8. environment.package.search
export class EnvironmentPackageSearchTool implements ITool {
  public readonly id = 'environment.package.search';
  public readonly name = 'Search Software Packages';
  public readonly description = 'Search the official Windows Package Manager (winget) for software packages.';
  public readonly version = '1.0.0';
  public readonly category = 'environment';
  public readonly riskLevel = DangerTier.TIER_0;
  public readonly requiresApproval = false;
  public readonly capabilities = ['environment', 'environment:packages'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Software name or keyword to search (e.g., "Blender", "Git", "VS Code")'
      }
    },
    required: ['query']
  };

  constructor(private readonly manager: IEnvironmentManager) {}

  public async execute(
    input: { query: string },
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    try {
      const res = await this.manager.searchPackages(input.query);
      return {
        success: true,
        output: res,
        durationMs: Date.now() - startTime
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime
      };
    }
  }
}

// 9. environment.package.inspect
export class EnvironmentPackageInspectTool implements ITool {
  public readonly id = 'environment.package.inspect';
  public readonly name = 'Inspect Software Package';
  public readonly description = 'Retrieve detailed metadata and source information for a winget package ID.';
  public readonly version = '1.0.0';
  public readonly category = 'environment';
  public readonly riskLevel = DangerTier.TIER_0;
  public readonly requiresApproval = false;
  public readonly capabilities = ['environment', 'environment:packages'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      packageId: {
        type: 'string',
        description: 'Exact winget Package ID (e.g., "BlenderFoundation.Blender", "Git.Git")'
      }
    },
    required: ['packageId']
  };

  constructor(private readonly manager: IEnvironmentManager) {}

  public async execute(
    input: { packageId: string },
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    try {
      const res = await this.manager.inspectPackage(input.packageId);
      return {
        success: true,
        output: res,
        durationMs: Date.now() - startTime
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime
      };
    }
  }
}

// 10. environment.package.install
export class EnvironmentPackageInstallTool implements ITool {
  public readonly id = 'environment.package.install';
  public readonly name = 'Install Software Package';
  public readonly description = 'Install an approved software package via Windows Package Manager (winget). Requires human confirmation.';
  public readonly version = '1.0.0';
  public readonly category = 'environment';
  public readonly riskLevel = DangerTier.TIER_2;
  public readonly requiresApproval = true;
  public readonly capabilities = ['environment', 'environment:install'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      packageId: {
        type: 'string',
        description: 'Exact winget Package ID to install (e.g., "BlenderFoundation.Blender", "Git.Git")'
      }
    },
    required: ['packageId']
  };

  constructor(private readonly manager: IEnvironmentManager) {}

  public async execute(
    input: { packageId: string },
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    try {
      const res = await this.manager.installPackage(input.packageId);
      return {
        success: res.success,
        output: res,
        error: res.error,
        durationMs: Date.now() - startTime
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime
      };
    }
  }
}

export function createEnvironmentTools(manager: IEnvironmentManager): ITool[] {
  return [
    new EnvironmentApplicationsListTool(manager),
    new EnvironmentApplicationFindTool(manager),
    new EnvironmentApplicationStatusTool(manager),
    new EnvironmentApplicationLaunchTool(manager),
    new EnvironmentProcessListTool(manager),
    new EnvironmentProcessInspectTool(manager),
    new EnvironmentProcessTerminateTool(manager),
    new EnvironmentPackageSearchTool(manager),
    new EnvironmentPackageInspectTool(manager),
    new EnvironmentPackageInstallTool(manager)
  ];
}
