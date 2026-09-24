import React from 'react';
import { AgentInfo } from '../types/api.types';
import { AgentAvatar } from './AgentAvatar';
import { Compass, Hammer, BookOpen, Zap, TrendingUp, Shield, Layers, Radio } from 'lucide-react';

interface AgentTownMapProps {
  agents: AgentInfo[];
  selectedAgentId?: string;
  onSelectAgent?: (id: string) => void;
  height?: number;
}

export const VEDIC_ENCLAVES = [
  {
    id: 'sabha',
    name: 'Sabha',
    sanskrit: 'सभा',
    role: 'Strategy & Governance',
    description: 'Supreme planning council, roadmap decomposition & leadership alignment.',
    icon: <Compass size={17} />,
    color: '#F5C842',
    agentIds: ['aja', 'ritvan'],
    position: { top: '15%', left: '16%' },
  },
  {
    id: 'karmashala',
    name: 'Karmashala',
    sanskrit: 'कर्मशाला',
    role: 'Engineering & Building',
    description: 'Autonomous coding, refactoring, compilers & feature construction.',
    icon: <Hammer size={17} />,
    color: '#00E5FF',
    agentIds: ['gandiva', 'spoota', 'tvas'],
    position: { top: '15%', right: '16%' },
  },
  {
    id: 'granthalaya',
    name: 'Granthalaya',
    sanskrit: 'ग्रन्थालय',
    role: 'Research & Knowledge',
    description: 'Web intelligence, academic synthesis, literature & knowledge graph.',
    icon: <BookOpen size={17} />,
    color: '#4DD0E1',
    agentIds: ['rahu', 'rutam'],
    position: { top: '42%', left: '10%' },
  },
  {
    id: 'vyavahara',
    name: 'Vyavahara',
    sanskrit: 'व्यवहार',
    role: 'Operations & Execution',
    description: 'Continuous task execution, runtime delivery & autonomous agent coordination.',
    icon: <Zap size={17} />,
    color: '#FFD700',
    agentIds: ['arvan', 'garuda'],
    position: { top: '38%', left: '50%', transform: 'translateX(-50%)' },
  },
  {
    id: 'arthashala',
    name: 'Arthashala',
    sanskrit: 'अर्थशाला',
    role: 'Finance & Optimization',
    description: 'Commercial efficiency, compute quota, cost tracking & monetization.',
    icon: <TrendingUp size={17} />,
    color: '#F59E0B',
    agentIds: ['taraka'],
    position: { top: '42%', right: '10%' },
  },
  {
    id: 'raksha',
    name: 'Raksha',
    sanskrit: 'रक्षा',
    role: 'Verification & Security',
    description: 'Security guardrails, sandbox testing, quality assurance & defect immunity.',
    icon: <Shield size={17} />,
    color: '#10B981',
    agentIds: ['vighna', 'raudra', 'kali'],
    position: { top: '68%', left: '20%' },
  },
  {
    id: 'parivartana',
    name: 'Parivartana',
    sanskrit: 'परिवर्तन',
    role: 'Improvement & Scaling',
    description: 'Self-healing, prompt optimization, runtime benchmarks & code evolution.',
    icon: <Layers size={17} />,
    color: '#A855F7',
    agentIds: ['kalki'],
    position: { top: '68%', left: '50%', transform: 'translateX(-50%)' },
  },
  {
    id: 'dootalaya',
    name: 'Dootalaya',
    sanskrit: 'दूतालय',
    role: 'Communication & Scheduling',
    description: 'Timers, inter-agent messaging, persistent continuity & external bridges.',
    icon: <Radio size={17} />,
    color: '#EC4899',
    agentIds: ['kaala', 'yama', 'mrtyu'],
    position: { top: '68%', right: '20%' },
  },
];

export const AgentTownMap: React.FC<AgentTownMapProps> = ({
  agents,
  selectedAgentId,
  onSelectAgent,
  height = 460,
}) => {
  const totalAgents = agents.length || 17;
  const activeCount = agents.filter(a => ['running', 'working', 'executing', 'busy'].includes((a.status || '').toLowerCase())).length;
  const idleCount = totalAgents - activeCount;

  return (
    <div
      style={{
        height: `${height}px`,
        position: 'relative',
        borderRadius: 'var(--radius-lg)',
        border: '1.5px solid var(--border-color)',
        overflow: 'hidden',
        background: "linear-gradient(180deg, rgba(10, 6, 2, 0.2) 0%, rgba(10, 6, 2, 0.6) 100%), url('/assets/agent_town.jpg') center center / cover no-repeat",
      }}
    >
      {/* Scenic Vedic Golden Temple City Silhouette & Himalayan Backdrop */}
      <svg
        viewBox="0 0 1000 500"
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          opacity: 0.55,
        }}
      >
        <defs>
          <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4A260C" stopOpacity="0.8" />
            <stop offset="40%" stopColor="#2A1608" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#140903" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="templeGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFD700" stopOpacity="0.4" />
            <stop offset="70%" stopColor="#B8860B" stopOpacity="0.15" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="mountainHaze" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E2A645" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0B0602" stopOpacity="0" />
          </linearGradient>
        </defs>

        <rect width="1000" height="500" fill="url(#skyGrad)" />

        {/* Distant Himalayan Peaks */}
        <polygon points="0,220 120,110 240,230 380,80 500,200 640,90 780,220 900,120 1000,210 1000,500 0,500" fill="url(#mountainHaze)" />
        <polygon points="100,260 220,170 340,260 480,140 600,250 720,150 860,270 1000,200 1000,500 0,500" fill="rgba(24, 14, 6, 0.75)" />

        {/* Classical Shikhara Temple Spire Silhouettes */}
        <path d="M 470,250 L 500,120 L 530,250 L 520,310 L 480,310 Z" fill="url(#templeGold)" />
        <circle cx="500" cy="115" r="5" fill="#FFD700" filter="drop-shadow(0 0 8px #FFD700)" />

        <path d="M 280,280 L 305,170 L 330,280 Z" fill="url(#templeGold)" />
        <path d="M 670,280 L 695,170 L 720,280 Z" fill="url(#templeGold)" />
        <path d="M 140,300 L 160,200 L 180,300 Z" fill="url(#templeGold)" opacity="0.6" />
        <path d="M 820,300 L 840,200 L 860,300 Z" fill="url(#templeGold)" opacity="0.6" />

        {/* Reflecting Pool & Water Caustics */}
        <ellipse cx="500" cy="460" rx="380" ry="40" fill="rgba(0, 229, 255, 0.08)" />
        <ellipse cx="500" cy="460" rx="280" ry="25" fill="rgba(245, 200, 66, 0.05)" />
      </svg>

      {/* Top Banner (Panel 2): "HṚṢĪKEŚA / Agent Town / कार्यबल नगर" + dynamic Active | Idle */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '16px',
          right: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 16px',
          background: 'rgba(15, 10, 5, 0.85)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid rgba(212, 168, 55, 0.35)',
          backdropFilter: 'blur(10px)',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: 'linear-gradient(135deg, var(--accent-saffron), var(--accent-gold))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F0D0A', fontWeight: 800, fontSize: '12px' }}>
            🏛️
          </div>
          <div>
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-cinzel)' }}>
              Agent Town
            </span>
            <span style={{ fontSize: '11px', color: 'var(--accent-gold)', marginLeft: '8px', fontFamily: 'var(--font-devanagari)', fontWeight: 600 }}>
              कार्यबल नगर
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-gold)', fontFamily: 'var(--font-cinzel)' }}>
            {totalAgents} Agents
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>|</span>
          <span style={{ fontSize: '11.5px', color: activeCount > 0 ? '#10B981' : 'var(--text-secondary)', fontWeight: 600 }}>
            {activeCount} Active
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>•</span>
          <span style={{ fontSize: '11.5px', color: 'var(--accent-saffron-light)' }}>
            {idleCount} Idle
          </span>
        </div>
      </div>

      {/* The 8 Labeled Vedic Enclave Landmarks (Panel 2) */}
      {VEDIC_ENCLAVES.map((enclave) => {
        const enclaveAgents = agents.filter((a) =>
          enclave.agentIds.some((id) => a.id.toLowerCase().includes(id))
        );
        const hasSelected = enclaveAgents.some((a) => a.id === selectedAgentId);

        return (
          <div
            key={enclave.id}
            style={{
              position: 'absolute',
              ...enclave.position,
              zIndex: 5,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
            }}
            onClick={() => {
              if (enclaveAgents.length > 0 && onSelectAgent) {
                onSelectAgent(enclaveAgents[0].id);
              }
            }}
          >
            {/* Labeled Landmark Badge */}
            <div
              style={{
                background: hasSelected ? 'rgba(35, 22, 10, 0.95)' : 'rgba(18, 12, 6, 0.88)',
                border: `1.5px solid ${hasSelected ? 'var(--accent-gold-bright)' : 'rgba(212, 168, 55, 0.45)'}`,
                borderRadius: '8px',
                padding: '6px 12px',
                backdropFilter: 'blur(10px)',
                boxShadow: hasSelected
                  ? '0 0 20px rgba(245, 200, 66, 0.4)'
                  : '0 4px 16px rgba(0,0,0,0.7)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ color: enclave.color, display: 'flex', alignItems: 'center' }}>
                {enclave.icon}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-cinzel)' }}>
                    {enclave.name}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--accent-gold)', fontFamily: 'var(--font-devanagari)' }}>
                    {enclave.sanskrit}
                  </span>
                </div>
                <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {enclave.role}
                </span>
              </div>
            </div>

            {/* Stationed Agents Avatars (Tiny avatars attached below) */}
            <div style={{ display: 'flex', gap: '3px', marginTop: '4px' }}>
              {enclaveAgents.map((agent) => (
                <div
                  key={agent.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectAgent) onSelectAgent(agent.id);
                  }}
                  style={{
                    transform: selectedAgentId === agent.id ? 'scale(1.2)' : 'scale(1)',
                    transition: 'transform 0.15s',
                  }}
                >
                  <AgentAvatar agentId={agent.id} name={agent.name} status={agent.status} size={22} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
