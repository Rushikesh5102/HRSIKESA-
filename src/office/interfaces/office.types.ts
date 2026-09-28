/**
 * HṚṢĪKEŚA (हृषीकेश) — Virtual Agent Office Architecture Types
 * Inspired by Headless Multi-Agent Office & Sovereign Workforce Collaboration
 */

export type OfficeStage =
  | 'BACKLOG'
  | 'PLANNING'
  | 'IN_PROGRESS'
  | 'CODE_REVIEW'
  | 'QA_TESTING'
  | 'COMPLETED'
  | 'BLOCKED';

export type DeskActivity =
  | 'IDLE'
  | 'READING_SPEC'
  | 'PLANNING'
  | 'WRITING_CODE'
  | 'EXECUTING_TOOLS'
  | 'RUNNING_TESTS'
  | 'REVIEWING'
  | 'HANDING_OFF';

export interface OfficeTicketArtifact {
  id: string;
  type: 'code' | 'diff' | 'doc' | 'test_report' | 'diagram' | 'log';
  title: string;
  content: string;
  path?: string;
  createdAt: string;
  createdByAgentId: string;
}

export interface OfficeTicketHandoff {
  fromAgentId: string;
  toAgentId: string;
  summary: string;
  timestamp: string;
  artifactsProduced: string[];
}

export interface OfficeTicket {
  id: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  stage: OfficeStage;
  currentAgentId: string;
  assignedRole: string;
  progressPercent: number;
  liveThought?: string;
  activeTool?: string;
  artifacts: OfficeTicketArtifact[];
  handoffHistory: OfficeTicketHandoff[];
  logs: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface AgentDeskState {
  agentId: string;
  displayName: string;
  role: string;
  avatar: string;
  deskNumber: number;
  activity: DeskActivity;
  currentTicketId?: string;
  activeModel: string;
  thoughtBubble?: string;
  tokensProcessed: number;
  tasksCompleted: number;
  lastActiveIso: string;
}

export interface OfficeFloorState {
  desks: AgentDeskState[];
  tickets: OfficeTicket[];
  activeTicketCount: number;
  completedTicketCount: number;
  systemThroughputTokensPerSec: number;
  activeProviderFleet: string[];
}

export interface OfficeStreamEvent {
  type:
    | 'DESK_STATUS'
    | 'THOUGHT_TOKEN'
    | 'TOOL_CALL'
    | 'TOOL_RESULT'
    | 'TICKET_UPDATED'
    | 'STAGE_TRANSITION'
    | 'HANDOFF'
    | 'ARTIFACT_CREATED';
  ticketId?: string;
  agentId?: string;
  data: any;
  timestamp: string;
}
