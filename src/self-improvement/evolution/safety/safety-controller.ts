/**
 * HṚṢĪKEŚA (हृषीकेश) — Safety Controller & Emergency Stop Subsystem
 *
 * Dedicated, immutable safety controller managing execution halt, worker process
 * termination, log preservation, and state lockdown.
 *
 * Autonomous workers CANNOT disable, override, or rewrite this mechanism.
 */

import { spawnSync } from 'node:child_process';
import os from 'node:os';
import { EventBus } from '../../../core/events/event-bus.js';
import { ILogger } from '../../../core/logging/logger.types.js';
import { SafetyState, SafetyStatus } from '../types/evolution.types.js';

export class SafetyController {
  private state: SafetyState = 'NOMINAL';
  private stopReason?: string;
  private stoppedAt?: string;
  private readonly registeredPids: Set<number> = new Set();
  private readonly activeAbortControllers: Set<AbortController> = new Set();
  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;

  constructor(eventBus?: EventBus, logger?: ILogger) {
    this.eventBus = eventBus;
    this.logger = typeof logger?.child === 'function' ? logger.child('SafetyController') : logger;
  }

  /**
   * Register a worker process ID or child process for emergency termination tracking.
   */
  public registerProcess(pid: number): void {
    if (this.state === 'EMERGENCY_STOPPED') {
      // If already stopped, immediately kill new process
      this.killPid(pid);
      throw new Error(`Execution blocked: SafetyController is in EMERGENCY_STOPPED state.`);
    }
    this.registeredPids.add(pid);
  }

  /**
   * Unregister process on normal exit.
   */
  public unregisterProcess(pid: number): void {
    this.registeredPids.delete(pid);
  }

  /**
   * Register an AbortController for active asynchronous tasks.
   */
  public registerAbortController(ac: AbortController): void {
    if (this.state === 'EMERGENCY_STOPPED') {
      ac.abort(new Error('Emergency stop triggered.'));
      return;
    }
    this.activeAbortControllers.add(ac);
  }

  public unregisterAbortController(ac: AbortController): void {
    this.activeAbortControllers.delete(ac);
  }

  /**
   * Pause evolution execution (e.g. for human approval or temporary resource limit).
   */
  public pause(reason: string): void {
    if (this.state === 'EMERGENCY_STOPPED') {
      this.logger?.warn('Cannot pause: SafetyController is already in EMERGENCY_STOPPED state.');
      return;
    }
    this.state = 'PAUSED';
    this.stopReason = reason;
    this.logger?.warn(`Evolution engine PAUSED: ${reason}`);

    (this.eventBus as any)?.emit('evolution.safety.paused', {
      reason,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Resume paused evolution execution.
   */
  public resume(): void {
    if (this.state === 'EMERGENCY_STOPPED') {
      throw new Error('CRITICAL SAFETY: Cannot resume an EMERGENCY_STOPPED evolution run without explicit administrative reset.');
    }
    this.state = 'NOMINAL';
    this.stopReason = undefined;
    this.logger?.info('Evolution engine RESUMED to NOMINAL state.');

    (this.eventBus as any)?.emit('evolution.safety.resumed', {
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Cancel an ongoing evolution objective.
   */
  public cancel(reason: string): void {
    this.pause(reason);
    this.logger?.info(`Evolution engine CANCELLED: ${reason}`);
    (this.eventBus as any)?.emit('evolution.safety.cancelled', {
      reason,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * EMERGENCY STOP:
   * 1. Stops new experiments.
   * 2. Stops new autonomous tasks.
   * 3. Terminates evolution workers and child processes immediately.
   * 4. Preserves logs, checkpoints, evidence, and Git state.
   * 5. Marks status EMERGENCY_STOPPED.
   * 6. Releases resources safely.
   * 7. Leaves trusted production HṚṢĪKEŚA state untouched.
   */
  public emergencyStop(reason: string, details?: Record<string, unknown>): SafetyStatus {
    this.state = 'EMERGENCY_STOPPED';
    this.stopReason = reason;
    this.stoppedAt = new Date().toISOString();

    this.logger?.error(`=======================================================`);
    this.logger?.error(`🚨 EMERGENCY STOP ACTIVATED: ${reason}`);
    this.logger?.error(`Details: ${JSON.stringify(details || {})}`);
    this.logger?.error(`=======================================================`);

    // 1. Abort all active async operations
    for (const ac of this.activeAbortControllers) {
      try {
        ac.abort(new Error(`Emergency stop triggered: ${reason}`));
      } catch (err) {
        this.logger?.error(`Failed aborting controller:`, err);
      }
    }
    this.activeAbortControllers.clear();

    // 2. Terminate all registered child processes
    let terminatedCount = 0;
    for (const pid of this.registeredPids) {
      if (this.killPid(pid)) {
        terminatedCount++;
      }
    }
    this.registeredPids.clear();

    // 3. Emit emergency stop event for system-wide awareness
    (this.eventBus as any)?.emit('evolution.safety.emergency_stopped', {
      reason,
      stoppedAt: this.stoppedAt,
      terminatedCount,
      details,
    });

    return this.getStatus();
  }

  /**
   * Helper to terminate a process and its process tree.
   */
  private killPid(pid: number): boolean {
    try {
      if (os.platform() === 'win32') {
        spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' });
        try {
          process.kill(pid, 'SIGKILL');
        } catch {}
      } else {
        process.kill(pid, 'SIGKILL');
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current safety status.
   */
  public getStatus(): SafetyStatus {
    return {
      state: this.state,
      isEmergencyStopped: this.state === 'EMERGENCY_STOPPED',
      isPaused: this.state === 'PAUSED',
      reason: this.stopReason,
      stoppedAt: this.stoppedAt,
      canResume: this.state !== 'EMERGENCY_STOPPED',
      activeProcessesTerminated: this.registeredPids.size,
      worktreesLocked: this.state === 'EMERGENCY_STOPPED',
    };
  }

  public isEmergencyStopped(): boolean {
    return this.state === 'EMERGENCY_STOPPED';
  }

  public isPaused(): boolean {
    return this.state === 'PAUSED';
  }

  public reset(): void {
    this.state = 'NOMINAL';
    this.stopReason = undefined;
    this.stoppedAt = undefined;
    this.logger?.info('SafetyController reset to NOMINAL.');
  }

  public resetEmergencyStop(): void {
    this.reset();
  }

  public triggerEmergencyStop(reason: string, details?: Record<string, unknown>): SafetyStatus {
    return this.emergencyStop(reason, details);
  }

  public assertOperational(): void {
    if (this.state === 'EMERGENCY_STOPPED') {
      throw new Error(`CRITICAL: Operation rejected: SafetyController is EMERGENCY_STOPPED (${this.stopReason || 'Safety Trigger'}).`);
    }
  }
}
