import React, { useState } from 'react';
import { Target, Plus, CheckCircle2, Clock, AlertCircle, Bot, Layers, ShieldAlert, XCircle, Play, FileText, CheckCircle, Briefcase, Users } from 'lucide-react';
import { MissionInfo } from '../types/api.types';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import { AgentAvatar } from '../components/AgentAvatar';

interface MissionsViewProps {
  missions: MissionInfo[];
  onRefresh: () => void;
}

export const MissionsView: React.FC<MissionsViewProps> = ({ missions, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'PLANNING' | 'COMPLETED' | 'ALL'>('ACTIVE');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [executeImmediately, setExecuteImmediately] = useState(true);
  const [resolutionNote, setResolutionNote] = useState('');
  const [creating, setCreating] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || creating) return;

    setCreating(true);
    setError(null);
    try {
      await api.createMission(title.trim(), description.trim(), true, executeImmediately);
      setTitle('');
      setDescription('');
      setShowCreateModal(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to create mission.');
    } finally {
      setCreating(false);
    }
  };

  const mappedMissions = missions.map((m) => {
    const rawStatus = (m.status || 'ready').toUpperCase();
    let tabStatus: 'ACTIVE' | 'PLANNING' | 'COMPLETED' = 'ACTIVE';
    if (rawStatus === 'COMPLETED') tabStatus = 'COMPLETED';
    else if (['PLANNING', 'PENDING', 'WAITING_APPROVAL'].includes(rawStatus)) tabStatus = 'PLANNING';
    else tabStatus = 'ACTIVE';

    const totalTasks = m.plan?.tasks?.length || (m as any).report?.tasks?.total || 1;
    const completedTasks = (m as any).report?.tasks?.completed || (rawStatus === 'COMPLETED' ? totalTasks : 0);
    const progress = Math.min(100, Math.round((completedTasks / totalTasks) * 100)) || (rawStatus === 'RUNNING' ? 50 : rawStatus === 'READY' ? 15 : 0);

    const involvedAgents: string[] = Array.from(new Set([
      m.rootAgentId,
      ...((m as any).report?.agentsUsed || []),
      ...(m.plan?.tasks?.map((t: any) => t.agentId) || [])
    ].filter(Boolean) as string[]));

    return {
      raw: m,
      id: m.id,
      name: m.objective || (m as any).title || `Mission ${m.id.slice(0, 8)}`,
      company: 'Sovereign OS',
      agents: involvedAgents.length > 0 ? involvedAgents : ['garuda'],
      status: tabStatus,
      rawStatus,
      progress,
    };
  });

  const filteredProjects = mappedMissions.filter((p) => {
    if (activeTab === 'ALL') return true;
    return p.status === activeTab;
  });

  const selectedMissionObj = mappedMissions.find((p) => p.id === selectedProjectId);

  return (
    <div style={{ maxWidth: '1180px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Header bar (Panel 6) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--accent-saffron), var(--accent-gold))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F0D0A', fontWeight: 800, fontSize: '18px' }}>
            🎯
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-cinzel)' }}>
                Projects & Missions
              </h1>
              <span style={{ fontSize: '18px', color: 'var(--accent-gold-bright)', fontFamily: 'var(--font-devanagari)', fontWeight: 700 }}>
                परियोजनाएँ
              </span>
            </div>
            <p style={{ margin: '2px 0 0', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
              Autonomous multi-milestone initiatives executed across enterprise organizations.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
          style={{ fontSize: '13px', padding: '8px 18px', fontWeight: 700 }}
        >
          <Plus size={15} />
          <span>New Project</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        {[
          { id: 'ACTIVE', label: 'Active', count: mappedMissions.filter((m) => m.status === 'ACTIVE').length },
          { id: 'PLANNING', label: 'Planning', count: mappedMissions.filter((m) => m.status === 'PLANNING').length },
          { id: 'COMPLETED', label: 'Completed', count: mappedMissions.filter((m) => m.status === 'COMPLETED').length },
          { id: 'ALL', label: 'All Initiatives', count: mappedMissions.length },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '7px 16px',
                borderRadius: '20px',
                background: isActive ? 'linear-gradient(90deg, #F5C842, #D4AF37)' : 'var(--bg-elevated)',
                color: isActive ? '#140D04' : 'var(--text-secondary)',
                border: `1px solid ${isActive ? 'var(--accent-gold-bright)' : 'var(--border-subtle)'}`,
                cursor: 'pointer',
                fontSize: '12.5px',
                fontWeight: isActive ? 800 : 500,
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label} ({tab.count})
            </button>
          );
        })}
      </div>

      {/* Projects Table Card (Panel 6) */}
      <div
        className="parchment-gold-card"
        style={{
          background: '#FAF5EB',
          color: '#2A1A0B',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          padding: '4px',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#F2E8D5', borderBottom: '1.5px solid #D6BC97' }}>
              <th style={{ padding: '14px 20px', fontSize: '11.5px', color: '#7A5B36', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Name</th>
              <th style={{ padding: '14px 20px', fontSize: '11.5px', color: '#7A5B36', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Company</th>
              <th style={{ padding: '14px 20px', fontSize: '11.5px', color: '#7A5B36', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Agents</th>
              <th style={{ padding: '14px 20px', fontSize: '11.5px', color: '#7A5B36', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Status</th>
              <th style={{ padding: '14px 20px', fontSize: '11.5px', color: '#7A5B36', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Progress</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '40px 20px', textAlign: 'center', color: '#6B4C28' }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>🎯</div>
                  <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px', fontFamily: 'var(--font-cinzel)' }}>No Missions Registered</div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>All agents are standing by. Ready to orchestrate sovereign multi-agent missions.</div>
                </td>
              </tr>
            ) : (
              filteredProjects.map((p, idx) => {
                const isSelected = selectedProjectId === p.id;
              return (
                <tr
                  key={p.id}
                  onClick={() => setSelectedProjectId(isSelected ? null : p.id)}
                  style={{
                    borderBottom: '1px solid #E8DCBE',
                    background: isSelected ? 'rgba(212, 168, 55, 0.18)' : idx % 2 === 0 ? 'transparent' : 'rgba(240, 230, 210, 0.45)',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Target size={16} color="#996515" />
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#2A1A0B', fontFamily: 'var(--font-cinzel)' }}>
                        {p.name}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: '13px', color: '#5C4028', fontWeight: 600 }}>
                    {p.company}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', gap: '-6px' }}>
                      {p.agents.map((agId, aIdx) => (
                        <div key={agId} style={{ marginLeft: aIdx > 0 ? '-8px' : 0 }}>
                          <AgentAvatar agentId={agId} name={agId} size={28} />
                        </div>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span className={p.status === 'ACTIVE' ? 'status-pill-active' : 'status-pill-planning'}>
                      ● {p.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', minWidth: '180px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ flex: 1, height: '7px', background: '#E2D4BA', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${p.progress}%`,
                            height: '100%',
                            background: p.status === 'ACTIVE' ? 'linear-gradient(90deg, #00ACC1, #00E5FF)' : 'linear-gradient(90deg, #D4A837, #FFD700)',
                            borderRadius: '4px',
                            boxShadow: '0 0 8px rgba(0, 229, 255, 0.35)',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', width: '32px', textAlign: 'right' }}>
                        {p.progress}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
          </tbody>
        </table>
      </div>

      {/* Selected Project Milestone DAG Inspection */}
      {selectedMissionObj && (
        <div className="card" style={{ marginTop: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Layers size={18} color="var(--accent-gold)" />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Milestone Execution Pipeline — {selectedMissionObj.name}
              </h3>
            </div>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '11px', padding: '4px 10px' }}
              onClick={() => setSelectedProjectId(null)}
            >
              Close Details
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', fontSize: '12.5px', marginBottom: '14px' }}>
            <div style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Objective</div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginTop: '4px' }}>
                {selectedMissionObj.raw.objective || selectedMissionObj.name}
              </div>
            </div>
            <div style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Lead Specialist</div>
              <div style={{ color: 'var(--accent-gold)', fontWeight: 600, marginTop: '4px' }}>
                {selectedMissionObj.raw.rootAgentId?.toUpperCase() || 'SOVEREIGN AGENT'}
              </div>
            </div>
            <div style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Runtime State</div>
              <div style={{ color: '#10B981', fontWeight: 600, marginTop: '4px' }}>
                {selectedMissionObj.rawStatus}
              </div>
            </div>
          </div>

          {selectedMissionObj.raw.plan?.tasks && selectedMissionObj.raw.plan.tasks.length > 0 && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-gold)', marginBottom: '8px', textTransform: 'uppercase' }}>
                Pipeline Tasks ({selectedMissionObj.raw.plan.tasks.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {selectedMissionObj.raw.plan.tasks.map((task: any) => (
                  <div key={task.id} style={{ background: 'var(--bg-elevated)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>{task.title || task.objective}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '10px' }}>Specialist: {task.agentId}</span>
                    </div>
                    <span style={{ fontSize: '10.5px', background: 'rgba(245, 200, 66, 0.15)', color: 'var(--accent-gold-bright)', padding: '2px 8px', borderRadius: '4px' }}>
                      Tier {task.dangerLevel ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Mission Modal */}
      <Modal title="Launch Autonomous Project / Mission" isOpen={showCreateModal} onClose={() => setShowCreateModal(false)}>
        <form onSubmit={handleCreate}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                Project Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Enterprise Quantum Intelligence Pipeline"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                Objective & Scope
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the milestone requirements for the specialist agents..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
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
                disabled={creating || !title.trim()}
              >
                {creating ? 'Launching...' : 'Launch Project'}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
