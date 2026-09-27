/**
 * HṚṢĪKEŚA (हृषीकेश) — Connector Interface
 *
 * FP-07: Universal Connector Contract for bridging CLI, Software, Browser,
 * MCP, Local Tools, and REST APIs.
 */

import {
  UniversalCapability,
  CapabilityProtocol,
  CapabilityInvocation,
  CapabilityHealth,
} from './capability.types.js';

export interface RawConnectorResult {
  readonly success: boolean;
  readonly data?: unknown;
  readonly error?: string;
  readonly metadata?: Record<string, unknown>;
  readonly durationMs: number;
}

export interface VerificationCheckResult {
  readonly verified: boolean;
  readonly strategy: 'schema_match' | 'read_after_write' | 'process_state' | 'checksum' | 'dom_presence' | 'exit_code' | 'dry_run' | 'none';
  readonly details?: string;
}

export interface ResolvedCredentials {
  readonly authType: string;
  readonly credentialRef: string;
  readonly token?: string;
  readonly apiKey?: string;
  readonly username?: string;
  readonly password?: string;
  readonly headers?: Record<string, string>;
}

export interface IConnector {
  readonly protocol: CapabilityProtocol;
  readonly name: string;

  /**
   * Determine whether this connector can execute operations for the given capability.
   */
  canHandle(capability: UniversalCapability): boolean;

  /**
   * Execute an operation on the capability.
   */
  execute(
    capability: UniversalCapability,
    invocation: CapabilityInvocation,
    resolvedAuth?: ResolvedCredentials
  ): Promise<RawConnectorResult>;

  /**
   * Check health of the connector or underlying resource.
   */
  checkHealth(capability: UniversalCapability): Promise<CapabilityHealth>;

  /**
   * Deterministically verify whether the executed operation achieved its intended state.
   */
  verify(
    capability: UniversalCapability,
    invocation: CapabilityInvocation,
    result: RawConnectorResult
  ): Promise<VerificationCheckResult>;
}
