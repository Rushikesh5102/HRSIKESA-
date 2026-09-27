/**
 * HṚṢĪKEŚA (हृषीकेश) — Independent Supervisor Types & Contracts
 */

import {
  EvolutionObjective,
  EvolutionExperiment,
  EvolutionSupervisorReview,
  SupervisorName,
  SupervisorVote,
  EvolutionTestResults,
  EvolutionBenchmarkResults,
  EvolutionSecurityResults,
} from '../types/evolution.types.js';

export interface SupervisorEvidence {
  objective: EvolutionObjective;
  experiment: EvolutionExperiment;
  baselineCommit: string;
  diff: string;
  changedFiles: string[];
  testResults: EvolutionTestResults;
  benchmarkResults: EvolutionBenchmarkResults;
  securityResults: EvolutionSecurityResults;
  resourceUsage: Record<string, unknown>;
  filesystemActivity: string[];
  processActivity: string[];
  networkActivity: string[];
  experimentHistory: Array<{ experimentNumber: number; decision: string; hypothesis: string }>;
  rollbackHistory: string[];
}

export interface ISupervisorEvaluator {
  readonly name: SupervisorName;
  readonly roleFocus: string;
  evaluate(evidence: SupervisorEvidence): Promise<EvolutionSupervisorReview>;
}

export interface SupervisorQuorumDecision {
  passed: boolean;
  overallVote: SupervisorVote;
  reviews: Record<SupervisorName, EvolutionSupervisorReview>;
  hasEmergencyStop: boolean;
  hasPause: boolean;
  emergencyStopReason?: string;
  summary: string;
}
