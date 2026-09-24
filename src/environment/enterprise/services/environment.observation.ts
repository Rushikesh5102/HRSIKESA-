/**
 * HṚṢĪKEŚA (हृषीकेश) — Environment Observation Engine
 *
 * Phase 23: Observes remote & local execution targets (resources, processes, active channels, health).
 * Emits health and state updates across the EventBus.
 */

import { EventBus } from '../../../core/events/event-bus.js';
import {
  IEnvironmentAdapter,
  EnvironmentHealthRecord,
  RemoteProcessInfo,
  EnvironmentFingerprint,
} from '../interfaces/environment.types.js';

export class EnvironmentObservationEngine {
  private eventBus?: EventBus;

  constructor(eventBus?: EventBus) {
    this.eventBus = eventBus;
  }

  async observeHealth(adapter: IEnvironmentAdapter): Promise<EnvironmentHealthRecord> {
    const health = await adapter.healthCheck();
    if (this.eventBus) {
      if (health.status === 'DEGRADED') {
        this.eventBus.emit('environment.degraded', { environmentId: adapter.environmentId, health });
      } else if (health.status === 'UNAVAILABLE') {
        this.eventBus.emit('environment.failed', { environmentId: adapter.environmentId, health });
      }
    }
    return health;
  }

  async observeProcesses(adapter: IEnvironmentAdapter): Promise<RemoteProcessInfo[]> {
    return adapter.listProcesses();
  }

  async observeFingerprint(adapter: IEnvironmentAdapter): Promise<EnvironmentFingerprint> {
    return adapter.getFingerprint();
  }
}
