import React from 'react';
import { User, Shield, Code, Cpu, Sparkles, Terminal, Activity, Eye, Search, Layers, Compass, Zap } from 'lucide-react';

interface AgentAvatarProps {
  agentId: string;
  name?: string;
  status?: string;
  size?: number;
}

const AGENT_COLORS: Record<string, { bg: string; border: string; iconColor: string }> = {
  rahu: { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', iconColor: '#f87171' },
  aja: { bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', iconColor: '#fbbf24' },
  ritvan: { bg: 'rgba(59, 130, 246, 0.15)', border: '#3b82f6', iconColor: '#60a5fa' },
  tvas: { bg: 'rgba(16, 185, 129, 0.15)', border: '#10b981', iconColor: '#34d399' },
  spoota: { bg: 'rgba(168, 85, 247, 0.15)', border: '#a855f7', iconColor: '#c084fc' },
  gandiva: { bg: 'rgba(217, 119, 6, 0.2)', border: 'var(--accent-gold, #f59e0b)', iconColor: '#fbbf24' },
  vighna: { bg: 'rgba(236, 72, 153, 0.15)', border: '#ec4899', iconColor: '#f472b6' },
  raudra: { bg: 'rgba(220, 38, 38, 0.2)', border: '#dc2626', iconColor: '#f87171' },
  rutam: { bg: 'rgba(14, 165, 233, 0.15)', border: '#0ea5e9', iconColor: '#38bdf8' },
  arvan: { bg: 'rgba(132, 204, 22, 0.15)', border: '#84cc16', iconColor: '#a3e635' },
  kalki: { bg: 'rgba(245, 158, 11, 0.25)', border: '#d97706', iconColor: '#f59e0b' },
  garuda: { bg: 'rgba(6, 182, 212, 0.15)', border: '#06b6d4', iconColor: '#22d3ee' },
};

const AGENT_ICONS: Record<string, React.ReactNode> = {
  gandiva: <Code size={18} />,
  vighna: <Shield size={18} />,
  rahu: <Search size={18} />,
  aja: <Compass size={18} />,
  ritvan: <Layers size={18} />,
  spoota: <Sparkles size={18} />,
  raudra: <Zap size={18} />,
  rutam: <Activity size={18} />,
  kalki: <Cpu size={18} />,
  garuda: <Eye size={18} />,
};

export const AgentAvatar: React.FC<AgentAvatarProps> = ({
  agentId,
  name,
  status = 'READY',
  size = 40,
}) => {
  const normalizedId = (agentId || 'gandiva').toLowerCase();
  const theme = AGENT_COLORS[normalizedId] || {
    bg: 'rgba(245, 158, 11, 0.15)',
    border: 'var(--border-subtle, #334155)',
    iconColor: 'var(--accent-gold, #f59e0b)',
  };

  const isRunning = ['RUNNING', 'WORKING', 'executing'].includes(status.toLowerCase());
  const icon = AGENT_ICONS[normalizedId] || <User size={size * 0.45} />;
  const initial = (name || agentId || 'A')[0].toUpperCase();

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '10px',
        background: theme.bg,
        border: `1.5px solid ${isRunning ? theme.border : 'rgba(255,255,255,0.1)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        flexShrink: 0,
        boxShadow: isRunning ? `0 0 12px ${theme.border}44` : 'none',
        color: theme.iconColor,
      }}
      title={`${name || agentId} (${status})`}
    >
      {icon}

      {/* Online Status Beacon */}
      <span
        style={{
          position: 'absolute',
          bottom: '-2px',
          right: '-2px',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: isRunning ? '#10b981' : '#64748b',
          border: '1.5px solid #0f172a',
          boxShadow: isRunning ? '0 0 6px #10b981' : 'none',
        }}
      />
    </div>
  );
};
