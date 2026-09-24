/**
 * HṚṢĪKEŚA (हृषीकेश) — Company Incident Manager
 *
 * Manages SRE incidents across the lifecycle:
 * DETECTED -> TRIAGED -> ASSIGNED -> INVESTIGATING -> MITIGATING -> VERIFYING -> RESOLVED -> POSTMORTEM
 *
 * Garuḍa owns operational health; Vighna verifies remediation.
 */

import { randomUUID } from 'crypto';
import { CompanyOperationsRepository } from '../repositories/company-operations.repository.js';
import {
  ICompanyIncident,
  IncidentSeverity,
  IncidentStatus
} from '../interfaces/company-operations.types.js';

export interface CreateIncidentInput {
  companyId: string;
  title: string;
  severity: IncidentSeverity;
  source?: string;
  affectedSystem: string;
  ownerAgentId?: string;
  metadata?: Record<string, unknown>;
}

export class CompanyIncidentManager {
  constructor(private readonly opsRepo: CompanyOperationsRepository) {}

  public createIncident(input: CreateIncidentInput): ICompanyIncident {
    const now = new Date().toISOString();
    const incident: ICompanyIncident = {
      id: (input as any).id || randomUUID(),
      companyId: input.companyId,
      title: input.title,
      severity: input.severity,
      source: input.source || 'SYSTEM',
      affectedSystem: input.affectedSystem,
      detectedTime: now,
      ownerAgentId: input.ownerAgentId || 'garuda',
      status: 'DETECTED',
      actions: ['Incident detected by SRE telemetry'],
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now
    };

    const created = this.opsRepo.createIncident(incident);

    // Record activity
    this.opsRepo.recordActivity({
      id: randomUUID(),
      companyId: created.companyId,
      actor: created.ownerAgentId,
      action: 'INCIDENT_DETECTED',
      target: `incident:${created.id}`,
      result: created.severity,
      evidence: `Incident detected on system ${created.affectedSystem}`,
      timestamp: now
    });

    return created;
  }

  public advanceIncidentStatus(
    incidentId: string,
    status: IncidentStatus,
    actionLog?: string,
    resolution?: string,
    evidence?: string
  ): ICompanyIncident {
    const incident = this.opsRepo.getIncidentById(incidentId);
    if (!incident) {
      throw new Error(`Incident with id '${incidentId}' not found.`);
    }

    const updatedActions = actionLog ? [...incident.actions, actionLog] : incident.actions;

    this.opsRepo.updateIncidentStatus(incidentId, status, resolution, evidence);

    const updated: ICompanyIncident = {
      ...incident,
      status,
      actions: updatedActions,
      resolution: resolution ?? incident.resolution,
      evidence: evidence ?? incident.evidence,
      updatedAt: new Date().toISOString()
    };

    // If resolved, record resolution activity
    if (status === 'RESOLVED') {
      this.opsRepo.recordActivity({
        id: randomUUID(),
        companyId: incident.companyId,
        actor: 'vighna',
        action: 'INCIDENT_RESOLVED',
        target: `incident:${incident.id}`,
        result: 'RESOLVED',
        evidence: evidence || resolution || 'Incident mitigation verified',
        timestamp: new Date().toISOString()
      });
    }

    return updated;
  }

  public getActiveIncidents(companyId: string): ICompanyIncident[] {
    const incidents = this.opsRepo.listIncidentsByCompany(companyId);
    return incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'POSTMORTEM');
  }

  public listIncidents(companyId: string): ICompanyIncident[] {
    return this.opsRepo.listIncidentsByCompany(companyId);
  }

  public transitionIncident(
    incidentId: string,
    status: IncidentStatus,
    _actor = 'Garuḍa',
    reason?: string,
    evidence?: string
  ): ICompanyIncident {
    return this.advanceIncidentStatus(incidentId, status, reason, evidence);
  }

  private readonly recentAlerts: Map<string, number> = new Map();

  public raiseAlert(input: {
    companyId: string;
    source: string;
    title: string;
    severity: IncidentSeverity;
    metricKey: string;
    threshold: number;
    currentValue: number;
  }): { created: boolean; deduplicated: boolean; incident?: ICompanyIncident } {
    const key = `${input.companyId}:${input.metricKey}:${input.severity}`;
    const lastTime = this.recentAlerts.get(key) || 0;
    const now = Date.now();

    // Deduplicate alerts within 60-second window
    if (now - lastTime < 60000) {
      return { created: false, deduplicated: true };
    }

    this.recentAlerts.set(key, now);
    const incident = this.createIncident({
      companyId: input.companyId,
      title: input.title,
      severity: input.severity,
      source: input.source,
      affectedSystem: input.metricKey
    });

    return { created: true, deduplicated: false, incident };
  }
}
