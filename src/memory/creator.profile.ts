/**
 * HṚṢĪKEŚA (हृषीकेश) — Creator Profile Engine (Rushikesh Pattiwar)
 *
 * Manages the persistent, structured profile for Rushikesh Pattiwar.
 * Seeded and verified exclusively from official project invariants.
 */

import { MemoryRepository } from '../persistence/repositories/memory.repository.js';

export interface CreatorProfileData {
  readonly fullName: string;
  readonly role: string;
  readonly authorityLevel: string;
  readonly hardware: {
    readonly machine: string;
    readonly cpu: string;
    readonly ramGb: number;
    readonly gpu: string;
  };
  readonly communicationPreferences: {
    readonly tone: string;
    readonly conciseness: string;
    readonly language: string;
  };
  readonly engineeringPreferences: {
    readonly primaryLanguages: string[];
    readonly nodeVersion: string;
    readonly architectureStyle: string;
    readonly testingStandard: string;
  };
  readonly codingStandards: {
    readonly strictTypes: boolean;
    readonly zeroUnnecessaryDependencies: boolean;
    readonly preserveExistingCode: boolean;
  };
  readonly researchPreferences: {
    readonly verifyBeforeAction: boolean;
    readonly deepRootCauseAnalysis: boolean;
  };
  readonly projectPrinciples: string[];
  readonly approvedTools: string[];
  readonly operatingPreferences: {
    readonly localFirst: boolean;
    readonly zeroCostInference: boolean;
    readonly humanInTheLoop: boolean;
    readonly nonInvasiveVdi: boolean;
  };
}

export const DEFAULT_CREATOR_PROFILE: CreatorProfileData = {
  fullName: 'Rushikesh Pattiwar',
  role: 'Creator & Sole Master',
  authorityLevel: 'ROOT_RUSHIKESH',
  hardware: {
    machine: 'Acer Swift SFG14-73T',
    cpu: 'Intel Core Ultra 5 125H (14 cores, 18 threads)',
    ramGb: 15.7,
    gpu: 'Intel Arc Graphics'
  },
  communicationPreferences: {
    tone: 'Respectful, technical, authoritative yet humble',
    conciseness: 'High signal-to-noise ratio, direct answers without unnecessary fluff',
    language: 'English (primary), with Sanskrit cultural branding preserved'
  },
  engineeringPreferences: {
    primaryLanguages: ['TypeScript', 'Python'],
    nodeVersion: '24.x',
    architectureStyle: 'Strict typing, modular separation of concerns, zero unnecessary dependencies, deterministic pipelines',
    testingStandard: '100% automated test coverage with native runners'
  },
  codingStandards: {
    strictTypes: true,
    zeroUnnecessaryDependencies: true,
    preserveExistingCode: true
  },
  researchPreferences: {
    verifyBeforeAction: true,
    deepRootCauseAnalysis: true
  },
  projectPrinciples: [
    'Sovereign self-containment',
    'Local-first zero-cost cognition',
    'ADR-driven architectural decisions',
    'Non-invasive VDI operation',
    'Strict human-in-the-loop safety'
  ],
  approvedTools: [
    'Antigravity IDE',
    'Ollama',
    'Git',
    'PowerShell',
    'Node.js',
    'VS Code'
  ],
  operatingPreferences: {
    localFirst: true,
    zeroCostInference: true,
    humanInTheLoop: true,
    nonInvasiveVdi: true
  }
};

export class CreatorProfileManager {
  private readonly memoryRepo: MemoryRepository;
  private cachedProfile: CreatorProfileData | null = null;

  constructor(memoryRepo: MemoryRepository) {
    this.memoryRepo = memoryRepo;
  }

  /**
   * Retrieves the structured creator profile from persistent storage, falling back to default.
   */
  public getProfile(): CreatorProfileData {
    if (this.cachedProfile) {
      return this.cachedProfile;
    }

    const item = this.memoryRepo.retrieve('creator_profile', 'rushikesh_pattiwar');
    if (item) {
      try {
        const parsed = JSON.parse(item.content) as Partial<CreatorProfileData>;
        this.cachedProfile = {
          ...DEFAULT_CREATOR_PROFILE,
          ...parsed
        };
        return this.cachedProfile;
      } catch {
        // Parse error fallback
      }
    }

    // Persist default if not already in database
    this.saveProfile(DEFAULT_CREATOR_PROFILE);
    this.cachedProfile = DEFAULT_CREATOR_PROFILE;
    return this.cachedProfile;
  }

  /**
   * Updates and persists changes to Rushikesh Pattiwar's creator profile.
   */
  public saveProfile(profile: CreatorProfileData): void {
    this.cachedProfile = profile;
    this.memoryRepo.store({
      id: 'seed-creator-profile',
      tier: 'creator_profile',
      key: 'rushikesh_pattiwar',
      content: JSON.stringify(profile, null, 2),
      source: 'rushikesh_authority',
      provenance: 'explicit',
      confidence: 1.0,
      metadata: { verified: true, authority: 'ROOT' }
    });
  }

  /**
   * Formats a concise context block suitable for Qwen prompt injection.
   */
  public formatPromptContext(): string {
    const p = this.getProfile();
    return [
      `Creator & Master: ${p.fullName} (${p.role})`,
      `Communication Preference: ${p.communicationPreferences.conciseness}`,
      `Key Directives: ${p.projectPrinciples.slice(0, 3).join('; ')}`
    ].join('\n');
  }
}
