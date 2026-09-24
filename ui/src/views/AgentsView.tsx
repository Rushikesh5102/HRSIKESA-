import React, { useState, useEffect } from 'react';
import { Bot, Network, ChevronDown, ChevronRight, CheckCircle2, ArrowRight, Sparkles, Brain, Clock, Award, Activity, Search, Shield, Zap, BookOpen } from 'lucide-react';
import { AgentInfo } from '../types/api.types';
import { AgentAvatar } from '../components/AgentAvatar';

interface AgentsViewProps {
  agents: AgentInfo[];
  onOpenAgentTown?: () => void;
}

interface AgentProfile {
  name: string;
  sanskrit: string;
  role: string;
  category: string;
  quote: string;
  currentTask: string;
  taskProgress: number;
  taskDuration: string;
  capabilities: string[];
  metrics: {
    tasksCompleted: number;
    successRate: number;
    avgTime: string;
    knowledgeAdded: number;
  };
}

import { api } from '../services/api';
import { TaskInfo } from '../types/api.types';

export const AgentsView: React.FC<AgentsViewProps> = ({ agents, onOpenAgentTown }) => {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('rahu');
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'knowledge' | 'memory' | 'performance'>('overview');
  const [tasks, setTasks] = useState<TaskInfo[]>([]);

  useEffect(() => {
    api.getTasks().then((res) => {
      if (res && res.tasks) setTasks(res.tasks);
    }).catch(() => {});
  }, []);

  const currentAgent = agents.find((a) => a.id.toLowerCase() === selectedAgentId.toLowerCase()) || agents[0];
  const profileKey = currentAgent?.id?.toLowerCase() || 'rahu';

  // Compute live agent data
  const agentTasks = tasks.filter((t) => t.assignedAgent?.toLowerCase() === currentAgent?.id?.toLowerCase());
  const completedTasksCount = agentTasks.filter((t) => t.status === 'COMPLETED').length;
  const runningTask = agentTasks.find((t) => t.status === 'RUNNING');
  const failedTasksCount = agentTasks.filter((t) => t.status === 'FAILED').length;
  const totalFinished = completedTasksCount + failedTasksCount;
  const successRate = totalFinished > 0 ? Math.round((completedTasksCount / totalFinished) * 100) : 100;

  const rawCaps = (currentAgent as any)?.capabilities || currentAgent?.capabilities || [];
  const formattedCaps = rawCaps.length > 0
    ? rawCaps.map((c: string) => c.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()))
    : ['Task Execution', 'Autonomous Reasoning', 'Workflow Synthesis', 'Empirical Verification'];

  const rawTools = (currentAgent as any)?.allowedTools || [];

  const profile = {
    name: (currentAgent as any)?.displayName || (currentAgent?.name ? currentAgent.name.charAt(0).toUpperCase() + currentAgent.name.slice(1) : 'Autonomous Agent'),
    sanskrit: (currentAgent as any)?.sanskritName || 'विशेषज्ञ',
    role: (currentAgent as any)?.lifecyclePosition || currentAgent?.role?.replace(/_/g, ' ') || 'Autonomous Specialist',
    category: (currentAgent as any)?.role ? String((currentAgent as any).role).replace(/_/g, ' ').toUpperCase() : 'INTELLIGENCE WORKFORCE',
    quote: currentAgent?.description || 'In pursuit of sovereign excellence for HṚṢĪKEŚA.',
    currentTask: runningTask
      ? runningTask.title || runningTask.description
      : (currentAgent?.status?.toLowerCase() === 'idle'
          ? 'Standing by in idle state — ready for assignment'
          : `Active on sovereign system monitoring (${currentAgent?.status || 'Active'})`),
    taskProgress: runningTask ? 50 : (currentAgent?.status?.toLowerCase() === 'idle' ? 0 : 100),
    taskDuration: runningTask ? 'Running' : 'Standby',
    capabilities: formattedCaps,
    metrics: {
      tasksCompleted: completedTasksCount,
      successRate: successRate,
      avgTime: runningTask ? 'Active' : 'Nominal',
      knowledgeAdded: rawTools.length || 7,
    },
  };

  return (
    <div style={{ maxWidth: '1040px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Bar with Agent Switcher Carousel */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 18px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-gold)', letterSpacing: '1px', textTransform: 'uppercase' }}>
            SELECT AGENT:
          </span>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '4px 0', maxWidth: '680px' }}>
            {agents.map((ag) => {
              const isSelected = ag.id.toLowerCase() === selectedAgentId.toLowerCase();
              return (
                <button
                  key={ag.id}
                  onClick={() => setSelectedAgentId(ag.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 12px',
                    borderRadius: '20px',
                    background: isSelected ? 'linear-gradient(90deg, #F5C842, #D4AF37)' : 'rgba(255,255,255,0.04)',
                    color: isSelected ? '#150E06' : 'var(--text-secondary)',
                    border: `1px solid ${isSelected ? 'var(--accent-gold-bright)' : 'var(--border-subtle)'}`,
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: isSelected ? 700 : 500,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <AgentAvatar agentId={ag.id} name={ag.name} status={ag.status} size={18} />
                  <span>{ag.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {onOpenAgentTown && (
          <button
            className="btn btn-secondary"
            onClick={onOpenAgentTown}
            style={{ fontSize: '11.5px', padding: '6px 14px', flexShrink: 0 }}
          >
            <Network size={14} />
            <span>Agent Town 3D</span>
          </button>
        )}
      </div>

      {/* Panel 3: Individual Agent Workspace Parchment Card */}
      <div className="parchment-gold-card" style={{ padding: '28px 32px' }}>
        {/* Agent Profile Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #D6BC97', paddingBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            {/* Circular Celestial Frame */}
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FFD700 0%, #D4AF37 50%, #8C6D23 100%)',
                padding: '3px',
                boxShadow: '0 4px 18px rgba(184, 134, 11, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#231407', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {profileKey === 'rahu' ? (
                  <img src="/assets/agent_rahu.jpg" alt="Rahu" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <AgentAvatar agentId={currentAgent?.id || 'rahu'} name={profile.name} status="RUNNING" size={60} />
                )}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#2A1A0B', margin: 0 }}>
                  {profile.name}
                </h1>
                <span style={{ fontSize: '18px', color: '#996515', fontFamily: 'var(--font-devanagari)', fontWeight: 700 }}>
                  {profile.sanskrit}
                </span>
                <span className="status-pill-active" style={{ marginLeft: '6px' }}>
                  ● Active
                </span>
              </div>
              <p style={{ fontSize: '14px', color: '#5C4028', fontWeight: 500, marginTop: '3px' }}>
                {profile.role}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: '#7A5833', background: 'rgba(214, 188, 151, 0.35)', padding: '4px 10px', borderRadius: '4px', border: '1px solid #D6BC97', fontWeight: 600 }}>
              {profile.category}
            </span>
          </div>
        </div>

        {/* Navigation Tabs (Panel 3) */}
        <div style={{ display: 'flex', gap: '22px', borderBottom: '1.5px solid #D6BC97', marginTop: '16px', paddingBottom: '2px' }}>
          {(['overview', 'tasks', 'knowledge', 'memory', 'performance'] as const).map((tab) => {
            const labels = {
              overview: 'Overview',
              tasks: 'Current Tasks',
              knowledge: 'Knowledge',
              memory: 'Memory',
              performance: 'Performance',
            };
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '8px 4px',
                  fontSize: '13.5px',
                  fontWeight: isActive ? 800 : 600,
                  color: isActive ? '#8C5A14' : '#6A4F35',
                  borderBottom: isActive ? '3px solid #8C5A14' : '3px solid transparent',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  transition: 'all 0.15s ease',
                }}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div style={{ marginTop: '22px' }}>
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* 1. Current Activity Section */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#6A4F35', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                    Current Activity
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#8C5A14' }}>
                    {profile.taskDuration}
                  </span>
                </div>

                <div
                  style={{
                    background: '#FAF2E1',
                    border: '1px solid #D8C2A0',
                    borderRadius: '8px',
                    padding: '14px 18px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#2A1A0B' }}>
                      {profile.currentTask}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#008B8B' }}>
                      {profile.taskProgress}%
                    </span>
                  </div>

                  {/* Progress Bar with Cyan Fill */}
                  <div style={{ width: '100%', height: '8px', background: '#E2CEB1', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${profile.taskProgress}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #00BCD4, #00E5FF)',
                        borderRadius: '4px',
                        boxShadow: '0 0 10px rgba(0, 229, 255, 0.4)',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 2. Capabilities Chips */}
              <div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#6A4F35', letterSpacing: '0.8px', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
                  Specialized Capabilities
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {profile.capabilities.map((cap: string) => (
                    <span
                      key={cap}
                      style={{
                        background: '#FAF2E1',
                        border: '1px solid #D4BC97',
                        borderRadius: '6px',
                        padding: '6px 14px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        color: '#4A331E',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      }}
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              {/* 3. Performance Metrics */}
              <div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#6A4F35', letterSpacing: '0.8px', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
                  Live Performance Metrics
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
                  <div style={{ background: '#FAF2E1', border: '1px solid #D8C2A0', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#7A5833', fontWeight: 600, textTransform: 'uppercase' }}>Tasks Completed</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#2A1A0B', fontFamily: 'var(--font-cinzel)', marginTop: '4px' }}>
                      {profile.metrics.tasksCompleted}
                    </div>
                  </div>

                  <div style={{ background: '#FAF2E1', border: '1px solid #D8C2A0', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#7A5833', fontWeight: 600, textTransform: 'uppercase' }}>Success Rate</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#059669', fontFamily: 'var(--font-cinzel)', marginTop: '4px' }}>
                      {profile.metrics.successRate}%
                    </div>
                  </div>

                  <div style={{ background: '#FAF2E1', border: '1px solid #D8C2A0', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#7A5833', fontWeight: 600, textTransform: 'uppercase' }}>Runtime State</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#2A1A0B', fontFamily: 'var(--font-cinzel)', marginTop: '4px' }}>
                      {currentAgent?.status || 'IDLE'}
                    </div>
                  </div>

                  <div style={{ background: '#FAF2E1', border: '1px solid #D8C2A0', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#7A5833', fontWeight: 600, textTransform: 'uppercase' }}>Governed Tools</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#008B8B', fontFamily: 'var(--font-cinzel)', marginTop: '4px' }}>
                      {profile.metrics.knowledgeAdded}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Sacred Quote Banner */}
              <div
                style={{
                  background: 'linear-gradient(90deg, rgba(214, 188, 151, 0.3) 0%, rgba(250, 242, 225, 0.8) 50%, rgba(214, 188, 151, 0.3) 100%)',
                  borderTop: '1px dashed #D6BC97',
                  borderBottom: '1px dashed #D6BC97',
                  padding: '14px 20px',
                  textAlign: 'center',
                  fontStyle: 'italic',
                  color: '#5C3E24',
                  fontSize: '14px',
                  fontFamily: 'var(--font-cinzel)',
                  letterSpacing: '0.8px',
                }}
              >
                "{profile.quote}"
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#6A4F35', textTransform: 'uppercase' }}>
                Tasks Assigned ({agentTasks.length})
              </div>
              {agentTasks.length === 0 ? (
                <div style={{ background: '#FAF2E1', border: '1px dashed #D8C2A0', borderRadius: '8px', padding: '24px', textAlign: 'center', color: '#7A5833' }}>
                  No tasks currently assigned to {profile.name}.
                </div>
              ) : (
                agentTasks.map((t) => (
                  <div key={t.id} style={{ background: '#FAF2E1', border: '1px solid #D8C2A0', borderRadius: '8px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#2A1A0B' }}>{t.title}</div>
                      <div style={{ fontSize: '12px', color: '#5C4028', marginTop: '2px' }}>{t.description}</div>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '4px', background: t.status === 'COMPLETED' ? 'rgba(16,185,129,0.2)' : 'rgba(217,119,6,0.2)', color: t.status === 'COMPLETED' ? '#059669' : '#D97706' }}>
                      {t.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'knowledge' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#6A4F35', letterSpacing: '0.8px', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  Governed Tools ({rawTools.length})
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {rawTools.map((t: string) => (
                    <span key={t} style={{ background: '#FAF2E1', border: '1px solid #D4BC97', borderRadius: '4px', padding: '5px 12px', fontSize: '12px', fontFamily: 'monospace', color: '#4A331E' }}>
                      🛠️ {t}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ background: '#FAF2E1', border: '1px solid #D8C2A0', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#6A4F35', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Preferred Inference Model
                </div>
                <div style={{ fontSize: '14px', color: '#2A1A0B', fontWeight: 600 }}>
                  {(currentAgent as any)?.modelPreference?.preferredModelId || 'Local Sovereign Qwen 2.5:7b'} (Provider: {(currentAgent as any)?.modelPreference?.preferredProviderId || 'ollama'})
                </div>
              </div>
            </div>
          )}

          {activeTab === 'memory' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#FAF2E1', border: '1px solid #D8C2A0', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#6A4F35', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Dedicated Memory Scope
                </div>
                <div style={{ fontSize: '13.5px', fontFamily: 'monospace', color: '#8C5A14', fontWeight: 700 }}>
                  {(currentAgent as any)?.memoryScope || `agent_memory:${currentAgent?.id}`}
                </div>
              </div>

              {(currentAgent as any)?.systemPrompt && (
                <div style={{ background: '#FAF2E1', border: '1px solid #D8C2A0', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#6A4F35', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Agent Sovereign System Prompt
                  </div>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '12px', color: '#2A1A0B', fontFamily: 'monospace', lineHeight: 1.5 }}>
                    {(currentAgent as any).systemPrompt}
                  </pre>
                </div>
              )}
            </div>
          )}

          {activeTab === 'performance' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div style={{ background: '#FAF2E1', border: '1px solid #D8C2A0', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#6A4F35', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Lifecycle Position
                </div>
                <div style={{ fontSize: '15px', color: '#2A1A0B', fontWeight: 700 }}>
                  {(currentAgent as any)?.lifecyclePosition || 'Autonomous Operations'}
                </div>
              </div>
              <div style={{ background: '#FAF2E1', border: '1px solid #D8C2A0', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#6A4F35', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Danger Tier Limit
                </div>
                <div style={{ fontSize: '15px', color: '#059669', fontWeight: 700 }}>
                  Tier {(currentAgent as any)?.dangerTierLimit ?? 1} (Governed by Sovereign Kernel)
                </div>
              </div>
              <div style={{ background: '#FAF2E1', border: '1px solid #D8C2A0', borderRadius: '8px', padding: '16px', gridColumn: 'span 2' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#6A4F35', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Collaboration Council Partners
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {((currentAgent as any)?.collaborationPartners || ['aja', 'tvas', 'garuda']).map((p: string) => (
                    <span key={p} style={{ background: '#EFE3CE', border: '1px solid #D4BC97', borderRadius: '4px', padding: '4px 10px', fontSize: '12px', fontWeight: 700, color: '#5C3E24' }}>
                      🤝 {p.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
