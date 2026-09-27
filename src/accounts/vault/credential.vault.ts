/**
 * HṚṢĪKEŚA (हृषीकेश) — AES-256-GCM Sovereign Credential Vault
 *
 * FP-12: Provider-independent encrypted credential vault.
 * All tokens, API keys, client secrets, and cookies are encrypted at rest with AES-256-GCM.
 * Only non-secret metadata and URI references (vault://...) are stored in SQLite or passed to components.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ILogger } from '../../core/logging/logger.types.js';
import { AccountRepository } from '../repository/account.repository.js';
import { AccountCredentialMetadata } from '../types/account.types.js';

export interface EncryptedVaultRecord {
  readonly ref: string;
  readonly iv: string; // Hex
  readonly authTag: string; // Hex
  readonly ciphertext: string; // Hex
  readonly keyId: string;
  readonly algorithm: 'aes-256-gcm';
  readonly createdAt: string;
  readonly updatedAt: string;
}

export class CredentialVault {
  private readonly storageDir: string;
  private readonly masterKeyFile: string;
  private masterKey: Buffer;
  private readonly keyId: string = 'hris-vault-k1';
  private readonly repo?: AccountRepository;
  private readonly logger?: ILogger;
  private readonly memoryCache = new Map<string, Record<string, any>>();

  constructor(
    repoOrOptions?:
      | AccountRepository
      | {
          storageDir?: string;
          repo?: AccountRepository;
          logger?: ILogger;
          masterKeyOverride?: Buffer;
          keyPath?: string;
        },
    logger?: ILogger,
    options?: {
      storageDir?: string;
      keyPath?: string;
      masterKeyOverride?: Buffer;
    }
  ) {
    let resolvedRepo: AccountRepository | undefined;
    let resolvedLogger: ILogger | undefined;
    let resolvedStorageDir: string | undefined;
    let resolvedKeyPath: string | undefined;
    let resolvedKeyOverride: Buffer | undefined;

    if (repoOrOptions && 'saveCredentialMetadata' in (repoOrOptions as any)) {
      resolvedRepo = repoOrOptions as AccountRepository;
      resolvedLogger = logger;
      resolvedStorageDir = options?.storageDir;
      resolvedKeyPath = options?.keyPath;
      resolvedKeyOverride = options?.masterKeyOverride;
    } else if (repoOrOptions && typeof repoOrOptions === 'object') {
      const opts = repoOrOptions as any;
      resolvedRepo = opts.repo;
      resolvedLogger = opts.logger || logger;
      resolvedStorageDir = opts.storageDir;
      resolvedKeyPath = opts.keyPath;
      resolvedKeyOverride = opts.masterKeyOverride;
    }

    this.storageDir = resolvedStorageDir || path.join(process.cwd(), 'data', 'vault');
    this.masterKeyFile = resolvedKeyPath || path.join(this.storageDir, '.vault_master.key');
    this.repo = resolvedRepo;
    this.logger = resolvedLogger?.child ? resolvedLogger.child('CredentialVault') : resolvedLogger;

    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }

    if (resolvedKeyOverride) {
      this.masterKey = resolvedKeyOverride;
    } else {
      this.masterKey = this.loadOrGenerateMasterKey();
    }
  }

  private loadOrGenerateMasterKey(): Buffer {
    try {
      if (fs.existsSync(this.masterKeyFile)) {
        const hex = fs.readFileSync(this.masterKeyFile, 'utf8').trim();
        if (hex.length === 64) {
          return Buffer.from(hex, 'hex');
        }
      }
      const newKey = crypto.randomBytes(32);
      fs.writeFileSync(this.masterKeyFile, newKey.toString('hex'), { encoding: 'utf8', mode: 0o600 });
      return newKey;
    } catch (err) {
      this.logger?.warn('Failed to persist vault master key to disk; using in-memory ephemeral key', { error: String(err) });
      return crypto.randomBytes(32);
    }
  }

  /**
   * Encrypts and persists secret payload under a unique reference URI (e.g. vault://providers/google/acc_123).
   */
  public async store(
    ref: string,
    payload: Record<string, any>,
    options?: {
      providerId?: string;
      accountId?: string;
      hasRefreshToken?: boolean;
      expiresAt?: string;
    }
  ): Promise<void> {
    if (!ref || typeof ref !== 'string') {
      throw new Error('Invalid vault credential reference');
    }

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);

    const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const record: EncryptedVaultRecord = {
      ref,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      ciphertext: encrypted.toString('hex'),
      keyId: this.keyId,
      algorithm: 'aes-256-gcm',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Write encrypted payload file
    const safeFilename = this.refToFilename(ref);
    const filePath = path.join(this.storageDir, `${safeFilename}.enc`);
    fs.writeFileSync(filePath, JSON.stringify(record, null, 2), { encoding: 'utf8', mode: 0o600 });

    // 2. Cache in memory
    this.memoryCache.set(ref, { ...payload });

    // 3. Persist non-secret metadata in SQLite
    if (this.repo) {
      let providerId = options?.providerId;
      let accountId = options?.accountId;
      if (!providerId || !accountId) {
        const parts = ref.replace(/^vault:\/\//, '').split('/');
        if (parts.length >= 3 && parts[0] === 'providers') {
          providerId = providerId || parts[1];
          accountId = accountId || parts[2];
        } else {
          providerId = providerId || 'system';
          accountId = accountId || ref;
        }
      }

      const meta: AccountCredentialMetadata = {
        ref,
        providerId,
        accountId,
        keyAlgorithm: 'aes-256-gcm',
        keyId: this.keyId,
        hasRefreshToken: options?.hasRefreshToken || false,
        expiresAt: options?.expiresAt,
        createdAt: record.createdAt,
        rotatedAt: undefined,
      };
      this.repo.saveCredentialMetadata(meta);
    }

    this.logger?.debug(`Securely stored and encrypted credentials for '${ref}'`);
  }

  /**
   * Resolves and decrypts the credential payload for execution.
   */
  public async resolve(ref: string): Promise<Record<string, any> | undefined> {
    if (!ref || typeof ref !== 'string') return undefined;

    // 1. Check memory cache
    if (this.memoryCache.has(ref)) {
      return { ...this.memoryCache.get(ref)! };
    }

    // 2. Read from disk
    const safeFilename = this.refToFilename(ref);
    const filePath = path.join(this.storageDir, `${safeFilename}.enc`);
    if (!fs.existsSync(filePath)) {
      return undefined;
    }

    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const record: EncryptedVaultRecord = JSON.parse(raw);

      const iv = Buffer.from(record.iv, 'hex');
      const authTag = Buffer.from(record.authTag, 'hex');
      const ciphertext = Buffer.from(record.ciphertext, 'hex');

      const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      const payload = JSON.parse(decrypted.toString('utf8'));

      this.memoryCache.set(ref, payload);
      return payload;
    } catch (err) {
      this.logger?.error(`Failed to decrypt credentials for '${ref}'`, { error: String(err) });
      return undefined;
    }
  }

  /**
   * Re-encrypts with a new payload (e.g. on token refresh).
   */
  public async rotate(
    ref: string,
    newPayload: Record<string, any>,
    options?: {
      providerId?: string;
      accountId?: string;
      expiresAt?: string;
      hasRefreshToken?: boolean;
    }
  ): Promise<void> {
    const existing = await this.resolve(ref);
    const merged = { ...(existing || {}), ...newPayload };

    let providerId = options?.providerId;
    let accountId = options?.accountId;

    if (this.repo) {
      const meta = this.repo.getCredentialMetadata(ref);
      if (meta) {
        providerId = meta.providerId;
        accountId = meta.accountId;
      }
    }

    await this.store(ref, merged, {
      providerId,
      accountId,
      hasRefreshToken: options?.hasRefreshToken,
      expiresAt: options?.expiresAt,
    });
  }

  /**
   * Deletes and revokes credentials.
   */
  public async revoke(ref: string): Promise<void> {
    this.memoryCache.delete(ref);
    const safeFilename = this.refToFilename(ref);
    const filePath = path.join(this.storageDir, `${safeFilename}.enc`);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch { /* ignore */ }
    }
    if (this.repo) {
      this.repo.deleteCredentialMetadata(ref);
    }
    this.logger?.info(`Revoked and erased credentials for '${ref}'`);
  }

  public async delete(ref: string): Promise<void> {
    return this.revoke(ref);
  }

  public async exists(ref: string): Promise<boolean> {
    if (this.memoryCache.has(ref)) return true;
    const safeFilename = this.refToFilename(ref);
    const filePath = path.join(this.storageDir, `${safeFilename}.enc`);
    return fs.existsSync(filePath);
  }

  /**
   * Redacts sensitive fields from any object or payload before logging or UI exposure.
   */
  public static redactSecrets(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;

    const sensitiveKeys = [
      'accesstoken',
      'refreshtoken',
      'clientsecret',
      'password',
      'secret',
      'authorizationcode',
      'codeverifier',
      'idtoken',
      'apikey',
      'privatekey',
      'bearer',
      'cookie',
      'authorization',
      'token',
      'credential',
    ];

    if (Array.isArray(obj)) {
      return obj.map(item => CredentialVault.redactSecrets(item));
    }

    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lower = key.toLowerCase();
      const normalized = lower.replace(/[-_]/g, '');
      if (sensitiveKeys.some(k => normalized.includes(k) || lower.includes(k))) {
        cleaned[key] = typeof value === 'string' && value.length > 8
          ? `${value.slice(0, 3)}***${value.slice(-3)}`
          : '***REDACTED***';
      } else if (typeof value === 'object') {
        cleaned[key] = CredentialVault.redactSecrets(value);
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }

  private refToFilename(ref: string): string {
    const cleaned = ref.replace(/[^a-zA-Z0-9_-]/g, '_');
    const hash = crypto.createHash('sha256').update(ref).digest('hex').slice(0, 12);
    return `${cleaned.slice(0, 48)}_${hash}`;
  }
}
