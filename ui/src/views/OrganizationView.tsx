import React, { useState, useMemo } from 'react';
import {
  Users,
  Building2,
  Activity,
  Layers,
  Sparkles,
  Zap,
  Shield,
  Search,
  ArrowRight,
  Filter,
  CheckCircle2,
  Clock,
  ChevronRight,
  Cpu,
  Database,
  Terminal,
  Compass,
  Radio,
  Share2,
  Eye,
  Info,
} from 'lucide-react';
import { AgentInfo } from '../types/api.types';
import { NavTab } from '../components/Sidebar';

interface OrganizationViewProps {
  agents: AgentInfo[];
  onNavigate: (tab: NavTab) => void;
  onSelectAgent?: (agentId: string) => void;
}

type ViewMode = 'mandala' | 'hierarchy' | 'workload' | 'matrix';

export const OrganizationView: React.FC<OrganizationViewProps> = ({
  agents,
  onNavigate,
  onSelectAgent,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('mandala');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [filterTier, setFilterTier] = useState<string>('all');
  const [hoveredAgentId, setHoveredAgentId] = useState<string | null>(null);

  // Group agents into canonical tiers
  const tiers = useMemo(() => {
    const adityas = agents.filter((a) =>
      ['dhata', 'mitra', 'aryaman', 'varuna', 'amsa', 'bhaga', 'vivasvan', 'pusa', 'tvasta', 'savita', 'parjanya', 'visnu'].includes(a.id.toLowerCase())
    );
    const rudras = agents.filter((a) =>
      ['manyu', 'manu', 'mahinasa', 'mahan', 'siva', 'ritadhvaja', 'ugrareta', 'bhava', 'kala_rudra', 'vamadeva', 'dhritavrata'].includes(a.id.toLowerCase())
    );
    const vasus = agents.filter((a) =>
      ['dhara', 'anala', 'anila', 'apa', 'pratyusa', 'prabhasa', 'soma', 'dhruva'].includes(a.id.toLowerCase())
    );
    const indra = agents.find((a) => a.id.toLowerCase() === 'indra');
    const prajapati = agents.find((a) => a.id.toLowerCase() === 'prajapati');
    const dynamicAgents = agents.filter((a) => a.id.startsWith('dyn_') || a.id.startsWith('temp_'));

    return { adityas, rudras, vasus, indra, prajapati, dynamicAgents };
  }, [agents]);

  const selectedAgent = useMemo(() => {
    return agents.find((a) => a.id === selectedAgentId) || null;
  }, [agents, selectedAgentId]);

  // Statistics
  const activeCount = agents.filter((a) => ['WORKING', 'RUNNING', 'executing'].includes(a.status.toLowerCase())).length;

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
      {/* Header Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '22px 28px',
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
              Autonomous Digital Organization
            </span>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--accent-teal)',
                background: 'rgba(0, 196, 168, 0.1)',
                border: '1px solid rgba(0, 196, 168, 0.25)',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: 600,
              }}
            >
              {agents.length} Total Workforce • {activeCount} Working
            </span>
          </div>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 800,
              fontFamily: 'var(--font-cinzel)',
              color: 'var(--text-primary)',
              margin: '4px 0 0 0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <span>Organizational Architecture</span>
            <span style={{ fontSize: '13px', color: 'var(--text-gold)', letterSpacing: '0.5px', opacity: 0.85 }}>
              Concentric Mandala
            </span>
          </h1>
        </div>

        {/* View Mode Switcher Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(14, 8, 4, 0.6)', padding: '4px', borderRadius: '30px', border: '1px solid rgba(212, 168, 55, 0.25)' }}>
          <button
            onClick={() => setViewMode('mandala')}
            className={`fluid-stage-pill ${viewMode === 'mandala' ? 'active' : ''}`}
            style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '20px' }}
          >
            <Sparkles size={13} />
            <span>Mandala View</span>
          </button>
          <button
            onClick={() => setViewMode('hierarchy')}
            className={`fluid-stage-pill ${viewMode === 'hierarchy' ? 'active' : ''}`}
            style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '20px' }}
          >
            <Layers size={13} />
            <span>Hierarchy Tree</span>
          </button>
          <button
            onClick={() => setViewMode('workload')}
            className={`fluid-stage-pill ${viewMode === 'workload' ? 'active' : ''}`}
            style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '20px' }}
          >
            <Activity size={13} />
            <span>Live Workload</span>
          </button>
          <button
            onClick={() => setViewMode('matrix')}
            className={`fluid-stage-pill ${viewMode === 'matrix' ? 'active' : ''}`}
            style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '20px' }}
          >
            <Users size={13} />
            <span>Capability Matrix</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Canvas */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedAgent ? '1fr 380px' : '1fr', gap: '24px', transition: 'all 0.3s ease' }}>
        {/* Left / Center: The Visualization Canvas */}
        <div
          className="glass-panel"
          style={{
            padding: '28px',
            minHeight: '620px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {/* =========================================================================
              VIEW 1: MANDALA CONCENTRIC GEOMETRIC DATA VISUALIZATION
             ========================================================================= */}
          {viewMode === 'mandala' && (
            <div style={{ position: 'relative', width: '100%', maxWidth: '780px', height: '620px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* Concentric Background SVG Rings & Sacred Geometry */}
              <svg style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none' }} viewBox="0 0 700 700">
                <defs>
                  <radialGradient id="mandalaCenterGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                    <stop offset="50%" stopColor="#d97706" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                  </radialGradient>
                  <linearGradient id="goldLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="rgba(212, 168, 55, 0.4)" />
                    <stop offset="50%" stopColor="rgba(0, 196, 168, 0.3)" />
                    <stop offset="100%" stopColor="rgba(212, 168, 55, 0.4)" />
                  </linearGradient>
                </defs>

                {/* Ambient Center Glow */}
                <circle cx="350" cy="350" r="320" fill="url(#mandalaCenterGlow)" />

                {/* Concentric Geometry Circles */}
                <circle cx="350" cy="350" r="90" fill="none" stroke="rgba(212, 168, 55, 0.35)" strokeWidth="1.5" />
                <circle cx="350" cy="350" r="180" fill="none" stroke="rgba(212, 168, 55, 0.25)" strokeWidth="1" strokeDasharray="6 4" />
                <circle cx="350" cy="350" r="270" fill="none" stroke="rgba(0, 196, 168, 0.2)" strokeWidth="1" />
                <circle cx="350" cy="350" r="330" fill="none" stroke="rgba(212, 168, 55, 0.15)" strokeWidth="0.8" strokeDasharray="3 6" />

                {/* Cardinal Axis Rays */}
                <line x1="350" y1="30" x2="350" y2="670" stroke="rgba(212, 168, 55, 0.12)" strokeWidth="1" />
                <line x1="30" y1="350" x2="670" y2="350" stroke="rgba(212, 168, 55, 0.12)" strokeWidth="1" />
                <line x1="120" y1="120" x2="580" y2="580" stroke="rgba(212, 168, 55, 0.08)" strokeWidth="1" />
                <line x1="120" y1="580" x2="580" y2="120" stroke="rgba(212, 168, 55, 0.08)" strokeWidth="1" />

                {/* Connection lines from Indra to active nodes */}
                {agents
                  .filter((a) => ['WORKING', 'RUNNING'].includes(a.status.toUpperCase()))
                  .map((activeAgent, idx) => (
                    <line
                      key={idx}
                      x1="350"
                      y1="350"
                      x2="350"
                      y2="180"
                      stroke="#00c4a8"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                      className="animate-pulse"
                    />
                  ))}
              </svg>

              {/* CENTER: INDRA (Supreme Field Commander) */}
              <div
                onClick={() => {
                  if (tiers.indra) setSelectedAgentId(tiers.indra.id);
                }}
                onMouseEnter={() => setHoveredAgentId('indra')}
                onMouseLeave={() => setHoveredAgentId(null)}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '96px',
                  height: '96px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.35) 0%, rgba(26, 15, 6, 0.95) 100%)',
                  border: '2px solid var(--accent-gold)',
                  boxShadow: '0 0 30px rgba(245, 158, 11, 0.45), inset 0 0 16px rgba(245, 158, 11, 0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 20,
                  transition: 'all 0.25s ease',
                }}
              >
                <span style={{ fontSize: '12px', color: 'var(--text-gold)', fontWeight: 800, fontFamily: 'var(--font-cinzel)' }}>
                  INDRA
                </span>
                <span style={{ fontSize: '8px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Field Command
                </span>
              </div>

              {/* TOP CROWN: PRAJĀPATI (Workforce Progenitor) */}
              <div
                onClick={() => {
                  if (tiers.prajapati) setSelectedAgentId(tiers.prajapati.id);
                }}
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  padding: '8px 20px',
                  borderRadius: '24px',
                  background: 'linear-gradient(135deg, rgba(0, 196, 168, 0.2) 0%, rgba(14, 8, 4, 0.95) 100%)',
                  border: '1.5px solid var(--accent-teal)',
                  boxShadow: '0 0 20px rgba(0, 196, 168, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  zIndex: 15,
                }}
              >
                <Sparkles size={14} color="var(--accent-teal)" />
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-cinzel)' }}>
                  PRAJĀPATI
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>• Progenitor & Evolution</span>
              </div>

              {/* RING 1 (Inner Concentric): 12 ĀDITYAS (Radius: 180px) */}
              {tiers.adityas.map((agent, idx) => {
                const angle = (idx / 12) * Math.PI * 2 - Math.PI / 2;
                const r = 180;
                const x = 350 + Math.cos(angle) * r - 26;
                const y = 350 + Math.sin(angle) * r - 26;
                const isSelected = selectedAgentId === agent.id;
                const isWorking = ['WORKING', 'RUNNING'].includes(agent.status.toUpperCase());

                return (
                  <div
                    key={agent.id}
                    onClick={() => setSelectedAgentId(agent.id)}
                    onMouseEnter={() => setHoveredAgentId(agent.id)}
                    onMouseLeave={() => setHoveredAgentId(null)}
                    style={{
                      position: 'absolute',
                      left: `${(x / 700) * 100}%`,
                      top: `${(y / 700) * 100}%`,
                      width: '52px',
                      height: '52px',
                      borderRadius: '50%',
                      background: isSelected
                        ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                        : isWorking
                        ? 'linear-gradient(135deg, rgba(0, 196, 168, 0.35), rgba(26, 15, 6, 0.95))'
                        : 'rgba(26, 15, 6, 0.9)',
                      border: `1.5px solid ${isSelected ? '#fff' : isWorking ? '#00c4a8' : 'rgba(212, 168, 55, 0.45)'}`,
                      boxShadow: isWorking ? '0 0 16px #00c4a8' : isSelected ? '0 0 20px #f59e0b' : '0 4px 12px rgba(0,0,0,0.6)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      zIndex: 10,
                      transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      transform: hoveredAgentId === agent.id ? 'scale(1.18)' : 'scale(1)',
                    }}
                    title={`${agent.name} (${agent.role})`}
                  >
                    <span style={{ fontSize: '11px', fontWeight: 800, color: isSelected ? '#000' : 'var(--text-gold)', fontFamily: 'var(--font-cinzel)' }}>
                      {agent.name.slice(0, 3)}
                    </span>
                    <span style={{ fontSize: '7.5px', color: isSelected ? '#000' : 'var(--text-muted)' }}>ĀDITYA</span>
                  </div>
                );
              })}

              {/* RING 2 (Outer Concentric): 11 RUDRAS (Radius: 270px) */}
              {tiers.rudras.map((agent, idx) => {
                const angle = (idx / 11) * Math.PI * 2 - Math.PI / 2;
                const r = 270;
                const x = 350 + Math.cos(angle) * r - 24;
                const y = 350 + Math.sin(angle) * r - 24;
                const isSelected = selectedAgentId === agent.id;
                const isWorking = ['WORKING', 'RUNNING'].includes(agent.status.toUpperCase());

                return (
                  <div
                    key={agent.id}
                    onClick={() => setSelectedAgentId(agent.id)}
                    onMouseEnter={() => setHoveredAgentId(agent.id)}
                    onMouseLeave={() => setHoveredAgentId(null)}
                    style={{
                      position: 'absolute',
                      left: `${(x / 700) * 100}%`,
                      top: `${(y / 700) * 100}%`,
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: isSelected
                        ? 'linear-gradient(135deg, #b83820, #e8b830)'
                        : isWorking
                        ? 'linear-gradient(135deg, rgba(232, 184, 48, 0.35), rgba(26, 15, 6, 0.95))'
                        : 'rgba(20, 10, 4, 0.9)',
                      border: `1.5px solid ${isSelected ? '#fff' : isWorking ? '#e8b830' : 'rgba(184, 56, 32, 0.45)'}`,
                      boxShadow: isWorking ? '0 0 16px #e8b830' : isSelected ? '0 0 20px #b83820' : '0 4px 10px rgba(0,0,0,0.6)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      zIndex: 9,
                      transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      transform: hoveredAgentId === agent.id ? 'scale(1.18)' : 'scale(1)',
                    }}
                    title={`${agent.name} (${agent.role})`}
                  >
                    <span style={{ fontSize: '10px', fontWeight: 800, color: isSelected ? '#fff' : '#f0a090', fontFamily: 'var(--font-cinzel)' }}>
                      {agent.name.slice(0, 3)}
                    </span>
                    <span style={{ fontSize: '7px', color: isSelected ? '#fff' : 'var(--text-muted)' }}>RUDRA</span>
                  </div>
                );
              })}

              {/* BOTTOM ARC: 8 VASUS (Foundation Nodes) */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(14, 8, 4, 0.85)',
                  padding: '6px 16px',
                  borderRadius: '30px',
                  border: '1px solid rgba(0, 196, 168, 0.3)',
                }}
              >
                <span style={{ fontSize: '10px', color: 'var(--accent-teal)', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
                  8 Vasus Foundation:
                </span>
                {tiers.vasus.map((agent) => {
                  const isSelected = selectedAgentId === agent.id;
                  return (
                    <button
                      key={agent.id}
                      onClick={() => setSelectedAgentId(agent.id)}
                      style={{
                        padding: '3px 9px',
                        borderRadius: '12px',
                        background: isSelected ? 'var(--accent-teal)' : 'rgba(0, 196, 168, 0.1)',
                        border: `1px solid ${isSelected ? '#fff' : 'rgba(0, 196, 168, 0.3)'}`,
                        color: isSelected ? '#000' : 'var(--text-teal)',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {agent.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* =========================================================================
              VIEW 2: HIERARCHICAL TREE VIEW
             ========================================================================= */}
          {viewMode === 'hierarchy' && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Level 1: Indra Command */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div
                  onClick={() => setSelectedAgentId('indra')}
                  className="glass-panel"
                  style={{
                    padding: '14px 28px',
                    borderRadius: '16px',
                    border: '1.5px solid var(--accent-gold)',
                    background: 'rgba(245, 158, 11, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                  }}
                >
                  <Shield size={20} color="var(--accent-gold)" />
                  <div>
                    <strong style={{ fontSize: '14px', color: 'var(--text-gold)', fontFamily: 'var(--font-cinzel)' }}>INDRA</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Supreme Operations Commander</span>
                  </div>
                </div>
              </div>

              {/* Level 2: 3 Specialized Pillar Columns */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                {/* Column 1: 12 Ādityas */}
                <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ borderBottom: '1px solid rgba(212, 168, 55, 0.2)', paddingBottom: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--accent-gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                      12 Ādityas (Strategy & Law)
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                    {tiers.adityas.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => setSelectedAgentId(a.id)}
                        className={`fluid-stage-pill ${selectedAgentId === a.id ? 'active' : ''}`}
                        style={{ padding: '6px 10px', fontSize: '11.5px', justifyContent: 'flex-start', borderRadius: '10px' }}
                      >
                        <span>{a.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Column 2: 11 Rudras */}
                <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ borderBottom: '1px solid rgba(184, 56, 32, 0.3)', paddingBottom: '6px' }}>
                    <span style={{ fontSize: '11px', color: '#f0a090', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                      11 Rudras (Engineering & QA)
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                    {tiers.rudras.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => setSelectedAgentId(a.id)}
                        className={`fluid-stage-pill ${selectedAgentId === a.id ? 'active' : ''}`}
                        style={{ padding: '6px 10px', fontSize: '11.5px', justifyContent: 'flex-start', borderRadius: '10px' }}
                      >
                        <span>{a.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Column 3: 8 Vasus */}
                <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ borderBottom: '1px solid rgba(0, 196, 168, 0.25)', paddingBottom: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--accent-teal)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                      8 Vasus (Compute & Infra)
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                    {tiers.vasus.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => setSelectedAgentId(a.id)}
                        className={`fluid-stage-pill ${selectedAgentId === a.id ? 'active' : ''}`}
                        style={{ padding: '6px 10px', fontSize: '11.5px', justifyContent: 'flex-start', borderRadius: '10px' }}
                      >
                        <span>{a.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Level 3: Prajāpati Evolution */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div
                  onClick={() => setSelectedAgentId('prajapati')}
                  className="glass-panel"
                  style={{
                    padding: '12px 24px',
                    borderRadius: '16px',
                    border: '1.5px solid var(--accent-teal)',
                    background: 'rgba(0, 196, 168, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                  }}
                >
                  <Sparkles size={16} color="var(--accent-teal)" />
                  <div>
                    <strong style={{ fontSize: '13px', color: 'var(--text-teal)', fontFamily: 'var(--font-cinzel)' }}>PRAJĀPATI</strong>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'block' }}>Dynamic Workforce Progenitor & Evolution</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              VIEW 3: WORKLOAD DISTRIBUTION
             ========================================================================= */}
          {viewMode === 'workload' && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
                Real-Time Specialist Load Distribution
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', maxHeight: '540px', overflowY: 'auto' }}>
                {agents.map((a) => {
                  const isWorking = ['WORKING', 'RUNNING'].includes(a.status.toUpperCase());
                  return (
                    <div
                      key={a.id}
                      onClick={() => setSelectedAgentId(a.id)}
                      className="metric-glow-item"
                      style={{ cursor: 'pointer', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <strong style={{ fontSize: '13px', color: isWorking ? 'var(--accent-teal)' : 'var(--text-primary)', fontFamily: 'var(--font-cinzel)' }}>
                          {a.name}
                        </strong>
                        <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '8px', background: isWorking ? 'rgba(0, 196, 168, 0.2)' : 'rgba(255,255,255,0.05)', color: isWorking ? '#00c4a8' : 'var(--text-muted)' }}>
                          {a.status}
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{a.role}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =========================================================================
              VIEW 4: CAPABILITY MATRIX
             ========================================================================= */}
          {viewMode === 'matrix' && (
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(212, 168, 55, 0.25)', color: 'var(--text-gold)' }}>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Agent</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Domain</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Risk Tier</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Permissions</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((a) => (
                    <tr
                      key={a.id}
                      onClick={() => setSelectedAgentId(a.id)}
                      style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', cursor: 'pointer' }}
                      className="hover-row"
                    >
                      <td style={{ padding: '10px', color: 'var(--text-primary)', fontFamily: 'var(--font-cinzel)' }}>{a.name}</td>
                      <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{a.role}</td>
                      <td style={{ padding: '10px', color: 'var(--accent-teal)' }}>TIER 1 (Sandboxed)</td>
                      <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{a.capabilities ? `${a.capabilities.length} Tools` : 'Scoped'}</td>
                      <td style={{ padding: '10px' }}>
                        <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(0, 196, 168, 0.1)', color: '#00c4a8' }}>
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Context Inspector Panel (When an agent is selected) */}
        {selectedAgent && (
          <div
            className="glass-panel"
            style={{
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              border: '1px solid var(--accent-gold)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
                  Specialist Operational Profile
                </span>
                <h3 style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'var(--font-cinzel)', color: 'var(--text-primary)', margin: '2px 0 0 0' }}>
                  {selectedAgent.name}
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--accent-teal)', fontWeight: 600 }}>{selectedAgent.role}</span>
              </div>
              <button
                onClick={() => setSelectedAgentId(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Current Status</span>
                <strong style={{ color: '#10b981' }}>{selectedAgent.status}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Risk Tier</span>
                <span style={{ color: 'var(--accent-teal)' }}>TIER 1 (Strict Sandbox)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Inference Model</span>
                <span style={{ color: 'var(--text-gold)' }}>Local Qwen 2.5 / Ollama</span>
              </div>
            </div>

            {/* Works With (Collaboration Matrix) */}
            <div style={{ marginTop: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>
                Works With (Collaboration Squad)
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                <span className="glass-pill" style={{ fontSize: '11px', padding: '3px 8px' }}>Indra (Command)</span>
                <span className="glass-pill" style={{ fontSize: '11px', padding: '3px 8px' }}>Ṛtadhvaja (QA)</span>
                <span className="glass-pill" style={{ fontSize: '11px', padding: '3px 8px' }}>Dhātā (Strategy)</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => onNavigate('office')}
                className="btn btn-primary"
                style={{ width: '100%', padding: '10px', fontSize: '12px', justifyContent: 'center' }}
              >
                <span>Open Workstation in 3D Office</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
