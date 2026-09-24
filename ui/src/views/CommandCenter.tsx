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
  companiesCount,
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
  const activeMissions = missions.filter((m) => ['RUNNING', 'PLANNING', 'VERIFYING', 'READY'].includes(m.status));
  const pendingApprovals = approvals.filter((a) => a.status === 'PENDING');
  const workingAgents = agents.filter((a) => ['RUNNING', 'WORKING', 'executing'].includes(a.status.toLowerCase()));

  // Determine current AI Core 3D State
  let coreState: AICoreState = 'IDLE';
  if (pendingApprovals.length > 0) {
    coreState = 'SPEAKING';
  } else if (workingAgents.length > 0 || activeGoals.length > 0) {
    coreState = 'WORKING';
  }

  const currentWorkItem = activeGoals[0] || activeMissions[0];

  const getHumanStatus = (statusStr?: string) => {
    if (!statusStr) return 'Working';
    switch (statusStr.toUpperCase()) {
      case 'PLANNING':
        return 'Planning';
      case 'EXECUTING':
      case 'RUNNING':
        return 'Working';
      case 'VERIFYING':
        return 'Verifying';
      case 'WAITING':
        return 'Waiting for you';
      case 'BLOCKED':
        return 'Needs approval';
      case 'COMPLETED':
        return 'Completed';
      case 'PAUSED':
        return 'Paused';
      default:
        return 'Working';
    }
  };

  const getAgentRoleDescription = (agentId: string) => {
    switch (agentId.toLowerCase()) {
      case 'gandiva':
        return 'Gāṇḍīva is coding';
      case 'vighna':
        return 'Vighna is testing & checking';
      case 'rahu':
        return 'Rahu is researching intelligence';
      case 'aja':
        return 'Aja is planning strategy';
      case 'ritvan':
        return 'Ritvan is setting up structure';
      case 'spoota':
        return 'Spoota is designing';
      case 'kala':
      case 'kāla':
        return 'KĀLA is scheduling';
      default:
        return `${agentId} is working`;
    }
  };

  // Determine the most active task / mission
  const activeTask = tasks.find((t) => ['RUNNING', 'WORKING', 'executing'].includes((t.status || '').toLowerCase())) || tasks[0];
  const activeAgentId = activeTask?.assignedAgent || activeMissions[0]?.rootAgentId || (workingAgents[0]?.id) || 'gandiva';
  const dashboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (dashboardRef.current) {
      const cards = dashboardRef.current.querySelectorAll('[style*="gridTemplateColumns"] > div');
      if (cards.length > 0) {
        AnimationService.animateStagger(cards as any, 35);
      }
    }
  }, []);

  const isAnyAgentWorking = workingAgents.length > 0 || activeMissions.length > 0 || (activeTask && activeTask.status === 'RUNNING');

  return (
    <div ref={dashboardRef} style={{ maxWidth: '1020px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 0. LIVE SOVEREIGN ACTIVE AGENT BAR */}
      {isAnyAgentWorking ? (
        <div
          style={{
            background: 'linear-gradient(90deg, rgba(217, 119, 6, 0.18) 0%, rgba(15, 13, 10, 0.95) 100%)',
            border: '1.5px solid var(--accent-saffron)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            boxShadow: '0 0 20px rgba(217, 119, 6, 0.3)',
            animation: 'pulseGlow 3s infinite alternate',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: 1 }}>
            <AgentAvatar agentId={activeAgentId} name={activeAgentId} status="RUNNING" size={46} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-gold)', fontFamily: 'var(--font-cinzel)' }}>
                  {activeAgentId.toUpperCase()}
                </span>
                <span className="badge badge-running" style={{ fontSize: '10.5px' }}>
                  ⚡ ACTIVE EXECUTION
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle)', fontFamily: 'monospace' }}>
                  tool: {activeTask?.toolUsage?.[0] || 'filesystem.write'}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-gold)', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle)', fontFamily: 'monospace' }}>
                  model: qwen2.5:7b (Ollama)
                </span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {activeTask?.title || activeMissions[0]?.title || 'Executing autonomous workspace task...'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button
              className="btn btn-primary"
              style={{ fontSize: '12px', padding: '6px 14px' }}
              onClick={() => onNavigate('work')}
            >
              <Briefcase size={14} />
              Open Control Deck & Files
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12.5px',
            color: 'var(--text-secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>17 Autonomous Specialists Standing By</span>
            <span>• All systems nominal in Agent Town</span>
          </div>
          <button
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-gold)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            onClick={() => onNavigate('agent-town')}
          >
            Visit Agent Town 3D →
          </button>
        </div>
      )}

      {/* 1. Grand Vedic Cosmic Yantra & Sovereign Core (Panel 1) */}
      <div className="temple-sanctum-bg" style={{ padding: '36px 24px 28px', position: 'relative' }}>
        {/* Carved stone temple arches on left & right */}
        <div className="temple-pillar-arch" />
        <div className="temple-pillar-arch right" />

        {/* Central Cosmic Yantra Stage */}
        <div className="cosmic-yantra-stage" style={{ width: '100%', maxWidth: '560px', height: '440px', position: 'relative', margin: '0 auto' }}>
          {/* SVG Sacred Geometry Mandala Background */}
          <svg
            viewBox="0 0 500 500"
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              top: 0,
              left: 0,
              pointerEvents: 'none',
            }}
          >
            <defs>
              <radialGradient id="yantraGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffd700" stopOpacity="0.4" />
                <stop offset="35%" stopColor="#00e5ff" stopOpacity="0.25" />
                <stop offset="70%" stopColor="#b8860b" stopOpacity="0.1" />
                <stop offset="100%" stopColor="transparent" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="goldCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffd700" />
                <stop offset="50%" stopColor="#00e5ff" />
                <stop offset="100%" stopColor="#d4af37" />
              </linearGradient>
            </defs>

            {/* Radiant Background Aura */}
            <circle cx="250" cy="250" r="230" fill="url(#yantraGlow)" />

            {/* Outer Concentric Rings */}
            <circle cx="250" cy="250" r="215" fill="none" stroke="rgba(0, 229, 255, 0.35)" strokeWidth="1.2" strokeDasharray="4 6" style={{ animation: 'spinClockwise 120s linear infinite', transformOrigin: 'center' }} />
            <circle cx="250" cy="250" r="190" fill="none" stroke="rgba(245, 200, 66, 0.45)" strokeWidth="1.5" />
            <circle cx="250" cy="250" r="165" fill="none" stroke="rgba(0, 229, 255, 0.55)" strokeWidth="1.2" strokeDasharray="8 4" style={{ animation: 'spinCounterClockwise 80s linear infinite', transformOrigin: 'center' }} />
            <circle cx="250" cy="250" r="135" fill="none" stroke="rgba(212, 175, 55, 0.65)" strokeWidth="1.8" />
            <circle cx="250" cy="250" r="95" fill="none" stroke="rgba(0, 229, 255, 0.75)" strokeWidth="1.5" />
            <circle cx="250" cy="250" r="55" fill="none" stroke="rgba(255, 215, 0, 0.85)" strokeWidth="2" />

            {/* Interlocking Vedic Sri Yantra Triangles */}
            <polygon points="250,115 365,315 135,315" fill="none" stroke="rgba(245, 200, 66, 0.4)" strokeWidth="1.5" />
            <polygon points="250,385 135,185 365,185" fill="none" stroke="rgba(0, 229, 255, 0.4)" strokeWidth="1.5" />
            <polygon points="250,140 345,305 155,305" fill="none" stroke="rgba(245, 200, 66, 0.3)" strokeWidth="1.2" />
            <polygon points="250,360 155,195 345,195" fill="none" stroke="rgba(0, 229, 255, 0.3)" strokeWidth="1.2" />

            {/* Ray Lines Connecting Center to Orbitals */}
            <line x1="250" y1="250" x2="60" y2="120" stroke="rgba(0, 229, 255, 0.35)" strokeDasharray="3 3" />
            <line x1="250" y1="250" x2="40" y2="250" stroke="rgba(0, 229, 255, 0.35)" strokeDasharray="3 3" />
            <line x1="250" y1="250" x2="60" y2="370" stroke="rgba(0, 229, 255, 0.35)" strokeDasharray="3 3" />
            <line x1="250" y1="250" x2="440" y2="120" stroke="rgba(245, 200, 66, 0.35)" strokeDasharray="3 3" />
            <line x1="250" y1="250" x2="460" y2="250" stroke="rgba(245, 200, 66, 0.35)" strokeDasharray="3 3" />
            <line x1="250" y1="250" x2="440" y2="370" stroke="rgba(245, 200, 66, 0.35)" strokeDasharray="3 3" />

            {/* 12 Petal Lotus Ring */}
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30 * Math.PI) / 180;
              const x1 = 250 + Math.cos(angle) * 75;
              const y1 = 250 + Math.sin(angle) * 75;
              const x2 = 250 + Math.cos(angle + 0.15) * 95;
              const y2 = 250 + Math.sin(angle + 0.15) * 95;
              return <circle key={i} cx={x1} cy={y1} r="3" fill="#00e5ff" opacity="0.8" />;
            })}
          </svg>

          {/* Central Pulsing Sun/Lotus Core */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 3,
              cursor: 'pointer',
            }}
            onClick={() => onNavigate('chat')}
          >
            <div className="yantra-core-lotus">
              <AICore state={coreState} size={110} interactive={false} />
            </div>
          </div>

          {/* 6 Orbital Holographic Metric Nodes (Panel 1) */}
          {/* 1. TOP-LEFT: AGENTS */}
          <div
            className="orbital-badge-card"
            style={{ top: '60px', left: '10px' }}
            onClick={() => onNavigate('agents')}
            title="View 17 Autonomous Specialists"
          >
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(0, 229, 255, 0.2)', border: '1px solid #00e5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00e5ff' }}>
              <Users size={16} />
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
                AGENTS
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-teal)', fontFamily: 'var(--font-mono)' }}>
                {workingAgents.length > 0 ? `${workingAgents.length} Active` : `${agents.length || 17} Ready`}
              </div>
            </div>
          </div>

          {/* 2. MID-LEFT: KNOWLEDGE */}
          <div
            className="orbital-badge-card"
            style={{ top: '190px', left: '-15px' }}
            onClick={() => onNavigate('knowledge')}
            title="Explore Vedic Knowledge Graph"
          >
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(0, 196, 168, 0.15)', border: '1px solid var(--color-teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-teal)' }}>
              <Layers size={16} />
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
                KNOWLEDGE
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-teal)', fontFamily: 'var(--font-mono)' }}>
                {knowledgeCount ?? 16} Nodes
              </div>
            </div>
          </div>

          {/* 3. BOTTOM-LEFT: MEMORY */}
          <div
            className="orbital-badge-card"
            style={{ bottom: '70px', left: '10px' }}
            onClick={() => onNavigate('memory')}
            title="View Persistent Memory Tiers"
          >
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(0, 196, 168, 0.15)', border: '1px solid var(--color-teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-teal)' }}>
              <Sparkles size={16} />
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
                HOST RAM
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-teal)', fontFamily: 'var(--font-mono)' }}>
                {status?.hardware?.memory?.usedPercentage ? `${status.hardware.memory.usedPercentage}% Load` : 'Nominal'}
              </div>
            </div>
          </div>

          {/* 4. TOP-RIGHT: COMPANIES */}
          <div
            className="orbital-badge-card"
            style={{ top: '60px', right: '10px' }}
            onClick={() => onNavigate('companies')}
            title="View Multi-tenant Companies"
          >
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', textAlign: 'right' }}>
                COMPANIES
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-gold-light)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                {companiesCount ?? 0} Registered
              </div>
            </div>
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(200, 146, 14, 0.15)', border: '1px solid var(--color-gold-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gold-light)' }}>
              <Briefcase size={16} />
            </div>
          </div>

          {/* 5. MID-RIGHT: MISSIONS */}
          <div
            className="orbital-badge-card"
            style={{ top: '190px', right: '-15px' }}
            onClick={() => onNavigate('missions')}
            title="View Active Autonomous Missions"
          >
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', textAlign: 'right' }}>
                MISSIONS
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-gold-light)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                {missions.length} Missions
              </div>
            </div>
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(200, 146, 14, 0.15)', border: '1px solid var(--color-gold-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gold-light)' }}>
              <Play size={16} />
            </div>
          </div>

          {/* 6. BOTTOM-RIGHT: TASKS */}
          <div
            className="orbital-badge-card"
            style={{ bottom: '70px', right: '10px' }}
            onClick={() => onNavigate('work')}
            title="View Autonomous Tasks"
          >
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', textAlign: 'right' }}>
                TASKS
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-gold-light)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                {tasks.length} Managed
              </div>
            </div>
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(200, 146, 14, 0.15)', border: '1px solid var(--color-gold-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gold-light)' }}>
              <Clock size={16} />
            </div>
          </div>
        </div>

        {/* Brand & Sanskrit Tagline from Panel 1 */}
        <div style={{ marginTop: '12px', textAlign: 'center', position: 'relative', zIndex: 4 }}>
          <div
            className="devanagari-hero-title"
            style={{
              fontFamily: 'var(--font-display)',
              letterSpacing: '0.18em',
              color: 'var(--color-gold)',
            }}
          >
            HṚṢĪKEŚA
          </div>

          <div
            className="devanagari-tagline"
            style={{
              fontFamily: 'var(--font-body)',
              letterSpacing: '0.15em',
              color: '#5a3618',
              fontSize: '11px',
              textTransform: 'uppercase',
              marginTop: '4px',
            }}
          >
            Knowledge · Action · Evolution · Harmony
          </div>
        </div>
      </div>

      {/* 2. Main Command Bar (Universal Prompt) */}
      <IndianFrame variant="stone" style={{ padding: '16px 20px' }}>
        <form onSubmit={handleCommandSubmit} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-saffron), var(--accent-gold))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0F0D0A',
              flexShrink: 0,
            }}
          >
            <Sparkles size={18} />
          </div>

          <input
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder="Tell HṚṢĪKEŚA what you want to build, research, automate, or inspect..."
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
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              transition: 'color 0.2s',
            }}
            title="Voice Input"
          >
            <Mic size={19} />
          </button>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: '8px 18px', fontSize: '13.5px' }}
            disabled={!commandInput.trim()}
          >
            <span>Ask</span>
            <Send size={15} />
          </button>
        </form>
      </IndianFrame>

      {/* 3. Pending Approvals Alert (if any) */}
      {pendingApprovals.length > 0 && (
        <IndianFrame
          variant="glow"
          style={{
            borderColor: 'var(--accent-saffron)',
            background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.12) 0%, rgba(20, 16, 12, 0.9) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(217, 119, 6, 0.2)',
                  border: '1px solid var(--accent-saffron)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-saffron-light)',
                }}
              >
                <ShieldAlert size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Action Requires Your Approval ({pendingApprovals.length})
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {pendingApprovals[0].toolName || 'A critical tool'} needs your confirmation before continuing.
                </p>
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => onNavigate('approvals')}
              style={{ fontSize: '13px' }}
            >
              Review Now
              <ArrowRight size={15} />
            </button>
          </div>
        </IndianFrame>
      )}

      {/* 4. Active Work & Agent Living Workforce Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        {/* Living Work Status */}
        <IndianFrame
          title="Current Work"
          subtitle="Real-time autonomous progress"
          badge={
            currentWorkItem ? (
              <span className="badge badge-running">
                {getHumanStatus(currentWorkItem.status)}
              </span>
            ) : (
              <span className="badge badge-online">Ready</span>
            )
          }
        >
          {currentWorkItem ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {currentWorkItem.title || ('objective' in currentWorkItem ? currentWorkItem.objective : 'Current Active Work')}
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {currentWorkItem.description || ('objective' in currentWorkItem ? currentWorkItem.objective : 'Executing autonomous milestones.')}
                </p>
              </div>

              {/* Progress Bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  <span>Progress</span>
                  <span style={{ color: 'var(--text-gold)', fontWeight: 600 }}>
                    {'progress' in currentWorkItem && typeof currentWorkItem.progress === 'number'
                      ? `${Math.round(currentWorkItem.progress)}%`
                      : 'In Progress'}
                  </span>
                </div>
                <div style={{ width: '100%', height: '7px', background: 'var(--bg-elevated)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${'progress' in currentWorkItem && typeof currentWorkItem.progress === 'number' ? currentWorkItem.progress : 50}%`,
                      background: 'linear-gradient(90deg, var(--accent-saffron), var(--accent-gold))',
                      borderRadius: '4px',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => onNavigate('work')}
                  style={{ fontSize: '12px', padding: '6px 14px' }}
                >
                  Open Work Details
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 10px', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={32} style={{ margin: '0 auto 10px auto', color: '#10B981', opacity: 0.8 }} />
              <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>All systems calm & ready</p>
              <p style={{ fontSize: '12.5px', marginTop: '4px' }}>No active goals or missions currently running.</p>
              <button
                className="btn btn-secondary"
                onClick={() => onNavigate('work')}
                style={{ marginTop: '14px', fontSize: '12.5px' }}
              >
                <Plus size={14} />
                Create New Work
              </button>
            </div>
          )}
        </IndianFrame>

        {/* 3D Active Agent Team Snapshot */}
        <IndianFrame
          title="Agent Workforce"
          subtitle={`${workingAgents.length} active • ${agents.length} specialized agents`}
          badge={
            <button
              onClick={() => onNavigate('agent-town')}
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
              Agent Town
              <ArrowRight size={13} />
            </button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {agents.slice(0, 4).map((agent) => {
              const isWorking = ['RUNNING', 'WORKING', 'executing'].includes(agent.status.toLowerCase());
              return (
                <div
                  key={agent.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <AgentAvatar agentId={agent.id} name={agent.name} status={agent.status} size={36} />
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {agent.name}
                      </div>
                      <div style={{ fontSize: '11.5px', color: isWorking ? 'var(--accent-saffron-light)' : 'var(--text-muted)' }}>
                        {isWorking ? getAgentRoleDescription(agent.id) : (agent.role || 'Specialized Agent')}
                      </div>
                    </div>
                  </div>

                  <span className={`badge ${isWorking ? 'badge-running' : 'badge-gold'}`}>
                    {isWorking ? 'Working' : 'Ready'}
                  </span>
                </div>
              );
            })}
          </div>
        </IndianFrame>
      </div>

      {/* 5. System Health & Environment Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '14px',
        }}
      >
        <div
          style={{
            padding: '14px 16px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Model Engine</div>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {health?.status === 'ok' ? 'qwen2.5:7b (Local)' : 'Local LLM Active'}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '14px 16px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#06B6D4' }} />
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Governed Tools</div>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {tasks.length > 0 ? `${tasks.length} active tasks` : 'Sandboxed & Secure'}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '14px 16px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-gold)' }} />
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Memory Tiers</div>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Vector + SQLite Synced
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '14px 16px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Voice Pipeline</div>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Web Speech + SAPI
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
