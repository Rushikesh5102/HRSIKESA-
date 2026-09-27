/**
 * HṚṢĪKEŚA (हृषीकेश) — FP-04 Worker Capability Discovery
 *
 * Scans physical worker hardware and installed model runtimes
 * (Ollama, llama.cpp, CPU, GPU, RAM) and generates dynamic capability descriptors.
 */

import * as http from 'node:http';
import { WorkerCapability } from '../resource.types.js';
import { WorkerGpuTelemetry } from './worker.gpu.js';

export interface ScannedCapabilities {
  capabilities: WorkerCapability[];
  models: string[];
  gpuBackend?: string;
  vramBytes?: number;
}

export class WorkerCapabilityScanner {
  /**
   * Scans the host environment and returns real detected capabilities.
   */
  public static async scanCapabilities(): Promise<ScannedCapabilities> {
    const gpuMetrics = await WorkerGpuTelemetry.probeGpu();
    const installedModels = await this.discoverInstalledModels();

    const capabilities: WorkerCapability[] = [
      {
        capabilityId: 'compute.echo',
        version: '1.0.0',
        available: true,
        securityLevel: 'SAFE',
      },
      {
        capabilityId: 'compute.benchmark',
        version: '1.0.0',
        available: true,
        securityLevel: 'SAFE',
      },
      {
        capabilityId: 'resource.fabric.test',
        version: '1.0.0',
        available: true,
        securityLevel: 'SAFE',
      },
      {
        capabilityId: 'model.health',
        version: '1.0.0',
        available: true,
        securityLevel: 'SAFE',
      },
    ];

    if (installedModels.length > 0) {
      capabilities.push({
        capabilityId: 'inference.generate',
        version: '1.0.0',
        available: true,
        metadata: {
          supportedModels: installedModels,
        },
        securityLevel: 'SAFE',
      });
    }

    return {
      capabilities,
      models: installedModels,
      gpuBackend: gpuMetrics.vendor !== 'UNKNOWN' ? gpuMetrics.vendor : undefined,
      vramBytes: gpuMetrics.memoryTotalMb > 0 ? gpuMetrics.memoryTotalMb * 1024 * 1024 : undefined,
    };
  }

  /**
   * Discovers installed models by querying local inference backends (e.g. Ollama).
   */
  public static async discoverInstalledModels(): Promise<string[]> {
    const models: string[] = [];

    // Probe Ollama if running
    try {
      const ollamaModels = await this.queryOllamaTags();
      models.push(...ollamaModels);
    } catch {
      // Ollama not running or not installed
    }

    return models;
  }

  private static async queryOllamaTags(): Promise<string[]> {
    return new Promise((resolve) => {
      const req = http.get('http://127.0.0.1:11434/api/tags', { timeout: 2000 }, (res) => {
        if (res.statusCode !== 200) {
          resolve([]);
          return;
        }

        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(raw);
            if (Array.isArray(data.models)) {
              const list: string[] = data.models.map((m: any) => String(m.name));
              resolve(list);
              return;
            }
          } catch {
            // JSON parse failed
          }
          resolve([]);
        });
      });

      req.on('error', () => resolve([]));
      req.on('timeout', () => {
        req.destroy();
        resolve([]);
      });
    });
  }
}
