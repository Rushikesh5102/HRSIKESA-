/**
 * HṚṢĪKEŚA (हृषीकेश) — Capability Adapter Base Interface
 *
 * Phase 16J: Adapter Pattern for Open-Source & Native Capabilities
 */

import {
  CapabilityMetadata,
  CapabilityHealthCheckResult,
  CapabilityExecutionRequest,
  CapabilityExecutionResult,
} from '../interfaces/capability.types.js';

export interface ICapabilityAdapter {
  getMetadata(): CapabilityMetadata;
  checkHealth(): Promise<CapabilityHealthCheckResult>;
  execute(req: CapabilityExecutionRequest): Promise<CapabilityExecutionResult>;
  shutdown?(): Promise<void>;
}
