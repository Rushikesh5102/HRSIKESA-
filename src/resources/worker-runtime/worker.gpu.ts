/**
 * HṚṢĪKEŚA (हृषीकेश) — FP-04 Real GPU Telemetry Probe
 *
 * Implements hardware probes for NVIDIA (nvidia-smi), AMD (rocm-smi),
 * and Intel (Level-Zero / Arc / OS diagnostics).
 *
 * CRITICAL RULE:
 * If unavailable or uninstalled, return gpuUtilization = 'UNKNOWN' or 0.
 * DO NOT FABRICATE GPU telemetry.
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export interface GpuMetrics {
  readonly vendor: 'NVIDIA' | 'AMD' | 'INTEL' | 'UNKNOWN';
  readonly name?: string;
  readonly available: boolean;
  readonly gpuUtilizationPercent: number | 'UNKNOWN';
  readonly memoryTotalMb: number;
  readonly memoryUsedMb: number;
  readonly memoryFreeMb: number;
  readonly temperatureC?: number;
}

export class WorkerGpuTelemetry {
  /**
   * Probes system for GPU hardware and returns verified real telemetry.
   */
  public static async probeGpu(): Promise<GpuMetrics> {
    // 1. Try NVIDIA
    try {
      const nvidia = await this.probeNvidia();
      if (nvidia) return nvidia;
    } catch {
      // NVIDIA not present or failed
    }

    // 2. Try AMD ROCm
    try {
      const amd = await this.probeAmd();
      if (amd) return amd;
    } catch {
      // AMD not present or failed
    }

    // 3. Try Intel Arc / OS Level
    try {
      const intel = await this.probeIntel();
      if (intel) return intel;
    } catch {
      // Intel not present or failed
    }

    return {
      vendor: 'UNKNOWN',
      available: false,
      gpuUtilizationPercent: 'UNKNOWN',
      memoryTotalMb: 0,
      memoryUsedMb: 0,
      memoryFreeMb: 0,
    };
  }

  private static async probeNvidia(): Promise<GpuMetrics | null> {
    try {
      const { stdout } = await execAsync(
        'nvidia-smi --query-gpu=name,utilization.gpu,memory.total,memory.used,memory.free,temperature.gpu --format=csv,noheader,nounits',
        { timeout: 3000 }
      );

      const parts = stdout.trim().split(',').map((p) => p.trim());
      if (parts.length >= 5) {
        const name = parts[0];
        const util = parseFloat(parts[1]);
        const total = parseFloat(parts[2]);
        const used = parseFloat(parts[3]);
        const free = parseFloat(parts[4]);
        const temp = parts[5] ? parseFloat(parts[5]) : undefined;

        return {
          vendor: 'NVIDIA',
          name,
          available: true,
          gpuUtilizationPercent: isNaN(util) ? 'UNKNOWN' : util,
          memoryTotalMb: isNaN(total) ? 0 : total,
          memoryUsedMb: isNaN(used) ? 0 : used,
          memoryFreeMb: isNaN(free) ? 0 : free,
          temperatureC: isNaN(temp as number) ? undefined : temp,
        };
      }
    } catch {
      // nvidia-smi failed or not installed
    }
    return null;
  }

  private static async probeAmd(): Promise<GpuMetrics | null> {
    try {
      const { stdout } = await execAsync('rocm-smi --showuse --showmeminfo vram --json', { timeout: 3000 });
      const data = JSON.parse(stdout);
      if (data && typeof data === 'object') {
        const firstCardKey = Object.keys(data)[0];
        if (firstCardKey) {
          const card = data[firstCardKey];
          return {
            vendor: 'AMD',
            available: true,
            gpuUtilizationPercent: parseFloat(card['GPU use (%)'] || '0') || 'UNKNOWN',
            memoryTotalMb: parseFloat(card['VRAM Total Memory (B)'] || '0') / (1024 * 1024),
            memoryUsedMb: parseFloat(card['VRAM Total Used Memory (B)'] || '0') / (1024 * 1024),
            memoryFreeMb: 0,
          };
        }
      }
    } catch {
      // rocm-smi failed or not installed
    }
    return null;
  }

  private static async probeIntel(): Promise<GpuMetrics | null> {
    // Check for Intel graphics diagnostics on Windows
    if (process.platform === 'win32') {
      try {
        const { stdout } = await execAsync(
          'powershell -Command "Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name"',
          { timeout: 3000 }
        );
        const lines = stdout.split('\r\n').map((l) => l.trim()).filter(Boolean);
        const intelLine = lines.find((l) => /Intel.*(Arc|Iris|Graphics|UHD)/i.test(l));
        if (intelLine) {
          return {
            vendor: 'INTEL',
            name: intelLine,
            available: true,
            gpuUtilizationPercent: 'UNKNOWN', // Level-Zero requires specialized SDK
            memoryTotalMb: 0,
            memoryUsedMb: 0,
            memoryFreeMb: 0,
          };
        }
      } catch {
        // PowerShell query failed
      }
    }
    return null;
  }
}
