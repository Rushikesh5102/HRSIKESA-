import {
  MissionDescriptor,
  MissionOutcome,
  MissionTask,
  PlanVersion,
  MissionReport,
  BlackboardEntry,
  MissionArtifact,
  AgentWorkforceCapacity
} from './types/index.js';
import { MissionRepository } from './repository/mission.repository.js';
import { MissionCompiler } from './compiler/mission.compiler.js';
import { WorkforceCapacityTracker } from './workforce/workforce.capacity.tracker.js';
import { WorkforcePlanner } from './workforce/workforce.planner.js';
import { AgentCollaborationManager } from './workforce/agent.collaboration.manager.js';
import { MissionBlackboard } from './blackboard/mission.blackboard.js';
import { AcceptanceEngine } from './execution/acceptance.engine.js';
import { LoopProtectionEngine } from './execution/loop.protection.js';
import { ReplanningEngine } from './execution/replanning.engine.js';
import { MissionCheckpointManager } from './checkpoint/checkpoint.manager.js';
import { MissionExecutionCoordinator } from './execution/mission.execution.coordinator.js';
import { DatabaseManager } from '../persistence/database/database.manager.js';
import { EventBus } from '../core/events/event-bus.js';

export class UniversalAgenticMissionRuntime {
  public readonly repository: MissionRepository;
  public readonly compiler: MissionCompiler;
  public readonly capacityTracker: WorkforceCapacityTracker;
  public readonly workforcePlanner: WorkforcePlanner;
  public readonly collaborationManager: AgentCollaborationManager;
  public readonly blackboard: MissionBlackboard;
  public readonly acceptanceEngine: AcceptanceEngine;
  public readonly loopProtection: LoopProtectionEngine;
  public readonly replanningEngine: ReplanningEngine;
  public readonly checkpointManager: MissionCheckpointManager;
  public readonly executionCoordinator: MissionExecutionCoordinator;

  constructor(private readonly eventBus?: EventBus, dbPath: string = 'data/hrisekesa.db') {
    const dbManager = new DatabaseManager(dbPath);
    this.repository = new MissionRepository(dbManager);
    this.blackboard = new MissionBlackboard(this.repository);
    this.capacityTracker = new WorkforceCapacityTracker(this.repository);
    this.workforcePlanner = new WorkforcePlanner(this.capacityTracker);
    this.collaborationManager = new AgentCollaborationManager(this.capacityTracker, this.workforcePlanner);
    this.acceptanceEngine = new AcceptanceEngine();
    this.loopProtection = new LoopProtectionEngine();
    this.replanningEngine = new ReplanningEngine(this.loopProtection);
    this.checkpointManager = new MissionCheckpointManager(this.repository);

    this.compiler = new MissionCompiler(this.workforcePlanner);

    this.executionCoordinator = new MissionExecutionCoordinator({
      eventBus: this.eventBus,
      repository: this.repository,
      blackboard: this.blackboard,
      capacityTracker: this.capacityTracker,
      workforcePlanner: this.workforcePlanner,
      collaborationManager: this.collaborationManager,
      acceptanceEngine: this.acceptanceEngine,
      loopProtection: this.loopProtection,
      replanningEngine: this.replanningEngine,
      checkpointManager: this.checkpointManager
    });
  }

  /**
   * High-level natural language intent execution: "Build this."
   * Compiles natural language into mission, sets up outcomes/workforce/tasks, and initiates execution.
   */
  public async submitObjective(
    objective: string,
    options?: {
      owner?: string;
      companyId?: string;
      projectId?: string;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      autoStart?: boolean;
    }
  ): Promise<{
    mission: MissionDescriptor;
    outcomes: MissionOutcome[];
    tasks: MissionTask[];
    planVersion: PlanVersion;
  }> {
    const compilation = this.compiler.compile({
      objective,
      owner: options?.owner || 'Rushikesh',
      companyId: options?.companyId,
      projectId: options?.projectId,
      priority: options?.priority
    });

    this.executionCoordinator.registerMission(
      compilation.mission,
      compilation.outcomes,
      compilation.tasks,
      compilation.initialPlanVersion
    );

    if (options?.autoStart !== false) {
      await this.executionCoordinator.startMission(compilation.mission.missionId);
    }

    return {
      mission: this.executionCoordinator.getMission(compilation.mission.missionId) || compilation.mission,
      outcomes: this.executionCoordinator.getOutcomes(compilation.mission.missionId),
      tasks: this.executionCoordinator.getTasks(compilation.mission.missionId),
      planVersion: compilation.initialPlanVersion
    };
  }

  public async startMission(missionId: string): Promise<MissionDescriptor> {
    return this.executionCoordinator.startMission(missionId);
  }

  public pauseMission(missionId: string, reason?: string): MissionDescriptor {
    return this.executionCoordinator.pauseMission(missionId, reason);
  }

  public async resumeMission(missionId: string): Promise<MissionDescriptor> {
    return this.executionCoordinator.resumeMission(missionId);
  }

  public cancelMission(missionId: string, reason?: string): MissionDescriptor {
    return this.executionCoordinator.cancelMission(missionId, reason);
  }

  public replanMission(missionId: string, reason: string, author?: string): { mission: MissionDescriptor; newVersion: PlanVersion } {
    return this.executionCoordinator.replanMission(missionId, reason, author);
  }

  public async approveTask(missionId: string, taskId: string, approvedBy?: string): Promise<void> {
    return this.executionCoordinator.approveTask(missionId, taskId, approvedBy);
  }

  public getMission(missionId: string): MissionDescriptor | null {
    return this.executionCoordinator.getMission(missionId);
  }

  public listMissions(): MissionDescriptor[] {
    return this.executionCoordinator.listMissions();
  }

  public getOutcomes(missionId: string): MissionOutcome[] {
    return this.executionCoordinator.getOutcomes(missionId);
  }

  public getTasks(missionId: string): MissionTask[] {
    return this.executionCoordinator.getTasks(missionId);
  }

  public getArtifacts(missionId: string): MissionArtifact[] {
    return this.blackboard.getArtifacts(missionId);
  }

  public getBlackboard(missionId: string): BlackboardEntry[] {
    return this.blackboard.getEntries(missionId);
  }

  public getWorkforceCapacities(): AgentWorkforceCapacity[] {
    return this.capacityTracker.getAllCapacities();
  }

  public getMissionReport(missionId: string): MissionReport {
    return this.executionCoordinator.generateMissionReport(missionId);
  }

  public async recoverActiveMissionsOnRestart(): Promise<number> {
    const allMissions = this.repository.listMissions();
    const recoverable = allMissions.filter((m: any) => m.status === 'EXECUTING' || m.status === 'RECOVERING' || m.status === 'DEGRADED');
    let recoveredCount = 0;

    for (const mission of recoverable) {
      const checkpoint = this.checkpointManager.getLatestCheckpoint(mission.missionId);
      if (checkpoint && this.checkpointManager.verifyCheckpointIntegrity(checkpoint)) {
        mission.status = 'RECOVERING';
        this.repository.saveMission(mission);
        this.blackboard.postFact(
          mission.missionId,
          'CheckpointRecovery',
          'Mission Restored from Checkpoint',
          `Restored execution state from verified checkpoint ${checkpoint.checkpointId}`
        );
        recoveredCount++;
      }
    }

    return recoveredCount;
  }

  public close(): void {
    this.repository.close();
  }
}
