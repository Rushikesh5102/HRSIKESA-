import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Zap,
  Activity,
  CheckCircle2,
  Clock,
  Bot,
  Compass,
  Cpu,
  RefreshCw,
  Building2,
  FolderGit2,
  Sparkles,
} from 'lucide-react';
import { AgentInfo, MissionInfo, CompanyInfo, ProjectInfo } from '../types/api.types';
import { Modal } from '../components/Modal';
import { api } from '../services/api';
import { AgentTownMap } from '../components/AgentTownMap';
import { AgentAvatar } from '../components/AgentAvatar';
import { IndianFrame } from '../components/IndianFrame';
import { NavTab } from '../components/Sidebar';

interface AgentTownProps {
  agents: AgentInfo[];
  onNavigate?: (tab: NavTab) => void;
}

export const AgentTown: React.FC<AgentTownProps> = ({ agents, onNavigate }) => {
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);
  const [missions, setMissions] = useState<MissionInfo[]>([]);
  const [companies, setCompanies] = useState<CompanyInfo[]>([]);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);

  useEffect(() => {
    api.getMissions().then((res) => { if (res && res.missions) setMissions(res.missions); }).catch(() => {});
    api.getCompanies().then((res) => { if (res && res.companies) setCompanies(res.companies); }).catch(() => {});
    api.getProjects().then((res) => { if (res && res.projects) setProjects(res.projects); }).catch(() => {});
  }, []);

  const getAgentActiveMission = (agentId: string) => {
    return missions.find((m) => m.rootAgentId?.toLowerCase() === agentId.toLowerCase() && ['running', 'ready', 'planning', 'waiting', 'verifying'].includes(m.status.toLowerCase()));
  };

  const workingAgents = agents.filter((a) => ['RUNNING', 'WORKING', 'executing'].includes(a.status.toLowerCase()));

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* View Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              Agent Town 3D
            </h1>
            <span style={{ fontSize: '12px', color: 'var(--text-gold)', fontFamily: 'var(--font-devanagari)', fontWeight: 600 }}>
              परिषद
            </span>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Interactive Vedic mandala with physical quadrants for all {agents.length} specialized agents. Click any pavilion or roster card to inspect.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-gold">{agents.length} Agents</span>
          <span className={`badge ${workingAgents.length > 0 ? 'badge-running' : 'badge-online'}`}>
            {workingAgents.length} Active
          </span>
        </div>
      </div>

      {/* 2D Agent Town Mandala Matrix */}
      <div style={{ position: 'relative' }}>
        <AgentTownMap
          agents={agents}
          selectedAgentId={selectedAgent?.id}
          onSelectAgent={(id) => {
            const found = agents.find((a) => a.id.toLowerCase() === id.toLowerCase());
            if (found) setSelectedAgent(found);
          }}
          height={420}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '14px',
            fontSize: '11px',
            color: 'var(--text-gold)',
            background: 'rgba(15, 13, 10, 0.75)',
            padding: '4px 10px',
            borderRadius: '6px',
            border: '1px solid rgba(212, 175, 55, 0.25)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Sparkles size={12} />
          <span>Click any district pavilion emblem to inspect the agent</span>
        </div>
      </div>

      {/* Agent Roster Grid with 3D Emblems */}
      <IndianFrame
        title="Autonomous Council & Specialist Enclaves"
        subtitle="Select any agent pavilion to inspect tasks, permissions, and tool telemetry"
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '14px' }}>
          {agents.map((agent) => {
            const isWorking = ['RUNNING', 'WORKING', 'executing'].includes(agent.status.toLowerCase());
            const activeMission = getAgentActiveMission(agent.id);

            return (
              <div
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                style={{
                  background: selectedAgent?.id === agent.id ? 'var(--bg-card)' : 'var(--bg-elevated)',
                  border: `1px solid ${selectedAgent?.id === agent.id ? 'var(--accent-gold)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: selectedAgent?.id === agent.id ? '0 0 12px rgba(212, 175, 55, 0.2)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <AgentAvatar agentId={agent.id} name={agent.name} status={agent.status} size={42} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {agent.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-gold)', fontFamily: 'var(--font-devanagari)' }}>
                      {agent.id}
                    </div>
                  </div>
                  <span className={`badge ${isWorking ? 'badge-running' : 'badge-gold'}`}>
                    {isWorking ? 'Active' : 'Idle'}
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {agent.role || 'Autonomous specialist'}
                </div>

                {activeMission && (
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--accent-saffron-light)',
                      background: 'rgba(217, 119, 6, 0.1)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid rgba(217, 119, 6, 0.2)',
                    }}
                  >
                    Working on: {activeMission.title}
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--border-subtle)',
                    fontSize: '11.5px',
                    color: 'var(--text-muted)',
                  }}
                >
                  <span>Tier: 1 Autonomous</span>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '2px 8px', fontSize: '11px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAgent(agent);
                    }}
                  >
                    Inspect Pavilion →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </IndianFrame>

      {/* Selected Agent Modal Inspector */}
      {selectedAgent && (
        <Modal
          title={`${selectedAgent.name} • Pavilion Inspector`}
          isOpen={!!selectedAgent}
          onClose={() => setSelectedAgent(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <AgentAvatar
                agentId={selectedAgent.id}
                name={selectedAgent.name}
                status={selectedAgent.status}
                size={64}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {selectedAgent.name}
                  </h3>
                  <span className={`badge ${['RUNNING', 'WORKING', 'executing'].includes(selectedAgent.status.toLowerCase()) ? 'badge-running' : 'badge-gold'}`}>
                    {selectedAgent.status}
                  </span>
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-gold)', fontFamily: 'var(--font-devanagari)', marginTop: '2px' }}>
                  ID: {selectedAgent.id} • {selectedAgent.role || 'Specialized Autonomous Agent'}
                </div>
              </div>
            </div>

            <div
              style={{
                padding: '12px 14px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                color: 'var(--text-primary)',
                lineHeight: 1.5,
              }}
            >
              <strong>Specialization:</strong> {selectedAgent.description || 'Specialized autonomous workforce agent for sovereign mission execution.'}
            </div>

            {/* Live Active Mission Telemetry */}
            {getAgentActiveMission(selectedAgent.id) && (
              <div
                style={{
                  padding: '12px 14px',
                  background: 'rgba(217, 119, 6, 0.08)',
                  border: '1px solid rgba(217, 119, 6, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-saffron-light)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  ⚡ Live Ongoing Mission
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {getAgentActiveMission(selectedAgent.id)?.title}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Status: {getAgentActiveMission(selectedAgent.id)?.status}
                </div>
              </div>
            )}

            <div>
              <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Governed Capabilities & Tools
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {(selectedAgent.capabilities && selectedAgent.capabilities.length > 0
                  ? selectedAgent.capabilities
                  : ['filesystem.read', 'filesystem.write', 'terminal.execute', 'model_inference', 'vector_search']
                ).map((cap) => (
                  <span
                    key={cap}
                    style={{
                      padding: '4px 10px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      fontSize: '11.5px',
                      color: 'var(--text-gold)',
                      fontFamily: 'monospace',
                    }}
                  >
                    {cap}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              {onNavigate && (
                <button
                  className="btn btn-primary"
                  style={{ fontSize: '12.5px' }}
                  onClick={() => {
                    setSelectedAgent(null);
                    onNavigate('work');
                  }}
                >
                  <Sparkles size={14} />
                  Open in Living Workspace
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => setSelectedAgent(null)}>
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
