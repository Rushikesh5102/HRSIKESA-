/**
 * HṚṢĪKEŚA (हृषीकेश) — Research & Web Intelligence Capability Adapter
 *
 * Phase 17: Research Intelligence Adapter
 * Integrates ResearchEngine with the HṚṢĪKEŚA Capability Registry and Tool Execution Bus.
 */

import { ICapabilityAdapter } from './capability.adapter.js';
import {
  CapabilityMetadata,
  CapabilityHealthCheckResult,
  CapabilityExecutionRequest,
  CapabilityExecutionResult,
} from '../interfaces/capability.types.js';
import { ResearchEngine } from '../../research/engine/research.engine.js';
import { ResearchDepth } from '../../research/interfaces/research.types.js';

export class ResearchWebCapabilityAdapter implements ICapabilityAdapter {
  constructor(private readonly researchEngine: ResearchEngine) {}

  public getMetadata(): CapabilityMetadata {
    return {
      id: 'research.web',
      name: 'Research & Web Intelligence',
      description: 'Multi-source research, source acquisition, evidence extraction, corroboration, contradiction detection, and citation synthesis.',
      category: 'research',
      provider: 'HṚṢĪKEŚA Research Engine',
      source: 'native',
      version: '1.0.0',
      license: 'MIT',
      runtimeType: 'native',
      supportedPlatforms: ['win32', 'linux', 'darwin'],
      requiredPermissions: ['web:search', 'web:read', 'research:execute'],
      riskLevel: 'LOW',
      dependencies: ['node:sqlite', 'playwright-core'],
      enabled: true,
      securityStatus: 'VERIFIED',
      documentation: 'docs/RESEARCH_SYSTEM.md',
    };
  }

  public async checkHealth(): Promise<CapabilityHealthCheckResult> {
    const start = Date.now();
    try {
      const isHealthy = this.researchEngine !== undefined;
      return {
        status: isHealthy ? 'HEALTHY' : 'UNAVAILABLE',
        message: isHealthy ? 'Research Intelligence Engine operational.' : 'Research engine not initialized.',
        latencyMs: Date.now() - start,
        lastCheckedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        status: 'UNAVAILABLE',
        message: `Research health check failed: ${err.message}`,
        latencyMs: Date.now() - start,
        lastCheckedAt: new Date().toISOString(),
      };
    }
  }

  public async execute(req: CapabilityExecutionRequest): Promise<CapabilityExecutionResult> {
    const start = Date.now();
    try {
      let output: unknown;

      switch (req.action) {
        case 'plan_research': {
          const prompt = String(req.parameters.prompt || req.parameters.question || '');
          output = this.researchEngine.parseResearchIntent(prompt);
          break;
        }
        case 'create_study': {
          const question = String(req.parameters.question || '');
          const depth = (req.parameters.depth as ResearchDepth) || ResearchDepth.STANDARD;
          const study = await this.researchEngine.createStudy({
            question,
            title: req.parameters.title as string | undefined,
            scope: req.parameters.scope as string | undefined,
            depth,
            companyId: req.parameters.companyId as string | undefined,
            projectId: req.parameters.projectId as string | undefined,
            goalId: req.parameters.goalId as string | undefined,
          });
          output = study;
          break;
        }
        case 'execute_study': {
          const studyId = String(req.parameters.studyId);
          const customUrls = req.parameters.customUrls as string[] | undefined;
          output = await this.researchEngine.executeStudy(studyId, { customUrls });
          break;
        }
        case 'get_study': {
          const studyId = String(req.parameters.studyId);
          output = await this.researchEngine.getStudy(studyId);
          break;
        }
        case 'list_studies': {
          output = await this.researchEngine.listStudies({
            companyId: req.parameters.companyId as string | undefined,
            projectId: req.parameters.projectId as string | undefined,
          });
          break;
        }
        case 'pause_study': {
          const studyId = String(req.parameters.studyId);
          output = await this.researchEngine.pauseStudy(studyId);
          break;
        }
        case 'cancel_study': {
          const studyId = String(req.parameters.studyId);
          output = await this.researchEngine.cancelStudy(studyId);
          break;
        }
        default:
          throw new Error(`Unsupported research action: ${req.action}`);
      }

      return {
        success: true,
        output,
        executionTimeMs: Date.now() - start,
        capabilityId: 'research.web',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        executionTimeMs: Date.now() - start,
        capabilityId: 'research.web',
      };
    }
  }
}
