import React, { useState, useEffect, useCallback } from 'react';
import {
  Compass,
  Play,
  Pause,
  RotateCcw,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Users,
  Layers,
  FileText,
  ShieldCheck,
  Zap,
  Activity,
  Sparkles,
  Search,
  RefreshCw,
  Clock,
  Target,
  ArrowRight,
  Database,
  Cpu
} from 'lucide-react';
import { api } from '../services/api';
import { IndianFrame } from '../components/IndianFrame';

export const MissionControlView: React.FC = () => {
  const [missions, setMissions] = useState<any[]>([]);
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [selectedMission, setSelectedMission] = useState<any | null>(null);
  const [outcomes, setOutcomes] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [blackboard, setBlackboard] = useState<any[]>([]);
  const [report, setReport] = useState<any | null>(null);
  const [capacities, setCapacities] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'outcomes' | 'tasks' | 'workforce' | 'blackboard' | 'artifacts' | 'report'>('overview');
  const [objectiveInput, setObjectiveInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [replanReason, setReplanReason] = useState('');
  const [isReplanning, setIsReplanning] = useState(false);

  const fetchMissions = useCallback(async () => {
    try {
      const res = await api.getRuntimeMissions();
      if (res.success && res.data) {
        setMissions(res.data);
        if (!selectedMissionId && res.data.length > 0) {
          setSelectedMissionId(res.data[0].missionId);
        }
      }
      const capRes = await api.getWorkforceCapacities();
      if (capRes.success && capRes.data) {
        setCapacities(capRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch missions', err);
    }
  }, [selectedMissionId]);

  const fetchMissionDetails = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const [mRes, oRes, tRes, aRes, bRes, rRes] = await Promise.allSettled([
        api.getRuntimeMission(id),
        api.getRuntimeMissionOutcomes(id),
        api.getRuntimeMissionTasks(id),
        api.getRuntimeMissionArtifacts(id),
        api.getRuntimeMissionBlackboard(id),
        api.getRuntimeMissionReport(id)
      ]);

      if (mRes.status === 'fulfilled' && mRes.value.success) setSelectedMission(mRes.value.data);
      if (oRes.status === 'fulfilled' && oRes.value.success) setOutcomes(oRes.value.data || []);
      if (tRes.status === 'fulfilled' && tRes.value.success) setTasks(tRes.value.data || []);
      if (aRes.status === 'fulfilled' && aRes.value.success) setArtifacts(aRes.value.data || []);
      if (bRes.status === 'fulfilled' && bRes.value.success) setBlackboard(bRes.value.data || []);
      if (rRes.status === 'fulfilled' && rRes.value.success) setReport(rRes.value.data || null);
    } catch (err) {
      console.error('Failed to fetch mission details', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMissions();
    const unsub = api.subscribeMissionEvents(() => {
      fetchMissions();
      if (selectedMissionId) {
        fetchMissionDetails(selectedMissionId);
      }
    });
    const interval = setInterval(fetchMissions, 5000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [fetchMissions, selectedMissionId, fetchMissionDetails]);

  useEffect(() => {
    if (selectedMissionId) {
      fetchMissionDetails(selectedMissionId);
    }
  }, [selectedMissionId, fetchMissionDetails]);

  const handleSubmitObjective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!objectiveInput.trim()) return;
    setLoading(true);
    try {
      const res = await api.submitMissionObjective(objectiveInput.trim(), { owner: 'Rushikesh', autoStart: true });
      if (res.success && res.data?.mission) {
        setObjectiveInput('');
        setSelectedMissionId(res.data.mission.missionId);
        await fetchMissions();
      }
    } catch (err) {
      alert(`Error creating mission: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (id: string) => {
    await api.startRuntimeMission(id);
    fetchMissions();
    fetchMissionDetails(id);
  };

  const handlePause = async (id: string) => {
    await api.pauseRuntimeMission(id, 'Paused via Mission Control UI');
    fetchMissions();
    fetchMissionDetails(id);
  };

  const handleResume = async (id: string) => {
    await api.resumeRuntimeMission(id);
    fetchMissions();
    fetchMissionDetails(id);
  };

  const handleCancel = async (id: string) => {
    if (confirm('Cancel this active mission?')) {
      await api.cancelRuntimeMission(id, 'Cancelled via Mission Control UI');
      fetchMissions();
      fetchMissionDetails(id);
    }
  };

  const handleReplan = async (id: string) => {
    if (!replanReason.trim()) return;
    await api.replanRuntimeMission(id, replanReason.trim(), 'Rushikesh');
    setReplanReason('');
    setIsReplanning(false);
    fetchMissions();
    fetchMissionDetails(id);
  };

  const handleApproveTask = async (taskId: string) => {
    if (!selectedMissionId) return;
    await api.approveMissionTask(selectedMissionId, taskId, 'Rushikesh');
    fetchMissions();
    fetchMissionDetails(selectedMissionId);
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'COMPLETED' || s === 'VERIFIED') {
      return (
        <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: 'rgba(0, 196, 168, 0.15)', color: 'var(--accent-teal)', border: '1px solid rgba(0, 196, 168, 0.35)' }}>
          ● COMPLETED
        </span>
      );
    }
    if (s === 'EXECUTING' || s === 'RUNNING' || s === 'IN_PROGRESS') {
      return (
        <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: 'rgba(232, 184, 48, 0.18)', color: 'var(--accent-gold-bright)', border: '1px solid rgba(232, 184, 48, 0.4)' }}>
          ⚡ EXECUTING
        </span>
      );
    }
    if (s === 'AWAITING_APPROVAL') {
      return (
        <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 800, background: 'rgba(225, 29, 72, 0.2)', color: '#FDA4AF', border: '1px solid rgba(225, 29, 72, 0.5)' }}>
          ⚠️ APPROVAL REQ
        </span>
      );
    }
    if (s === 'PAUSED' || s === 'BLOCKED') {
      return (
        <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: 'rgba(245, 158, 11, 0.2)', color: '#FCD34D', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
          ⏸️ {status}
        </span>
      );
    }
    return (
      <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
        {status}
      </span>
    );
  };

  return (
    <IndianFrame title="HṚṢĪKEŚA — UNIVERSAL AGENTIC MISSION & WORKFORCE RUNTIME" subtitle="Autonomous Workforce Orchestration, Dynamic Agent Assignment & Verified Outcomes">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Top Objective Submission Bar */}
        <div
          style={{
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            boxShadow: 'var(--shadow-md)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <form onSubmit={handleSubmitObjective} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Compass style={{ position: 'absolute', left: '14px', top: '12px', width: '20px', height: '20px', color: 'var(--accent-gold)' }} />
              <input
                type="text"
                value={objectiveInput}
                onChange={(e) => setObjectiveInput(e.target.value)}
                placeholder="Give HṚṢĪKEŚA an objective (e.g. 'Build a high-performance web application', 'Research market and launch SaaS', 'Fix all failing tests in project')..."
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '11px 16px 11px 44px',
                  fontSize: '13.5px',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !objectiveInput.trim()}
              className="btn btn-primary"
              style={{
                padding: '11px 22px',
                fontSize: '13.5px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
              }}
            >
              <Sparkles size={16} />
              Compile & Launch Mission
            </button>
          </form>
        </div>

        {/* Main Grid: Left Mission List, Right Detail Explorer */}
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '20px', alignItems: 'start' }}>
          {/* Left Column: Missions List */}
          <div
            style={{
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              boxShadow: 'var(--shadow-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: 'var(--accent-gold-bright)', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <Target size={16} color="var(--accent-gold)" />
                Missions Queue ({missions.length})
              </h3>
              <button
                onClick={fetchMissions}
                className="btn btn-secondary"
                style={{ padding: '4px 8px', fontSize: '11px', height: '26px' }}
                title="Refresh queue"
              >
                <RefreshCw size={12} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '600px', overflowY: 'auto', paddingRight: '4px' }}>
              {missions.length === 0 ? (
                <div style={{ padding: '36px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                  No active or queued missions. Submit an objective above to initiate autonomous workforce execution.
                </div>
              ) : (
                missions.map((m) => {
                  const isSelected = selectedMissionId === m.missionId;
                  return (
                    <div
                      key={m.missionId}
                      onClick={() => setSelectedMissionId(m.missionId)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-sm)',
                        border: `1px solid ${isSelected ? 'var(--accent-gold)' : 'var(--border-subtle)'}`,
                        background: isSelected ? 'rgba(200, 146, 14, 0.16)' : 'var(--bg-card)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px', color: isSelected ? 'var(--accent-gold-bright)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.title || `Mission ${m.missionId?.slice(0, 8)}`}
                        </span>
                        {getStatusBadge(m.status)}
                      </div>
                      <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4' }}>
                        {m.objective}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '11px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Priority: {m.priority || 'Normal'}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: 'var(--accent-teal)', fontWeight: 700 }}>{m.progress || 0}%</span>
                          <div style={{ width: '50px', height: '5px', background: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${m.progress || 0}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, var(--accent-gold), var(--accent-teal))',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Active Mission Detail & Tabs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {selectedMission ? (
              <div
                style={{
                  background: 'var(--bg-glass)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                {/* Mission Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-cinzel)' }}>
                        {selectedMission.title}
                      </h2>
                      {getStatusBadge(selectedMission.status)}
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                      {selectedMission.objective}
                    </p>
                  </div>

                  {/* Execution Control Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {(selectedMission.status === 'PENDING' || selectedMission.status === 'READY') && (
                      <button
                        onClick={() => handleStart(selectedMission.missionId)}
                        className="btn btn-primary"
                        style={{ fontSize: '12px', padding: '6px 14px', background: 'var(--accent-teal)', color: '#0A0602' }}
                      >
                        <Play size={13} /> Start
                      </button>
                    )}

                    {(selectedMission.status === 'EXECUTING' || selectedMission.status === 'RUNNING') && (
                      <button
                        onClick={() => handlePause(selectedMission.missionId)}
                        className="btn btn-secondary"
                        style={{ fontSize: '12px', padding: '6px 14px', color: 'var(--accent-gold-bright)' }}
                      >
                        <Pause size={13} /> Pause
                      </button>
                    )}

                    {selectedMission.status === 'PAUSED' && (
                      <button
                        onClick={() => handleResume(selectedMission.missionId)}
                        className="btn btn-primary"
                        style={{ fontSize: '12px', padding: '6px 14px' }}
                      >
                        <Play size={13} /> Resume
                      </button>
                    )}

                    <button
                      onClick={() => setIsReplanning(!isReplanning)}
                      className="btn btn-secondary"
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                    >
                      <RotateCcw size={13} /> Replan
                    </button>

                    {selectedMission.status !== 'COMPLETED' && selectedMission.status !== 'CANCELLED' && (
                      <button
                        onClick={() => handleCancel(selectedMission.missionId)}
                        className="btn btn-secondary"
                        style={{ fontSize: '12px', padding: '6px 12px', color: '#FDA4AF', borderColor: 'rgba(225, 29, 72, 0.4)' }}
                      >
                        <XCircle size={13} /> Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Replan Form */}
                {isReplanning && (
                  <div style={{ marginTop: '14px', padding: '12px', background: 'rgba(200, 146, 14, 0.12)', border: '1px solid var(--accent-gold)', borderRadius: 'var(--radius-sm)', display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={replanReason}
                      onChange={(e) => setReplanReason(e.target.value)}
                      placeholder="Reason for replanning (e.g. 'Requirements updated: add OAuth GitHub integration')..."
                      style={{
                        flex: 1,
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '8px 12px',
                        fontSize: '12px',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <button
                      onClick={() => handleReplan(selectedMission.missionId)}
                      disabled={!replanReason.trim()}
                      className="btn btn-primary"
                      style={{ padding: '8px 16px', fontSize: '12px' }}
                    >
                      Apply Replan
                    </button>
                  </div>
                )}

                {/* Navigation Tabs */}
                <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--border-subtle)', margin: '16px 0', overflowX: 'auto', paddingBottom: '2px' }}>
                  {(['overview', 'outcomes', 'tasks', 'workforce', 'blackboard', 'artifacts', 'report'] as const).map((tab) => {
                    const isActive = activeTab === tab;
                    return (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                          padding: '8px 14px',
                          border: 'none',
                          borderBottom: `2px solid ${isActive ? 'var(--accent-gold)' : 'transparent'}`,
                          background: 'transparent',
                          color: isActive ? 'var(--accent-gold-bright)' : 'var(--text-secondary)',
                          fontSize: '12px',
                          fontWeight: isActive ? 700 : 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          textTransform: 'capitalize',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {tab === 'outcomes' && <CheckCircle2 size={13} />}
                        {tab === 'tasks' && <Layers size={13} />}
                        {tab === 'workforce' && <Users size={13} />}
                        {tab === 'blackboard' && <Database size={13} />}
                        {tab === 'artifacts' && <FileText size={13} />}
                        {tab === 'report' && <ShieldCheck size={13} />}
                        {tab}
                      </button>
                    );
                  })}
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {/* Metrics Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                      <div style={{ padding: '12px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Health</span>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--accent-gold-bright)', marginTop: '4px' }}>
                          {selectedMission.health || 'HEALTHY'}
                        </div>
                      </div>
                      <div style={{ padding: '12px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Progress</span>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--accent-teal)', marginTop: '4px' }}>
                          {selectedMission.progress || 0}%
                        </div>
                      </div>
                      <div style={{ padding: '12px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Outcomes</span>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                          {outcomes.length}
                        </div>
                      </div>
                      <div style={{ padding: '12px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tasks</span>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                          {tasks.length}
                        </div>
                      </div>
                    </div>

                    {/* Live Mission DAG Execution Graph */}
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--accent-gold-bright)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Activity size={14} color="var(--accent-teal)" />
                          Live Mission Execution DAG & Agent Handoffs
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          Topology: Multi-Tier Sovereign Pipeline
                        </span>
                      </div>

                      <div style={{ padding: '14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', overflowX: 'auto' }}>
                        {tasks.length > 0 ? (
                          <div style={{ minWidth: '480px', display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 0' }}>
                            {tasks.map((t, i, arr) => (
                              <React.Fragment key={t.taskId || i}>
                                <div
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    border: `1px solid ${
                                      t.status === 'COMPLETED' || t.status === 'VERIFIED'
                                        ? 'rgba(0, 196, 168, 0.4)'
                                        : t.status === 'RUNNING' || t.status === 'EXECUTING'
                                        ? 'var(--accent-gold)'
                                        : 'var(--border-subtle)'
                                    }`,
                                    background:
                                      t.status === 'COMPLETED' || t.status === 'VERIFIED'
                                        ? 'rgba(0, 196, 168, 0.12)'
                                        : t.status === 'RUNNING' || t.status === 'EXECUTING'
                                        ? 'rgba(200, 146, 14, 0.15)'
                                        : 'var(--bg-card)',
                                    minWidth: '120px',
                                    textAlign: 'center',
                                  }}
                                >
                                  <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                                    {t.assignedAgent || 'Specialist'}
                                  </span>
                                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px' }} title={t.title}>
                                    {t.title}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: '9.5px',
                                      marginTop: '6px',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontWeight: 700,
                                      background: t.status === 'COMPLETED' ? 'rgba(0, 196, 168, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                                      color: t.status === 'COMPLETED' ? 'var(--accent-teal)' : 'var(--text-muted)',
                                    }}
                                  >
                                    {t.status}
                                  </span>
                                </div>
                                {i < arr.length - 1 && (
                                  <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <div style={{ width: '20px', height: '2px', background: t.status === 'COMPLETED' ? 'var(--accent-teal)' : 'var(--border-color)' }} />
                                    <ArrowRight size={14} color={t.status === 'COMPLETED' ? 'var(--accent-teal)' : 'var(--text-muted)'} style={{ marginLeft: '-4px' }} />
                                  </div>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '12px' }}>
                            No task nodes registered in mission graph yet. Decomposition will appear here once planned.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Timeline & Blackboard Feed */}
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--accent-gold-bright)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Clock size={14} color="var(--accent-gold)" />
                          Live Event Timeline & Blackboard Telemetry
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Real-time telemetry</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {blackboard.length > 0 ? (
                          blackboard.map((b, idx) => (
                            <div key={b.entryId || idx} style={{ padding: '10px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ color: 'var(--accent-gold-bright)', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700 }}>
                                    {b.createdAt ? new Date(b.createdAt).toLocaleTimeString() : 'Live'}
                                  </span>
                                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '12px', textTransform: 'capitalize' }}>
                                    {b.author || 'System'}
                                  </span>
                                </div>
                                <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '9.5px', fontWeight: 700, background: 'rgba(0, 196, 168, 0.15)', color: 'var(--accent-teal)' }}>
                                  {b.type || 'INFO'}
                                </span>
                              </div>
                              <p style={{ margin: '4px 0 0', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '12px' }}>{b.title}</p>
                              {b.content && <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: '11.5px' }}>{b.content}</p>}
                            </div>
                          ))
                        ) : (
                          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '12px' }}>
                            No telemetry events recorded on blackboard yet. Active mission activity will stream here in real-time.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Pending Human Approvals Alert */}
                    {tasks.some((t) => t.status === 'AWAITING_APPROVAL') && (
                      <div style={{ padding: '16px', background: 'rgba(225, 29, 72, 0.15)', border: '1px solid var(--accent-rose)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FDA4AF', fontWeight: 700, fontSize: '13px', marginBottom: '10px' }}>
                          <AlertTriangle size={16} />
                          Human Authority Approvals Required
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {tasks
                            .filter((t) => t.status === 'AWAITING_APPROVAL')
                            .map((t) => (
                              <div key={t.taskId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-card)', borderRadius: '6px', border: '1px solid rgba(225, 29, 72, 0.3)' }}>
                                <div>
                                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '12.5px' }}>{t.title}</div>
                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Agent: {t.assignedAgent || 'Manyu'} | Risk: High</div>
                                </div>
                                <button
                                  onClick={() => handleApproveTask(t.taskId)}
                                  className="btn btn-primary"
                                  style={{ padding: '6px 14px', fontSize: '11.5px', background: 'var(--accent-teal)', color: '#0A0602' }}
                                >
                                  Approve & Continue
                                </button>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'outcomes' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {outcomes.length === 0 ? (
                      <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>No verified outcomes recorded for this mission yet.</div>
                    ) : (
                      outcomes.map((o) => (
                        <div key={o.outcomeId} style={{ padding: '12px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{o.description}</div>
                            <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: o.status === 'VERIFIED' ? 'rgba(0, 196, 168, 0.15)' : 'var(--bg-card)', color: o.status === 'VERIFIED' ? 'var(--accent-teal)' : 'var(--text-secondary)' }}>
                              {o.status} ({Math.round((o.confidence || 1) * 100)}% conf)
                            </span>
                          </div>
                          {o.acceptanceCriteria && o.acceptanceCriteria.length > 0 && (
                            <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                              <span style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>Criteria: </span>
                              {o.acceptanceCriteria.join(' • ')}
                            </div>
                          )}
                          {o.evidence && o.evidence.length > 0 && (
                            <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(0, 196, 168, 0.08)', borderRadius: '4px', border: '1px solid rgba(0, 196, 168, 0.25)', fontSize: '11.5px', color: 'var(--accent-teal)' }}>
                              <span style={{ fontWeight: 700 }}>Verified Evidence: </span>
                              {o.evidence.join('; ')}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'tasks' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {tasks.map((t) => (
                      <div key={t.taskId} style={{ padding: '12px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.title}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '12px', marginTop: '3px' }}>
                            <span style={{ color: 'var(--accent-gold)' }}>Agent: {t.assignedAgent || 'Auto-Allocated'}</span>
                            <span>Kind: {t.executionKind || 'Default'}</span>
                            {t.retryCount > 0 && <span style={{ color: 'var(--accent-saffron)' }}>Retries: {t.retryCount}</span>}
                          </div>
                        </div>
                        <div>{getStatusBadge(t.status)}</div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'workforce' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                    {capacities.map((c) => (
                      <div key={c.agentName} style={{ padding: '12px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, color: 'var(--accent-gold-bright)', fontSize: '13px' }}>{c.agentName}</span>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 700, background: c.status === 'AVAILABLE' ? 'rgba(0, 196, 168, 0.15)' : 'rgba(200, 146, 14, 0.15)', color: c.status === 'AVAILABLE' ? 'var(--accent-teal)' : 'var(--accent-gold)' }}>
                            {c.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>{c.specialization}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                          <span>Active Tasks: {c.activeTasks}</span>
                          <span>Workload: {c.currentWorkloadScore}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'blackboard' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {blackboard.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '12px' }}>Blackboard is clear.</div>
                    ) : (
                      blackboard.map((b) => (
                        <div key={b.entryId} style={{ padding: '12px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                            <span style={{ fontWeight: 700, color: 'var(--accent-gold-bright)' }}>[{b.type}] {b.title}</span>
                            <span>{b.author} • {new Date(b.createdAt).toLocaleTimeString()}</span>
                          </div>
                          <div style={{ color: 'var(--text-primary)', marginTop: '4px', fontSize: '12px' }}>{b.content}</div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'artifacts' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {artifacts.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '12px' }}>No artifacts registered yet.</div>
                    ) : (
                      artifacts.map((a) => (
                        <div key={a.artifactId} style={{ padding: '12px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>{a.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{a.location} (Type: {a.type})</div>
                          </div>
                          <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: 'rgba(0, 196, 168, 0.15)', color: 'var(--accent-teal)' }}>
                            {a.verificationState}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'report' && (
                  <div>
                    {report ? (
                      <pre style={{ padding: '16px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '11.5px', fontFamily: 'var(--font-mono)', overflowX: 'auto' }}>
                        {JSON.stringify(report, null, 2)}
                      </pre>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '12px' }}>No report generated yet.</div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  background: 'var(--bg-glass)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '48px 24px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                }}
              >
                Select a mission from the queue or submit an objective above to view real-time workforce orchestration.
              </div>
            )}
          </div>
        </div>
      </div>
    </IndianFrame>
  );
};
