/**
 * HṚṢĪKEŚA (हृषीकेश) — Creation Repository
 *
 * FP-17: SQLite persistence for CreationJobs, Artifacts, Iterations,
 * Verifications, and Reference Assets.
 *
 * Critical SQLite robustness rules implemented:
 * 1. Explicit INSERT vs UPDATE split (avoid INSERT OR REPLACE cascading wipes)
 * 2. Strict undefined-to-null guards for all JSON fields
 * 3. Atomic transactions and foreign-key integrity
 */

import { DatabaseSync } from 'node:sqlite';
import {
  CreationJob,
  CreationArtifact,
  CreationIteration,
  DesignContext,
  ReferenceAsset,
} from '../interfaces/creation.types.js';

export class CreationRepository {
  constructor(private readonly db: DatabaseSync) {}

  // ─── Creation Jobs ──────────────────────────────────────────────────────────

  public saveJob(job: CreationJob): CreationJob {
    const existing = this.getJob(job.id);
    const now = new Date().toISOString();

    if (existing) {
      const stmt = this.db.prepare(`
        UPDATE creation_jobs SET
          owner = ?,
          company_id = ?,
          project_id = ?,
          type = ?,
          objective = ?,
          prompt = ?,
          status = ?,
          progress_percentage = ?,
          input_artifacts_json = ?,
          model_provider = ?,
          selected_model = ?,
          application_or_tool = ?,
          workflow_id = ?,
          skill_id = ?,
          parameters_json = ?,
          constraints_json = ?,
          style = ?,
          design_context_id = ?,
          current_iteration = ?,
          max_iterations = ?,
          cost_estimate_usd = ?,
          actual_cost_usd = ?,
          requires_approval = ?,
          approval_status = ?,
          approved_by = ?,
          approved_at = ?,
          verification_json = ?,
          provenance_json = ?,
          license_information = ?,
          error_message = ?,
          updated_at = ?
        WHERE id = ?
      `);

      stmt.run(
        job.owner,
        job.companyId ?? null,
        job.projectId ?? null,
        job.type,
        job.objective,
        job.prompt,
        job.status,
        job.progressPercentage,
        JSON.stringify(job.inputArtifacts ?? []),
        job.modelProvider ?? null,
        job.selectedModel ?? null,
        job.applicationOrTool ?? null,
        job.workflowId ?? null,
        job.skillId ?? null,
        JSON.stringify(job.parameters ?? {}),
        JSON.stringify(job.constraints ?? {}),
        job.style ?? null,
        job.designContextId ?? null,
        job.currentIteration,
        job.maxIterations,
        job.costEstimateUsd ?? null,
        job.actualCostUsd ?? null,
        job.requiresApproval ? 1 : 0,
        job.approvalStatus ?? null,
        job.approvedBy ?? null,
        job.approvedAt ?? null,
        job.verification ? JSON.stringify(job.verification) : null,
        JSON.stringify(job.provenance ?? {}),
        job.licenseInformation ?? 'PROPRIETARY',
        job.errorMessage ?? null,
        now,
        job.id
      );
    } else {
      const stmt = this.db.prepare(`
        INSERT INTO creation_jobs (
          id, owner, company_id, project_id, type, objective, prompt,
          status, progress_percentage, input_artifacts_json, model_provider,
          selected_model, application_or_tool, workflow_id, skill_id,
          parameters_json, constraints_json, style, design_context_id,
          current_iteration, max_iterations, cost_estimate_usd, actual_cost_usd,
          requires_approval, approval_status, approved_by, approved_at,
          verification_json, provenance_json, license_information, error_message,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?
        )
      `);

      stmt.run(
        job.id,
        job.owner,
        job.companyId ?? null,
        job.projectId ?? null,
        job.type,
        job.objective,
        job.prompt,
        job.status,
        job.progressPercentage,
        JSON.stringify(job.inputArtifacts ?? []),
        job.modelProvider ?? null,
        job.selectedModel ?? null,
        job.applicationOrTool ?? null,
        job.workflowId ?? null,
        job.skillId ?? null,
        JSON.stringify(job.parameters ?? {}),
        JSON.stringify(job.constraints ?? {}),
        job.style ?? null,
        job.designContextId ?? null,
        job.currentIteration,
        job.maxIterations,
        job.costEstimateUsd ?? null,
        job.actualCostUsd ?? null,
        job.requiresApproval ? 1 : 0,
        job.approvalStatus ?? null,
        job.approvedBy ?? null,
        job.approvedAt ?? null,
        job.verification ? JSON.stringify(job.verification) : null,
        JSON.stringify(job.provenance ?? {}),
        job.licenseInformation ?? 'PROPRIETARY',
        job.errorMessage ?? null,
        job.createdAt || now,
        job.updatedAt || now
      );
    }

    return this.getJob(job.id)!;
  }

  public getJob(id: string): CreationJob | null {
    const row = this.db.prepare('SELECT * FROM creation_jobs WHERE id = ?').get(id) as Record<string, any> | undefined;
    if (!row) return null;

    const artifacts = this.getArtifactsForJob(id);
    const iterations = this.getIterationsForJob(id);

    return {
      id: row.id,
      owner: row.owner,
      companyId: row.company_id ?? undefined,
      projectId: row.project_id ?? undefined,
      type: row.type,
      objective: row.objective,
      prompt: row.prompt,
      status: row.status,
      progressPercentage: row.progress_percentage,
      inputArtifacts: JSON.parse(row.input_artifacts_json || '[]'),
      outputArtifacts: artifacts,
      modelProvider: row.model_provider ?? undefined,
      selectedModel: row.selected_model ?? undefined,
      applicationOrTool: row.application_or_tool ?? undefined,
      workflowId: row.workflow_id ?? undefined,
      skillId: row.skill_id ?? undefined,
      parameters: JSON.parse(row.parameters_json || '{}'),
      constraints: JSON.parse(row.constraints_json || '{}'),
      style: row.style ?? undefined,
      designContextId: row.design_context_id ?? undefined,
      designContext: row.design_context_id ? this.getDesignContext(row.design_context_id) ?? undefined : undefined,
      iterations,
      currentIteration: row.current_iteration,
      maxIterations: row.max_iterations,
      costEstimateUsd: row.cost_estimate_usd ?? undefined,
      actualCostUsd: row.actual_cost_usd ?? undefined,
      requiresApproval: Boolean(row.requires_approval),
      approvalStatus: row.approval_status ?? undefined,
      approvedBy: row.approved_by ?? undefined,
      approvedAt: row.approved_at ?? undefined,
      verification: row.verification_json ? JSON.parse(row.verification_json) : undefined,
      provenance: JSON.parse(row.provenance_json || '{}'),
      licenseInformation: row.license_information || 'PROPRIETARY',
      errorMessage: row.error_message ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public listJobs(filter?: {
    owner?: string;
    companyId?: string;
    projectId?: string;
    type?: string;
    status?: string;
    limit?: number;
  }): CreationJob[] {
    let sql = 'SELECT id FROM creation_jobs WHERE 1=1';
    const params: any[] = [];

    if (filter?.owner) {
      sql += ' AND owner = ?';
      params.push(filter.owner);
    }
    if (filter?.companyId) {
      sql += ' AND company_id = ?';
      params.push(filter.companyId);
    }
    if (filter?.projectId) {
      sql += ' AND project_id = ?';
      params.push(filter.projectId);
    }
    if (filter?.type) {
      sql += ' AND type = ?';
      params.push(filter.type);
    }
    if (filter?.status) {
      sql += ' AND status = ?';
      params.push(filter.status);
    }

    sql += ' ORDER BY created_at DESC';
    if (filter?.limit) {
      sql += ' LIMIT ?';
      params.push(filter.limit);
    }

    const rows = this.db.prepare(sql).all(...params) as Array<{ id: string }>;
    return rows.map((r) => this.getJob(r.id)!).filter(Boolean);
  }

  public deleteJob(id: string): boolean {
    const res = this.db.prepare('DELETE FROM creation_jobs WHERE id = ?').run(id);
    return (res as any).changes > 0;
  }

  // ─── Creation Artifacts ─────────────────────────────────────────────────────

  public saveArtifact(artifact: CreationArtifact): CreationArtifact {
    const existing = this.db.prepare('SELECT id FROM creation_artifacts WHERE id = ?').get(artifact.id);
    const now = new Date().toISOString();

    if (existing) {
      const stmt = this.db.prepare(`
        UPDATE creation_artifacts SET
          job_id = ?,
          type = ?,
          name = ?,
          location = ?,
          format = ?,
          size_bytes = ?,
          dimensions_json = ?,
          duration_seconds = ?,
          mime_type = ?,
          sha256 = ?,
          version = ?,
          verified = ?,
          verification_json = ?,
          provenance_json = ?,
          license_info = ?,
          preview_url_or_path = ?,
          updated_at = ?
        WHERE id = ?
      `);

      stmt.run(
        artifact.jobId,
        artifact.type,
        artifact.name,
        artifact.location,
        artifact.format,
        artifact.sizeBytes,
        artifact.dimensions ? JSON.stringify(artifact.dimensions) : null,
        artifact.durationSeconds ?? null,
        artifact.mimeType,
        artifact.sha256 ?? null,
        artifact.version,
        artifact.verified ? 1 : 0,
        artifact.verificationResult ? JSON.stringify(artifact.verificationResult) : null,
        JSON.stringify(artifact.provenance ?? {}),
        artifact.licenseInfo || 'PROPRIETARY',
        artifact.previewUrlOrPath ?? null,
        now,
        artifact.id
      );
    } else {
      const stmt = this.db.prepare(`
        INSERT INTO creation_artifacts (
          id, job_id, type, name, location, format, size_bytes,
          dimensions_json, duration_seconds, mime_type, sha256,
          version, verified, verification_json, provenance_json,
          license_info, preview_url_or_path, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?
        )
      `);

      stmt.run(
        artifact.id,
        artifact.jobId,
        artifact.type,
        artifact.name,
        artifact.location,
        artifact.format,
        artifact.sizeBytes,
        artifact.dimensions ? JSON.stringify(artifact.dimensions) : null,
        artifact.durationSeconds ?? null,
        artifact.mimeType,
        artifact.sha256 ?? null,
        artifact.version,
        artifact.verified ? 1 : 0,
        artifact.verificationResult ? JSON.stringify(artifact.verificationResult) : null,
        JSON.stringify(artifact.provenance ?? {}),
        artifact.licenseInfo || 'PROPRIETARY',
        artifact.previewUrlOrPath ?? null,
        artifact.createdAt || now,
        artifact.updatedAt || now
      );
    }

    return this.getArtifact(artifact.id)!;
  }

  public getArtifact(id: string): CreationArtifact | null {
    const row = this.db.prepare('SELECT * FROM creation_artifacts WHERE id = ?').get(id) as Record<string, any> | undefined;
    if (!row) return null;

    return {
      id: row.id,
      jobId: row.job_id,
      type: row.type,
      name: row.name,
      location: row.location,
      format: row.format,
      sizeBytes: row.size_bytes,
      dimensions: row.dimensions_json ? JSON.parse(row.dimensions_json) : undefined,
      durationSeconds: row.duration_seconds ?? undefined,
      mimeType: row.mime_type,
      sha256: row.sha256 ?? undefined,
      version: row.version,
      verified: Boolean(row.verified),
      verificationResult: row.verification_json ? JSON.parse(row.verification_json) : undefined,
      provenance: JSON.parse(row.provenance_json || '{}'),
      licenseInfo: row.license_info || 'PROPRIETARY',
      previewUrlOrPath: row.preview_url_or_path ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public getArtifactsForJob(jobId: string): CreationArtifact[] {
    const rows = this.db.prepare('SELECT id FROM creation_artifacts WHERE job_id = ? ORDER BY version ASC').all(jobId) as Array<{ id: string }>;
    return rows.map((r) => this.getArtifact(r.id)!).filter(Boolean);
  }

  // ─── Iterations ─────────────────────────────────────────────────────────────

  public recordIteration(iteration: CreationIteration & { jobId: string }): void {
    const id = `${iteration.jobId}_iter_${iteration.iterationNumber}_${Date.now()}`;
    const stmt = this.db.prepare(`
      INSERT INTO creation_iterations (
        id, job_id, iteration_number, reason, modifications_requested,
        result_artifact_id, verification_json, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      iteration.jobId,
      iteration.iterationNumber,
      iteration.reason,
      iteration.modificationsRequested,
      iteration.resultArtifactId ?? null,
      iteration.verification ? JSON.stringify(iteration.verification) : null,
      iteration.timestamp || new Date().toISOString()
    );
  }

  public getIterationsForJob(jobId: string): CreationIteration[] {
    const rows = this.db.prepare('SELECT * FROM creation_iterations WHERE job_id = ? ORDER BY iteration_number ASC').all(jobId) as Array<Record<string, any>>;
    return rows.map((r) => ({
      iterationNumber: r.iteration_number,
      reason: r.reason,
      modificationsRequested: r.modifications_requested,
      resultArtifactId: r.result_artifact_id ?? undefined,
      verification: r.verification_json ? JSON.parse(r.verification_json) : undefined,
      timestamp: r.timestamp,
    }));
  }

  // ─── Design Contexts ────────────────────────────────────────────────────────

  public saveDesignContext(context: DesignContext): DesignContext {
    const existing = this.getDesignContext(context.id);
    const now = new Date().toISOString();

    if (existing) {
      const stmt = this.db.prepare(`
        UPDATE design_contexts SET
          project_id = ?,
          company_id = ?,
          name = ?,
          brand_identity_json = ?,
          visual_references_json = ?,
          spacing_rules_json = ?,
          accessibility_requirements_json = ?,
          updated_at = ?
        WHERE id = ?
      `);

      stmt.run(
        context.projectId ?? null,
        context.companyId ?? null,
        context.name,
        JSON.stringify(context.brandIdentity ?? {}),
        JSON.stringify(context.visualReferences ?? []),
        JSON.stringify(context.spacingRules ?? {}),
        JSON.stringify(context.accessibilityRequirements ?? {}),
        now,
        context.id
      );
    } else {
      const stmt = this.db.prepare(`
        INSERT INTO design_contexts (
          id, project_id, company_id, name,
          brand_identity_json, visual_references_json,
          spacing_rules_json, accessibility_requirements_json,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        context.id,
        context.projectId ?? null,
        context.companyId ?? null,
        context.name,
        JSON.stringify(context.brandIdentity ?? {}),
        JSON.stringify(context.visualReferences ?? []),
        JSON.stringify(context.spacingRules ?? {}),
        JSON.stringify(context.accessibilityRequirements ?? {}),
        context.createdAt || now,
        context.updatedAt || now
      );
    }

    return this.getDesignContext(context.id)!;
  }

  public getDesignContext(id: string): DesignContext | null {
    const row = this.db.prepare('SELECT * FROM design_contexts WHERE id = ?').get(id) as Record<string, any> | undefined;
    if (!row) return null;

    return {
      id: row.id,
      projectId: row.project_id ?? undefined,
      companyId: row.company_id ?? undefined,
      name: row.name,
      brandIdentity: JSON.parse(row.brand_identity_json || '{}'),
      visualReferences: JSON.parse(row.visual_references_json || '[]'),
      spacingRules: JSON.parse(row.spacing_rules_json || '{}'),
      accessibilityRequirements: JSON.parse(row.accessibility_requirements_json || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ─── Reference Assets ───────────────────────────────────────────────────────

  public saveReferenceAsset(jobId: string, asset: ReferenceAsset): void {
    const stmt = this.db.prepare(`
      INSERT INTO creation_reference_assets (
        id, job_id, source, owner, url_or_path, retrieval_time,
        license, intended_use, transformation_relationship, sha256, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      asset.id,
      jobId,
      asset.source,
      asset.owner ?? null,
      asset.urlOrPath,
      asset.retrievalTime,
      asset.license,
      asset.intendedUse,
      asset.transformationRelationship ?? null,
      asset.sha256 ?? null,
      new Date().toISOString()
    );
  }

  public getReferenceAssetsForJob(jobId: string): ReferenceAsset[] {
    const rows = this.db.prepare('SELECT * FROM creation_reference_assets WHERE job_id = ?').all(jobId) as Array<Record<string, any>>;
    return rows.map((r) => ({
      id: r.id,
      source: r.source,
      owner: r.owner ?? undefined,
      urlOrPath: r.url_or_path,
      retrievalTime: r.retrieval_time,
      license: r.license,
      intendedUse: r.intended_use,
      transformationRelationship: r.transformation_relationship ?? undefined,
      sha256: r.sha256 ?? undefined,
    }));
  }
}
