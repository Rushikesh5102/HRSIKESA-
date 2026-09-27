/**
 * HṚṢĪKEŚA (हृषीकेश) — CLI Provider Adapter
 *
 * FP-12: Adapter for local CLI tools (gh, gcloud, aws, az) detecting authenticated state.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ILogger } from '../../core/logging/logger.types.js';
import {
  ServiceProvider,
  ServiceAccount,
  AccountHealth,
  ProviderOperationResult,
} from '../types/account.types.js';
import { IProviderAdapter, ProviderInvokeOptions } from './provider.adapter.interface.js';

const execFileAsync = promisify(execFile);

export class CliProviderAdapter implements IProviderAdapter {
  public readonly providerId = 'cli_tools';

  public readonly providerDefinition: ServiceProvider = {
    id: 'cli_tools',
    name: 'cli_tools',
    displayName: 'Local CLI Tools (gh, gcloud, aws, az)',
    description: 'Detects and utilizes authorized local command-line tools without extracting raw credentials.',
    category: 'DEVELOPMENT',
    authMethods: ['CLI'],
    status: 'ENABLED',
    supportedScopes: [
      {
        scope: 'cli.gh',
        description: 'GitHub CLI (gh) execution',
        riskLevel: 'MEDIUM',
        required: false,
        grantedCapabilities: ['cli.gh.status', 'cli.gh.exec'],
      },
      {
        scope: 'cli.gcloud',
        description: 'Google Cloud CLI (gcloud) execution',
        riskLevel: 'HIGH',
        required: false,
        grantedCapabilities: ['cli.gcloud.status', 'cli.gcloud.exec'],
      },
      {
        scope: 'cli.aws',
        description: 'AWS CLI (aws) execution',
        riskLevel: 'HIGH',
        required: false,
        grantedCapabilities: ['cli.aws.status', 'cli.aws.exec'],
      },
      {
        scope: 'cli.az',
        description: 'Azure CLI (az) execution',
        riskLevel: 'HIGH',
        required: false,
        grantedCapabilities: ['cli.az.status', 'cli.az.exec'],
      },
    ],
    capabilities: [
      {
        id: 'cli.gh.status',
        name: 'GitHub CLI Auth Status',
        description: 'Check auth status of local gh CLI',
        action: 'READ',
        requiredScopes: ['cli.gh'],
        riskLevel: 'LOW',
        financial: false,
        destructive: false,
        privacyClass: 'INTERNAL',
      },
      {
        id: 'cli.gcloud.status',
        name: 'Google Cloud CLI Auth Status',
        description: 'Check active account of local gcloud CLI',
        action: 'READ',
        requiredScopes: ['cli.gcloud'],
        riskLevel: 'LOW',
        financial: false,
        destructive: false,
        privacyClass: 'INTERNAL',
      },
      {
        id: 'cli.aws.status',
        name: 'AWS CLI Caller Identity',
        description: 'Check caller identity of local AWS CLI',
        action: 'READ',
        requiredScopes: ['cli.aws'],
        riskLevel: 'LOW',
        financial: false,
        destructive: false,
        privacyClass: 'INTERNAL',
      },
      {
        id: 'cli.az.status',
        name: 'Azure CLI Account Status',
        description: 'Check active account of local az CLI',
        action: 'READ',
        requiredScopes: ['cli.az'],
        riskLevel: 'LOW',
        financial: false,
        destructive: false,
        privacyClass: 'INTERNAL',
      },
    ],
    defaultScopes: ['cli.execute'],
    rateLimitSupport: false,
    webhookSupport: false,
    provenance: {
      source: 'Native HṚṢĪKEŚA CLI Bridge',
      version: '1.0.0',
      license: 'PROPRIETARY',
      providerAuthor: 'HṚṢĪKEŚA Core',
      verifiedAt: Date.now(),
    },
  };

  constructor(private readonly logger: ILogger) {
    if (this.logger) {
      // logger bound
    }
  }

  public async validateConnection(
    account: ServiceAccount
  ): Promise<{ valid: boolean; identity?: string; error?: string; health: AccountHealth }> {
    const cliTool = (account.metadata?.cliTool as string) || 'gh';
    const now = Date.now();

    try {
      let identity = 'CLI Account';

      if (cliTool === 'gh') {
        const { stdout } = await execFileAsync('gh', ['auth', 'status'], { timeout: 5000 });
        const match = stdout.match(/Logged in to [^ ]+ account ([^ \n\r]+)/i);
        if (match) identity = match[1];
      } else if (cliTool === 'gcloud') {
        const { stdout } = await execFileAsync('gcloud', ['config', 'get-value', 'account'], { timeout: 5000 });
        identity = stdout.trim() || 'gcloud user';
      } else if (cliTool === 'aws') {
        const { stdout } = await execFileAsync('aws', ['sts', 'get-caller-identity', '--output', 'json'], { timeout: 5000 });
        const parsed = JSON.parse(stdout);
        identity = parsed.Arn || parsed.UserId || 'aws user';
      } else if (cliTool === 'az') {
        const { stdout } = await execFileAsync('az', ['account', 'show', '--output', 'json'], { timeout: 5000 });
        const parsed = JSON.parse(stdout);
        identity = parsed.user?.name || parsed.name || 'azure user';
      }

      return {
        valid: true,
        identity,
        health: {
          accountId: account.id,
          providerId: this.providerId,
          status: 'HEALTHY',
          latencyMs: 0,
          lastCheckedAt: now,
          lastSuccessfulCheckAt: now,
          failureCount: 0,
          consecutiveErrors: 0,
          updatedAt: new Date(now).toISOString(),
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        valid: false,
        error: `CLI tool "${cliTool}" check failed or not installed/authenticated: ${msg}`,
        health: {
          accountId: account.id,
          providerId: this.providerId,
          status: 'UNHEALTHY',
          latencyMs: 0,
          lastCheckedAt: now,
          failureCount: 1,
          consecutiveErrors: 1,
          lastError: msg,
          updatedAt: new Date(now).toISOString(),
        },
      };
    }
  }

  public async invoke(
    capabilityId: string,
    _params: Record<string, unknown>,
    options: ProviderInvokeOptions
  ): Promise<ProviderOperationResult> {
    const startTime = Date.now();

    try {
      let resultData: unknown;

      switch (capabilityId) {
        case 'cli.gh.status': {
          const { stdout } = await execFileAsync('gh', ['auth', 'status'], { timeout: 5000 });
          resultData = { output: stdout.trim() };
          break;
        }

        case 'cli.gcloud.status': {
          const { stdout } = await execFileAsync('gcloud', ['config', 'get-value', 'account'], { timeout: 5000 });
          resultData = { account: stdout.trim() };
          break;
        }

        case 'cli.aws.status': {
          const { stdout } = await execFileAsync('aws', ['sts', 'get-caller-identity', '--output', 'json'], { timeout: 5000 });
          resultData = JSON.parse(stdout);
          break;
        }

        case 'cli.az.status': {
          const { stdout } = await execFileAsync('az', ['account', 'show', '--output', 'json'], { timeout: 5000 });
          resultData = JSON.parse(stdout);
          break;
        }

        default:
          throw new Error(`Capability ${capabilityId} not supported by CLI provider`);
      }

      return {
        success: true,
        capabilityId,
        providerId: this.providerId,
        accountId: options.account.id,
        data: resultData,
        executionTimeMs: Date.now() - startTime,
        timestamp: Date.now(),
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        capabilityId,
        providerId: this.providerId,
        accountId: options.account.id,
        error: {
          category: 'EXECUTION_FAILED',
          message: msg,
          retryable: false,
        },
        executionTimeMs: Date.now() - startTime,
        timestamp: Date.now(),
      };
    }
  }
}
