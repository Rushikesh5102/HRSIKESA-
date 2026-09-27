/**
 * HṚṢĪKEŚA (हृषीकेश) — Scope Resolver Service
 *
 * Track A / INT-007: Cognitive Context Engine
 * Resolves context scopes deterministically and enforces isolation boundaries.
 */

import { ContextRequest, ContextScope } from '../interfaces/context.types.js';
import { ClassificationResult } from './request-classifier.service.js';

export interface ResolvedScope {
  readonly primaryScope: ContextScope;
  readonly allowedScopes: ContextScope[];
  readonly targetProjectId?: string;
  readonly targetCompanyId?: string;
  readonly targetEntityName?: string;
  readonly boundaryEnforced: boolean;
}

export class ScopeResolverService {
  /**
   * Resolves the primary and allowed scopes for a request.
   */
  public resolveScope(
    request: ContextRequest,
    classification: ClassificationResult
  ): ResolvedScope {
    const raw = (request.userMessage || '').toLowerCase();

    // 1. Explicit Scope Constraints from Request
    const targetProject = request.projectId || request.targetProjectId;
    const targetCompany = request.companyId || request.targetCompanyId;

    if (targetProject) {
      return {
        primaryScope: 'PROJECT',
        allowedScopes: ['PROJECT', 'GLOBAL'],
        targetProjectId: targetProject,
        targetCompanyId: targetCompany,
        boundaryEnforced: true,
      };
    }

    if (targetCompany) {
      return {
        primaryScope: 'COMPANY',
        allowedScopes: ['COMPANY', 'GLOBAL'],
        targetCompanyId: targetCompany,
        boundaryEnforced: true,
      };
    }

    if (request.agentId) {
      return {
        primaryScope: 'AGENT',
        allowedScopes: ['AGENT', 'GLOBAL'],
        boundaryEnforced: true,
      };
    }

    if (request.goalId || request.missionId) {
      return {
        primaryScope: request.goalId ? 'GOAL' : 'MISSION',
        allowedScopes: [request.goalId ? 'GOAL' : 'MISSION', 'PROJECT', 'GLOBAL'],
        boundaryEnforced: true,
      };
    }

    // 2. Creator Authority Queries
    if (
      classification.intent === 'IDENTITY' ||
      raw.includes('rushikesh') ||
      raw.includes('creator') ||
      raw.includes('preference') ||
      raw.includes('i prefer') ||
      raw.includes('my directive')
    ) {
      return {
        primaryScope: 'CREATOR',
        allowedScopes: ['CREATOR', 'GLOBAL'],
        targetEntityName: 'Rushikesh',
        boundaryEnforced: true,
      };
    }

    // 3. Project Heuristics (e.g. HṚṢĪKEŚA, SAHIKARA, Project Alpha)
    if (
      raw.includes('sahikara') ||
      raw.includes('dex') ||
      raw.includes('uniswap')
    ) {
      return {
        primaryScope: 'PROJECT',
        allowedScopes: ['PROJECT'],
        targetProjectId: 'proj-sahikara',
        targetEntityName: 'SAHIKARA',
        boundaryEnforced: true,
      };
    }

    if (
      raw.includes('hṛṣīkeśa') ||
      raw.includes('hrisekesa') ||
      raw.includes('hrishikesha') ||
      raw.includes('core runtime') ||
      raw.includes('int-00')
    ) {
      return {
        primaryScope: 'PROJECT',
        allowedScopes: ['PROJECT', 'GLOBAL'],
        targetProjectId: 'hrisekesa',
        targetEntityName: 'HṚṢĪKEŚA',
        boundaryEnforced: true,
      };
    }

    if (raw.includes('project beta') || raw.includes('secretbeta')) {
      return {
        primaryScope: 'PROJECT',
        allowedScopes: ['PROJECT'],
        targetProjectId: 'proj_beta',
        targetEntityName: 'ProjectBeta',
        boundaryEnforced: true,
      };
    }

    if (raw.includes('project alpha') || raw.includes('secretalpha')) {
      return {
        primaryScope: 'PROJECT',
        allowedScopes: ['PROJECT'],
        targetProjectId: 'proj_alpha',
        targetEntityName: 'ProjectAlpha',
        boundaryEnforced: true,
      };
    }

    // 4. Company Heuristics
    if (raw.includes('pragnya')) {
      return {
        primaryScope: 'COMPANY',
        allowedScopes: ['COMPANY', 'GLOBAL'],
        targetCompanyId: 'comp_pragnya',
        targetEntityName: 'Pragnya Technologies',
        boundaryEnforced: true,
      };
    }

    if (raw.includes('aumtrix')) {
      return {
        primaryScope: 'COMPANY',
        allowedScopes: ['COMPANY', 'GLOBAL'],
        targetCompanyId: 'comp_aumtrix',
        targetEntityName: 'Aumtrix Systems',
        boundaryEnforced: true,
      };
    }

    if (raw.includes('svara')) {
      return {
        primaryScope: 'COMPANY',
        allowedScopes: ['COMPANY', 'GLOBAL'],
        targetCompanyId: 'comp_svara',
        targetEntityName: 'Svara Audio',
        boundaryEnforced: true,
      };
    }

    // 5. Default Global Scope
    return {
      primaryScope: 'GLOBAL',
      allowedScopes: ['GLOBAL'],
      boundaryEnforced: false,
    };
  }
}
