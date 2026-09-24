import React, { useState } from 'react';
import { Wrench, Shield, AlertTriangle, CheckCircle2, Lock, Search } from 'lucide-react';
import { ToolInfo } from '../types/api.types';
import { Modal } from '../components/Modal';

interface ToolsViewProps {
  tools: ToolInfo[];
}

export const ToolsView: React.FC<ToolsViewProps> = ({ tools }) => {
  const [search, setSearch] = useState('');
  const [selectedTier, setSelectedTier] = useState<number | 'ALL'>('ALL');
  const [inspectTool, setInspectTool] = useState<ToolInfo | null>(null);

  const filteredTools = tools.filter((tool) => {
    const matchesSearch =
      tool.name.toLowerCase().includes(search.toLowerCase()) ||
      tool.description.toLowerCase().includes(search.toLowerCase());
    const matchesTier = selectedTier === 'ALL' || tool.dangerTier === selectedTier;
    return matchesSearch && matchesTier;
  });

  const getTierBadge = (tier: number) => {
    switch (tier) {
      case 0:
        return <span className="badge badge-emerald">Tier 0 (Safe)</span>;
      case 1:
        return <span className="badge badge-cyan">Tier 1 (Low)</span>;
      case 2:
        return <span className="badge badge-indigo">Tier 2 (Medium)</span>;
      case 3:
        return <span className="badge badge-amber">Tier 3 (High / Appr)</span>;
      case 4:
        return <span className="badge badge-rose">Tier 4 (Critical / Appr)</span>;
      default:
        return <span className="badge badge-indigo">Tier {tier}</span>;
    }
  };

  return (
    <div>
      <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="view-title">Governed Tool Registry</h1>
          <p className="view-subtitle">
            All executable tools registered in HṚṢĪKEŚA, strictly governed by ToolExecutionBus & PermissionManager.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="input"
              placeholder="Search tools..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '32px', width: '200px', height: '36px' }}
            />
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '11px' }} />
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            {(['ALL', 0, 1, 2, 3, 4] as const).map((t) => (
              <button
                key={t}
                className={`btn ${selectedTier === t ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '4px 8px', fontSize: '11px' }}
                onClick={() => setSelectedTier(t)}
              >
                {t === 'ALL' ? 'All Tiers' : `T${t}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card-grid">
        {filteredTools.map((tool) => (
          <div key={tool.name} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wrench size={16} color="var(--accent-cyan)" />
                <span className="card-title" style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
                  {tool.name}
                </span>
              </div>
              {getTierBadge(tool.dangerTier)}
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', flex: 1, marginBottom: '12px' }}>
              {tool.description}
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {tool.dangerTier >= 3 ? (
                  <span style={{ color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Lock size={12} /> Requires Approval
                  </span>
                ) : (
                  <span style={{ color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={12} /> Auto-Governed
                  </span>
                )}
              </span>

              <button
                className="btn btn-secondary"
                style={{ padding: '3px 8px', fontSize: '11px' }}
                onClick={() => setInspectTool(tool)}
              >
                Schema
              </button>
            </div>
          </div>
        ))}
      </div>

      {inspectTool && (
        <Modal
          title={`Tool Schema: ${inspectTool.name}`}
          isOpen={!!inspectTool}
          onClose={() => setInspectTool(null)}
          width="580px"
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: 600 }}>
                {inspectTool.name}
              </div>
              {getTierBadge(inspectTool.dangerTier)}
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              {inspectTool.description}
            </p>

            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Parameter Definitions:
            </div>
            <pre
              style={{
                background: 'rgba(0,0,0,0.5)',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--accent-cyan)',
                overflowX: 'auto',
                border: '1px solid var(--border-color)',
              }}
            >
              {JSON.stringify(inspectTool.parameters || {}, null, 2)}
            </pre>
          </div>
        </Modal>
      )}
    </div>
  );
};
