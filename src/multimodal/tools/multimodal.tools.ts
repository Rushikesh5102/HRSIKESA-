/**
 * HṚṢĪKEŚA (हृषीकेश) — Multimodal Tools
 *
 * Phase 24: Exposes multimodal observation, image analysis, speech synthesis,
 * microphone streaming, and camera controls to the ToolRegistry and ToolExecutionBus.
 */

import { ITool } from '../../tools/interfaces/tool.types.js';
import { DangerTier } from '../../tools/interfaces/danger.types.js';
import { ToolExecutionContext, ToolExecutionResult } from '../../tools/interfaces/execution.types.js';
import { VisionEngine } from '../vision/vision.engine.js';
import { StreamingVoiceCoordinator } from '../voice/streaming-voice.coordinator.js';
import { CameraManager } from '../vision/camera.manager.js';
import { MultimodalRepository } from '../repositories/multimodal.repository.js';

export function createMultimodalTools(
  visionEngineOrOptions: VisionEngine | { visionEngine: VisionEngine; voiceCoordinator: StreamingVoiceCoordinator; cameraManager: CameraManager; repository?: MultimodalRepository; securityPolicy?: any },
  voiceCoordinatorArg?: StreamingVoiceCoordinator,
  cameraManagerArg?: CameraManager,
  repositoryArg?: MultimodalRepository
): ITool[] {
  let visionEngine: VisionEngine;
  let voiceCoordinator: StreamingVoiceCoordinator;
  let cameraManager: CameraManager;
  let repository: MultimodalRepository | undefined;

  if (visionEngineOrOptions && 'visionEngine' in visionEngineOrOptions) {
    visionEngine = visionEngineOrOptions.visionEngine;
    voiceCoordinator = visionEngineOrOptions.voiceCoordinator;
    cameraManager = visionEngineOrOptions.cameraManager;
    repository = visionEngineOrOptions.repository;
  } else {
    visionEngine = visionEngineOrOptions as VisionEngine;
    voiceCoordinator = voiceCoordinatorArg!;
    cameraManager = cameraManagerArg!;
    repository = repositoryArg;
  }

  const unwrapInput = (raw: any) => (raw && raw.input !== undefined ? raw.input : raw);

  const observeTool: ITool = {
    id: 'multimodal.observe',
    name: 'Observe Desktop & Application Vision',
    description: 'Inspects active screen, window, and UIA hierarchy with local OCR and challenge detection.',
    version: '1.0.0',
    category: 'multimodal',
    riskLevel: DangerTier.TIER_0,
    requiresApproval: false,
    capabilities: ['vision.observe'],
    inputSchema: {
      type: 'object',
      properties: {
        targetApp: { type: 'string', description: 'Optional target application name' },
        expectedKeywords: { type: 'array', items: { type: 'string' }, description: 'Keywords to verify' },
      },
    },
    async execute(rawInput: any, _context: ToolExecutionContext): Promise<ToolExecutionResult> {
      const input = unwrapInput(rawInput);
      const startTime = Date.now();
      try {
        const obs = await visionEngine.inspectScreenshot('HṚṢĪKEŚA Active Desktop - Visual Dashboard', {
          targetApp: input?.targetApp,
          expectedKeywords: input?.expectedKeywords,
        });

        if (repository) {
          repository.recordVisionObservation(obs);
        }

        return {
          success: true,
          output: obs,
          durationMs: Date.now() - startTime,
        };
      } catch (err: any) {
        return {
          success: false,
          error: err.message,
          durationMs: Date.now() - startTime,
        };
      }
    },
  };

  const analyzeTool: ITool = {
    id: 'multimodal.analyze',
    name: 'Analyze Multimodal Image',
    description: 'Performs structured multimodal reasoning and OCR parsing on an image or screenshot.',
    version: '1.0.0',
    category: 'multimodal',
    riskLevel: DangerTier.TIER_0,
    requiresApproval: false,
    capabilities: ['vision.analyze'],
    inputSchema: {
      type: 'object',
      properties: {
        imageData: { type: 'string', description: 'Base64 image or local file path' },
        prompt: { type: 'string', description: 'Visual inquiry or question' },
      },
      required: ['imageData'],
    },
    async execute(rawInput: any, _context: ToolExecutionContext): Promise<ToolExecutionResult> {
      const input = unwrapInput(rawInput);
      const startTime = Date.now();
      try {
        const obs = await visionEngine.inspectScreenshot(input?.imageData, {
          sourceType: 'USER_IMAGE_INPUT',
        });

        return {
          success: true,
          output: {
            observation: obs,
            analysis: `Visual inspection completed. Found ${obs.visualElementsCount} text elements. Challenges detected: ${obs.detectedChallenges.join(', ')}.`,
          },
          durationMs: Date.now() - startTime,
        };
      } catch (err: any) {
        return {
          success: false,
          error: err.message,
          durationMs: Date.now() - startTime,
        };
      }
    },
  };

  const speakTool: ITool = {
    id: 'multimodal.speak',
    name: 'Synthesize & Speak Voice Response',
    description: 'Synthesizes and plays a spoken voice response via streaming TTS with barge-in support.',
    version: '1.0.0',
    category: 'voice',
    riskLevel: DangerTier.TIER_0,
    requiresApproval: false,
    capabilities: ['voice.speak'],
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to speak' },
        language: { type: 'string', description: 'Language code (e.g. en, hi, mr, sa)' },
      },
      required: ['text'],
    },
    async execute(rawInput: any, _context: ToolExecutionContext): Promise<ToolExecutionResult> {
      const input = unwrapInput(rawInput);
      const startTime = Date.now();
      try {
        voiceCoordinator.startPlayback(input?.text);
        // Simulate playback completion
        voiceCoordinator.finishPlayback();

        return {
          success: true,
          output: {
            spokenText: input?.text,
            status: 'COMPLETED',
            language: input?.language || 'en',
          },
          durationMs: Date.now() - startTime,
        };
      } catch (err: any) {
        return {
          success: false,
          error: err.message,
          durationMs: Date.now() - startTime,
        };
      }
    },
  };

  const listenTool: ITool = {
    id: 'multimodal.listen',
    name: 'Voice Listening Control',
    description: 'Controls streaming microphone voice capture and VAD state.',
    version: '1.0.0',
    category: 'voice',
    riskLevel: DangerTier.TIER_0,
    requiresApproval: false,
    capabilities: ['voice.listen'],
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['start', 'stop', 'status'], description: 'Voice listening action' },
      },
      required: ['action'],
    },
    async execute(rawInput: any, _context: ToolExecutionContext): Promise<ToolExecutionResult> {
      const input = unwrapInput(rawInput);
      const startTime = Date.now();
      try {
        if (input?.action === 'start') {
          voiceCoordinator.startListening();
        } else if (input?.action === 'stop') {
          voiceCoordinator.stopListening();
        }

        return {
          success: true,
          output: {
            microphoneState: voiceCoordinator.getMicrophoneState(),
            speakerState: voiceCoordinator.getSpeakerState(),
          },
          durationMs: Date.now() - startTime,
        };
      } catch (err: any) {
        return {
          success: false,
          error: err.message,
          durationMs: Date.now() - startTime,
        };
      }
    },
  };

  const cameraControlTool: ITool = {
    id: 'multimodal.camera_control',
    name: 'Camera Lifecycle Control',
    description: 'Controls explicit camera activation, frame capture, and privacy shutdown.',
    version: '1.0.0',
    category: 'camera',
    riskLevel: DangerTier.TIER_0,
    requiresApproval: false,
    capabilities: ['camera.control'],
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['start', 'stop', 'status', 'capture_frame'], description: 'Camera action' },
      },
      required: ['action'],
    },
    async execute(rawInput: any, _context: ToolExecutionContext): Promise<ToolExecutionResult> {
      const input = unwrapInput(rawInput);
      const startTime = Date.now();
      try {
        let result: any = {};
        if (input?.action === 'start') {
          result.started = cameraManager.startCamera();
        } else if (input?.action === 'stop') {
          result.stopped = cameraManager.stopCamera();
        } else if (input?.action === 'capture_frame') {
          result.frame = cameraManager.captureFrame();
        }
        result.cameraState = cameraManager.getState();
        result.availableCameras = cameraManager.getAvailableCameras();

        return {
          success: true,
          output: result,
          durationMs: Date.now() - startTime,
        };
      } catch (err: any) {
        return {
          success: false,
          error: err.message,
          durationMs: Date.now() - startTime,
        };
      }
    },
  };

  return [observeTool, analyzeTool, speakTool, listenTool, cameraControlTool];
}
