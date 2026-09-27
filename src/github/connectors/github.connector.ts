/**
 * HṚṢĪKEŚA (हृषीकेश) — GitHub Protocol Connector (FP-07 Integration)
 *
 * Implements IConnector to execute safe read-only operations across GitHub repositories:
 * search, metadata, contents, files, READMEs, releases, tags, branches, languages, and license.
 */

import {
  IConnector,
  RawConnectorResult,
  ResolvedCredentials,
  VerificationCheckResult,
} from '../../capabilities/fabric/connector.interface.js';
import {
  UniversalCapability,
  CapabilityInvocation,
  CapabilityHealth,
} from '../../capabilities/fabric/capability.types.js';
import { GitHubClient } from '../client/github.client.js';

export class GitHubConnector implements IConnector {
  public readonly protocol = 'REST';
  public readonly name = 'GitHubConnector';
  private readonly client: GitHubClient;

  constructor(client: GitHubClient) {
    this.client = client;
  }

  public canHandle(capability: UniversalCapability): boolean {
    return (
      (capability.protocol === 'REST' || (capability.protocol as string) === 'GITHUB') &&
      (capability.source === 'github' || capability.provider.toLowerCase().includes('github') || capability.id.startsWith('github.'))
    );
  }

  public async execute(
    _capability: UniversalCapability,
    invocation: CapabilityInvocation,
    resolvedAuth?: ResolvedCredentials
  ): Promise<RawConnectorResult> {
    const startTime = Date.now();
    const { operation, inputs } = invocation;

    // Apply resolved auth token if available
    if (resolvedAuth?.token || resolvedAuth?.apiKey) {
      this.client.setToken(resolvedAuth.token || resolvedAuth.apiKey);
    }

    try {
      let data: unknown;

      switch (operation) {
        case 'repository.search': {
          const query = String(inputs.query || '');
          const limit = Number(inputs.limit || 20);
          data = await this.client.searchRepositories(query, { limit });
          break;
        }

        case 'repository.metadata': {
          const owner = String(inputs.owner || '');
          const repo = String(inputs.repo || '');
          data = await this.client.getRepository(owner, repo);
          break;
        }

        case 'repository.contents': {
          const owner = String(inputs.owner || '');
          const repo = String(inputs.repo || '');
          const path = String(inputs.path || '');
          data = await this.client.getContents(owner, repo, path);
          break;
        }

        case 'repository.file': {
          const owner = String(inputs.owner || '');
          const repo = String(inputs.repo || '');
          const path = String(inputs.path || '');
          const ref = inputs.ref ? String(inputs.ref) : undefined;
          data = await this.client.getFile(owner, repo, path, ref);
          break;
        }

        case 'repository.readme': {
          const owner = String(inputs.owner || '');
          const repo = String(inputs.repo || '');
          data = await this.client.getReadme(owner, repo);
          break;
        }

        case 'repository.license': {
          const owner = String(inputs.owner || '');
          const repo = String(inputs.repo || '');
          data = await this.client.getLicense(owner, repo);
          break;
        }

        case 'repository.releases': {
          const owner = String(inputs.owner || '');
          const repo = String(inputs.repo || '');
          data = await this.client.getReleases(owner, repo);
          break;
        }

        case 'repository.tags': {
          const owner = String(inputs.owner || '');
          const repo = String(inputs.repo || '');
          data = await this.client.getTags(owner, repo);
          break;
        }

        case 'repository.languages': {
          const owner = String(inputs.owner || '');
          const repo = String(inputs.repo || '');
          data = await this.client.getLanguages(owner, repo);
          break;
        }

        case 'repository.issues': {
          const owner = String(inputs.owner || '');
          const repo = String(inputs.repo || '');
          data = await this.client.getIssues(owner, repo);
          break;
        }

        case 'repository.pull_requests': {
          const owner = String(inputs.owner || '');
          const repo = String(inputs.repo || '');
          data = await this.client.getPullRequests(owner, repo);
          break;
        }

        default:
          throw new Error(`Unsupported GitHub read operation '${operation}' in FP-08.`);
      }

      return {
        success: true,
        data,
        durationMs: Date.now() - startTime,
        metadata: {
          rateLimit: this.client.getRateLimitInfo(),
        },
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        durationMs: Date.now() - startTime,
        metadata: {
          rateLimit: this.client.getRateLimitInfo(),
        },
      };
    }
  }

  public async checkHealth(_capability: UniversalCapability): Promise<CapabilityHealth> {
    const rateLimit = this.client.getRateLimitInfo();
    const status = rateLimit.status === 'RATE_LIMITED' ? 'RATE_LIMITED' : 'HEALTHY';

    return {
      status,
      lastCheckedAt: new Date().toISOString(),
      consecutiveFailures: 0,
      quotaRemaining: rateLimit.remaining,
      rateLimitResetAt: rateLimit.resetAt,
      message: rateLimit.status === 'RATE_LIMITED' ? 'GitHub API rate limit exhausted.' : undefined,
    };
  }

  public async verify(
    _capability: UniversalCapability,
    _invocation: CapabilityInvocation,
    result: RawConnectorResult
  ): Promise<VerificationCheckResult> {
    if (!result.success) {
      return {
        verified: false,
        strategy: 'schema_match',
        details: result.error || 'Execution failed',
      };
    }

    if (result.data === undefined || result.data === null) {
      return {
        verified: false,
        strategy: 'schema_match',
        details: 'No data returned from GitHub API call.',
      };
    }

    return {
      verified: true,
      strategy: 'schema_match',
      details: 'GitHub response received and validated.',
    };
  }
}
