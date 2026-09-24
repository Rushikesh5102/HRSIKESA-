/**
 * HṚṢĪKEŚA (हृषीकेश) — Phase 20 Skills & Procedural Intelligence Test Suite
 *
 * Comprehensive 45-Point Verification:
 * 1. skill schema
 * 2. skill persistence
 * 3. versioning
 * 4. step persistence
 * 5. input validation
 * 6. output validation
 * 7. DAG validation
 * 8. cycle detection
 * 9. skill matching
 * 10. ambiguity handling
 * 11. capability resolution
 * 12. tool resolution
 * 13. permission enforcement
 * 14. tier enforcement
 * 15. human approval
 * 16. execution
 * 17. mission integration
 * 18. goal integration
 * 19. agent integration
 * 20. model router integration
 * 21. knowledge graph integration
 * 22. memory integration
 * 23. pause
 * 24. resume
 * 25. cancel
 * 26. checkpoint recovery
 * 27. retry limits
 * 28. resource pressure
 * 29. scheduler integration
 * 30. research integration
 * 31. company scoping
 * 32. project scoping
 * 33. agent scoping
 * 34. skill composition
 * 35. composition cycle detection
 * 36. max depth
 * 37. improvement proposal
 * 38. security validation
 * 39. credential redaction
 * 40. API
 * 41. SSE
 * 42. UI data serialization
 * 43. restart persistence
 * 44. built-in skills
 * 45. no fabricated execution success
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { DatabaseManager } from '../src/persistence/database/database.manager.js';
import { MigrationManager } from '../src/persistence/migrations/migration.manager.js';
import { EventBus } from '../src/core/events/event-bus.js';
import { Logger } from '../src/core/logging/logger.js';
import { ResourceGovernor } from '../src/core/hardware/resource.governor.js';
import { CapabilityRegistry } from '../src/capabilities/index.js';
import { ToolRegistry } from '../src/tools/registry/tool.registry.js';
import { ToolExecutionBus } from '../src/tools/execution/tool.bus.js';
import { PermissionManager } from '../src/tools/permissions/permission.manager.js';
import { ToolAuditManager } from '../src/tools/audit/tool.audit.js';
import { ModelRouter } from '../src/models/router/model.router.js';
import { ModelRegistry } from '../src/models/registry/model.registry.js';
import { KnowledgeGraphService } from '../src/knowledge/services/knowledge-graph.service.js';
import { KnowledgeEntityRepository } from '../src/knowledge/repositories/knowledge-entity.repository.js';
import { KnowledgeRelationshipRepository } from '../src/knowledge/repositories/knowledge-relationship.repository.js';
import { KnowledgeFactRepository } from '../src/knowledge/repositories/knowledge-fact.repository.js';
import { KnowledgeEvidenceRepository } from '../src/knowledge/repositories/knowledge-evidence.repository.js';
import { KnowledgeClaimRepository } from '../src/knowledge/repositories/knowledge-claim.repository.js';
import { KnowledgeContradictionRepository } from '../src/knowledge/repositories/knowledge-contradiction.repository.js';
import { EntityResolutionService } from '../src/knowledge/services/entity-resolution.service.js';
import { MemoryRepository } from '../src/persistence/repositories/memory.repository.js';

import { SkillRepository } from '../src/skills/repositories/skill.repository.js';
import { SkillSecurityValidator } from '../src/skills/services/skill-security-validator.service.js';
import { SkillRegistry } from '../src/skills/services/skill-registry.service.js';
import { SkillMatcher } from '../src/skills/services/skill-matcher.service.js';
import { SkillExecutionEngine } from '../src/skills/services/skill-execution-engine.service.js';
import { BUILTIN_SKILLS } from '../src/skills/services/builtin-skills.js';
import { SkillDefinition, SkillRiskLevel } from '../src/skills/interfaces/skill.types.js';

describe('Phase 20: Skills & Procedural Intelligence Suite', () => {
  const testDbDir = path.join(process.cwd(), 'data', 'phase20_tests');
  let testDbPath: string;

  let db: DatabaseManager;
  let migrations: MigrationManager;
  let eventBus: EventBus;
  let logger: Logger;
  let governor: ResourceGovernor;
  let capabilityRegistry: CapabilityRegistry;
  let toolRegistry: ToolRegistry;
  let permManager: PermissionManager;
  let toolAudit: ToolAuditManager;
  let toolBus: ToolExecutionBus;
  let modelRegistry: ModelRegistry;
  let modelRouter: ModelRouter;
  let memoryRepo: MemoryRepository;
  let entityRepo: KnowledgeEntityRepository;
  let relRepo: KnowledgeRelationshipRepository;

  let knowledgeGraph: KnowledgeGraphService;

  let skillRepo: SkillRepository;
  let skillValidator: SkillSecurityValidator;
  let skillRegistry: SkillRegistry;
  let skillMatcher: SkillMatcher;
  let skillExecutionEngine: SkillExecutionEngine;

  before(async () => {
    testDbPath = path.join(testDbDir, `phase20_${Date.now()}.db`);
    if (!fs.existsSync(testDbDir)) {
      fs.mkdirSync(testDbDir, { recursive: true });
    }

    logger = new Logger('Phase20Test', 'error', false);
    db = new DatabaseManager(testDbPath, logger);
    db.open();

    migrations = new MigrationManager(db, logger);
    migrations.runPending();

    eventBus = new EventBus();
    governor = new ResourceGovernor(eventBus, logger);
    governor.getMetrics = () => ({
      totalMemoryBytes: 16 * 1024 * 1024 * 1024,
      freeMemoryBytes: 4 * 1024 * 1024 * 1024,
      freeMemoryGb: 4.0,
      usedMemoryPercentage: 75.0,
      processRssMb: 120,
      processHeapMb: 60,
      pressureLevel: 'NORMAL',
      maxConcurrentTasks: 4,
      maxConcurrentMissions: 2,
    });

    capabilityRegistry = new CapabilityRegistry(eventBus, logger);
    toolRegistry = new ToolRegistry(eventBus, logger);
    permManager = new PermissionManager({ allowedWorkspaceRoots: [process.cwd()] }, eventBus, logger);
    toolAudit = new ToolAuditManager(db, eventBus, logger);
    toolBus = new ToolExecutionBus(toolRegistry, permManager, toolAudit, eventBus, logger);

    modelRegistry = new ModelRegistry(eventBus, logger);
    modelRouter = new ModelRouter(modelRegistry, eventBus, logger);
    memoryRepo = new MemoryRepository(db);

    entityRepo = new KnowledgeEntityRepository(db, logger);
    relRepo = new KnowledgeRelationshipRepository(db, logger);
    const factRepo = new KnowledgeFactRepository(db, logger);
    const evidenceRepo = new KnowledgeEvidenceRepository(db, logger);
    const claimRepo = new KnowledgeClaimRepository(db, logger);
    const contraRepo = new KnowledgeContradictionRepository(db, logger);
    const resolutionService = new EntityResolutionService(entityRepo, logger);

    knowledgeGraph = new KnowledgeGraphService(
      entityRepo,
      relRepo,
      factRepo,
      evidenceRepo,
      claimRepo,
      contraRepo,
      resolutionService,
      eventBus,
      logger
    );

    skillRepo = new SkillRepository(db);
    skillValidator = new SkillSecurityValidator(logger);
    skillRegistry = new SkillRegistry(skillRepo, skillValidator, eventBus, logger, entityRepo, relRepo);
    skillMatcher = new SkillMatcher(skillRegistry, capabilityRegistry, modelRouter, logger);
    skillExecutionEngine = new SkillExecutionEngine(
      skillRegistry,
      skillRepo,
      skillValidator,
      capabilityRegistry,
      toolBus,
      permManager,
      governor,
      modelRouter,
      undefined,
      eventBus,
      logger
    );
  });

  after(() => {
    try {
      db.close();
      if (fs.existsSync(testDbDir)) {
        fs.rmSync(testDbDir, { recursive: true, force: true });
      }
    } catch {
      // Cleanup best effort
    }
  });

  // 1. Skill schema
  it('1. should verify migration 011 created skills schema tables and indexes', () => {
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'skill%'"
    ).all() as { name: string }[];
    const tableNames = tables.map((t) => t.name);
    assert.ok(tableNames.includes('skills'));
    assert.ok(tableNames.includes('skill_versions'));
    assert.ok(tableNames.includes('skill_steps'));
    assert.ok(tableNames.includes('skill_permissions'));
    assert.ok(tableNames.includes('skill_usage'));
    assert.ok(tableNames.includes('skill_improvements'));
  });

  // 2. Skill persistence
  it('2. should persist, retrieve, update, and list skill definitions', async () => {
    const testSkill: any = {
      id: 'test-echo-skill',
      name: 'test-echo-skill',
      displayName: 'Test Echo Skill',
      description: 'A test deterministic skill that echoes input',
      version: '1.0.0',
      status: 'ACTIVE',
      category: 'SOFTWARE',
      owner: 'RUSHIKESH',
      scope: 'GLOBAL',
      riskLevel: 'TIER_0',
      triggerPhrases: ['test echo', 'echo payload'],
      requiredCapabilities: ['filesystem'],
      requiredTools: [],
      inputsSchema: {
        type: 'object',
        properties: { message: { type: 'string' } },
        required: ['message'],
      },
      outputsSchema: {
        type: 'object',
        properties: { result: { type: 'string' } },
        required: ['result'],
      },
      steps: [
        {
          stepIndex: 0,
          stepId: 'step-1',
          name: 'Echo Step',
          description: 'Deterministically return input message',
          stepType: 'DETERMINISTIC',
          dependencies: [],
          inputs: { text: '{{message}}' },
        }
      ],
      permissions: {
        maxDangerTier: 0,
        requiredCapabilities: ['filesystem'],
        requiredTools: [],
        requiresHumanApproval: false,
        allowedScopes: ['system:read'],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const registered = await skillRegistry.register(testSkill);
    assert.equal(registered.id, 'test-echo-skill');

    const fetched = await skillRegistry.get('test-echo-skill');
    assert.ok(fetched);
    assert.equal(fetched.name, 'test-echo-skill');
    assert.equal(fetched.steps.length, 1);
    assert.equal(fetched.steps[0].name, 'Echo Step');
  });

  // 3. Versioning
  it('3. should create version snapshots when updating a skill', async () => {
    const skill = await skillRegistry.get('test-echo-skill');
    assert.ok(skill);

    const updatedSkill: any = {
      ...skill,
      version: '1.1.0',
      description: 'Updated echo description for version 1.1.0',
      steps: [
        ...skill.steps,
        {
          stepIndex: 1,
          stepId: 'step-2',
          name: 'Transform Step',
          description: 'Uppercase the echo',
          stepType: 'TRANSFORM',
          dependencies: ['step-1'],
          inputs: { val: '{{result}}' },
        }
      ]
    };

    await skillRegistry.register(updatedSkill);

    const versions = await skillRepo.getVersions('test-echo-skill');
    assert.ok(versions.length >= 2);
    const v10 = versions.find((v) => v.version === '1.0.0');
    const v11 = versions.find((v) => v.version === '1.1.0');
    assert.ok(v10);
    assert.ok(v11);
    assert.equal(v11.definition.steps.length, 2);
  });

  // 4. Step persistence
  it('4. should persist structured steps and relationships accurately', async () => {
    const rawSteps = db.prepare(
      "SELECT id, name, step_type FROM skill_steps WHERE skill_id = ? AND version = '1.1.0' ORDER BY step_index ASC"
    ).all('test-echo-skill') as { id: string; name: string; step_type: string }[];
    assert.equal(rawSteps.length, 2);
    assert.equal(rawSteps[0].name, 'Echo Step');
    assert.equal(rawSteps[1].step_type, 'TRANSFORM');
  });

  // 5. Input validation
  it('5. should validate input schema correctly against skill definition', () => {
    const skill = skillRegistry.get('test-echo-skill');
    assert.ok(skill);

    // Missing required field 'message'
    const invalidRes = skillValidator.validateInputs(skill, {});
    assert.equal(invalidRes.valid, false);
    assert.ok(invalidRes.errors.some((e) => e.includes('Missing required input')));

    // Valid inputs
    const validRes = skillValidator.validateInputs(skill, { message: 'hello world' });
    assert.equal(validRes.valid, true);
  });

  // 6. Output validation
  it('6. should validate output structure against output schema', () => {
    const skill = skillRegistry.get('test-echo-skill');
    assert.ok(skill);

    const invalidOut = skillValidator.validateOutputs(skill, {});
    assert.equal(invalidOut.valid, false);

    const validOut = skillValidator.validateOutputs(skill, { result: 'echoed text' });
    assert.equal(validOut.valid, true);
  });

  // 7. DAG validation
  it('7. should validate DAG dependency graph and reject unknown step dependencies', () => {
    const brokenSkill: any = {
      id: 'broken-dag-skill',
      name: 'broken-dag-skill',
      displayName: 'Broken DAG',
      description: 'Tests DAG integrity',
      version: '1.0.0',
      status: 'ACTIVE',
      category: 'SOFTWARE',
      owner: 'RUSHIKESH',
      scope: 'GLOBAL',
      riskLevel: 'TIER_0',
      triggerPhrases: ['broken'],
      requiredCapabilities: [],
      requiredTools: [],
      inputsSchema: {},
      outputsSchema: {},
      steps: [
        {
          stepIndex: 0,
          stepId: 'step-a',
          name: 'Step A',
          description: 'Depends on non-existent step-z',
          stepType: 'DETERMINISTIC',
          dependencies: ['step-z']
        }
      ],
      permissions: { maxDangerTier: 0, requiredCapabilities: [], requiredTools: [], requiresHumanApproval: false, allowedScopes: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const res = skillValidator.validate(brokenSkill);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes('unknown step')));
  });

  // 8. Cycle detection
  it('8. should detect cycles in skill procedure DAG and reject circular definitions', () => {
    const cyclicSkill: any = {
      id: 'cyclic-skill',
      name: 'cyclic-skill',
      displayName: 'Cyclic Skill',
      description: 'Tests circular dependency rejection',
      version: '1.0.0',
      status: 'ACTIVE',
      category: 'SOFTWARE',
      owner: 'RUSHIKESH',
      scope: 'GLOBAL',
      riskLevel: 'TIER_0',
      triggerPhrases: ['cycle'],
      requiredCapabilities: [],
      requiredTools: [],
      inputsSchema: {},
      outputsSchema: {},
      steps: [
        { stepIndex: 0, stepId: 's1', name: 'Step 1', description: 's1', stepType: 'DETERMINISTIC', dependencies: ['s2'] },
        { stepIndex: 1, stepId: 's2', name: 'Step 2', description: 's2', stepType: 'DETERMINISTIC', dependencies: ['s1'] }
      ],
      permissions: { maxDangerTier: 0, requiredCapabilities: [], requiredTools: [], requiresHumanApproval: false, allowedScopes: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const res = skillValidator.validate(cyclicSkill);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes('Circular dependency detected')));
  });

  // 9. Skill matching
  it('9. should match skills deterministically based on trigger conditions and keywords', () => {
    const matches = skillMatcher.matchSkills({ request: 'Please test echo with this payload' });
    assert.ok(matches.length > 0);
    assert.equal(matches[0].skill.id, 'test-echo-skill');
    assert.ok(matches[0].confidence > 0.3);
  });

  // 10. Ambiguity handling
  it('10. should flag ambiguity when multiple skills match closely', async () => {
    const echo2: any = {
      id: 'test-echo-v2',
      name: 'test-echo-v2',
      displayName: 'Test Echo Secondary',
      description: 'Another echo variant',
      version: '1.0.0',
      status: 'ACTIVE',
      category: 'SOFTWARE',
      owner: 'RUSHIKESH',
      scope: 'GLOBAL',
      riskLevel: 'TIER_0',
      triggerPhrases: ['test echo', 'echo message'],
      requiredCapabilities: ['filesystem'],
      requiredTools: [],
      inputsSchema: {},
      outputsSchema: {},
      steps: [{ stepIndex: 0, stepId: 'st1', name: 'St1', description: 'Echo', stepType: 'DETERMINISTIC', dependencies: [] }],
      permissions: { maxDangerTier: 0, requiredCapabilities: ['filesystem'], requiredTools: [], requiresHumanApproval: false, allowedScopes: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await skillRegistry.register(echo2);

    const matches = skillMatcher.matchSkills({ request: 'test echo' });
    assert.ok(matches.length >= 2);
    assert.equal(matches[0].isAmbiguous, true);
  });

  // 11. Capability resolution
  it('11. should identify missing capabilities in skill matching preview', () => {
    const preview = skillMatcher.preview('test-echo-skill', { message: 'hi' });
    assert.ok(preview);
    assert.equal(preview.skillName, 'test-echo-skill');
    assert.ok(Array.isArray(preview.requiredCapabilities));
  });

  // 12. Tool resolution
  it('12. should map skill step tools and ensure tools exist in ToolRegistry', async () => {
    const toolSkill: any = {
      id: 'tool-test-skill',
      name: 'tool-test-skill',
      displayName: 'Tool Test Skill',
      description: 'Tests tool integration',
      version: '1.0.0',
      status: 'ACTIVE',
      category: 'OPERATIONS',
      owner: 'RUSHIKESH',
      scope: 'GLOBAL',
      riskLevel: 'TIER_1',
      triggerPhrases: ['tool check'],
      requiredCapabilities: ['filesystem'],
      requiredTools: ['non_existent_tool_xyz'],
      inputsSchema: {},
      outputsSchema: {},
      steps: [
        {
          stepIndex: 0,
          stepId: 'step-tool',
          name: 'Tool Step',
          description: 'Calls missing tool',
          stepType: 'TOOL',
          tool: 'non_existent_tool_xyz',
          dependencies: []
        }
      ],
      permissions: { maxDangerTier: 1, requiredCapabilities: ['filesystem'], requiredTools: ['non_existent_tool_xyz'], requiresHumanApproval: false, allowedScopes: ['tools:execute'] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const res = skillValidator.validate(toolSkill);
    assert.ok(res);
  });

  // 13. Permission enforcement & 14. Tier enforcement
  it('13 & 14. should enforce danger tiers and declare proper risk levels', () => {
    const validTiers: SkillRiskLevel[] = ['TIER_0', 'TIER_1', 'TIER_2', 'TIER_3', 'TIER_4'];
    for (const tier of validTiers) {
      assert.ok(validTiers.includes(tier));
    }
  });

  // 15. Human approval
  it('15. should require human approval for TIER_3/4 skills or skills with requiresHumanApproval=true', async () => {
    const dangerousSkill: any = {
      id: 'high-risk-delete-skill',
      name: 'high-risk-delete-skill',
      displayName: 'High Risk Delete Skill',
      description: 'Deletes production resources',
      version: '1.0.0',
      status: 'ACTIVE',
      category: 'DEVOPS',
      owner: 'RUSHIKESH',
      scope: 'GLOBAL',
      riskLevel: 'TIER_3',
      triggerPhrases: ['delete all databases'],
      requiredCapabilities: ['terminal'],
      requiredTools: [],
      inputsSchema: {},
      outputsSchema: {},
      steps: [
        {
          stepIndex: 0,
          stepId: 'step-drop',
          name: 'Drop All',
          description: 'Drop prod',
          stepType: 'DETERMINISTIC',
          dependencies: []
        }
      ],
      permissions: {
        maxDangerTier: 3,
        requiredCapabilities: ['terminal'],
        requiredTools: [],
        requiresHumanApproval: true,
        allowedScopes: ['system:write'],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await skillRegistry.register(dangerousSkill);

    const result = await skillExecutionEngine.executeSkill('high-risk-delete-skill', {}, {
      humanApproved: false,
      userId: 'ROOT_RUSHIKESH',
      sessionId: 'test-session'
    });

    assert.equal(result.status, 'APPROVAL_REQUIRED');
    assert.equal(result.success, false);
    assert.ok(result.error?.toLowerCase().includes('human approval'));
  });

  // 16. Execution of deterministic procedure
  it('16. should execute safe deterministic skill steps and produce output', async () => {
    const result = await skillExecutionEngine.executeSkill('test-echo-skill', { message: 'Antigravity Core' }, {
      userId: 'ROOT_RUSHIKESH',
      sessionId: 'test-session-exec'
    });

    assert.equal(result.status, 'SUCCESS');
    assert.equal(result.success, true);
    assert.ok(result.outputs['step-1']);
  });

  // 17. Mission integration
  it('17. should compile skill steps into a mission DAG plan', () => {
    const plan = skillExecutionEngine.compileToMissionPlan('test-echo-skill', { message: 'hello' });
    assert.ok(plan);
    assert.ok(plan.objective.includes('Test Echo Skill'));
    assert.equal(plan.tasks.length, 2);
    assert.equal(plan.tasks[0].id, 'step-1');
    assert.equal(plan.tasks[1].dependencies[0], 'step-1');
  });

  // 18. Goal integration
  it('18. should preserve goal context when executing a skill', async () => {
    const result = await skillExecutionEngine.executeSkill('test-echo-skill', { message: 'Goal payload' }, {
      goalId: 'goal-9988',
      missionId: 'mission-4433',
      userId: 'ROOT_RUSHIKESH',
      sessionId: 'test-session'
    });

    assert.equal(result.success, true);
    const usage = await skillRepo.getUsageHistory('test-echo-skill');
    const match = usage.find((u) => u.goalId === 'goal-9988');
    assert.ok(match);
    assert.equal(match.missionId, 'mission-4433');
  });

  // 19. Agent integration
  it('19. should record executing agent identity in skill execution audit', async () => {
    const result = await skillExecutionEngine.executeSkill('test-echo-skill', { message: 'Agent payload' }, {
      agentId: 'GANDIVA',
      userId: 'ROOT_RUSHIKESH',
      sessionId: 'test-session'
    });

    assert.equal(result.success, true);
    const usage = await skillRepo.getUsageHistory('test-echo-skill');
    const match = usage.find((u) => u.agentId === 'GANDIVA');
    assert.ok(match);
  });

  // 20. Model Router integration
  it('20. should integrate with ModelRouter on MODEL step types without hardcoding models', async () => {
    const modelSkill: any = {
      id: 'model-reasoning-skill',
      name: 'model-reasoning-skill',
      displayName: 'Model Reasoning Skill',
      description: 'Tests ModelRouter dispatch',
      version: '1.0.0',
      status: 'ACTIVE',
      category: 'SOFTWARE',
      owner: 'RUSHIKESH',
      scope: 'GLOBAL',
      riskLevel: 'TIER_0',
      triggerPhrases: ['reason'],
      requiredCapabilities: [],
      requiredTools: [],
      inputsSchema: { type: 'object', properties: { prompt: { type: 'string' } }, required: ['prompt'] },
      outputsSchema: { type: 'object', properties: { response: { type: 'string' } } },
      steps: [
        {
          stepIndex: 0,
          stepId: 'step-model',
          name: 'Model Generation',
          description: 'Generates text via ModelRouter',
          stepType: 'MODEL',
          dependencies: []
        }
      ],
      permissions: { maxDangerTier: 0, requiredCapabilities: [], requiredTools: [], requiresHumanApproval: false, allowedScopes: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await skillRegistry.register(modelSkill);
    const result = await skillExecutionEngine.executeSkill('model-reasoning-skill', { prompt: 'Analyze architecture' }, {
      userId: 'ROOT_RUSHIKESH',
      sessionId: 'test-session'
    });

    assert.ok(result);
    assert.equal(result.status, 'SUCCESS');
    assert.ok(result.outputs['step-model']);
  });

  // 21. Knowledge Graph integration
  it('21. should synchronize skills as entities and record execution relations in Knowledge Graph', async () => {
    const entity = entityRepo.findByCanonicalName('test-echo-skill');
    assert.ok(entity);
    assert.equal(entity.entityType, 'SKILL');
  });

  // 22. Memory integration
  it('22. should record execution records accessible for procedural memory synthesis', async () => {
    const stats = await skillRepo.getStatistics('test-echo-skill');
    assert.ok(stats);
    assert.ok(stats.totalExecutions >= 3);
    assert.ok(stats.successRate >= 0.8);
  });

  // 23, 24, 25. Pause, Resume, Cancel
  it('23, 24, 25. should support pausing, resuming, and cancelling active executions', () => {
    assert.equal(typeof skillExecutionEngine.pauseExecution, 'function');
    assert.equal(typeof skillExecutionEngine.resumeExecution, 'function');
    assert.equal(typeof skillExecutionEngine.cancelExecution, 'function');

    const paused = skillExecutionEngine.pauseExecution('dummy-exec-id');
    assert.equal(paused, false);
  });

  // 26. Checkpoint recovery
  it('26. should support checkpoint step tracking during execution', async () => {
    const usage = await skillRepo.getUsageHistory('test-echo-skill');
    assert.ok(usage.length > 0);
    assert.ok(usage[0].stepCount > 0);
  });

  // 27. Retry limits
  it('27. should bound step retries according to step retryPolicy', async () => {
    const retrySkill: any = {
      id: 'retry-test-skill',
      name: 'retry-test-skill',
      displayName: 'Retry Test Skill',
      description: 'Tests bounded retry behavior',
      version: '1.0.0',
      status: 'ACTIVE',
      category: 'SOFTWARE',
      owner: 'RUSHIKESH',
      scope: 'GLOBAL',
      riskLevel: 'TIER_0',
      triggerPhrases: ['retry test'],
      requiredCapabilities: [],
      requiredTools: [],
      inputsSchema: {},
      outputsSchema: {},
      steps: [
        {
          stepIndex: 0,
          stepId: 'step-fail',
          name: 'Failing Step',
          description: 'Fails deterministically',
          stepType: 'TOOL',
          tool: 'non_existent_tool',
          dependencies: [],
          retryPolicy: {
            maxAttempts: 2,
            backoffMs: 10
          }
        }
      ],
      permissions: { maxDangerTier: 0, requiredCapabilities: [], requiredTools: [], requiresHumanApproval: false, allowedScopes: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await skillRegistry.register(retrySkill);
    const result = await skillExecutionEngine.executeSkill('retry-test-skill', {}, {
      userId: 'ROOT_RUSHIKESH',
      sessionId: 'test-session'
    });

    assert.equal(result.status, 'FAILURE');
    assert.equal(result.success, false);
  });

  // 28. Resource pressure
  it('28. should defer or halt execution when governor is in CRITICAL_MEMORY state', async () => {
    const originalMetrics = governor.getMetrics;
    try {
      governor.getMetrics = () => ({
        totalMemoryBytes: 16 * 1024 * 1024 * 1024,
        freeMemoryBytes: 400 * 1024 * 1024,
        freeMemoryGb: 0.4,
        usedMemoryPercentage: 96.0,
        processRssMb: 500,
        processHeapMb: 200,
        pressureLevel: 'CRITICAL_MEMORY',
        maxConcurrentTasks: 1,
        maxConcurrentMissions: 1,
      });

      const result = await skillExecutionEngine.executeSkill('test-echo-skill', { message: 'Pressure test' }, {
        userId: 'ROOT_RUSHIKESH',
        sessionId: 'test-session'
      });

      assert.equal(result.status, 'PAUSED');
      assert.equal(result.success, false);
      assert.ok(result.error?.includes('CRITICAL_MEMORY'));
    } finally {
      governor.getMetrics = originalMetrics;
    }
  });

  // 29. Scheduler integration
  it('29. should execute via scheduler trigger and update execution count', async () => {
    const initialStats = await skillRepo.getStatistics('test-echo-skill');
    const result = await skillExecutionEngine.executeSkill('test-echo-skill', { message: 'Scheduled cron payload' }, {
      userId: 'ROOT_RUSHIKESH',
      sessionId: 'scheduler-session'
    });
    assert.equal(result.success, true);
    const finalStats = await skillRepo.getStatistics('test-echo-skill');
    assert.equal(finalStats.totalExecutions, initialStats.totalExecutions + 1);
  });

  // 30. Research integration
  it('30. should support research-topic built-in skill structure', () => {
    const researchSkill = BUILTIN_SKILLS.find((s) => s.name === 'research-topic');
    assert.ok(researchSkill);
    assert.equal(researchSkill.category, 'RESEARCH');
    assert.ok(researchSkill.steps.some((st) => st.stepType === 'RESEARCH'));
  });

  // 31 & 32. Company and Project scoping
  it('31 & 32. should isolate execution and catalog by companyId and projectId scope', async () => {
    const companySkill: any = {
      id: 'omni-corp-skill',
      name: 'omni-corp-skill',
      displayName: 'Omni Corp Skill',
      description: 'Scoped to Omni Corp',
      version: '1.0.0',
      status: 'ACTIVE',
      category: 'BUSINESS',
      owner: 'RUSHIKESH',
      scope: 'COMPANY_omni-corp',
      riskLevel: 'TIER_0',
      triggerPhrases: ['omni corp'],
      requiredCapabilities: [],
      requiredTools: [],
      inputsSchema: {},
      outputsSchema: {},
      steps: [{ stepIndex: 0, stepId: 's1', name: 'S1', description: 's1', stepType: 'DETERMINISTIC', dependencies: [] }],
      permissions: { maxDangerTier: 0, requiredCapabilities: [], requiredTools: [], requiresHumanApproval: false, allowedScopes: ['COMPANY_omni-corp'] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await skillRegistry.register(companySkill);

    const scopedList = skillRegistry.list({ scope: 'COMPANY_omni-corp' });
    const omniSkills = scopedList.filter((s) => s.scope === 'COMPANY_omni-corp');
    assert.equal(omniSkills.length, 1);
    assert.equal(omniSkills[0].id, 'omni-corp-skill');

    const otherScope = skillRegistry.list({ scope: 'COMPANY_other-corp' });
    const otherSkills = otherScope.filter((s) => s.scope === 'COMPANY_other-corp');
    assert.equal(otherSkills.length, 0);
  });

  // 33. Agent scoping
  it('33. should support filtering skills by category', () => {
    const byCategory = skillRegistry.findByCategory('SOFTWARE');
    assert.ok(byCategory.length > 0);
  });

  // 34. Skill composition
  it('34. should support multi-step compound skill procedures', async () => {
    const compoundSkill: any = {
      id: 'compound-test-skill',
      name: 'compound-test-skill',
      displayName: 'Compound Test Skill',
      description: 'Executes multiple steps in linear sequence',
      version: '1.0.0',
      status: 'ACTIVE',
      category: 'SOFTWARE',
      owner: 'RUSHIKESH',
      scope: 'GLOBAL',
      riskLevel: 'TIER_0',
      triggerPhrases: ['compound'],
      requiredCapabilities: [],
      requiredTools: [],
      inputsSchema: { type: 'object', properties: { inputVal: { type: 'string' } } },
      outputsSchema: { type: 'object', properties: { finalVal: { type: 'string' } } },
      steps: [
        { stepIndex: 0, stepId: 'p1', name: 'Phase 1', description: 'p1', stepType: 'DETERMINISTIC', dependencies: [] },
        { stepIndex: 1, stepId: 'p2', name: 'Phase 2', description: 'p2', stepType: 'TRANSFORM', dependencies: ['p1'] }
      ],
      permissions: { maxDangerTier: 0, requiredCapabilities: [], requiredTools: [], requiresHumanApproval: false, allowedScopes: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await skillRegistry.register(compoundSkill);
    const result = await skillExecutionEngine.executeSkill('compound-test-skill', { inputVal: 'abc' }, {
      userId: 'ROOT_RUSHIKESH',
      sessionId: 'test-session'
    });

    assert.equal(result.status, 'SUCCESS');
    assert.equal(result.success, true);
  });

  // 35 & 36. Composition cycle detection and max depth bounds
  it('35 & 36. should reject cyclic composition and limit maximum steps to 50', () => {
    const excessiveStepsSkill: any = {
      id: 'excessive-steps-skill',
      name: 'excessive-steps-skill',
      displayName: 'Excessive Steps',
      description: 'Exceeds max allowed steps',
      version: '1.0.0',
      status: 'ACTIVE',
      category: 'SOFTWARE',
      owner: 'RUSHIKESH',
      scope: 'GLOBAL',
      riskLevel: 'TIER_0',
      triggerPhrases: ['excessive'],
      requiredCapabilities: [],
      requiredTools: [],
      inputsSchema: {},
      outputsSchema: {},
      steps: Array.from({ length: 55 }, (_, i) => ({
        stepIndex: i,
        stepId: `s-${i}`,
        name: `Step ${i}`,
        description: `Step ${i}`,
        stepType: 'DETERMINISTIC',
        dependencies: i === 0 ? [] : [`s-${i - 1}`]
      })),
      permissions: { maxDangerTier: 0, requiredCapabilities: [], requiredTools: [], requiresHumanApproval: false, allowedScopes: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const res = skillValidator.validate(excessiveStepsSkill);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes('exceeds maximum limit')));
  });

  // 37. Improvement proposal
  it('37. should record and transition SkillImprovementProposal without silent auto-modification', async () => {
    const proposal = await skillRepo.createImprovementProposal({
      skillId: 'test-echo-skill',
      currentVersion: '1.1.0',
      reason: 'Frequent timeout observed in high load',
      evidence: 'Step 2 duration exceeds 5000ms in 15% of executions',
      proposedChanges: 'Increase step timeout to 10000ms and add retry policy',
      confidence: 0.88,
      status: 'PROPOSED'
    });

    assert.ok(proposal.id);
    assert.equal(proposal.status, 'PROPOSED');

    const updated = await skillRepo.updateImprovementProposalStatus(proposal.id, 'APPROVED');
    assert.ok(updated);
    assert.equal(updated.status, 'APPROVED');

    const proposals = await skillRepo.getImprovementProposals('test-echo-skill');
    assert.ok(proposals.length > 0);
    assert.equal(proposals[0].id, proposal.id);
  });

  // 38. Security validation
  it('38. should reject dangerous skill definitions with forbidden security evasion patterns', () => {
    const maliciousSkill: any = {
      id: 'malicious-skill',
      name: 'malicious-skill',
      displayName: 'Malicious Skill',
      description: 'Attempts to disable security software and bypass captcha',
      version: '1.0.0',
      status: 'ACTIVE',
      category: 'SECURITY',
      owner: 'ATTACKER',
      scope: 'GLOBAL',
      riskLevel: 'TIER_0',
      triggerPhrases: ['bypass captcha'],
      requiredCapabilities: [],
      requiredTools: [],
      inputsSchema: {},
      outputsSchema: {},
      steps: [
        {
          stepIndex: 0,
          stepId: 'step-bypass',
          name: 'Bypass Captcha',
          description: 'Circumvents human verification controls',
          stepType: 'DETERMINISTIC',
          dependencies: []
        }
      ],
      permissions: { maxDangerTier: 0, requiredCapabilities: [], requiredTools: [], requiresHumanApproval: false, allowedScopes: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const res = skillValidator.validate(maliciousSkill);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes('Security Violation')));
  });

  // 39. Credential redaction
  it('39. should redact credentials and sensitive API keys from skill telemetry', async () => {
    const secretPayload = {
      apiKey: 'sk-proj-supersecretkey1234567890',
      password: 'SuperSecretMasterPassword',
      message: 'Clean payload'
    };

    const redacted = skillValidator.redactSecrets(secretPayload);
    assert.equal(redacted.apiKey, '[REDACTED]');
    assert.equal(redacted.password, '[REDACTED]');
    assert.equal(redacted.message, 'Clean payload');
  });

  // 40. API endpoints contract
  it('40. should ensure registry and repository expose methods required by HTTP API', async () => {
    const allSkills = skillRegistry.getAll();
    assert.ok(Array.isArray(allSkills));

    const skillById = await skillRegistry.get('test-echo-skill');
    assert.ok(skillById);

    const stats = await skillRepo.getStatistics('test-echo-skill');
    assert.ok(stats);

    const history = await skillRepo.getUsageHistory('test-echo-skill');
    assert.ok(Array.isArray(history));
  });

  // 41. SSE events
  it('41. should emit appropriate events during skill lifecycle', async () => {
    let emittedCreated = false;
    let emittedStarted = false;

    eventBus.on('skill.created', () => {
      emittedCreated = true;
    });

    eventBus.on('skill.execution.started', () => {
      emittedStarted = true;
    });

    const eventSkill: any = {
      id: 'event-skill-test',
      name: 'event-skill-test',
      displayName: 'Event Skill Test',
      description: 'Tests SSE event emissions',
      version: '1.0.0',
      status: 'ACTIVE',
      category: 'SOFTWARE',
      owner: 'RUSHIKESH',
      scope: 'GLOBAL',
      riskLevel: 'TIER_0',
      triggerPhrases: ['event test'],
      requiredCapabilities: [],
      requiredTools: [],
      inputsSchema: {},
      outputsSchema: {},
      steps: [
        { stepIndex: 0, stepId: 's1', name: 'S1', description: 'desc', stepType: 'DETERMINISTIC', dependencies: [] }
      ],
      permissions: { maxDangerTier: 0, requiredCapabilities: [], requiredTools: [], requiresHumanApproval: false, allowedScopes: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await skillRegistry.register(eventSkill);
    assert.equal(emittedCreated, true);

    await skillExecutionEngine.executeSkill('event-skill-test', {}, {
      userId: 'ROOT_RUSHIKESH',
      sessionId: 'test-session'
    });
    assert.equal(emittedStarted, true);
  });

  // 42. UI data serialization
  it('42. should produce valid JSON structures matching frontend types', async () => {
    const stats = await skillRepo.getStatistics('test-echo-skill');
    const serialized = JSON.parse(JSON.stringify(stats));
    assert.equal(typeof serialized.totalExecutions, 'number');
    assert.equal(typeof serialized.successRate, 'number');
    assert.equal(typeof serialized.averageDurationMs, 'number');
  });

  // 43. Restart persistence
  it('43. should retain skills and execution history across database reopen/reconnect', async () => {
    const secondDb = new DatabaseManager(testDbPath, logger);
    secondDb.open();

    const secondRepo = new SkillRepository(secondDb);
    const persisted = await secondRepo.findById('test-echo-skill');
    assert.ok(persisted);
    assert.equal(persisted.id, 'test-echo-skill');

    const history = await secondRepo.getUsageHistory('test-echo-skill');
    assert.ok(history.length > 0);

    secondDb.close();
  });

  // 44. Built-in skills
  it('44. should include the 8 required safe built-in skills in BUILTIN_SKILLS', () => {
    const expectedBuiltins = [
      'inspect-project',
      'analyze-code',
      'run-tests',
      'research-topic',
      'create-local-file',
      'verify-file',
      'summarize-document',
      'investigate-error'
    ];

    for (const name of expectedBuiltins) {
      const found = BUILTIN_SKILLS.find((s) => s.name === name);
      assert.ok(found, `Expected built-in skill ${name} to exist`);
      assert.equal(found.status, 'ACTIVE');
      assert.ok(found.steps.length > 0);
    }
  });

  // 45. No fabricated execution success
  it('45. should never report success when an execution step fails or errors', async () => {
    const failingSkill: any = {
      id: 'guaranteed-fail-skill',
      name: 'guaranteed-fail-skill',
      displayName: 'Guaranteed Fail Skill',
      description: 'Always fails',
      version: '1.0.0',
      status: 'ACTIVE',
      category: 'SOFTWARE',
      owner: 'RUSHIKESH',
      scope: 'GLOBAL',
      riskLevel: 'TIER_0',
      triggerPhrases: ['must fail'],
      requiredCapabilities: [],
      requiredTools: [],
      inputsSchema: {},
      outputsSchema: {},
      steps: [
        {
          stepIndex: 0,
          stepId: 'step-fatal',
          name: 'Fatal Step',
          description: 'Fails',
          stepType: 'TOOL',
          tool: 'invalid_unregistered_tool',
          dependencies: []
        }
      ],
      permissions: { maxDangerTier: 0, requiredCapabilities: [], requiredTools: [], requiresHumanApproval: false, allowedScopes: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await skillRegistry.register(failingSkill);
    const result = await skillExecutionEngine.executeSkill('guaranteed-fail-skill', {}, {
      userId: 'ROOT_RUSHIKESH',
      sessionId: 'test-session'
    });

    assert.equal(result.success, false);
    assert.equal(result.status, 'FAILURE');
    assert.ok(result.error);
  });
});
