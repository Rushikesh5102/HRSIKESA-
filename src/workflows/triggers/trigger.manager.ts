/**
 * HṚṢĪKEŚA (हृषीकेश) — Workflow Trigger Manager
 *
 * FP-11: Integrates event-driven triggers via EventBus, scheduled triggers via PersistentScheduler,
 * and webhooks via WorkflowWebhookManager.
 */

import crypto from 'node:crypto';
import { EventBus } from '../../core/events/event-bus.js';
import { ILogger } from '../../core/logging/logger.types.js';
import { PersistentScheduler } from '../../scheduling/persistent.scheduler.js';
import { WorkflowRepository } from '../repository/workflow.repository.js';
import { WorkflowExecutionEngine } from '../execution/workflow.execution.engine.js';
import { WorkflowWebhookManager } from './webhook.manager.js';
import { SafeExpressionEvaluator } from '../compiler/expression.evaluator.js';
import { WorkflowTrigger, WorkflowSchedule, WorkflowVersion } from '../types/workflow.types.js';

export class WorkflowTriggerManager {
  private readonly repo: WorkflowRepository;
  private readonly executionEngine: WorkflowExecutionEngine;
  private readonly eventBus?: EventBus;
  private readonly scheduler?: PersistentScheduler;
  private readonly webhookManager: WorkflowWebhookManager;
  private readonly logger?: ILogger;
  private readonly eventSubscriptions: Array<{ eventPattern: string; handler: (data: any) => void }> = [];

  constructor(options: {
    repo: WorkflowRepository;
    executionEngine: WorkflowExecutionEngine;
    eventBus?: EventBus;
    scheduler?: PersistentScheduler;
    webhookManager?: WorkflowWebhookManager;
    logger?: ILogger;
  }) {
    this.repo = options.repo;
    this.executionEngine = options.executionEngine;
    this.eventBus = options.eventBus;
    this.scheduler = options.scheduler;
    this.webhookManager = options.webhookManager || new WorkflowWebhookManager(this.repo, options.logger);
    this.logger = options.logger?.child('WorkflowTriggerManager');

    this.registerSchedulerHandler();
  }

  public getWebhookManager(): WorkflowWebhookManager {
    return this.webhookManager;
  }

  /**
   * Initializes event listeners by reading triggers from all ACTIVE workflows.
   */
  public initializeTriggers(): void {
    const activeWorkflows = this.repo.listWorkflows({ status: 'ACTIVE' });
    for (const wf of activeWorkflows) {
      const version = this.repo.getVersion(wf.id, wf.activeVersion);
      if (!version) continue;

      for (const trigger of version.triggers || []) {
        if (!trigger.enabled) continue;

        if (trigger.type === 'EVENT' || trigger.type.endsWith('_EVENT') || trigger.type.endsWith('_COMPLETED')) {
          this.subscribeEventTrigger(wf.id, trigger);
        } else if (trigger.type === 'SCHEDULE' || trigger.type === 'CRON' || trigger.type === 'INTERVAL') {
          this.registerScheduledTrigger(wf.id, trigger);
        }
      }
    }
    this.logger?.info(`Initialized workflow triggers for ${activeWorkflows.length} active workflows.`);
  }

  /**
   * Registers all triggers for a specific workflow version.
   */
  public registerTriggers(workflowId: string, version: WorkflowVersion): void {
    for (const trigger of version.triggers || []) {
      if (trigger.enabled === false) continue;
      if (trigger.type === 'EVENT' || trigger.type.endsWith('_EVENT') || trigger.type.endsWith('_COMPLETED')) {
        this.subscribeEventTrigger(workflowId, trigger);
      } else if (trigger.type === 'SCHEDULE' || trigger.type === 'CRON' || trigger.type === 'INTERVAL') {
        this.registerScheduledTrigger(workflowId, trigger);
      }
    }
  }

  /**
   * Subscribes an active workflow to EventBus events.
   */
  public subscribeEventTrigger(workflowId: string, trigger: WorkflowTrigger): void {
    if (!this.eventBus) return;

    const pattern = trigger.config.eventPattern || this.getDefaultEventForTriggerType(trigger.type);
    if (!pattern) return;

    const handler = async (eventData: any) => {
      try {
        const wf = this.repo.getWorkflow(workflowId);
        if (!wf || wf.status !== 'ACTIVE') return;

        // Filter condition if defined
        if (trigger.config.filterCondition) {
          const passes = SafeExpressionEvaluator.evaluateCondition(trigger.config.filterCondition, eventData);
          if (!passes) return;
        }

        this.logger?.info(`Triggering workflow '${workflowId}' from event '${pattern}'`);
        await this.executionEngine.startRun({
          workflowId,
          triggerType: trigger.type,
          triggerPayload: eventData || {},
        });
      } catch (err) {
        this.logger?.error(`Error triggering workflow '${workflowId}' from event '${pattern}':`, { error: String(err) });
      }
    };

    this.eventBus.on(pattern as any, handler);
    this.eventSubscriptions.push({ eventPattern: pattern, handler });
  }

  /**
   * Registers a scheduled workflow with PersistentScheduler.
   */
  public registerScheduledTrigger(workflowId: string, trigger: WorkflowTrigger): void {
    const scheduleId = `sched_${crypto.randomUUID().slice(0, 8)}`;
    const scheduleType = trigger.type === 'CRON' ? 'cron' : trigger.type === 'INTERVAL' ? 'interval' : 'fixed';

    const schedule: WorkflowSchedule = {
      id: scheduleId,
      workflowId,
      triggerId: trigger.id,
      scheduleType,
      cronExpression: trigger.config.cronExpression,
      intervalSeconds: trigger.config.intervalSeconds || 3600,
      enabled: true,
      nextRunAt: new Date(Date.now() + (trigger.config.intervalSeconds || 3600) * 1000).toISOString(),
    };
    this.repo.saveSchedule(schedule);

    if (this.scheduler) {
      this.scheduler.schedule({
        name: `WorkflowSchedule_${workflowId}`,
        targetId: workflowId,
        targetType: 'workflow',
        scheduleType: scheduleType === 'fixed' ? 'interval' : (scheduleType as any),
        cronExpression: trigger.config.cronExpression,
        intervalMs: (trigger.config.intervalSeconds || 3600) * 1000,
        metadata: { triggerId: trigger.id, triggerType: trigger.type, scheduleId },
      });
    }
  }

  /**
   * Handles incoming webhook execution.
   */
  public async handleWebhook(
    webhookPath: string,
    rawPayload: string | Buffer,
    headers: Record<string, string | string[] | undefined>
  ): Promise<{ success: boolean; runId?: string; error?: string }> {
    const verification = this.webhookManager.verifyAndProcess(webhookPath, rawPayload, headers);
    if (!verification.valid || !verification.workflowId) {
      return { success: false, error: verification.error || 'Webhook verification failed' };
    }

    let parsedPayload: Record<string, any> = {};
    try {
      const payloadStr = Buffer.isBuffer(rawPayload) ? rawPayload.toString('utf8') : rawPayload;
      parsedPayload = JSON.parse(payloadStr);
    } catch {
      parsedPayload = { raw: String(rawPayload) };
    }

    try {
      const run = await this.executionEngine.startRun({
        workflowId: verification.workflowId,
        triggerType: 'WEBHOOK',
        triggerPayload: parsedPayload,
      });
      return { success: true, runId: run.id };
    } catch (err: any) {
      return { success: false, error: String(err?.message || err) };
    }
  }

  private registerSchedulerHandler(): void {
    if (!this.scheduler) return;
    this.scheduler.registerHandler('workflow', async (scheduleItem) => {
      try {
        const workflowId = scheduleItem.targetId;
        const wf = this.repo.getWorkflow(workflowId);
        if (!wf || wf.status !== 'ACTIVE') return;

        this.logger?.info(`Scheduler firing workflow '${workflowId}'`);
        await this.executionEngine.startRun({
          workflowId,
          triggerType: 'SCHEDULE',
          triggerPayload: scheduleItem.metadata || {},
        });
      } catch (err) {
        this.logger?.error(`Failed to execute scheduled workflow '${scheduleItem.targetId}':`, { error: String(err) });
      }
    });
  }

  private getDefaultEventForTriggerType(type: string): string | undefined {
    switch (type) {
      case 'TASK_COMPLETED': return 'engineering.task.completed';
      case 'MISSION_COMPLETED': return 'mission.completed';
      case 'GOAL_COMPLETED': return 'goal.completed';
      case 'RESEARCH_COMPLETED': return 'research.completed';
      case 'GITHUB_EVENT': return 'github.event';
      case 'COMPANY_EVENT': return 'company.event';
      default: return undefined;
    }
  }
}
