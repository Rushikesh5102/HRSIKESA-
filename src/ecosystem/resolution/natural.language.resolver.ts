/**
 * HṚṢĪKEŚA (हृषीकेश) — Natural Language Capability & Intent Resolver
 *
 * FP-15: Fast, deterministic resolution of user inquiries and commands without LLM overhead.
 * Strictly avoids fabricating services, accounts, or availability.
 */

import { ILogger } from '../../core/logging/logger.types.js';
import {
  NaturalLanguageCapabilityResult,
} from '../types/index.js';
import { EcosystemRepository } from '../repository/ecosystem.repository.js';
import { AccountRepository } from '../../accounts/repository/account.repository.js';

export class NaturalLanguageResolver {
  constructor(
    private readonly repository: EcosystemRepository,
    private readonly accountRepository?: AccountRepository,
    logger?: ILogger
  ) {
    if (logger) {
      // logger reference
    }
  }

  /**
   * Deterministically analyze user query and answer with actual runtime availability.
   */
  public resolveQuery(queryText: string): NaturalLanguageCapabilityResult {
    const text = queryText.trim().toLowerCase();

    // 1. Google / Gmail / Drive / Calendar
    if (text.includes('gmail') || text.includes('email') || text.includes('mail')) {
      return this.resolveGoogleService('google', 'Gmail', ['google.gmail.search', 'google.gmail.read', 'google.gmail.send']);
    }
    if (text.includes('google drive') || text.includes('drive files') || text.includes('my drive')) {
      return this.resolveGoogleService('google', 'Google Drive', ['google.drive.search', 'google.drive.read']);
    }
    if (text.includes('google calendar') || text.includes('calendar meeting') || text.includes('calendar event')) {
      return this.resolveGoogleService('google', 'Google Calendar', ['google.calendar.list', 'google.calendar.create']);
    }
    if (text.includes('google')) {
      return this.resolveGoogleService('google', 'Google Workspace', ['google.gmail.read', 'google.drive.read', 'google.calendar.list']);
    }

    // 2. GitHub
    if (text.includes('github') || text.includes('git repo') || text.includes('pull request') || text.includes('github issue')) {
      return this.resolveService('github', 'GitHub', ['github.repo.read', 'github.issue.create', 'github.pull_request.create']);
    }

    // 3. Slack
    if (text.includes('slack') || text.includes('slack channel') || text.includes('slack message')) {
      return this.resolveService('slack', 'Slack', ['slack.messages.read', 'slack.messages.send']);
    }

    // 4. Microsoft / Outlook / Teams
    if (text.includes('outlook') || text.includes('teams') || text.includes('microsoft')) {
      return this.resolveService('microsoft', 'Microsoft 365', ['microsoft.outlook.read', 'microsoft.teams.messages']);
    }

    // 5. Blender
    if (text.includes('blender')) {
      return this.resolveApplication('blender', 'Blender', '3D Creation & Animation Suite');
    }

    // 6. VS Code / Code Editor
    if (text.includes('vscode') || text.includes('vs code') || text.includes('code editor')) {
      return this.resolveApplication('vscode', 'Visual Studio Code', 'Code Editor');
    }

    // 7. General query: "What can you do with [x]?" or "What's available?"
    if (text.includes("what's available") || text.includes('what services') || text.includes('list capabilities')) {
      return this.resolveGeneralAvailability();
    }

    // Unhandled by fast path -> defer to model or mission planner
    return {
      handled: false,
      isAvailable: false,
      health: 'UNCONFIGURED',
      availableInterfaces: [],
      connectedAccountsCount: 0,
      responseMessage: "I didn't recognize a specific registered ecosystem service in this request.",
      supportedOperations: [],
    };
  }

  private resolveGoogleService(
    providerId: string,
    friendlyName: string,
    keyCapabilities: string[]
  ): NaturalLanguageCapabilityResult {
    const services = this.repository.listServices({ providerId });
    const service = services.find(s => s.providerId === providerId);

    const connectedAccounts = this.accountRepository
      ? this.accountRepository.listAccounts({ providerId, status: 'CONNECTED' })
      : [];

    const isConnected = connectedAccounts.length > 0;
    const isAvailable = isConnected && (service?.availability === 'AVAILABLE');

    let msg = '';
    if (isConnected) {
      msg = `${friendlyName} is connected and ready via account "${connectedAccounts[0].accountName}" (${connectedAccounts[0].email || 'OAuth'}). Supported capabilities include: ${keyCapabilities.join(', ')}.`;
    } else {
      msg = `${friendlyName} is supported by HṚṢĪKEŚA, but no authorized account is currently connected. You can connect it via your Google account.`;
    }

    return {
      handled: true,
      serviceName: friendlyName,
      serviceId: service?.serviceId || `svc_${providerId}`,
      isAvailable,
      health: isConnected ? 'HEALTHY' : 'UNCONFIGURED',
      primaryInterface: 'AUTHENTICATED_API',
      availableInterfaces: ['AUTHENTICATED_API', 'BROWSER_DOM'],
      connectedAccountsCount: connectedAccounts.length,
      responseMessage: msg,
      supportedOperations: keyCapabilities,
      suggestedAction: isConnected
        ? { type: 'EXECUTE' }
        : { type: 'CONNECT', payload: { providerId: 'google' } },
    };
  }

  private resolveService(
    providerId: string,
    friendlyName: string,
    keyCapabilities: string[]
  ): NaturalLanguageCapabilityResult {
    const services = this.repository.listServices({ providerId });
    const service = services.find(s => s.providerId === providerId);

    const connectedAccounts = this.accountRepository
      ? this.accountRepository.listAccounts({ providerId, status: 'CONNECTED' })
      : [];

    const isConnected = connectedAccounts.length > 0;
    const isAvailable = isConnected;

    let msg = '';
    if (isConnected) {
      msg = `${friendlyName} is connected via account "${connectedAccounts[0].accountName}". Capabilities: ${keyCapabilities.join(', ')}.`;
    } else {
      msg = `${friendlyName} is supported, but no account is currently connected.`;
    }

    return {
      handled: true,
      serviceName: friendlyName,
      serviceId: service?.serviceId || `svc_${providerId}`,
      isAvailable,
      health: isConnected ? 'HEALTHY' : 'UNCONFIGURED',
      primaryInterface: 'AUTHENTICATED_API',
      availableInterfaces: ['AUTHENTICATED_API', 'CLI', 'BROWSER_DOM'],
      connectedAccountsCount: connectedAccounts.length,
      responseMessage: msg,
      supportedOperations: keyCapabilities,
      suggestedAction: isConnected
        ? { type: 'EXECUTE' }
        : { type: 'CONNECT', payload: { providerId } },
    };
  }

  private resolveApplication(
    appId: string,
    displayName: string,
    description: string
  ): NaturalLanguageCapabilityResult {
    const services = this.repository.listServices();
    const appService = services.find(s => s.name.toLowerCase() === appId || s.serviceId.includes(appId));

    const isInstalled = appService?.availability === 'AVAILABLE';

    const msg = isInstalled
      ? `${displayName} (${description}) is installed and available for execution via Desktop UI Automation and Workspace Control.`
      : `${displayName} is recognized by the ecosystem catalog, but it is not currently installed or found on this machine.`;

    return {
      handled: true,
      serviceName: displayName,
      serviceId: appService?.serviceId || `svc_app_${appId}`,
      isAvailable: isInstalled,
      health: isInstalled ? 'HEALTHY' : 'UNAVAILABLE',
      primaryInterface: 'DESKTOP_UIA',
      availableInterfaces: ['DESKTOP_UIA', 'CLI'],
      connectedAccountsCount: 0,
      responseMessage: msg,
      supportedOperations: [`Launch ${displayName}`, `Focus ${displayName}`, `UI Automation`],
      suggestedAction: isInstalled
        ? { type: 'OPEN', payload: { appId } }
        : { type: 'INSTALL', payload: { packageId: appId } },
    };
  }

  private resolveGeneralAvailability(): NaturalLanguageCapabilityResult {
    const services = this.repository.listServices();
    const available = services.filter(s => s.availability === 'AVAILABLE');

    const serviceList = available.map(s => s.displayName).join(', ');
    const msg = `Currently available ecosystem services: ${serviceList || 'None connected'}.`;

    return {
      handled: true,
      isAvailable: available.length > 0,
      health: 'HEALTHY',
      availableInterfaces: ['LOCAL_API', 'AUTHENTICATED_API', 'CLI', 'DESKTOP_UIA'],
      connectedAccountsCount: 0,
      responseMessage: msg,
      supportedOperations: available.flatMap(s => s.capabilities).slice(0, 15),
    };
  }
}
