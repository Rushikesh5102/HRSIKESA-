/**
 * HṚṢĪKEŚA (हृषीकेश) — Media Capability & Provider Resolution Service
 *
 * FP-17: Bridges FP-07 Universal Capability Fabric, FP-15 Ecosystem,
 * and ModelRouter for media creation and processing tasks.
 *
 * Enforces strict honesty:
 * - When an application/tool/model is not installed or configured, reports NOT_CONFIGURED.
 * - Discovers local tools (FFmpeg, Blender, ImageMagick) via KnownAppCatalog / PATH without assumptions.
 */

import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import {
  MediaCapability,
  MediaProviderDescriptor,
  ProviderAvailabilityStatus,
  CreationJobType,
} from '../interfaces/creation.types.js';
import { KnownAppCatalog } from '../../environment/discovery/known.apps.js';
import { ModelRouter } from '../../models/router/model.router.js';
import { ModelRegistry } from '../../models/registry/model.registry.js';
import { UniversalCapabilityFabric } from '../../capabilities/fabric/universal.capability.fabric.js';
import { UniversalEcosystemFabric } from '../../ecosystem/ecosystem.fabric.js';
import { ILogger } from '../../core/logging/logger.types.js';

export class MediaCapabilityService {
  private readonly capabilities: Map<string, MediaCapability> = new Map();
  private readonly providers: Map<string, MediaProviderDescriptor> = new Map();

  constructor(
    _modelRouter?: ModelRouter,
    private readonly modelRegistry?: ModelRegistry,
    _capabilityFabric?: UniversalCapabilityFabric,
    _ecosystemFabric?: UniversalEcosystemFabric,
    _logger?: ILogger
  ) {
    this.registerStandardCapabilities();
    this.discoverLocalProviders();
  }

  /**
   * Initializes all standard media capabilities defined in FP-17 spec.
   */
  private registerStandardCapabilities(): void {
    const list: Array<{ id: string; category: MediaCapability['category']; name: string; desc: string; inputs: string[]; outputs: string[] }> = [
      { id: 'image.generate', category: 'image', name: 'Image Generation', desc: 'Create images from prompts', inputs: ['text'], outputs: ['png', 'jpg', 'webp', 'svg'] },
      { id: 'image.edit', category: 'image', name: 'Image Editing', desc: 'Edit or transform existing images', inputs: ['png', 'jpg', 'webp'], outputs: ['png', 'jpg', 'webp'] },
      { id: 'image.upscale', category: 'image', name: 'Image Upscaling', desc: 'Enhance and upscale image resolution', inputs: ['png', 'jpg', 'webp'], outputs: ['png', 'webp'] },
      { id: 'image.remove_background', category: 'image', name: 'Remove Background', desc: 'Extract foreground objects with transparency', inputs: ['png', 'jpg'], outputs: ['png', 'webp'] },
      { id: 'image.analyze', category: 'image', name: 'Image Analysis', desc: 'Extract visual semantics, text, and structure', inputs: ['png', 'jpg', 'webp'], outputs: ['json'] },

      { id: 'video.generate', category: 'video', name: 'Video Generation', desc: 'Synthesize motion or cinematic clips from text', inputs: ['text', 'image'], outputs: ['mp4', 'webm'] },
      { id: 'video.edit', category: 'video', name: 'Video Editing', desc: 'Cut, trim, splice, filter video streams', inputs: ['mp4', 'webm', 'mov'], outputs: ['mp4', 'webm'] },
      { id: 'video.compose', category: 'video', name: 'Video Composition', desc: 'Compose scenes, overlays, voiceover, and soundtrack', inputs: ['mp4', 'png', 'wav', 'mp3'], outputs: ['mp4', 'webm'] },
      { id: 'video.extract_frames', category: 'video', name: 'Frame Extraction', desc: 'Extract keyframes or image sequences', inputs: ['mp4', 'webm'], outputs: ['png', 'jpg'] },
      { id: 'video.analyze', category: 'video', name: 'Video Analysis', desc: 'Scene change detection and visual tracking', inputs: ['mp4', 'webm'], outputs: ['json'] },

      { id: 'audio.generate', category: 'audio', name: 'Sound FX Generation', desc: 'Generate audio effects and ambient beds', inputs: ['text'], outputs: ['wav', 'mp3', 'ogg'] },
      { id: 'audio.edit', category: 'audio', name: 'Audio Editing', desc: 'Filter, trim, fade, and process audio tracks', inputs: ['wav', 'mp3', 'ogg'], outputs: ['wav', 'mp3'] },
      { id: 'audio.mix', category: 'audio', name: 'Audio Mixing', desc: 'Multi-track mixing, ducking, and mastering', inputs: ['wav', 'mp3'], outputs: ['wav', 'mp3'] },
      { id: 'audio.normalize', category: 'audio', name: 'Audio Normalization', desc: 'Loudness normalization (LUFS / RMS)', inputs: ['wav', 'mp3'], outputs: ['wav', 'mp3'] },
      { id: 'audio.transcribe', category: 'audio', name: 'Speech to Text', desc: 'Transcribe spoken audio with timestamps', inputs: ['wav', 'mp3', 'm4a'], outputs: ['json', 'txt', 'srt'] },

      { id: 'music.generate', category: 'music', name: 'Music Generation', desc: 'Compose and synthesize musical tracks', inputs: ['text'], outputs: ['wav', 'mp3', 'midi'] },
      { id: 'music.compose', category: 'music', name: 'Music Composition', desc: 'Arrange harmonic progressions and stems', inputs: ['midi', 'json'], outputs: ['midi', 'wav'] },

      { id: 'voice.synthesize', category: 'voice', name: 'Text to Speech', desc: 'High fidelity multilingual voice synthesis', inputs: ['text'], outputs: ['wav', 'mp3'] },
      { id: 'voice.transcribe', category: 'voice', name: 'Voice Transcription', desc: 'Accurate speech recognition with speaker tags', inputs: ['wav', 'mp3'], outputs: ['json', 'txt'] },
      { id: 'voice.diarize', category: 'voice', name: 'Speaker Diarization', desc: 'Separate and identify unique speakers', inputs: ['wav', 'mp3'], outputs: ['json'] },
      { id: 'voice.process', category: 'voice', name: 'Voice Processing', desc: 'EQ, de-essing, pitch, noise suppression', inputs: ['wav', 'mp3'], outputs: ['wav', 'mp3'] },

      { id: '3d.generate', category: '3d', name: '3D Mesh Generation', desc: 'Generate 3D meshes and point clouds', inputs: ['text', 'image'], outputs: ['glb', 'gltf', 'obj'] },
      { id: '3d.inspect', category: '3d', name: '3D Scene Inspection', desc: 'Verify geometry, vertex counts, materials', inputs: ['blend', 'glb', 'obj'], outputs: ['json'] },
      { id: '3d.convert', category: '3d', name: '3D Format Conversion', desc: 'Convert between 3D scene formats', inputs: ['blend', 'obj', 'gltf'], outputs: ['glb', 'obj'] },
      { id: '3d.render', category: '3d', name: '3D Rendering', desc: 'Render scene to photo-realistic or styled 2D', inputs: ['blend', 'glb'], outputs: ['png', 'jpg', 'exr'] },

      { id: 'document.generate', category: 'document', name: 'Document Generation', desc: 'Generate PDF, DOCX, Markdown, HTML reports', inputs: ['text', 'json'], outputs: ['pdf', 'docx', 'md', 'html'] },
      { id: 'document.convert', category: 'document', name: 'Document Conversion', desc: 'Convert documents between common formats', inputs: ['md', 'html', 'docx'], outputs: ['pdf', 'html'] },
      { id: 'document.render', category: 'document', name: 'Document Rendering', desc: 'Render formatted preview images of pages', inputs: ['pdf', 'html'], outputs: ['png'] },

      { id: 'presentation.generate', category: 'presentation', name: 'Presentation Generation', desc: 'Generate structured slide decks and briefs', inputs: ['text', 'json'], outputs: ['html', 'pptx', 'pdf'] },
      { id: 'presentation.render', category: 'presentation', name: 'Presentation Slide Render', desc: 'Render individual slide previews to PNG/SVG', inputs: ['html', 'pptx'], outputs: ['png', 'svg'] },

      { id: 'design.generate', category: 'design', name: 'UI / Design Asset Generation', desc: 'Generate vectors, layouts, wireframes, and design components', inputs: ['text', 'json'], outputs: ['svg', 'html', 'css', 'json'] },
      { id: 'design.inspect', category: 'design', name: 'Design Verification', desc: 'Verify contrast, typography, color harmony', inputs: ['svg', 'html', 'png'], outputs: ['json'] },
      { id: 'design.transform', category: 'design', name: 'Design System Transform', desc: 'Apply brand colors and typography tokens', inputs: ['svg', 'html'], outputs: ['svg', 'html'] },
    ];

    for (const item of list) {
      this.capabilities.set(item.id, {
        capabilityId: item.id,
        category: item.category,
        name: item.name,
        description: item.desc,
        supportedInputFormats: item.inputs,
        supportedOutputFormats: item.outputs,
        availableProviders: [],
      });
    }
  }

  /**
   * Probes host system for local media executables without assuming existence.
   */
  public discoverLocalProviders(): void {
    // 1. Built-in Deterministic Native Providers (Always Available)
    this.registerProvider({
      providerId: 'native.document.compiler',
      name: 'Native Document & Report Engine',
      providerClass: 'LOCAL_MODEL',
      availability: 'AVAILABLE',
      isLocal: true,
      health: 'HEALTHY',
      costClassification: 'FREE_LOCAL',
      estimatedLatencyMs: 15,
      supportedOperations: ['document.generate', 'document.convert', 'presentation.generate', 'design.generate', 'design.transform', 'design.inspect'],
      version: '1.0.0',
      license: 'MIT',
    });

    this.registerProvider({
      providerId: 'native.audio.synthesizer',
      name: 'Native WebAudio / Voice Synthesizer',
      providerClass: 'LOCAL_MODEL',
      availability: 'AVAILABLE',
      isLocal: true,
      health: 'HEALTHY',
      costClassification: 'FREE_LOCAL',
      estimatedLatencyMs: 50,
      supportedOperations: ['audio.generate', 'audio.normalize', 'voice.synthesize', 'voice.process', 'music.generate', 'music.compose'],
      version: '1.0.0',
      license: 'MIT',
    });

    this.registerProvider({
      providerId: 'native.image.synthesizer',
      name: 'Native Vector & Graphics Synthesizer',
      providerClass: 'LOCAL_MODEL',
      availability: 'AVAILABLE',
      isLocal: true,
      health: 'HEALTHY',
      costClassification: 'FREE_LOCAL',
      estimatedLatencyMs: 30,
      supportedOperations: ['image.generate', 'image.edit', 'image.analyze', 'design.generate', 'design.transform'],
      version: '1.0.0',
      license: 'MIT',
    });

    this.registerProvider({
      providerId: 'native.video.composer',
      name: 'Native Media Composition Engine',
      providerClass: 'LOCAL_MODEL',
      availability: 'AVAILABLE',
      isLocal: true,
      health: 'HEALTHY',
      costClassification: 'FREE_LOCAL',
      estimatedLatencyMs: 80,
      supportedOperations: ['video.generate', 'video.compose', 'video.edit', 'video.extract_frames'],
      version: '1.0.0',
      license: 'MIT',
    });

    // 2. Discover Blender
    const blenderDef = KnownAppCatalog.findInCatalog('blender');
    let blenderPath: string | undefined;
    if (blenderDef) {
      for (const p of blenderDef.standardPaths) {
        if (existsSync(p)) {
          blenderPath = p;
          break;
        }
      }
    }
    if (!blenderPath) {
      try {
        const out = execSync('where blender 2>nul', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
        if (out) blenderPath = out.split('\r\n')[0].split('\n')[0];
      } catch {
        // Not on PATH
      }
    }

    this.registerProvider({
      providerId: 'app.blender',
      name: 'Blender 3D Suite',
      providerClass: 'DESKTOP_APPLICATION',
      availability: blenderPath ? 'AVAILABLE' : 'NOT_CONFIGURED',
      isLocal: true,
      health: blenderPath ? 'HEALTHY' : 'UNAVAILABLE',
      costClassification: 'FREE_LOCAL',
      estimatedLatencyMs: 800,
      supportedOperations: ['3d.generate', '3d.inspect', '3d.convert', '3d.render'],
      pathOrEndpoint: blenderPath,
      license: 'GPL-3.0',
    });

    // 3. Discover FFmpeg
    let ffmpegPath: string | undefined;
    try {
      const out = execSync('where ffmpeg 2>nul', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      if (out) ffmpegPath = out.split('\r\n')[0].split('\n')[0];
    } catch {
      // Not on PATH
    }

    this.registerProvider({
      providerId: 'cli.ffmpeg',
      name: 'FFmpeg Media Processor',
      providerClass: 'CLI_TOOL',
      availability: ffmpegPath ? 'AVAILABLE' : 'NOT_CONFIGURED',
      isLocal: true,
      health: ffmpegPath ? 'HEALTHY' : 'UNAVAILABLE',
      costClassification: 'FREE_LOCAL',
      estimatedLatencyMs: 250,
      supportedOperations: ['video.edit', 'video.compose', 'video.extract_frames', 'audio.edit', 'audio.mix', 'audio.normalize'],
      pathOrEndpoint: ffmpegPath,
      license: 'LGPL-2.1',
    });

    // 4. Discover ImageMagick
    let magickPath: string | undefined;
    try {
      const out = execSync('where magick 2>nul', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      if (out) magickPath = out.split('\r\n')[0].split('\n')[0];
    } catch {
      // Not on PATH
    }

    this.registerProvider({
      providerId: 'cli.imagemagick',
      name: 'ImageMagick Graphics Suite',
      providerClass: 'CLI_TOOL',
      availability: magickPath ? 'AVAILABLE' : 'NOT_CONFIGURED',
      isLocal: true,
      health: magickPath ? 'HEALTHY' : 'UNAVAILABLE',
      costClassification: 'FREE_LOCAL',
      estimatedLatencyMs: 120,
      supportedOperations: ['image.edit', 'image.upscale', 'image.remove_background'],
      pathOrEndpoint: magickPath,
      license: 'Apache-2.0',
    });

    // 5. Cloud Model Providers (via ModelRegistry / Router)
    if (this.modelRegistry) {
      const records = this.modelRegistry.getAllRecords();
      for (const r of records) {
        const p = r.provider;
        const hasVision = r.models.some((m) => m.capabilities.includes('vision' as any));
        this.registerProvider({
          providerId: `model.${p.id}`,
          name: p.displayName,
          providerClass: p.isLocal ? 'LOCAL_MODEL' : 'CLOUD_MODEL',
          availability: r.health?.status === 'healthy' ? 'AVAILABLE' : 'NOT_CONFIGURED',
          isLocal: p.isLocal,
          health: r.health?.status === 'healthy' ? 'HEALTHY' : 'UNAVAILABLE',
          costClassification: p.isLocal ? 'FREE_LOCAL' : 'PAID_API',
          estimatedLatencyMs: p.isLocal ? 1500 : 2500,
          supportedOperations: hasVision ? ['image.generate', 'image.analyze', 'design.generate'] : ['document.generate'],
          license: 'API_TERMS',
        });
      }
    }
  }

  public registerProvider(provider: MediaProviderDescriptor): void {
    this.providers.set(provider.providerId, provider);
    for (const op of provider.supportedOperations) {
      const cap = this.capabilities.get(op);
      if (cap) {
        // Avoid duplicate provider IDs
        const existingIdx = cap.availableProviders.findIndex((p) => p.providerId === provider.providerId);
        if (existingIdx >= 0) {
          cap.availableProviders[existingIdx] = provider;
        } else {
          cap.availableProviders.push(provider);
        }
      }
    }
  }

  public unregisterProvider(providerId: string): boolean {
    const provider = this.providers.get(providerId);
    if (!provider) return false;
    this.providers.delete(providerId);
    for (const cap of this.capabilities.values()) {
      cap.availableProviders = cap.availableProviders.filter((p) => p.providerId !== providerId);
    }
    return true;
  }

  public getCapability(capabilityId: string): MediaCapability | undefined {
    return this.capabilities.get(capabilityId);
  }

  public listCapabilities(): MediaCapability[] {
    return Array.from(this.capabilities.values());
  }

  public getProvider(providerId: string): MediaProviderDescriptor | undefined {
    return this.providers.get(providerId);
  }

  public listProviders(): MediaProviderDescriptor[] {
    return Array.from(this.providers.values());
  }

  /**
   * Resolves the most suitable provider for a given creation job type and policy.
   * Never fabricates: if no provider is available, returns { status: 'NOT_CONFIGURED' }.
   */
  public resolveProviderForJob(
    jobType: CreationJobType,
    options?: { localOnly?: boolean; preferredProviderId?: string }
  ): {
    status: ProviderAvailabilityStatus;
    provider?: MediaProviderDescriptor;
    reason: string;
  } {
    const typeToCapMap: Record<CreationJobType, string> = {
      IMAGE: 'image.generate',
      VIDEO: 'video.generate',
      AUDIO: 'audio.generate',
      MUSIC: 'music.generate',
      VOICE: 'voice.synthesize',
      THREE_D: '3d.generate',
      DOCUMENT: 'document.generate',
      PRESENTATION: 'presentation.generate',
      GRAPHIC: 'design.generate',
      UI_DESIGN: 'design.generate',
      WEB_ASSET: 'design.generate',
      MEDIA_PACKAGE: 'video.compose',
      TRANSFORM: 'design.transform',
      EDIT: 'image.edit',
      ANALYSIS: 'image.analyze',
    };

    const capId = typeToCapMap[jobType] || 'image.generate';
    const capability = this.capabilities.get(capId);

    if (!capability || capability.availableProviders.length === 0) {
      return {
        status: 'NOT_CONFIGURED',
        reason: `No registered provider available for capability '${capId}'.`,
      };
    }

    // Filter by options
    let candidates = [...capability.availableProviders];

    if (options?.preferredProviderId) {
      const preferred = candidates.find((p) => p.providerId === options.preferredProviderId);
      if (preferred && preferred.availability === 'AVAILABLE') {
        return {
          status: 'AVAILABLE',
          provider: preferred,
          reason: `Selected requested preferred provider '${preferred.name}'.`,
        };
      }
    }

    if (options?.localOnly) {
      candidates = candidates.filter((p) => p.isLocal);
      if (candidates.length === 0) {
        return {
          status: 'NOT_CONFIGURED',
          reason: `Local-only policy requested, but no local provider is installed/available for '${capId}'.`,
        };
      }
    }

    // Prioritize AVAILABLE local free providers first, then AVAILABLE cloud
    const available = candidates.filter((p) => p.availability === 'AVAILABLE');
    if (available.length === 0) {
      return {
        status: 'NOT_CONFIGURED',
        reason: `Providers exist for '${capId}', but all are currently NOT_CONFIGURED or UNAVAILABLE on this host.`,
      };
    }

    // Sort: Free local first, then lowest estimated latency
    available.sort((a, b) => {
      if (a.isLocal && !b.isLocal) return -1;
      if (!a.isLocal && b.isLocal) return 1;
      return a.estimatedLatencyMs - b.estimatedLatencyMs;
    });

    const chosen = available[0];
    return {
      status: 'AVAILABLE',
      provider: chosen,
      reason: `Selected optimal ${chosen.isLocal ? 'local' : 'cloud'} provider '${chosen.name}' (${chosen.costClassification}).`,
    };
  }
}
