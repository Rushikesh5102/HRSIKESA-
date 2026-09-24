/**
 * HṚṢĪKEŚA (हृषीकेश) — 14-Tier Memory Architecture Types
 */

export type MemoryTier =
  | 'core_identity'           // Tier 1: Immutable system identity & sovereign rules
  | 'creator_profile'         // Tier 2: Rushikesh Pattiwar structured profile & preferences
  | 'operating_principles'    // Tier 3: Core autonomy, safety & VDI operating rules
  | 'preferences'             // Tier 4: Dynamic user & runtime preferences
  | 'conversational_episodic' // Tier 5: Summarized interactions & episodic context
  | 'project_memory'          // Tier 6: Repository invariants, milestones, roadmaps
  | 'agent_memory'            // Tier 7: Workforce roster & agent execution memory
  | 'decisions'               // Tier 8: ADR registry & architectural decisions
  | 'knowledge'               // Tier 9: Domain, scientific & factual knowledge
  | 'skills'                  // Tier 10: Operational skills & tool playbooks
  | 'tool_state'              // Tier 11: MCP tool connections & states
  | 'task_history'            // Tier 12: Mission & background task execution log
  | 'documents_references'    // Tier 13: Ingested documents, manuals & specs
  | 'audit_history';          // Tier 14: Provenance audit & security logs

export type MemoryProvenance = 'explicit' | 'learned' | 'imported';

export interface MemoryItem {
  readonly id: string;
  readonly tier: MemoryTier;
  readonly key: string;
  readonly content: string; // JSON string or markdown
  readonly source: string;  // Origin identifier (e.g., 'rushikesh', 'system_bootstrap', 'chatgpt_export')
  readonly provenance: MemoryProvenance;
  readonly confidence: number; // 0.0 to 1.0
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly metadata?: Record<string, unknown> | null;
}

export interface MemoryQuery {
  readonly tier?: MemoryTier;
  readonly key?: string;
  readonly provenance?: MemoryProvenance;
  readonly search?: string;
  readonly limit?: number;
  readonly offset?: number;
}
