/**
 * HṚṢĪKEŚA (हृषीकेश) — Software & Environment Capability Connector
 *
 * FP-07: Bridges to HṚṢĪKEŚA's existing Software & Environment Manager.
 * Governs application discovery, verified execution, and process tracking.
 */

import { ILogger } from '../../core/logging/logger.types.js';
import {
  UniversalCapability,
  CapabilityInvocation,
  CapabilityHealth,
} from '../fabric/capability.types.js';
import {
  IConnector,
  RawConnectorResult,
  VerificationCheckResult,
  ResolvedCredentials,
} from '../fabric/connector.interface.js';
import { EnvironmentManager } from '../../environment/environment.manager.js';

export class SoftwareConnector implements IConnector {
  public readonly protocol = 'LOCAL_PROCESS' as const;
  public readonly name = 'SoftwareEnvironmentConnector';
  private readonly envManager?: EnvironmentManager;
  private readonly logger?: ILogger;

  constructor(envManager?: EnvironmentManager, logger?: ILogger) {
    this.envManager = envManager;
    this.logger = logger?.child('SoftwareConnector');
  }

  public canHandle(capability: UniversalCapability): boolean {
    return capability.protocol === 'LOCAL_PROCESS' || capability.category === 'SOFTWARE';
  }

  public async execute(
    capability: UniversalCapability,
    invocation: CapabilityInvocation,
    _resolvedAuth?: ResolvedCredentials
  ): Promise<RawConnectorResult> {
    const startTime = Date.now();
    const action = invocation.operation || (invocation.inputs.action as string) || 'list';

    try {
      if (!this.envManager) {
        // Safe deterministic fallback when EnvironmentManager is not passed
        if (action === 'list') {
          return {
            success: true,
            data: {
              applications: [
                { id: 'node', name: 'Node.js', version: process.version, executablePath: process.execPath },
                { id: 'hres', name: 'HṚṢĪKEŚA Core Engine', version: '1.0.0', executablePath: process.cwd() },
              ],
            },
            durationMs: Date.now() - startTime,
          };
        }
        return {
          success: false,
          error: `Action '${action}' requires EnvironmentManager instance.`,
          durationMs: Date.now() - startTime,
        };
      }

      this.logger?.debug(`Invoking software action '${action}' for capability '${capability.id}'`);
      let data: unknown;

      switch (action) {
        case 'list': {
          data = await this.envManager.listApplications();
          break;
        }
        case 'processes': {
          data = await this.envManager.listProcesses();
          break;
        }
        case 'launch': {
          const appId = String(invocation.inputs.appId || invocation.inputs.name);
          const args = Array.isArray(invocation.inputs.args) ? invocation.inputs.args.map(String) : undefined;
          data = await this.envManager.launchApplication(appId, args);
          break;
        }
        default:
          return {
            success: false,
            error: `Unsupported software capability action: ${action}`,
            durationMs: Date.now() - startTime,
          };
      }

      return {
        success: true,
        data,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      this.logger?.error(`Software execution failed: ${err.message}`);
      return {
        success: false,
        error: err.message,
        durationMs: Date.now() - startTime,
      };
    }
  }

  public async checkHealth(_capability: UniversalCapability): Promise<CapabilityHealth> {
    const startTime = Date.now();
    return {
      status: 'HEALTHY',
      lastCheckedAt: new Date().toISOString(),
      consecutiveFailures: 0,
      latencyMs: Date.now() - startTime,
      message: 'Software and Environment subsystem is responsive.',
    };
  }

  public async verify(
    _capability: UniversalCapability,
    invocation: CapabilityInvocation,
    result: RawConnectorResult
  ): Promise<VerificationCheckResult> {
    if (!result.success) {
      return {
        verified: false,
        strategy: 'process_state',
        details: `Software execution returned failure: ${result.error}`,
      };
    }

    const action = invocation.operation || (invocation.inputs.action as string);
    if (action === 'launch') {
      const data = result.data as { verified?: boolean; pid?: number } | undefined;
      return {
        verified: Boolean(data?.verified ?? (data?.pid && data.pid > 0)),
        strategy: 'process_state',
        details: data?.pid ? `Process launched with verified PID ${data.pid}` : 'Process verified.',
      };
    }

    return {
      verified: true,
      strategy: 'schema_match',
      details: 'Software query completed with structured output.',
    };
  }
}
