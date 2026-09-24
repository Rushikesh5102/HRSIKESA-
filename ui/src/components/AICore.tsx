import React from 'react';
import { Sparkles, Cpu, Mic, Activity, ShieldAlert, CheckCircle2 } from 'lucide-react';

export type AICoreState = 'IDLE' | 'WORKING' | 'SPEAKING' | 'LISTENING' | 'ERROR' | 'ALERT';

interface AICoreProps {
  state?: AICoreState;
  size?: number;
  interactive?: boolean;
}

const STATE_CONFIG: Record<AICoreState, { color: string; glow: string; icon: React.ReactNode; label: string }> = {
  IDLE: {
    color: 'var(--accent-gold, #f59e0b)',
    glow: 'rgba(245, 158, 11, 0.35)',
    icon: <Sparkles size={20} color="var(--accent-gold, #f59e0b)" />,
    label: 'Ready',
  },
  WORKING: {
    color: '#06b6d4',
    glow: 'rgba(6, 182, 212, 0.45)',
    icon: <Activity size={20} color="#06b6d4" className="animate-pulse" />,
    label: 'Executing',
  },
  SPEAKING: {
    color: '#10b981',
    glow: 'rgba(16, 185, 129, 0.45)',
    icon: <Cpu size={20} color="#10b981" />,
    label: 'Speaking',
  },
  LISTENING: {
    color: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.45)',
    icon: <Mic size={20} color="#a855f7" />,
    label: 'Listening',
  },
  ERROR: {
    color: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.45)',
    icon: <ShieldAlert size={20} color="#ef4444" />,
    label: 'Error',
  },
  ALERT: {
    color: '#f97316',
    glow: 'rgba(249, 115, 22, 0.45)',
    icon: <ShieldAlert size={20} color="#f97316" />,
    label: 'Alert',
  },
};

export const AICore: React.FC<AICoreProps> = ({
  state = 'IDLE',
  size = 54,
  interactive = false,
}) => {
  const config = STATE_CONFIG[state] || STATE_CONFIG.IDLE;

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${config.glow} 0%, rgba(15, 23, 42, 0.8) 70%)`,
        border: `1.5px solid ${config.color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        boxShadow: `0 0 16px ${config.glow}`,
        cursor: interactive ? 'pointer' : 'default',
        flexShrink: 0,
      }}
      title={`HṚṢĪKEŚA Sovereign Core: ${config.label}`}
    >
      {/* Outer Pulse Ring */}
      <div
        style={{
          position: 'absolute',
          inset: '-4px',
          borderRadius: '50%',
          border: `1px solid ${config.color}`,
          opacity: 0.3,
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        }}
      />
      {config.icon}
    </div>
  );
};
