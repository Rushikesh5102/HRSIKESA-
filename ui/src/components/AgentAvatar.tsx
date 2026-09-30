import React from 'react';
import {
  User, Shield, Code, Cpu, Sparkles, Terminal, Activity, Eye, Search, Layers,
  Compass, Zap, Crown, Flame, Wind, Droplets, Database, Sun, Moon, Anchor,
  FolderGit2, Palette, RefreshCw, BarChart3, Radio, FileText, Globe, Truck,
  HeartHandshake, Scale, DollarSign, Wrench, CloudRain, Lock
} from 'lucide-react';

interface AgentAvatarProps {
  agentId: string;
  name?: string;
  status?: string;
  size?: number;
}

const AGENT_COLORS: Record<string, { bg: string; border: string; iconColor: string }> = {
  // Leaders
  indra: { bg: 'rgba(234, 179, 8, 0.2)', border: '#eab308', iconColor: '#fde047' },
  prajapati: { bg: 'rgba(168, 85, 247, 0.2)', border: '#a855f7', iconColor: '#c084fc' },

  // 12 Ādityas (Vision, Governance & Design)
  dhata: { bg: 'rgba(245, 158, 11, 0.2)', border: '#f59e0b', iconColor: '#fbbf24' },
  mitra: { bg: 'rgba(59, 130, 246, 0.2)', border: '#3b82f6', iconColor: '#60a5fa' },
  aryaman: { bg: 'rgba(99, 102, 241, 0.2)', border: '#6366f1', iconColor: '#818cf8' },
  varuna: { bg: 'rgba(14, 165, 233, 0.2)', border: '#0ea5e9', iconColor: '#38bdf8' },
  amsa: { bg: 'rgba(34, 197, 94, 0.2)', border: '#22c55e', iconColor: '#4ade80' },
  bhaga: { bg: 'rgba(239, 68, 68, 0.2)', border: '#ef4444', iconColor: '#f87171' },
  vivasvan: { bg: 'rgba(249, 115, 22, 0.2)', border: '#f97316', iconColor: '#fb923c' },
  pusa: { bg: 'rgba(132, 204, 22, 0.2)', border: '#84cc16', iconColor: '#a3e635' },
  tvasta: { bg: 'rgba(217, 119, 6, 0.2)', border: '#d97706', iconColor: '#f59e0b' },
  savita: { bg: 'rgba(236, 72, 153, 0.2)', border: '#ec4899', iconColor: '#f472b6' },
  parjanya: { bg: 'rgba(6, 182, 212, 0.2)', border: '#06b6d4', iconColor: '#22d3ee' },
  visnu: { bg: 'rgba(139, 92, 246, 0.2)', border: '#8b5cf6', iconColor: '#a78bfa' },

  // 11 Rudras (Engineering, Transformation & Verification)
  manyu: { bg: 'rgba(220, 38, 38, 0.2)', border: '#dc2626', iconColor: '#f87171' },
  manu: { bg: 'rgba(217, 119, 6, 0.2)', border: '#d97706', iconColor: '#f59e0b' },
  mahinasa: { bg: 'rgba(100, 116, 139, 0.2)', border: '#64748b', iconColor: '#94a3b8' },
  mahan: { bg: 'rgba(79, 70, 229, 0.2)', border: '#4f46e5', iconColor: '#818cf8' },
  siva: { bg: 'rgba(16, 185, 129, 0.2)', border: '#10b981', iconColor: '#34d399' },
  ritadhvaja: { bg: 'rgba(236, 72, 153, 0.2)', border: '#ec4899', iconColor: '#f472b6' },
  ugrareta: { bg: 'rgba(185, 28, 28, 0.2)', border: '#b91c1c', iconColor: '#ef4444' },
  bhava: { bg: 'rgba(20, 184, 166, 0.2)', border: '#14b8a6', iconColor: '#2dd4bf' },
  kala_rudra: { bg: 'rgba(120, 113, 108, 0.2)', border: '#78716c', iconColor: '#a8a29e' },
  vamadeva: { bg: 'rgba(244, 114, 182, 0.2)', border: '#f472b6', iconColor: '#fbcfe8' },
  dhritavrata: { bg: 'rgba(2, 132, 199, 0.2)', border: '#0284c7', iconColor: '#38bdf8' },

  // 8 Vasus (Infrastructure, Foundations & Persistence)
  dhara: { bg: 'rgba(180, 83, 9, 0.2)', border: '#b45309', iconColor: '#d97706' },
  anala: { bg: 'rgba(234, 88, 12, 0.2)', border: '#ea580c', iconColor: '#fb923c' },
  anila: { bg: 'rgba(56, 189, 248, 0.2)', border: '#38bdf8', iconColor: '#7dd3fc' },
  apa: { bg: 'rgba(6, 182, 212, 0.2)', border: '#06b6d4', iconColor: '#67e8f9' },
  pratyusa: { bg: 'rgba(250, 204, 21, 0.2)', border: '#facc15', iconColor: '#fde047' },
  prabhasa: { bg: 'rgba(168, 85, 247, 0.2)', border: '#a855f7', iconColor: '#d8b4fe' },
  soma: { bg: 'rgba(147, 197, 253, 0.2)', border: '#93c5fd', iconColor: '#bfdbfe' },
  dhruva: { bg: 'rgba(15, 118, 110, 0.2)', border: '#0f766e', iconColor: '#2dd4bf' },
};

const AGENT_ICONS: Record<string, React.ReactNode> = {
  // Leaders
  indra: <Crown size={18} />,
  prajapati: <Sparkles size={18} />,

  // 12 Ādityas
  dhata: <Compass size={18} />,
  mitra: <HeartHandshake size={18} />,
  aryaman: <Scale size={18} />,
  varuna: <Shield size={18} />,
  amsa: <DollarSign size={18} />,
  bhaga: <Search size={18} />,
  vivasvan: <Globe size={18} />,
  pusa: <Truck size={18} />,
  tvasta: <Wrench size={18} />,
  savita: <Sparkles size={18} />,
  parjanya: <CloudRain size={18} />,
  visnu: <Layers size={18} />,

  // 11 Rudras
  manyu: <Code size={18} />,
  manu: <FileText size={18} />,
  mahinasa: <Terminal size={18} />,
  mahan: <Cpu size={18} />,
  siva: <RefreshCw size={18} />,
  ritadhvaja: <Lock size={18} />,
  ugrareta: <Zap size={18} />,
  bhava: <Activity size={18} />,
  kala_rudra: <Eye size={18} />,
  vamadeva: <Palette size={18} />,
  dhritavrata: <Shield size={18} />,

  // 8 Vasus
  dhara: <Database size={18} />,
  anala: <Flame size={18} />,
  anila: <Wind size={18} />,
  apa: <Droplets size={18} />,
  pratyusa: <Zap size={18} />,
  prabhasa: <Sun size={18} />,
  soma: <Moon size={18} />,
  dhruva: <Anchor size={18} />,
};

import { AgentPortrait } from './AgentPortrait';

export const AgentAvatar: React.FC<AgentAvatarProps> = ({
  agentId,
  name,
  status = 'READY',
  size = 40,
}) => {
  const normalizedId = (agentId || 'manyu').toLowerCase();
  const isRunning = ['RUNNING', 'WORKING', 'executing'].includes(status.toLowerCase());

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${size}px`,
        height: `${size}px`,
        flexShrink: 0,
      }}
      title={`${name || agentId} (${status})`}
    >
      <AgentPortrait agentId={normalizedId} name={name} size={size} showAura={isRunning} />

      {/* Online / Active Status Beacon */}
      <span
        style={{
          position: 'absolute',
          bottom: '0px',
          right: '0px',
          width: `${Math.max(8, Math.round(size * 0.22))}px`,
          height: `${Math.max(8, Math.round(size * 0.22))}px`,
          borderRadius: '50%',
          backgroundColor: isRunning ? '#10b981' : '#64748b',
          border: '2px solid #0e0804',
          boxShadow: isRunning ? '0 0 8px #10b981' : 'none',
          zIndex: 2,
        }}
      />
    </div>
  );
};
