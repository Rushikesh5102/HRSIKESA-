/**
 * HṚṢĪKEŚA (हृषीकेश) — FP-04 Standalone Physical Worker Runtime
 *
 * Lightweight daemon meant to run on secondary physical LAN machines.
 * Does NOT run the full HṚṢĪKEŚA control plane or expose sensitive cognitive state.
 *
 * Usage:
 *   npx tsx src/resources/worker-runtime/worker.runtime.ts \
 *     --server 192.168.1.50:4300 \
 *     --token hrsk_enroll_abcdef123456 \
 *     --name "Rig-4090"
 */

import * as os from 'node:os';
import * as crypto from 'node:crypto';
import { Logger } from '../../core/logging/logger.js';
import { Worker, ResourceSnapshot } from '../resource.types.js';
import { WorkerTransportClient } from '../transport/worker.transport.client.js';
import { WorkerCapabilityScanner } from './worker.capabilities.js';
import { WorkerExecutor } from './worker.executor.js';
import { WorkerGpuTelemetry } from './worker.gpu.js';

export interface WorkerRuntimeOptions {
  readonly serverHost: string;
  readonly serverPort: number;
  readonly enrollmentToken?: string;
  readonly sessionToken?: string;
  readonly workerName?: string;
  readonly tlsEnabled?: boolean;
  readonly heartbeatIntervalMs?: number;
}

export class WorkerRuntime {
  private client: WorkerTransportClient | null = null;
  private readonly options: WorkerRuntimeOptions;
  private readonly logger: Logger;
  private readonly executor: WorkerExecutor;
  private telemetryInterval: NodeJS.Timeout | null = null;

  constructor(options: WorkerRuntimeOptions) {
    this.options = {
      serverHost: options.serverHost || '127.0.0.1',
      serverPort: options.serverPort || 4300,
      enrollmentToken: options.enrollmentToken,
      sessionToken: options.sessionToken,
      workerName: options.workerName || `worker-${os.hostname().toLowerCase()}`,
      tlsEnabled: options.tlsEnabled ?? true,
      heartbeatIntervalMs: options.heartbeatIntervalMs || 10000,
    };
    this.logger = new Logger('WorkerRuntime');
    this.executor = new WorkerExecutor();
  }

  public async start(): Promise<void> {
    this.logger.info(`Starting physical worker runtime '${this.options.workerName}'...`);

    // 1. Scan hardware and capabilities
    const scanned = await WorkerCapabilityScanner.scanCapabilities();
    const gpuMetrics = await WorkerGpuTelemetry.probeGpu();

    const workerId = `w_${crypto.randomBytes(8).toString('hex')}`;
    const totalMemBytes = os.totalmem();
    const freeMemBytes = os.freemem();
    const cpus = os.cpus();

    const workerDescriptor: Worker = {
      id: workerId,
      name: this.options.workerName!,
      type: 'LAN',
      status: 'REGISTERING',
      trustLevel: 'ENROLLED',
      host: os.hostname(),
      port: this.options.serverPort,
      platform: os.platform(),
      architecture: os.arch(),
      cpu: {
        model: cpus[0]?.model || 'Generic CPU',
        physicalCores: Math.max(1, Math.floor(cpus.length / 2)),
        logicalProcessors: cpus.length,
        speedMhz: cpus[0]?.speed || 0,
      },
      memory: {
        totalBytes: totalMemBytes,
        freeBytes: freeMemBytes,
      },
      gpu: {
        name: gpuMetrics.name || (gpuMetrics.available ? gpuMetrics.vendor : 'None'),
        vendor: gpuMetrics.vendor,
        vramBytes: gpuMetrics.memoryTotalMb > 0 ? gpuMetrics.memoryTotalMb * 1024 * 1024 : undefined,
        cudaSupported: gpuMetrics.vendor === 'NVIDIA',
        rocmSupported: gpuMetrics.vendor === 'AMD',
        vulkanSupported: gpuMetrics.vendor !== 'UNKNOWN',
      },
      gpuBackend: scanned.gpuBackend,
      models: scanned.models,
      capabilities: scanned.capabilities,
      priority: 50,
      registeredAt: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      loadScore: 0,
      protocolVersion: '1.0.0',
      version: '1.0.0',
    };

    // 2. Setup Transport Client
    this.client = new WorkerTransportClient(
      {
        serverHost: this.options.serverHost,
        serverPort: this.options.serverPort,
        tlsEnabled: this.options.tlsEnabled!,
        workerId,
        workerName: this.options.workerName!,
        enrollmentToken: this.options.enrollmentToken,
        sessionToken: this.options.sessionToken,
        heartbeatIntervalMs: this.options.heartbeatIntervalMs,
      },
      this.logger
    );

    this.client.setWorkerDescriptor(workerDescriptor);
    this.client.setTaskExecutor(this.executor);

    // 3. Connect to HṚṢĪKEŚA Transport Server
    await this.client.connect();

    // 4. Start periodic resource snapshot publisher
    this.telemetryInterval = setInterval(async () => {
      if (!this.client) return;
      const memTotal = os.totalmem();
      const memFree = os.freemem();
      const memUsed = memTotal - memFree;
      const gpu = await WorkerGpuTelemetry.probeGpu();

      const snapshot: ResourceSnapshot = {
        id: crypto.randomUUID(),
        workerId,
        timestamp: new Date().toISOString(),
        cpuUsage: 0,
        ramUsedBytes: memUsed,
        ramTotalBytes: memTotal,
        gpuUtilization: typeof gpu.gpuUtilizationPercent === 'number' ? gpu.gpuUtilizationPercent : undefined,
        gpuMemoryUsedBytes: gpu.memoryUsedMb * 1024 * 1024,
        activeTasks: 0,
        queueDepth: 0,
      };

      this.client.publishResourceUpdate(snapshot);
    }, 15000);

    this.logger.info(`Worker runtime successfully connected and running.`);
  }

  public async stop(): Promise<void> {
    if (this.telemetryInterval) {
      clearInterval(this.telemetryInterval);
      this.telemetryInterval = null;
    }

    if (this.client) {
      await this.client.disconnect();
      this.client = null;
    }

    this.logger.info('Worker runtime stopped.');
  }

  public getClient(): WorkerTransportClient | null {
    return this.client;
  }
}

// Standalone CLI execution entrypoint
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';

const isMainModule = (): boolean => {
  try {
    if (!process.argv[1]) return false;
    return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) ||
      process.argv[1].endsWith('worker.runtime.ts') ||
      process.argv[1].endsWith('worker-bundle.mjs') ||
      process.argv[1].endsWith('worker.runtime.js');
  } catch {
    return false;
  }
};

if (isMainModule()) {
  const args = process.argv.slice(2);
  let server = '127.0.0.1:4300';
  let token: string | undefined;
  let name: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--server' && args[i + 1]) server = args[++i];
    if (args[i] === '--token' && args[i + 1]) token = args[++i];
    if (args[i] === '--name' && args[i + 1]) name = args[++i];
  }

  const [host, portStr] = server.split(':');
  const port = Number(portStr) || 4300;

  const runtime = new WorkerRuntime({
    serverHost: host || '127.0.0.1',
    serverPort: port,
    enrollmentToken: token,
    workerName: name,
  });

  runtime.start().catch((err) => {
    console.error('Worker runtime fatal error:', err);
    process.exit(1);
  });

  process.on('SIGINT', async () => {
    await runtime.stop();
    process.exit(0);
  });
}
