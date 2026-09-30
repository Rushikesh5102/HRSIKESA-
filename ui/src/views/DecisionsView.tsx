import React, { useState, useEffect } from 'react';
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  Users,
  Search,
  Filter,
  ArrowRight,
  Sparkles,
  Lock,
  Clock,
  ChevronRight,
  ExternalLink,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { NavTab } from '../components/Sidebar';
import { api } from '../services/api';
import { DecisionInfo } from '../types/api.types';

interface DecisionsViewProps {
  onNavigate: (tab: NavTab) => void;
}

export const DecisionsView: React.FC<DecisionsViewProps> = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDecision, setSelectedDecision] = useState<DecisionInfo | null>(null);
  const [decisions, setDecisions] = useState<DecisionInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDecisions = async () => {
    setLoading(true);
    try {
      const compRes = await api.getCompanies();
      const allDecisions: DecisionInfo[] = [];
      if (compRes.success && compRes.companies) {
        for (const company of compRes.companies) {
          try {
            const decRes = await api.getCompanyDecisions(company.id);
            if (decRes.success && decRes.decisions) {
              allDecisions.push(...decRes.decisions);
            }
          } catch {
            // Ignore company with no decisions
          }
        }
      }
      setDecisions(allDecisions);
      if (allDecisions.length > 0 && !selectedDecision) {
        setSelectedDecision(allDecisions[0]);
      }
    } catch (err) {
      console.error('Failed to load decisions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDecisions();
  }, []);

  const filtered = decisions.filter((d) => {
    const matchesStatus = selectedStatus === 'all' || d.status.toLowerCase() === selectedStatus.toLowerCase();
    const matchesQuery =
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.decision || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.reasoning || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.madeBy.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesQuery;
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
              Autonomous Decisions Center
            </span>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--accent-teal)',
                background: 'rgba(0, 196, 168, 0.1)',
                border: '1px solid rgba(0, 196, 168, 0.25)',
                padding: '2px 8px',
                borderRadius: '12px',
                fontFamily: 'monospace',
              }}
            >
              Auditable AI Governance
            </span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '6px 0 0 0', color: 'var(--text-primary)', fontFamily: 'var(--font-cinzel)' }}>
            System Decisions & Rationale Log
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Inspect every strategic, architectural, and operational decision autonomously deliberated by HṚṢĪKEŚA with evidence.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={fetchDecisions}
            disabled={loading}
            className="btn btn-secondary"
            style={{ fontSize: '12.5px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Refresh Log
          </button>
          <button
            onClick={() => onNavigate('council-chat')}
            className="btn btn-primary"
            style={{ fontSize: '12.5px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Users size={14} />
            Deliberate with Council
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search decisions by title, agent rationale, or decision maker..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {['all', 'PROPOSED', 'ACCEPTED', 'IMPLEMENTED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              style={{
                background: selectedStatus === st ? 'rgba(0, 196, 168, 0.18)' : 'var(--bg-elevated)',
                border: selectedStatus === st ? '1px solid var(--accent-teal)' : '1px solid var(--border-subtle)',
                color: selectedStatus === st ? 'var(--accent-teal)' : 'var(--text-secondary)',
                fontSize: '11.5px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                textTransform: 'capitalize',
                fontWeight: selectedStatus === st ? 700 : 500,
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Decision Explorer */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', alignItems: 'start' }}>
        {/* Decisions List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.length === 0 ? (
            <div className="glass-panel" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Sparkles size={28} style={{ margin: '0 auto 10px', color: 'var(--accent-gold)', opacity: 0.8 }} />
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>No decisions recorded yet</p>
              <p style={{ fontSize: '12.5px', marginTop: '4px' }}>
                When HṚṢĪKEŚA agents make decisions during autonomous missions or company operations, they will appear here with explainable rationales.
              </p>
            </div>
          ) : (
            filtered.map((d) => {
              const isSelected = selectedDecision?.id === d.id;
              return (
                <div
                  key={d.id}
                  onClick={() => setSelectedDecision(d)}
                  className="glass-panel"
                  style={{
                    padding: '16px 20px',
                    border: isSelected ? '1.5px solid var(--accent-teal)' : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    boxShadow: isSelected ? '0 0 15px rgba(0, 196, 168, 0.15)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '10.5px', color: 'var(--accent-gold)', fontWeight: 700, fontFamily: 'monospace' }}>
                      {d.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span
                      style={{
                        fontSize: '10.5px',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        background: 'rgba(0, 196, 168, 0.12)',
                        color: 'var(--accent-teal)',
                        fontWeight: 600,
                      }}
                    >
                      {d.status}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    {d.title}
                  </h3>

                  <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0, lineClamp: 2 }}>
                    {d.decision || d.description || d.reasoning}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span>Made By: <strong style={{ color: 'var(--text-primary)' }}>{d.madeBy}</strong></span>
                    <span>{new Date(d.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Decision Detail Inspector */}
        {selectedDecision ? (
          <div
            className="glass-panel"
            style={{
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              position: 'sticky',
              top: '20px',
              border: '1.5px solid var(--accent-gold)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', color: 'var(--accent-gold)', fontWeight: 700, fontFamily: 'monospace' }}>
                {selectedDecision.id.slice(0, 8).toUpperCase()} • DECISION
              </span>
              <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>
                ● {selectedDecision.status}
              </span>
            </div>

            <h2 style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-cinzel)', color: 'var(--text-primary)', margin: 0 }}>
              {selectedDecision.title}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>
                Decision Output
              </span>
              <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: 0, lineHeight: 1.5, background: 'var(--bg-elevated)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontWeight: 600 }}>
                {selectedDecision.decision}
              </p>
            </div>

            {selectedDecision.reasoning && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>
                  Reasoning & Deliberation
                </span>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  {selectedDecision.reasoning}
                </p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <div className="metric-glow-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Made By Agent</span>
                <strong style={{ fontSize: '13.5px', color: 'var(--text-gold)' }}>{selectedDecision.madeBy}</strong>
              </div>
              <div className="metric-glow-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Company Scope</span>
                <strong style={{ fontSize: '13.5px', color: 'var(--accent-teal)' }}>{selectedDecision.companyId}</strong>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '28px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Select a decision from the left to inspect detailed evidence, deliberation transcripts, and governance impact.
          </div>
        )}
      </div>
    </div>
  );
};
