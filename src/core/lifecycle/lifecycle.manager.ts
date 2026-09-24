/**
 * HṚṢĪKEŚA (हृषीकेश) — Lifecycle Manager
 */

import { LifecycleState, LifecycleHook, LifecycleSnapshot } from './lifecycle.types.js';

export class LifecycleManager {
  private currentState: LifecycleState = 'STOPPED';
  private startedAt: Date | null = null;
  private readyAt: Date | null = null;
  private degradationReason: string | null = null;
  private errorMessage: string | null = null;

  private readonly startupHooks: LifecycleHook[] = [];
  private readonly shutdownHooks: LifecycleHook[] = [];
  private isShuttingDown = false;

  public getState(): LifecycleState {
    return this.currentState;
  }

  public registerStartupHook(hook: LifecycleHook): void {
    this.startupHooks.push(hook);
  }

  public registerShutdownHook(hook: LifecycleHook): void {
    this.shutdownHooks.push(hook);
  }

  public async start(): Promise<void> {
    if (this.currentState === 'READY' || this.currentState === 'STARTING') {
      return;
    }

    this.currentState = 'STARTING';
    this.startedAt = new Date();
    this.degradationReason = null;
    this.errorMessage = null;

    try {
      for (const hook of this.startupHooks) {
        await hook();
      }
      this.currentState = 'READY';
      this.readyAt = new Date();
    } catch (err) {
      this.currentState = 'ERROR';
      this.errorMessage = err instanceof Error ? err.message : String(err);
      throw err;
    }
  }

  public setDegraded(reason: string): void {
    this.currentState = 'DEGRADED';
    this.degradationReason = reason;
  }

  public setReady(): void {
    this.currentState = 'READY';
    this.degradationReason = null;
    if (!this.readyAt) {
      this.readyAt = new Date();
    }
  }

  public setError(error: Error | string): void {
    this.currentState = 'ERROR';
    this.errorMessage = typeof error === 'string' ? error : error.message;
  }

  private shutdownReason: string | null = null;

  public async shutdown(reason: string = 'Graceful shutdown requested'): Promise<void> {
    if (this.isShuttingDown || this.currentState === 'STOPPED') {
      return;
    }

    this.isShuttingDown = true;
    this.currentState = 'STOPPING';
    this.shutdownReason = reason;

    // Execute shutdown hooks in reverse registration order (LIFO)
    const hooks = [...this.shutdownHooks].reverse();
    for (const hook of hooks) {
      try {
        await hook();
      } catch (err) {
        console.error(`Error in shutdown hook:`, err);
      }
    }

    this.currentState = 'STOPPED';
    this.isShuttingDown = false;
  }

  public getSnapshot(): LifecycleSnapshot {
    const now = Date.now();
    const uptimeSeconds = this.startedAt ? Math.floor((now - this.startedAt.getTime()) / 1000) : 0;

    return {
      state: this.currentState,
      startedAt: this.startedAt ? this.startedAt.toISOString() : null,
      readyAt: this.readyAt ? this.readyAt.toISOString() : null,
      uptimeSeconds,
      degradationReason: this.degradationReason,
      shutdownReason: this.shutdownReason,
      errorMessage: this.errorMessage
    };
  }
}
