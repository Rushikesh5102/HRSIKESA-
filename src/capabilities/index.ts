/**
 * HṚṢĪKEŚA (हृषीकेश) — Capability System Exports
 */

export * from './interfaces/capability.types.js';
export * from './adapters/capability.adapter.js';
export * from './registry/capability.registry.js';
export * from './routing/agent.capability.router.js';

export * from './adapters/playwright.browser.capability.js';
export * from './adapters/windows.computer.capability.js';
export * from './adapters/faster.whisper.capability.js';
export * from './adapters/semantic.memory.capability.js';
export * from './adapters/filesystem.native.capability.js';
export * from './adapters/terminal.powershell.capability.js';
export * from './adapters/research.web.capability.js';

// FP-07: Universal Capability & Connector Fabric
export type {
  UniversalCapability,
  CapabilityProtocol,
  CapabilityLifecycleStatus,
  CapabilityTrustLevel,
  PrivacyClass,
  AuthenticationType,
  AuthenticationRequirement,
  CapabilityProvenance,
  CapabilityHealth,
  CapabilityVerificationRecord,
  CapabilityInvocation,
  CapabilityResult,
  CapabilityDependency,
  CapabilityCredentialReference,
  CapabilityEvaluation,
  EvaluationVerdict,
} from './fabric/capability.types.js';
export * from './fabric/universal.capability.fabric.js';
export * from './fabric/capability.repository.js';
export * from './fabric/connector.interface.js';
export * from './fabric/connector.registry.js';
export * from './auth/authentication.manager.js';
export * from './discovery/capability.discovery.js';
export * from './execution/capability.matcher.js';
export * from './execution/capability.verifier.js';
export * from './execution/capability.invocation.engine.js';
export * from './connectors/cli.connector.js';
export * from './connectors/browser.connector.js';
export * from './connectors/software.connector.js';
export * from './connectors/mcp.connector.js';
export * from './connectors/local_tool.connector.js';
export * from './connectors/rest_api.connector.js';
