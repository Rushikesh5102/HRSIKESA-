/**
 * HṚṢĪKEŚA (हृषीकेश) — Hardware Awareness Detector
 */

import os from 'node:os';
import { HardwareProfile } from './hardware.types.js';

export type LockPriority = 'HIGH' | 'NORMAL';

interface LockWaiter {
  readonly priority: LockPriority;
  readonly callback: () => void;
  readonly queuedAt: number;
}

export class HardwareDetector {
  private localModelLocked = false;
  private readonly maxConcurrentLocal = 1;
  private lockWaiters: LockWaiter[] = [];

  public getProfile(): HardwareProfile {
    const cpus = os.cpus();
    const totalBytes = os.totalmem();
    const freeBytes = os.freemem();
    const usedBytes = totalBytes - freeBytes;
    const totalGb = Math.round((totalBytes / 1024 / 1024 / 1024) * 10) / 10;
    const freeGb = Math.round((freeBytes / 1024 / 1024 / 1024) * 10) / 10;
    const usedPercentage = Math.round((usedBytes / totalBytes) * 100);
    const memUsage = process.memoryUsage();
    const rssMb = Math.round((memUsage.rss / 1024 / 1024) * 10) / 10;
    const heapUsedMb = Math.round((memUsage.heapUsed / 1024 / 1024) * 10) / 10;
    const heapTotalMb = Math.round((memUsage.heapTotal / 1024 / 1024) * 10) / 10;

    // Memory State Thresholds
    let state: 'NORMAL' | 'LOW_MEMORY' | 'CRITICAL_MEMORY' = 'NORMAL';
    if (freeBytes < 500 * 1024 * 1024) {
      state = 'CRITICAL_MEMORY';
    } else if (freeBytes < 1500 * 1024 * 1024) {
      state = 'LOW_MEMORY';
    }

    const firstCpu = cpus[0] || { model: 'Unknown', speed: 0 };

    return {
      os: {
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        hostname: os.hostname()
      },
      cpu: {
        model: firstCpu.model,
        physicalCores: Math.max(1, Math.floor(cpus.length / 2)), // Approximation on hyperthreaded
        logicalProcessors: cpus.length,
        speedMhz: firstCpu.speed
      },
      memory: {
        totalBytes,
        freeBytes,
        totalGb,
        freeGb,
        usedPercentage,
        state
      },
      processMemory: {
        rssMb,
        heapUsedMb,
        heapTotalMb
      },
      gpuEstimate: {
        name: 'Intel Arc Graphics (Meteor Lake)',
        isIntegrated: true,
        estimatedVramGb: 2.0
      },
      constraints: {
        maxConcurrentLocalInference: this.maxConcurrentLocal,
        activeLocalModelLock: this.localModelLocked
      }
    };
  }

  public acquireLocalModelLock(): boolean {
    if (this.localModelLocked) {
      return false;
    }
    this.localModelLocked = true;
    return true;
  }

  public async acquireLocalModelLockAsync(timeoutMs = 2500, priority: LockPriority = 'NORMAL'): Promise<boolean> {
    if (!this.localModelLocked) {
      this.localModelLocked = true;
      return true;
    }

    if (timeoutMs <= 0) {
      return false;
    }

    return new Promise<boolean>((resolve) => {
      let resolved = false;
      let waiter: LockWaiter;

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.lockWaiters = this.lockWaiters.filter((w) => w !== waiter);
          resolve(false);
        }
      }, timeoutMs);

      const onAvailable = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          this.localModelLocked = true;
          resolve(true);
        }
      };

      waiter = {
        priority,
        callback: onAvailable,
        queuedAt: Date.now()
      };

      // Priority ordering: HIGH priority waiters placed ahead of NORMAL priority waiters,
      // while preserving FIFO within each priority tier.
      if (priority === 'HIGH') {
        const firstNormalIndex = this.lockWaiters.findIndex((w) => w.priority === 'NORMAL');
        if (firstNormalIndex === -1) {
          this.lockWaiters.push(waiter);
        } else {
          this.lockWaiters.splice(firstNormalIndex, 0, waiter);
        }
      } else {
        this.lockWaiters.push(waiter);
      }
    });
  }

  public releaseLocalModelLock(): void {
    this.localModelLocked = false;
    if (this.lockWaiters.length > 0) {
      // Pick next waiter according to queue order (HIGH priority was inserted first)
      const next = this.lockWaiters.shift();
      if (next) {
        next.callback();
      }
    }
  }

  public isLocalModelLocked(): boolean {
    return this.localModelLocked;
  }

  public getLockQueueStats(): {
    locked: boolean;
    highPriorityWaiters: number;
    normalPriorityWaiters: number;
    totalWaiters: number;
  } {
    const high = this.lockWaiters.filter((w) => w.priority === 'HIGH').length;
    const normal = this.lockWaiters.filter((w) => w.priority === 'NORMAL').length;
    return {
      locked: this.localModelLocked,
      highPriorityWaiters: high,
      normalPriorityWaiters: normal,
      totalWaiters: this.lockWaiters.length
    };
  }
}
