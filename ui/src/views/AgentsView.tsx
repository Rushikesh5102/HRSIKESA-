import React, { useState, useEffect, useMemo } from 'react';
import {
  Bot,
  Network,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Brain,
  Clock,
  Award,
  Activity,
  Search,
  Shield,
  Zap,
  BookOpen,
  Layers,
  Terminal,
  Cpu,
  Lock,
  Users,
} from 'lucide-react';
import { AgentInfo, TaskInfo } from '../types/api.types';
import { AgentAvatar } from '../components/AgentAvatar';
import { AgentPortrait } from '../components/AgentPortrait';
import { api } from '../services/api';

const formatSleekText = (str?: string): string => {
  if (!str) return '';
  return str
    .replace(/[._]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
};

const cleanDescription = (desc?: string): string => {
  if (!desc) return 'Specialized autonomous persona executing designated computational tasks for HṚṢĪKEŚA.';
  return desc.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
};

interface AgentsViewProps {
  agents: AgentInfo[];
  onOpenAgentTown?: () => void;
  onOpenOffice?: () => void;
}

type AgentTier = 'ALL' | 'ADITYA' | 'RUDRA' | 'VASU' | 'LEADERS' | 'DYNAMIC';

export const AgentsView: React.FC<AgentsViewProps> = ({ agents, onOpenAgentTown, onOpenOffice }) => {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('indra');
  const [selectedTier, setSelectedTier] = useState<AgentTier>('ALL');
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'tools' | 'relationships' | 'memory'>('overview');
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    api.getTasks().then((res) => {
      if (res && res.tasks) setTasks(res.tasks);
    }).catch(() => {});
  }, []);

  // Canonical 5-tier classification
  const ADITYA_IDS = ['dhata', 'mitra', 'aryaman', 'varuna', 'amsa', 'bhaga', 'vivasvan', 'pusa', 'tvasta', 'savita', 'parjanya', 'visnu'];
  const RUDRA_IDS = ['manyu', 'manu', 'mahinasa', 'mahan', 'siva', 'ritadhvaja', 'ugrareta', 'bhava', 'kala_rudra', 'vamadeva', 'dhritavrata'];
  const VASU_IDS = ['dhara', 'anala', 'anila', 'apa', 'pratyusa', 'prabhasa', 'soma', 'dhruva'];

  const getAgentTier = (agentId: string): string => {
    const id = agentId.toLowerCase();
    if (id === 'indra') return 'COMMAND';
    if (id === 'prajapati') return 'PROGENITOR';
    if (ADITYA_IDS.includes(id)) return 'ĀDITYA (12)';
    if (RUDRA_IDS.includes(id)) return 'RUDRA (11)';
    if (VASU_IDS.includes(id)) return 'VASU (8)';
    return 'DYNAMIC';
  };

  const filteredAgents = useMemo(() => {
    return agents.filter((a) => {
      const id = a.id.toLowerCase();
      const matchesTier =
        selectedTier === 'ALL' ||
        (selectedTier === 'ADITYA' && ADITYA_IDS.includes(id)) ||
        (selectedTier === 'RUDRA' && RUDRA_IDS.includes(id)) ||
        (selectedTier === 'VASU' && VASU_IDS.includes(id)) ||
        (selectedTier === 'LEADERS' && (id === 'indra' || id === 'prajapati')) ||
        (selectedTier === 'DYNAMIC' && (id.startsWith('dyn_') || id.startsWith('temp_')));

      const matchesSearch =
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.id.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesTier && matchesSearch;
    });
  }, [agents, selectedTier, searchQuery]);

  const currentAgent = agents.find((a) => a.id.toLowerCase() === selectedAgentId.toLowerCase()) || agents[0];

  // Collaboration squad calculation
  const getCollaborationSquad = (agentId: string) => {
    const id = agentId.toLowerCase();
    if (id === 'manyu') return ['Manu (Standards)', 'Ṛtadhvaja (QA)', 'Bhava (CI/CD)', 'Śiva (Integrity)'];
    if (id === 'dhata') return ['Indra (Command)', 'Tvaṣṭā (Specs)', 'Varuṇa (Policy)', 'Aryaman (Teams)'];
    if (id === 'ritadhvaja') return ['Manyu (Engineering)', 'Śiva (Defects)', 'Ugraretā (Security)'];
    if (id === 'bhaga') return ['Parjanya (Feeds)', 'Dhātā (Strategy)', 'Mitra (Customer)'];
    if (id === 'indra') return ['Dhātā (Strategy)', 'Manyu (Engineering)', 'Prajāpati (Evolution)', 'Prabhāsa (SRE)'];
    if (id === 'prajapati') return ['Indra (Command)', 'Dhātā (Strategy)', 'Soma (Memory)'];
    return ['Indra (Command)', 'Ṛtadhvaja (QA)', 'Dhātā (Strategy)'];
  };

  const agentTasks = tasks.filter((t) => t.assignedAgent?.toLowerCase() === currentAgent?.id?.toLowerCase());
  const runningTask = agentTasks.find((t) => t.status === 'RUNNING');
  const completedTasksCount = agentTasks.filter((t) => t.status === 'COMPLETED').length;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        padding: '24px 28px 80px 28px',
        maxWidth: '1440px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* Header */}
      <div
        className="glass-panel"
        style={{
          padding: '22px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '11px', color: 'var(--accent-gold)', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              Canonical Workforce
            </span>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--accent-teal)',
                background: 'rgba(0, 196, 168, 0.1)',
                border: '1px solid rgba(0, 196, 168, 0.25)',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: 600,
              }}
            >
              {agents.length} Canonical Agents Active
            </span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'var(--font-cinzel)', color: 'var(--text-primary)', margin: '4px 0 0 0' }}>
            Specialized Agent Directory & Operational Profiles
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onOpenOffice && (
            <button
              onClick={onOpenOffice}
              className="fluid-stage-pill"
              style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '20px' }}
            >
              <span>🏢 3D Virtual Office</span>
            </button>
          )}
          {onOpenAgentTown && (
            <button
              onClick={onOpenAgentTown}
              className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '20px' }}
            >
              <span>🗺️ Agent Town Map</span>
            </button>
          )}
        </div>
      </div>

      {/* 5-Tier Category Selector Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {(
            [
              { id: 'ALL', label: `All (${agents.length})` },
              { id: 'LEADERS', label: 'Leaders (2)' },
              { id: 'ADITYA', label: '12 Ādityas (Strategy/Law)' },
              { id: 'RUDRA', label: '11 Rudras (Engineering/QA)' },
              { id: 'VASU', label: '8 Vasus (Infra/Compute)' },
              { id: 'DYNAMIC', label: 'Dynamic Specialists' },
            ] as { id: AgentTier; label: string }[]
          ).map((tier) => (
            <button
              key={tier.id}
              onClick={() => setSelectedTier(tier.id)}
              className={`fluid-stage-pill ${selectedTier === tier.id ? 'active' : ''}`}
              style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '20px' }}
            >
              <span>{tier.label}</span>
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '240px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search agents..."
            style={{
              width: '100%',
              padding: '7px 12px 7px 32px',
              borderRadius: '20px',
              background: 'rgba(14, 8, 4, 0.6)',
              border: '1px solid rgba(212, 168, 55, 0.25)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Main Grid: Left Selector List & Right Deep Operational Profile */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
        {/* Left: Agent List */}
        <div
          className="glass-panel"
          style={{
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxHeight: '680px',
            overflowY: 'auto',
          }}
        >
          {filteredAgents.map((ag) => {
            const isSelected = ag.id.toLowerCase() === currentAgent?.id?.toLowerCase();
            const isWorking = ['WORKING', 'RUNNING'].includes(ag.status.toUpperCase());
            return (
              <div
                key={ag.id}
                onClick={() => setSelectedAgentId(ag.id)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '12px',
                  background: isSelected ? 'rgba(212, 168, 55, 0.18)' : 'rgba(255,255,255,0.02)',
                  border: isSelected ? '1.5px solid var(--accent-gold)' : '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <AgentPortrait agentId={ag.id} name={ag.name} size={36} showAura={isWorking} />
                  <div>
                    <h4 style={{ fontSize: '13.5px', fontWeight: 800, margin: 0, color: isSelected ? 'var(--text-gold)' : 'var(--text-primary)', fontFamily: 'var(--font-cinzel)' }}>
                      {formatSleekText(ag.name)}
                    </h4>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatSleekText(ag.role)}</span>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '9.5px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: isWorking ? 'rgba(0, 196, 168, 0.2)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${isWorking ? 'rgba(0, 196, 168, 0.35)' : 'rgba(255,255,255,0.08)'}`,
                    color: isWorking ? '#00c4a8' : 'var(--text-muted)',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                  }}
                >
                  {ag.status}
                </span>
              </div>
            );
          })}
        </div>

        {/* Right: Selected Agent Operational Profile */}
        {currentAgent && (
          <div
            className="glass-panel"
            style={{
              padding: '28px 32px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              border: '1.5px solid rgba(212, 168, 55, 0.35)',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(212, 168, 55, 0.2)',
            }}
          >
            {/* Top Agent Identity Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                <AgentPortrait agentId={currentAgent.id} name={currentAgent.name} size={74} showAura={true} />

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '10.5px', color: 'var(--accent-gold)', fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase' }}>
                      {getAgentTier(currentAgent.id)}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>•</span>
                    <span style={{ fontSize: '11px', color: 'var(--accent-teal)', fontWeight: 600 }}>ID: {formatSleekText(currentAgent.id)}</span>
                  </div>
                  <h2 style={{ fontSize: '26px', fontWeight: 900, fontFamily: 'var(--font-cinzel)', color: 'var(--text-primary)', margin: '2px 0 2px 0' }}>
                    {formatSleekText(currentAgent.name)}
                  </h2>
                  <span style={{ fontSize: '13.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>{formatSleekText(currentAgent.role)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    padding: '6px 16px',
                    borderRadius: '20px',
                    background: currentAgent.status.toUpperCase() === 'WORKING' ? 'rgba(0, 196, 168, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                    border: `1.5px solid ${currentAgent.status.toUpperCase() === 'WORKING' ? '#00c4a8' : '#10b981'}`,
                    color: currentAgent.status.toUpperCase() === 'WORKING' ? '#00c4a8' : '#10b981',
                    fontSize: '12px',
                    fontWeight: 800,
                    letterSpacing: '0.8px',
                    boxShadow: currentAgent.status.toUpperCase() === 'WORKING' ? '0 0 14px rgba(0, 196, 168, 0.35)' : 'none',
                  }}
                >
                  ● {currentAgent.status.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Sub-Tabs: Overview, Tasks, Tools, Relationships, Memory */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(212, 168, 55, 0.2)', paddingBottom: '10px' }}>
              {(['overview', 'tasks', 'tools', 'relationships', 'memory'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`fluid-stage-pill ${activeTab === tab ? 'active' : ''}`}
                  style={{ padding: '6px 16px', fontSize: '12px', borderRadius: '18px', textTransform: 'capitalize', fontWeight: 600 }}
                >
                  <span>{tab}</span>
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>
                    Mission Statement & Domain Description
                  </span>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '6px 0 0 0', lineHeight: 1.7 }}>
                    {cleanDescription(currentAgent.description)}
                  </p>
                </div>

                {/* Key Spec Tiles */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                  <div className="metric-glow-item" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '14px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600 }}>Risk Tier Limit</span>
                    <strong style={{ fontSize: '14px', color: 'var(--accent-teal)', marginTop: '4px' }}>TIER 1 (Sandboxed)</strong>
                  </div>
                  <div className="metric-glow-item" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '14px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600 }}>Active Model</span>
                    <strong style={{ fontSize: '14px', color: 'var(--text-gold)', marginTop: '4px' }}>Qwen 2.5 / Ollama</strong>
                  </div>
                  <div className="metric-glow-item" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '14px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600 }}>Scoped Tools</span>
                    <strong style={{ fontSize: '14px', color: 'var(--text-primary)', marginTop: '4px' }}>{currentAgent.capabilities ? currentAgent.capabilities.length : 12} Allowed</strong>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'relationships' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>
                  Works With (Direct Collaboration Squad)
                </span>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                  Active dependency edges and peer handoff pathways verified across recent missions:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  {getCollaborationSquad(currentAgent.id).map((peer, i) => (
                    <div key={i} className="metric-glow-item" style={{ gap: '10px', padding: '12px 14px' }}>
                      <Users size={16} color="var(--accent-gold)" />
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>{cleanDescription(peer)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'tools' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>
                  Scoped Levers & Permission Boundaries
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {(currentAgent.capabilities && currentAgent.capabilities.length > 0 ? currentAgent.capabilities : ['filesystem.read', 'filesystem.write', 'terminal.execute', 'time.now', 'ollama.chat']).map((t: string) => (
                    <span key={t} className="glass-pill" style={{ fontSize: '12px', padding: '5px 12px', color: 'var(--accent-teal)', display: 'inline-flex', alignItems: 'center' }}>
                      <Zap size={12} style={{ marginRight: '6px' }} /> {formatSleekText(t)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'tasks' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>
                  Assigned Execution Tasks ({agentTasks.length})
                </span>
                {agentTasks.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Standing by in idle state — ready for mission assignment.</p>
                ) : (
                  agentTasks.map((t) => (
                    <div key={t.id} className="metric-glow-item" style={{ justifyContent: 'space-between', padding: '12px 16px' }}>
                      <span>{cleanDescription(t.title || t.description)}</span>
                      <span style={{ fontSize: '10.5px', color: 'var(--accent-teal)', fontWeight: 700, letterSpacing: '0.5px' }}>{t.status}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'memory' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>
                  Isolated Episodic & Semantic Memory Namespace
                </span>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                  Namespace: <code style={{ color: 'var(--accent-gold)' }}>agent : {formatSleekText(currentAgent.id)} : memory</code>
                </p>
                <div className="metric-glow-item" style={{ padding: '14px' }}>
                  <span>SQLite WAL Memory Items Indexed</span>
                  <strong style={{ color: 'var(--accent-teal)' }}>Active</strong>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
