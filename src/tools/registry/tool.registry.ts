/**
 * HṚṢĪKEŚA (हृषीकेश) — Central Tool Registry
 */

import { ITool, ToolCategory } from '../interfaces/tool.types.js';
import { DangerTier, DANGER_TIER_NAMES } from '../interfaces/danger.types.js';
import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';

export interface ToolRegistryDiagnostics {
  readonly totalRegistered: number;
  readonly byCategory: Record<ToolCategory, number>;
  readonly byRisk: Record<string, number>;
}

export class ToolRegistry {
  private readonly tools = new Map<string, ITool>();
  private readonly logger?: ILogger;
  private readonly eventBus?: EventBus;

  constructor(eventBus?: EventBus, logger?: ILogger) {
    this.eventBus = eventBus;
    this.logger = logger?.child('ToolRegistry');
  }

  /**
   * Register a new tool with the registry.
   * Validates tool schema and prevents duplicate IDs.
   */
  public register(tool: ITool): void {
    if (!tool || typeof tool !== 'object') {
      throw new Error('Cannot register invalid tool: tool definition must be an object.');
    }

    const id = tool.id?.trim();
    if (!id) {
      throw new Error('Tool registration failed: tool id is required and cannot be empty.');
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(id)) {
      throw new Error(`Tool registration failed: invalid tool id '${id}'. Must contain only alphanumeric, dot, underscore, or hyphen characters.`);
    }

    if (this.tools.has(id)) {
      throw new Error(`Tool registration failed: duplicate tool id '${id}' is already registered.`);
    }

    if (!tool.name?.trim()) {
      throw new Error(`Tool registration failed: tool '${id}' must have a non-empty name.`);
    }

    if (!tool.description?.trim()) {
      throw new Error(`Tool registration failed: tool '${id}' must have a non-empty description.`);
    }

    if (tool.riskLevel === undefined || tool.riskLevel === null || !(tool.riskLevel in DangerTier)) {
      throw new Error(`Tool registration failed: tool '${id}' must declare a valid DangerTier risk level.`);
    }

    if (!tool.inputSchema || tool.inputSchema.type !== 'object' || !tool.inputSchema.properties) {
      throw new Error(`Tool registration failed: tool '${id}' must define an inputSchema of type 'object' with a properties map.`);
    }

    if (typeof tool.execute !== 'function') {
      throw new Error(`Tool registration failed: tool '${id}' must implement an execute function.`);
    }

    this.tools.set(id, tool);
    this.logger?.info(`Registered tool: [${id}] (Category: ${tool.category}, Risk: ${DANGER_TIER_NAMES[tool.riskLevel]})`);

    this.eventBus?.emit('tool.registered', {
      id,
      name: tool.name,
      category: tool.category,
      riskLevel: tool.riskLevel
    });
  }

  /**
   * Unregister a tool by ID.
   */
  public unregister(toolId: string): boolean {
    const existed = this.tools.delete(toolId);
    if (existed) {
      this.logger?.info(`Unregistered tool: [${toolId}]`);
      this.eventBus?.emit('tool.unregistered', { id: toolId });
    }
    return existed;
  }

  /**
   * Retrieve a tool by its unique ID.
   */
  public get(toolId: string): ITool | undefined {
    return this.tools.get(toolId);
  }

  /**
   * Check if a tool ID is registered.
   */
  public has(toolId: string): boolean {
    return this.tools.has(toolId);
  }

  /**
   * List all registered tools.
   */
  public list(): readonly ITool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Find tools by a declared capability string.
   */
  public findByCapability(capability: string): readonly ITool[] {
    const needle = capability.toLowerCase();
    return this.list().filter((t) =>
      t.capabilities.some((c) => c.toLowerCase() === needle)
    );
  }

  /**
   * Find tools whose risk level is at or below the specified maximum tier.
   */
  public findByRisk(maxRisk: DangerTier): readonly ITool[] {
    return this.list().filter((t) => t.riskLevel <= maxRisk);
  }

  /**
   * Find tools by category.
   */
  public findByCategory(category: ToolCategory): readonly ITool[] {
    return this.list().filter((t) => t.category === category);
  }

  /**
   * Diagnostic statistics about registered tools.
   */
  public getDiagnostics(): ToolRegistryDiagnostics {
    const list = this.list();
    const byCategory: Record<ToolCategory, number> = {
      system: 0,
      filesystem: 0,
      ollama: 0,
      terminal: 0,
      browser: 0,
      computer: 0,
      environment: 0,
      mcp: 0,
      multimodal: 0,
      voice: 0,
      vision: 0,
      camera: 0,
      company: 0,
      research: 0,
      knowledge: 0,
      context: 0,
      working_memory: 0,
      self: 0,
      evolution: 0,
      custom: 0
    };

    const byRisk: Record<string, number> = {
      TIER_0: 0,
      TIER_1: 0,
      TIER_2: 0,
      TIER_3: 0,
      TIER_4: 0
    };

    for (const tool of list) {
      if (tool.category in byCategory) {
        byCategory[tool.category]++;
      }
      const tierName = DANGER_TIER_NAMES[tool.riskLevel] || 'UNKNOWN';
      byRisk[tierName] = (byRisk[tierName] || 0) + 1;
    }

    return {
      totalRegistered: list.length,
      byCategory,
      byRisk
    };
  }
}
