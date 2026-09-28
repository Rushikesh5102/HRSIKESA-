/**
 * HṚṢĪKEŚA (हृषीकेश) — Evolution Boundary & Credential Guard
 *
 * Enforces OS filesystem boundaries, credential isolation, secret redaction,
 * and network egress control for autonomous self-development experiments.
 */

import path from 'node:path';
import { TrustTierManager } from './trust-tiers.js';
import { ProtectionTier } from '../types/evolution.types.js';

export interface BoundaryValidationResult {
  allowed: boolean;
  reason: string;
  resolvedPath: string;
}

export class BoundaryGuard {
  private readonly allowedWorktreeRoots: Set<string> = new Set();
  private readonly trustedRepoRoot: string;

  // Sensitive paths that must never be accessed under any circumstances
  private readonly forbiddenPathPatterns: RegExp[] = [
    /[\\/]\.ssh[\\/]/i,
    /[\\/]\.aws[\\/]/i,
    /[\\/]\.config[\\/]gcloud/i,
    /[\\/]AppData[\\/]Local[\\/]Google[\\/]Chrome/i,
    /[\\/]AppData[\\/]Roaming[\\/]Mozilla/i,
    /[\\/]Windows[\\/]System32/i,
    /[\\/]Windows[\\/]SysWOW64/i,
    /[\\/]Documents[\\/]/i,
    /[\\/]Downloads[\\/]/i,
    /[\\/]Pictures[\\/]/i,
    /[\\/]Desktop[\\/](?!HṚṢĪKEŚA)/i, // No other Desktop folders except this repo
  ];

  // Common credential patterns to detect and redact
  private readonly secretPatterns: Array<{ pattern: RegExp; replacement: string }> = [
    { pattern: /(?:api[_-]?key|apikey|secret|token|password|auth|jwt)\s*[:=]\s*['"]?([a-zA-Z0-9_\-\.]{16,})['"]?/gi, replacement: '[REDACTED_CREDENTIAL]' },
    { pattern: /(?:ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{50,})/g, replacement: '[REDACTED_GITHUB_TOKEN]' },
    { pattern: /sk-[a-zA-Z0-9]{20,}/g, replacement: '[REDACTED_API_KEY]' },
    { pattern: /-----BEGIN\s+[A-Z\s]+PRIVATE\s+KEY-----[\s\S]*?-----END\s+[A-Z\s]+PRIVATE\s+KEY-----/g, replacement: '[REDACTED_PRIVATE_KEY]' },
    { pattern: /xox[baprs]-[0-9a-zA-Z]{10,48}/g, replacement: '[REDACTED_SLACK_TOKEN]' },
    { pattern: /AIza[0-9A-Za-z\-_]{35}/g, replacement: '[REDACTED_GOOGLE_API_KEY]' },
  ];

  // Permitted network egress domains
  private readonly allowedEgressDomains: Set<string> = new Set([
    'localhost',
    '127.0.0.1',
    'registry.npmjs.org',
    'github.com',
    'api.github.com',
  ]);

  constructor(trustedRepoRoot: string = process.cwd()) {
    this.trustedRepoRoot = path.resolve(trustedRepoRoot);
  }

  /**
   * Register an authorized experiment worktree root.
   */
  public registerWorktreeRoot(worktreePath: string): void {
    this.allowedWorktreeRoots.add(path.resolve(worktreePath));
  }

  /**
   * Unregister an experiment worktree root when discarded.
   */
  public unregisterWorktreeRoot(worktreePath: string): void {
    this.allowedWorktreeRoots.delete(path.resolve(worktreePath));
  }

  /**
   * Validate that a target path resides STRICTLY inside the authorized experiment worktree.
   * Modifying the trusted production root or breaking out to user/system directories is blocked.
   */
  public validateWorktreePath(targetPath: string, activeWorktreePath: string): BoundaryValidationResult {
    const resolvedTarget = path.isAbsolute(targetPath)
      ? path.resolve(targetPath)
      : path.resolve(activeWorktreePath, targetPath);

    const normTarget = path.normalize(resolvedTarget).toLowerCase();
    const normWorktree = path.normalize(path.resolve(activeWorktreePath)).toLowerCase();

    // 1. Check for prohibited sensitive host directories
    for (const pat of this.forbiddenPathPatterns) {
      if (pat.test(resolvedTarget)) {
        return {
          allowed: false,
          reason: `CRITICAL BOUNDARY VIOLATION: Access to sensitive host path prohibited: ${resolvedTarget}`,
          resolvedPath: resolvedTarget,
        };
      }
    }

    // 2. Strict containment check: target MUST be inside activeWorktreePath
    if (normTarget === normWorktree || normTarget.startsWith(normWorktree + path.sep)) {
      return {
        allowed: true,
        reason: `Target path is strictly inside active experiment worktree: ${activeWorktreePath}`,
        resolvedPath: resolvedTarget,
      };
    }

    // 3. Denied if attempting to escape worktree
    return {
      allowed: false,
      reason: `SECURITY VIOLATION: Path '${targetPath}' escapes the isolated worktree boundary '${activeWorktreePath}'. Arbitrary filesystem access is blocked.`,
      resolvedPath: resolvedTarget,
    };
  }

  /**
   * Validate read-only access to repository source code for self-inspection.
   */
  public validateSourceReadPath(targetPath: string): BoundaryValidationResult {
    const resolvedTarget = path.isAbsolute(targetPath)
      ? path.resolve(targetPath)
      : path.resolve(this.trustedRepoRoot, targetPath);

    const normTarget = path.normalize(resolvedTarget).toLowerCase();
    const normRepo = path.normalize(this.trustedRepoRoot).toLowerCase();

    // Check sensitive patterns
    for (const pat of this.forbiddenPathPatterns) {
      if (pat.test(resolvedTarget)) {
        return {
          allowed: false,
          reason: `Access to sensitive path prohibited: ${resolvedTarget}`,
          resolvedPath: resolvedTarget,
        };
      }
    }

    // Cannot read .env or credential vaults
    if (/[\\/]\.env/i.test(resolvedTarget) || /[\\/]vault/i.test(resolvedTarget)) {
      return {
        allowed: false,
        reason: `Access to secrets or environment vault prohibited: ${resolvedTarget}`,
        resolvedPath: resolvedTarget,
      };
    }

    if (normTarget === normRepo || normTarget.startsWith(normRepo + path.sep)) {
      return {
        allowed: true,
        reason: `Target path is within repository source tree.`,
        resolvedPath: resolvedTarget,
      };
    }

    return {
      allowed: false,
      reason: `Path '${targetPath}' resides outside the HṚṢĪKEŚA repository source boundary.`,
      resolvedPath: resolvedTarget,
    };
  }

  /**
   * Asserts that a target path is allowed. Throws an error immediately if violated.
   */
  public assertPathAllowed(targetPath: string, mode: 'READ' | 'WRITE' = 'READ', activeWorktreePath?: string): void {
    const resolvedTarget = path.isAbsolute(targetPath)
      ? path.resolve(targetPath)
      : path.resolve(this.trustedRepoRoot, targetPath);

    const normTarget = path.normalize(resolvedTarget).toLowerCase();
    const normRepo = path.normalize(this.trustedRepoRoot).toLowerCase();

    // Check sensitive host directories
    for (const pat of this.forbiddenPathPatterns) {
      if (pat.test(resolvedTarget)) {
        throw new Error(`Access outside authorized development boundary is prohibited: ${resolvedTarget}`);
      }
    }

    // Check secrets
    if (/[\\/]\.env/i.test(resolvedTarget) || /[\\/]vault/i.test(resolvedTarget)) {
      throw new Error(`Direct access to environment secrets file is prohibited: ${resolvedTarget}`);
    }

    // Check outside workspace boundary
    const isInsideRepo = normTarget === normRepo || normTarget.startsWith(normRepo + path.sep);
    let isInsideWorktree = false;
    if (activeWorktreePath) {
      const normWorktree = path.normalize(path.resolve(activeWorktreePath)).toLowerCase();
      isInsideWorktree = normTarget === normWorktree || normTarget.startsWith(normWorktree + path.sep);
    }

    if (!isInsideRepo && !isInsideWorktree) {
      throw new Error(`Access outside authorized development boundary is prohibited: ${resolvedTarget}`);
    }

    if (mode === 'WRITE') {
      const tierMgr = new TrustTierManager();
      if (tierMgr.getFileTier(resolvedTarget) === ProtectionTier.TIER_0_IMMUTABLE_SAFETY_CORE) {
        throw new Error(`Prohibited write access to Tier 0 immutable safety core: ${resolvedTarget}`);
      }
    }
  }

  /**
   * Redacts sensitive keys, tokens, and credentials from any text content.
   */
  public redactSecrets(content: string): string {
    if (!content || typeof content !== 'string') return content;
    let sanitized = content;
    for (const { pattern, replacement } of this.secretPatterns) {
      sanitized = sanitized.replace(pattern, replacement);
    }
    return sanitized;
  }

  public redactSensitive(content: string): string {
    return this.redactSecrets(content);
  }

  /**
   * Check if a proposed network egress hostname or URL is permitted.
   */
  public validateNetworkEgress(targetUrlOrHost: string): { allowed: boolean; reason: string } {
    try {
      let hostname = targetUrlOrHost;
      if (targetUrlOrHost.includes('://')) {
        hostname = new URL(targetUrlOrHost).hostname;
      }
      hostname = hostname.toLowerCase();

      if (this.allowedEgressDomains.has(hostname) || hostname === 'localhost' || hostname === '127.0.0.1') {
        return { allowed: true, reason: `Egress to ${hostname} is permitted under active policy.` };
      }

      return {
        allowed: false,
        reason: `NETWORK EGRESS VIOLATION: Unauthorized egress to host '${hostname}'. Host is not on allowlist.`,
      };
    } catch {
      return {
        allowed: false,
        reason: `NETWORK EGRESS VIOLATION: Invalid URL or host '${targetUrlOrHost}'.`,
      };
    }
  }
}
