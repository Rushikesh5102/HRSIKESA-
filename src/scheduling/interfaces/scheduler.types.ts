/**
 * HṚṢĪKEŚA (हृषीकेश) — Persistent Scheduler Domain Types
 *
 * Phase 16D: Persistent Scheduling (One-time, recurring, interval, event-driven)
 */

import {
  ScheduleTargetType,
  ScheduleType,
  ScheduleStatus,
  PersistentScheduleRecord,
} from '../../persistence/repositories/schedule.repository.js';

export { ScheduleTargetType, ScheduleType, ScheduleStatus, PersistentScheduleRecord };

export interface CreateScheduleRequest {
  readonly name: string;
  readonly description?: string;
  readonly targetType: ScheduleTargetType;
  readonly targetId: string;
  readonly scheduleType: ScheduleType;
  readonly cronExpression?: string;
  readonly intervalMs?: number;
  readonly eventPattern?: string;
  readonly firstRunAt?: string;
  readonly maxRuns?: number;
  readonly payload?: Record<string, unknown>;
  readonly createdBy?: string;
  readonly metadata?: Record<string, unknown>;
}

export type ScheduleTriggerHandler = (schedule: PersistentScheduleRecord) => Promise<void>;
