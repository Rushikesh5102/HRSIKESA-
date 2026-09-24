/**
 * HṚṢĪKEŚA (हृषीकेश) — Self-Observation Engine
 */

import { EventBus } from '../../core/events/event-bus.js';
import { ILogger } from '../../core/logging/logger.types.js';
import { SelfImprovementRepository } from '../repositories/self-improvement.repository.js';
import { ISelfObservation } from '../interfaces/self-improvement.types.js';

export class SelfObservationEngine {
  private readonly repository: SelfImprovementRepository;
  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;
  private isListening = false;

  constructor(repository: SelfImprovementRepository, eventBus?: EventBus, logger?: ILogger) {
    this.repository = repository;
    this.eventBus = eventBus;
    this.logger = logger?.child('SelfObservationEngine');
  }

  public initialize(): void {
    if (this.isListening || !this.eventBus) return;

    this.eventBus.on('tool.execution.completed', (payload: any) => {
      if (!payload.success) {
        this.recordObservation({
          source: 'ToolBus',
          category: 'TOOL_FAILURE',
          metricName: 'tool_execution_error',
          metricValue: 1,
          details: { toolId: payload.toolId, durationMs: payload.durationMs, error: payload.error },
          level: 'ERROR',
        });
      }
    });

    this.eventBus.on('agent.task_failed', (payload: any) => {
      this.recordObservation({
        source: 'AgentWorkforce',
        category: 'TASK_FAILURE',
        metricName: 'agent_task_failed',
        metricValue: 1,
        details: { taskId: payload.taskId, agentId: payload.agentId, error: payload.error },
        level: 'ERROR',
      });
    });

    this.eventBus.on('company.incident_created', (payload: any) => {
      this.recordObservation({
        companyId: payload.companyId,
        source: 'CompanyOS',
        category: 'COMPANY_INCIDENT',
        metricName: 'incident_created',
        metricValue: 1,
        details: { incidentId: payload.incidentId, severity: payload.severity, title: payload.title },
        level: payload.severity === 'SEV1' || payload.severity === 'SEV2' ? 'CRITICAL' : 'WARN',
      });
    });

    this.isListening = true;
    this.logger?.info('SelfObservationEngine event listeners initialized.');
  }

  public recordObservation(input: {
    id?: string;
    companyId?: string;
    source: string;
    category: string;
    metricName?: string;
    metricValue?: number;
    details: Record<string, unknown>;
    level: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
    timestamp?: string;
  }): ISelfObservation {
    const redactedDetails = this.redactSecrets(input.details);
    const obs: ISelfObservation = {
      id: input.id || `obs_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      companyId: input.companyId,
      source: input.source,
      category: input.category,
      metricName: input.metricName,
      metricValue: input.metricValue,
      details: redactedDetails,
      level: input.level,
      timestamp: input.timestamp || new Date().toISOString(),
    };

    this.repository.createObservation(obs);
    this.eventBus?.emit('self.observation_recorded', {
      observationId: obs.id,
      source: obs.source,
      category: obs.category,
      level: obs.level,
      timestamp: obs.timestamp,
    });

    return obs;
  }

  private redactSecrets(details: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = ['password', 'secret', 'token', 'apikey', 'api_key', 'authorization', 'bearer', 'credential'];
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(details)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some((s) => lowerKey.includes(s))) {
        result[key] = '[REDACTED_SECRET]';
      } else if (typeof value === 'string' && (value.startsWith('sk-') || value.startsWith('Bearer '))) {
        result[key] = '[REDACTED_SECRET]';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.redactSecrets(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }

    return result;
  }
}
