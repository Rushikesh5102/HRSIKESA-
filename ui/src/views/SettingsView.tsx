import React, { useState } from 'react';
import {
  Settings,
  Shield,
  User,
  Volume2,
  Cpu,
  Database,
  Monitor,
  Palette,
  Layers,
  Sparkles,
  Users,
  Building2,
  Globe,
  Radio,
  Check,
} from 'lucide-react';
import { SystemStatusResponse, VoiceStatusResponse } from '../types/api.types';
import { api } from '../services/api';
import { VoiceSettingsSection } from './VoiceSettingsSection';

interface SettingsViewProps {
  status?: SystemStatusResponse;
  voiceStatus?: VoiceStatusResponse;
  theme?: string;
  onSetTheme?: (theme: string) => void;
}

type SettingsTab =
  | 'GENERAL'
  | 'AGENTS'
  | 'COMPANIES'
  | 'MODELS'
  | 'SECURITY'
  | 'APPEARANCE'
  | 'AUDIO'
  | 'INTEGRATIONS';

export const SettingsView: React.FC<SettingsViewProps> = ({
  status,
  voiceStatus,
  theme = 'cosmic',
  onSetTheme,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('APPEARANCE');
  const [sanskritLabels, setSanskritLabels] = useState(() => {
    try {
      const saved = localStorage.getItem('hrisekesa_sanskrit_labels');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const [ambientSounds, setAmbientSounds] = useState(() => {
    try {
      const saved = localStorage.getItem('hrisekesa_ambient_sounds');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const [animatedEffects, setAnimatedEffects] = useState(() => {
    try {
      const saved = localStorage.getItem('hrisekesa_animated_effects');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const [activePalette, setActivePalette] = useState(() => {
    try {
      return localStorage.getItem('hrisekesa_palette') || 'saffron-gold';
    } catch {
      return 'saffron-gold';
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem('hrisekesa_sanskrit_labels', String(sanskritLabels));
    } catch (e) {
      console.warn('Failed to save sanskritLabels to localStorage', e);
    }
  }, [sanskritLabels]);

  React.useEffect(() => {
    try {
      localStorage.setItem('hrisekesa_ambient_sounds', String(ambientSounds));
    } catch (e) {
      console.warn('Failed to save ambientSounds to localStorage', e);
    }
  }, [ambientSounds]);

  React.useEffect(() => {
    try {
      localStorage.setItem('hrisekesa_animated_effects', String(animatedEffects));
    } catch (e) {
      console.warn('Failed to save animatedEffects to localStorage', e);
    }
  }, [animatedEffects]);

  React.useEffect(() => {
    try {
      localStorage.setItem('hrisekesa_palette', activePalette);
      document.documentElement.setAttribute('data-palette', activePalette);
    } catch (e) {
      console.warn('Failed to save palette to localStorage', e);
    }
  }, [activePalette]);

  const categories: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'GENERAL', label: 'General', icon: <User size={15} /> },
    { id: 'AGENTS', label: 'Agents', icon: <Users size={15} /> },
    { id: 'COMPANIES', label: 'Companies', icon: <Building2 size={15} /> },
    { id: 'MODELS', label: 'Models', icon: <Cpu size={15} /> },
    { id: 'SECURITY', label: 'Security', icon: <Shield size={15} /> },
    { id: 'APPEARANCE', label: 'Appearance', icon: <Palette size={15} /> },
    { id: 'AUDIO', label: 'Audio', icon: <Volume2 size={15} /> },
    { id: 'INTEGRATIONS', label: 'Integrations', icon: <Globe size={15} /> },
  ];

  const themes = [
    {
      id: 'cosmic',
      name: 'Traditional (Default)',
      preview: 'radial-gradient(circle, #D4AF37 0%, #2A1708 70%, #150E05 100%)',
      desc: 'Vedic Cyberpunk Temple Sanctum with glowing cyan & gold yantras',
    },
    {
      id: 'light',
      name: 'Light',
      preview: 'linear-gradient(135deg, #FBF6EA 0%, #F5ECDA 100%)',
      desc: 'Warm Royal Sandstone & Ancient Parchment with dark bronze lettering',
    },
    {
      id: 'dark',
      name: 'Dark',
      preview: 'linear-gradient(135deg, #18120C 0%, #0A0704 100%)',
      desc: 'Deep Obsidian Temple Night with minimal subtle gold inlays',
    },
    {
      id: 'mahabharata',
      name: 'Manuscript',
      preview: 'linear-gradient(135deg, #EFE3CE 0%, #DFCCA6 100%)',
      desc: 'Antique Palm-leaf scripture parchment with sepia inks',
    },
  ];

  const palettes = [
    { id: 'saffron-gold', label: 'Saffron & Gold', c1: '#D4820A', c2: '#F5C842' },
    { id: 'beige-cyan', label: 'Beige & Cyan', c1: '#E8D8BE', c2: '#00E5FF' },
    { id: 'royal-blue', label: 'Royal Blue', c1: '#1E3A8A', c2: '#38BDF8' },
    { id: 'earth-tones', label: 'Earth Tones', c1: '#78350F', c2: '#D97706' },
  ];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Header bar (Panel 10) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--accent-saffron), var(--accent-gold))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F0D0A', fontWeight: 800, fontSize: '18px' }}>
            ⚙️
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-cinzel)' }}>
                Settings
              </h1>
            </div>
            <p style={{ margin: '2px 0 0', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
              Configure appearance, theme palettes, audio engines, and sovereign kernel behavior.
            </p>
          </div>
        </div>
      </div>

      {/* Main 2-Column Settings Layout (Panel 10) */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '24px' }}>
        {/* Left Subnav Sidebar in Warm Parchment */}
        <div
          className="parchment-gold-card"
          style={{
            background: '#FAF5EB',
            color: '#2A1A0B',
            borderRadius: 'var(--radius-md)',
            padding: '12px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            height: 'fit-content',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          {categories.map((cat) => {
            const isSelected = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: isSelected ? 'linear-gradient(90deg, #F5C842 0%, #D4AF37 100%)' : 'transparent',
                  color: isSelected ? '#1A0E05' : '#5C4028',
                  border: isSelected ? '1px solid #D4A837' : '1px solid transparent',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: isSelected ? 800 : 600,
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ color: isSelected ? '#1A0E05' : '#8A6D4B' }}>
                  {cat.icon}
                </span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Settings Content Area in Warm Parchment */}
        <div
          className="parchment-gold-card"
          style={{
            background: '#FAF5EB',
            color: '#2A1A0B',
            borderRadius: 'var(--radius-md)',
            padding: '28px 32px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            gap: '26px',
          }}
        >
          {activeTab === 'APPEARANCE' && (
            <>
              {/* Section Header */}
              <div style={{ borderBottom: '1.5px solid #D6BC97', paddingBottom: '12px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#2A1A0B', fontFamily: 'var(--font-cinzel)' }}>
                  Appearance
                </h2>
                <span style={{ fontSize: '12px', color: '#7A5B36' }}>
                  Customize UI themes, color palettes, and ambient animation styles
                </span>
              </div>

              {/* 1. Theme Selection Cards (Panel 10) */}
              <div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#996515', letterSpacing: '0.8px', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>
                  Theme
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
                  {themes.map((t) => {
                    const isSelected = theme === t.id || (t.id === 'cosmic' && (theme === 'dark' || !theme));
                    return (
                      <div
                        key={t.id}
                        onClick={() => onSetTheme && onSetTheme(t.id)}
                        style={{
                          background: '#F5ECE0',
                          border: `1.5px solid ${isSelected ? '#D4A837' : '#D6BC97'}`,
                          borderRadius: '8px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          boxShadow: isSelected ? '0 0 16px rgba(212, 168, 55, 0.45)' : 'none',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        <div
                          style={{
                            height: '65px',
                            background: t.preview,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderBottom: '1px solid #D6BC97',
                          }}
                        >
                          {isSelected && (
                            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#D4A837', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#150E06' }}>
                              <Check size={14} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <div style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <div style={{ fontSize: '12.5px', fontWeight: 700, color: isSelected ? '#996515' : '#2A1A0B' }}>
                            {t.name}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Color Palette Swatches (Panel 10) */}
              <div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#996515', letterSpacing: '0.8px', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>
                  Color Palette
                </span>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  {palettes.map((p) => {
                    const isSelected = activePalette === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setActivePalette(p.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          background: '#F5ECE0',
                          border: `1.5px solid ${isSelected ? '#D4A837' : '#D6BC97'}`,
                          padding: '8px 16px',
                          borderRadius: '20px',
                          cursor: 'pointer',
                          boxShadow: isSelected ? '0 0 12px rgba(212, 168, 55, 0.35)' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex' }}>
                          <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: p.c1, marginRight: '-5px', zIndex: 1 }} />
                          <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: p.c2 }} />
                        </div>
                        <span style={{ fontSize: '12.5px', fontWeight: isSelected ? 800 : 600, color: isSelected ? '#996515' : '#5C4028' }}>
                          {p.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Toggles & Switches (Panel 10) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Sanskrit Labels */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#F5ECE0', borderRadius: '8px', border: '1px solid #D6BC97' }}>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#2A1A0B' }}>
                      Sanskrit Labels (Optional)
                    </div>
                    <div style={{ fontSize: '11px', color: '#7A5B36' }}>
                      Display Devanagari script alongside section titles and navigation
                    </div>
                  </div>
                  <div
                    onClick={() => setSanskritLabels(!sanskritLabels)}
                    style={{
                      width: '44px',
                      height: '24px',
                      borderRadius: '12px',
                      background: sanskritLabels ? '#10B981' : '#D6BC97',
                      padding: '2px',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: '#FFFFFF',
                        transform: sanskritLabels ? 'translateX(20px)' : 'translateX(0px)',
                        transition: 'transform 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      }}
                    />
                  </div>
                </div>

                {/* Ambient Sounds */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#F5ECE0', borderRadius: '8px', border: '1px solid #D6BC97' }}>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#2A1A0B' }}>
                      Ambient Sounds
                    </div>
                    <div style={{ fontSize: '11px', color: '#7A5B36' }}>
                      Vedic binaural frequencies and soothing autonomous work chimes
                    </div>
                  </div>
                  <div
                    onClick={() => setAmbientSounds(!ambientSounds)}
                    style={{
                      width: '44px',
                      height: '24px',
                      borderRadius: '12px',
                      background: ambientSounds ? '#10B981' : '#D6BC97',
                      padding: '2px',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: '#FFFFFF',
                        transform: ambientSounds ? 'translateX(20px)' : 'translateX(0px)',
                        transition: 'transform 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      }}
                    />
                  </div>
                </div>

                {/* Animated Effects */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#F5ECE0', borderRadius: '8px', border: '1px solid #D6BC97' }}>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#2A1A0B' }}>
                      Animated Effects
                    </div>
                    <div style={{ fontSize: '11px', color: '#7A5B36' }}>
                      Cosmic Yantra orbital rotations, glowing wave lines, and fluid transitions
                    </div>
                  </div>
                  <div
                    onClick={() => setAnimatedEffects(!animatedEffects)}
                    style={{
                      width: '44px',
                      height: '24px',
                      borderRadius: '12px',
                      background: animatedEffects ? '#10B981' : '#D6BC97',
                      padding: '2px',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: '#FFFFFF',
                        transform: animatedEffects ? 'translateX(20px)' : 'translateX(0px)',
                        transition: 'transform 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      }}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'AUDIO' && (
            <VoiceSettingsSection />
          )}

          {activeTab === 'GENERAL' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ borderBottom: '1.5px solid #D6BC97', paddingBottom: '12px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#2A1A0B', fontFamily: 'var(--font-cinzel)' }}>
                  General System Configuration
                </h2>
                <span style={{ fontSize: '12px', color: '#7A5B36' }}>
                  Sovereign runtime identification, uptime metrics, and process telemetry
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ background: '#F5ECE0', padding: '14px', borderRadius: '8px', border: '1px solid #D6BC97' }}>
                  <div style={{ fontSize: '11px', color: '#7A5B36', fontWeight: 700 }}>SOVEREIGN KERNEL</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#2A1A0B', marginTop: '4px' }}>HṚṢĪKEŚA v1.0.0</div>
                  <div style={{ fontSize: '11px', color: '#10B981', marginTop: '2px' }}>● Status: Operational</div>
                </div>
                <div style={{ background: '#F5ECE0', padding: '14px', borderRadius: '8px', border: '1px solid #D6BC97' }}>
                  <div style={{ fontSize: '11px', color: '#7A5B36', fontWeight: 700 }}>ENVIRONMENT RUNTIME</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#2A1A0B', marginTop: '4px' }}>Node.js / Vite + React</div>
                  <div style={{ fontSize: '11px', color: '#5C4028', marginTop: '2px' }}>Architecture: x64 Sovereign</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'AGENTS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ borderBottom: '1.5px solid #D6BC97', paddingBottom: '12px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#2A1A0B', fontFamily: 'var(--font-cinzel)' }}>
                  Agent Workforce Governance
                </h2>
                <span style={{ fontSize: '12px', color: '#7A5B36' }}>
                  Autonomy ceilings, concurrency governors, and heartbeat policies
                </span>
              </div>
              <div style={{ background: '#F5ECE0', padding: '16px', borderRadius: '8px', border: '1px solid #D6BC97', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#2A1A0B' }}>Council Deliberation Quorum</div>
                    <div style={{ fontSize: '11px', color: '#7A5B36' }}>Minimum agent consensus required for autonomous mission initiation</div>
                  </div>
                  <span style={{ fontWeight: 800, color: '#996515', fontSize: '14px' }}>3 Agents</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E8D8BE', paddingTop: '10px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#2A1A0B' }}>Max Concurrent Active Subagents</div>
                    <div style={{ fontSize: '11px', color: '#7A5B36' }}>Upper bound on parallel worker thread execution</div>
                  </div>
                  <span style={{ fontWeight: 800, color: '#996515', fontSize: '14px' }}>8 Workers</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'COMPANIES' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ borderBottom: '1.5px solid #D6BC97', paddingBottom: '12px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#2A1A0B', fontFamily: 'var(--font-cinzel)' }}>
                  Corporate & Organizational Structure
                </h2>
                <span style={{ fontSize: '12px', color: '#7A5B36' }}>
                  Multi-entity enterprise hierarchies and divisional sandboxes
                </span>
              </div>
              <div style={{ background: '#F5ECE0', padding: '16px', borderRadius: '8px', border: '1px solid #D6BC97' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#2A1A0B' }}>Active Operating Entities</div>
                <div style={{ fontSize: '11px', color: '#7A5B36', marginTop: '2px' }}>Isolated workspaces for multi-company operations and sovereign subsidiaries.</div>
              </div>
            </div>
          )}

          {activeTab === 'MODELS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ borderBottom: '1.5px solid #D6BC97', paddingBottom: '12px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#2A1A0B', fontFamily: 'var(--font-cinzel)' }}>
                  Model Routing & Inference Engines
                </h2>
                <span style={{ fontSize: '12px', color: '#7A5B36' }}>
                  Local Ollama instances, cloud fallbacks, and embedding models
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: '#F5ECE0', padding: '14px', borderRadius: '8px', border: '1px solid #D6BC97' }}>
                  <div style={{ fontSize: '11px', color: '#7A5B36', fontWeight: 700 }}>LOCAL INFERENCE</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#2A1A0B', marginTop: '4px' }}>Ollama Local Engine</div>
                  <div style={{ fontSize: '11px', color: '#10B981', marginTop: '2px' }}>Default Endpoint: localhost:11434</div>
                </div>
                <div style={{ background: '#F5ECE0', padding: '14px', borderRadius: '8px', border: '1px solid #D6BC97' }}>
                  <div style={{ fontSize: '11px', color: '#7A5B36', fontWeight: 700 }}>VECTOR EMBEDDINGS</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#2A1A0B', marginTop: '4px' }}>Nomic / HuggingFace Local</div>
                  <div style={{ fontSize: '11px', color: '#5C4028', marginTop: '2px' }}>Fallback: Hybrid BM25 SQLite</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'SECURITY' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ borderBottom: '1.5px solid #D6BC97', paddingBottom: '12px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#2A1A0B', fontFamily: 'var(--font-cinzel)' }}>
                  Security & Human-in-the-Loop Authority
                </h2>
                <span style={{ fontSize: '12px', color: '#7A5B36' }}>
                  Authentication gates, elevation secrets, and promotion verification
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ background: '#F5ECE0', padding: '14px', borderRadius: '8px', border: '1px solid #D6BC97' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={16} color="#D4820A" />
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#2A1A0B' }}>Self-Evolution Promotion Gate</div>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#7A5B36', marginTop: '4px' }}>
                    Requires explicit human signature and HRISEKESA_MASTER_KEY or HRISEKESA_PROMOTION_SECRET before any autonomous code mutation is merged to production.
                  </div>
                </div>
                <div style={{ background: '#F5ECE0', padding: '14px', borderRadius: '8px', border: '1px solid #D6BC97' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={16} color="#10B981" />
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#2A1A0B' }}>Local Origin Restriction (CORS)</div>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#7A5B36', marginTop: '4px' }}>
                    API endpoints strictly bound to local origin addresses (localhost, 127.0.0.1) to prevent external cross-origin exploitation.
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'INTEGRATIONS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ borderBottom: '1.5px solid #D6BC97', paddingBottom: '12px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#2A1A0B', fontFamily: 'var(--font-cinzel)' }}>
                  External Bridges & Integrations
                </h2>
                <span style={{ fontSize: '12px', color: '#7A5B36' }}>
                  MCP Server nodes, GitHub Git sync, and communication bridges
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div style={{ background: '#F5ECE0', padding: '14px', borderRadius: '8px', border: '1px solid #D6BC97' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#2A1A0B' }}>Model Context Protocol (MCP)</div>
                  <div style={{ fontSize: '11px', color: '#7A5B36', marginTop: '2px' }}>Standardized JSON-RPC tool bridge</div>
                  <div style={{ fontSize: '11px', color: '#10B981', marginTop: '6px' }}>● Ready for connection</div>
                </div>
                <div style={{ background: '#F5ECE0', padding: '14px', borderRadius: '8px', border: '1px solid #D6BC97' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#2A1A0B' }}>Git Version Control</div>
                  <div style={{ fontSize: '11px', color: '#7A5B36', marginTop: '2px' }}>Local repository tracking</div>
                  <div style={{ fontSize: '11px', color: '#10B981', marginTop: '6px' }}>● Worktree isolation active</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
