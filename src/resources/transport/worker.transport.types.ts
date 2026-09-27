/**
 * HṚṢĪKEŚA (हृषीकेश) — FP-04 Worker Transport Domain Types
 *
 * Dedicated transport definitions, protocol frames, and configuration
 * for secure physical LAN machine-to-machine execution and distributed inference.
 */

import { Worker, WorkerTask, ResourceSnapshot } from '../resource.types.js';

export type TransportMessageType =
  | 'ENROLL'
  | 'ENROLL_ACK'
  | 'AUTH'
  | 'AUTH_ACK'
  | 'HEARTBEAT'
  | 'HEARTBEAT_ACK'
  | 'RESOURCE_UPDATE'
  | 'TASK_SUBMIT'
  | 'TASK_ACCEPTED'
  | 'TASK_PROGRESS'
  | 'TASK_COMPLETED'
  | 'TASK_FAILED'
  | 'TASK_CANCEL'
  | 'TASK_CANCELLED'
  | 'WORKER_DRAIN'
  | 'WORKER_SHUTDOWN'
  | 'PING'
  | 'PONG'
  | 'ERROR';

export interface TransportMessageHeader {
  readonly messageId: string;
  readonly protocolVersion: string;
  readonly timestamp: string;
  readonly type: TransportMessageType;
  readonly workerId: string;
  readonly taskId?: string;
  readonly correlationId?: string;
}

export interface TransportMessage<T = unknown> {
  readonly header: TransportMessageHeader;
  readonly payload: T;
}

// Payload schemas
export interface EnrollPayload {
  readonly enrollmentToken: string;
  readonly workerDescriptor: Worker;
  readonly clientFingerprint: string;
}

export interface EnrollAckPayload {
  readonly success: boolean;
  readonly sessionToken?: string;
  readonly workerId: string;
  readonly heartbeatIntervalMs: number;
  readonly serverFingerprint: string;
  readonly error?: string;
}

export interface AuthPayload {
  readonly workerId: string;
  readonly sessionToken: string;
  readonly clientFingerprint: string;
}

export interface AuthAckPayload {
  readonly success: boolean;
  readonly error?: string;
}

export interface HeartbeatPayload {
  readonly workerId: string;
  readonly loadScore: number;
  readonly timestamp: string;
}

export interface HeartbeatAckPayload {
  readonly serverTime: string;
  readonly rttMs?: number;
}

export interface ResourceUpdatePayload {
  readonly workerId: string;
  readonly snapshot: ResourceSnapshot;
}

export interface TaskSubmitPayload {
  readonly task: WorkerTask;
}

export interface TaskProgressPayload {
  readonly taskId: string;
  readonly progress: number;
  readonly message?: string;
  readonly tokenChunk?: string; // Token chunk for streaming distributed inference
  readonly timestamp: string;
}

export interface TaskCompletedPayload {
  readonly taskId: string;
  readonly outputPayload?: Record<string, unknown>;
  readonly metrics?: {
    readonly durationMs: number;
    readonly ttftMs?: number;
    readonly tokensGenerated?: number;
    readonly tokensPerSecond?: number;
  };
}

export interface TaskFailedPayload {
  readonly taskId: string;
  readonly error: string;
}

export interface TaskCancelPayload {
  readonly taskId: string;
  readonly reason: string;
}

export interface TaskCancelledPayload {
  readonly taskId: string;
}

export type NetworkTier = 'LOCAL' | 'EXCELLENT' | 'GOOD' | 'DEGRADED' | 'POOR';

export interface PingPayload {
  readonly clientTime?: string;
  readonly seq?: number;
}

export interface PongPayload {
  readonly clientTime?: string;
  readonly serverTime: string;
  readonly seq?: number;
}

export interface LanPairingPackage {
  readonly pairingToken: string;
  readonly host: string;
  readonly port: number;
  readonly lanEndpoint: string;
  readonly serverFingerprint: string;
  readonly expiresAt: string;
  readonly cliCommand: string;
  readonly powershellCommand: string;
  readonly bashCommand: string;
}

export interface TransportMetrics {
  readonly totalConnections: number;
  readonly activeConnections: number;
  readonly messagesReceived: number;
  readonly messagesSent: number;
  readonly bytesReceived: number;
  readonly bytesSent: number;
  readonly rejectedConnections: number;
  readonly averagePingRttMs: number;
}

export interface WorkerTransportServerConfig {
  readonly bindHost: string;
  readonly port: number;
  readonly tlsEnabled: boolean;
  readonly keyPem?: string;
  readonly certPem?: string;
  readonly maxPayloadBytes?: number;
  readonly rateLimitPerMinute?: number;
  readonly heartbeatTimeoutMs?: number;
}

export interface WorkerTransportClientConfig {
  readonly serverHost: string;
  readonly serverPort: number;
  readonly tlsEnabled: boolean;
  readonly caPem?: string;
  readonly expectedFingerprint?: string;
  readonly workerId: string;
  readonly workerName: string;
  readonly enrollmentToken?: string;
  readonly sessionToken?: string;
  readonly heartbeatIntervalMs?: number;
  readonly maxReconnectAttempts?: number;
  readonly reconnectBackoffMs?: number;
}
