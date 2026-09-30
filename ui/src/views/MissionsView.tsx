import React, { useState, useEffect } from 'react';
import {
  Target,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Bot,
  Layers,
  ShieldAlert,
  XCircle,
  Play,
  FileText,
  CheckCircle,
  Briefcase,
  Users,
  Sparkles,
  Building2,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { MissionInfo, ProjectInfo, CompanyInfo } from '../types/api.types';
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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [executeImmediately, setExecuteImmediately] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [companies, setCompanies] = useState<CompanyInfo[]>([]);

  useEffect(() => {
    // Dynamically fetch projects and companies from backend API
    api.getProjects().then((res) => {
      if (res && res.projects) setProjects(res.projects);
    }).catch(() => {});

    api.getCompanies().then((res) => {
      if (res && res.companies) setCompanies(res.companies);
    }).catch(() => {});
  }, []);

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
      // Also refresh projects
      const projRes = await api.getProjects().catch(() => null);
      if (projRes && projRes.projects) setProjects(projRes.projects);
    } catch (err: any) {
      setError(err.message || 'Failed to create mission.');
    } finally {
      setCreating(false);
    }
  };

  // Combine missions and projects dynamically without hardcoding
  const mappedInitiatives = [
    ...missions.map((m) => {
      const rawStatus = (m.status || 'ready').toUpperCase();
      let tabStatus: 'ACTIVE' | 'PLANNING' | 'COMPLETED' = 'ACTIVE';
      if (rawStatus === 'COMPLETED' || rawStatus === 'VERIFIED') tabStatus = 'COMPLETED';
      else if (['PLANNING', 'PENDING', 'WAITING_APPROVAL', 'READY'].includes(rawStatus)) tabStatus = 'PLANNING';
      else tabStatus = 'ACTIVE';

      const totalTasks = m.plan?.tasks?.length || (m as any).report?.tasks?.total || 1;
      const completedTasks = (m as any).report?.tasks?.completed || (rawStatus === 'COMPLETED' ? totalTasks : 0);
      const progress = Math.min(100, Math.round((completedTasks / totalTasks) * 100)) ||
        (rawStatus === 'RUNNING' || rawStatus === 'EXECUTING' ? 50 : rawStatus === 'READY' ? 15 : 0);

      const involvedAgents: string[] = Array.from(new Set([
        m.rootAgentId,
        ...((m as any).report?.agentsUsed || []),
        ...(m.plan?.tasks?.map((t: any) => t.agentId) || [])
      ].filter(Boolean) as string[]));

      // Resolve company dynamically from companyId or fallback
      const matchingCompany = companies.find(c => c.id === (m as any).companyId)?.name ||
        (m as any).companyName ||
        'Autonomous Core Operations';

      return {
        raw: m,
        id: m.id,
        isProject: false,
        name: m.objective || (m as any).title || `Mission ${m.id.slice(0, 8)}`,
        company: matchingCompany,
        agents: involvedAgents.length > 0 ? involvedAgents : [m.rootAgentId || 'dhata'],
        status: tabStatus,
        rawStatus,
        progress,
      };
    }),
    ...projects.map((p) => {
      const rawStatus = (p.status || 'ACTIVE').toUpperCase();
      let tabStatus: 'ACTIVE' | 'PLANNING' | 'COMPLETED' = 'ACTIVE';
      if (rawStatus === 'COMPLETED') tabStatus = 'COMPLETED';
      else if (rawStatus === 'PLANNING') tabStatus = 'PLANNING';
      else tabStatus = 'ACTIVE';

      const matchingCompany = companies.find(c => c.id === p.companyId)?.name || 'Enterprise Ecosystem';
      const assignedAgents = (p as any).assignedAgents && (p as any).assignedAgents.length > 0 ? (p as any).assignedAgents : ['indra', 'tvasta'];

      return {
        raw: p,
        id: p.id,
        isProject: true,
        name: p.name || p.objective,
        company: matchingCompany,
        agents: assignedAgents,
        status: tabStatus,
        rawStatus,
        progress: (p as any).progress || (rawStatus === 'ACTIVE' ? 45 : 10),
      };
    }),
  ];

  // De-duplicate initiatives by ID
  const uniqueInitiatives = Array.from(new Map(mappedInitiatives.map(item => [item.id, item])).values());

  const filteredInitiatives = uniqueInitiatives.filter((p) => {
    if (activeTab === 'ALL') return true;
    return p.status === activeTab;
  });

  const selectedMissionObj = uniqueInitiatives.find((p) => p.id === selectedProjectId);

  return (
    <div style={{ maxWidth: '1180px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--accent-saffron), var(--accent-gold))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0F0D0A',
              fontWeight: 800,
              fontSize: '20px',
              boxShadow: '0 0 16px var(--accent-gold-glow)',
            }}
          >
            🎯
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-cinzel)' }}>
                Projects & Autonomous Missions
              </h1>
            </div>
            <p style={{ margin: '2px 0 0', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
              Autonomous multi-milestone initiatives executed across enterprise organizations and specialist agents.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => {
              onRefresh();
              api.getProjects().then((res) => { if (res?.projects) setProjects(res.projects); }).catch(() => {});
            }}
            className="btn btn-secondary"
            style={{ fontSize: '13px', padding: '8px 14px' }}
          >
            Sync Status
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
            style={{ fontSize: '13px', padding: '8px 18px', fontWeight: 700 }}
          >
            <Plus size={15} />
            <span>Launch Initiative</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        {[
          { id: 'ACTIVE', label: 'Active', count: uniqueInitiatives.filter((m) => m.status === 'ACTIVE').length },
          { id: 'PLANNING', label: 'Planning', count: uniqueInitiatives.filter((m) => m.status === 'PLANNING').length },
          { id: 'COMPLETED', label: 'Completed', count: uniqueInitiatives.filter((m) => m.status === 'COMPLETED').length },
          { id: 'ALL', label: 'All Initiatives', count: uniqueInitiatives.length },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '7px 16px',
                borderRadius: '20px',
                background: isActive ? 'linear-gradient(90deg, var(--accent-gold), var(--accent-gold-bright))' : 'var(--bg-elevated)',
                color: isActive ? '#0e0804' : 'var(--text-secondary)',
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

      {/* Dark Cybernetic Initiatives Table Card */}
      <div
        className="glass-panel"
        style={{
          background: 'var(--bg-glass)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-md)',
          overflow: 'hidden',
        }}
      >
        <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, var(--accent-gold), var(--accent-teal), transparent)' }} />
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(20, 12, 6, 0.85)', borderBottom: '1px solid var(--border-accent)' }}>
              <th style={{ padding: '14px 20px', fontSize: '11px', color: 'var(--accent-gold-bright)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Initiative</th>
              <th style={{ padding: '14px 20px', fontSize: '11px', color: 'var(--accent-gold-bright)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Organization</th>
              <th style={{ padding: '14px 20px', fontSize: '11px', color: 'var(--accent-gold-bright)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Assigned Specialists</th>
              <th style={{ padding: '14px 20px', fontSize: '11px', color: 'var(--accent-gold-bright)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Status</th>
              <th style={{ padding: '14px 20px', fontSize: '11px', color: 'var(--accent-gold-bright)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Progress</th>
            </tr>
          </thead>
          <tbody>
            {filteredInitiatives.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>🎯</div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px', fontFamily: 'var(--font-cinzel)' }}>
                    No Initiatives Registered in this Scope
                  </div>
                  <div style={{ fontSize: '12.5px', opacity: 0.8 }}>
                    Specialist agents are standing by. Launch an initiative to orchestrate multi-agent autonomous execution.
                  </div>
                </td>
              </tr>
            ) : (
              filteredInitiatives.map((p, idx) => {
                const isSelected = selectedProjectId === p.id;
                return (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedProjectId(isSelected ? null : p.id)}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      background: isSelected
                        ? 'rgba(200, 146, 14, 0.14)'
                        : idx % 2 === 0
                        ? 'transparent'
                        : 'rgba(255, 255, 255, 0.015)',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: 'rgba(200, 146, 14, 0.12)',
                            border: '1px solid rgba(200, 146, 14, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--accent-gold-bright)',
                            flexShrink: 0,
                          }}
                        >
                          <Target size={16} />
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-cinzel)' }}>
                            {p.name}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            ID: {p.id.slice(0, 14)} • {p.isProject ? 'Enterprise Project' : 'Autonomous Mission'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Building2 size={14} color="var(--accent-teal)" />
                        <span>{p.company}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {p.agents.slice(0, 4).map((agId: string, aIdx: number) => (
                          <div key={agId} style={{ marginLeft: aIdx > 0 ? '-8px' : 0, zIndex: 10 - aIdx }}>
                            <AgentAvatar agentId={agId} name={agId} size={28} />
                          </div>
                        ))}
                        {p.agents.length > 4 && (
                          <div
                            style={{
                              marginLeft: '-8px',
                              width: '28px',
                              height: '28px',
                              borderRadius: '8px',
                              background: 'var(--bg-elevated)',
                              border: '1px solid var(--border-color)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              fontWeight: 700,
                              color: 'var(--accent-gold)',
                              zIndex: 5,
                            }}
                          >
                            +{p.agents.length - 4}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: p.status === 'ACTIVE'
                            ? 'rgba(0, 196, 168, 0.15)'
                            : p.status === 'COMPLETED'
                            ? 'rgba(56, 120, 192, 0.15)'
                            : 'rgba(200, 146, 14, 0.15)',
                          color: p.status === 'ACTIVE'
                            ? 'var(--accent-teal)'
                            : p.status === 'COMPLETED'
                            ? '#60A5FA'
                            : 'var(--accent-gold-bright)',
                          border: `1px solid ${
                            p.status === 'ACTIVE'
                              ? 'rgba(0, 196, 168, 0.3)'
                              : p.status === 'COMPLETED'
                              ? 'rgba(96, 165, 250, 0.3)'
                              : 'rgba(200, 146, 14, 0.3)'
                          }`,
                        }}
                      >
                        ● {p.rawStatus}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', minWidth: '180px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ flex: 1, height: '6px', background: 'var(--bg-elevated)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${p.progress}%`,
                              height: '100%',
                              background: p.status === 'ACTIVE'
                                ? 'linear-gradient(90deg, var(--accent-teal), #38BDF8)'
                                : 'linear-gradient(90deg, var(--accent-gold), var(--accent-gold-bright))',
                              borderRadius: '4px',
                              boxShadow: p.status === 'ACTIVE'
                                ? '0 0 8px rgba(0, 196, 168, 0.4)'
                                : '0 0 8px rgba(200, 146, 14, 0.4)',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', width: '36px', textAlign: 'right' }}>
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
        <div
          className="card"
          style={{
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Layers size={18} color="var(--accent-gold)" />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-cinzel)' }}>
                Milestone Execution Pipeline — {selectedMissionObj.name}
              </h3>
            </div>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '11px', padding: '4px 12px' }}
              onClick={() => setSelectedProjectId(null)}
            >
              Close Details
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', fontSize: '12.5px', marginBottom: '16px' }}>
            <div style={{ background: 'var(--bg-elevated)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Objective</div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginTop: '4px' }}>
                {(selectedMissionObj.raw as any).objective || selectedMissionObj.name}
              </div>
            </div>
            <div style={{ background: 'var(--bg-elevated)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Lead Specialist</div>
              <div style={{ color: 'var(--accent-gold-bright)', fontWeight: 600, marginTop: '4px', textTransform: 'uppercase' }}>
                {(selectedMissionObj.raw as any).rootAgentId || selectedMissionObj.agents[0] || 'SOVEREIGN FLEET'}
              </div>
            </div>
            <div style={{ background: 'var(--bg-elevated)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Runtime State</div>
              <div style={{ color: 'var(--accent-teal)', fontWeight: 600, marginTop: '4px' }}>
                {selectedMissionObj.rawStatus}
              </div>
            </div>
            <div style={{ background: 'var(--bg-elevated)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assigned Organization</div>
              <div style={{ color: 'var(--text-secondary)', fontWeight: 600, marginTop: '4px' }}>
                {selectedMissionObj.company}
              </div>
            </div>
          </div>

          {(selectedMissionObj.raw as any).plan?.tasks && (selectedMissionObj.raw as any).plan.tasks.length > 0 && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-gold)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Pipeline Tasks ({(selectedMissionObj.raw as any).plan.tasks.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(selectedMissionObj.raw as any).plan.tasks.map((task: any) => (
                  <div
                    key={task.id}
                    style={{
                      background: 'var(--bg-elevated)',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <CheckCircle size={15} color="var(--accent-teal)" />
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>
                          {task.title || task.objective}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Specialist: <span style={{ color: 'var(--accent-gold-bright)', textTransform: 'uppercase' }}>{task.agentId}</span>
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        background: 'rgba(200, 146, 14, 0.15)',
                        color: 'var(--accent-gold-bright)',
                        padding: '3px 10px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        border: '1px solid rgba(200, 146, 14, 0.3)',
                      }}
                    >
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
                Initiative Title
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
