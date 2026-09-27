import React, { useState, useEffect, useCallback } from 'react';
import {
  Server,
  Cpu,
  Zap,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Play,
  Pause,
  RotateCcw,
  Ban,
  CheckCircle,
  AlertTriangle,
  Clock,
  Layers,
  Activity,
  ChevronRight,
  Database,
  Cloud,
  HardDrive,
  Eye,
  ArrowRight,
  Radio,
  FileCheck,
  Lock,
} from 'lucide-react';
import { api } from '../services/api';

interface ExecutionWorkerUI {
  workerId: string;
  runtimeId: string;
  name: string;
  status: string;
  trustLevel: string;
  health: {
    isHealthy: boolean;
    consecutiveHeartbeats: number;
    missedHeartbeats: number;
    errorRate: number;
    lastError?: string;
  };
  resources: {
    cpuCores: number;
    memoryMb: number;
    gpuModel?: string;
    vramMb?: number;
    diskAvailableMb: number;
    cpuLoadPercent: number;
    memoryUsedPercent: number;
  };
  capabilities: string[];
  installedSoftware: string[];
  availableModels: string[];
  currentWorkload: number;
  maxConcurrency: number;
  drainState: boolean;
  version: string;
  lastSeen: string;
}

interface ExecutionJobUI {
  jobId: string;
  title: string;
  state: string;
  assignedWorkerId?: string;
  runtimeType: string;
  fencingToken: number;
  priority: number;
  progressPercent: number;
  retryCount: number;
  maxRetries: number;
  scope: string;
  companyId?: string;
  projectId?: string;
  missionId?: string;
  goalId?: string;
  agentId?: string;
  currentStep?: string;
  completedActions: string[];
  pendingActions: string[];
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
}

interface OperationsSummaryUI {
  totalJobs: number;
  activeJobs: number;
  queuedJobs: number;
  recoveringJobs: number;
  failedJobs: number;
  completedJobs: number;
  totalWorkers: number;
  onlineWorkers: number;
  drainingWorkers: number;
  degradedWorkers: number;
  offlineWorkers: number;
  hasPersistentWorker24x7: boolean;
  pools: {
    LOCAL: { workers: number; capacity: number; activeJobs: number };
    LAN: { workers: number; capacity: number; activeJobs: number };
    REMOTE: { workers: number; capacity: number; activeJobs: number };
    CLOUD: { workers: number; capacity: number; activeJobs: number };
  };
  estimatedTotalCostUsd: number;
  cloudProviders: {
    provider: string;
    state: string;
    quotaStatus: string;
  }[];
  timestamp: string;
}

export const PersistentOperationsView: React.FC = () => {
  const [summary, setSummary] = useState<OperationsSummaryUI | null>(null);
  const [workers, setWorkers] = useState<ExecutionWorkerUI[]>([]);
  const [jobs, setJobs] = useState<ExecutionJobUI[]>([]);
  const [selectedJob, setSelectedJob] = useState<ExecutionJobUI | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<ExecutionWorkerUI | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const [sumRes, wrkRes, jobRes] = await Promise.all([
        api.getExecutionSummary(),
        api.getExecutionWorkers(),
        api.getExecutionJobs(),
      ]);
      setSummary(sumRes);
      setWorkers(wrkRes.workers || []);
      setJobs(jobRes.jobs || []);
    } catch {
      // Fallback data if server returns default or offline
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 6000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handlePauseJob = async (jobId: string) => {
    try {
      await api.pauseExecutionJob(jobId);
      setActionMessage(`Job ${jobId.slice(0, 8)} paused.`);
      fetchStatus();
    } catch (e: any) {
      setActionMessage(`Failed to pause: ${e?.message || e}`);
    }
  };

  const handleResumeJob = async (jobId: string) => {
    try {
      await api.resumeExecutionJob(jobId);
      setActionMessage(`Job ${jobId.slice(0, 8)} resumed.`);
      fetchStatus();
    } catch (e: any) {
      setActionMessage(`Failed to resume: ${e?.message || e}`);
    }
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      await api.cancelExecutionJob(jobId);
      setActionMessage(`Job ${jobId.slice(0, 8)} cancelled.`);
      fetchStatus();
    } catch (e: any) {
      setActionMessage(`Failed to cancel: ${e?.message || e}`);
    }
  };

  const handleDrainWorker = async (workerId: string) => {
    try {
      await api.drainExecutionWorker(workerId);
      setActionMessage(`Worker ${workerId.slice(0, 8)} drain state toggled.`);
      fetchStatus();
    } catch (e: any) {
      setActionMessage(`Failed to toggle drain: ${e?.message || e}`);
    }
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Server size={26} color="var(--accent-gold, #f59e0b)" />
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>
              Persistent Operations & Distributed Execution Fabric
            </h1>
          </div>
          <p style={{ margin: '6px 0 0 0', color: 'var(--text-secondary, #94a3b8)', fontSize: '14px' }}>
            FP-19 Durable 24/7 Substrate: Local, LAN, Remote & Cloud Execution with Checkpoint, Fencing, & Zero-Split-Brain Leases
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* 24/7 Invariant Indicator */}
          <div
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: summary?.hasPersistentWorker24x7 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
              color: summary?.hasPersistentWorker24x7 ? '#22c55e' : '#eab308',
              border: `1px solid ${summary?.hasPersistentWorker24x7 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
            }}
          >
            <Radio size={14} className={summary?.hasPersistentWorker24x7 ? 'animate-pulse' : ''} />
            {summary?.hasPersistentWorker24x7 ? '24/7 Capable (Persistent Remote Active)' : 'Local Host Only (Halts on Sleep)'}
          </div>

          <button
            onClick={fetchStatus}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-card, #1e293b)',
              color: 'var(--text-primary, #f8fafc)',
              border: '1px solid var(--border-color, #334155)',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {actionMessage && (
        <div
          style={{
            padding: '10px 16px',
            borderRadius: '6px',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            color: '#60a5fa',
            fontSize: '13px',
          }}
        >
          {actionMessage}
        </div>
      )}

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
        <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-card, #1e293b)', border: '1px solid var(--border-color, #334155)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', textTransform: 'uppercase' }}>Active Workers</div>
          <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: '#38bdf8' }}>{summary?.onlineWorkers ?? 0} / {summary?.totalWorkers ?? 0}</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{summary?.drainingWorkers ?? 0} draining</div>
        </div>

        <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-card, #1e293b)', border: '1px solid var(--border-color, #334155)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', textTransform: 'uppercase' }}>Running Jobs</div>
          <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: '#22c55e' }}>{summary?.activeJobs ?? 0}</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Active leases</div>
        </div>

        <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-card, #1e293b)', border: '1px solid var(--border-color, #334155)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', textTransform: 'uppercase' }}>Queued Jobs</div>
          <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: '#eab308' }}>{summary?.queuedJobs ?? 0}</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Awaiting worker</div>
        </div>

        <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-card, #1e293b)', border: '1px solid var(--border-color, #334155)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', textTransform: 'uppercase' }}>Recovering / Failed</div>
          <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: summary?.failedJobs ? '#ef4444' : '#a855f7' }}>
            {summary?.recoveringJobs ?? 0} / {summary?.failedJobs ?? 0}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Self-healing</div>
        </div>

        <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-card, #1e293b)', border: '1px solid var(--border-color, #334155)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', textTransform: 'uppercase' }}>Estimated Cost</div>
          <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: '#f59e0b' }}>${(summary?.estimatedTotalCostUsd ?? 0).toFixed(4)}</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Gated approval policy</div>
        </div>
      </div>

      {/* Runtime Pools Load Bar */}
      <div style={{ padding: '20px', borderRadius: '10px', backgroundColor: 'var(--bg-card, #1e293b)', border: '1px solid var(--border-color, #334155)' }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={18} color="var(--accent-gold, #f59e0b)" />
          Execution Pools (Placement Hierarchy)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {(['LOCAL', 'LAN', 'REMOTE', 'CLOUD'] as const).map((poolKey) => {
            const p = summary?.pools?.[poolKey] || { workers: 0, capacity: 0, activeJobs: 0 };
            const loadPercent = p.capacity > 0 ? Math.min(100, Math.round((p.activeJobs / p.capacity) * 100)) : 0;
            return (
              <div key={poolKey} style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
                  <span>{poolKey} POOL</span>
                  <span style={{ color: p.workers > 0 ? '#22c55e' : '#64748b' }}>{p.workers} online</span>
                </div>
                <div style={{ height: '6px', borderRadius: '3px', backgroundColor: '#334155', marginTop: '8px', overflow: 'hidden' }}>
                  <div style={{ width: `${loadPercent}%`, height: '100%', backgroundColor: loadPercent > 80 ? '#ef4444' : loadPercent > 50 ? '#f59e0b' : '#38bdf8' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
                  <span>Load: {p.activeJobs} / {p.capacity} slots</span>
                  <span>{loadPercent}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Workers & Jobs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Workers List */}
        <div style={{ padding: '20px', borderRadius: '10px', backgroundColor: 'var(--bg-card, #1e293b)', border: '1px solid var(--border-color, #334155)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={18} color="#38bdf8" />
              Registered Workers ({workers.length})
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
            {workers.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                No workers enrolled. Local host registers on demand.
              </div>
            ) : (
              workers.map((w) => (
                <div
                  key={w.workerId}
                  onClick={() => setSelectedWorker(w)}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${selectedWorker?.workerId === w.workerId ? 'var(--accent-gold, #f59e0b)' : '#334155'}`,
                    backgroundColor: 'rgba(0,0,0,0.15)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>{w.name}</span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: w.status === 'ONLINE' ? 'rgba(34,197,94,0.15)' : w.status === 'BUSY' ? 'rgba(56,189,248,0.15)' : 'rgba(239,68,68,0.15)',
                        color: w.status === 'ONLINE' ? '#22c55e' : w.status === 'BUSY' ? '#38bdf8' : '#ef4444',
                      }}
                    >
                      {w.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', gap: '12px' }}>
                    <span>Load: {w.currentWorkload}/{w.maxConcurrency}</span>
                    <span>CPU: {w.resources.cpuLoadPercent}%</span>
                    <span>RAM: {w.resources.memoryUsedPercent}%</span>
                    <span>Trust: {w.trustLevel}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDrainWorker(w.workerId);
                      }}
                      style={{
                        padding: '3px 8px',
                        fontSize: '11px',
                        borderRadius: '4px',
                        backgroundColor: w.drainState ? 'rgba(234,179,8,0.2)' : 'rgba(100,116,139,0.2)',
                        color: w.drainState ? '#eab308' : '#cbd5e1',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {w.drainState ? 'Resume Ingestion' : 'Drain Worker'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Jobs List */}
        <div style={{ padding: '20px', borderRadius: '10px', backgroundColor: 'var(--bg-card, #1e293b)', border: '1px solid var(--border-color, #334155)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} color="#22c55e" />
              Persistent Jobs ({jobs.length})
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
            {jobs.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                No active jobs. Submit work via CLI, Chat, or Workflows.
              </div>
            ) : (
              jobs.map((j) => (
                <div
                  key={j.jobId}
                  onClick={() => setSelectedJob(j)}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${selectedJob?.jobId === j.jobId ? 'var(--accent-gold, #f59e0b)' : '#334155'}`,
                    backgroundColor: 'rgba(0,0,0,0.15)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>{j.title}</span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor:
                          j.state === 'RUNNING'
                            ? 'rgba(34,197,94,0.15)'
                            : j.state === 'QUEUED'
                            ? 'rgba(234,179,8,0.15)'
                            : j.state === 'COMPLETED'
                            ? 'rgba(56,189,248,0.15)'
                            : 'rgba(239,68,68,0.15)',
                        color:
                          j.state === 'RUNNING'
                            ? '#22c55e'
                            : j.state === 'QUEUED'
                            ? '#eab308'
                            : j.state === 'COMPLETED'
                            ? '#38bdf8'
                            : '#ef4444',
                      }}
                    >
                      {j.state}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <span>Runtime: {j.runtimeType}</span>
                    <span>Progress: {j.progressPercent}%</span>
                    <span>Retries: {j.retryCount}/{j.maxRetries}</span>
                    <span>Fencing: #{j.fencingToken}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    {j.state === 'RUNNING' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePauseJob(j.jobId);
                        }}
                        style={{
                          padding: '3px 8px',
                          fontSize: '11px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(234,179,8,0.2)',
                          color: '#eab308',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Pause
                      </button>
                    )}
                    {j.state === 'PAUSED' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResumeJob(j.jobId);
                        }}
                        style={{
                          padding: '3px 8px',
                          fontSize: '11px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(34,197,94,0.2)',
                          color: '#22c55e',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Resume
                      </button>
                    )}
                    {['RUNNING', 'QUEUED', 'PAUSED'].includes(j.state) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelJob(j.jobId);
                        }}
                        style={{
                          padding: '3px 8px',
                          fontSize: '11px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(239,68,68,0.2)',
                          color: '#ef4444',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Inspector Drawers */}
      {selectedJob && (
        <div
          style={{
            padding: '20px',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-card, #1e293b)',
            border: '1px solid var(--accent-gold, #f59e0b)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Eye size={18} color="var(--accent-gold, #f59e0b)" />
              Job Inspector: {selectedJob.title} ({selectedJob.jobId})
            </h3>
            <button
              onClick={() => setSelectedJob(null)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px' }}
            >
              ✕ Close
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', fontSize: '13px' }}>
            <div><strong>State:</strong> {selectedJob.state}</div>
            <div><strong>Assigned Worker:</strong> {selectedJob.assignedWorkerId || 'Unassigned'}</div>
            <div><strong>Runtime:</strong> {selectedJob.runtimeType}</div>
            <div><strong>Fencing Generation:</strong> #{selectedJob.fencingToken}</div>
            <div><strong>Scope:</strong> {selectedJob.scope}</div>
            <div><strong>Company:</strong> {selectedJob.companyId || 'N/A'}</div>
            <div><strong>Project:</strong> {selectedJob.projectId || 'N/A'}</div>
            <div><strong>Current Step:</strong> {selectedJob.currentStep || 'Init'}</div>
            <div><strong>Completed Actions:</strong> {selectedJob.completedActions.length}</div>
            <div><strong>Pending Actions:</strong> {selectedJob.pendingActions.length}</div>
            <div><strong>Created:</strong> {new Date(selectedJob.createdAt).toLocaleString()}</div>
            <div><strong>Updated:</strong> {new Date(selectedJob.updatedAt).toLocaleString()}</div>
          </div>
          {selectedJob.errorMessage && (
            <div style={{ marginTop: '12px', padding: '10px', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '6px', fontSize: '12px' }}>
              <strong>Error:</strong> {selectedJob.errorMessage}
            </div>
          )}
        </div>
      )}

      {selectedWorker && (
        <div
          style={{
            padding: '20px',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-card, #1e293b)',
            border: '1px solid #38bdf8',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={18} color="#38bdf8" />
              Worker Inspector: {selectedWorker.name} ({selectedWorker.workerId})
            </h3>
            <button
              onClick={() => setSelectedWorker(null)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px' }}
            >
              ✕ Close
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', fontSize: '13px' }}>
            <div><strong>Runtime ID:</strong> {selectedWorker.runtimeId}</div>
            <div><strong>Status:</strong> {selectedWorker.status}</div>
            <div><strong>Trust Level:</strong> {selectedWorker.trustLevel}</div>
            <div><strong>CPU Cores:</strong> {selectedWorker.resources.cpuCores}</div>
            <div><strong>RAM Total:</strong> {selectedWorker.resources.memoryMb} MB</div>
            <div><strong>GPU:</strong> {selectedWorker.resources.gpuModel || 'None / Integrated'}</div>
            <div><strong>Disk Available:</strong> {selectedWorker.resources.diskAvailableMb} MB</div>
            <div><strong>Concurrency:</strong> {selectedWorker.currentWorkload} / {selectedWorker.maxConcurrency}</div>
            <div><strong>Version:</strong> {selectedWorker.version}</div>
            <div><strong>Last Heartbeat:</strong> {new Date(selectedWorker.lastSeen).toLocaleString()}</div>
          </div>
          <div style={{ marginTop: '12px', fontSize: '12px', color: '#94a3b8' }}>
            <strong>Capabilities:</strong> {selectedWorker.capabilities.join(', ') || 'general'}
          </div>
        </div>
      )}
    </div>
  );
};
