/**
 * HṚṢĪKEŚA (हृषीकेश) — FP-06 LAN Pairing Package Generator
 *
 * Generates complete pairing packages that contain everything a remote physical
 * LAN worker needs to connect, authenticate, and begin executing tasks:
 *
 *   - Single-use enrollment token
 *   - Server host/port and LAN endpoint
 *   - TLS certificate fingerprint for pinning
 *   - Pre-built CLI commands for bash/powershell
 *   - Expiry timestamp
 *
 * The pairing package is designed to be displayed to the operator or
 * transmitted to the remote machine via a trusted out-of-band channel.
 */

import * as crypto from 'node:crypto';
import { LanPairingPackage } from './worker.transport.types.js';
import { LanNetworkHelper } from './worker.transport.network.js';

export interface PairingGenerateOptions {
  /** Enrollment token from ResourceManager.generateEnrollmentToken() */
  readonly enrollmentToken: string;
  /** The transport server's bind host (may be 0.0.0.0) */
  readonly bindHost: string;
  /** The transport server's port */
  readonly port: number;
  /** SHA-256 fingerprint of the server's TLS certificate */
  readonly serverFingerprint: string;
  /** Seconds until the token expires (informational) */
  readonly ttlSeconds: number;
  /** Optional human-readable worker name hint */
  readonly workerNameHint?: string;
}

export class LanPairingGenerator {
  /**
   * Generates a complete LanPairingPackage with pre-built CLI commands
   * for both Windows (PowerShell) and Unix (bash) physical LAN workers.
   */
  public static generate(options: PairingGenerateOptions): LanPairingPackage {
    const host = options.bindHost === '0.0.0.0'
      ? LanNetworkHelper.getPrimaryLanIpv4()
      : options.bindHost;

    const lanEndpoint = `${host}:${options.port}`;
    const expiresAt = new Date(Date.now() + options.ttlSeconds * 1000).toISOString();
    const pairingToken = `hrsk_pair_${crypto.randomBytes(12).toString('hex')}`;
    const nameHint = options.workerNameHint || 'LAN-Worker';

    // Build ready-to-paste CLI commands
    const cliBase = `npx tsx src/resources/worker-runtime/worker.runtime.ts`;
    const cliArgs = `--server ${lanEndpoint} --token ${options.enrollmentToken} --name "${nameHint}"`;

    const cliCommand = `${cliBase} ${cliArgs}`;
    const powershellCommand = `${cliBase} ${cliArgs}`;
    const bashCommand = `${cliBase} ${cliArgs}`;

    return {
      pairingToken,
      host,
      port: options.port,
      lanEndpoint,
      serverFingerprint: options.serverFingerprint,
      expiresAt,
      cliCommand,
      powershellCommand,
      bashCommand,
    };
  }

  /**
   * Formats a pairing package as a human-readable display string,
   * suitable for printing to a console or sending to an operator.
   */
  public static formatForDisplay(pkg: LanPairingPackage): string {
    const lines = [
      '╔══════════════════════════════════════════════════════════════╗',
      '║        HṚṢĪKEŚA — Physical LAN Worker Pairing              ║',
      '╠══════════════════════════════════════════════════════════════╣',
      `║  LAN Endpoint    : ${pkg.lanEndpoint.padEnd(40)}║`,
      `║  Fingerprint     : ${pkg.serverFingerprint.slice(0, 40)}║`,
      `║  Expires At      : ${pkg.expiresAt.padEnd(40)}║`,
      '╠══════════════════════════════════════════════════════════════╣',
      '║  Run on the remote machine:                                 ║',
      '║                                                              ║',
      `║  ${pkg.bashCommand.slice(0, 58).padEnd(60)}║`,
      '║                                                              ║',
      '╚══════════════════════════════════════════════════════════════╝',
    ];
    return lines.join('\n');
  }

  /**
   * Validates whether a LanPairingPackage is still within its expiry window.
   */
  public static isExpired(pkg: LanPairingPackage): boolean {
    return new Date(pkg.expiresAt).getTime() < Date.now();
  }
}
