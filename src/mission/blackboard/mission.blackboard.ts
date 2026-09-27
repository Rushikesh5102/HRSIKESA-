import { BlackboardEntry, BlackboardEntryType, MissionArtifact } from '../types/index.js';
import { MissionRepository } from '../repository/mission.repository.js';

export class MissionBlackboard {
  private inMemoryEntries: Map<string, BlackboardEntry[]> = new Map();
  private inMemoryArtifacts: Map<string, MissionArtifact[]> = new Map();

  constructor(private readonly repository?: MissionRepository) {}

  /**
   * Post a structured entry to the mission blackboard (thread-safe, auditable)
   */
  public postEntry(
    missionId: string,
    type: BlackboardEntryType,
    title: string,
    content: string,
    author: string,
    confidence: number = 1.0,
    tags: string[] = [],
    metadata: Record<string, unknown> = {},
    provenance: string = 'runtime'
  ): BlackboardEntry {
    const entry: BlackboardEntry = {
      entryId: `bb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      missionId,
      author,
      type,
      title,
      content,
      confidence: Math.max(0, Math.min(1.0, confidence)),
      tags,
      metadata,
      provenance,
      createdAt: new Date().toISOString()
    };

    const entries = this.inMemoryEntries.get(missionId) || [];
    entries.push(entry);
    this.inMemoryEntries.set(missionId, entries);

    if (this.repository) {
      try {
        this.repository.addBlackboardEntry(entry);
      } catch {
        // Fallback to in-memory if repo fails
      }
    }

    return entry;
  }

  /**
   * Post a verified fact to blackboard
   */
  public postFact(missionId: string, author: string, title: string, content: string, confidence: number = 1.0, metadata?: Record<string, unknown>): BlackboardEntry {
    return this.postEntry(missionId, 'FACT', title, content, author, confidence, ['verified'], metadata);
  }

  /**
   * Post a blocker
   */
  public postBlocker(missionId: string, author: string, title: string, content: string, metadata?: Record<string, unknown>): BlackboardEntry {
    return this.postEntry(missionId, 'BLOCKER', title, content, author, 1.0, ['critical', 'blocker'], metadata);
  }

  /**
   * Post an architectural / tactical decision
   */
  public postDecision(missionId: string, author: string, title: string, content: string, rationale?: string): BlackboardEntry {
    return this.postEntry(missionId, 'DECISION', title, content, author, 1.0, ['decision'], { rationale });
  }

  /**
   * Register a persistent mission artifact in blackboard and artifact graph
   */
  public registerArtifact(artifact: MissionArtifact): MissionArtifact {
    const artifacts = this.inMemoryArtifacts.get(artifact.missionId) || [];
    artifacts.push(artifact);
    this.inMemoryArtifacts.set(artifact.missionId, artifacts);

    if (this.repository) {
      try {
        this.repository.saveArtifact(artifact);
      } catch {
        // In-memory fallback
      }
    }

    // Also note on blackboard
    this.postEntry(
      artifact.missionId,
      'ARTIFACT_REF',
      `Artifact Produced: ${artifact.name}`,
      `Path: ${artifact.location} (Type: ${artifact.type}, Version: ${artifact.version})`,
      artifact.ownerAgent || 'SYSTEM',
      1.0,
      ['artifact', artifact.type],
      { artifactId: artifact.artifactId, checksum: artifact.checksum, verificationState: artifact.verificationState }
    );

    return artifact;
  }

  /**
   * Query entries for a mission with optional type and tag filtering
   */
  public getEntries(missionId: string, filter?: { type?: BlackboardEntryType; tag?: string; minConfidence?: number }): BlackboardEntry[] {
    let entries = this.inMemoryEntries.get(missionId);
    if (!entries && this.repository) {
      entries = this.repository.getBlackboardEntries(missionId);
      this.inMemoryEntries.set(missionId, entries);
    }
    entries = entries || [];

    return entries.filter(e => {
      if (filter?.type && e.type !== filter.type) return false;
      if (filter?.tag && !(e.tags && e.tags.includes(filter.tag))) return false;
      if (filter?.minConfidence !== undefined && (e.confidence ?? 1.0) < filter.minConfidence) return false;
      return true;
    });
  }

  /**
   * Retrieve all artifacts produced during the mission
   */
  public getArtifacts(missionId: string): MissionArtifact[] {
    let artifacts = this.inMemoryArtifacts.get(missionId);
    if (!artifacts && this.repository) {
      artifacts = this.repository.getArtifacts(missionId);
      this.inMemoryArtifacts.set(missionId, artifacts);
    }
    return artifacts || [];
  }

  /**
   * Get active blockers
   */
  public getActiveBlockers(missionId: string): BlackboardEntry[] {
    return this.getEntries(missionId, { type: 'BLOCKER' });
  }

  /**
   * Clear cache (useful for testing or state reload)
   */
  public clearCache(): void {
    this.inMemoryEntries.clear();
    this.inMemoryArtifacts.clear();
  }
}
