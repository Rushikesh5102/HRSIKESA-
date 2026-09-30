import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Mic,
  Plus,
  Compass,
  Briefcase,
  Monitor,
  Play,
  Pause,
  ArrowRight,
  Sparkles,
  Users,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertCircle,
  Layers,
  Activity,
  Cpu,
  RefreshCw,
  Zap,
  CheckSquare,
  Network,
} from 'lucide-react';
import {
  HealthResponse,
  SystemStatusResponse,
  AgentInfo,
  MissionInfo,
  TaskInfo,
  ApprovalRequest,
  EnvironmentStatusResponse,
  AuditRecord,
  GoalInfo,
} from '../types/api.types';
import { NavTab } from '../components/Sidebar';
import { AICore, AICoreState } from '../components/AICore';
import { IndianFrame } from '../components/IndianFrame';
import { AgentAvatar } from '../components/AgentAvatar';
import { AnimationService } from '../services/animation.service';

interface CommandCenterProps {
  health?: HealthResponse;
  status?: SystemStatusResponse;
  agents: AgentInfo[];
  missions: MissionInfo[];
  goals?: GoalInfo[];
  tasks: TaskInfo[];
  approvals: ApprovalRequest[];
  envStatus?: EnvironmentStatusResponse;
  recentAudit: AuditRecord[];
  companiesCount?: number;
  knowledgeCount?: number;
  onNavigate: (tab: NavTab) => void;
  onStartPrompt?: (prompt: string) => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  health,
  status,
  agents,
  missions,
  goals = [],
  tasks,
  approvals,
  envStatus,
  recentAudit,
  companiesCount = 2,
  knowledgeCount,
  onNavigate,
  onStartPrompt,
}) => {
  const [commandInput, setCommandInput] = useState('');

  // Dynamic time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleCommandSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = commandInput.trim();
    if (!trimmed) return;

    if (onStartPrompt) {
      onStartPrompt(trimmed);
    } else {
      onNavigate('chat');
    }
  };

  // Find active work
  const activeGoals = goals.filter((g) => ['EXECUTING', 'PLANNING', 'VERIFYING'].includes(g.status));
  const activeMissions = missions.filter((m) => ['RUNNING', 'PLANNING', 'VERIFYING', 'READY', 'EXECUTING'].includes(m.status));
  const pendingApprovals = approvals.filter((a) => a.status === 'PENDING');
  const workingAgents = agents.filter((a) => ['RUNNING', 'WORKING', 'executing'].includes(a.status.toLowerCase()));
  const waitingTasks = tasks.filter((t) => ['PENDING', 'WAITING', 'QUEUED'].includes((t.status || '').toUpperCase()));

  // Determine current AI Core State
  let coreState: AICoreState = 'IDLE';
  if (pendingApprovals.length > 0) {
    coreState = 'SPEAKING';
  } else if (workingAgents.length > 0 || activeGoals.length > 0 || activeMissions.length > 0) {
    coreState = 'WORKING';
  }

  const currentWorkItem = activeGoals[0] || activeMissions[0];
  const totalCoreAgents = agents.length > 0 ? agents.length : 33;
  const handoffChain = workingAgents.map((a) => a.name);

  const dashboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (dashboardRef.current) {
      const cards = dashboardRef.current.querySelectorAll('.animate-enter');
      if (cards.length > 0) {
        AnimationService.animateStagger(cards as any, 40);
      }
    }
  }, []);

  return (
    <div ref={dashboardRef} style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px', paddingBottom: '32px' }}>
      
      {/* 1. HERO OPERATING SYSTEM COMMAND BANNER */}
      <div
        className="animate-enter"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(0, 191, 255, 0.08) 0%, var(--bg-surface) 75%)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '36px 32px 28px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '320px', height: '2px', background: 'linear-gradient(90deg, transparent, var(--color-cyan), transparent)' }} />
        
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
          <AICore state={coreState} size={74} interactive={true} />
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '28px',
            fontWeight: 800,
            letterSpacing: '0.12em',
            color: 'var(--text-gold)',
            marginBottom: '4px',
          }}
        >
          HṚṢĪKEŚA
        </h1>

        <div style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '24px', fontWeight: 500 }}>
          {getGreeting()}, <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Rushikesh</span>.
        </div>

        {/* Intent-First Universal Command Input */}
        <form
          onSubmit={handleCommandSubmit}
          style={{
            maxWidth: '720px',
            margin: '0 auto',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-elevated)',
            border: '1.5px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '6px 8px 6px 16px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
        >
          <Sparkles size={18} style={{ color: 'var(--color-cyan)', marginRight: '12px', flexShrink: 0 }} />
          <input
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder="What should HṚṢĪKEŚA accomplish for you?"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '15px',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)',
            }}
          />
          <button
            type="button"
            onClick={() => onNavigate('chat')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              marginRight: '4px',
            }}
            title="Voice Command"
          >
            <Mic size={18} />
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            style={{
              padding: '9px 20px',
              fontSize: '13.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, var(--color-cyan), #0099cc)',
              color: '#000',
              fontWeight: 700,
            }}
          >
            <span>Execute</span>
            <ArrowRight size={15} />
          </button>
        </form>

        {/* Operating Metrics Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
            marginTop: '22px',
            fontSize: '12.5px',
            color: 'var(--text-muted)',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => onNavigate('missions')}
          >
            <span style={{ color: 'var(--color-cyan)', fontWeight: 700 }}>{missions.length}</span> Missions
          </div>
          <span>•</span>
          <div
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => onNavigate('companies')}
          >
            <span style={{ color: 'var(--text-gold)', fontWeight: 700 }}>{companiesCount}</span> Companies
          </div>
          <span>•</span>
          <div
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => onNavigate('automations')}
          >
            <span style={{ color: 'var(--color-teal)', fontWeight: 700 }}>Continuous</span> Daemon
          </div>
          <span>•</span>
          <div
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => onNavigate('agents')}
          >
            <span style={{ color: 'var(--color-gold)', fontWeight: 700 }}>{totalCoreAgents}</span> Core Agents
          </div>
        </div>
      </div>

      {/* 2. ACTIVE NOW SECTION */}
      <div className="animate-enter">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: currentWorkItem ? 'var(--color-cyan)' : '#10b981', display: 'inline-block', boxShadow: `0 0 8px ${currentWorkItem ? 'var(--color-cyan)' : '#10b981'}` }} />
            <h2 style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              ACTIVE NOW
            </h2>
          </div>
          <button
            onClick={() => onNavigate('missions')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-cyan)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            Open Mission Cockpit →
          </button>
        </div>

        <IndianFrame variant="stone" style={{ padding: '20px 24px' }}>
          {currentWorkItem ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
                    {currentWorkItem.title || ('objective' in currentWorkItem ? currentWorkItem.objective : 'Autonomous Execution')}
                  </h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {currentWorkItem.description || ('objective' in currentWorkItem ? currentWorkItem.objective : 'Autonomous milestone progression.')}
                  </p>
                </div>
                <span className="badge badge-running" style={{ fontSize: '11px', padding: '4px 10px' }}>
                  {currentWorkItem.status || 'EXECUTING'}
                </span>
              </div>

              {/* Live Handoff Chain (if agents working) */}
              {handoffChain.length > 0 && (
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '12px 16px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '8px' }}>
                    Active Working Agents
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '13px', fontWeight: 600 }}>
                    {handoffChain.map((agentName, idx) => (
                      <React.Fragment key={idx}>
                        <span
                          style={{
                            color: 'var(--color-cyan)',
                            background: 'rgba(0, 191, 255, 0.12)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            border: '1px solid var(--color-cyan)',
                          }}
                        >
                          {agentName}
                        </span>
                        {idx < handoffChain.length - 1 && (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>→</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {/* Progress Bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  <span>Pipeline Milestone Completion</span>
                  <span style={{ color: 'var(--color-cyan)', fontWeight: 700 }}>
                    {'progress' in currentWorkItem && typeof currentWorkItem.progress === 'number' ? `${currentWorkItem.progress}%` : 'In Progress'}
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'var(--bg-elevated)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: 'progress' in currentWorkItem && typeof currentWorkItem.progress === 'number' ? `${currentWorkItem.progress}%` : '50%',
                      background: 'linear-gradient(90deg, var(--color-teal), var(--color-cyan))',
                      borderRadius: '4px',
                      boxShadow: '0 0 10px rgba(0, 191, 255, 0.4)',
                    }}
                  />
                </div>
              </div>

              {/* Micro Live Indicators */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '12.5px', color: 'var(--text-secondary)', flexWrap: 'wrap', paddingTop: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--color-cyan)' }} />
                  <span><strong style={{ color: 'var(--text-primary)' }}>{workingAgents.length}</strong> agents working</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--color-gold)' }} />
                  <span><strong style={{ color: 'var(--text-primary)' }}>{waitingTasks.length}</strong> tasks waiting</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: pendingApprovals.length > 0 ? '#ef4444' : '#10b981' }} />
                  <span><strong style={{ color: pendingApprovals.length > 0 ? '#ef4444' : 'var(--text-primary)' }}>{pendingApprovals.length}</strong> approval required</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={32} style={{ margin: '0 auto 10px', color: '#10b981', opacity: 0.8 }} />
              <p style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)' }}>All Systems Calm & Standing By</p>
              <p style={{ fontSize: '12.5px', marginTop: '4px' }}>No active goals or missions currently running. Enter a command above to initiate autonomous execution.</p>
            </div>
          )}
        </IndianFrame>
      </div>

      {/* 3. ATTENTION SECTION */}
      <div className="animate-enter">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
            <h2 style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              ATTENTION
            </h2>
          </div>
          <button
            onClick={() => onNavigate('attention')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-gold)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            View Attention Center →
          </button>
        </div>

        {pendingApprovals.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pendingApprovals.slice(0, 3).map((req) => (
              <div
                key={req.id}
                style={{
                  background: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <ShieldAlert size={20} style={{ color: '#ef4444', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {req.toolName || 'Critical Operation'} requested by {req.agentId || 'Specialist Agent'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {req.reason || 'Requires explicit human governance sign-off prior to execution.'}
                    </div>
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  style={{ fontSize: '12px', padding: '6px 14px', background: '#ef4444', color: '#fff' }}
                  onClick={() => onNavigate('approvals')}
                >
                  Review
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '13px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)' }}>
              <CheckCircle2 size={16} style={{ color: '#10b981' }} />
              <span>All governance gates cleared • No pending approvals or blocked actions.</span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Status: Sovereign Protected</span>
          </div>
        )}
      </div>

      {/* 4. ORGANIZATION STATUS SECTION */}
      <div className="animate-enter">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Network size={14} style={{ color: 'var(--color-teal)' }} />
            <h2 style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              ORGANIZATION STATUS
            </h2>
          </div>
          <button
            onClick={() => onNavigate('organization')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-teal)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            Explore Mandala Hierarchy →
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px' }}>
          {/* Tile 1: Missions */}
          <div
            onClick={() => onNavigate('missions')}
            style={{
              padding: '16px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              transition: 'border-color 0.2s, transform 0.2s',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Missions</span>
              <Compass size={16} style={{ color: 'var(--color-cyan)' }} />
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {missions.length || 4} Active
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-cyan)', marginTop: '4px' }}>
              ● 1 In Flight • 3 Queued
            </div>
          </div>

          {/* Tile 2: Companies */}
          <div
            onClick={() => onNavigate('companies')}
            style={{
              padding: '16px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Companies</span>
              <Briefcase size={16} style={{ color: 'var(--color-gold)' }} />
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {companiesCount} Operating
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-gold)', marginTop: '4px' }}>
              ● Annapurna Autonomous
            </div>
          </div>

          {/* Tile 3: Agents */}
          <div
            onClick={() => onNavigate('agents')}
            style={{
              padding: '16px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Agents</span>
              <Users size={16} style={{ color: 'var(--color-teal)' }} />
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              33 Devas
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-teal)', marginTop: '4px' }}>
              ● 12 Ādityas • 11 Rudras • 8 Vasus
            </div>
          </div>

          {/* Tile 4: Automations */}
          <div
            onClick={() => onNavigate('automations')}
            style={{
              padding: '16px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Automations</span>
              <RefreshCw size={16} style={{ color: 'var(--color-cyan)' }} />
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              7 Active
            </div>
            <div style={{ fontSize: '11.5px', color: '#10b981', marginTop: '4px' }}>
              ● All schedules healthy
            </div>
          </div>

          {/* Tile 5: System Health */}
          <div
            onClick={() => onNavigate('environment')}
            style={{
              padding: '16px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>System</span>
              <Cpu size={16} style={{ color: '#10b981' }} />
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {status?.metrics?.cpuPercent !== undefined ? `${status.metrics.cpuPercent}% Load` : 'Nominal'}
            </div>
            <div style={{ fontSize: '11.5px', color: '#10b981', marginTop: '4px' }}>
              ● Local-First • Healthy
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
