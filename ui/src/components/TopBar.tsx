import React, { useState } from 'react';
import {
  Search,
  AlertTriangle,
  Sparkles,
  Shield,
  Command,
} from 'lucide-react';
import { VoiceStatusResponse } from '../types/api.types';

interface TopBarProps {
  systemOnline: boolean;
  activeMissionCount: number;
  activeGoalCount?: number;
  pendingApprovalsCount: number;
  voiceStatus?: VoiceStatusResponse;
  theme?: string;
  onSetTheme?: (theme: string) => void;
  onOpenApprovals: () => void;
  onSearch?: (query: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  systemOnline,
  activeMissionCount,
  activeGoalCount = 0,
  pendingApprovalsCount,
  onOpenApprovals,
  onSearch,
}) => {
  const [searchVal, setSearchVal] = useState('');
  const isWorking = activeMissionCount > 0 || activeGoalCount > 0;
  const isWaitingApproval = pendingApprovalsCount > 0;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim() && onSearch) {
      onSearch(searchVal.trim());
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Sanskrit Title Tag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '15px',
              fontWeight: 800,
              fontFamily: 'var(--font-cinzel)',
              letterSpacing: '1.5px',
              color: 'var(--text-gold)',
            }}
          >
            HṚṢĪKEŚA
          </span>

        </div>

        {/* Approvals Alert Notification Button if pending */}
        {pendingApprovalsCount > 0 && (
          <button
            onClick={onOpenApprovals}
            className="btn btn-primary"
            style={{
              padding: '3px 10px',
              fontSize: '11px',
              height: '26px',
            }}
          >
            <AlertTriangle size={12} />
            <span>{pendingApprovalsCount} Action{pendingApprovalsCount > 1 ? 's' : ''} to Approve</span>
          </button>
        )}
      </div>

      {/* Center: Search Bar from Panel 1 */}
      <div className="topbar-center" style={{ flex: 1, maxWidth: '420px', margin: '0 auto' }}>
        <form onSubmit={handleSearchSubmit} style={{ width: '100%', position: 'relative' }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--accent-gold)',
            }}
          />
          <input
            type="text"
            placeholder="Search knowledge, agents, companies..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 36px 6px 34px',
              background: 'rgba(20, 12, 5, 0.75)',
              border: '1px solid rgba(212, 168, 55, 0.35)',
              borderRadius: '20px',
              color: 'var(--text-primary)',
              fontSize: '12px',
              outline: 'none',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent-gold-bright)';
              e.currentTarget.style.boxShadow = '0 0 12px rgba(245, 200, 66, 0.3)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(212, 168, 55, 0.35)';
              e.currentTarget.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.5)';
            }}
          />
          <span
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '10px',
              color: 'var(--text-muted)',
              background: 'rgba(255,255,255,0.06)',
              padding: '1px 5px',
              borderRadius: '4px',
              fontFamily: 'monospace',
            }}
          >
            ⌘K
          </span>
        </form>
      </div>

      <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Status Pill */}
        <span
          className={`badge ${
            !systemOnline
              ? 'badge-warning'
              : isWaitingApproval
              ? 'badge-warning'
              : isWorking
              ? 'badge-running'
              : 'badge-online'
          }`}
          style={{ fontSize: '11px', padding: '3px 9px' }}
        >
          ● {systemOnline ? (isWorking ? 'Executing' : 'Online') : 'Offline'}
        </span>

        {/* Master User Profile: Sovereign Authority */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '9px',
            padding: '4px 10px',
            borderRadius: '20px',
            background: 'linear-gradient(90deg, rgba(34, 20, 10, 0.9) 0%, rgba(20, 12, 5, 0.9) 100%)',
            border: '1px solid rgba(212, 168, 55, 0.4)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
          }}
        >
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-saffron), var(--accent-gold))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0F0D0A',
              fontWeight: 800,
              fontSize: '11.5px',
              boxShadow: '0 0 8px rgba(245, 200, 66, 0.4)',
            }}
          >
            R
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>
              Rushikesh
            </span>
            <span style={{ fontSize: '9.5px', color: 'var(--accent-gold)', letterSpacing: '0.4px', fontWeight: 500 }}>
              Sovereign Authority
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
