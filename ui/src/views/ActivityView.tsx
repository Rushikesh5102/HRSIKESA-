import React, { useState } from 'react';
import {
  Activity,
  Filter,
  Search,
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Users,
  Target,
  Building2,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { AuditRecord } from '../types/api.types';
import { NavTab } from '../components/Sidebar';

interface ActivityViewProps {
  auditLogs: AuditRecord[];
  onNavigate: (tab: NavTab) => void;
}

export const ActivityView: React.FC<ActivityViewProps> = ({ auditLogs, onNavigate }) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = auditLogs.filter((log) => {
    const matchesFilter =
      selectedFilter === 'all' ||
      (selectedFilter === 'agents' && log.actor) ||
      (selectedFilter === 'security' && (log.action?.includes('security') || log.action?.includes('auth'))) ||
      (selectedFilter === 'errors' && log.status === 'FAILURE');
    const matchesQuery =
      log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(log.details || {}).toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesQuery;
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        padding: '24px 28px 80px 28px',
        maxWidth: '1440px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* Header */}
      <div
        className="glass-panel"
        style={{
          padding: '24px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '11px', color: 'var(--accent-gold)', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              Unified Activity Stream
            </span>
            <span
              style={{
                fontSize: '11px',
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: 600,
              }}
            >
              ● Live Streaming
            </span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'var(--font-cinzel)', color: 'var(--text-primary)', margin: '4px 0 0 0' }}>
            System & Agent Execution Activity
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Immutable event ledger capturing real-time agent handoffs, tool executions, and state transformations.
          </p>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {['all', 'agents', 'missions', 'security', 'errors'].map((f) => (
            <button
              key={f}
              onClick={() => setSelectedFilter(f)}
              className={`fluid-stage-pill ${selectedFilter === f ? 'active' : ''}`}
              style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '20px', textTransform: 'capitalize' }}
            >
              <span>{f}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Activity Stream List */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            No activity records found matching query.
          </div>
        ) : (
          filtered.map((log) => {
            const isSuccess = log.status === 'SUCCESS' || !log.status;
            return (
              <div
                key={log.id}
                style={{
                  padding: '14px 18px',
                  borderRadius: '12px',
                  background: 'rgba(14, 8, 4, 0.6)',
                  border: '1px solid rgba(212, 168, 55, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: isSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      border: `1px solid ${isSuccess ? '#10b981' : '#ef4444'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isSuccess ? <CheckCircle2 size={16} color="#10b981" /> : <AlertTriangle size={16} color="#ef4444" />}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)', fontFamily: 'var(--font-cinzel)' }}>
                        {log.actor ? log.actor.toUpperCase() : 'SYSTEM'}
                      </strong>
                      <span style={{ fontSize: '12px', color: 'var(--accent-teal)' }}>{log.action}</span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {typeof log.details?.summary === 'string' ? log.details.summary : JSON.stringify(log.details || {})}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: isSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: isSuccess ? '#10b981' : '#ef4444',
                      fontWeight: 700,
                    }}
                  >
                    {log.status || 'DONE'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
