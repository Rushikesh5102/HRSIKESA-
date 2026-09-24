/**
 * HṚṢĪKEŚA (हृषीकेश) — Hardware Awareness Detector
 */

import os from 'node:os';
import { HardwareProfile } from './hardware.types.js';

export class HardwareDetector {
  private localModelLocked = false;
  private readonly maxConcurrentLocal = 1;
  private lockWaiters: Array<() => void> = [];

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

  public async acquireLocalModelLockAsync(timeoutMs = 2500): Promise<boolean> {
    if (!this.localModelLocked) {
      this.localModelLocked = true;
      return true;
    }

    if (timeoutMs <= 0) {
      return false;
    }

    return new Promise<boolean>((resolve) => {
      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.lockWaiters = this.lockWaiters.filter((cb) => cb !== onAvailable);
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

      this.lockWaiters.push(onAvailable);
    });
  }

  public releaseLocalModelLock(): void {
    this.localModelLocked = false;
    if (this.lockWaiters.length > 0) {
      const next = this.lockWaiters.shift();
      if (next) {
        next();
      }
    }
  }

  public isLocalModelLocked(): boolean {
    return this.localModelLocked;
  }
}
