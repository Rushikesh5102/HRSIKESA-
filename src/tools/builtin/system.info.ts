/**
 * HṚṢĪKEŚA (हृषीकेश) — Built-in Tool: system.info
 */

import os from 'node:os';
import { ITool } from '../interfaces/tool.types.js';
import { DangerTier } from '../interfaces/danger.types.js';
import { ToolExecutionContext, ToolExecutionResult } from '../interfaces/execution.types.js';

export interface SystemInfoOutput {
  readonly os: string;
  readonly platform: string;
  readonly release: string;
  readonly cpu: {
    readonly model: string;
    readonly cores: number;
    readonly speedMhz: number;
  };
  readonly memory: {
    readonly totalGb: number;
    readonly freeGb: number;
  };
  readonly architecture: string;
  readonly runtime: {
    readonly node: string;
    readonly pid: number;
    readonly uptimeSeconds: number;
  };
}

export class SystemInfoTool implements ITool<Record<string, unknown>, SystemInfoOutput> {
  public readonly id = 'system.info';
  public readonly name = 'System Information';
  public readonly description = 'Returns current host hardware and operating system metrics (OS, CPU, RAM, architecture, Node.js version).';
  public readonly version = '1.0.0';
  public readonly category = 'system';
  public readonly riskLevel = DangerTier.TIER_0;
  public readonly requiresApproval = false;
  public readonly capabilities = ['system.specs', 'hardware.info', 'runtime.status'];

  public readonly inputSchema = {
    type: 'object' as const,
    properties: {}
  };

  public async execute(
    _input: Record<string, unknown>,
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult<SystemInfoOutput>> {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    const output: SystemInfoOutput = {
      os: `${os.type()} ${os.release()}`,
      platform: os.platform(),
      release: os.release(),
      cpu: {
        model: cpus.length > 0 ? cpus[0].model.trim() : 'Unknown CPU',
        cores: cpus.length,
        speedMhz: cpus.length > 0 ? cpus[0].speed : 0
      },
      memory: {
        totalGb: Math.round((totalMem / (1024 ** 3)) * 10) / 10,
        freeGb: Math.round((freeMem / (1024 ** 3)) * 10) / 10
      },
      architecture: os.arch(),
      runtime: {
        node: process.version,
        pid: process.pid,
        uptimeSeconds: Math.round(process.uptime())
      }
    };

    return {
      success: true,
      output,
      durationMs: 0
    };
  }
}
