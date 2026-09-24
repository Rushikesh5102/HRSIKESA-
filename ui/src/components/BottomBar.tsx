import React from 'react';
import { Cpu, Zap, Radio, Users } from 'lucide-react';
import { HealthResponse, SystemStatusResponse } from '../types/api.types';

interface BottomBarProps {
  systemOnline: boolean;
  health?: HealthResponse;
  status?: SystemStatusResponse;
  activeAgentsCount: number;
  totalAgentsCount: number;
}

export const BottomBar: React.FC<BottomBarProps> = ({
  systemOnline,
  health,
  status,
  activeAgentsCount,
  totalAgentsCount,
}) => {
  const heapMB = health?.memory?.heapUsed
    ? (health.memory.heapUsed / (1024 * 1024)).toFixed(0)
    : '—';
  const uptimeSec = health?.uptime ? Math.floor(health.uptime) : 0;
  const uptimeFormatted = `${Math.floor(uptimeSec / 3600)}h ${Math.floor((uptimeSec % 3600) / 60)}m`;

  return (
    <footer
      style={{
        height: '30px',
        minHeight: '30px',
        background: 'var(--bg-glass)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        fontSize: '11px',
        color: 'var(--text-muted)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className={`status-dot ${systemOnline ? 'status-dot-online' : 'status-dot-offline'}`} />
          <span>{systemOnline ? 'Connected' : 'Offline'}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Zap size={12} color="var(--accent-cyan)" />
          <span>Qwen 2.5 Local</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Users size={12} color="var(--accent-indigo)" />
          <span>{activeAgentsCount > 0 ? `${activeAgentsCount} working` : `${totalAgentsCount} specialists ready`}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Cpu size={12} />
          <span>{heapMB} MB</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Radio size={11} color="var(--accent-emerald)" />
          <span>Active {uptimeFormatted}</span>
        </div>
      </div>
    </footer>
  );
};
