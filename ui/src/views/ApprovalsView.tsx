import React, { useState } from 'react';
import { ShieldAlert, Check, X, AlertTriangle, Shield, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { ApprovalRequest } from '../types/api.types';
import { api } from '../services/api';

interface ApprovalsViewProps {
  approvals: ApprovalRequest[];
  onRefresh: () => void;
}

export const ApprovalsView: React.FC<ApprovalsViewProps> = ({ approvals, onRefresh }) => {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});

  const pendingApprovals = approvals.filter((a) => a.status === 'PENDING');
  const historicalApprovals = approvals.filter((a) => a.status !== 'PENDING');

  const toggleDetails = (id: string) => {
    setExpandedDetails((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDecision = async (approvalId: string, decision: 'APPROVE' | 'DENY') => {
    setProcessingId(approvalId);
    setError(null);
    try {
      await api.respondApproval(approvalId, decision, `Decision by Master Rushikesh via Control Center`);
      onRefresh();
    } catch (err: any) {
      setError(err.message || `Failed to process decision.`);
    } finally {
      setProcessingId(null);
    }
  };

  const formatActionName = (toolName: string) => {
    switch (toolName) {
      case 'terminal.execute':
        return 'Run a system terminal command';
      case 'environment.package.install':
        return 'Install software package via winget';
      case 'environment.process.terminate':
        return 'Terminate a running process';
      case 'filesystem.write':
        return 'Create or modify files on your computer';
      case 'computer.app.launch':
        return 'Launch an application on your computer';
      default:
        return `Run ${toolName}`;
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 className="view-title">Approvals</h1>
        <p className="view-subtitle">
          Review and confirm sensitive operations, computer automation, and system changes.
        </p>
      </div>

      {error && (
        <div className="badge badge-rose" style={{ width: '100%', marginBottom: '16px', padding: '12px 16px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Pending Approvals Section */}
      <div style={{ marginBottom: '36px' }}>
        <h2
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: pendingApprovals.length > 0 ? 'var(--accent-amber)' : 'var(--text-primary)',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertTriangle size={18} />
          <span>Needs your approval ({pendingApprovals.length})</span>
        </h2>

        {pendingApprovals.length === 0 ? (
          <div
            className="card"
            style={{
              textAlign: 'center',
              padding: '40px 24px',
              border: '1px dashed var(--border-color)',
            }}
          >
            <Shield size={36} color="var(--accent-emerald)" style={{ marginBottom: '10px' }} />
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Everything is running safely
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              No actions are waiting for your approval right now.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {pendingApprovals.map((req) => {
              const isDetailsOpen = expandedDetails[req.id];

              return (
                <div
                  key={req.id}
                  className="card"
                  style={{
                    padding: '22px 24px',
                    border: '1.5px solid var(--accent-amber)',
                    background: 'rgba(245, 158, 11, 0.06)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <span className="badge badge-amber" style={{ marginBottom: '8px' }}>
                        Your approval is needed
                      </span>
                      <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                        HṚṢĪKEŚA wants to:
                      </div>
                      <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                        {formatActionName(req.toolName)}
                      </h3>
                      {req.reason && (
                        <div style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                          Reason: <strong>{req.reason}</strong>
                        </div>
                      )}
                      <div style={{ fontSize: '12px', color: 'var(--accent-cyan)', marginTop: '4px' }}>
                        Requested by {req.agentId ? req.agentId.charAt(0).toUpperCase() + req.agentId.slice(1) : 'Agent'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        className="btn btn-primary"
                        style={{ padding: '8px 18px', fontSize: '13px' }}
                        onClick={() => handleDecision(req.id, 'APPROVE')}
                        disabled={processingId === req.id}
                      >
                        <Check size={15} />
                        <span>Allow</span>
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '8px 16px', fontSize: '13px', color: 'var(--accent-rose)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                        onClick={() => handleDecision(req.id, 'DENY')}
                        disabled={processingId === req.id}
                      >
                        <X size={15} />
                        <span>Decline</span>
                      </button>
                    </div>
                  </div>

                  {/* Progressive Disclosure: Details */}
                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                    <button
                      type="button"
                      onClick={() => toggleDetails(req.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        fontSize: '11.5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      {isDetailsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      <span>{isDetailsOpen ? 'Hide technical details' : 'Show details'}</span>
                    </button>

                    {isDetailsOpen && (
                      <div
                        style={{
                          marginTop: '8px',
                          fontSize: '11px',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--text-muted)',
                          background: 'var(--bg-elevated)',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <div>Tool ID: {req.toolName}</div>
                        <div>Danger Tier: {req.dangerTier}</div>
                        <div>Request ID: {req.id}</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historical Approvals */}
      {historicalApprovals.length > 0 && (
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Past Decisions
          </h2>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Decision</th>
                  <th>Agent</th>
                </tr>
              </thead>
              <tbody>
                {historicalApprovals.slice(0, 10).map((req) => (
                  <tr key={req.id}>
                    <td style={{ fontWeight: 500 }}>{formatActionName(req.toolName)}</td>
                    <td>
                      <span className={`badge ${req.status === 'APPROVED' ? 'badge-emerald' : 'badge-rose'}`}>
                        {req.status === 'APPROVED' ? 'Allowed' : 'Declined'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{req.agentId || 'Arjuna'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
