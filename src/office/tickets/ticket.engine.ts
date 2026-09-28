/**
 * HṚṢĪKEŚA (हृषीकेश) — Virtual Office Ticket & Pipeline Engine
 *
 * Fully integrated local SQLite persistence with node:sqlite WAL mode.
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
    this.initSqliteSchema();
    this.loadPersistedTickets();
  }

  private initSqliteSchema(): void {
    if (!this.db) return;
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS office_tickets (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          priority TEXT,
          stage TEXT,
          current_agent_id TEXT,
          assigned_role TEXT,
          progress_percent INTEGER,
          live_thought TEXT,
          active_tool TEXT,
          artifacts_json TEXT,
          handoff_history_json TEXT,
          logs_json TEXT,
          created_at TEXT,
          updated_at TEXT,
          completed_at TEXT
        );
      `);
      this.logger?.info('Office tickets local SQLite schema initialized.');
    } catch (err) {
      this.logger?.error('Failed to initialize office_tickets SQLite schema', err);
    }
  }

  private loadPersistedTickets(): void {
    if (!this.db) return;
    try {
      const stmt = this.db.prepare('SELECT * FROM office_tickets ORDER BY updated_at DESC');
      const rows = stmt.all() as any[];
      for (const row of rows) {
        const ticket: OfficeTicket = {
          id: row.id,
          title: row.title,
          description: row.description || '',
          priority: (row.priority as any) || 'MEDIUM',
          stage: (row.stage as any) || 'BACKLOG',
          currentAgentId: row.current_agent_id || 'rahu',
          assignedRole: row.assigned_role || 'Product Manager & Strategist',
          progressPercent: Number(row.progress_percent) || 0,
          liveThought: row.live_thought || undefined,
          activeTool: row.active_tool || undefined,
          artifacts: row.artifacts_json ? JSON.parse(row.artifacts_json) : [],
          handoffHistory: row.handoff_history_json ? JSON.parse(row.handoff_history_json) : [],
          logs: row.logs_json ? JSON.parse(row.logs_json) : [],
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          completedAt: row.completed_at || undefined
        };
        this.tickets.set(ticket.id, ticket);
      }
      this.logger?.info(`Loaded ${this.tickets.size} persisted tickets from local SQLite.`);
    } catch (err) {
      this.logger?.error('Failed to load persisted tickets from SQLite', err);
    }
  }

  private persistTicket(ticket: OfficeTicket): void {
    if (!this.db) return;
    try {
      const stmt = this.db.prepare(`
        INSERT INTO office_tickets (
          id, title, description, priority, stage, current_agent_id, assigned_role,
          progress_percent, live_thought, active_tool, artifacts_json,
          handoff_history_json, logs_json, created_at, updated_at, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          description = excluded.description,
          priority = excluded.priority,
          stage = excluded.stage,
          current_agent_id = excluded.current_agent_id,
          assigned_role = excluded.assigned_role,
          progress_percent = excluded.progress_percent,
          live_thought = excluded.live_thought,
          active_tool = excluded.active_tool,
          artifacts_json = excluded.artifacts_json,
          handoff_history_json = excluded.handoff_history_json,
          logs_json = excluded.logs_json,
          updated_at = excluded.updated_at,
          completed_at = excluded.completed_at;
      `);

      stmt.run(
        ticket.id,
        ticket.title,
        ticket.description,
        ticket.priority,
        ticket.stage,
        ticket.currentAgentId,
        ticket.assignedRole,
        ticket.progressPercent,
        ticket.liveThought || null,
        ticket.activeTool || null,
        JSON.stringify(ticket.artifacts || []),
        JSON.stringify(ticket.handoffHistory || []),
        JSON.stringify(ticket.logs || []),
        ticket.createdAt,
        ticket.updatedAt,
        ticket.completedAt || null
      );
    } catch (err) {
      this.logger?.error(`Failed to persist ticket ${ticket.id} to SQLite`, err);
    }
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
    this.persistTicket(ticket);
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
    this.persistTicket(updated);
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
    this.persistTicket(ticket);
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
    this.persistTicket(ticket);
    return ticket;
  }

  public addArtifact(id: string, artifact: OfficeTicketArtifact): OfficeTicket | undefined {
    const ticket = this.tickets.get(id);
    if (!ticket) return undefined;

    ticket.artifacts.push(artifact);
    ticket.updatedAt = new Date().toISOString();
    ticket.logs.push(`[${new Date().toLocaleTimeString()}] Artifact attached: "${artifact.title}" (${artifact.type})`);
    this.persistTicket(ticket);
    return ticket;
  }
}
