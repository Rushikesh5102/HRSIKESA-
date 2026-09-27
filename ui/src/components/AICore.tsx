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
  const isLarge = size >= 80;

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${config.glow} 0%, rgba(15, 23, 42, 0.92) 75%)`,
        border: `1.5px solid ${config.color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        boxShadow: `0 0 24px ${config.glow}, inset 0 0 12px ${config.glow}`,
        cursor: interactive ? 'pointer' : 'default',
        flexShrink: 0,
        overflow: 'hidden',
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
          opacity: 0.45,
          animation: 'pulse 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          pointerEvents: 'none',
        }}
      />

      {isLarge ? (
        <div
          style={{
            position: 'relative',
            width: '82%',
            height: '82%',
            borderRadius: '50%',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1.5px solid ${config.color}`,
            boxShadow: `0 0 16px ${config.glow}, inset 0 0 14px rgba(10, 6, 2, 0.65)`,
            background: '#FFF6EE',
          }}
        >
          {/* Master Brand Feather with Intact Background */}
          <img
            src="/assets/hrikesa_logo.png"
            alt="HṚṢĪKEŚA Core Feather"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 46%',
              borderRadius: '50%',
              display: 'block',
              transition: 'transform 0.35s ease',
            }}
          />

          {/* Ambient Cosmic Radial Vignette Overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              pointerEvents: 'none',
              background: `radial-gradient(circle at center, rgba(255, 246, 238, 0) 52%, rgba(200, 146, 14, 0.15) 75%, rgba(10, 6, 2, 0.6) 100%)`,
              boxShadow: 'inset 0 0 10px rgba(10, 6, 2, 0.55)',
            }}
          />

          {state !== 'IDLE' && (
            <div
              style={{
                position: 'absolute',
                bottom: '6px',
                right: '6px',
                background: 'rgba(10, 6, 2, 0.92)',
                border: `1.5px solid ${config.color}`,
                borderRadius: '50%',
                padding: '4px',
                display: 'flex',
                boxShadow: `0 0 12px ${config.glow}`,
                zIndex: 3,
              }}
            >
              {config.icon}
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            position: 'relative',
            width: '78%',
            height: '78%',
            borderRadius: '50%',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${config.color}`,
            boxShadow: `0 0 10px ${config.glow}, inset 0 0 8px rgba(10, 6, 2, 0.55)`,
            background: '#FFF6EE',
          }}
        >
          <img
            src="/assets/hrikesa_logo.png"
            alt="HṚṢĪKEŚA Emblem"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 46%',
              borderRadius: '50%',
              display: 'block',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              pointerEvents: 'none',
              background: `radial-gradient(circle at center, rgba(255, 246, 238, 0) 50%, rgba(200, 146, 14, 0.15) 75%, rgba(10, 6, 2, 0.6) 100%)`,
              boxShadow: 'inset 0 0 6px rgba(10, 6, 2, 0.5)',
            }}
          />
        </div>
      )}
    </div>
  );
};

