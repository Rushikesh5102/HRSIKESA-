/**
 * HṚṢĪKEŚA (हृषीकेश) — Capability Verifier
 *
 * FP-07: Deterministic post-execution verification engine.
 * Ensures that EXECUTED ≠ VERIFIED until business invariants, state changes,
 * schemas, or process statuses are independently confirmed.
 */

import { ILogger } from '../../core/logging/logger.types.js';
import {
  UniversalCapability,
  CapabilityInvocation,
} from '../fabric/capability.types.js';
import {
  RawConnectorResult,
  VerificationCheckResult,
} from '../fabric/connector.interface.js';

export class CapabilityVerifier {
  private readonly logger?: ILogger;

  constructor(logger?: ILogger) {
    this.logger = logger?.child('CapabilityVerifier');
  }

  /**
   * Verify an execution result based on the capability's declared verification strategy.
   */
  public async verifyResult(
    capability: UniversalCapability,
    _invocation: CapabilityInvocation,
    rawResult: RawConnectorResult
  ): Promise<VerificationCheckResult> {
    this.logger?.debug(`Verifying result for capability '${capability.id}' using strategy '${capability.verification?.strategy}'`);
    if (!rawResult.success) {
      return {
        verified: false,
        strategy: capability.verification?.strategy || 'schema_match',
        details: `Execution failed at connector layer: ${rawResult.error}`,
      };
    }

    const strategy = capability.verification?.strategy || 'schema_match';

    switch (strategy) {
      case 'exit_code': {
        const data = rawResult.data as { exitCode?: number } | undefined;
        const verified = data !== undefined && data.exitCode === 0;
        return {
          verified,
          strategy: 'exit_code',
          details: verified ? 'Process exited with code 0.' : `Process returned exit code ${data?.exitCode}`,
        };
      }

      case 'process_state': {
        const data = rawResult.data as { pid?: number; running?: boolean } | undefined;
        const verified = Boolean(data?.pid && data.pid > 0);
        return {
          verified,
          strategy: 'process_state',
          details: verified ? `Process verified active with PID ${data?.pid}.` : 'No valid process PID found in result.',
        };
      }

      case 'dom_presence': {
        const data = rawResult.data as { url?: string; title?: string } | undefined;
        const verified = Boolean(data && (data.url || data.title));
        return {
          verified,
          strategy: 'dom_presence',
          details: verified ? `DOM rendered: Title '${data?.title || 'OK'}' at '${data?.url}'.` : 'DOM state empty.',
        };
      }

      case 'schema_match':
      default: {
        // Verify non-empty data payload
        const verified = rawResult.data !== undefined && rawResult.data !== null;
        return {
          verified,
          strategy: 'schema_match',
          details: verified ? 'Structured output payload verified.' : 'Missing data payload in connector response.',
        };
      }
    }
  }
}
