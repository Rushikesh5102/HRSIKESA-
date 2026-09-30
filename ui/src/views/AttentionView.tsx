import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Layers,
  ChevronRight,
  Shield,
  Activity,
} from 'lucide-react';
import { ApprovalRequest } from '../types/api.types';
import { NavTab } from '../components/Sidebar';
import { api } from '../services/api';

interface AttentionViewProps {
  approvals: ApprovalRequest[];
  onRefresh?: () => void;
  onNavigate: (tab: NavTab) => void;
}

export const AttentionView: React.FC<AttentionViewProps> = ({
  approvals,
  onRefresh,
  onNavigate,
}) => {
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [reasonInput, setReasonInput] = useState('');

  const pendingApprovals = approvals.filter((a) => a.status === 'PENDING');

  const handleApprove = async (id: string) => {
    setActionLoading(true);
    try {
      await api.respondApproval(id, 'APPROVE', reasonInput || 'Approved via Attention Center');
      setReasonInput('');
      setSelectedApproval(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Approval failed', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(true);
    try {
      await api.respondApproval(id, 'DENY', reasonInput || 'Rejected via Attention Center');
      setReasonInput('');
      setSelectedApproval(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Rejection failed', err);
    } finally {
      setActionLoading(false);
    }
  };

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
            <span style={{ fontSize: '11px', color: '#F59E0B', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              Attention & Action Center
            </span>
            <span
              style={{
                fontSize: '11px',
                color: pendingApprovals.length > 0 ? '#F59E0B' : '#10B981',
                background: pendingApprovals.length > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                border: `1px solid ${pendingApprovals.length > 0 ? 'rgba(245, 158, 11, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`,
                padding: '2px 10px',
                borderRadius: '12px',
                fontWeight: 700,
              }}
            >
              {pendingApprovals.length} Items Need You
            </span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'var(--font-cinzel)', color: 'var(--text-primary)', margin: '4px 0 0 0' }}>
            Required Human In-The-Loop Actions
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Distills high-risk executions, external deployments, and sensitive policy approvals that strictly require your consent.
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedApproval ? '1fr 420px' : '1fr', gap: '24px', transition: 'all 0.3s ease' }}>
        {pendingApprovals.length === 0 ? (
          <div
            className="glass-panel"
            style={{
              padding: '64px 32px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '14px',
            }}
          >
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={28} color="#10B981" />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-cinzel)', color: 'var(--text-primary)', margin: 0 }}>
              All Clear — Nothing Requires Attention
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '520px', margin: 0 }}>
              HṚṢĪKEŚA is operating within sovereign safe boundaries. Routine executions and safe sandboxed actions proceed autonomously.
            </p>
            <button onClick={() => onNavigate('missions')} className="btn btn-primary" style={{ marginTop: '8px', padding: '10px 20px', fontSize: '12px' }}>
              <span>Inspect Active Missions</span>
              <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {pendingApprovals.map((req) => (
              <div
                key={req.id}
                onClick={() => setSelectedApproval(req)}
                className="glass-panel"
                style={{
                  padding: '20px 24px',
                  border: selectedApproval?.id === req.id ? '1.5px solid #f59e0b' : '1px solid rgba(245, 158, 11, 0.3)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ShieldAlert size={18} color="#f59e0b" />
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-cinzel)' }}>
                      Approval Required: {req.toolName}
                    </h3>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Agent: <strong style={{ color: 'var(--text-gold)' }}>{req.agentId}</strong>
                  </span>
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                  {req.reason || 'Agent requested execution of a Tier-2/Tier-3 gated capability.'}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '12px' }}>
                  <span style={{ color: 'var(--accent-teal)' }}>Risk Tier: Gated Operation</span>
                  <span style={{ color: 'var(--text-gold)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Review Action <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Selected Approval Decision Drawer */}
        {selectedApproval && (
          <div
            className="glass-panel"
            style={{
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              border: '1.5px solid #f59e0b',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700 }}>HUMAN-IN-THE-LOOP GATE</span>
                <h2 style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-cinzel)', color: 'var(--text-primary)', margin: '2px 0 0 0' }}>
                  {selectedApproval.toolName}
                </h2>
              </div>
              <button
                onClick={() => setSelectedApproval(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>
                Requesting Agent & Rationale
              </span>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                Agent <strong>{selectedApproval.agentId}</strong>: {selectedApproval.reason}
              </p>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>
                Payload Arguments
              </span>
              <pre
                style={{
                  background: 'rgba(0,0,0,0.6)',
                  padding: '10px',
                  borderRadius: '8px',
                  fontSize: '11.5px',
                  color: 'var(--text-gold)',
                  maxHeight: '140px',
                  overflowY: 'auto',
                  margin: '4px 0 0 0',
                }}
              >
                {JSON.stringify(selectedApproval.params || {}, null, 2)}
              </pre>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>
                Resolution Note (Optional)
              </span>
              <input
                type="text"
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder="Add optional note or directive..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(212, 168, 55, 0.3)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  marginTop: '4px',
                }}
              />
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', gap: '10px' }}>
              <button
                onClick={() => handleApprove(selectedApproval.id)}
                disabled={actionLoading}
                className="btn btn-primary"
                style={{ flex: 1, padding: '10px', justifyContent: 'center', background: 'linear-gradient(135deg, #10b981, #059669)' }}
              >
                <span>Approve Action</span>
              </button>
              <button
                onClick={() => handleReject(selectedApproval.id)}
                disabled={actionLoading}
                className="fluid-stage-pill"
                style={{ flex: 1, padding: '10px', justifyContent: 'center', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
              >
                <span>Reject</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
