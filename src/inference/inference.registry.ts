/**
 * HṚṢĪKEŚA (हृषीकेश) — Foundation Performance & Execution (FP-01)
 * Inference Backend Registry & Model Residency Tracker
 */

import {
  InferenceBackendType,
  BackendAvailability,
  HardwareInspectionReport,
  ModelResidencyRecord,
  ComputeTier,
} from './backend.types.js';
import { InferenceBackendDetector } from './backend.detector.js';
import { LlamaCppBackend } from './llamacpp.backend.js';
import { OllamaBackend } from './ollama.backend.js';

export class InferenceRegistry {
  private static instance: InferenceRegistry | null = null;
  private hardwareReport: HardwareInspectionReport | null = null;
  private readonly llamaCpp: LlamaCppBackend;
  private readonly ollama: OllamaBackend;
  private residencyMap: Map<string, ModelResidencyRecord> = new Map();
  private preferredResidentModel = 'llama3.2:3b';

  private constructor() {
    this.llamaCpp = new LlamaCppBackend();
    this.ollama = new OllamaBackend();
  }

  public static getInstance(): InferenceRegistry {
    if (!this.instance) {
      this.instance = new InferenceRegistry();
    }
    return this.instance;
  }

  public async initialize(): Promise<HardwareInspectionReport> {
    this.hardwareReport = await InferenceBackendDetector.inspectHardware();
    return this.hardwareReport;
  }

  public getHardwareReport(): HardwareInspectionReport {
    if (!this.hardwareReport) {
      // Synchronous fallback
      return {
        cpuName: 'Intel Core Ultra',
        physicalCores: 14,
        logicalProcessors: 18,
        totalRamBytes: 16 * 1024 * 1024 * 1024,
        freeRamBytes: 4 * 1024 * 1024 * 1024,
        cpuFeatures: ['AVX2', 'AVX_VNNI'],
        gpuName: 'Intel(R) Arc(TM) Graphics',
        gpuVendor: 'Intel Corporation',
        driverVersion: '32.0.101.6127',
        vulkanSupported: this.llamaCpp.isVulkanAvailable(),
        levelZeroSupported: true,
        syclAvailable: false,
        backends: {
          LLAMACPP_VULKAN: {
            backendType: 'LLAMACPP_VULKAN',
            deviceType: 'LOCAL_INTEL_GPU',
            available: this.llamaCpp.isVulkanAvailable(),
          },
          LLAMACPP_CPU: {
            backendType: 'LLAMACPP_CPU',
            deviceType: 'LOCAL_CPU',
            available: this.llamaCpp.isCpuAvailable(),
          },
          LLAMACPP_SYCL: {
            backendType: 'LLAMACPP_SYCL',
            deviceType: 'LOCAL_INTEL_GPU',
            available: false,
            reason: 'NOT_AVAILABLE: Intel oneAPI SYCL runtime not found.',
          },
          OLLAMA: {
            backendType: 'OLLAMA',
            deviceType: 'LOCAL_CPU',
            available: true,
          },
          LAN_WORKER: { backendType: 'LAN_WORKER', deviceType: 'LAN_WORKER', available: false },
          REMOTE_WORKER: { backendType: 'REMOTE_WORKER', deviceType: 'REMOTE_WORKER', available: false },
          CLOUD_GPU: { backendType: 'CLOUD_GPU', deviceType: 'CLOUD_GPU', available: false },
        },
        timestamp: new Date().toISOString(),
      };
    }
    return this.hardwareReport;
  }

  public getLlamaCppBackend(): LlamaCppBackend {
    return this.llamaCpp;
  }

  public getOllamaBackend(): OllamaBackend {
    return this.ollama;
  }

  public getBackendAvailability(backend: InferenceBackendType): BackendAvailability {
    const report = this.getHardwareReport();
    return report.backends[backend];
  }

  public listAvailableBackends(): BackendAvailability[] {
    const report = this.getHardwareReport();
    return Object.values(report.backends).filter((b) => b.available);
  }

  // --- Residency Tracking ---

  public getPreferredResidentModel(): string {
    return this.preferredResidentModel;
  }

  public setPreferredResidentModel(modelId: string): void {
    this.preferredResidentModel = modelId;
  }

  public recordModelUsage(
    modelId: string,
    backendType: InferenceBackendType,
    tier: ComputeTier,
    sizeBytes = 2 * 1024 * 1024 * 1024
  ): void {
    const existing = this.residencyMap.get(modelId);
    const activeRequests = (existing?.activeRequests || 0) + 1;

    this.residencyMap.set(modelId, {
      modelId,
      backendType,
      sizeBytes,
      ramBytesEstimate: backendType === 'LLAMACPP_CPU' || backendType === 'OLLAMA' ? sizeBytes : Math.round(sizeBytes * 0.2),
      vramBytesEstimate: backendType === 'LLAMACPP_VULKAN' ? sizeBytes : 0,
      lastUsedAt: new Date().toISOString(),
      activeRequests,
      resident: true,
      priorityTier: tier,
    });
  }

  public recordModelFinished(modelId: string): void {
    const existing = this.residencyMap.get(modelId);
    if (existing) {
      this.residencyMap.set(modelId, {
        ...existing,
        activeRequests: Math.max(0, existing.activeRequests - 1),
      });
    }
  }

  public getResidencyRecords(): ModelResidencyRecord[] {
    return Array.from(this.residencyMap.values());
  }

  /**
   * Under memory pressure, identify models that should be unloaded or de-prioritized.
   */
  public getEvictionCandidates(): ModelResidencyRecord[] {
    const list = this.getResidencyRecords();
    // Never evict preferred resident model (T1/T2 interactive)
    return list
      .filter((r) => r.modelId !== this.preferredResidentModel && r.activeRequests === 0)
      .sort((a, b) => new Date(a.lastUsedAt).getTime() - new Date(b.lastUsedAt).getTime());
  }
}
