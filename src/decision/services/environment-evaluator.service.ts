/**
 * HṚṢĪKEŚA (हृषीकेश) — Environment Evaluator Service
 *
 * FP-18: Cross-references model/software technical requirements against actual
 * host hardware (Intel Core Ultra 5 125H, 15.7 GB RAM, Intel Arc GPU, Windows 11)
 * and installed runtimes without fabricating compatibility.
 */

import { HardwareCompatibilityStatus } from '../interfaces/decision.types.js';

export interface HostHardwareProfile {
  cpu: string;
  architecture: string;
  totalRamGb: number;
  availableRamGb: number;
  gpuName: string;
  gpuType: 'INTEGRATED' | 'DISCRETE' | 'NONE';
  gpuVramGb: number;
  gpuBackends: ('VULKAN' | 'OPENCL' | 'DIRECTML' | 'CUDA' | 'ROCM' | 'CPU')[];
  os: 'WINDOWS' | 'LINUX' | 'MACOS';
  osVersion: string;
}

export class EnvironmentEvaluatorService {
  private readonly hostProfile: HostHardwareProfile;

  constructor(customProfile?: Partial<HostHardwareProfile>) {
    this.hostProfile = {
      cpu: 'Intel Core Ultra 5 125H (14 cores / 18 threads)',
      architecture: 'x64',
      totalRamGb: 15.7,
      availableRamGb: 8.5,
      gpuName: 'Intel Arc Graphics',
      gpuType: 'INTEGRATED',
      gpuVramGb: 2.0,
      gpuBackends: ['VULKAN', 'OPENCL', 'DIRECTML', 'CPU'],
      os: 'WINDOWS',
      osVersion: 'Windows 11 64-bit',
      ...customProfile,
    };
  }

  public getHostProfile(): HostHardwareProfile {
    return { ...this.hostProfile };
  }

  /**
   * Evaluates candidate technical requirements against host profile.
   */
  public evaluateCompatibility(requirements: {
    minRamGb?: number;
    recommendedRamGb?: number;
    minVramGb?: number;
    requiresCuda?: boolean;
    supportsVulkan?: boolean;
    supportsDirectMl?: boolean;
    supportsCpuOnly?: boolean;
    supportedOs?: string[];
  }): {
    status: HardwareCompatibilityStatus;
    reason: string;
    details: {
      ramSufficient: boolean;
      vramSufficient: boolean;
      osSupported: boolean;
      acceleratorSupported: boolean;
    };
  } {
    const minRam = requirements.minRamGb ?? 0;
    const minVram = requirements.minVramGb ?? 0;
    const requiresCuda = Boolean(requirements.requiresCuda);
    const supportsVulkan = Boolean(requirements.supportsVulkan);
    const supportsDirectMl = Boolean(requirements.supportsDirectMl);
    const supportsCpu = requirements.supportsCpuOnly ?? true;

    // Check OS
    const osList = (requirements.supportedOs || []).map((o) => o.toUpperCase());
    const osSupported =
      osList.length === 0 ||
      osList.includes('WINDOWS') ||
      osList.includes('WIN') ||
      osList.includes('CROSS-PLATFORM');

    // Check RAM
    const ramSufficient = this.hostProfile.totalRamGb >= minRam;

    // Check VRAM & GPU Accelerators
    let acceleratorSupported = false;
    let vramSufficient = true;

    if (requiresCuda) {
      // Host has Intel Arc, NOT Nvidia CUDA
      acceleratorSupported = false;
    } else if (supportsVulkan || supportsDirectMl) {
      acceleratorSupported = true;
      if (minVram > this.hostProfile.gpuVramGb && !supportsCpu) {
        vramSufficient = false;
      }
    } else if (supportsCpu) {
      acceleratorSupported = true;
    }

    const details = {
      ramSufficient,
      vramSufficient,
      osSupported,
      acceleratorSupported,
    };

    // If requirements are unknown/unspecified
    if (requirements.minRamGb === undefined && requirements.requiresCuda === undefined) {
      return {
        status: HardwareCompatibilityStatus.UNKNOWN,
        reason: 'Requirements not fully documented or verified.',
        details,
      };
    }

    // Incompatible cases
    if (requiresCuda) {
      return {
        status: HardwareCompatibilityStatus.INCOMPATIBLE,
        reason:
          'Requires discrete NVIDIA GPU with proprietary CUDA runtime. Host has Intel Arc Graphics with Vulkan/DirectML.',
        details,
      };
    }

    if (!osSupported) {
      return {
        status: HardwareCompatibilityStatus.INCOMPATIBLE,
        reason: `Target software does not support ${this.hostProfile.osVersion}.`,
        details,
      };
    }

    if (!ramSufficient) {
      return {
        status: HardwareCompatibilityStatus.INCOMPATIBLE,
        reason: `Requires minimum ${minRam} GB RAM. Host has ${this.hostProfile.totalRamGb.toFixed(1)} GB RAM total.`,
        details,
      };
    }

    // Conditionally compatible cases (e.g. requires quantization or CPU fallback)
    if (minVram > this.hostProfile.gpuVramGb || (requirements.recommendedRamGb ?? 0) > this.hostProfile.totalRamGb) {
      return {
        status: HardwareCompatibilityStatus.CONDITIONALLY_COMPATIBLE,
        reason: `Compatible with quantization (GGUF / INT4) or Vulkan/CPU execution. May experience reduced throughput without dedicated high-VRAM GPU.`,
        details,
      };
    }

    // Likely / Verified
    if (ramSufficient && acceleratorSupported && osSupported) {
      return {
        status: HardwareCompatibilityStatus.VERIFIED_COMPATIBLE,
        reason: `Hardware profile matches CPU, RAM (${this.hostProfile.totalRamGb.toFixed(1)} GB), and accelerator requirements cleanly.`,
        details,
      };
    }

    return {
      status: HardwareCompatibilityStatus.LIKELY_COMPATIBLE,
      reason: 'General specifications align with host profile.',
      details,
    };
  }
}
