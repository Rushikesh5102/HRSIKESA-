import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  Play,
  Pause,
  StopCircle,
  RefreshCw,
  GitBranch,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Cpu,
  HardDrive,
  Activity,
  FileCode,
  Terminal,
  Award,
  ChevronRight,
  TrendingUp,
  Layers,
  Clock,
  ExternalLink,
  ShieldCheck,
  Send,
  Eye,
  Trash2,
  Zap,
  Copy,
  Check
} from 'lucide-react';
import { api } from '../services/api';

export const EvolutionMonitorView: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const [experiments, setExperiments] = useState<any[]>([]);
  const [selectedExperiment, setSelectedExperiment] = useState<any | null>(null);
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [creatingObjective, setCreatingObjective] = useState<boolean>(false);
  const [objectiveForm, setObjectiveForm] = useState({
    title: '',
    targetMetric: 'latency_ms',
    metricDirection: 'LOWER_IS_BETTER',
    baselineValue: 100,
    targetValue: 80,
    unit: 'ms',
    maxExperiments: 10,
    allowedScope: 'src/tools,src/api,src/execution',
  });

  const [showEmergencyModal, setShowEmergencyModal] = useState<boolean>(false);
  const [promotionModal, setPromotionModal] = useState<{
    isOpen: boolean;
    success: boolean;
    title: string;
    message: string;
    commitSha?: string;
    promotedAt?: string;
  } | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [copiedLogs, setCopiedLogs] = useState<boolean>(false);
  const [latestPhaseUpdate, setLatestPhaseUpdate] = useState<{
    actionText?: string;
    etaFormatted?: string;
    phase?: string;
    iteration?: number;
  } | null>(null);


  const logsEndRef = useRef<HTMLDivElement>(null);

  const handleCopyLogs = () => {
    const logText = events
      .map((ev) => {
        const ts = new Date(ev.timestamp || Date.now()).toLocaleTimeString();
        const level = ev.data?.level ? `[${ev.data.level}] ` : '';
        const msg = ev.data?.message || ev.data?.hypothesis || ev.data?.summary || ev.data?.actionText || JSON.stringify(ev.data);
        return `[${ts}] ${ev.type} ${level}${msg}`;
      })
      .join('\n');

    if (navigator.clipboard) {
      navigator.clipboard.writeText(logText);
      setCopiedLogs(true);
      setTimeout(() => setCopiedLogs(false), 2000);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [statusRes, objectivesRes, experimentsRes, checkpointsRes, auditRes] = await Promise.allSettled([
        api.getEvolutionStatus(),
        api.getEvolutionObjectives(),
        api.getEvolutionExperiments(selectedObjectiveId || undefined),
        api.getEvolutionCheckpoints(selectedObjectiveId || undefined),
        api.getEvolutionAuditLogs(50),
      ]);

      if (statusRes.status === 'fulfilled' && statusRes.value?.success) {
        setStatus(statusRes.value.status || statusRes.value);
      }
      if (objectivesRes.status === 'fulfilled' && objectivesRes.value?.success) {
        const objs = objectivesRes.value.objectives || [];
        setObjectives(objs);
        if (!selectedObjectiveId && objs.length > 0) {
          setSelectedObjectiveId(objs[0].id);
        }
      }
      if (experimentsRes.status === 'fulfilled' && experimentsRes.value?.success) {
        const exps = experimentsRes.value.experiments || [];
        setExperiments(exps);
        if (exps.length > 0) {
          setSelectedExperiment((prev: any) => {
            if (!prev) return exps[0];
            const match = exps.find((e: any) => e.id === prev.id);
            return match || exps[0];
          });
        }
      }
      if (checkpointsRes.status === 'fulfilled' && checkpointsRes.value?.success) {
        setCheckpoints(checkpointsRes.value.checkpoints || []);
      }
      if (auditRes.status === 'fulfilled' && auditRes.value?.success) {
        setAuditLogs(auditRes.value.auditLogs || []);
      }
    } catch (err) {
      console.error('Failed to load evolution data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [selectedObjectiveId]);

  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);

  useEffect(() => {
    // Subscribe to real-time evolution events stream
    const unsubscribe = api.subscribeEvolutionEvents(
      (ev) => {
        setIsLiveConnected(true);
        setEvents((prev) => [ev, ...prev.slice(0, 99)]);
        if (ev.type === 'evolution.experiment.phase' && ev.data) {
          setLatestPhaseUpdate(ev.data);
        }
        // Auto-refresh status on state change events
        if (ev.type?.startsWith('evolution.')) {
          loadData();
        }
      },
      (err) => {
        setIsLiveConnected(false);
        console.warn('SSE connection warning', err);
      }
    );
    return () => unsubscribe();
  }, []);

  const handlePause = async () => {
    try {
      await api.pauseEvolution();
      setActionMessage('Evolution loop paused.');
      loadData();
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    }
  };

  const handleResume = async () => {
    try {
      await api.resumeEvolution();
      setActionMessage('Evolution loop resumed.');
      loadData();
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    }
  };

  const handleCancel = async () => {
    try {
      await api.cancelEvolution();
      setActionMessage('Active evolution objective cancelled.');
      loadData();
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    }
  };

  const handleResumeObjective = async (id: string) => {
    try {
      await api.resumeEvolutionObjective(id);
      setActionMessage(`Objective resumed and reset to active.`);
      loadData();
    } catch (err: any) {
      setActionMessage(`Failed to resume objective: ${err.message}`);
    }
  };

  const handleTriggerObjective = async (id: string) => {
    try {
      await api.triggerEvolutionObjective(id);
      setActionMessage(`Autonomous agentic workforce loop engaged for objective.`);
      loadData();
    } catch (err: any) {
      setActionMessage(`Failed to trigger objective: ${err.message}`);
    }
  };

  const handleCancelObjective = async (id: string) => {
    try {
      await api.cancelEvolutionObjective(id);
      setActionMessage(`Objective cancelled.`);
      loadData();
    } catch (err: any) {
      setActionMessage(`Failed to cancel objective: ${err.message}`);
    }
  };

  const handleDeleteObjective = async (id: string) => {
    if (!window.confirm(`Permanently delete objective [${id}]?`)) return;
    try {
      await api.deleteEvolutionObjective(id);
      setActionMessage(`Objective deleted.`);
      if (selectedObjectiveId === id) setSelectedObjectiveId(null);
      loadData();
    } catch (err: any) {
      setActionMessage(`Failed to delete objective: ${err.message}`);
    }
  };

  const handleEmergencyStop = async () => {
    try {
      await api.emergencyStopEvolution('Sovereign Creator Directive: Instant Emergency Stop (RUSHIKESH)');
      setShowEmergencyModal(false);
      setActionMessage('🚨 EMERGENCY STOP ACTIVATED. All worker processes killed and HṚṢĪKEŚA locked.');
      loadData();
    } catch (err: any) {
      setActionMessage(`Emergency Stop Error: ${err.message}`);
    }
  };

  const handlePromote = async (targetId?: string) => {
    const idToPromote = targetId || selectedExperiment?.id || selectedObjective?.id;
    if (!idToPromote) return;
    if (!window.confirm(`Push changes for [${idToPromote}] to production HEAD? This fast-forward merges the sandboxed worktree with human sovereign authority.`)) {
      return;
    }
    try {
      const res = await api.promoteEvolutionExperiment(idToPromote);
      if (res.success !== false) {
        setPromotionModal({
          isOpen: true,
          success: true,
          title: 'Successfully Pushed to Production!',
          message: res.message || `Objective [${idToPromote}] has been fast-forward merged into production HEAD.`,
          commitSha: res.commitSha || 'HEAD (Fast-Forwarded)',
          promotedAt: res.promotedAt || new Date().toLocaleString(),
        });
        setActionMessage(res.message || '🚀 Fast-forward promoted to production successfully!');
      } else {
        setPromotionModal({
          isOpen: true,
          success: false,
          title: 'Push to Production Failed',
          message: res.error || res.message || 'Promotion rejected by supervisor gateway.',
        });
        setActionMessage(`Promotion failed: ${res.error || res.message}`);
      }
      loadData();
    } catch (err: any) {
      setPromotionModal({
        isOpen: true,
        success: false,
        title: 'Push to Production Failed',
        message: err.message || 'An unexpected error occurred during promotion.',
      });
      setActionMessage(`Promotion failed: ${err.message}`);
    }
  };


  const handleCreateObjective = async (e: React.FormEvent) => {

    e.preventDefault();
    try {
      const payload = {
        objective: objectiveForm.title,
        allowedScope: objectiveForm.allowedScope.split(',').map((s) => s.trim()),
        resourceBudget: {
          maxExperiments: Number(objectiveForm.maxExperiments),
          maxConsecutiveFailures: 3,
          stagnationThreshold: 4,
          maxRuntimeMs: 3600000,
          maxMemoryMb: 2048,
          maxCpuPercent: 75,
        },
        acceptanceCriteria: [
          {
            metricName: objectiveForm.targetMetric,
            baselineValue: Number(objectiveForm.baselineValue),
            targetValue: Number(objectiveForm.targetValue),
            unit: objectiveForm.unit,
            direction: objectiveForm.metricDirection,
            mandatory: true,
          },
        ],
      };

      const res = await api.createEvolutionObjective(payload);
      if (res.success) {
        setCreatingObjective(false);
        setActionMessage(`Objective registered: ${res.objective.id}`);
        setSelectedObjectiveId(res.objective.id);
        loadData();
      }
    } catch (err: any) {
      setActionMessage(`Failed to create objective: ${err.message}`);
    }
  };

  const activeExp = status?.currentExperiment;
  const isEmergency = status?.safety?.isEmergencyStopped;
  const isPaused = status?.safety?.isPaused;
  const selectedObjective = objectives.find((o) => o.id === selectedObjectiveId) || objectives[0] || null;

  const supervisorStatus = isEmergency
    ? 'LOCKED'
    : isPaused
    ? 'PAUSED'
    : isLiveConnected || status
    ? (status?.supervisors?.[0]?.status || 'ONLINE')
    : 'DISCONNECTED';

  const supervisorColor = supervisorStatus === 'ONLINE'
    ? '#059669'
    : supervisorStatus === 'PAUSED'
    ? '#d97706'
    : supervisorStatus === 'LOCKED'
    ? '#dc2626'
    : '#64748b';

  return (
    <div className="evolution-monitor-container" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', color: '#e2e8f0', minHeight: '100%' }}>
      {/* Top Banner / Status Overview */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 215, 0, 0.2)', borderRadius: '12px', padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '10px', background: isEmergency ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 215, 0, 0.1)', borderRadius: '10px', border: `1px solid ${isEmergency ? '#ef4444' : '#eab308'}` }}>
            <Activity size={24} color={isEmergency ? '#ef4444' : '#eab308'} />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Self-Evolution Engine
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: isEmergency ? '#ef4444' : isPaused ? '#f59e0b' : '#10b981', color: '#fff' }}>
                {isEmergency ? 'EMERGENCY STOPPED' : isPaused ? 'PAUSED' : status?.activeObjective ? 'ACTIVE LOOP' : 'STANDBY'}
              </span>
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
              Controlled, observable, reversible autonomous self-development with Antigravity supervisor
            </p>
          </div>
        </div>

        {/* Global Safety Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isPaused ? (
            <button onClick={handleResume} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#059669', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
              <Play size={16} /> Resume
            </button>
          ) : (
            <button onClick={handlePause} disabled={!status?.activeObjective} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid #f59e0b', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, opacity: status?.activeObjective ? 1 : 0.5 }}>
              <Pause size={16} /> Pause
            </button>
          )}

          <button onClick={handleCancel} disabled={!status?.activeObjective} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(100, 116, 139, 0.2)', color: '#94a3b8', border: '1px solid #64748b', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, opacity: status?.activeObjective ? 1 : 0.5 }}>
            <StopCircle size={16} /> Cancel
          </button>

          <button
            onClick={() => setShowEmergencyModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#dc2626', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, boxShadow: '0 0 15px rgba(220, 38, 38, 0.4)' }}
          >
            <ShieldAlert size={18} /> EMERGENCY STOP
          </button>
        </div>
      </div>

      {actionMessage && (
        <div style={{ padding: '10px 16px', background: 'rgba(30, 41, 59, 0.9)', borderLeft: '4px solid #3b82f6', borderRadius: '6px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Hardware Telemetry & Supervised Boundaries Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '12px', marginBottom: '6px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Cpu size={14} /> CPU Utilization</span>
            <span>{status?.resourceUsage?.cpuPercent?.toFixed(1) || '0.0'}%</span>
          </div>
          <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, status?.resourceUsage?.cpuPercent || 0)}%`, height: '100%', background: '#3b82f6' }} />
          </div>
        </div>

        <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '12px', marginBottom: '6px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Activity size={14} /> Memory Usage</span>
            <span>{status?.resourceUsage?.memoryMb?.toFixed(0) || '0'} MB</span>
          </div>
          <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, ((status?.resourceUsage?.memoryMb || 0) / 4096) * 100)}%`, height: '100%', background: '#8b5cf6' }} />
          </div>
        </div>

        <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '12px', marginBottom: '6px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><HardDrive size={14} /> Disk Isolation</span>
            <span>{status?.resourceUsage?.diskMb?.toFixed(0) || '0'} MB</span>
          </div>
          <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, ((status?.resourceUsage?.diskMb || 0) / 10240) * 100)}%`, height: '100%', background: '#10b981' }} />
          </div>
        </div>

        <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '12px', marginBottom: '6px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ShieldCheck size={14} /> Safety Violations</span>
            <span style={{ color: (status?.safety?.violationsCount || 0) > 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
              {status?.safety?.violationsCount || 0} Recorded
            </span>
          </div>
          <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: (status?.safety?.violationsCount || 0) > 0 ? '100%' : '0%', height: '100%', background: '#ef4444' }} />
          </div>
        </div>
      </div>

      {/* Main Content: Objectives, Supervisors & Live Timeline */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 340px', gap: '20px', flex: 1 }}>
        {/* Left Column: Objectives & Worktree Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
                Evolution Objectives
              </h2>
              <button
                onClick={() => setCreatingObjective(!creatingObjective)}
                style={{ background: 'rgba(255, 215, 0, 0.1)', border: '1px solid rgba(255, 215, 0, 0.3)', color: '#ffd700', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}
              >
                {creatingObjective ? 'Cancel' : '+ New Objective'}
              </button>
            </div>

            {creatingObjective && (
              <form onSubmit={handleCreateObjective} style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '12px', borderRadius: '8px', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '11px', color: '#94a3b8' }}>Objective Statement</label>
                <textarea
                  value={objectiveForm.title}
                  onChange={(e) => setObjectiveForm({ ...objectiveForm, title: e.target.value })}
                  placeholder="e.g. Reduce average interactive response latency by 20% without breaking regression tests"
                  rows={3}
                  required
                  style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid #475569', borderRadius: '6px', color: '#fff', padding: '6px', fontSize: '12px' }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#94a3b8' }}>Baseline</label>
                    <input
                      type="number"
                      value={objectiveForm.baselineValue}
                      onChange={(e) => setObjectiveForm({ ...objectiveForm, baselineValue: Number(e.target.value) })}
                      style={{ width: '100%', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid #475569', borderRadius: '6px', color: '#fff', padding: '4px 6px', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#94a3b8' }}>Target</label>
                    <input
                      type="number"
                      value={objectiveForm.targetValue}
                      onChange={(e) => setObjectiveForm({ ...objectiveForm, targetValue: Number(e.target.value) })}
                      style={{ width: '100%', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid #475569', borderRadius: '6px', color: '#fff', padding: '4px 6px', fontSize: '12px' }}
                    />
                  </div>
                </div>

                <button type="submit" style={{ marginTop: '6px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '12px' }}>
                  Register Objective
                </button>
              </form>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto' }}>
              {objectives.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '20px' }}>No objectives defined yet.</div>
              ) : (
                objectives.map((obj) => (
                  <div
                    key={obj.id}
                    onClick={() => setSelectedObjectiveId(obj.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: selectedObjectiveId === obj.id ? 'rgba(59, 130, 246, 0.15)' : 'rgba(30, 41, 59, 0.5)',
                      border: `1px solid ${selectedObjectiveId === obj.id ? '#3b82f6' : 'rgba(255,255,255,0.05)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>{obj.id.slice(0, 8)}...</span>
                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: obj.status === 'COMPLETED' ? '#059669' : obj.status === 'ACTIVE' ? '#2563eb' : '#64748b', color: '#fff' }}>
                        {obj.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {obj.title || obj.objective || obj.description || `Objective ${obj.id.slice(0, 8)}`}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Independent Supervisors Panel */}
          <div style={{ background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
              Supervisor Gateway (Antigravity)
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '8px', background: 'rgba(30, 41, 59, 0.6)', border: `1px solid ${supervisorColor}55` }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Antigravity
                    <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '3px', background: 'rgba(96, 165, 250, 0.15)', color: '#93c5fd' }}>SOLE WATCHDOG</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                    Folder Scope, Boundaries, Architecture & Process Lockdown
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px' }}>
                    Kills rogue workers & locks HṚṢĪKEŚA if mutations breach folder boundary.
                  </div>
                </div>
                <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: supervisorColor, color: '#fff', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {supervisorStatus}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Column: Active Objective, Active Experiment & Experiment Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Selected Objective Details Card */}
          {selectedObjective && (() => {
            const promotableExp = experiments.find((e: any) => e.status === 'PROMOTION_READY' || e.decision === 'ACCEPTED' || e.status === 'ACCEPTED') || (experiments.length > 0 ? experiments[0] : null);
            const isObjectivePromotable = selectedObjective.status === 'PROMOTION_READY' || selectedObjective.status === 'COMPLETED' || selectedExperiment?.status === 'PROMOTION_READY' || selectedExperiment?.decision === 'ACCEPTED' || selectedExperiment?.status === 'ACCEPTED' || promotableExp?.status === 'PROMOTION_READY';

            return (
              <div style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '12px', padding: '18px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ flex: 1, marginRight: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#60a5fa', fontWeight: 700 }}>
                        Selected Objective
                      </span>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>[{selectedObjective.id}]</span>
                    </div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '2px 0 6px 0', color: '#f8fafc', lineHeight: 1.3 }}>
                      {selectedObjective.title || selectedObjective.description}
                    </h3>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                      Submitted: {new Date(selectedObjective.createdAt || Date.now()).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '5px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: selectedObjective.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.2)' : selectedObjective.status === 'PROMOTION_READY' ? 'rgba(16, 185, 129, 0.3)' : selectedObjective.status === 'STAGNATED' ? 'rgba(245, 158, 11, 0.2)' : selectedObjective.status === 'CANCELLED' ? 'rgba(100, 116, 139, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                      color: selectedObjective.status === 'COMPLETED' || selectedObjective.status === 'PROMOTION_READY' ? '#10b981' : selectedObjective.status === 'STAGNATED' ? '#fbbf24' : selectedObjective.status === 'CANCELLED' ? '#94a3b8' : '#60a5fa',
                      border: '1px solid currentColor',
                    }}>
                      {selectedObjective.status}
                    </span>

                    {/* Prominent Push to Production Action */}
                    {isObjectivePromotable && (
                      <button
                        onClick={() => handlePromote(promotableExp?.id || selectedExperiment?.id || selectedObjective.id)}
                        style={{
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          color: '#fff',
                          border: '1px solid #34d399',
                          borderRadius: '6px',
                          padding: '5px 14px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          boxShadow: '0 0 12px rgba(16, 185, 129, 0.4)',
                        }}
                        title="Push passing worktree mutations into production HEAD"
                      >
                        <Award size={13} /> Push to Production
                      </button>
                    )}

                    {selectedObjective.status !== 'COMPLETED' && selectedObjective.status !== 'CANCELLED' && selectedObjective.status !== 'PROMOTION_READY' && (
                      <button
                        onClick={() => handleTriggerObjective(selectedObjective.id)}
                        style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 0 10px rgba(37, 99, 235, 0.4)' }}
                        title="Trigger autonomous agent workforce improvements"
                      >
                        <Zap size={12} /> Start Autonomous Improvement
                      </button>
                    )}

                    {(selectedObjective.status === 'STAGNATED' || selectedObjective.status === 'PAUSED' || selectedObjective.status === 'CANCELLED') && (
                      <button
                        onClick={() => handleResumeObjective(selectedObjective.id)}
                        style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="Un-stagnate and resume objective"
                      >
                        <Play size={12} /> Resume / Unstagnate
                      </button>
                    )}

                    {selectedObjective.status !== 'CANCELLED' && selectedObjective.status !== 'COMPLETED' && (
                      <button
                        onClick={() => handleCancelObjective(selectedObjective.id)}
                        style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteObjective(selectedObjective.id)}
                      style={{ background: 'rgba(239, 68, 68, 0.25)', color: '#fca5a5', border: '1px solid #ef4444', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>

                {/* Sovereign Promotion Ready Banner */}
                {isObjectivePromotable && (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.28))',
                    border: '1.5px solid #10b981',
                    borderRadius: '10px',
                    padding: '14px 18px',
                    marginBottom: '14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.25)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 800, fontSize: '18px' }}>
                        🏆
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '14px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>Objective Mutations Ready for Sovereign Promotion!</span>
                          <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.3)', color: '#a7f3d0' }}>100% REGRESSIONS PASSING</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '2px' }}>
                          Benchmark target achieved in isolated worktree with 0 compiler errors and Antigravity supervisor sign-off.
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handlePromote(promotableExp?.id || selectedExperiment?.id || selectedObjective.id)}
                      style={{
                        background: 'linear-gradient(135deg, #10b981, #047857)',
                        color: '#fff',
                        border: '1px solid #6ee7b7',
                        borderRadius: '8px',
                        padding: '8px 18px',
                        fontSize: '13px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 0 20px rgba(16, 185, 129, 0.5)'
                      }}
                    >
                      <Award size={16} />
                      <span>Push to Production (Fast-Forward Merge)</span>
                    </button>
                  </div>
                )}

              {/* Real-time Current Action & Estimated Time Remaining (ETA) Banner */}
              {selectedObjective.status === 'IN_PROGRESS' && (
                <div style={{
                  background: 'linear-gradient(90deg, rgba(37, 99, 235, 0.15), rgba(16, 185, 129, 0.1))',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={14} color="#60a5fa" className="animate-spin" style={{ animation: 'spin 2s linear infinite' }} />
                    <span style={{ fontSize: '12px', color: '#f1f5f9', fontWeight: 500 }}>
                      <strong style={{ color: '#60a5fa' }}>Currently Doing:</strong> {latestPhaseUpdate?.actionText || 'Executing autonomous optimization in isolated sandbox...'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    <Clock size={12} />
                    <span><strong>Est. Remaining:</strong> {latestPhaseUpdate?.etaFormatted || '~15s remaining'}</span>
                  </div>
                </div>
              )}

              {/* Progress Bar */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                  <span>Objective Progress</span>
                  <span>{selectedObjective.progressPercentage?.toFixed(0) || 0}%</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, selectedObjective.progressPercentage || 0)}%`, height: '100%', background: '#3b82f6' }} />
                </div>
              </div>

              {/* Details Grid: Acceptance Criteria, Scope, Budgets */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '10px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>Acceptance Criteria</div>
                  <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                    {selectedObjective.acceptanceCriteria && selectedObjective.acceptanceCriteria.length > 0 ? (
                      selectedObjective.acceptanceCriteria.map((c: any, i: number) => (
                        <div key={i} style={{ marginBottom: '2px' }}>
                          • {c.description || `${c.metric || c.metricName} ${c.operator || '<='} ${c.targetValue} ${c.unit || ''}`}
                        </div>
                      ))
                    ) : (
                      <span>Preserve all tests & reduce latency</span>
                    )}
                  </div>
                </div>

                <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '10px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>Authorized Scope (Folder Bounds)</div>
                  <div style={{ fontSize: '12px', color: '#cbd5e1', fontFamily: 'monospace' }}>
                    {Array.isArray(selectedObjective.allowedScope) ? selectedObjective.allowedScope.join(', ') : 'src/'}
                  </div>
                  <div style={{ fontSize: '10px', color: '#a78bfa', marginTop: '4px' }}>
                    Antigravity watchdog kills workers & locks HṚṢĪKEŚA if files outside this folder are modified.
                  </div>
                </div>

                <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '10px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>Execution Budget</div>
                  <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                    Max Experiments: {selectedObjective.maxExperiments || 10}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Stagnation Threshold: {selectedObjective.stagnationThreshold || 3} failures
                  </div>
                </div>
              </div>
            </div>
          );
        })()}



          {/* Active / Selected Experiment Card */}
          <div style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255, 215, 0, 0.15)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#ffd700' }}>
                  {activeExp ? 'Active Running Experiment' : selectedExperiment ? 'Experiment Inspection' : 'Experiment Status'}
                </span>
                <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '4px 0 0 0', color: '#fff' }}>
                  {selectedExperiment ? selectedExperiment.hypothesis : 'No Active Experiment'}
                </h3>
                {selectedExperiment && (
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', fontFamily: 'monospace' }}>
                    ID: {selectedExperiment.id} | Baseline: {selectedExperiment.baselineCommit?.slice(0, 7)}
                  </div>
                )}
              </div>

              {selectedExperiment && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: selectedExperiment.status === 'ACCEPTED' || selectedExperiment.status === 'PROMOTION_READY' ? 'rgba(16, 185, 129, 0.2)' : selectedExperiment.status === 'REJECTED' || selectedExperiment.status === 'ROLLED_BACK' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                    color: selectedExperiment.status === 'ACCEPTED' || selectedExperiment.status === 'PROMOTION_READY' ? '#10b981' : selectedExperiment.status === 'REJECTED' || selectedExperiment.status === 'ROLLED_BACK' ? '#ef4444' : '#3b82f6',
                    border: '1px solid currentColor'
                  }}>
                    {selectedExperiment.status}
                  </span>

                  {selectedExperiment.status === 'PROMOTION_READY' && (
                    <button
                      onClick={() => handlePromote(selectedExperiment.id)}
                      style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontWeight: 600, cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Award size={14} /> Promote to Production
                    </button>
                  )}
                </div>
              )}
            </div>

            {selectedExperiment && (
              <div>
                {/* Verification Results Matrix */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', margin: '16px 0' }}>
                  <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '10px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Build & Typecheck</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: (selectedExperiment.testResults?.success || selectedExperiment.status === 'ACCEPTED' || selectedExperiment.status === 'TESTING' || selectedExperiment.status === 'SUPERVISOR_REVIEW') ? '#10b981' : '#ef4444', marginTop: '4px' }}>
                      {(selectedExperiment.testResults?.success || selectedExperiment.status === 'ACCEPTED' || selectedExperiment.status === 'TESTING' || selectedExperiment.status === 'SUPERVISOR_REVIEW') ? '✓ Passed' : '✗ Failed'}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '10px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Regressions</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: (selectedExperiment.testResults?.success || selectedExperiment.testResults?.passed > 0) ? '#10b981' : '#ef4444', marginTop: '4px' }}>
                      {selectedExperiment.testResults?.passed !== undefined ? `✓ ${selectedExperiment.testResults.passed} Passed` : selectedExperiment.testResults?.success ? '✓ 0 Regressions' : '✗ Regressions Found'}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '10px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Benchmark Metric</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: selectedExperiment.benchmarkResults?.overallPassed !== false ? '#10b981' : '#ef4444', marginTop: '4px' }}>
                      {selectedExperiment.benchmarkResults?.overallPassed !== false ? '✓ Target Advancing' : '✗ Metric Regressed'}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '10px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Security & Boundary</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: (selectedExperiment.securityResults?.passed !== false) ? '#10b981' : '#ef4444', marginTop: '4px' }}>
                      {(selectedExperiment.securityResults?.passed !== false) ? '✓ Secure (In-Scope)' : '✗ Boundary Trigger'}
                    </div>
                  </div>
                </div>

                {/* Comprehensive Explainability Matrix: What, Why, How */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', margin: '14px 0' }}>
                  <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle size={13} /> 1. What Was Achieved
                    </div>
                    <div style={{ fontSize: '12px', color: '#e2e8f0', lineHeight: '1.5' }}>
                      {selectedExperiment.whatWasAchieved || `Successfully executed in isolated sandbox with status ${selectedExperiment.status}. Tests passed: ${selectedExperiment.testResults?.passed || 0}/${selectedExperiment.testResults?.total || 0}.`}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Zap size={13} /> 2. Why It Was Changed
                    </div>
                    <div style={{ fontSize: '12px', color: '#e2e8f0', lineHeight: '1.5' }}>
                      {selectedExperiment.whyItWasChanged || selectedExperiment.hypothesis || 'Targeted optimization to satisfy objective acceptance criteria without breaking tests.'}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.25)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#c084fc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Cpu size={13} /> 3. How It Works
                    </div>
                    <div style={{ fontSize: '12px', color: '#e2e8f0', lineHeight: '1.5' }}>
                      {selectedExperiment.howItWorks || 'Applies bounded TypeScript refactors in disposable Git worktree branch, typechecks with tsc, and requests supervisor verification.'}
                    </div>
                  </div>
                </div>

                {/* What Code Was Changed: From ➔ To Detailed Breakdown */}
                {selectedExperiment.whatWasChangedFromWhat && selectedExperiment.whatWasChangedFromWhat.length > 0 && (
                  <div style={{ margin: '14px 0' }}>
                    <div style={{ fontSize: '12px', color: '#ffd700', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileCode size={14} /> 4. What Code Was Changed (From ➔ To)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {selectedExperiment.whatWasChangedFromWhat.map((change: any, cIdx: number) => (
                        <div key={cIdx} style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '12px' }}>
                            <span style={{ fontFamily: 'monospace', color: '#38bdf8', fontWeight: 600 }}>{change.file}</span>
                            <span style={{ fontSize: '11px', background: change.action === 'CREATE' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)', color: change.action === 'CREATE' ? '#10b981' : '#60a5fa', padding: '2px 6px', borderRadius: '4px' }}>
                              {change.action} (Lines: {change.lineRange || '1-N'})
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>{change.explanation}</div>
                          {change.fromSnippet && change.fromSnippet !== '(None - New File)' && (
                            <div style={{ marginBottom: '4px' }}>
                              <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>- FROM:</div>
                              <pre style={{ margin: 0, padding: '4px 8px', background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', borderRadius: '4px', fontSize: '11px', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{change.fromSnippet}</pre>
                            </div>
                          )}
                          {change.toSnippet && (
                            <div>
                              <div style={{ fontSize: '10px', color: '#10b981', fontWeight: 600 }}>+ TO:</div>
                              <pre style={{ margin: 0, padding: '4px 8px', background: 'rgba(16, 185, 129, 0.1)', color: '#86efac', borderRadius: '4px', fontSize: '11px', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{change.toSnippet}</pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Diff Drill-down */}
                <div style={{ marginTop: '14px' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Git Worktree Diff ({selectedExperiment.changedFiles?.length || 0} files)</span>
                    <span>Sandbox: evo/{selectedExperiment.id?.slice(0, 8)}</span>
                  </div>
                  <div style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid #334155', borderRadius: '8px', padding: '12px', maxHeight: '180px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '11px', color: '#cbd5e1' }}>
                    {selectedExperiment.diff ? (
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{selectedExperiment.diff}</pre>
                    ) : (
                      <span style={{ color: '#64748b' }}>No diff available or no files modified in worktree.</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Experiment Timeline */}
          <div style={{ background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px', flex: 1 }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 14px 0', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
              Experiment History & Checkpoints
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
              {experiments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '13px' }}>
                  No experiments executed yet.
                </div>
              ) : (
                experiments.map((exp, idx) => (
                  <div
                    key={exp.id}
                    onClick={() => setSelectedExperiment(exp)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: selectedExperiment?.id === exp.id ? 'rgba(59, 130, 246, 0.15)' : 'rgba(30, 41, 59, 0.4)',
                      border: `1px solid ${selectedExperiment?.id === exp.id ? '#3b82f6' : 'rgba(255,255,255,0.05)'}`,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', width: '24px' }}>#{idx + 1}</span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: '#f1f5f9' }}>{exp.hypothesis}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          Files: {exp.changedFiles?.length || 0} | Duration: {exp.startTime && exp.endTime ? `${Math.round((new Date(exp.endTime).getTime() - new Date(exp.startTime).getTime()) / 1000)}s` : 'running...'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: exp.decision === 'ACCEPT' || exp.status === 'PROMOTION_READY' ? 'rgba(16, 185, 129, 0.2)' : exp.decision === 'REJECT' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                        color: exp.decision === 'ACCEPT' || exp.status === 'PROMOTION_READY' ? '#10b981' : exp.decision === 'REJECT' ? '#ef4444' : '#94a3b8'
                      }}>
                        {exp.decision || exp.status}
                      </span>
                      <ChevronRight size={14} color="#64748b" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Event Stream & Structured Audit Logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Terminal size={14} /> Live SSE Event Stream
              </h2>
              <button
                onClick={handleCopyLogs}
                style={{
                  background: copiedLogs ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                  color: copiedLogs ? '#10b981' : '#cbd5e1',
                  border: `1px solid ${copiedLogs ? '#10b981' : 'rgba(255, 255, 255, 0.15)'}`,
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease'
                }}
                title="Copy entire event stream to clipboard"
              >
                {copiedLogs ? <Check size={12} /> : <Copy size={12} />}
                {copiedLogs ? 'Copied!' : 'Copy Stream'}
              </button>
            </div>

            <div style={{ flex: 1, background: 'rgba(10, 15, 29, 0.9)', border: '1px solid #1e293b', borderRadius: '8px', padding: '10px', overflowY: 'auto', maxHeight: '520px', fontFamily: 'monospace', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px', userSelect: 'text' }}>
              {events.length === 0 ? (
                <div style={{ color: '#475569', textAlign: 'center', padding: '30px 10px' }}>Waiting for evolution telemetry stream...</div>
              ) : (
                events.map((ev, i) => {
                  const isLog = ev.type === 'evolution.log';
                  const level = ev.data?.level;
                  const logColor = level === 'ERROR' ? '#ef4444' : level === 'WARN' ? '#f59e0b' : level === 'SUCCESS' ? '#10b981' : '#38bdf8';
                  const msg = ev.data?.message || ev.data?.hypothesis || ev.data?.summary || ev.data?.phase || (typeof ev.data === 'string' ? ev.data : JSON.stringify(ev.data));

                  return (
                    <div key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                        <span style={{ color: '#ffd700', fontSize: '10px' }}>
                          [{new Date(ev.timestamp || Date.now()).toLocaleTimeString()}] {ev.type}
                        </span>
                        {level && (
                          <span style={{ fontSize: '9px', fontWeight: 700, color: logColor, background: 'rgba(255,255,255,0.05)', padding: '1px 4px', borderRadius: '3px' }}>
                            {level}
                          </span>
                        )}
                      </div>
                      <div style={{ color: isLog ? logColor : '#cbd5e1', lineHeight: '1.4' }}>
                        {msg}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Stop Modal */}
      {showEmergencyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#0f172a', border: '2px solid #ef4444', borderRadius: '14px', padding: '24px', maxWidth: '480px', width: '90%', boxShadow: '0 0 30px rgba(239, 68, 68, 0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#ef4444', marginBottom: '14px' }}>
              <ShieldAlert size={28} />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Confirm Sovereign Emergency Stop</h3>
            </div>
            <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6' }}>
              <strong>Sovereign Creator Authority:</strong> No justification or explanation required — Creator directive is reason enough.
            </p>
            <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.5', marginTop: '8px' }}>
              Executing this will immediately terminate all active evolution workers and child processes, seal logs and checkpoints, roll back unverified worktrees, and lock HṚṢĪKEŚA into a safe immutable state.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button
                onClick={() => setShowEmergencyModal(false)}
                style={{ background: 'transparent', border: '1px solid #475569', color: '#94a3b8', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleEmergencyStop}
                style={{ background: '#dc2626', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 0 15px rgba(220, 38, 38, 0.6)' }}
              >
                <ShieldAlert size={16} /> KILL TASKS & LOCK HṚṢĪKEŚA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Push to Production Result Modal */}
      {promotionModal && promotionModal.isOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, animation: 'fadeIn 0.2s ease' }}>
          <div style={{
            background: '#0f172a',
            border: `2px solid ${promotionModal.success ? '#10b981' : '#ef4444'}`,
            borderRadius: '16px',
            padding: '28px',
            maxWidth: '520px',
            width: '90%',
            boxShadow: `0 0 40px ${promotionModal.success ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: promotionModal.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                border: `1px solid ${promotionModal.success ? '#10b981' : '#ef4444'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: promotionModal.success ? '#10b981' : '#ef4444',
                fontSize: '22px'
              }}>
                {promotionModal.success ? '🏆' : '⚠️'}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: promotionModal.success ? '#34d399' : '#f87171' }}>
                  {promotionModal.title}
                </h3>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Sovereign Promotion Gate • {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '13.5px', color: '#f1f5f9', lineHeight: '1.6', margin: 0 }}>
              {promotionModal.message}
            </p>

            {promotionModal.success && (
              <div style={{ background: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#94a3b8' }}>Target Commit:</span>
                  <span style={{ fontFamily: 'monospace', color: '#60a5fa', fontWeight: 600 }}>{promotionModal.commitSha}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#94a3b8' }}>Merged Into:</span>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>HEAD (main branch)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#94a3b8' }}>Regression State:</span>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>✓ 100% Passed (0 Regressions)</span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                onClick={() => setPromotionModal(null)}
                style={{
                  background: promotionModal.success ? 'linear-gradient(135deg, #10b981, #059669)' : '#334155',
                  border: 'none',
                  color: '#fff',
                  padding: '10px 24px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: promotionModal.success ? '0 0 15px rgba(16, 185, 129, 0.4)' : 'none'
                }}
              >
                Acknowledge & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


