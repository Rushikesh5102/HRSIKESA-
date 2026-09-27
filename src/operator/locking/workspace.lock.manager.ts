/**
 * FP-13 Workspace Lock Manager
 *
 * Manages concurrency and ownership across digital workspaces, preventing
 * simultaneous conflicting actions from multiple agents.
 */

import { WorkspaceLock } from '../types/trace.types.js';
import { WorkspaceRepository } from '../repository/workspace.repository.js';
import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';
import { OperatorEventTopics } from '../types/operator.events.js';

export class WorkspaceLockManager {
  private inMemoryLocks: Map<string, WorkspaceLock> = new Map();

  constructor(
    private readonly repository?: WorkspaceRepository,
    private readonly logger?: ILogger,
    private readonly eventBus?: EventBus
  ) {}

  public acquireLock(
    workspaceId: string,
    holderAgentId: string,
    taskId: string,
    lockType: 'EXCLUSIVE' | 'SHARED_OBSERVE' | 'QUEUED' = 'EXCLUSIVE',
    ttlSeconds: number = 60,
    applicationId?: string
  ): boolean {
    const activeLock = this.getActiveLock(workspaceId);
    if (activeLock && !activeLock.isReleased) {
      if (activeLock.holderAgentId === holderAgentId) {
        // Renew lock
        activeLock.expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
        if (this.repository) {
          this.repository.acquireLock(activeLock);
        }
        return true;
      }
      if (activeLock.lockType === 'EXCLUSIVE' || lockType === 'EXCLUSIVE') {
        this.logger?.warn(`Cannot acquire lock on workspace ${workspaceId}: held exclusively by ${activeLock.holderAgentId}`);
        return false;
      }
    }

    const lockId = `lock_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();
    const lock: WorkspaceLock = {
      lockId,
      workspaceId,
      applicationId,
      holderAgentId,
      lockType,
      taskId,
      acquiredAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ttlSeconds * 1000).toISOString(),
      isReleased: false,
    };

    this.inMemoryLocks.set(workspaceId, lock);

    if (this.repository) {
      const dbOk = this.repository.acquireLock(lock);
      if (!dbOk) return false;
    }

    if (this.eventBus) {
      this.eventBus.emit(OperatorEventTopics.LOCK_ACQUIRED, {
        lockId,
        workspaceId,
        agentId: holderAgentId,
        holderAgentId,
        mode: lockType,
        timestamp: lock.acquiredAt,
      });
    }

    return true;
  }

  public releaseLock(workspaceId: string, holderAgentId: string): boolean {
    const lock = this.inMemoryLocks.get(workspaceId);
    if (!lock || lock.isReleased) {
      return true;
    }

    if (lock.holderAgentId !== holderAgentId) {
      this.logger?.warn(`Agent ${holderAgentId} attempted to release lock held by ${lock.holderAgentId}`);
      return false;
    }

    lock.isReleased = true;
    this.inMemoryLocks.delete(workspaceId);

    if (this.repository) {
      this.repository.releaseLock(lock.lockId);
    }

    if (this.eventBus) {
      this.eventBus.emit(OperatorEventTopics.LOCK_RELEASED, {
        lockId: lock.lockId,
        workspaceId,
        agentId: holderAgentId,
        holderAgentId,
        timestamp: new Date().toISOString(),
      });
    }

    return true;
  }

  public getActiveLock(workspaceId: string): WorkspaceLock | null {
    const lock = this.inMemoryLocks.get(workspaceId);
    if (lock && !lock.isReleased) {
      if (new Date(lock.expiresAt) > new Date()) {
        return lock;
      } else {
        lock.isReleased = true;
        this.inMemoryLocks.delete(workspaceId);
      }
    }

    if (this.repository) {
      return this.repository.getActiveLock(workspaceId);
    }

    return null;
  }
}
