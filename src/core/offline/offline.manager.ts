/**
 * HṚṢĪKEŚA (हृषीकेश) — Foundation Performance & Execution (FP-01)
 * Offline Mode & Asynchronous Operation Queue
 *
 * Ensures all core conversational, local model, memory, file, and skill
 * operations work 100% offline without internet.
 *
 * External operations report: "OFFLINE — QUEUED" rather than failing silently.
 */

import { OfflineQueueEntry } from '../../inference/backend.types.js';

export class OfflineManager {
  private static instance: OfflineManager | null = null;
  private isOnline = false;
  private queue: OfflineQueueEntry[] = [];

  private constructor() {
    // Default to offline-first assumption
    this.isOnline = false;
  }

  public static getInstance(): OfflineManager {
    if (!this.instance) {
      this.instance = new OfflineManager();
    }
    return this.instance;
  }

  public setOnlineStatus(online: boolean): void {
    this.isOnline = online;
  }

  public getOnlineStatus(): boolean {
    return this.isOnline;
  }

  public queueExternalOperation(action: string, payload: Record<string, unknown>): OfflineQueueEntry {
    const entry: OfflineQueueEntry = {
      id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      action,
      payload,
      queuedAt: new Date().toISOString(),
      status: 'OFFLINE_QUEUED',
    };
    this.queue.push(entry);
    return entry;
  }

  public getQueuedEntries(): readonly OfflineQueueEntry[] {
    return this.queue;
  }

  public getFormattedOfflineNotice(actionName: string): string {
    return `📡 **OFFLINE — QUEUED**: The action '${actionName}' requires external network connectivity and has been queued safely. All local cognition, tools, memory, and models remain fully operational.`;
  }
}
