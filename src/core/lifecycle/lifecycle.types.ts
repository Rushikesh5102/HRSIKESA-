/**
 * HṚṢĪKEŚA (हृषीकेश) — Lifecycle Subsystem Types
 */

export type LifecycleState =
  | 'STARTING'
  | 'READY'
  | 'DEGRADED'
  | 'STOPPING'
  | 'STOPPED'
  | 'ERROR';

export type LifecycleHook = () => Promise<void> | void;

export interface LifecycleSnapshot {
  readonly state: LifecycleState;
  readonly startedAt: string | null;
  readonly readyAt: string | null;
  readonly uptimeSeconds: number;
  readonly degradationReason: string | null;
  readonly shutdownReason: string | null;
  readonly errorMessage: string | null;
}
