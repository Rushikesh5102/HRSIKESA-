/**
 * HṚṢĪKEŚA (हृषीकेश) — Resource Governor
 *
 * Phase 16H: Hardware Resource Governance
 *
 * Continuously checks host memory and CPU utilization to prevent process thrashing
 * or OOM crashes on the Acer laptop (~16GB RAM, ~1.1-2GB free).
 */

import os from 'node:os';
import { ILogger } from '../logging/logger.types.js';
import { EventBus } from '../events/event-bus.js';

export type ResourcePressureLevel = 'NORMAL' | 'LOW_MEMORY' | 'CRITICAL_MEMORY';

export interface ResourceGovernorMetrics {
  totalMemoryBytes: number;
  freeMemoryBytes: number;
  freeMemoryGb: number;
  usedMemoryPercentage: number;
  processRssMb: number;
  processHeapMb: number;
  pressureLevel: ResourcePressureLevel;
  maxConcurrentTasks: number;
  maxConcurrentMissions: number;
}

export class ResourceGovernor {
  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;
  private currentPressure: ResourcePressureLevel = 'NORMAL';
  private forcedPressure: ResourcePressureLevel | null = null;

  constructor(eventBus?: EventBus, logger?: ILogger) {
    this.eventBus = eventBus;
    this.logger = logger?.child('ResourceGovernor');
  }

  /**
   * Overrides resource pressure for deterministic testing.
   */
  public setForcedPressure(level: ResourcePressureLevel | null): void {
    this.forcedPressure = level;
  }

  /**
   * Sample current host metrics and derive resource pressure level.
   */
  public getMetrics(): ResourceGovernorMetrics {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const freeMemGb = freeMem / (1024 * 1024 * 1024);
    const usedPercentage = ((totalMem - freeMem) / totalMem) * 100;

    const memoryUsage = process.memoryUsage();
    const processRssMb = memoryUsage.rss / (1024 * 1024);
    const processHeapMb = memoryUsage.heapUsed / (1024 * 1024);

    let pressureLevel: ResourcePressureLevel = 'NORMAL';
    let maxConcurrentTasks = 4;
    let maxConcurrentMissions = 2;

    if (this.forcedPressure) {
      pressureLevel = this.forcedPressure;
      if (pressureLevel === 'CRITICAL_MEMORY') {
        maxConcurrentTasks = 1;
        maxConcurrentMissions = 1;
      } else if (pressureLevel === 'LOW_MEMORY') {
        maxConcurrentTasks = 2;
        maxConcurrentMissions = 1;
      }
    } else if (freeMemGb < 0.6 || usedPercentage > 94) {
      pressureLevel = 'CRITICAL_MEMORY';
      maxConcurrentTasks = 1;
      maxConcurrentMissions = 1;
    } else if (freeMemGb < 1.5 || usedPercentage > 88) {
      pressureLevel = 'LOW_MEMORY';
      maxConcurrentTasks = 2;
      maxConcurrentMissions = 1;
    }

    if (pressureLevel !== this.currentPressure) {
      this.logger?.warn(`Resource pressure transitioned: ${this.currentPressure} -> ${pressureLevel} (${freeMemGb.toFixed(2)} GB free)`);
      this.currentPressure = pressureLevel;

      if (this.eventBus) {
        this.eventBus.emit('resource.governance.pressure', {
          state: pressureLevel,
          freeMemoryGb: freeMemGb,
          timestamp: new Date().toISOString()
        });
      }
    }

    return {
      totalMemoryBytes: totalMem,
      freeMemoryBytes: freeMem,
      freeMemoryGb: freeMemGb,
      usedMemoryPercentage: usedPercentage,
      processRssMb,
      processHeapMb,
      pressureLevel,
      maxConcurrentTasks,
      maxConcurrentMissions,
    };
  }

  public checkResources(): ResourceGovernorMetrics {
    return this.getMetrics();
  }

  public isConstrained(): boolean {
    return this.currentPressure !== 'NORMAL';
  }

  /**
   * Hardware-aware policy for Phase 24 multimodal workloads.
   */
  public getMultimodalWorkloadPolicy(pressureLevel?: ResourcePressureLevel): {
    allowHeavyVlm: boolean;
    maxConcurrentStreams: number;
    pauseNonEssentialVision: boolean;
    maxImageDimension: number;
  } {
    const level = pressureLevel || this.getMetrics().pressureLevel;
    if (level === 'CRITICAL_MEMORY') {
      return {
        allowHeavyVlm: false,
        maxConcurrentStreams: 1,
        pauseNonEssentialVision: true,
        maxImageDimension: 640,
      };
    }
    if (level === 'LOW_MEMORY') {
      return {
        allowHeavyVlm: false,
        maxConcurrentStreams: 1,
        pauseNonEssentialVision: false,
        maxImageDimension: 1024,
      };
    }
    return {
      allowHeavyVlm: true,
      maxConcurrentStreams: 4,
      pauseNonEssentialVision: false,
      maxImageDimension: 1920,
    };
  }
}
