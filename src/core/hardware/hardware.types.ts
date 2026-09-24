/**
 * HṚṢĪKEŚA (हृषीकेश) — Hardware Awareness Types
 */

export interface HardwareProfile {
  readonly os: {
    readonly platform: string;
    readonly release: string;
    readonly arch: string;
    readonly hostname: string;
  };
  readonly cpu: {
    readonly model: string;
    readonly physicalCores: number;
    readonly logicalProcessors: number;
    readonly speedMhz: number;
  };
  readonly memory: {
    readonly totalBytes: number;
    readonly freeBytes: number;
    readonly totalGb: number;
    readonly freeGb: number;
    readonly usedPercentage: number;
    readonly state: 'NORMAL' | 'LOW_MEMORY' | 'CRITICAL_MEMORY';
  };
  readonly processMemory: {
    readonly rssMb: number;
    readonly heapUsedMb: number;
    readonly heapTotalMb: number;
  };
  readonly gpuEstimate: {
    readonly name: string;
    readonly isIntegrated: boolean;
    readonly estimatedVramGb: number;
  };
  readonly constraints: {
    readonly maxConcurrentLocalInference: number;
    readonly activeLocalModelLock: boolean;
  };
}
