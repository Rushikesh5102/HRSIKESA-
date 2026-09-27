/**
 * HṚṢĪKEŚA (हृषीकेश) — Resource Fabric Security & Privacy Policy Engine
 *
 * FP-03: Foundation Performance & Execution Block
 * Distributed Local/LAN Resource Fabric & Execution Capacity
 *
 * Enforces:
 * 1. Cryptographic worker enrollment and token validation (SHA-256, no plaintext secrets)
 * 2. Privacy level boundaries (SOVEREIGN_LOCAL, HIGHLY_PRIVATE, PRIVATE, PUBLIC)
 * 3. Bounded safe remote workloads (prevention of unrestricted remote shell backdoors)
 * 4. Artifact transfer sandboxing (path traversal, size limits, SHA-256 verification)
 */

import crypto from 'node:crypto';
import path from 'node:path';
import {
  Worker,
  WorkerPrivacyLevel,
  EnrollmentToken,
} from './resource.types.js';

export interface PrivacyPolicyCheckResult {
  readonly allowed: boolean;
  readonly reason?: string;
}

export interface WorkloadAuthorizationResult {
  readonly authorized: boolean;
  readonly reason?: string;
  readonly riskTier: 'SAFE' | 'CONTROLLED' | 'RESTRICTED' | 'DENIED';
}

export class ResourcePolicyManager {
  private static readonly MAX_ARTIFACT_SIZE_BYTES = 50 * 1024 * 1024; // 50MB default ceiling
  private static readonly ALLOWED_LAN_WORKLOADS = new Set<string>([
    'compute.echo',
    'compute.benchmark',
    'resource.fabric.test',
    'inference.generate',
    'model.health',
    'research.scrape',
  ]);

  /**
   * Hashes a sensitive token using SHA-256. Never stores or logs plaintext.
   */
  public hashToken(token: string): string {
    return crypto.createHash('sha256').update(token.trim()).digest('hex');
  }

  /**
   * Generates a short-lived cryptographic pairing token for enrolling a new LAN worker.
   */
  public generateEnrollmentToken(name: string, ttlSeconds = 600): { token: string; record: EnrollmentToken } {
    const rawSecret = crypto.randomBytes(32).toString('hex');
    const token = `hrsk_enroll_${rawSecret}`;
    const tokenHash = this.hashToken(token);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();

    const record: EnrollmentToken = {
      tokenHash,
      name,
      createdAt: now.toISOString(),
      expiresAt,
      revoked: false,
    };

    return { token, record };
  }

  /**
   * Evaluates if a worker satisfies privacy constraints for a task.
   */
  public evaluatePrivacy(privacyLevel: WorkerPrivacyLevel, worker: Worker): PrivacyPolicyCheckResult {
    switch (privacyLevel) {
      case 'SOVEREIGN_LOCAL':
        if (worker.type !== 'LOCAL') {
          return {
            allowed: false,
            reason: `Task privacy level SOVEREIGN_LOCAL strictly prohibits off-device execution. Worker '${worker.name}' (${worker.type}) rejected.`,
          };
        }
        return { allowed: true };

      case 'HIGHLY_PRIVATE':
        if (worker.type !== 'LOCAL') {
          return {
            allowed: false,
            reason: `Task privacy level HIGHLY_PRIVATE defaults to local machine. Worker '${worker.name}' (${worker.type}) rejected.`,
          };
        }
        return { allowed: true };

      case 'PRIVATE':
        if (worker.trustLevel !== 'TRUSTED' && worker.trustLevel !== 'ENROLLED') {
          return {
            allowed: false,
            reason: `Task privacy level PRIVATE requires TRUSTED or ENROLLED worker. Worker '${worker.name}' has trust level '${worker.trustLevel}'.`,
          };
        }
        if (worker.type === 'CLOUD') {
          return {
            allowed: false,
            reason: `Task privacy level PRIVATE cannot be dispatched to untrusted cloud worker.`,
          };
        }
        return { allowed: true };

      case 'PUBLIC':
      default:
        if (worker.trustLevel === 'BLOCKED' || worker.trustLevel === 'REVOKED') {
          return {
            allowed: false,
            reason: `Worker '${worker.name}' is ${worker.trustLevel}.`,
          };
        }
        return { allowed: true };
    }
  }

  /**
   * Authorizes whether a workload is safe to dispatch to a given worker type.
   * Strictly prevents unrestricted remote shell backdoors over LAN/remote connections.
   */
  public authorizeWorkload(taskType: string, worker: Worker): WorkloadAuthorizationResult {
    // Local workers have access to authorized tools through existing permission gates
    if (worker.type === 'LOCAL') {
      return {
        authorized: true,
        riskTier: 'CONTROLLED',
      };
    }

    // Remote / LAN workers are strictly bounded to whitelisted workloads during FP-03
    if (ResourcePolicyManager.ALLOWED_LAN_WORKLOADS.has(taskType)) {
      return {
        authorized: true,
        riskTier: 'SAFE',
      };
    }

    return {
      authorized: false,
      reason: `Workload '${taskType}' is not in the authorized bounded execution whitelist for non-local worker '${worker.name}'. Arbitrary remote execution denied.`,
      riskTier: 'DENIED',
    };
  }

  /**
   * Validates artifact metadata for transfer safety (path traversal prevention, size check).
   */
  public validateArtifactSafety(
    artifact: { name: string; sizeBytes: number; destinationPath: string },
    allowedBaseDir: string
  ): { valid: boolean; reason?: string } {
    if (artifact.sizeBytes > ResourcePolicyManager.MAX_ARTIFACT_SIZE_BYTES) {
      return {
        valid: false,
        reason: `Artifact size ${artifact.sizeBytes} exceeds maximum permitted boundary of ${ResourcePolicyManager.MAX_ARTIFACT_SIZE_BYTES} bytes.`,
      };
    }

    // Path traversal check
    const resolvedPath = path.resolve(allowedBaseDir, artifact.destinationPath);
    const resolvedBase = path.resolve(allowedBaseDir);

    if (!resolvedPath.startsWith(resolvedBase)) {
      return {
        valid: false,
        reason: `Path traversal detected: destination path '${artifact.destinationPath}' resolves outside allowed sandbox '${allowedBaseDir}'.`,
      };
    }

    if (artifact.destinationPath.includes('..') || artifact.name.includes('..')) {
      return {
        valid: false,
        reason: `Artifact name or path contains illegal '..' sequence.`,
      };
    }

    return { valid: true };
  }

  /**
   * Computes or verifies SHA-256 hash of an artifact buffer.
   */
  public verifyArtifactHash(buffer: Buffer, expectedHash: string): boolean {
    const computedHash = crypto.createHash('sha256').update(buffer).digest('hex');
    return computedHash.toLowerCase() === expectedHash.toLowerCase();
  }
}
