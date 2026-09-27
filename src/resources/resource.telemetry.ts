/**
 * HṚṢĪKEŚA (हृषीकेश) — Resource Fabric Telemetry & Execution Spans
 *
 * FP-03: Foundation Performance & Execution Block
 * Distributed Local/LAN Resource Fabric & Execution Capacity
 */

export interface TaskExecutionSpan {
  readonly taskId: string;
  readonly taskType: string;
  readonly workerId: string;
  readonly workerType: string;
  readonly priority: number;
  readonly privacyLevel: string;
  readonly queueDurationMs: number;
  readonly placementDurationMs: number;
  readonly dispatchDurationMs: number;
  readonly executionDurationMs: number;
  readonly totalWallDurationMs: number;
  readonly success: boolean;
  readonly error?: string;
  readonly timestamp: string;
}

export interface ResourceTelemetrySummary {
  readonly totalTasksExecuted: number;
  readonly successRatePercent: number;
  readonly avgPlacementLatencyMs: number;
  readonly avgExecutionDurationMs: number;
  readonly totalWorkersTracked: number;
  readonly activeTasks: number;
  readonly spans: readonly TaskExecutionSpan[];
}

export class ResourceTelemetryTracker {
  private readonly spans: TaskExecutionSpan[] = [];
  private readonly maxSpans = 200;

  public recordSpan(span: TaskExecutionSpan): void {
    this.spans.unshift(span);
    if (this.spans.length > this.maxSpans) {
      this.spans.pop();
    }
  }

  public getSummary(): ResourceTelemetrySummary {
    if (this.spans.length === 0) {
      return {
        totalTasksExecuted: 0,
        successRatePercent: 100,
        avgPlacementLatencyMs: 0,
        avgExecutionDurationMs: 0,
        totalWorkersTracked: 0,
        activeTasks: 0,
        spans: [],
      };
    }

    const successful = this.spans.filter(s => s.success).length;
    const totalPlacementMs = this.spans.reduce((acc, s) => acc + s.placementDurationMs, 0);
    const totalExecMs = this.spans.reduce((acc, s) => acc + s.executionDurationMs, 0);
    const workers = new Set(this.spans.map(s => s.workerId));

    return {
      totalTasksExecuted: this.spans.length,
      successRatePercent: Math.round((successful / this.spans.length) * 100),
      avgPlacementLatencyMs: Math.round(totalPlacementMs / this.spans.length),
      avgExecutionDurationMs: Math.round(totalExecMs / this.spans.length),
      totalWorkersTracked: workers.size,
      activeTasks: 0,
      spans: [...this.spans],
    };
  }
}
