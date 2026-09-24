import React, { useState, useEffect, useCallback } from 'react';
import {
  Flag,
  Plus,
  Play,
  Pause,
  RotateCcw,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  FileCheck,
  Sparkles,
  Zap
} from 'lucide-react';
import {
  GoalInfo,
  MilestoneInfo,
  GoalProgressInfo,
  CreateGoalPayload,
  CompanyInfo,
  ProjectInfo
} from '../types/api.types';
import { api } from '../services/api';
import { Modal } from '../components/Modal';

interface GoalsViewProps {
  companies?: CompanyInfo[];
  projects?: ProjectInfo[];
  onRefresh?: () => void;
}

export const GoalsView: React.FC<GoalsViewProps> = ({ companies = [], projects = [] }) => {
  const [goals, setGoals] = useState<GoalInfo[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [selectedGoalDetail, setSelectedGoalDetail] = useState<{
    goal: GoalInfo;
    milestones: MilestoneInfo[];
    progress?: GoalProgressInfo;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<CreateGoalPayload>({
    title: '',
    description: '',
    objective: '',
    companyId: '',
    projectId: '',
    priority: 'NORMAL',
    constraints: [],
    successCriteria: []
  });
  const [constraintInput, setConstraintInput] = useState('');
  const [criteriaInput, setCriteriaInput] = useState('');

  const loadGoals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getGoals();
      setGoals(res.goals || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadGoalDetail = useCallback(async (id: string) => {
    try {
      const res = await api.getGoal(id);
      setSelectedGoalDetail(res);
    } catch (err: unknown) {
      console.error('Failed to load goal detail:', err);
    }
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  useEffect(() => {
    if (selectedGoalId) {
      loadGoalDetail(selectedGoalId);
    } else {
      setSelectedGoalDetail(null);
    }
  }, [selectedGoalId, loadGoalDetail]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim() || !createForm.objective.trim() || creating) return;

    setCreating(true);
    setError(null);
    try {
      const payload: CreateGoalPayload = {
        title: createForm.title.trim(),
        description: createForm.description?.trim() || undefined,
        objective: createForm.objective.trim(),
        companyId: createForm.companyId || undefined,
        projectId: createForm.projectId || undefined,
        priority: createForm.priority || 'NORMAL',
        constraints: createForm.constraints && createForm.constraints.length > 0 ? createForm.constraints : undefined,
        successCriteria: createForm.successCriteria && createForm.successCriteria.length > 0 ? createForm.successCriteria : undefined
      };
      const res = await api.createGoal(payload);
      setShowCreateModal(false);
      setCreateForm({
        title: '',
        description: '',
        objective: '',
        companyId: '',
        projectId: '',
        priority: 'NORMAL',
        constraints: [],
        successCriteria: []
      });
      await loadGoals();
      if (res.goal) {
        setSelectedGoalId(res.goal.id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create goal');
    } finally {
      setCreating(false);
    }
  };

  const handlePlan = async (id: string) => {
    setActionInProgress(id);
    try {
      await api.planGoal(id);
      await loadGoals();
      if (selectedGoalId === id) await loadGoalDetail(id);
    } catch (err: unknown) {
      alert(`Planning failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleStart = async (id: string) => {
    setActionInProgress(id);
    try {
      await api.startGoal(id);
      await loadGoals();
      if (selectedGoalId === id) await loadGoalDetail(id);
    } catch (err: unknown) {
      alert(`Start failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handlePause = async (id: string) => {
    setActionInProgress(id);
    try {
      await api.pauseGoal(id);
      await loadGoals();
      if (selectedGoalId === id) await loadGoalDetail(id);
    } catch (err: unknown) {
      alert(`Pause failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleResume = async (id: string) => {
    setActionInProgress(id);
    try {
      await api.resumeGoal(id);
      await loadGoals();
      if (selectedGoalId === id) await loadGoalDetail(id);
    } catch (err: unknown) {
      alert(`Resume failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this autonomous goal?')) return;
    setActionInProgress(id);
    try {
      await api.cancelGoal(id, 'Cancelled from Control Center UI');
      await loadGoals();
      if (selectedGoalId === id) await loadGoalDetail(id);
    } catch (err: unknown) {
      alert(`Cancel failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReplan = async (id: string) => {
    setActionInProgress(id);
    try {
      await api.replanGoal(id);
      await loadGoals();
      if (selectedGoalId === id) await loadGoalDetail(id);
    } catch (err: unknown) {
      alert(`Replan failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'EXECUTING':
        return <span className="badge badge-emerald">EXECUTING</span>;
      case 'VERIFYING':
        return <span className="badge badge-cyan">VERIFYING</span>;
      case 'PLANNED':
        return <span className="badge badge-indigo">PLANNED</span>;
      case 'AWAITING_APPROVAL':
        return <span className="badge badge-amber">AWAITING APPROVAL</span>;
      case 'PAUSED':
        return <span className="badge badge-secondary">PAUSED</span>;
      case 'COMPLETED':
        return <span className="badge badge-cyan">COMPLETED</span>;
      case 'FAILED':
        return <span className="badge badge-rose">FAILED</span>;
      case 'CANCELLED':
        return <span className="badge badge-secondary">CANCELLED</span>;
      case 'BLOCKED':
        return <span className="badge badge-rose">BLOCKED</span>;
      case 'DRAFT':
      default:
        return <span className="badge badge-secondary">DRAFT</span>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return <span className="badge badge-rose">CRITICAL</span>;
      case 'HIGH':
        return <span className="badge badge-amber">HIGH</span>;
      case 'NORMAL':
        return <span className="badge badge-indigo">NORMAL</span>;
      case 'LOW':
      default:
        return <span className="badge badge-secondary">LOW</span>;
    }
  };

  const filteredGoals = goals.filter(g => {
    if (statusFilter === 'ALL') return true;
    return g.status === statusFilter;
  });

  const executingCount = goals.filter(g => g.status === 'EXECUTING' || g.status === 'VERIFYING').length;
  const awaitingApprovalCount = goals.filter(g => g.status === 'AWAITING_APPROVAL').length;
  const completedCount = goals.filter(g => g.status === 'COMPLETED').length;
  const totalFinished = goals.filter(g => g.status === 'COMPLETED' || g.status === 'FAILED').length;
  const successRate = totalFinished > 0 ? Math.round((completedCount / totalFinished) * 100) : 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="view-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Flag className="w-6 h-6 text-primary" style={{ color: 'var(--accent-primary)' }} />
            Autonomous Goal Management Engine
          </h1>
          <p className="view-subtitle" style={{ color: 'var(--text-muted)' }}>
            Top-level autonomous orchestration: Objective → Structured Plan → Milestones → Multi-Agent Missions → Verification & Evidence
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-secondary"
            onClick={loadGoals}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus className="w-4 h-4" />
            New Goal
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderLeft: '4px solid var(--accent-danger)', padding: '1rem', color: 'var(--accent-danger)' }}>
          {error}
        </div>
      )}

      {/* Metrics Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Total Goals</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{goals.length}</div>
        </div>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Active Execution</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--accent-success)' }}>{executingCount}</div>
        </div>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Awaiting Approval (HITL)</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--accent-warning)' }}>{awaitingApprovalCount}</div>
        </div>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Completed & Verified</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--accent-info)' }}>{completedCount}</div>
        </div>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Verification Rate</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{successRate}%</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        {['ALL', 'EXECUTING', 'PLANNED', 'AWAITING_APPROVAL', 'PAUSED', 'COMPLETED', 'FAILED', 'DRAFT'].map(status => (
          <button
            key={status}
            className={`btn btn-sm ${statusFilter === status ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusFilter(status)}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Goals List & Detail View */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedGoalId ? '1fr 1.2fr' : '1fr', gap: '1.5rem' }}>
        {/* Goals List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredGoals.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Flag className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No goals found matching status "{statusFilter}".</p>
              <button
                className="btn btn-secondary mt-3"
                onClick={() => setShowCreateModal(true)}
              >
                Create your first Autonomous Goal
              </button>
            </div>
          ) : (
            filteredGoals.map(goal => {
              const isSelected = selectedGoalId === goal.id;
              const completedMilestones = selectedGoalDetail?.goal.id === goal.id && selectedGoalDetail.milestones
                ? selectedGoalDetail.milestones.filter(m => m.status === 'COMPLETED').length
                : 0;
              const totalMilestones = selectedGoalDetail?.goal.id === goal.id && selectedGoalDetail.milestones
                ? selectedGoalDetail.milestones.length
                : (goal.plan?.milestones.length || 0);

              return (
                <div
                  key={goal.id}
                  className={`card ${isSelected ? 'selected-card' : ''}`}
                  style={{
                    padding: '1.25rem',
                    cursor: 'pointer',
                    border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => setSelectedGoalId(isSelected ? null : goal.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {isSelected ? <ChevronDown className="w-4 h-4 text-primary" /> : <ChevronRight className="w-4 h-4 text-muted" />}
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0 }}>{goal.title}</h3>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {getPriorityBadge(goal.priority)}
                      {getStatusBadge(goal.status)}
                    </div>
                  </div>

                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0.25rem 0 0.75rem 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {goal.objective}
                  </p>

                  {/* Progress info */}
                  {totalMilestones > 0 && (
                    <div style={{ margin: '0.5rem 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                        <span>Milestones Progress</span>
                        <span>{completedMilestones} / {totalMilestones}</span>
                      </div>
                      <div style={{ height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${(completedMilestones / totalMilestones) * 100}%`,
                            background: goal.status === 'COMPLETED' ? 'var(--accent-success)' : 'var(--accent-primary)',
                            borderRadius: '3px',
                            transition: 'width 0.3s ease'
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                    {goal.status === 'DRAFT' && (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handlePlan(goal.id)}
                        disabled={actionInProgress === goal.id}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Plan Goal
                      </button>
                    )}

                    {goal.status === 'PLANNED' && (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handleStart(goal.id)}
                        disabled={actionInProgress === goal.id}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <Play className="w-3.5 h-3.5" />
                        Start Execution
                      </button>
                    )}

                    {goal.status === 'EXECUTING' && (
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handlePause(goal.id)}
                        disabled={actionInProgress === goal.id}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <Pause className="w-3.5 h-3.5" />
                        Pause
                      </button>
                    )}

                    {(goal.status === 'PAUSED' || goal.status === 'AWAITING_APPROVAL') && (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handleResume(goal.id)}
                        disabled={actionInProgress === goal.id}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <Play className="w-3.5 h-3.5" />
                        Resume
                      </button>
                    )}

                    {(goal.status === 'FAILED' || goal.status === 'BLOCKED') && (
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleReplan(goal.id)}
                        disabled={actionInProgress === goal.id}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Replan
                      </button>
                    )}

                    {goal.status !== 'COMPLETED' && goal.status !== 'CANCELLED' && (
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleCancel(goal.id)}
                        disabled={actionInProgress === goal.id}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-danger)' }}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Goal Detail Drawer */}
        {selectedGoalId && selectedGoalDetail && (
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID: {selectedGoalDetail.goal.id}</div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0.25rem 0' }}>{selectedGoalDetail.goal.title}</h2>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                  {getStatusBadge(selectedGoalDetail.goal.status)}
                  {getPriorityBadge(selectedGoalDetail.goal.priority)}
                </div>
              </div>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setSelectedGoalId(null)}
              >
                Close
              </button>
            </div>

            {/* Objective & Interpretation */}
            <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem', color: 'var(--text-muted)' }}>OBJECTIVE</div>
              <p style={{ margin: 0, fontSize: '0.95rem' }}>{selectedGoalDetail.goal.objective}</p>
              {selectedGoalDetail.goal.plan?.interpretation && (
                <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>Plan Interpretation: </span>
                  {selectedGoalDetail.goal.plan.interpretation}
                </div>
              )}
            </div>

            {/* Blocked or Awaiting Approval Banner */}
            {selectedGoalDetail.goal.blockedReason && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-danger)', padding: '0.75rem 1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-danger)' }}>
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <div style={{ fontWeight: 600 }}>Action Required / Blocked</div>
                  <div style={{ fontSize: '0.85rem' }}>{selectedGoalDetail.goal.blockedReason}</div>
                </div>
              </div>
            )}

            {/* Milestones & Provenance DAG */}
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Zap className="w-4 h-4 text-primary" />
                Milestone Execution Chain ({selectedGoalDetail.milestones.length})
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {selectedGoalDetail.milestones.length === 0 ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                    No milestones decomposed yet. Click <strong>Plan Goal</strong> to generate structured milestones.
                  </div>
                ) : (
                  selectedGoalDetail.milestones.map((m, idx) => (
                    <div
                      key={m.id}
                      style={{
                        background: 'var(--bg-secondary)',
                        padding: '0.85rem 1rem',
                        borderRadius: '6px',
                        borderLeft: m.status === 'COMPLETED'
                          ? '4px solid var(--accent-success)'
                          : m.status === 'EXECUTING'
                          ? '4px solid var(--accent-primary)'
                          : m.status === 'BLOCKED'
                          ? '4px solid var(--accent-danger)'
                          : '4px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)' }}>#{idx + 1}</span>
                          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{m.title}</span>
                          {m.requiresApproval && <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>HITL APPROVAL</span>}
                        </div>
                        {m.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{m.description}</div>}
                        {m.missionId && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', marginTop: '0.25rem' }}>
                            Mission ID: {m.missionId}
                          </div>
                        )}
                      </div>
                      <div>
                        {getStatusBadge(m.status)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Verification Result Section */}
            {selectedGoalDetail.goal.verificationResult && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck className="w-4 h-4 text-success" />
                  Independent Verification Evidence
                </h3>
                <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    {selectedGoalDetail.goal.verificationResult.verified ? (
                      <span className="badge badge-emerald">VERIFIED AUTHENTIC</span>
                    ) : (
                      <span className="badge badge-rose">VERIFICATION FAILED</span>
                    )}
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Checked at: {new Date(selectedGoalDetail.goal.verificationResult.verifiedAt).toLocaleString()}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.85rem' }}>
                    <strong>Criteria Passed ({selectedGoalDetail.goal.verificationResult.passedCriteria.length}):</strong>
                    <ul style={{ margin: '0.25rem 0 0.5rem 1.25rem' }}>
                      {selectedGoalDetail.goal.verificationResult.criteria.map((c, i) => (
                        <li key={i} style={{ color: c.passed ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                          {c.criterion} — <em>{c.evidence}</em>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Goal Final Report */}
            {selectedGoalDetail.goal.report && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileCheck className="w-4 h-4 text-info" />
                  Final Execution Report
                </h3>
                <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                  <p style={{ margin: '0 0 0.5rem 0' }}>{selectedGoalDetail.goal.report.summary}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', margin: '0.5rem 0' }}>
                    <div><strong>Duration:</strong> {Math.round(selectedGoalDetail.goal.report.totalDurationMs / 1000)}s</div>
                    <div><strong>Model Calls:</strong> {selectedGoalDetail.goal.report.modelCallsUsed}</div>
                    <div><strong>Missions:</strong> {selectedGoalDetail.goal.report.missionsExecuted}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Goal Modal */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create New Autonomous Goal"
        >
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                Goal Title *
              </label>
              <input
                type="text"
                className="input"
                style={{ width: '100%' }}
                placeholder="e.g. Build and launch my SaaS product"
                value={createForm.title}
                onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                Detailed Objective *
              </label>
              <textarea
                className="input"
                style={{ width: '100%', minHeight: '80px' }}
                placeholder="Describe the ultimate outcome, scope, and target deliverables..."
                value={createForm.objective}
                onChange={e => setCreateForm({ ...createForm, objective: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Company Scope
                </label>
                <select
                  className="input"
                  style={{ width: '100%' }}
                  value={createForm.companyId || ''}
                  onChange={e => setCreateForm({ ...createForm, companyId: e.target.value })}
                >
                  <option value="">Global / Unassigned</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Priority
                </label>
                <select
                  className="input"
                  style={{ width: '100%' }}
                  value={createForm.priority}
                  onChange={e => setCreateForm({ ...createForm, priority: e.target.value as any })}
                >
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>

            {/* Success Criteria */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                Success Criteria (Optional)
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  type="text"
                  className="input"
                  style={{ flex: 1 }}
                  placeholder="e.g. file exists 'output/report.json'"
                  value={criteriaInput}
                  onChange={e => setCriteriaInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (criteriaInput.trim()) {
                        setCreateForm({
                          ...createForm,
                          successCriteria: [...(createForm.successCriteria || []), criteriaInput.trim()]
                        });
                        setCriteriaInput('');
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    if (criteriaInput.trim()) {
                      setCreateForm({
                        ...createForm,
                        successCriteria: [...(createForm.successCriteria || []), criteriaInput.trim()]
                      });
                      setCriteriaInput('');
                    }
                  }}
                >
                  Add
                </button>
              </div>
              {createForm.successCriteria && createForm.successCriteria.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem' }}>
                  {createForm.successCriteria.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={creating || !createForm.title.trim() || !createForm.objective.trim()}
              >
                {creating ? 'Creating...' : 'Create Goal'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
