/**
 * HṚṢĪKEŚA (हृषीकेश) — Multi-Account Resolver & Router
 *
 * FP-12: Resolves authorized accounts for capability invocations respecting
 * scope isolation (Personal, Company, Project), health status, and quotas.
 */

import { ILogger } from '../../core/logging/logger.types.js';
import {
  ServiceAccount,
  AccountScopeType,
} from '../types/account.types.js';
import { AccountRepository } from '../repository/account.repository.js';
import { ProviderAdapterRegistry } from '../adapters/provider.adapter.registry.js';

export interface AccountResolutionContext {
  capabilityId: string;
  providerId?: string;
  ownerIdentity?: string;
  companyId?: string;
  projectId?: string;
  preferredAccountId?: string;
  scopeType?: AccountScopeType;
}

export class AccountResolver {
  constructor(
    private readonly repository: AccountRepository,
    private readonly adapterRegistry: ProviderAdapterRegistry,
    private readonly logger: ILogger
  ) {}

  /**
   * Resolves the best matching connected account for a capability invocation.
   * Enforces scope isolation: Project A cannot access Project B accounts.
   */
  public resolveAccount(context: AccountResolutionContext): ServiceAccount {
    // 1. If explicit preferredAccountId is provided, verify it first
    if (context.preferredAccountId) {
      const account = this.repository.getAccountById(context.preferredAccountId);
      if (!account) {
        throw new Error(`Explicitly requested account "${context.preferredAccountId}" not found`);
      }
      this.validateAccountAccess(account, context);
      return account;
    }

    // 2. Identify target providerId (either explicit or derived from capabilityId e.g. "google.gmail.read" -> "google")
    let targetProviderId = context.providerId;
    if (!targetProviderId) {
      const parts = context.capabilityId.split('.');
      if (parts.length > 1) {
        targetProviderId = parts[0];
      }
    }

    if (!targetProviderId) {
      throw new Error(`Unable to determine providerId for capability "${context.capabilityId}"`);
    }

    // 3. Fetch candidate accounts for provider
    const candidateAccounts = this.repository.listAccounts({
      providerId: targetProviderId,
      status: 'CONNECTED',
    });

    if (candidateAccounts.length === 0) {
      throw new Error(`No connected accounts found for provider "${targetProviderId}". Re-authorization or connection required.`);
    }

    // 4. Filter by isolation boundaries (Project, Company, Owner)
    const eligibleAccounts = candidateAccounts.filter(acc => {
      // Check project isolation
      if (context.projectId && acc.scopeType === 'PROJECT' && acc.projectId !== context.projectId) {
        return false;
      }
      // If context has project, reject accounts bound to a different project
      if (context.projectId && acc.projectId && acc.projectId !== context.projectId) {
        return false;
      }
      // Check company isolation
      if (context.companyId && acc.scopeType === 'COMPANY' && acc.companyId !== context.companyId) {
        return false;
      }
      if (context.companyId && acc.companyId && acc.companyId !== context.companyId) {
        return false;
      }
      // Check owner if specified
      if (context.ownerIdentity && acc.ownerIdentity !== context.ownerIdentity && acc.scopeType === 'PERSONAL') {
        return false;
      }
      return true;
    });

    if (eligibleAccounts.length === 0) {
      throw new Error(`Access Denied: No connected "${targetProviderId}" accounts match isolation criteria (company: ${context.companyId || 'none'}, project: ${context.projectId || 'none'})`);
    }

    // 5. Filter / score by capability support
    const capabilityMatching = eligibleAccounts.filter(acc => {
      const accCaps = acc.metadata?.capabilities as string[] | undefined;
      if (accCaps && Array.isArray(accCaps) && accCaps.length > 0) {
        return accCaps.includes(context.capabilityId);
      }
      const provider = this.adapterRegistry.getProviderDefinition(targetProviderId!);
      return provider?.capabilities.includes(context.capabilityId) ?? true;
    });

    const accountsToEvaluate = capabilityMatching.length > 0 ? capabilityMatching : eligibleAccounts;

    // 6. Rank by health and specificity
    accountsToEvaluate.sort((a, b) => {
      const healthA = this.repository.getAccountHealth(a.id);
      const healthB = this.repository.getAccountHealth(b.id);

      const healthScoreA = healthA?.status === 'HEALTHY' ? 10 : 0;
      const healthScoreB = healthB?.status === 'HEALTHY' ? 10 : 0;

      const projectScoreA = context.projectId && a.projectId === context.projectId ? 10 : 0;
      const projectScoreB = context.projectId && b.projectId === context.projectId ? 10 : 0;

      const companyScoreA = context.companyId && a.companyId === context.companyId ? 10 : 0;
      const companyScoreB = context.companyId && b.companyId === context.companyId ? 10 : 0;

      // Personal preference when no enterprise boundary specified
      const personalScoreA = (!context.companyId && !context.projectId && a.scopeType === 'PERSONAL') ? 10 : 0;
      const personalScoreB = (!context.companyId && !context.projectId && b.scopeType === 'PERSONAL') ? 10 : 0;

      const scoreA = healthScoreA + projectScoreA + companyScoreA + personalScoreA;
      const scoreB = healthScoreB + projectScoreB + companyScoreB + personalScoreB;

      return scoreB - scoreA;
    });

    const selected = accountsToEvaluate[0];
    this.logger.debug(`AccountResolver: Resolved account "${selected.id}" for capability "${context.capabilityId}" (provider: ${targetProviderId})`);
    return selected;
  }

  /**
   * Validate that an account is allowed to be accessed in the current context
   */
  private validateAccountAccess(account: ServiceAccount, context: AccountResolutionContext): void {
    if (account.status !== 'CONNECTED' && account.status !== 'DEGRADED') {
      throw new Error(`Account "${account.id}" is not connected (status: ${account.status})`);
    }

    // Project isolation check
    if (context.projectId && account.projectId && account.projectId !== context.projectId) {
      throw new Error(`Isolation Violation: Account "${account.id}" belongs to project "${account.projectId}" and cannot be accessed from project "${context.projectId}"`);
    }

    // Company isolation check
    if (context.companyId && account.companyId && account.companyId !== context.companyId) {
      throw new Error(`Isolation Violation: Account "${account.id}" belongs to company "${account.companyId}" and cannot be accessed from company "${context.companyId}"`);
    }
  }
}
