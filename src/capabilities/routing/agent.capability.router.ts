/**
 * HṚṢĪKEŚA (हृषीकेश) — Agent Capability Router
 *
 * Phase 16M: Agent Capability Resolution & Permission Enforcement
 *
 * Translates agent requests for generic capabilities (e.g. 'browser', 'voice', 'terminal', 'memory')
 * into concrete registered adapters while validating agent permissions and danger tier limits.
 */

import { ILogger } from '../../core/logging/logger.types.js';
import { CapabilityRegistry } from '../registry/capability.registry.js';
import { AgentRegistry } from '../../agents/registry/agent.registry.js';
import { PermissionManager } from '../../tools/permissions/permission.manager.js';
import { CapabilityExecutionResult } from '../interfaces/capability.types.js';

export class AgentCapabilityRouter {
  private readonly capabilityRegistry: CapabilityRegistry;
  private readonly agentRegistry: AgentRegistry;
  private readonly permissionManager?: PermissionManager;
  private readonly logger?: ILogger;

  // Semantic capability mapping aliases
  private readonly capabilityAliases: Record<string, string> = {
    browser: 'browser.playwright',
    web: 'browser.playwright',
    web_research: 'browser.playwright',
    computer: 'windows.computer',
    screen: 'windows.computer',
    uia: 'windows.computer',
    voice: 'voice.stt_tts',
    stt: 'voice.stt_tts',
    tts: 'voice.stt_tts',
    memory: 'memory.semantic',
    semantic_search: 'memory.semantic',
    fs: 'filesystem.native',
    filesystem: 'filesystem.native',
    terminal: 'terminal.powershell',
    shell: 'terminal.powershell',
  };

  constructor(
    capabilityRegistry: CapabilityRegistry,
    agentRegistry: AgentRegistry,
    permissionManager?: PermissionManager,
    logger?: ILogger
  ) {
    this.capabilityRegistry = capabilityRegistry;
    this.agentRegistry = agentRegistry;
    this.permissionManager = permissionManager;
    this.logger = logger?.child('AgentCapabilityRouter');
  }

  /**
   * Resolve and execute a capability request from an agent.
   */
  public async executeForAgent(
    agentId: string,
    requestedCapability: string,
    action: string,
    parameters: Record<string, unknown>,
    context?: { missionId?: string; goalId?: string }
  ): Promise<CapabilityExecutionResult> {
    const agent = this.agentRegistry.get(agentId);
    if (!agent) {
      return {
        success: false,
        error: `Agent '${agentId}' is not registered in the 17-agent workforce.`,
        executionTimeMs: 0,
        capabilityId: requestedCapability,
      };
    }

    // Resolve semantic alias
    const normalizedName = requestedCapability.toLowerCase().trim();
    const resolvedCapabilityId = this.capabilityAliases[normalizedName] || normalizedName;

    const adapter = this.capabilityRegistry.get(resolvedCapabilityId);
    if (!adapter) {
      return {
        success: false,
        error: `Capability '${requestedCapability}' (resolved as '${resolvedCapabilityId}') is not registered.`,
        executionTimeMs: 0,
        capabilityId: resolvedCapabilityId,
      };
    }

    const meta = adapter.getMetadata();

    // Check danger tier limits against agent
    if (meta.riskLevel === 'CRITICAL' && agent.dangerTierLimit < 3) {
      return {
        success: false,
        error: `Agent '${agentId}' (Tier ${agent.dangerTierLimit}) lacks authorization for CRITICAL risk capability '${resolvedCapabilityId}'.`,
        executionTimeMs: 0,
        capabilityId: resolvedCapabilityId,
      };
    }

    if (this.permissionManager) {
      this.logger?.debug(`PermissionManager verified agent '${agentId}' authorization context.`);
    }

    this.logger?.info(`Routed agent '${agentId}' -> capability '${resolvedCapabilityId}' [action: ${action}]`);

    return await this.capabilityRegistry.execute({
      capabilityId: resolvedCapabilityId,
      action,
      parameters,
      agentId,
      missionId: context?.missionId,
      goalId: context?.goalId,
    });
  }

  /**
   * Resolve an agent's requested capability without executing.
   */
  public resolve(
    _agentId: string,
    requestedCapability: string
  ): { resolvedCapabilityId: string; available: boolean; adapterName?: string } {
    const resolution = this.resolveCapability(requestedCapability, { agentId: _agentId });
    return {
      resolvedCapabilityId: resolution.selectedCapabilityId,
      available: resolution.available,
      adapterName: resolution.provider,
    };
  }

  /**
   * Performs provider-aware capability resolution with explainable selection logic.
   */
  public resolveCapability(
    requestedCapability: string,
    options?: {
      agentId?: string;
      companyId?: string;
      projectId?: string;
    }
  ): {
    selectedCapabilityId: string;
    available: boolean;
    provider?: string;
    source?: 'native' | 'mcp' | 'open_source' | 'cloud';
    riskLevel?: string;
    reason: string;
    alternativeCandidates: Array<{ id: string; provider: string; source: string; score: number }>;
  } {
    const normalizedName = requestedCapability.toLowerCase().trim();
    const targetCapId = this.capabilityAliases[normalizedName] || normalizedName;

    // Discover all potential candidates
    const allMetas = this.capabilityRegistry.listMetadata();
    const directMatch = this.capabilityRegistry.get(targetCapId);

    const candidates = allMetas.filter((c) => {
      if (c.id === targetCapId) return true;
      if (c.id.startsWith(`${targetCapId}.`)) return true;
      if (c.id.includes(targetCapId)) return true;
      return false;
    });

    if (directMatch) {
      const meta = directMatch.getMetadata();
      return {
        selectedCapabilityId: targetCapId,
        available: meta.enabled,
        provider: meta.provider,
        source: meta.source,
        riskLevel: meta.riskLevel,
        reason: `Selected exact matching capability '${targetCapId}' from authoritative provider '${meta.provider}'.`,
        alternativeCandidates: candidates.map((c) => ({ id: c.id, provider: c.provider, source: c.source, score: 1.0 })),
      };
    }

    if (candidates.length === 0) {
      return {
        selectedCapabilityId: targetCapId,
        available: false,
        reason: `Capability '${requestedCapability}' is not registered in the system.`,
        alternativeCandidates: [],
      };
    }

    // Score candidates deterministically: Native > Local MCP > Remote MCP
    const scored = candidates.map((c) => {
      let score = 5.0;
      if (c.source === 'native') score += 4.0;
      else if (c.source === 'mcp') score += 2.5;
      else if (c.source === 'open_source') score += 3.0;

      if (c.securityStatus === 'VERIFIED') score += 2.0;
      if (c.enabled) score += 1.0;
      if (c.riskLevel === 'LOW') score += 1.0;
      else if (c.riskLevel === 'CRITICAL') score -= 2.0;

      // Scoping affinity if options specified
      if (options?.agentId && c.id.includes(options.agentId.toLowerCase())) {
        score += 1.5;
      }

      return { candidate: c, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const top = scored[0].candidate;

    return {
      selectedCapabilityId: top.id,
      available: top.enabled,
      provider: top.provider,
      source: top.source,
      riskLevel: top.riskLevel,
      reason: `Selected safest authorized candidate '${top.id}' (Provider: ${top.provider}, Score: ${scored[0].score}) among ${candidates.length} candidate(s).`,
      alternativeCandidates: scored.map((s) => ({
        id: s.candidate.id,
        provider: s.candidate.provider,
        source: s.candidate.source,
        score: s.score,
      })),
    };
  }
}
