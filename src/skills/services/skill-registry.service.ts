/**
 * HṚṢĪKEŚA (हृषीकेश) — Skill Registry Service
 *
 * Phase 20: Central In-Memory Cache and Persistent Skill Governance
 */

import { SkillRepository } from '../repositories/skill.repository.js';
import { SkillSecurityValidator } from './skill-security-validator.service.js';
import {
  SkillDefinition,
  SkillStatus,
  SkillCategory,
  SkillVersionSnapshot,
  SkillStatistics,
} from '../interfaces/skill.types.js';
import { EventBus } from '../../core/events/event-bus.js';
import { ILogger } from '../../core/logging/logger.types.js';
import { KnowledgeEntityRepository } from '../../knowledge/repositories/knowledge-entity.repository.js';
import { KnowledgeRelationshipRepository } from '../../knowledge/repositories/knowledge-relationship.repository.js';

export class SkillRegistry {
  private readonly repo: SkillRepository;
  private readonly validator: SkillSecurityValidator;
  private readonly cache = new Map<string, SkillDefinition>();
  private readonly nameIndex = new Map<string, string>(); // name -> id
  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;
  private readonly knowledgeEntityRepo?: KnowledgeEntityRepository;
  private readonly knowledgeRelRepo?: KnowledgeRelationshipRepository;

  constructor(
    repo: SkillRepository,
    validator: SkillSecurityValidator,
    eventBus?: EventBus,
    logger?: ILogger,
    knowledgeEntityRepo?: KnowledgeEntityRepository,
    knowledgeRelRepo?: KnowledgeRelationshipRepository
  ) {
    this.repo = repo;
    this.validator = validator;
    this.eventBus = eventBus;
    this.logger = logger?.child('SkillRegistry');
    this.knowledgeEntityRepo = knowledgeEntityRepo;
    this.knowledgeRelRepo = knowledgeRelRepo;
    this.warmCache();
  }

  public register(
    data: Parameters<SkillRepository['createSkill']>[0],
    options?: { skipValidation?: boolean }
  ): SkillDefinition {
    // 1. Pre-validation
    const existing = this.get(data.id || data.name);
    if (existing) {
      if (data.version && data.version !== existing.version) {
        const updated = this.repo.updateSkill(existing.id, {
          version: data.version,
          displayName: data.displayName,
          description: data.description,
          category: data.category,
          status: data.status,
          riskLevel: data.riskLevel,
          steps: data.steps,
          inputsSchema: data.inputsSchema,
          outputsSchema: data.outputsSchema,
          triggerPhrases: data.triggerPhrases,
        });
        if (updated) {
          this.cache.set(updated.id, updated);
          this.nameIndex.set(updated.name, updated.id);
          this.eventBus?.emit('skill.updated', { skillId: updated.id, name: updated.name, version: updated.version });
          return updated;
        }
      }
      this.logger?.info(`Skill '${data.name}' already registered. Returning existing.`);
      return existing;
    }

    // Construct candidate for validation
    const candidate: SkillDefinition = {
      id: data.id || 'temp',
      name: data.name.trim().toLowerCase(),
      displayName: data.displayName || data.name,
      description: data.description,
      category: data.category || 'CUSTOM',
      owner: data.owner || 'SYSTEM',
      scope: data.scope || 'GLOBAL',
      status: data.status || 'ACTIVE',
      version: data.version || '1.0.0',
      riskLevel: data.riskLevel || 'TIER_1',
      triggerPhrases: data.triggerPhrases || [],
      requiredCapabilities: data.requiredCapabilities || [],
      requiredTools: data.requiredTools || [],
      inputsSchema: data.inputsSchema || {},
      outputsSchema: data.outputsSchema || {},
      steps: data.steps || [],
      permissions: {
        maxDangerTier: data.permissions?.maxDangerTier ?? 1,
        requiredCapabilities: data.permissions?.requiredCapabilities || [],
        requiredTools: data.permissions?.requiredTools || [],
        requiresHumanApproval: data.permissions?.requiresHumanApproval || false,
        allowedScopes: data.permissions?.allowedScopes || ['GLOBAL'],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!options?.skipValidation) {
      const valResult = this.validator.validate(candidate);
      if (!valResult.valid) {
        throw new Error(`Skill validation failed for '${candidate.name}': ${valResult.errors.join('; ')}`);
      }
    }

    // 2. Persist in Repository
    const created = this.repo.createSkill(data);
    this.cache.set(created.id, created);
    this.nameIndex.set(created.name, created.id);

    // 3. Mirror into Knowledge Graph if available
    this.syncKnowledgeGraph(created);

    this.logger?.info(`Registered procedural skill '${created.name}' [v${created.version}]`);
    this.eventBus?.emit('skill.created', {
      skillId: created.id,
      name: created.name,
      version: created.version,
    });

    return created;
  }

  public getAll(): SkillDefinition[] {
    return Array.from(this.cache.values());
  }

  public validate(idOrName: string): { valid: boolean; errors: string[]; warnings: string[] } {
    const skill = this.get(idOrName);
    if (!skill) {
      return { valid: false, errors: [`Skill '${idOrName}' not found`], warnings: [] };
    }
    return this.validator.validateSkill(skill);
  }

  public get(idOrName: string): SkillDefinition | undefined {
    if (!idOrName) return undefined;
    const clean = idOrName.trim().toLowerCase();

    // Check by ID
    if (this.cache.has(idOrName)) {
      return this.cache.get(idOrName);
    }

    // Check by name
    if (this.nameIndex.has(clean)) {
      const id = this.nameIndex.get(clean)!;
      return this.cache.get(id);
    }

    // Fallback to SQLite
    const fromDb = this.repo.getSkill(idOrName) || this.repo.getSkillByName(clean);
    if (fromDb) {
      this.cache.set(fromDb.id, fromDb);
      this.nameIndex.set(fromDb.name, fromDb.id);
      return fromDb;
    }

    return undefined;
  }

  public list(filter?: {
    category?: string;
    status?: SkillStatus;
    scope?: string;
    limit?: number;
  }): SkillDefinition[] {
    return this.repo.listSkills(filter);
  }

  public enable(idOrName: string): boolean {
    const skill = this.get(idOrName);
    if (!skill) return false;

    const updated = this.repo.updateSkill(skill.id, { status: 'ACTIVE' });
    if (updated) {
      this.cache.set(updated.id, updated);
      this.eventBus?.emit('skill.enabled', { skillId: updated.id });
      return true;
    }
    return false;
  }

  public disable(idOrName: string): boolean {
    const skill = this.get(idOrName);
    if (!skill) return false;

    const updated = this.repo.updateSkill(skill.id, { status: 'DISABLED' });
    if (updated) {
      this.cache.set(updated.id, updated);
      this.eventBus?.emit('skill.disabled', { skillId: updated.id });
      return true;
    }
    return false;
  }

  public update(idOrName: string, updates: Partial<SkillDefinition>): SkillDefinition | null {
    const skill = this.get(idOrName);
    if (!skill) return null;

    const updated = this.repo.updateSkill(skill.id, updates);
    if (updated) {
      this.cache.set(updated.id, updated);
      this.nameIndex.set(updated.name, updated.id);
      this.syncKnowledgeGraph(updated);
      this.eventBus?.emit('skill.updated', { skillId: updated.id, name: updated.name, version: updated.version });
      return updated;
    }
    return null;
  }

  public findByCategory(category: SkillCategory): SkillDefinition[] {
    return Array.from(this.cache.values()).filter(
      (s) => s.category.toUpperCase() === category.toUpperCase()
    );
  }

  public findByCapability(capability: string): SkillDefinition[] {
    const clean = capability.trim().toLowerCase();
    return Array.from(this.cache.values()).filter((s) =>
      s.requiredCapabilities.some((c) => c.toLowerCase() === clean) ||
      s.steps.some((st) => st.capability && st.capability.toLowerCase() === clean)
    );
  }

  public findByTrigger(query: string): SkillDefinition[] {
    const clean = query.trim().toLowerCase();
    return Array.from(this.cache.values()).filter((s) => {
      if (s.name.includes(clean) || s.displayName.toLowerCase().includes(clean)) return true;
      if (s.triggerPhrases?.some((t) => clean.includes(t.toLowerCase()))) return true;
      return false;
    });
  }

  public getVersions(idOrName: string): SkillVersionSnapshot[] {
    const skill = this.get(idOrName);
    if (!skill) return [];
    return this.repo.getVersions(skill.id);
  }

  public getStatistics(idOrName: string): SkillStatistics | null {
    const skill = this.get(idOrName);
    if (!skill) return null;
    return this.repo.getStatistics(skill.id);
  }

  public getRepository(): SkillRepository {
    return this.repo;
  }

  private warmCache(): void {
    try {
      const all = this.repo.listSkills();
      for (const s of all) {
        this.cache.set(s.id, s);
        this.nameIndex.set(s.name, s.id);
      }
      this.logger?.debug(`Loaded ${all.length} skills into in-memory cache.`);
    } catch {
      // Database might not be initialized yet during tests
    }
  }

  private syncKnowledgeGraph(skill: SkillDefinition): void {
    if (!this.knowledgeEntityRepo || !this.knowledgeRelRepo) return;
    try {
      // 1. Upsert Skill entity
      const existing = this.knowledgeEntityRepo.findByCanonicalName(skill.name);
      let entityId = existing?.id;
      if (!existing) {
        const ent = this.knowledgeEntityRepo.createEntity({
          type: 'SKILL',
          canonicalName: skill.name,
          displayName: skill.displayName,
          description: skill.description,
          scope: skill.scope,
          status: 'CONFIRMED',
        });
        entityId = ent.id;
      }

      // 2. Link capabilities
      for (const cap of skill.requiredCapabilities) {
        const capEnt = this.knowledgeEntityRepo.findByCanonicalName(`capability_${cap}`) ||
          this.knowledgeEntityRepo.createEntity({
            type: 'CONCEPT',
            canonicalName: `capability_${cap}`,
            displayName: `Capability: ${cap}`,
            scope: 'GLOBAL',
            status: 'CONFIRMED',
          });

        this.knowledgeRelRepo.createRelationship({
          sourceEntityId: entityId!,
          relationshipType: 'REQUIRES',
          targetEntityId: capEnt.id,
          direction: 'OUTGOING',
          confidence: 1.0,
          scope: 'GLOBAL',
          status: 'ACTIVE',
        });
      }
    } catch (err) {
      this.logger?.warn(`Knowledge graph sync failed for skill '${skill.name}': ${(err as Error).message}`);
    }
  }
}
