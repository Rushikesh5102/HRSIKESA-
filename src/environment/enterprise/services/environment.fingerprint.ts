/**
 * HṚṢĪKEŚA (हृषीकेश) — Environment Fingerprinting Service
 *
 * Phase 23: Safely collects system fingerprints (OS, arch, hostname, available shells,
 * software summary) without harvesting sensitive environment variables or credentials.
 */

import os from 'os';
import { EnvironmentFingerprint } from '../interfaces/environment.types.js';

export class EnvironmentFingerprintService {
  /**
   * Captures the local host's environment fingerprint safely.
   */
  static captureLocalFingerprint(): EnvironmentFingerprint {
    const platform = os.platform();
    const availableShells: string[] = [];

    if (platform === 'win32') {
      availableShells.push('powershell.exe', 'cmd.exe');
      if (process.env.SHELL) availableShells.push(process.env.SHELL);
    } else {
      availableShells.push('/bin/sh', '/bin/bash');
      if (process.env.SHELL && !availableShells.includes(process.env.SHELL)) {
        availableShells.push(process.env.SHELL);
      }
    }

    const totalMemGb = Math.round((os.totalmem() / (1024 * 1024 * 1024)) * 100) / 100;
    const freeMemGb = Math.round((os.freemem() / (1024 * 1024 * 1024)) * 100) / 100;

    return {
      os: `${os.type()} ${os.release()}`,
      platform,
      arch: os.arch(),
      hostname: os.hostname(),
      cpuCores: os.cpus().length,
      totalMemoryGb: totalMemGb,
      diskFreeGb: freeMemGb,
      availableShells,
      installedSoftwareSummary: [
        `Node.js ${process.version}`,
        `V8 Engine`,
        platform === 'win32' ? 'Windows Management Framework' : 'POSIX Utilities',
      ],
      networkMetadata: {
        isVpnActive: false,
      },
      capturedAt: new Date().toISOString(),
    };
  }

  /**
   * Generates a unique connection fingerprint from host, port, type, and platform.
   */
  static computeConnectionFingerprint(type: string, platform: string, hostname: string, port?: number): string {
    return `${type.toLowerCase()}://${hostname.toLowerCase()}${port ? `:${port}` : ''}#${platform.toLowerCase()}`;
  }
}
