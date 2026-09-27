/**
 * HṚṢĪKEŚA (हृषीकेश) — Built-in Tool: time.now
 */

import { ITool } from '../interfaces/tool.types.js';
import { DangerTier } from '../interfaces/danger.types.js';
import { ToolExecutionContext, ToolExecutionResult } from '../interfaces/execution.types.js';

export interface TimeNowOutput {
  readonly iso: string;
  readonly local: string;
  readonly unixMs: number;
  readonly timezone: string;
  readonly utcOffsetMinutes: number;
}

export class TimeNowTool implements ITool<Record<string, unknown>, TimeNowOutput> {
  public readonly id = 'time.now';
  public readonly name = 'Current System Time';
  public readonly description = 'Returns the current system timestamp, local formatted time, timezone, and unix milliseconds.';
  public readonly version = '1.0.0';
  public readonly category = 'system';
  public readonly riskLevel = DangerTier.TIER_0;
  public readonly requiresApproval = false;
  public readonly capabilities = ['system.time', 'datetime.lookup'];

  public readonly inputSchema = {
    type: 'object' as const,
    properties: {}
  };

  public async execute(
    _input: Record<string, unknown>,
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult<TimeNowOutput>> {
    const now = new Date();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    return {
      success: true,
      output: {
        iso: now.toISOString(),
        local: now.toString(),
        unixMs: now.getTime(),
        timezone,
        utcOffsetMinutes: -now.getTimezoneOffset()
      },
      durationMs: 0
    };
  }
}
