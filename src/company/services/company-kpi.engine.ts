/**
 * HṚṢĪKEŚA (हृषीकेश) — Company KPI Engine
 *
 * Manages Key Performance Indicators, metric observations, trend calculations,
 * and provenance tracking across manual, system, research, customer, finance,
 * operations, product, and infrastructure data sources.
 */

import { randomUUID } from 'crypto';
import { CompanyOperationsRepository } from '../repositories/company-operations.repository.js';
import {
  ICompanyKpi,
  KpiCategory,
  MetricSource,
  MetricTrend
} from '../interfaces/company-operations.types.js';

export interface CreateKpiInput {
  companyId: string;
  name: string;
  category: KpiCategory;
  source: MetricSource;
  unit?: string;
  targetValue: number;
  initialValue?: number;
  ownerAgentId: string;
  deadline?: string;
  evidence?: string;
  metadata?: Record<string, unknown>;
}

export class CompanyKpiEngine {
  constructor(private readonly opsRepo: CompanyOperationsRepository) {}

  public createKpi(input: CreateKpiInput): ICompanyKpi {
    const now = new Date().toISOString();
    const initialVal = input.initialValue ?? 0;
    const delta = Number((initialVal - input.targetValue).toFixed(4));

    const kpi: ICompanyKpi = {
      id: (input as any).id || randomUUID(),
      companyId: input.companyId,
      name: input.name,
      category: input.category,
      source: input.source,
      unit: input.unit ?? '',
      targetValue: input.targetValue,
      currentValue: initialVal,
      delta,
      trend: 'STABLE',
      confidence: 1.0,
      ownerAgentId: input.ownerAgentId,
      deadline: input.deadline,
      evidence: input.evidence,
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now
    };

    return this.opsRepo.createKpi(kpi);
  }

  public recordObservation(
    kpiId: string,
    value: number,
    sourceOrActor?: any,
    notesOrSource?: string,
    evidenceOrNotes?: string,
    _evidence?: string
  ): ICompanyKpi {
    const kpi = this.opsRepo.getKpiById(kpiId);
    if (!kpi) {
      throw new Error(`KPI with id '${kpiId}' not found.`);
    }

    let source: MetricSource = 'SYSTEM';
    let notes: string | undefined;
    let evidence: string | undefined;

    if (sourceOrActor === 'RESEARCH' || sourceOrActor === 'MANUAL' || sourceOrActor === 'SYSTEM' || sourceOrActor === 'FINANCE' || sourceOrActor === 'PRODUCT') {
      source = sourceOrActor;
      notes = notesOrSource;
      evidence = evidenceOrNotes;
    } else if (notesOrSource === 'RESEARCH' || notesOrSource === 'MANUAL' || notesOrSource === 'SYSTEM' || notesOrSource === 'FINANCE' || notesOrSource === 'PRODUCT') {
      source = notesOrSource as MetricSource;
      notes = evidenceOrNotes;
      evidence = _evidence;
    } else {
      source = (sourceOrActor as MetricSource) || 'SYSTEM';
      notes = notesOrSource;
      evidence = evidenceOrNotes;
    }

    const now = new Date().toISOString();
    const prevValue = kpi.currentValue;
    const delta = Number((value - kpi.targetValue).toFixed(4));

    let trend: MetricTrend = 'STABLE';
    if (value > prevValue) trend = 'UP';
    else if (value < prevValue) trend = 'DOWN';

    // Calculate confidence based on source
    let confidence = 1.0;
    if (source === 'RESEARCH') confidence = 0.85;
    else if (source === 'MANUAL') confidence = 0.9;
    else if (source === 'SYSTEM' || source === 'FINANCE') confidence = 0.99;

    this.opsRepo.recordObservation({
      id: randomUUID(),
      kpiId,
      companyId: kpi.companyId,
      observedValue: value,
      source,
      notes,
      evidence,
      timestamp: now
    });

    this.opsRepo.updateKpiValue(kpiId, value, delta, trend, confidence, evidence);

    return {
      ...kpi,
      currentValue: value,
      delta,
      trend,
      confidence,
      evidence: evidence ?? kpi.evidence,
      updatedAt: now
    };
  }

  public getKpiSummary(companyId: string): {
    totalKpis: number;
    achievedKpis: number;
    underperformingKpis: number;
    kpis: ICompanyKpi[];
  } {
    const kpis = this.opsRepo.listKpisByCompany(companyId);
    let achieved = 0;
    let underperforming = 0;

    for (const k of kpis) {
      if (k.currentValue >= k.targetValue) {
        achieved++;
      } else if (k.currentValue < k.targetValue * 0.7) {
        underperforming++;
      }
    }

    return {
      totalKpis: kpis.length,
      achievedKpis: achieved,
      underperformingKpis: underperforming,
      kpis
    };
  }

  public registerKpi(input: any): ICompanyKpi {
    return this.createKpi({
      id: input.id,
      companyId: input.companyId,
      name: input.name,
      category: input.category,
      source: input.source,
      unit: input.unit,
      targetValue: input.targetValue,
      initialValue: input.currentValue ?? input.initialValue ?? 0,
      ownerAgentId: input.ownerAgentId ?? 'hrisekesa',
      deadline: input.deadline,
      evidence: input.evidence,
      metadata: input.metadata
    } as any);
  }
}
