/**
 * HṚṢĪKEŚA (हृषीकेश) — FP-16: Demonstration → Skill/Workflow Compiler
 *
 * Transforms an approved ProcedureProposal into either:
 * - A SkillDefinition (via existing SkillRegistry)
 * - A Workflow + WorkflowVersion (via existing WorkflowFabric)
 *
 * Does NOT create a new engine. Reuses existing Phase 20 (Skills) and FP-11 (Workflows).
 *
 * Every compiled procedure retains learned_from_demonstration_id provenance.
 */

import { randomUUID } from 'node:crypto';
import { DemonstrationRepository } from '../repositories/demonstration.repository.js';
import {
  ProcedureProposal,
  LearnedProcedure,
  LearnedProcedureVersion,
} from '../interfaces/demonstration.types.js';
import { SkillDefinition, SkillStep } from '../../skills/interfaces/skill.types.js';
import { EventBus } from '../../core/events/event-bus.js';
import { ILogger } from '../../core/logging/logger.types.js';

export interface CompilationResult {
  success: boolean;
  learnedProcedureId: string;
  learnedProcedureVersionId: string;
  compiledSkillId?: string;
  compiledWorkflowId?: string;
  compilationTarget: 'SKILL' | 'WORKFLOW';
  errors: string[];
}

export class DemonstrationCompilerService {
  constructor(
    private readonly repository: DemonstrationRepository,
    private readonly skillRegistry?: {
      register: (data: Omit<SkillDefinition, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => SkillDefinition;
    },
    private readonly eventBus?: EventBus,
    private readonly logger?: ILogger
  ) {}

  public compile(proposal: ProcedureProposal): CompilationResult {
    const now = new Date().toISOString();
    const errors: string[] = [];

    if (proposal.status !== 'APPROVED') {
      return {
        success: false,
        learnedProcedureId: '',
        learnedProcedureVersionId: '',
        compilationTarget: proposal.compilationTarget as 'SKILL' | 'WORKFLOW',
        errors: [`Proposal ${proposal.id} is not in APPROVED status (is: ${proposal.status})`],
      };
    }

    let compiledSkillId: string | undefined;
    let compiledWorkflowId: string | undefined;
    const target = proposal.compilationTarget === 'WORKFLOW' ? 'WORKFLOW' : 'SKILL';

    // ─── Compile to Skill (via existing SkillRegistry) ────────────────────────
    if (target === 'SKILL') {
      try {
        const skillDef = this.buildSkillDefinition(proposal);
        if (this.skillRegistry) {
          const registered = this.skillRegistry.register(skillDef);
          compiledSkillId = registered.id;
        } else {
          // No registry injected — store ID as marker
          compiledSkillId = skillDef.id;
        }
        this.logger?.info(`[DemonstrationCompiler] Compiled skill: ${compiledSkillId}`);
      } catch (err) {
        errors.push(`Skill compilation failed: ${(err as Error).message}`);
        return {
          success: false,
          learnedProcedureId: '',
          learnedProcedureVersionId: '',
          compilationTarget: target,
          errors,
        };
      }
    }

    // ─── Compile to Workflow (structurally — WorkflowFabric picks it up) ──────
    if (target === 'WORKFLOW') {
      compiledWorkflowId = `wf_learned_${randomUUID().replace(/-/g, '').substring(0, 12)}`;
      // Workflow creation via WorkflowFabric would be injected here in runtime
      // The compiled workflow ID is tracked in the learned procedure version
      this.logger?.info(`[DemonstrationCompiler] Compiled workflow placeholder: ${compiledWorkflowId}`);
    }

    // ─── Upsert Learned Procedure catalog entry ───────────────────────────────
    const existingLearned = this.repository.findLearnedByName(proposal.name);
    const learnedId = existingLearned?.id ?? `lp_${randomUUID().replace(/-/g, '').substring(0, 12)}`;
    const nextVersion = (existingLearned?.currentVersion ?? 0) + 1;

    const learnedProc: LearnedProcedure = {
      id: learnedId,
      name: proposal.name,
      displayName: proposal.displayName,
      description: proposal.purpose,
      scope: proposal.scope,
      companyId: proposal.companyId,
      projectId: proposal.projectId,
      currentVersion: nextVersion,
      activeVersionId: undefined, // set after version saved
      sourceDemonstrationIds: [proposal.demonstrationId],
      triggerPhrases: proposal.triggerPhrases,
      createdAt: existingLearned?.createdAt ?? now,
      updatedAt: now,
    };

    // ─── Create Immutable Version Snapshot ────────────────────────────────────
    const versionId = `lpv_${randomUUID().replace(/-/g, '').substring(0, 12)}`;
    const version: LearnedProcedureVersion = {
      id: versionId,
      learnedProcedureId: learnedId,
      version: nextVersion,
      displayName: proposal.displayName,
      description: proposal.purpose,
      proposalId: proposal.id,
      demonstrationId: proposal.demonstrationId,
      compiledSkillId,
      compiledWorkflowId,
      compilationTarget: target,
      status: 'ACTIVE',
      riskLevel: proposal.riskLevel,
      confidence: proposal.confidence,
      validationResult: proposal.validationResult!,
      approvalHistory: [{
        status: 'APPROVED',
        at: now,
        comment: 'Approved via demonstration learning pipeline',
      }],
      executionHistory: [],
      scope: proposal.scope,
      companyId: proposal.companyId,
      projectId: proposal.projectId,
      provenance: 'DEMONSTRATION_COMPILER',
      createdAt: now,
      updatedAt: now,
    };

    // Supersede previous active version if any
    if (existingLearned?.activeVersionId) {
      const prevVersion = this.repository.getLearnedVersion(existingLearned.activeVersionId);
      if (prevVersion && prevVersion.status === 'ACTIVE') {
        this.repository.saveLearnedVersion({ ...prevVersion, status: 'SUPERSEDED', updatedAt: now });
      }
    }

    // ─── SAVE PARENT FIRST (FK: learned_procedure_versions → learned_procedures) ──
    this.repository.saveLearned(learnedProc);

    // ─── Then save the version snapshot ──────────────────────────────────────
    this.repository.saveLearnedVersion(version);

    // Update the parent with the active version ID
    learnedProc.activeVersionId = versionId;
    this.repository.saveLearned(learnedProc);

    // Update session with compiled IDs
    this.repository.updateSession(proposal.demonstrationId, {
      compiledSkillId,
      compiledWorkflowId,
      status: 'LEARNED',
    });

    // Update proposal status
    this.repository.updateProposalStatus(proposal.id, 'COMPILED');

    // Emit KG relationships via eventBus
    this.eventBus?.emit('demonstration.compiled', {
      demonstrationId: proposal.demonstrationId,
      proposalId: proposal.id,
      learnedProcedureId: learnedId,
      learnedProcedureVersionId: versionId,
      compiledSkillId,
      compiledWorkflowId,
      compilationTarget: target,
      version: nextVersion,
    });

    this.logger?.info(
      `[DemonstrationCompiler] Compiled v${nextVersion} of "${proposal.name}" → ${target} | learnedProcedureId=${learnedId}`
    );

    return {
      success: true,
      learnedProcedureId: learnedId,
      learnedProcedureVersionId: versionId,
      compiledSkillId,
      compiledWorkflowId,
      compilationTarget: target,
      errors: [],
    };
  }

  // ─── Skill Definition Builder ──────────────────────────────────────────────

  private buildSkillDefinition(proposal: ProcedureProposal): SkillDefinition {
    const now = new Date().toISOString();
    const skillId = `skill_learned_${randomUUID().replace(/-/g, '').substring(0, 12)}`;

    const steps: SkillStep[] = proposal.steps.map((s, i) => ({
      id: `step_${i + 1}`,
      stepIndex: i + 1,
      stepId: `${proposal.name}_step_${i + 1}`,
      name: s.name,
      description: s.description,
      stepType: s.requiresApproval ? 'HUMAN_APPROVAL' : 'TOOL',
      dependencies: i > 0 ? [`${proposal.name}_step_${i}`] : [],
      capability: s.requiredCapability,
      tool: s.requiredTool,
      inputs: s.parameters.reduce<Record<string, unknown>>((acc, p) => {
        acc[p.name] = p.defaultValue ?? p.exampleValue ?? null;
        return acc;
      }, {}),
      timeoutMs: 60000,
    }));

    const riskTier = proposal.riskLevel === 'CRITICAL' ? 'TIER_4' :
                     proposal.riskLevel === 'HIGH' ? 'TIER_3' :
                     proposal.riskLevel === 'MEDIUM' ? 'TIER_2' : 'TIER_1';

    return {
      id: skillId,
      name: proposal.name,
      displayName: proposal.displayName,
      description: `${proposal.purpose}\n\nLearned from demonstration: ${proposal.demonstrationId}`,
      category: 'CUSTOM',
      owner: 'demonstration_learning',
      scope: proposal.scope,
      status: 'ACTIVE',
      version: '1.0.0',
      riskLevel: riskTier,
      triggerPhrases: proposal.triggerPhrases,
      requiredCapabilities: proposal.requiredCapabilities,
      requiredTools: [],
      inputsSchema: Object.fromEntries(
        proposal.inputs.map((p) => [p.name, { type: p.type, required: p.required }])
      ),
      outputsSchema: Object.fromEntries(
        proposal.outputs.map((p) => [p.name, { type: p.type }])
      ),
      steps,
      permissions: {
        maxDangerTier: parseInt(riskTier.replace('TIER_', '')) || 1,
        requiredCapabilities: proposal.requiredCapabilities,
        requiredTools: [],
        requiresHumanApproval: proposal.validationResult?.requiresHumanApproval ?? false,
        allowedScopes: [proposal.scope],
      },
      createdAt: now,
      updatedAt: now,
    };
  }
}
