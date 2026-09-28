/**
 * HṚṢĪKEŚA (हृषीकेश) — Virtual Office Ticket & Pipeline Engine
 */

import { randomUUID } from 'node:crypto';
import { DatabaseManager } from '../../persistence/database/database.manager.js';
import {
  OfficeTicket,
  OfficeStage,
  OfficeTicketArtifact,
  OfficeTicketHandoff
} from '../interfaces/office.types.js';
import { ILogger } from '../../core/logging/logger.types.js';

export class OfficeTicketEngine {
  private readonly tickets = new Map<string, OfficeTicket>();
  public readonly db?: DatabaseManager;
  private readonly logger?: ILogger;

  constructor(db?: DatabaseManager, logger?: ILogger) {
    this.db = db;
    this.logger = logger?.child('OfficeTicketEngine');
  }

  public createTicket(params: {
    title: string;
    description: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    initialAgentId?: string;
    initialRole?: string;
  }): OfficeTicket {
    const id = `tkt_${Date.now().toString(36)}_${randomUUID().slice(0, 4)}`;
    const ticket: OfficeTicket = {
      id,
      title: params.title.trim(),
      description: params.description.trim(),
      priority: params.priority || 'MEDIUM',
      stage: 'BACKLOG',
      currentAgentId: params.initialAgentId || 'rahu',
      assignedRole: params.initialRole || 'Product Manager & Strategist',
      progressPercent: 5,
      artifacts: [],
      handoffHistory: [],
      logs: [`[${new Date().toLocaleTimeString()}] Ticket created and placed into Office Backlog.`],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.tickets.set(id, ticket);
    this.logger?.info(`Created new office ticket [${id}]: ${ticket.title}`);
    return ticket;
  }

  public getTicket(id: string): OfficeTicket | undefined {
    return this.tickets.get(id);
  }

  public getAllTickets(): OfficeTicket[] {
    return Array.from(this.tickets.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  public updateTicket(id: string, updates: Partial<OfficeTicket>): OfficeTicket | undefined {
    const existing = this.tickets.get(id);
    if (!existing) return undefined;

    const updated: OfficeTicket = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.tickets.set(id, updated);
    return updated;
  }

  public transitionStage(id: string, newStage: OfficeStage, agentThought?: string): OfficeTicket | undefined {
    const ticket = this.tickets.get(id);
    if (!ticket) return undefined;

    ticket.stage = newStage;
    if (agentThought) ticket.liveThought = agentThought;
    ticket.updatedAt = new Date().toISOString();

    if (newStage === 'PLANNING') ticket.progressPercent = 25;
    else if (newStage === 'IN_PROGRESS') ticket.progressPercent = 50;
    else if (newStage === 'CODE_REVIEW') ticket.progressPercent = 75;
    else if (newStage === 'QA_TESTING') ticket.progressPercent = 90;
    else if (newStage === 'COMPLETED') {
      ticket.progressPercent = 100;
      ticket.completedAt = new Date().toISOString();
    }

    ticket.logs.push(`[${new Date().toLocaleTimeString()}] Stage advanced to ${newStage}. ${agentThought ? 'Note: ' + agentThought : ''}`);
    return ticket;
  }

  public recordHandoff(
    id: string,
    handoff: OfficeTicketHandoff,
    nextRole: string
  ): OfficeTicket | undefined {
    const ticket = this.tickets.get(id);
    if (!ticket) return undefined;

    ticket.handoffHistory.push(handoff);
    ticket.currentAgentId = handoff.toAgentId;
    ticket.assignedRole = nextRole;
    ticket.updatedAt = new Date().toISOString();
    ticket.logs.push(`[${new Date().toLocaleTimeString()}] Handed off from @${handoff.fromAgentId} to @${handoff.toAgentId}. Summary: ${handoff.summary}`);
    return ticket;
  }

  public addArtifact(id: string, artifact: OfficeTicketArtifact): OfficeTicket | undefined {
    const ticket = this.tickets.get(id);
    if (!ticket) return undefined;

    ticket.artifacts.push(artifact);
    ticket.updatedAt = new Date().toISOString();
    ticket.logs.push(`[${new Date().toLocaleTimeString()}] Artifact attached: "${artifact.title}" (${artifact.type})`);
    return ticket;
  }
}
