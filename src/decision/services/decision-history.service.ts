/**
 * HṚṢĪKEŚA (हृषीकेश) — Decision History & Review Service
 *
 * FP-18: Immutably preserves decision history and orchestrates structured
 * decision reviews against newer evidence or changed assumptions.
 */

import { DecisionRepository } from '../repositories/decision.repository.js';
import {
  DecisionRecord,
  DecisionReview,
  ResearchCase,
  EvaluationCriterion,
  ProposedAction,
} from '../interfaces/decision.types.js';

export class DecisionHistoryService {
  private readonly repo: DecisionRepository;

  constructor(repo: DecisionRepository) {
    this.repo = repo;
  }

  /**
   * Records a formal, immutable decision.
   */
  public recordDecision(params: {
    caseId: string;
    companyId?: string;
    projectId?: string;
    context: string;
    objective: string;
    optionsConsidered: { id: string; name: string; summary: string }[];
    criteria: EvaluationCriterion[];
    evidenceSummary: string;
    assumptions: string[];
    selectedOption: { id: string; name: string };
    rationale: string;
    approver: string;
    supersededDecisionId?: string;
    resultingActions?: ProposedAction[];
  }): DecisionRecord {
    // If superseding an older decision, mark the old one as SUPERSEDED
    if (params.supersededDecisionId) {
      const old = this.repo.getDecisionRecordById(params.supersededDecisionId);
      if (old) {
        this.repo.updateDecisionStatus(old.id, 'SUPERSEDED', params.caseId);
      }
    }

    const record: DecisionRecord = {
      id: `dec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      caseId: params.caseId,
      companyId: params.companyId,
      projectId: params.projectId,
      context: params.context,
      objective: params.objective,
      optionsConsidered: params.optionsConsidered,
      criteria: params.criteria,
      evidenceSummary: params.evidenceSummary,
      assumptions: params.assumptions,
      selectedOption: params.selectedOption,
      rationale: params.rationale,
      approver: params.approver,
      timestamp: new Date().toISOString(),
      supersededDecisionId: params.supersededDecisionId,
      resultingActions: params.resultingActions || [],
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return this.repo.createDecisionRecord(record);
  }

  /**
   * Reviews a previous decision against newer evidence, changed constraints, or user prompt.
   */
  public reviewDecision(
    decisionId: string,
    newEvidenceCase: ResearchCase,
    trigger: DecisionReview['reviewTrigger'] = 'NEW_EVIDENCE'
  ): DecisionReview {
    const existing = this.repo.getDecisionRecordById(decisionId);
    if (!existing) {
      throw new Error(`DecisionRecord [${decisionId}] not found for review`);
    }

    // Inspect if new claims contradict original assumptions
    const changedAssumptions: string[] = [];
    const changedConstraints: string[] = [];
    const contradictionsIdentified: string[] = [];

    const newClaims = newEvidenceCase.claims || [];
    for (const c of newClaims) {
      if (c.uncertainty === 'CONTRADICTED' || c.uncertainty === 'OUTDATED') {
        contradictionsIdentified.push(`Claim "${c.subject} ${c.predicate} ${c.object}" flagged as ${c.uncertainty}`);
      }
    }

    // Check if new evidence contradicts original selected option
    const selectedOptionContradicted = newEvidenceCase.contradictions?.some(
      (ct) =>
        ct.claimA.subject.toLowerCase().includes(existing.selectedOption.name.toLowerCase()) ||
        ct.claimB.subject.toLowerCase().includes(existing.selectedOption.name.toLowerCase())
    );

    let reviewWarranted = false;
    let recommendation: DecisionReview['recommendation'] = 'MAINTAIN';
    let rationale = 'Original decision remains grounded and consistent with current evidence.';

    if (selectedOptionContradicted || contradictionsIdentified.length > 0) {
      reviewWarranted = true;
      recommendation = 'UPDATE';
      rationale = `New evidence detected ${contradictionsIdentified.length} discrepancies or contradictions directly affecting ${existing.selectedOption.name}. Formal re-evaluation recommended.`;
      this.repo.updateDecisionStatus(existing.id, 'UNDER_REVIEW');
    }

    const review: DecisionReview = {
      id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      decisionId,
      reviewTrigger: trigger,
      originalEvidenceSummary: existing.evidenceSummary,
      newEvidenceSummary: newClaims.slice(0, 5).map((cl) => `"${cl.quote}"`).join('; ') || 'No new claims',
      changedAssumptions,
      changedConstraints,
      contradictionsIdentified,
      reviewWarranted,
      recommendation,
      rationale,
      createdAt: new Date().toISOString(),
    };

    return this.repo.createDecisionReview(review);
  }

  public getDecisionById(id: string): DecisionRecord | null {
    return this.repo.getDecisionRecordById(id);
  }

  public listDecisions(filters?: { status?: string; companyId?: string; projectId?: string; limit?: number }): DecisionRecord[] {
    return this.repo.listDecisionRecords(filters);
  }
}
