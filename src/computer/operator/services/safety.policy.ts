/**
 * HṚṢĪKEŚA (हृषीकेश) — Computer Operator Safety & Security Policy
 *
 * Phase 22: Danger tier enforcement, destructive action confirmation,
 * authentication/CAPTCHA pause handling, scope boundaries, and secret redaction.
 */

import { ILogger } from '../../../core/logging/logger.types.js';
import {
  ComputerAction,
  ComputerSafetyTier,
  ComputerScope,
  FailureClassification,
} from '../interfaces/operator.types.js';

export interface SafetyEvaluationResult {
  readonly allowed: boolean;
  readonly riskTier: ComputerSafetyTier;
  readonly requiresApproval: boolean;
  readonly reason?: string;
  readonly pauseReason?: FailureClassification;
  readonly confirmationPrompt?: string;
}

export class ComputerSafetyPolicy {
  private readonly logger?: ILogger;

  // Sensitive patterns for password / PIN / MFA detection
  private readonly AUTH_KEYWORDS = [
    'password',
    'passcode',
    'pin',
    'mfa',
    '2fa',
    'authenticator',
    'security code',
    'verification code',
    'one-time password',
    'otp',
    'biometric',
    'windows hello',
    'fingerprint',
    'smart card',
  ];

  // Destructive action patterns
  private readonly DESTRUCTIVE_KEYWORDS = [
    'delete',
    'format',
    'uninstall',
    'shutdown',
    'restart',
    'terminate',
    'kill',
    'drop',
    'purge',
    'destroy',
    'wipe',
    'erase',
    'empty recycle bin',
  ];

  // Protected system processes where injection/unauthorized control is prohibited
  private readonly PROTECTED_PROCESSES = [
    'lsass',
    'csrss',
    'smss',
    'services',
    'winlogon',
    'svchost',
    'securityhealthservice',
    'antimalware',
    'msmpeng',
  ];

  constructor(logger?: ILogger) {
    this.logger = logger?.child('ComputerSafetyPolicy');
  }

  /**
   * Evaluates whether an action is safe to execute and whether human confirmation is required.
   */
  public evaluateAction(action: ComputerAction, currentScope: ComputerScope = 'DESKTOP'): SafetyEvaluationResult {
    // 1. Check Scope Boundaries
    if (action.scope && action.scope !== currentScope && currentScope !== 'DESKTOP') {
      return {
        allowed: false,
        riskTier: 'HIGH_RISK',
        requiresApproval: true,
        reason: `Action scope '${action.scope}' exceeds active authorized scope '${currentScope}'.`,
      };
    }

    // 2. Classify Risk Tier
    const riskTier = action.riskTier || this.classifyActionRisk(action);

    // 3. Detect Authentication & Sensitive Credential Prompts
    const query = this.extractTargetText(action);
    const hasAuthKeyword = this.AUTH_KEYWORDS.some((kw) => query.toLowerCase().includes(kw));
    if (hasAuthKeyword && (action.type === 'TYPE' || action.type === 'KEYPRESS')) {
      this.logger?.warn(`Authentication prompt detected in target '${query}'. Pausing for user interaction.`);
      return {
        allowed: false,
        riskTier: 'CRITICAL',
        requiresApproval: false,
        pauseReason: 'AUTH_REQUIRED',
        reason: 'Authentication or password field detected. HṚṢĪKEŚA pauses for authorized human entry.',
      };
    }

    // 4. Detect CAPTCHA
    if (query.toLowerCase().includes('captcha') || query.toLowerCase().includes('recaptcha') || query.toLowerCase().includes('cloudflare challenge')) {
      this.logger?.warn('CAPTCHA detected. Pausing for human user completion.');
      return {
        allowed: false,
        riskTier: 'HIGH_RISK',
        requiresApproval: false,
        pauseReason: 'CAPTCHA_DETECTED',
        reason: 'CAPTCHA challenge detected. Paused for human completion.',
      };
    }

    // 5. Destructive Action Protection
    const isDestructive = this.isDestructiveAction(action);
    if (isDestructive || riskTier === 'CRITICAL' || riskTier === 'HIGH_RISK') {
      const prompt = this.generateConfirmationPrompt(action);
      return {
        allowed: false,
        riskTier,
        requiresApproval: true,
        confirmationPrompt: prompt,
        reason: `Potentially consequential or destructive action requires explicit authorization: ${prompt}`,
      };
    }

    return {
      allowed: true,
      riskTier,
      requiresApproval: false,
    };
  }

  /**
   * Classifies an action into safety tiers.
   */
  public classifyActionRisk(action: ComputerAction): ComputerSafetyTier {
    const isDestructive = this.isDestructiveAction(action);
    const appName = (action.params?.appName || '').toLowerCase();
    const query = this.extractTargetText(action).toLowerCase();

    if (action.type === 'TERMINATE' && (isDestructive || appName.includes('format') || query.includes('format'))) {
      return 'CRITICAL';
    }

    if (action.type === 'LAUNCH' && (appName.includes('installer') || appName.includes('setup') || isDestructive)) {
      return 'HIGH_RISK';
    }

    switch (action.type) {
      case 'MOVE':
      case 'WAIT':
      case 'FOCUS':
      case 'RESTORE':
      case 'MINIMIZE':
      case 'MAXIMIZE':
      case 'SCROLL':
      case 'COPY':
        return 'SAFE';

      case 'CLICK':
      case 'DOUBLE_CLICK':
      case 'RIGHT_CLICK':
      case 'SELECT':
      case 'OPEN':
      case 'LAUNCH':
        return isDestructive ? 'HIGH_RISK' : 'LOW_RISK';

      case 'TYPE':
      case 'KEYPRESS':
      case 'HOTKEY':
      case 'PASTE':
      case 'DRAG':
        return isDestructive ? 'CRITICAL' : 'MEDIUM_RISK';

      case 'CLOSE':
      case 'TERMINATE':
      case 'CUT':
        return isDestructive ? 'CRITICAL' : 'HIGH_RISK';

      default:
        return 'MEDIUM_RISK';
    }
  }

  public generateConfirmationPrompt(action: ComputerAction): string {
    const target = this.extractTargetText(action) || action.params?.appName || 'target application';
    return `Authorize ${action.type} action on '${target}'?`;
  }

  /**
   * Checks if an action is destructive.
   */
  public isDestructiveAction(action: ComputerAction): boolean {
    const text = (
      this.extractTargetText(action) + ' ' +
      (action.params?.text || '') + ' ' +
      (action.params?.appName || '')
    ).toLowerCase();

    return this.DESTRUCTIVE_KEYWORDS.some((kw) => text.includes(kw));
  }

  /**
   * Verifies if a process is a Windows protected process.
   */
  public isProtectedProcess(processName?: string): boolean {
    if (!processName) return false;
    const clean = processName.toLowerCase().replace(/\.exe$/, '');
    return this.PROTECTED_PROCESSES.includes(clean);
  }

  /**
   * Redacts sensitive passwords, PINs, or token patterns from logged text.
   */
  public redactSensitiveText(text?: string): string {
    if (!text) return '';
    return text
      .replace(/password\s*[:=]\s*[^\s]+/gi, 'password=[REDACTED]')
      .replace(/bearer\s+[A-Za-z0-9_\-\.]{20,}/gi, 'Bearer [REDACTED]')
      .replace(/sk-[A-Za-z0-9_\-]{20,}/gi, 'sk-[REDACTED]')
      .replace(/\b\d{4,8}\b/g, (match) => (match.length === 4 || match.length === 6 ? '[PIN_REDACTED]' : match));
  }

  private extractTargetText(action: ComputerAction): string {
    if (!action.target) return '';
    if (typeof action.target === 'object' && 'query' in action.target) {
      return (action.target as any).query || '';
    }
    return (action.target as any).name || '';
  }

  public evaluateActionSafety(action: ComputerAction, currentScope: ComputerScope = 'DESKTOP') {
    const res = this.evaluateAction(action, currentScope);
    return {
      tier: res.riskTier,
      allowed: res.allowed,
      requiresApproval: res.requiresApproval,
      reason: res.reason
    };
  }

  public detectAuthOrCaptcha(text: string): { isAuthRequired: boolean; authType?: string; isCaptcha: boolean } {
    const lower = text.toLowerCase();
    const isCaptcha = lower.includes('captcha') || lower.includes('turnstile') || lower.includes('recaptcha');
    const isPin = lower.includes('pin');
    const isPassword = lower.includes('password') || lower.includes('passcode');
    const isMfa = lower.includes('mfa') || lower.includes('2fa') || lower.includes('otp');
    const isAuthRequired = isPin || isPassword || isMfa;

    let authType: string | undefined;
    if (isPin) authType = 'PIN';
    else if (isPassword) authType = 'PASSWORD';
    else if (isMfa) authType = 'MFA';

    return {
      isAuthRequired,
      authType,
      isCaptcha
    };
  }

  public redactSecrets(text?: string): string {
    if (!text) return '';
    return this.redactSensitiveText(text)
      .replace(/ghp_[A-Za-z0-9_]{30,}/gi, '[REDACTED_API_KEY]')
      .replace(/key=[A-Za-z0-9_\-\.]{20,}/gi, 'key=[REDACTED_API_KEY]');
  }

  public isWithinScope(scope: ComputerScope, targetApp?: string, activeApp?: string): boolean {
    if (scope === 'DESKTOP') return true;
    if (scope === 'APPLICATION') {
      if (!targetApp || !activeApp) return true;
      return targetApp.toLowerCase().includes(activeApp.toLowerCase()) || activeApp.toLowerCase().includes(targetApp.toLowerCase());
    }
    return true;
  }
}
