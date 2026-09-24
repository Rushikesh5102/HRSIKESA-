import React, { useState } from 'react';
import { Activity, Shield, Search, Filter, AlertTriangle, CheckCircle2, Lock } from 'lucide-react';
import { AuditRecord } from '../types/api.types';

interface AuditViewProps {
  auditLogs: AuditRecord[];
}

export const AuditView: React.FC<AuditViewProps> = ({ auditLogs }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.actor.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      (log.details && JSON.stringify(log.details).toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="view-title">Immutable Audit Trail</h1>
          <p className="view-subtitle">
            Cryptographically signed and tamper-evident event log recorded by ToolAudit and EventBus.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="input"
              placeholder="Search audit records..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '32px', width: '220px', height: '36px' }}
            />
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '11px' }} />
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            {(['ALL', 'SUCCESS', 'DENIED', 'BLOCKED', 'FAILURE'] as const).map((st) => (
              <button
                key={st}
                className={`btn ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '4px 8px', fontSize: '11px' }}
                onClick={() => setStatusFilter(st)}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        {filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            No audit records matching criteria.
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action / Tool</th>
                  <th>Tier</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td>
                      <span className="badge badge-indigo">{log.actor}</span>
                    </td>
                    <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{log.action}</td>
                    <td>
                      {log.dangerTier !== undefined ? (
                        <span className="badge badge-amber" style={{ fontSize: '10px' }}>
                          T{log.dangerTier}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          log.status === 'SUCCESS'
                            ? 'badge-emerald'
                            : log.status === 'DENIED' || log.status === 'BLOCKED'
                            ? 'badge-rose'
                            : 'badge-amber'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                      {log.durationMs !== undefined ? `${log.durationMs}ms` : '—'}
                    </td>
                    <td style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {log.details ? JSON.stringify(log.details).slice(0, 80) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
