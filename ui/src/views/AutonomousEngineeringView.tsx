/**
 * HṚṢĪKEŚA — Autonomous Software Engineering Engine View
 *
 * FP-10: Complete UI console for autonomous software engineering, live task
 * execution timelines, requirement extractions, structured actions, diagnostics,
 * model-driven repair cycles, diff review, and anti-loop convergence status.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu,
  Play,
  Pause,
  RotateCcw,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Terminal,
  Activity,
  Shield,
  Layers,
  Sparkles,
  GitCommit,
  RefreshCw,
  Search,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface EngineeringTask {
  id: string;
  workspaceId: string;
  projectId?: string;
  objective: string;
  status: string;
  priority: string;
  complexity: string;
  currentPhase: string;
  attemptCount: number;
  maxAttempts: number;
  modelCalls: number;
  toolCalls: number;
  changedFiles: string[];
  testsRun: number;
  verificationState: string;
  failureReason?: string;
  finalSummary?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

interface EngineeringPlan {
  id: string;
  taskId: string;
  architectureSummary: string;
  targetFiles: string[];
  steps: Array<{
    sequence: number;
    title: string;
    description: string;
    actionType: string;
    dangerTier: number;
  }>;
  verificationPlan: string[];
  riskLevel: string;
}

interface DiagnosticItem {
  id: string;
  category: string;
  confidence: string;
  message: string;
  file?: string;
  line?: number;
  code?: string;
  expected?: string;
  received?: string;
  hypotheses: string[];
  proposedFix?: string;
}

interface RepairItem {
  id: string;
  attemptNumber: number;
  modelId: string;
  outcome: string;
  durationMs: number;
  proposedPatch: {
    path?: string;
    file?: string;
    reason?: string;
    replacementContent?: string;
  };
}

interface DiffItem {
  path: string;
  diff?: string;
  actionId: string;
  timestamp?: string;
}

const PHASES = [
  'QUEUED',
  'UNDERSTANDING',
  'PLANNING',
  'EXECUTING',
  'TESTING',
  'DIAGNOSING',
  'REPAIRING',
  'VERIFYING',
  'COMPLETED',
];

export const AutonomousEngineeringView: React.FC = () => {
  const [tasks, setTasks] = useState<EngineeringTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<EngineeringTask | null>(null);
  const [plan, setPlan] = useState<EngineeringPlan | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>([]);
  const [repairs, setRepairs] = useState<RepairItem[]>([]);
  const [diffs, setDiffs] = useState<DiffItem[]>([]);
  const [newObjective, setNewObjective] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'plan' | 'diffs' | 'diagnostics' | 'repairs'>('timeline');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const sseRef = useRef<EventSource | null>(null);

  // Fetch task list
  const loadTasks = async () => {
    try {
      const resp = await fetch('/api/engineering/tasks?limit=30');
      if (resp.ok) {
        const data = await resp.json();
        setTasks(data.tasks || []);
        if (!selectedTask && data.tasks && data.tasks.length > 0) {
          setSelectedTask(data.tasks[0]);
        } else if (selectedTask) {
          const updated = (data.tasks || []).find((t: EngineeringTask) => t.id === selectedTask.id);
          if (updated) setSelectedTask(updated);
        }
      }
    } catch (err) {
      console.error('Failed to load tasks', err);
    }
  };

  // Fetch task details
  const loadTaskDetails = async (taskId: string) => {
    try {
      const [planRes, diagRes, repRes, chgRes] = await Promise.all([
        fetch(`/api/engineering/tasks/${taskId}/plan`),
        fetch(`/api/engineering/tasks/${taskId}/diagnostics`),
        fetch(`/api/engineering/tasks/${taskId}/repairs`),
        fetch(`/api/engineering/tasks/${taskId}/changes`),
      ]);

      if (planRes.ok) {
        const p = await planRes.json();
        setPlan(p.plan || null);
      }
      if (diagRes.ok) {
        const d = await diagRes.json();
        setDiagnostics(d.diagnostics || []);
      }
      if (repRes.ok) {
        const r = await repRes.json();
        setRepairs(r.repairs || []);
      }
      if (chgRes.ok) {
        const c = await chgRes.json();
        setDiffs(c.diffs || []);
      }
    } catch (err) {
      console.error('Failed to load task details', err);
    }
  };

  useEffect(() => {
    loadTasks();
    const interval = setInterval(() => {
      if (autoRefresh) loadTasks();
    }, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  useEffect(() => {
    if (selectedTask) {
      loadTaskDetails(selectedTask.id);
      // Connect SSE
      if (sseRef.current) sseRef.current.close();
      const sse = new EventSource(`/api/engineering/tasks/${selectedTask.id}/events`);
      sse.onmessage = () => {
        loadTasks();
        loadTaskDetails(selectedTask.id);
      };
      sseRef.current = sse;
    }
    return () => {
      if (sseRef.current) sseRef.current.close();
    };
  }, [selectedTask?.id]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newObjective.trim()) return;
    setIsSubmitting(true);
    try {
      const resp = await fetch('/api/engineering/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective: newObjective.trim(),
          startImmediately: true,
          autoApprove: true,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setNewObjective('');
        await loadTasks();
        if (data.task) setSelectedTask(data.task);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAction = async (action: 'pause' | 'resume' | 'cancel' | 'start') => {
    if (!selectedTask) return;
    try {
      await fetch(`/api/engineering/tasks/${selectedTask.id}/${action}`, { method: 'POST' });
      await loadTasks();
      await loadTaskDetails(selectedTask.id);
    } catch (err) {
      console.error(`Failed to ${action} task`, err);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return '#10b981';
      case 'EXECUTING':
      case 'REPAIRING':
      case 'TESTING':
      case 'DIAGNOSING':
        return '#f59e0b';
      case 'FAILED':
        return '#ef4444';
      case 'PAUSED':
        return '#6b7280';
      default:
        return '#3b82f6';
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', background: '#0a0d14', color: '#e2e8f0', fontFamily: 'sans-serif' }}>
      {/* LEFT COLUMN: TASK MANAGER & QUEUE */}
      <div style={{ width: '340px', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={18} color="#f59e0b" />
              <span style={{ fontWeight: 600, fontSize: '15px' }}>Autonomous Coding</span>
            </div>
            <button
              onClick={() => loadTasks()}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              title="Refresh"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          <form onSubmit={handleCreateTask}>
            <textarea
              value={newObjective}
              onChange={(e) => setNewObjective(e.target.value)}
              placeholder="e.g. Fix failing test in auth service, Add dark mode..."
              rows={3}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: '#131b2e',
                border: '1px solid #2d3748',
                borderRadius: '6px',
                color: '#f8fafc',
                padding: '8px',
                fontSize: '12px',
                resize: 'none',
                marginBottom: '8px',
              }}
            />
            <button
              type="submit"
              disabled={isSubmitting || !newObjective.trim()}
              style={{
                width: '100%',
                background: isSubmitting ? '#475569' : '#d97706',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '8px',
                fontWeight: 600,
                fontSize: '12px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Sparkles size={14} />
              {isSubmitting ? 'Deploying Task...' : 'Dispatch Autonomous Task'}
            </button>
          </form>
        </div>

        {/* Task List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', padding: '4px 8px', letterSpacing: '0.05em' }}>
            Active & Past Tasks ({tasks.length})
          </div>
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => setSelectedTask(task)}
              style={{
                padding: '10px',
                margin: '4px 0',
                borderRadius: '6px',
                cursor: 'pointer',
                background: selectedTask?.id === task.id ? '#1e293b' : '#0f172a',
                border: selectedTask?.id === task.id ? '1px solid #d97706' : '1px solid #1e293b',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>{task.id}</span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: `${getStatusBadgeColor(task.status)}22`,
                    color: getStatusBadgeColor(task.status),
                  }}
                >
                  {task.status}
                </span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {task.objective}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '11px', color: '#64748b' }}>
                <span>Phase: {task.currentPhase}</span>
                <span>•</span>
                <span>Attempts: {task.attemptCount}/{task.maxAttempts}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT MAIN PANEL: LIVE EXECUTION & DETAILS */}
      {selectedTask ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '16px', borderBottom: '1px solid #1e293b', background: '#0d1322' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc' }}>{selectedTask.objective}</span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: `${getStatusBadgeColor(selectedTask.status)}22`,
                      color: getStatusBadgeColor(selectedTask.status),
                    }}
                  >
                    {selectedTask.status}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', gap: '16px' }}>
                  <span>ID: <code style={{ color: '#cbd5e1' }}>{selectedTask.id}</code></span>
                  <span>Workspace: <code style={{ color: '#cbd5e1' }}>{selectedTask.workspaceId}</code></span>
                  <span>Complexity: <strong style={{ color: '#e2e8f0' }}>{selectedTask.complexity}</strong></span>
                  <span>Verification: <strong style={{ color: selectedTask.verificationState === 'VERIFIED' ? '#10b981' : '#f59e0b' }}>{selectedTask.verificationState}</strong></span>
                </div>
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {selectedTask.status === 'QUEUED' && (
                  <button
                    onClick={() => handleAction('start')}
                    style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                  >
                    <Play size={13} /> Run
                  </button>
                )}
                {['EXECUTING', 'REPAIRING', 'TESTING'].includes(selectedTask.status) && (
                  <button
                    onClick={() => handleAction('pause')}
                    style={{ background: '#64748b', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                  >
                    <Pause size={13} /> Pause
                  </button>
                )}
                {selectedTask.status === 'PAUSED' && (
                  <button
                    onClick={() => handleAction('resume')}
                    style={{ background: '#d97706', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                  >
                    <Play size={13} /> Resume
                  </button>
                )}
                {!['COMPLETED', 'FAILED', 'CANCELLED'].includes(selectedTask.status) && (
                  <button
                    onClick={() => handleAction('cancel')}
                    style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                  >
                    <XCircle size={13} /> Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Stepper / Timeline Bar */}
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }}>
              {PHASES.map((p, i) => {
                const isCurrent = selectedTask.currentPhase === p;
                const isDone = PHASES.indexOf(selectedTask.currentPhase) > i || selectedTask.status === 'COMPLETED';
                return (
                  <React.Fragment key={p}>
                    <div
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: isCurrent ? '#d97706' : isDone ? '#1e293b' : '#0f172a',
                        color: isCurrent ? '#fff' : isDone ? '#10b981' : '#64748b',
                        border: isCurrent ? '1px solid #f59e0b' : '1px solid #1e293b',
                      }}
                    >
                      {isDone && <CheckCircle2 size={11} />}
                      {isCurrent && <Activity size={11} className="animate-spin" />}
                      {p}
                    </div>
                    {i < PHASES.length - 1 && <span style={{ color: '#334155' }}>→</span>}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #1e293b', background: '#0f172a' }}>
            {[
              { id: 'timeline', label: 'Timeline & Overview', icon: Activity },
              { id: 'plan', label: 'Plan & Architecture', icon: Layers },
              { id: 'diffs', label: `Changes & Diffs (${diffs.length})`, icon: GitCommit },
              { id: 'diagnostics', label: `Diagnostics (${diagnostics.length})`, icon: AlertTriangle },
              { id: 'repairs', label: `Repairs (${repairs.length})`, icon: RotateCcw },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    padding: '10px 16px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: activeTab === tab.id ? '2px solid #d97706' : '2px solid transparent',
                    color: activeTab === tab.id ? '#f8fafc' : '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: activeTab === tab.id ? 600 : 500,
                  }}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Body Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {activeTab === 'timeline' && (
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc', marginBottom: '12px' }}>
                    Autonomous Execution Status
                  </h3>
                  <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '6px', padding: '12px', marginBottom: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Repair Attempts</div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>
                          {selectedTask.attemptCount} / {selectedTask.maxAttempts}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Tests Run</div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>{selectedTask.testsRun}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Files Modified</div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>{selectedTask.changedFiles.length}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Model Calls</div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>{selectedTask.modelCalls}</div>
                      </div>
                    </div>
                  </div>

                  {selectedTask.finalSummary && (
                    <div style={{ background: '#064e3b22', border: '1px solid #059669', borderRadius: '6px', padding: '12px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: 600, fontSize: '13px' }}>
                        <CheckCircle2 size={16} /> Verified Resolution Summary
                      </div>
                      <div style={{ marginTop: '6px', fontSize: '12px', color: '#cbd5e1', whiteSpace: 'pre-wrap' }}>
                        {selectedTask.finalSummary}
                      </div>
                    </div>
                  )}

                  {selectedTask.failureReason && (
                    <div style={{ background: '#7f1d1d22', border: '1px solid #dc2626', borderRadius: '6px', padding: '12px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontWeight: 600, fontSize: '13px' }}>
                        <AlertTriangle size={16} /> Failure Diagnosis
                      </div>
                      <div style={{ marginTop: '6px', fontSize: '12px', color: '#fca5a5' }}>
                        {selectedTask.failureReason}
                      </div>
                    </div>
                  )}

                  <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', marginBottom: '8px' }}>
                    Changed Files ({selectedTask.changedFiles.length})
                  </h4>
                  {selectedTask.changedFiles.length === 0 ? (
                    <div style={{ color: '#64748b', fontSize: '12px', fontStyle: 'italic' }}>No files modified yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {selectedTask.changedFiles.map((f) => (
                        <div key={f} style={{ background: '#0f172a', padding: '8px 12px', borderRadius: '4px', border: '1px solid #1e293b', fontSize: '12px', fontFamily: 'monospace', color: '#38bdf8' }}>
                          {f}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc', marginBottom: '12px' }}>
                    Agent Workforce Activity
                  </h3>
                  <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '6px', padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Shield size={15} color="#d97706" />
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>Governed Execution Fabric</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.5' }}>
                      The model proposes structured actions. Capability Fabric, Editor Engine, and Terminal Manager validate permissions and apply changes inside isolated changesets.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'plan' && (
              <div>
                {!plan ? (
                  <div style={{ color: '#64748b', fontStyle: 'italic' }}>No plan generated yet.</div>
                ) : (
                  <div>
                    <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '6px', padding: '16px', marginBottom: '16px' }}>
                      <h4 style={{ fontSize: '13px', color: '#f59e0b', margin: '0 0 6px 0' }}>Architecture & Strategy Summary</h4>
                      <p style={{ margin: 0, fontSize: '12px', color: '#cbd5e1' }}>{plan.architectureSummary}</p>
                    </div>

                    <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', marginBottom: '8px' }}>
                      Execution Plan Steps ({plan.steps.length})
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {plan.steps.map((s) => (
                        <div key={s.sequence} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '6px', padding: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 600, fontSize: '13px', color: '#f8fafc' }}>
                              {s.sequence}. {s.title}
                            </span>
                            <span style={{ fontSize: '11px', background: '#334155', padding: '2px 6px', borderRadius: '4px' }}>
                              {s.actionType}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#94a3b8' }}>{s.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'diffs' && (
              <div>
                {diffs.length === 0 ? (
                  <div style={{ color: '#64748b', fontStyle: 'italic' }}>No diffs recorded for this task.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {diffs.map((d, i) => (
                      <div key={i} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{ padding: '8px 12px', background: '#1e293b', fontSize: '12px', fontWeight: 600, fontFamily: 'monospace', color: '#38bdf8' }}>
                          {d.path}
                        </div>
                        <pre style={{ margin: 0, padding: '12px', fontSize: '12px', fontFamily: 'monospace', background: '#0a0d14', color: '#cbd5e1', overflowX: 'auto' }}>
                          {d.diff || 'No diff content'}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'diagnostics' && (
              <div>
                {diagnostics.length === 0 ? (
                  <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={16} /> Zero diagnostics / clean state.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {diagnostics.map((diag) => (
                      <div key={diag.id} style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '6px', padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 600, color: '#ef4444', fontSize: '13px' }}>{diag.category}</span>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>Confidence: {diag.confidence}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#f8fafc', marginBottom: '6px' }}>{diag.message}</div>
                        {diag.file && (
                          <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#38bdf8' }}>
                            {diag.file}:{diag.line}
                          </div>
                        )}
                        {diag.hypotheses.length > 0 && (
                          <div style={{ marginTop: '8px', fontSize: '11px', color: '#cbd5e1' }}>
                            <strong>Root Cause Hypotheses:</strong>
                            <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                              {diag.hypotheses.map((h, hi) => (
                                <li key={hi}>{h}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'repairs' && (
              <div>
                {repairs.length === 0 ? (
                  <div style={{ color: '#64748b', fontStyle: 'italic' }}>No repair attempts executed yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {repairs.map((r) => (
                      <div key={r.id} style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '6px', padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600, fontSize: '13px', color: '#f8fafc' }}>
                            Attempt #{r.attemptNumber} — Model: {r.modelId}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: r.outcome === 'RESOLVED' || r.outcome === 'IMPROVED' ? '#10b981' : '#ef4444',
                            }}
                          >
                            {r.outcome}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Target: {r.proposedPatch.path || r.proposedPatch.file}</div>
                        {r.proposedPatch.reason && (
                          <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>
                            Reason: {r.proposedPatch.reason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#64748b' }}>
          <Cpu size={48} strokeWidth={1} style={{ marginBottom: '16px' }} />
          <div style={{ fontSize: '16px', fontWeight: 500 }}>Select or create an autonomous software engineering task</div>
          <div style={{ fontSize: '12px', marginTop: '6px' }}>HṚṢĪKEŚA will understand, plan, execute, verify, diagnose, and repair.</div>
        </div>
      )}
    </div>
  );
};
