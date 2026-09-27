/**
 * FP-13 Workspace Observer
 *
 * Captures, normalizes, redacts, and caches multi-layer observations across
 * digital workspaces.
 */

import { IDigitalWorkspace } from '../workspaces/digital.workspace.interface.js';
import { WorkspaceObservation, ObservationLayer } from '../types/observation.types.js';
import { WorkspaceRepository } from '../repository/workspace.repository.js';
import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';
import { OperatorEventTopics } from '../types/operator.events.js';

export class WorkspaceObserver {
  constructor(
    private readonly repository?: WorkspaceRepository,
    _logger?: ILogger,
    private readonly eventBus?: EventBus
  ) {}

  public async observe(workspace: IDigitalWorkspace): Promise<WorkspaceObservation> {
    const rawObs = await workspace.observe();
    const redactedObs = this.redactSensitiveData(rawObs);

    if (this.repository) {
      this.repository.saveObservation(redactedObs);
    }

    if (this.eventBus) {
      this.eventBus.emit(OperatorEventTopics.OBSERVATION_CREATED, {
        workspaceId: workspace.workspaceId,
        observationId: redactedObs.observationId,
        layers: redactedObs.observedLayers,
        confidence: redactedObs.confidence,
        timestamp: redactedObs.capturedAt,
      });
    }

    return redactedObs;
  }

  public redactSensitiveData(obs: WorkspaceObservation): WorkspaceObservation {
    const sanitizedUiTree = obs.uiTree.map((node) => {
      if (node.isPassword || node.name.toLowerCase().includes('password') || node.name.toLowerCase().includes('token')) {
        return {
          ...node,
          value: '[REDACTED]',
        };
      }
      return node;
    });

    let sanitizedOcr = obs.ocrText;
    if (sanitizedOcr) {
      sanitizedOcr = sanitizedOcr.replace(/(password|token|bearer|key)\s*[:=]\s*\S+/gi, '$1: [REDACTED]');
    }

    return {
      ...obs,
      uiTree: sanitizedUiTree,
      ocrText: sanitizedOcr,
    };
  }

  public getObservationLayers(obs: WorkspaceObservation): ObservationLayer[] {
    return obs.observedLayers as ObservationLayer[];
  }
}
