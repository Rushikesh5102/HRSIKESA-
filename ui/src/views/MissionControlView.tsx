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
    const s = status.toUpperCase();
    if (s === 'COMPLETED' || s === 'VERIFIED') {
      return <span className="px-2 py-0.5 text-xs rounded font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">COMPLETED</span>;
    }
    if (s === 'EXECUTING' || s === 'RUNNING' || s === 'IN_PROGRESS') {
      return <span className="px-2 py-0.5 text-xs rounded font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">EXECUTING</span>;
    }
    if (s === 'AWAITING_APPROVAL') {
      return <span className="px-2 py-0.5 text-xs rounded font-medium bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">APPROVAL REQUIRED</span>;
    }
    if (s === 'PAUSED' || s === 'BLOCKED') {
      return <span className="px-2 py-0.5 text-xs rounded font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">BLOCKED</span>;
    }
    return <span className="px-2 py-0.5 text-xs rounded font-medium bg-slate-500/20 text-slate-300 border border-slate-500/30">{status}</span>;
  };

  return (
    <IndianFrame title="हृषीकेश — UNIVERSAL AGENTIC MISSION & WORKFORCE RUNTIME" subtitle="FP-14: Autonomous Workforce Orchestration, Dynamic Agent Assignment & Verified Outcomes">
      <div className="space-y-6">
        {/* Top Objective Submission Bar */}
        <div className="bg-[#121824]/90 border border-amber-500/30 rounded-lg p-4 shadow-xl backdrop-blur">
          <form onSubmit={handleSubmitObjective} className="flex gap-3">
            <div className="relative flex-1">
              <Compass className="absolute left-3 top-3.5 w-5 h-5 text-amber-400/70" />
              <input
                type="text"
                value={objectiveInput}
                onChange={(e) => setObjectiveInput(e.target.value)}
                placeholder="Give HṚṢĪKEŚA an objective (e.g. 'Build a high-performance web application', 'Research market and launch SaaS', 'Fix all failing tests in project')..."
                className="w-full bg-[#0b0f17] border border-amber-500/20 rounded-md pl-10 pr-4 py-3 text-sm text-amber-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !objectiveInput.trim()}
              className="px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold rounded-md flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Sparkles className="w-4 h-4" />
              Compile & Launch Mission
            </button>
          </form>
        </div>

        {/* Main Grid: Left Mission List, Right Detail Explorer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Missions List */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-[#121824]/80 border border-amber-500/20 rounded-lg p-4 shadow-lg">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-amber-300 flex items-center gap-2">
                  <Target className="w-4 h-4 text-amber-400" />
                  Missions Queue ({missions.length})
                </h3>
                <button
                  onClick={fetchMissions}
                  className="p-1 hover:bg-amber-500/10 rounded text-amber-400/80 hover:text-amber-300 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {missions.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    No active or queued missions. Submit an objective above to initiate autonomous workforce execution.
                  </div>
                ) : (
                  missions.map((m) => (
                    <div
                      key={m.missionId}
                      onClick={() => setSelectedMissionId(m.missionId)}
                      className={`p-3 rounded-lg border cursor-pointer transition ${
                        selectedMissionId === m.missionId
                          ? 'bg-amber-950/40 border-amber-400 shadow-md'
                          : 'bg-[#0b0f17]/80 border-slate-800 hover:border-amber-500/40'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-sm text-slate-200 line-clamp-1">{m.title}</span>
                        {getStatusBadge(m.status)}
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2 mb-2">{m.objective}</p>
                      <div className="flex justify-between items-center text-[11px] text-slate-500">
                        <span className="text-amber-400/80">Priority: {m.priority}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400 font-medium">{m.progress}%</span>
                          <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full transition-all"
                              style={{ width: `${m.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Active Mission Detail & Tabs */}
          <div className="lg:col-span-8 space-y-4">
            {selectedMission ? (
              <div className="bg-[#121824]/90 border border-amber-500/20 rounded-lg p-5 shadow-xl">
                {/* Mission Header */}
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-bold text-amber-200">{selectedMission.title}</h2>
                      {getStatusBadge(selectedMission.status)}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{selectedMission.objective}</p>
                  </div>

                  {/* Execution Control Actions */}
                  <div className="flex items-center gap-2">
                    {selectedMission.status === 'PENDING' || selectedMission.status === 'READY' ? (
                      <button
                        onClick={() => handleStart(selectedMission.missionId)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded flex items-center gap-1.5 transition shadow"
                      >
                        <Play className="w-3.5 h-3.5" /> Start
                      </button>
                    ) : null}

                    {selectedMission.status === 'EXECUTING' || selectedMission.status === 'RUNNING' ? (
                      <button
                        onClick={() => handlePause(selectedMission.missionId)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded flex items-center gap-1.5 transition shadow"
                      >
                        <Pause className="w-3.5 h-3.5" /> Pause
                      </button>
                    ) : null}

                    {selectedMission.status === 'PAUSED' ? (
                      <button
                        onClick={() => handleResume(selectedMission.missionId)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded flex items-center gap-1.5 transition shadow"
                      >
                        <Play className="w-3.5 h-3.5" /> Resume
                      </button>
                    ) : null}

                    <button
                      onClick={() => setIsReplanning(!isReplanning)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs rounded flex items-center gap-1.5 transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Replan
                    </button>

                    {selectedMission.status !== 'COMPLETED' && selectedMission.status !== 'CANCELLED' ? (
                      <button
                        onClick={() => handleCancel(selectedMission.missionId)}
                        className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/30 text-xs rounded flex items-center gap-1.5 transition"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Cancel
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* Inline Replan Form */}
                {isReplanning && (
                  <div className="my-3 p-3 bg-amber-950/30 border border-amber-500/40 rounded flex gap-2">
                    <input
                      type="text"
                      value={replanReason}
                      onChange={(e) => setReplanReason(e.target.value)}
                      placeholder="Reason for replanning (e.g. 'Requirements updated: add OAuth GitHub integration')..."
                      className="flex-1 bg-[#0b0f17] border border-amber-500/30 rounded px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      onClick={() => handleReplan(selectedMission.missionId)}
                      disabled={!replanReason.trim()}
                      className="px-4 py-1.5 bg-amber-500 text-slate-950 font-bold text-xs rounded hover:bg-amber-400 disabled:opacity-50"
                    >
                      Apply Replan
                    </button>
                  </div>
                )}

                {/* Navigation Tabs */}
                <div className="flex border-b border-slate-800 my-4 text-xs font-medium space-x-1 overflow-x-auto">
                  {(['overview', 'outcomes', 'tasks', 'workforce', 'blackboard', 'artifacts', 'report'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-2 border-b-2 capitalize transition flex items-center gap-1.5 ${
                        activeTab === tab
                          ? 'border-amber-400 text-amber-300 font-semibold'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {tab === 'outcomes' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {tab === 'tasks' && <Layers className="w-3.5 h-3.5" />}
                      {tab === 'workforce' && <Users className="w-3.5 h-3.5" />}
                      {tab === 'blackboard' && <Database className="w-3.5 h-3.5" />}
                      {tab === 'artifacts' && <FileText className="w-3.5 h-3.5" />}
                      {tab === 'report' && <ShieldCheck className="w-3.5 h-3.5" />}
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 bg-[#0b0f17] border border-slate-800 rounded">
                        <span className="text-slate-500">Health</span>
                        <div className="text-sm font-bold text-amber-300 mt-1">{selectedMission.health || 'HEALTHY'}</div>
                      </div>
                      <div className="p-3 bg-[#0b0f17] border border-slate-800 rounded">
                        <span className="text-slate-500">Progress</span>
                        <div className="text-sm font-bold text-emerald-400 mt-1">{selectedMission.progress}%</div>
                      </div>
                      <div className="p-3 bg-[#0b0f17] border border-slate-800 rounded">
                        <span className="text-slate-500">Outcomes</span>
                        <div className="text-sm font-bold text-slate-200 mt-1">{outcomes.length}</div>
                      </div>
                      <div className="p-3 bg-[#0b0f17] border border-slate-800 rounded">
                        <span className="text-slate-500">Tasks</span>
                        <div className="text-sm font-bold text-slate-200 mt-1">{tasks.length}</div>
                      </div>
                    </div>

                    {/* Pending Human Approvals Alert */}
                    {tasks.some((t) => t.status === 'AWAITING_APPROVAL') && (
                      <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-lg">
                        <div className="flex items-center gap-2 text-rose-400 font-bold mb-2">
                          <AlertTriangle className="w-4 h-4" />
                          Human Authority Approvals Required
                        </div>
                        <div className="space-y-2">
                          {tasks
                            .filter((t) => t.status === 'AWAITING_APPROVAL')
                            .map((t) => (
                              <div key={t.taskId} className="flex justify-between items-center bg-[#0b0f17] p-2.5 rounded border border-rose-900/50">
                                <div>
                                  <div className="font-semibold text-slate-200">{t.title}</div>
                                  <div className="text-[11px] text-slate-400">Agent: {t.assignedAgent || 'Gāṇḍīva'} | Risk: HIGH</div>
                                </div>
                                <button
                                  onClick={() => handleApproveTask(t.taskId)}
                                  className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-emerald-500 text-slate-950 font-bold text-xs rounded hover:brightness-110 shadow"
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
                  <div className="space-y-3">
                    {outcomes.map((o) => (
                      <div key={o.outcomeId} className="p-3 bg-[#0b0f17] border border-slate-800 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="font-semibold text-sm text-slate-200">{o.description}</div>
                          <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                            o.status === 'VERIFIED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700 text-slate-300'
                          }`}>
                            {o.status} ({Math.round((o.confidence || 1) * 100)}% conf)
                          </span>
                        </div>
                        {o.acceptanceCriteria && o.acceptanceCriteria.length > 0 && (
                          <div className="mt-2 text-xs text-slate-400">
                            <span className="text-amber-400/80 font-medium">Acceptance Criteria:</span>
                            <ul className="list-disc list-inside mt-1 space-y-0.5">
                              {o.acceptanceCriteria.map((c: string, i: number) => (
                                <li key={i}>{c}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {o.evidence && o.evidence.length > 0 && (
                          <div className="mt-2 text-xs text-emerald-400/80 bg-emerald-950/20 p-2 rounded border border-emerald-900/40">
                            <span className="font-medium text-emerald-300">Verified Evidence:</span>
                            <div className="mt-0.5">{o.evidence.join('; ')}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'tasks' && (
                  <div className="space-y-2">
                    {tasks.map((t) => (
                      <div key={t.taskId} className="p-3 bg-[#0b0f17] border border-slate-800 rounded flex justify-between items-center text-xs">
                        <div>
                          <div className="font-semibold text-slate-200">{t.title}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-3 mt-0.5">
                            <span className="text-amber-400">Agent: {t.assignedAgent || 'Auto-Allocated'}</span>
                            <span>Kind: {t.executionKind}</span>
                            {t.retryCount > 0 && <span className="text-yellow-400">Retries: {t.retryCount}</span>}
                          </div>
                        </div>
                        <div>{getStatusBadge(t.status)}</div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'workforce' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {capacities.map((c) => (
                      <div key={c.agentName} className="p-3 bg-[#0b0f17] border border-slate-800 rounded">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-amber-300">{c.agentName}</span>
                          <span className={`px-1.5 py-0.5 text-[10px] rounded ${
                            c.status === 'AVAILABLE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {c.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">{c.specialization}</div>
                        <div className="flex justify-between text-[11px] text-slate-500 mt-2">
                          <span>Active Tasks: {c.activeTasks}</span>
                          <span>Workload: {c.currentWorkloadScore}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'blackboard' && (
                  <div className="space-y-2 text-xs">
                    {blackboard.length === 0 ? (
                      <div className="text-center py-6 text-slate-500">Blackboard is clear.</div>
                    ) : (
                      blackboard.map((b) => (
                        <div key={b.entryId} className="p-3 bg-[#0b0f17] border border-slate-800 rounded">
                          <div className="flex justify-between items-center text-slate-400 text-[11px]">
                            <span className="font-semibold text-amber-300">[{b.type}] {b.title}</span>
                            <span>{b.author} • {new Date(b.createdAt).toLocaleTimeString()}</span>
                          </div>
                          <div className="text-slate-300 mt-1">{b.content}</div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'artifacts' && (
                  <div className="space-y-2 text-xs">
                    {artifacts.length === 0 ? (
                      <div className="text-center py-6 text-slate-500">No artifacts registered yet.</div>
                    ) : (
                      artifacts.map((a) => (
                        <div key={a.artifactId} className="p-3 bg-[#0b0f17] border border-slate-800 rounded flex justify-between items-center">
                          <div>
                            <div className="font-semibold text-slate-200">{a.name}</div>
                            <div className="text-[11px] text-slate-400">{a.location} (Type: {a.type})</div>
                          </div>
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-xs">
                            {a.verificationState}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'report' && (
                  <div className="text-xs">
                    {report ? (
                      <pre className="p-4 bg-[#0b0f17] border border-slate-800 rounded text-amber-100 overflow-x-auto">
                        {JSON.stringify(report, null, 2)}
                      </pre>
                    ) : (
                      <div className="text-center py-6 text-slate-500">No report generated yet.</div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#121824]/60 border border-slate-800 rounded-lg p-12 text-center text-slate-500 text-sm">
                Select a mission from the queue or submit an objective to view real-time workforce orchestration.
              </div>
            )}
          </div>
        </div>
      </div>
    </IndianFrame>
  );
};
