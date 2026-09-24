import React, { useState } from 'react';
import {
  Briefcase,
  Plus,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  FileCheck,
  Target,
  Bot,
  ExternalLink,
} from 'lucide-react';
import { GoalInfo, MissionInfo, TaskInfo } from '../types/api.types';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import { IndianFrame } from '../components/IndianFrame';
import { AgentControlDeck } from '../components/AgentControlDeck';

interface WorkViewProps {
  goals?: GoalInfo[];
  missions?: MissionInfo[];
  tasks?: TaskInfo[];
  onRefresh: () => void;
  onOpenAdvancedMission?: (missionId?: string) => void;
}

type WorkFilter = 'ACTIVE' | 'NEEDS_ATTENTION' | 'COMPLETED' | 'PAUSED' | 'ALL';

interface UnifiedWorkItem {
  id: string;
  type: 'goal' | 'mission';
  title: string;
  subtext: string;
  status: 'working' | 'waiting' | 'needs_approval' | 'completed' | 'paused' | 'failed';
  rawStatus: string;
  progressPercent: number;
  createdAt?: string;
  originalGoal?: GoalInfo;
  originalMission?: MissionInfo;
}

export const WorkView: React.FC<WorkViewProps> = ({
  goals = [],
  missions = [],
  tasks = [],
  onRefresh,
  onOpenAdvancedMission,
}) => {
  const [filter, setFilter] = useState<WorkFilter>('ACTIVE');
  const [selectedItem, setSelectedItem] = useState<UnifiedWorkItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newObjective, setNewObjective] = useState('');
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Find active running mission if any
  const activeMission = missions.find((m) => m.status === 'RUNNING' || m.status === 'paused') || missions[0];

  // Map internal statuses to human friendly statuses
  const mapStatus = (raw: string): { status: UnifiedWorkItem['status']; label: string } => {
    const s = (raw || '').toUpperCase();
    if (['RUNNING', 'EXECUTING', 'PLANNING', 'REPLANNING'].includes(s)) {
      return { status: 'working', label: 'Working' };
    }
    if (['VERIFYING', 'WAITING'].includes(s)) {
      return { status: 'waiting', label: 'Checking' };
    }
    if (['BLOCKED', 'AWAITING_APPROVAL'].includes(s)) {
      return { status: 'needs_approval', label: 'Needs approval' };
    }
    if (['COMPLETED', 'VERIFIED'].includes(s)) {
      return { status: 'completed', label: 'Completed' };
    }
    if (['PAUSED'].includes(s)) {
      return { status: 'paused', label: 'Paused' };
    }
    if (['FAILED', 'CANCELLED'].includes(s)) {
      return { status: 'failed', label: 'Something went wrong' };
    }
    return { status: 'working', label: 'Working' };
  };

  // Convert Goals and Missions into unified human work items
  const unifiedItems: UnifiedWorkItem[] = [
    ...goals.map((g) => {
      const { status } = mapStatus(g.status);
      return {
        id: g.id,
        type: 'goal' as const,
        title: g.title,
        subtext: g.objective || g.description || 'Active autonomous goal',
        status,
        rawStatus: g.status,
        progressPercent: (g as any).progress?.percentage || 0,
        createdAt: g.createdAt,
        originalGoal: g,
      };
    }),
    ...missions
      .filter((m) => !goals.some((g) => g.title === m.title || g.id === m.id))
      .map((m) => {
        const { status } = mapStatus(m.status);
        return {
          id: m.id,
          type: 'mission' as const,
          title: m.title || (m as any).objective || 'Autonomous mission',
          subtext: (m as any).description || 'Multi-agent orchestration task',
          status,
          rawStatus: m.status,
          progressPercent: m.status === 'COMPLETED' ? 100 : m.status === 'RUNNING' ? 65 : 15,
          createdAt: (m as any).createdAt,
          originalMission: m,
        };
      }),
  ];

  const filteredItems = unifiedItems.filter((item) => {
    if (filter === 'ACTIVE') return item.status === 'working' || item.status === 'waiting';
    if (filter === 'NEEDS_ATTENTION') return item.status === 'needs_approval' || item.status === 'failed';
    if (filter === 'COMPLETED') return item.status === 'completed';
    if (filter === 'PAUSED') return item.status === 'paused';
    return true;
  });

  const handleCreateWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || creating) return;

    setCreating(true);
    setError(null);
    try {
      await api.createGoal({
        title: newTitle.trim(),
        objective: newObjective.trim() || newTitle.trim(),
        priority: 'NORMAL',
      });
      setNewTitle('');
      setNewObjective('');
      setShowCreateModal(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to start work');
    } finally {
      setCreating(false);
    }
  };

  const handlePauseWork = async (item: UnifiedWorkItem) => {
    setActionLoading(item.id);
    try {
      if (item.type === 'goal') {
        await api.pauseGoal(item.id);
      } else {
        await api.cancelMission(item.id, 'Paused by user');
      }
      onRefresh();
    } catch (err: any) {
      alert(`Could not pause: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResumeWork = async (item: UnifiedWorkItem) => {
    setActionLoading(item.id);
    try {
      if (item.type === 'goal') {
        await api.resumeGoal(item.id);
      } else {
        await api.resumeMission(item.id, 'Resumed by user');
      }
      onRefresh();
    } catch (err: any) {
      alert(`Could not resume: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: UnifiedWorkItem['status']) => {
    switch (status) {
      case 'working':
        return <span className="badge badge-running">● Working</span>;
      case 'waiting':
        return <span className="badge badge-online">● Checking</span>;
      case 'needs_approval':
        return <span className="badge badge-warning">⚠ Needs approval</span>;
      case 'completed':
        return <span className="badge badge-online">✓ Completed</span>;
      case 'paused':
        return <span className="badge badge-gold">⏸ Paused</span>;
      case 'failed':
      default:
        return <span className="badge badge-warning">Issue detected</span>;
    }
  };

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              Living Workspaces
            </h1>
            <span style={{ fontSize: '12px', color: 'var(--text-gold)', fontFamily: 'var(--font-devanagari)', fontWeight: 600 }}>
              कर्म
            </span>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Active goals, autonomous builds, and verified milestones orchestrated by HṚṢĪKEŚA.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={16} />
          <span>Start New Work</span>
        </button>
      </div>

      {/* Live Agent Observability & Sovereign Control Deck */}
      <AgentControlDeck activeMission={activeMission} activeTasks={tasks} onRefresh={onRefresh} />

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {[
          { id: 'ACTIVE', label: 'Active' },
          { id: 'NEEDS_ATTENTION', label: 'Needs Attention' },
          { id: 'COMPLETED', label: 'Completed' },
          { id: 'PAUSED', label: 'Paused' },
          { id: 'ALL', label: 'All' },
        ].map((f) => (
          <button
            key={f.id}
            className={`btn ${filter === f.id ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '13px', padding: '6px 16px', borderRadius: '20px' }}
            onClick={() => setFilter(f.id as WorkFilter)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Work Cards List */}
      {filteredItems.length === 0 ? (
        <IndianFrame style={{ padding: '48px 24px', textAlign: 'center' }}>
          <Briefcase size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px auto' }} />
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
            No {filter.toLowerCase().replace('_', ' ')} work found
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Tell HṚṢĪKEŚA what you want to achieve, or create a new goal.
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
            style={{ marginTop: '16px', fontSize: '13px' }}
          >
            <Plus size={15} />
            <span>Start something now</span>
          </button>
        </IndianFrame>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredItems.map((item) => (
            <IndianFrame key={item.id} style={{ padding: '18px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
                {/* 2D Progress Token */}
                <div
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '12px',
                    background: 'radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, rgba(15, 13, 10, 0.8) 100%)',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: 'inset 0 0 10px rgba(212, 175, 55, 0.1)',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-gold)', fontFamily: 'var(--font-cinzel)' }}>
                    {item.progressPercent}%
                  </span>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    DONE
                  </span>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3
                      style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.title}
                    </h3>
                    {getStatusBadge(item.status)}
                  </div>

                  <p
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      marginTop: '4px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.subtext}
                  </p>

                  {/* Progress Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
                    <div
                      style={{
                        flex: 1,
                        height: '6px',
                        background: 'var(--bg-elevated)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${item.progressPercent || 25}%`,
                          background: 'linear-gradient(90deg, var(--accent-saffron), var(--accent-gold))',
                          borderRadius: '3px',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-gold)', minWidth: '36px' }}>
                      {Math.round(item.progressPercent)}%
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {item.status === 'working' && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => handlePauseWork(item)}
                      disabled={actionLoading === item.id}
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                    >
                      <Pause size={13} />
                      <span>Pause</span>
                    </button>
                  )}

                  {item.status === 'paused' && (
                    <button
                      className="btn btn-primary"
                      onClick={() => handleResumeWork(item)}
                      disabled={actionLoading === item.id}
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                    >
                      <Play size={13} />
                      <span>Resume</span>
                    </button>
                  )}

                  {onOpenAdvancedMission && item.type === 'mission' && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => onOpenAdvancedMission(item.id)}
                      style={{ fontSize: '12px', padding: '6px 10px' }}
                      title="Inspect full mission DAG"
                    >
                      <ExternalLink size={13} />
                    </button>
                  )}
                </div>
              </div>
            </IndianFrame>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <Modal
          title="Start New Work"
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        >
          <form onSubmit={handleCreateWork} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && (
              <div style={{ color: 'var(--accent-rose)', fontSize: '13px' }}>{error}</div>
            )}

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                What would you like to accomplish?
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Build personal portfolio, Audit codebase security, Research LLM models"
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '10px 14px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  outline: 'none',
                }}
                required
                autoFocus
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Detailed Objectives (Optional)
              </label>
              <textarea
                value={newObjective}
                onChange={(e) => setNewObjective(e.target.value)}
                placeholder="Specific requirements, constraints, or deliverables..."
                rows={4}
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '10px 14px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={creating || !newTitle.trim()}
              >
                {creating ? 'Starting...' : 'Launch Goal'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
