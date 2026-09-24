/**
 * HṚṢĪKEŚA (हृषीकेश) — Agent Domain Types
 *
 * Defines the vendor-neutral agent abstraction for the 17-agent specialized workforce.
 *
 * Hierarchy:
 *   Rushikesh (Master Authority) -> HṚṢĪKEŚA (Orchestrator) -> Missions -> DAG Tasks -> Specialized Agents -> Governed Tools -> OS Environment
 */

import { DangerTier } from '../../tools/interfaces/danger.types.js';

export type AgentId = string;

export type AgentStatus =
  | 'idle'
  | 'working'
  | 'thinking'
  | 'executing'
  | 'waiting'
  | 'blocked'
  | 'awaiting_approval'
  | 'verifying'
  | 'recovering'
  | 'completed'
  | 'failed'
  | 'retired'
  | 'paused';

export interface AgentModelPreference {
  readonly preferLocal: boolean;
  readonly preferredModelId?: string;
  readonly preferredProviderId?: string;
}

export interface IAgent {
  readonly id: AgentId;
  readonly name: string;
  readonly displayName: string;
  readonly sanskritName?: string;
  readonly role: string;
  readonly description: string;
  readonly responsibilities?: readonly string[];
  readonly lifecyclePosition?: string;
  readonly collaborationPartners?: readonly string[];
  readonly systemPrompt: string;
  readonly capabilities: readonly string[];
  readonly allowedTools: readonly string[];
  readonly dangerTierLimit: DangerTier;
  readonly memoryScope: string;
  readonly modelPreference: AgentModelPreference;
  status: AgentStatus;
  readonly createdAt: string;
  updatedAt: string;
}

export interface WorkforceHealth {
  readonly total: number;
  readonly active: number;
  readonly idle: number;
  readonly blocked: number;
  readonly awaitingApproval: number;
  readonly failed: number;
  readonly recovering: number;
  readonly retired: number;
}

export interface AgentRegistryDiagnostics {
  readonly totalRegistered: number;
  readonly byStatus: Record<AgentStatus, number>;
  readonly byRole: Record<string, number>;
  readonly registeredIds: string[];
  readonly workforceHealth?: WorkforceHealth;
}

