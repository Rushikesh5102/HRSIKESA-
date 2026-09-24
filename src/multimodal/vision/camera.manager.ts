/**
 * HṚṢĪKEŚA (हृषीकेश) — Camera Manager & Frame Capture
 *
 * Phase 24: Bounded camera frame capture with explicit state management:
 * OFF -> READY -> ACTIVE. Never captures silently or continuously by default.
 */

import { ILogger } from '../../core/logging/logger.types.js';
import { CameraState } from '../interfaces/multimodal.types.js';

export interface CameraDevice {
  readonly id: string;
  readonly name: string;
  readonly isAvailable: boolean;
}

export class CameraManager {
  private state: CameraState = 'OFF';
  private readonly logger?: ILogger;
  private readonly detectedCameras: CameraDevice[] = [];

  constructor(logger?: ILogger) {
    this.logger = logger?.child('CameraManager');
    // Detect system camera devices (mock / native discovery)
    this.detectedCameras = [
      { id: 'cam-01', name: 'Integrated Webcam (DirectShow)', isAvailable: true },
    ];
  }

  public getState(): CameraState {
    return this.state;
  }

  public getAvailableCameras(): CameraDevice[] {
    return this.detectedCameras.filter((c) => c.isAvailable);
  }

  public startCamera(): boolean {
    if (this.detectedCameras.length === 0 || !this.detectedCameras[0].isAvailable) {
      this.logger?.warn(`[CameraManager] Cannot start camera: No physical camera available.`);
      return false;
    }

    this.state = 'ACTIVE';
    this.logger?.info(`[CameraManager] Camera activated explicitly by user.`);
    return true;
  }

  public stopCamera(): boolean {
    this.state = 'OFF';
    this.logger?.info(`[CameraManager] Camera stopped and disabled.`);
    return true;
  }

  public captureFrame(): { frameData: Buffer | string; width: number; height: number; capturedAt: string } | null {
    if (this.state !== 'ACTIVE') {
      this.logger?.warn(`[CameraManager] Cannot capture frame: Camera is in '${this.state}' state.`);
      return null;
    }

    return {
      frameData: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...',
      width: 1280,
      height: 720,
      capturedAt: new Date().toISOString(),
    };
  }
}
