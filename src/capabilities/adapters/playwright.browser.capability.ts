/**
 * HṚṢĪKEŚA (हृषीकेश) — Playwright Browser Capability Adapter
 *
 * Phase 16J: Open-Source Playwright Browser Capability
 */

import { ICapabilityAdapter } from './capability.adapter.js';
import {
  CapabilityMetadata,
  CapabilityHealthCheckResult,
  CapabilityExecutionRequest,
  CapabilityExecutionResult,
} from '../interfaces/capability.types.js';
import { IBrowserAdapter } from '../../tools/browser/interfaces/browser.types.js';

export class PlaywrightBrowserCapabilityAdapter implements ICapabilityAdapter {
  private readonly browser: IBrowserAdapter;

  constructor(browser: IBrowserAdapter) {
    this.browser = browser;
  }

  public getMetadata(): CapabilityMetadata {
    return {
      id: 'browser.playwright',
      name: 'Playwright Browser Automation',
      description: 'High-reliability headless and headed browser automation via Microsoft Playwright.',
      category: 'browser',
      provider: 'Microsoft Playwright',
      source: 'open_source',
      version: '1.49.0',
      license: 'Apache-2.0',
      runtimeType: 'native',
      supportedPlatforms: ['win32', 'linux', 'darwin'],
      requiredPermissions: ['browser:navigate', 'browser:interact', 'browser:read'],
      riskLevel: 'MEDIUM',
      dependencies: ['playwright-core'],
      enabled: true,
      securityStatus: 'COMMUNITY_AUDITED',
      documentation: 'https://playwright.dev',
    };
  }

  public async checkHealth(): Promise<CapabilityHealthCheckResult> {
    const start = Date.now();
    try {
      const isHealthy = this.browser !== undefined;
      return {
        status: isHealthy ? 'HEALTHY' : 'UNAVAILABLE',
        message: isHealthy ? 'Playwright browser engine initialized and available.' : 'Browser engine not loaded.',
        latencyMs: Date.now() - start,
        lastCheckedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        status: 'UNAVAILABLE',
        message: `Browser health check failed: ${err.message}`,
        latencyMs: Date.now() - start,
        lastCheckedAt: new Date().toISOString(),
      };
    }
  }

  public async execute(req: CapabilityExecutionRequest): Promise<CapabilityExecutionResult> {
    const start = Date.now();
    try {
      let output: unknown;
      const sessions = this.browser.listSessions();
      const session = sessions[0] || (await this.browser.createSession());

      switch (req.action) {
        case 'navigate':
          output = await this.browser.navigate(session.id, String(req.parameters.url));
          break;
        case 'read':
          output = await this.browser.readPage(session.id);
          break;
        case 'screenshot':
          output = await this.browser.screenshot(session.id);
          break;
        default:
          throw new Error(`Unsupported browser action: ${req.action}`);
      }

      return {
        success: true,
        output,
        executionTimeMs: Date.now() - start,
        capabilityId: 'browser.playwright',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        executionTimeMs: Date.now() - start,
        capabilityId: 'browser.playwright',
      };
    }
  }
}
