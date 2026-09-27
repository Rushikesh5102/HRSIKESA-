import React, { useState, useEffect, useCallback } from 'react';
import {
  Server,
  Cpu,
  HardDrive,
  Zap,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Plus,
  Play,
  RotateCcw,
  Ban,
  CheckCircle,
  AlertTriangle,
  Clock,
  Layers,
  Terminal,
  Activity,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react';
import {
  WorkerInfo,
  WorkerTaskInfo,
  ResourceSnapshotInfo,
  ResourceFabricOverview,
  EnrollmentTokenResponse,
} from '../types/api.types';
import { api } from '../services/api';

export const WorkersView: React.FC = () => {
  const [overview, setOverview] = useState<ResourceFabricOverview | null>(null);
  const [workers, setWorkers] = useState<WorkerInfo[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<WorkerInfo | null>(null);
  const [snapshots, setSnapshots] = useState<ResourceSnapshotInfo[]>([]);
  const [workerTasks, setWorkerTasks] = useState<WorkerTaskInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pairing Modal State
  const [showPairModal, setShowPairModal] = useState(false);
  const [pairNodeName, setPairNodeName] = useState('lan-gpu-node-01');
  const [pairResult, setPairResult] = useState<EnrollmentTokenResponse | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // Test Compute Modal State
  const [showTestModal, setShowTestModal] = useState(false);
  const [testTaskType, setTestTaskType] = useState('resource.fabric.test');
  const [testIterations, setTestIterations] = useState(50000);
  const [testingProgress, setTestingProgress] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [testRunning, setTestRunning] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, wList] = await Promise.all([
        api.getFabricOverview().catch(() => null),
        api.getWorkers().catch(() => ({ workers: [], total: 0 })),
      ]);
      if (ov) setOverview(ov);
      setWorkers(wList.workers || []);
      if (wList.workers && wList.workers.length > 0 && !selectedWorker) {
        setSelectedWorker(wList.workers[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load resource fabric data');
    } finally {
      setLoading(false);
    }
  }, [selectedWorker]);

  const loadWorkerDetail = useCallback(async (workerId: string) => {
    try {
      const detail = await api.getWorker(workerId);
      setSnapshots(detail.latestSnapshots || []);
      setWorkerTasks(detail.recentTasks || []);
    } catch {
      // Fallback
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    if (selectedWorker) {
      loadWorkerDetail(selectedWorker.id);
    }
  }, [selectedWorker, loadWorkerDetail]);

  const handlePairWorker = async () => {
    try {
      const res = await api.pairWorker(pairNodeName, 600);
      setPairResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to generate enrollment token');
    }
  };

  const handleDrain = async (workerId: string) => {
    try {
      await api.drainWorker(workerId);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleResume = async (workerId: string) => {
    try {
      await api.resumeWorker(workerId);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRevoke = async (workerId: string) => {
    if (!window.confirm(`Revoke trust for worker '${workerId}'? It will no longer receive workloads.`)) return;
    try {
      await api.revokeWorker(workerId);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRunComputeTest = async () => {
    if (!selectedWorker) return;
    setTestRunning(true);
    setTestingProgress(0.1);
    setTestResult(null);

    try {
      const start = Date.now();
      const res = await api.submitWorkerTask({
        taskType: testTaskType,
        priority: 80,
        privacyLevel: selectedWorker.type === 'LOCAL' ? 'SOVEREIGN_LOCAL' : 'PRIVATE',
        preferredWorkerId: selectedWorker.id,
        inputPayload: { iterations: testIterations },
      });
      const durationMs = Date.now() - start;
      setTestingProgress(1.0);
      setTestResult({
        ...res,
        measuredDurationMs: durationMs,
      });
      await loadData();
      await loadWorkerDetail(selectedWorker.id);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTestRunning(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 MB';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  };

  return (
    <div className="view-container" style={{ padding: '24px', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Server className="icon-gold" size={28} />
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Distributed Resource Fabric
            </h1>
            <span
              style={{
                fontSize: '0.75rem',
                padding: '3px 8px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                fontWeight: 600,
              }}
            >
              FP-05 MULTI-WORKER FABRIC
            </span>
          </div>
          <p style={{ margin: '6px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Heterogeneous local & LAN compute nodes executing authorized workloads under unified control plane governance.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={loadData}
            disabled={loading}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            Refresh
          </button>

          <button
            onClick={() => {
              setPairResult(null);
              setShowPairModal(true);
            }}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #10b981, #059669)' }}
          >
            <Plus size={16} />
            Pair LAN Node
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#ef4444', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Top Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <span>TOTAL NODES</span>
            <Server size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '8px 0 4px 0', color: 'var(--text-primary)' }}>
            {overview?.totalWorkers ?? workers.length}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#10b981' }}>
            {overview?.onlineWorkers ?? workers.filter(w => w.status === 'ONLINE' || w.status === 'BUSY').length} Online / Ready
          </div>
        </div>

        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <span>COMPUTE CORES</span>
            <Cpu size={18} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '8px 0 4px 0', color: 'var(--text-primary)' }}>
            {overview?.totalCores ?? 14}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Physical execution cores across nodes
          </div>
        </div>

        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <span>MEMORY CAPACITY</span>
            <HardDrive size={18} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '8px 0 4px 0', color: 'var(--text-primary)' }}>
            {formatBytes(overview?.totalRamBytes)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {formatBytes(overview?.usedRamBytes)} in active use
          </div>
        </div>

        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <span>ACTIVE WORKLOADS</span>
            <Activity size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '8px 0 4px 0', color: 'var(--text-primary)' }}>
            {overview?.activeTasksCount ?? 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Queue depth: {overview?.queueDepth ?? 0}
          </div>
        </div>
      </div>

      {/* Main Grid: Left Node List, Right Node Details */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) minmax(400px, 1.3fr)', gap: '20px' }}>
        {/* Workers List */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Execution Nodes</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{workers.length} nodes registered</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {workers.map((w) => {
              const isSelected = selectedWorker?.id === w.id;
              const isOnline = w.status === 'ONLINE';
              const isBusy = w.status === 'BUSY';
              const isDraining = w.status === 'DRAINING';

              return (
                <div
                  key={w.id}
                  onClick={() => setSelectedWorker(w)}
                  className={`card ${isSelected ? 'active-border' : ''}`}
                  style={{
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: isSelected ? '1px solid var(--accent-gold)' : '1px solid var(--border-color)',
                    background: isSelected ? 'var(--card-bg-hover)' : 'var(--card-bg)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>
                          {w.name}
                        </span>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: w.type === 'LOCAL' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                            color: w.type === 'LOCAL' ? '#60a5fa' : '#a78bfa',
                            fontWeight: 600,
                          }}
                        >
                          {w.type}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {w.host} {w.port ? `:${w.port}` : ''} • {w.platform} ({w.architecture})
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: isOnline ? '#10b981' : isBusy ? '#f59e0b' : isDraining ? '#ec4899' : '#6b7280',
                        }}
                      />
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: isOnline ? '#10b981' : isBusy ? '#f59e0b' : isDraining ? '#ec4899' : '#6b7280',
                        }}
                      >
                        {w.status}
                      </span>
                    </div>
                  </div>

                  {/* Hardware Quick Info */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '0.75rem', padding: '8px', background: 'rgba(0,0,0,0.15)', borderRadius: '6px' }}>
                    <div>
                      <div style={{ color: 'var(--text-secondary)' }}>CPU</div>
                      <div style={{ fontWeight: 600 }}>{w.cpu.physicalCores} Cores</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-secondary)' }}>RAM Free</div>
                      <div style={{ fontWeight: 600 }}>{formatBytes(w.memory.freeBytes)}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-secondary)' }}>GPU</div>
                      <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {w.gpu.name || 'None'}
                      </div>
                    </div>
                  </div>

                  {/* Badges */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                    <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                      {w.capabilities.length} capabilities
                    </span>
                    {w.gpuBackend && (
                      <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '4px', color: '#10b981' }}>
                        {w.gpuBackend}
                      </span>
                    )}
                    <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '4px', color: '#f59e0b' }}>
                      Trust: {w.trustLevel}
                    </span>
                  </div>
                </div>
              );
            })}

            {workers.length === 0 && (
              <div className="card" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No execution nodes currently discovered or registered.
              </div>
            )}
          </div>
        </div>

        {/* Selected Worker Detail Drawer */}
        {selectedWorker ? (
          <div>
            <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>{selectedWorker.name}</h2>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 600 }}>
                      {selectedWorker.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Node ID: <code style={{ color: 'var(--accent-gold)' }}>{selectedWorker.id}</code>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setShowTestModal(true)}
                    className="btn-primary"
                    style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Play size={14} />
                    Test Compute
                  </button>

                  {selectedWorker.status === 'DRAINING' ? (
                    <button
                      onClick={() => handleResume(selectedWorker.id)}
                      className="btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                    >
                      <RotateCcw size={14} /> Resume
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDrain(selectedWorker.id)}
                      className="btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                    >
                      Drain
                    </button>
                  )}

                  {selectedWorker.type !== 'LOCAL' && (
                    <button
                      onClick={() => handleRevoke(selectedWorker.id)}
                      className="btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '6px 10px', color: '#ef4444' }}
                    >
                      <Ban size={14} /> Revoke
                    </button>
                  )}
                </div>
              </div>

              {/* Hardware Detail Tabs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    <Cpu size={16} color="#60a5fa" />
                    <span>CPU Architecture</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '4px' }}>
                    {selectedWorker.cpu.model}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {selectedWorker.cpu.physicalCores} Cores / {selectedWorker.cpu.logicalProcessors} Threads
                  </div>
                </div>

                <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    <HardDrive size={16} color="#a78bfa" />
                    <span>RAM & Memory</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '4px' }}>
                    {formatBytes(selectedWorker.memory.freeBytes)} Free
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Total: {formatBytes(selectedWorker.memory.totalBytes)}
                  </div>
                </div>

                <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    <Zap size={16} color="#f59e0b" />
                    <span>GPU & Accelerator</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '4px' }}>
                    {selectedWorker.gpu.name || 'CPU Only'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#10b981' }}>
                    Backend: {selectedWorker.gpuBackend || 'None'}
                  </div>
                </div>
              </div>

              {/* Declared Capabilities */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  DECLARED CAPABILITIES ({selectedWorker.capabilities.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selectedWorker.capabilities.map((c) => (
                    <span
                      key={c.capabilityId}
                      style={{
                        fontSize: '0.75rem',
                        padding: '3px 8px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {c.capabilityId}
                    </span>
                  ))}
                </div>
              </div>

              {/* Resident AI Models */}
              {selectedWorker.models.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    AVAILABLE LOCAL AI MODELS
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {selectedWorker.models.map((m) => (
                      <span
                        key={m}
                        style={{
                          fontSize: '0.75rem',
                          padding: '3px 8px',
                          background: 'rgba(16, 185, 129, 0.1)',
                          border: '1px solid rgba(16, 185, 129, 0.2)',
                          borderRadius: '6px',
                          color: '#10b981',
                        }}
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Connection & Telemetry Stats */}
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Registered: {new Date(selectedWorker.registeredAt).toLocaleString()}</span>
                <span>Last Heartbeat: {new Date(selectedWorker.lastHeartbeat).toLocaleTimeString()}</span>
              </div>
            </div>

            {/* Recent Dispatched Workloads */}
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 600 }}>Recent Tasks Executed</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {workerTasks.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    style={{
                      padding: '10px 12px',
                      background: 'rgba(0,0,0,0.15)',
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t.taskType}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {t.id} • Privacy: {t.privacyLevel}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: t.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: t.status === 'COMPLETED' ? '#10b981' : '#ef4444',
                        fontWeight: 600,
                      }}
                    >
                      {t.status}
                    </span>
                  </div>
                ))}
                {workerTasks.length === 0 && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '16px' }}>
                    No tasks recorded on this node yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Select an execution node from the left to view hardware telemetry, declared capabilities, and dispatched workloads.
          </div>
        )}
      </div>

      {/* Pairing Modal */}
      {showPairModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '480px', padding: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.2rem', fontWeight: 700 }}>Pair New LAN Worker</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Generates a cryptographically signed one-time enrollment token to pair an external GPU server or secondary laptop onto the HṚṢĪKEŚA resource fabric.
            </p>

            {!pairResult ? (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>Worker Node Label</label>
                <input
                  type="text"
                  value={pairNodeName}
                  onChange={(e) => setPairNodeName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', marginBottom: '16px' }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button onClick={() => setShowPairModal(false)} className="btn-secondary">Cancel</button>
                  <button onClick={handlePairWorker} className="btn-primary">Generate Pairing Token</button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, marginBottom: '4px' }}>TOKEN GENERATED (EXPIRES IN 10 MIN)</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '4px' }}>
                    <code style={{ fontSize: '0.8rem', color: '#60a5fa', wordBreak: 'break-all' }}>{pairResult.token}</code>
                    <button
                      onClick={() => copyToClipboard(pairResult.token)}
                      style={{ background: 'none', border: 'none', color: copiedToken ? '#10b981' : 'var(--text-secondary)', cursor: 'pointer', marginLeft: '8px' }}
                    >
                      {copiedToken ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Start dedicated physical worker runtime on LAN machine:
                  <pre style={{ background: 'rgba(0,0,0,0.4)', padding: '8px', borderRadius: '4px', marginTop: '6px', overflowX: 'auto', fontSize: '0.75rem', color: '#38bdf8' }}>
                    {`npx tsx src/resources/worker-runtime/worker.runtime.ts \\
  --server 127.0.0.1:4300 \\
  --token ${pairResult.token} \\
  --name "${pairResult.name}"`}
                  </pre>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowPairModal(false)} className="btn-primary">Done</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Test Compute Modal */}
      {showTestModal && selectedWorker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '460px', padding: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.2rem', fontWeight: 700 }}>Dispatch Compute Benchmark</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Dispatch an authorized diagnostic workload to verify low-latency execution and real-time telemetry on <strong style={{ color: 'var(--text-primary)' }}>{selectedWorker.name}</strong>.
            </p>

            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>Workload Type</label>
            <select
              value={testTaskType}
              onChange={(e) => setTestTaskType(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', marginBottom: '14px' }}
            >
              <option value="resource.fabric.test">resource.fabric.test (Compute Checksum Verification)</option>
              <option value="compute.echo">compute.echo (Zero-Cost Latency & Roundtrip)</option>
              <option value="compute.benchmark">compute.benchmark (Raw Math Execution Speed)</option>
              <option value="inference.generate">inference.generate (Distributed Streaming Token Generation)</option>
            </select>

            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>Iterations / Operations</label>
            <input
              type="number"
              value={testIterations}
              onChange={(e) => setTestIterations(Number(e.target.value))}
              style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', marginBottom: '16px' }}
            />

            {testRunning && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  <span>Dispatching to worker...</span>
                  <span>{Math.round((testingProgress || 0) * 100)}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${(testingProgress || 0) * 100}%`, height: '100%', background: '#10b981', transition: 'width 0.3s ease' }} />
                </div>
              </div>
            )}

            {testResult && (
              <div style={{ padding: '12px', background: testResult.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', borderRadius: '6px', marginBottom: '16px', fontSize: '0.8rem' }}>
                <div style={{ fontWeight: 600, color: testResult.success ? '#10b981' : '#ef4444', marginBottom: '4px' }}>
                  {testResult.success ? 'BENCHMARK COMPLETED' : 'EXECUTION FAILED'}
                </div>
                <div>Elapsed: {testResult.measuredDurationMs}ms</div>
                {testResult.output && (
                  <pre style={{ margin: '6px 0 0 0', fontSize: '0.75rem', background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '4px' }}>
                    {JSON.stringify(testResult.output, null, 2)}
                  </pre>
                )}
                {testResult.error && <div style={{ color: '#ef4444', marginTop: '4px' }}>{testResult.error}</div>}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowTestModal(false)} className="btn-secondary" disabled={testRunning}>Close</button>
              <button onClick={handleRunComputeTest} className="btn-primary" disabled={testRunning}>
                {testRunning ? 'Executing...' : 'Run Test'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
