/**
 * HṚṢĪKEŚA (हृषीकेश) — Windows Computer & UI Automation Capability Adapter
 *
 * Phase 16J: Windows OS & GUI Automation Capability
 */

import { ICapabilityAdapter } from './capability.adapter.js';
import {
  CapabilityMetadata,
  CapabilityHealthCheckResult,
  CapabilityExecutionRequest,
  CapabilityExecutionResult,
} from '../interfaces/capability.types.js';
import { IComputerAdapter } from '../../tools/computer/interfaces/computer.types.js';
import { IUiaAdapter } from '../../tools/computer/uia/interfaces/uia.types.js';

export class WindowsComputerCapabilityAdapter implements ICapabilityAdapter {
  private readonly computer: IComputerAdapter;
  private readonly uia?: IUiaAdapter;

  constructor(computer: IComputerAdapter, uia?: IUiaAdapter) {
    this.computer = computer;
    this.uia = uia;
  }

  public getMetadata(): CapabilityMetadata {
    return {
      id: 'windows.computer',
      name: 'Windows Desktop & UI Automation',
      description: 'Windows desktop control, window management, screenshot capture, and accessibility tree automation.',
      category: 'computer',
      provider: 'Microsoft Windows UIA & Native Subsystems',
      source: 'native',
      version: '1.0.0',
      license: 'Proprietary / OS API',
      runtimeType: 'native',
      supportedPlatforms: ['win32'],
      requiredPermissions: ['computer:interact', 'computer:screenshot', 'uia:inspect'],
      riskLevel: 'HIGH',
      dependencies: ['node:child_process', 'powershell.exe'],
      enabled: true,
      securityStatus: 'VERIFIED',
    };
  }

  public async checkHealth(): Promise<CapabilityHealthCheckResult> {
    const start = Date.now();
    try {
      const isWin = process.platform === 'win32';
      return {
        status: isWin ? 'HEALTHY' : 'UNAVAILABLE',
        message: isWin ? 'Windows UI Automation provider ready.' : 'Requires Windows OS platform.',
        latencyMs: Date.now() - start,
        lastCheckedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        status: 'UNAVAILABLE',
        message: `Computer check error: ${err.message}`,
        latencyMs: Date.now() - start,
        lastCheckedAt: new Date().toISOString(),
      };
    }
  }

  public async execute(req: CapabilityExecutionRequest): Promise<CapabilityExecutionResult> {
    const start = Date.now();
    try {
      let output: unknown;
      switch (req.action) {
        case 'screenshot':
          output = await this.computer.screenshot();
          break;
        case 'inspect_active_window':
          output = this.uia ? await this.uia.observeActiveWindow() : await this.computer.getActiveWindow();
          break;
        default:
          throw new Error(`Unsupported computer action: ${req.action}`);
      }

      return {
        success: true,
        output,
        executionTimeMs: Date.now() - start,
        capabilityId: 'windows.computer',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        executionTimeMs: Date.now() - start,
        capabilityId: 'windows.computer',
      };
    }
  }
}
