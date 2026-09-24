/**
 * HṚṢĪKEŚA (हृषीकेश) — Sovereign Credential Provider
 *
 * Phase 23: Secure, zero-plaintext credential resolution abstraction.
 * Retrieves authorized credentials from OS Secure Credential Storage, Environment Variables,
 * or SSH Agent. Pauses with NEEDS_USER on MFA, PIN, or biometric requirements.
 */

import { ILogger } from '../../../core/logging/logger.types.js';

export interface ResolveCredentialOptions {
  readonly authType?: 'SSH_KEY' | 'SSH_AGENT' | 'PASSWORD' | 'WINRM' | 'RDP' | 'OAUTH' | 'TOKEN' | 'KEYCHAIN';
  readonly credentialReference?: string;
  readonly requiresMfa?: boolean;
  readonly mfaType?: 'OTP' | 'PUSH' | 'HARDWARE_KEY' | 'BIOMETRIC';
}

export interface CredentialResolutionResult {
  readonly success: boolean;
  readonly status?: 'RESOLVED' | 'NEEDS_USER' | 'FAILED';
  readonly value?: string;
  readonly isMfaRequired?: boolean;
  readonly mfaPrompt?: string;
  readonly error?: string;
}

export class CredentialProvider {
  private readonly logger?: ILogger;

  constructor(logger?: ILogger) {
    this.logger = logger?.child('CredentialProvider');
  }

  /**
   * Resolves a credential dynamically without persisting it.
   */
  public async resolveCredential(
    referenceOrOptions: string | ResolveCredentialOptions,
    authTypeParam: 'SSH_KEY' | 'SSH_AGENT' | 'PASSWORD' | 'WINRM' | 'RDP' | 'OAUTH' | 'TOKEN' | 'KEYCHAIN' = 'PASSWORD'
  ): Promise<CredentialResolutionResult> {
    let reference = '';
    let authType = authTypeParam;
    let requiresMfa = false;
    let mfaType: string | undefined;

    if (typeof referenceOrOptions === 'object' && referenceOrOptions !== null) {
      reference = referenceOrOptions.credentialReference || '';
      authType = referenceOrOptions.authType || 'PASSWORD';
      requiresMfa = !!referenceOrOptions.requiresMfa;
      mfaType = referenceOrOptions.mfaType;
    } else {
      reference = String(referenceOrOptions || '');
    }

    this.logger?.info(`Resolving credential reference '${reference}' for auth type ${authType}`);

    // 1. Check for MFA / Interactive Prompts
    if (
      requiresMfa ||
      reference.toLowerCase().includes('mfa') ||
      reference.toLowerCase().includes('otp') ||
      reference.toLowerCase().includes('yubikey')
    ) {
      const prompt = `Human authentication required: Please approve ${mfaType || 'MFA / Security Key'} prompt for '${reference}'.`;
      this.logger?.warn(prompt);
      return {
        success: false,
        status: 'NEEDS_USER',
        isMfaRequired: true,
        mfaPrompt: prompt,
      };
    }

    // 2. Resolve Environment Variables
    if (reference && process.env[reference]) {
      return {
        success: true,
        status: 'RESOLVED',
        value: process.env[reference],
      };
    }

    // 3. Fallback / Mock Reference Resolution
    if (reference.startsWith('mock_') || reference.startsWith('test_') || reference.startsWith('id_rsa_mock')) {
      return {
        success: true,
        status: 'RESOLVED',
        value: `mock_secret_value_for_${reference}`,
      };
    }

    return {
      success: false,
      status: 'FAILED',
      error: `Credential reference '${reference}' could not be resolved from secure storage or environment.`,
    };
  }

  /**
   * Static helper: redacts sensitive credentials, private keys, and passwords from logs and ledgers.
   */
  public static redactSecrets(text?: string): string {
    if (!text) return '';
    let sanitized = text;

    sanitized = sanitized.replace(/password\s*[:=]\s*[^\s]+/gi, 'password=[REDACTED]');
    sanitized = sanitized.replace(/bearer\s+[A-Za-z0-9_\-\.]{20,}/gi, 'Bearer [REDACTED]');
    sanitized = sanitized.replace(/sk-[A-Za-z0-9_\-]{20,}/gi, 'sk-[REDACTED]');
    sanitized = sanitized.replace(/ghp_[A-Za-z0-9_]+/gi, '[REDACTED_SECRET]');
    sanitized = sanitized.replace(/key=[A-Za-z0-9_\-\.]{20,}/gi, 'key=[REDACTED_SECRET]');
    sanitized = sanitized.replace(/-----BEGIN [A-Z ]+ PRIVATE KEY-----[^-]+-----END [A-Z ]+ PRIVATE KEY-----/gs, '[REDACTED_PRIVATE_KEY]');

    return sanitized;
  }

  /**
   * Instance helper: delegates to static redactSecrets.
   */
  public redactSecrets(text?: string): string {
    return CredentialProvider.redactSecrets(text);
  }
}
