/**
 * HṚṢĪKEŚA (हृषीकेश) — Persistent Scheduler
 *
 * Phase 16D: Persistent Scheduling Engine
 *
 * Runs persistent timer checks against SQLite.
 * Survives restart without dropping triggers or creating duplicate runs.
 */

import { randomUUID } from 'node:crypto';
import { ILogger } from '../core/logging/logger.types.js';
import { EventBus } from '../core/events/event-bus.js';
import { ScheduleRepository, PersistentScheduleRecord } from '../persistence/repositories/schedule.repository.js';
import { CreateScheduleRequest, ScheduleTriggerHandler } from './interfaces/scheduler.types.js';

export class PersistentScheduler {
  private readonly repo: ScheduleRepository;
  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;
  private timer: NodeJS.Timeout | null = null;
  private handlers = new Map<string, ScheduleTriggerHandler>();
  private isRunning = false;

  constructor(repo: ScheduleRepository, eventBus?: EventBus, logger?: ILogger) {
    this.repo = repo;
    this.eventBus = eventBus;
    this.logger = logger?.child('PersistentScheduler');
  }

  /**
   * Start the persistent scheduling poll loop.
   */
  public start(pollIntervalMs = 5000): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.logger?.info('PersistentScheduler started.');

    // Immediate check on startup
    this.checkDueSchedules().catch((err) => {
      this.logger?.error(`Error during initial schedule check: ${err}`);
    });

    this.timer = setInterval(() => {
      this.checkDueSchedules().catch((err) => {
        this.logger?.error(`Error during schedule tick: ${err}`);
      });
    }, pollIntervalMs);
  }

  /**
   * Stop the scheduler polling.
   */
  public stop(): void {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.logger?.info('PersistentScheduler stopped.');
  }

  /**
   * Register a custom trigger handler for a targetType (e.g. 'goal', 'evaluation', 'mission').
   */
  public registerHandler(targetType: string, handler: ScheduleTriggerHandler): void {
    this.handlers.set(targetType, handler);
  }

  /**
   * Register a new persistent schedule.
   */
  public async createSchedule(req: CreateScheduleRequest): Promise<PersistentScheduleRecord> {
    const id = randomUUID();
    const now = new Date();

    let nextRunAt: string | undefined = req.firstRunAt;
    if (!nextRunAt) {
      if (req.scheduleType === 'INTERVAL' && req.intervalMs) {
        nextRunAt = new Date(now.getTime() + req.intervalMs).toISOString();
      } else if (req.scheduleType === 'RECURRING') {
        nextRunAt = this.calculateNextCronTime(req.cronExpression);
      } else if (req.scheduleType === 'ONE_TIME') {
        nextRunAt = req.firstRunAt || now.toISOString();
      }
    }

    const record: PersistentScheduleRecord = {
      id,
      name: req.name,
      description: req.description,
      targetType: req.targetType,
      targetId: req.targetId,
      scheduleType: req.scheduleType,
      cronExpression: req.cronExpression,
      intervalMs: req.intervalMs,
      eventPattern: req.eventPattern,
      nextRunAt,
      runCount: 0,
      maxRuns: req.maxRuns,
      status: 'ACTIVE',
      payload: req.payload,
      createdBy: req.createdBy || 'rushikesh',
      metadata: req.metadata,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const created = this.repo.create(record);
    this.logger?.info(`Created persistent schedule '${req.name}' [${id}] for target ${req.targetType}:${req.targetId}`);

    if (this.eventBus) {
      this.eventBus.emit('schedule.created', {
        scheduleId: id,
        targetType: req.targetType,
        targetId: req.targetId,
        timestamp: now.toISOString()
      });
    }

    return created;
  }

  public async schedule(req: CreateScheduleRequest): Promise<PersistentScheduleRecord> {
    return this.createSchedule(req);
  }

  public getSchedule(id: string): PersistentScheduleRecord | null {
    return this.repo.get(id);
  }

  public listSchedules(): PersistentScheduleRecord[] {
    return this.repo.list();
  }

  public pauseSchedule(id: string): PersistentScheduleRecord | null {
    const updated = this.repo.update(id, { status: 'PAUSED' });
    if (updated && this.eventBus) {
      this.eventBus.emit('schedule.paused', {
        scheduleId: id,
        targetType: updated.targetType,
        targetId: updated.targetId,
        timestamp: new Date().toISOString()
      });
    }
    return updated;
  }

  public resumeSchedule(id: string): PersistentScheduleRecord | null {
    const updated = this.repo.update(id, { status: 'ACTIVE' });
    if (updated && this.eventBus) {
      this.eventBus.emit('schedule.resumed', {
        scheduleId: id,
        targetType: updated.targetType,
        targetId: updated.targetId,
        timestamp: new Date().toISOString()
      });
    }
    return updated;
  }

  public cancelSchedule(id: string): PersistentScheduleRecord | null {
    const updated = this.repo.update(id, { status: 'CANCELLED' });
    if (updated && this.eventBus) {
      this.eventBus.emit('schedule.cancelled', {
        scheduleId: id,
        targetType: updated.targetType,
        targetId: updated.targetId,
        timestamp: new Date().toISOString()
      });
    }
    return updated;
  }

  public deleteSchedule(id: string): boolean {
    return this.repo.delete(id);
  }

  /**
   * Poll and execute all due schedules.
   */
  public async checkDueSchedules(): Promise<number> {
    const nowIso = new Date().toISOString();
    const dueSchedules = this.repo.listDue(nowIso);

    if (dueSchedules.length === 0) return 0;

    this.logger?.info(`Found ${dueSchedules.length} due schedule(s) to trigger.`);

    for (const schedule of dueSchedules) {
      try {
        await this.triggerSchedule(schedule);
      } catch (err: any) {
        this.logger?.error(`Failed to trigger schedule '${schedule.name}' [${schedule.id}]: ${err.message}`);
      }
    }

    return dueSchedules.length;
  }

  private async triggerSchedule(schedule: PersistentScheduleRecord): Promise<void> {
    const now = new Date();
    const newRunCount = schedule.runCount + 1;

    // Check if max runs reached
    let newStatus = schedule.status;
    let nextRunAt: string | undefined;

    if (schedule.maxRuns && newRunCount >= schedule.maxRuns) {
      newStatus = 'COMPLETED';
      nextRunAt = undefined;
    } else if (schedule.scheduleType === 'ONE_TIME') {
      newStatus = 'COMPLETED';
      nextRunAt = undefined;
    } else if (schedule.scheduleType === 'INTERVAL' && schedule.intervalMs) {
      nextRunAt = new Date(now.getTime() + schedule.intervalMs).toISOString();
    } else if (schedule.scheduleType === 'RECURRING') {
      nextRunAt = this.calculateNextCronTime(schedule.cronExpression);
    }

    // Update schedule record
    this.repo.update(schedule.id, {
      lastRunAt: now.toISOString(),
      nextRunAt,
      runCount: newRunCount,
      status: newStatus,
    });

    this.logger?.info(`Triggered schedule '${schedule.name}' [${schedule.id}] (run #${newRunCount})`);

    // Execute registered handler if available
    const handler = this.handlers.get(schedule.targetType) || this.handlers.get('*');
    if (handler) {
      await handler(schedule);
    }

    if (this.eventBus) {
      this.eventBus.emit('schedule.triggered', {
        scheduleId: schedule.id,
        targetType: schedule.targetType,
        targetId: schedule.targetId,
        timestamp: now.toISOString(),
      });
    }
  }

  /**
   * Calculate next run time for standard interval/cron expressions (simplified standard parser).
   */
  private calculateNextCronTime(cronExp?: string): string | undefined {
    if (!cronExp) return undefined;
    // Default fallback to 1 hour if cron specified without external library
    const now = new Date();
    return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  }
}
