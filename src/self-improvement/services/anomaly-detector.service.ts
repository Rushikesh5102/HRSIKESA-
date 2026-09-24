/**
 * HṚṢĪKEŚA (हृषीकेश) — Anomaly Detector Service
 */

import { EventBus } from '../../core/events/event-bus.js';
import { ILogger } from '../../core/logging/logger.types.js';
import { SelfImprovementRepository } from '../repositories/self-improvement.repository.js';
import { ISelfAnomaly, AnomalySeverity } from '../interfaces/self-improvement.types.js';

export class AnomalyDetectorService {
  private readonly repository: SelfImprovementRepository;
  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;

  constructor(repository: SelfImprovementRepository, eventBus?: EventBus, logger?: ILogger) {
    this.repository = repository;
    this.eventBus = eventBus;
    this.logger = logger?.child('AnomalyDetectorService');
  }

  public detectAnomalies(companyId?: string): ISelfAnomaly[] {
    const observations = this.repository.listObservations({ companyId, limit: 200 });
    const detected: ISelfAnomaly[] = [];

    // 1. Group error observations by component / category
    const errorClusters: Record<string, { count: number; ids: string[]; lastError: string }> = {};
    for (const obs of observations) {
      if (obs.level === 'ERROR' || obs.level === 'CRITICAL') {
        const key = `${obs.source}:${obs.category}`;
        if (!errorClusters[key]) {
          errorClusters[key] = { count: 0, ids: [], lastError: JSON.stringify(obs.details) };
        }
        errorClusters[key].count++;
        errorClusters[key].ids.push(obs.id);
      }
    }

    // 2. Check for threshold breach (>2 repeated errors)
    for (const [key, cluster] of Object.entries(errorClusters)) {
      if (cluster.count >= 2) {
        const [component, category] = key.split(':');
        const severity: AnomalySeverity = cluster.count >= 5 ? 'CRITICAL' : cluster.count >= 3 ? 'HIGH' : 'MEDIUM';
        const anomaly = this.recordAnomaly({
          companyId,
          title: `Repeated failures detected in ${component} (${category})`,
          component,
          severity,
          description: `Observed ${cluster.count} error events in ${category}. Details: ${cluster.lastError}`,
          evidenceSummary: `${cluster.count} failure events registered`,
          observationIds: cluster.ids,
        });
        detected.push(anomaly);
      }
    }

    return detected;
  }

  public recordAnomaly(input: {
    id?: string;
    companyId?: string;
    title: string;
    component: string;
    severity: AnomalySeverity;
    description: string;
    evidenceSummary: string;
    observationIds: string[];
  }): ISelfAnomaly {
    const anomaly: ISelfAnomaly = {
      id: input.id || `anom_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      companyId: input.companyId,
      title: input.title,
      component: input.component,
      severity: input.severity,
      description: input.description,
      evidenceSummary: input.evidenceSummary,
      observationIds: input.observationIds,
      status: 'ACTIVE',
      detectedAt: new Date().toISOString(),
    };

    this.repository.createAnomaly(anomaly);
    this.eventBus?.emit('self.anomaly_detected', {
      anomalyId: anomaly.id,
      component: anomaly.component,
      severity: anomaly.severity,
      title: anomaly.title,
      timestamp: anomaly.detectedAt,
    });

    this.logger?.warn(`Anomaly detected: [${anomaly.severity}] ${anomaly.title}`);
    return anomaly;
  }

  public resolveAnomaly(id: string, resolutionReason?: string): ISelfAnomaly | null {
    const resolvedAt = new Date().toISOString();
    this.repository.updateAnomalyStatus(id, 'RESOLVED', resolvedAt);
    const anom = this.repository.getAnomalyById(id);
    if (anom) {
      this.logger?.info(`Resolved anomaly [${id}]. Reason: ${resolutionReason || 'Remediated'}`);
      this.eventBus?.emit('self.anomaly_resolved', {
        anomalyId: anom.id,
        component: anom.component,
        resolvedAt,
      });
    }
    return anom;
  }
}
