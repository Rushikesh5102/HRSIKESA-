/**
 * HṚṢĪKEŚA (हृषीकेश) — Chat Latency Telemetry & SLA Metrics
 *
 * Implements measurable latency instrumentation as specified in the First-Response SLA:
 * - request_received_at
 * - routing_started_at
 * - first_response_started_at
 * - first_token_at
 * - first_visible_token_at
 * - model_started_at
 * - model_first_token_at
 * - response_completed_at
 * - background_work_started_at
 * - background_work_completed_at
 *
 * Computes:
 * - TTFB = request_received → first visible response
 * - TTFT = model request → first model token
 * - TOTAL = request_received → final response
 */

export interface LatencySpan {
  readonly name: string;
  readonly startMs: number;
  endMs?: number;
  durationMs?: number;
}

export interface ChatMetricsReport {
  readonly requestId: string;
  readonly requestReceivedAt: string;
  readonly routingStartedAt?: string;
  readonly firstResponseStartedAt?: string;
  readonly firstTokenAt?: string;
  readonly firstVisibleTokenAt?: string;
  readonly modelStartedAt?: string;
  readonly modelFirstTokenAt?: string;
  readonly responseCompletedAt: string;
  readonly backgroundWorkStartedAt?: string;
  readonly backgroundWorkCompletedAt?: string;
  readonly ttfbMs: number;
  readonly ttftMs: number;
  readonly totalDurationMs: number;
  readonly modelDurationMs: number;
  readonly spans: Record<string, number>;
}

export class ChatLatencyTracker {
  private readonly id: string;
  private readonly t0: number;
  private readonly requestReceivedIso: string;

  private routingStartedIso?: string;
  private firstResponseStartedIso?: string;
  private firstTokenIso?: string;
  private firstVisibleTokenIso?: string;
  private modelStartedIso?: string;
  private modelFirstTokenIso?: string;
  private responseCompletedIso?: string;
  private bgWorkStartedIso?: string;
  private bgWorkCompletedIso?: string;

  private tFirstVisible?: number;
  private tModelStart?: number;
  private tModelFirstToken?: number;
  private tResponseCompleted?: number;

  private readonly activeSpans = new Map<string, number>();
  private readonly completedSpans = new Map<string, number>();

  constructor(requestId?: string) {
    this.id = requestId || `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.t0 = Date.now();
    this.requestReceivedIso = new Date(this.t0).toISOString();
  }

  public markRoutingStarted(): void {
    this.routingStartedIso = new Date().toISOString();
  }

  public markFirstVisibleResponse(): void {
    if (!this.tFirstVisible) {
      this.tFirstVisible = Date.now();
      this.firstResponseStartedIso = new Date(this.tFirstVisible).toISOString();
      this.firstVisibleTokenIso = this.firstResponseStartedIso;
    }
  }

  public markModelStarted(): void {
    this.tModelStart = Date.now();
    this.modelStartedIso = new Date(this.tModelStart).toISOString();
  }

  public markModelFirstToken(): void {
    if (!this.tModelFirstToken) {
      this.tModelFirstToken = Date.now();
      this.modelFirstTokenIso = new Date(this.tModelFirstToken).toISOString();
      this.firstTokenIso = this.modelFirstTokenIso;
      this.markFirstVisibleResponse();
    }
  }

  public markBackgroundWorkStarted(): void {
    this.bgWorkStartedIso = new Date().toISOString();
  }

  public markBackgroundWorkCompleted(): void {
    this.bgWorkCompletedIso = new Date().toISOString();
  }

  public startSpan(name: string): void {
    this.activeSpans.set(name, Date.now());
  }

  public endSpan(name: string): number {
    const start = this.activeSpans.get(name);
    if (!start) return 0;
    const dur = Date.now() - start;
    this.completedSpans.set(name, dur);
    this.activeSpans.delete(name);
    return dur;
  }

  public complete(): ChatMetricsReport {
    this.tResponseCompleted = Date.now();
    this.responseCompletedIso = new Date(this.tResponseCompleted).toISOString();

    const totalDurationMs = this.tResponseCompleted - this.t0;
    const ttfbMs = this.tFirstVisible ? this.tFirstVisible - this.t0 : totalDurationMs;
    const ttftMs =
      this.tModelFirstToken && this.tModelStart
        ? this.tModelFirstToken - this.tModelStart
        : this.tModelFirstToken
        ? this.tModelFirstToken - this.t0
        : totalDurationMs;
    const modelDurationMs = this.completedSpans.get('model_inference') || (this.tModelStart ? this.tResponseCompleted - this.tModelStart : 0);

    const spansRecord: Record<string, number> = {};
    for (const [k, v] of this.completedSpans.entries()) {
      spansRecord[k] = v;
    }

    return {
      requestId: this.id,
      requestReceivedAt: this.requestReceivedIso,
      routingStartedAt: this.routingStartedIso,
      firstResponseStartedAt: this.firstResponseStartedIso,
      firstTokenAt: this.firstTokenIso,
      firstVisibleTokenAt: this.firstVisibleTokenIso,
      modelStartedAt: this.modelStartedIso,
      modelFirstTokenAt: this.modelFirstTokenIso,
      responseCompletedAt: this.responseCompletedIso,
      backgroundWorkStartedAt: this.bgWorkStartedIso,
      backgroundWorkCompletedAt: this.bgWorkCompletedIso,
      ttfbMs,
      ttftMs,
      totalDurationMs,
      modelDurationMs,
      spans: spansRecord
    };
  }
}

// In-memory rolling history for diagnostics panel
class GlobalLatencyDiagnostics {
  private readonly reports: ChatMetricsReport[] = [];
  private readonly maxReports = 100;

  public record(report: ChatMetricsReport): void {
    this.reports.push(report);
    if (this.reports.length > this.maxReports) {
      this.reports.shift();
    }
  }

  public getSummary() {
    if (this.reports.length === 0) {
      return {
        sampleCount: 0,
        avgTtfbMs: 0,
        p50TtfbMs: 0,
        p95TtfbMs: 0,
        p99TtfbMs: 0,
        avgTtftMs: 0,
        avgTotalMs: 0,
        recentReports: []
      };
    }

    const ttfbs = this.reports.map((r) => r.ttfbMs).sort((a, b) => a - b);
    const ttfts = this.reports.map((r) => r.ttftMs);
    const totals = this.reports.map((r) => r.totalDurationMs);

    const avg = (arr: number[]) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    const percentile = (arr: number[], p: number) => {
      const idx = Math.min(arr.length - 1, Math.floor(arr.length * p));
      return arr[idx];
    };

    return {
      sampleCount: this.reports.length,
      avgTtfbMs: avg(ttfbs),
      p50TtfbMs: percentile(ttfbs, 0.50),
      p95TtfbMs: percentile(ttfbs, 0.95),
      p99TtfbMs: percentile(ttfbs, 0.99),
      avgTtftMs: avg(ttfts),
      avgTotalMs: avg(totals),
      recentReports: this.reports.slice(-10)
    };
  }
}

export const latencyDiagnostics = new GlobalLatencyDiagnostics();
