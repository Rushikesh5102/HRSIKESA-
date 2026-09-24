import React, { useState } from 'react';
import {
  Home,
  MessageSquare,
  Briefcase,
  Users,
  Database,
  Monitor,
  Settings,
  ChevronDown,
  Network,
  Target,
  CheckSquare,
  Wrench,
  ShieldAlert,
  Compass,
  Building2,
  Cpu,
  Activity,
  Layers,
  Share2,
  Zap,
  Server,
  Sparkles,
  RefreshCw,
  Key,
} from 'lucide-react';
import { NavTab } from './Sidebar';
import { VoiceStatusResponse } from '../types/api.types';

export interface ScriptureNavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  systemOnline?: boolean;
  pendingApprovalsCount?: number;
  activeAgentsCount?: number;
  activeGoalsCount?: number;
  activeMissionsCount?: number;
  voiceStatus?: VoiceStatusResponse;
}

interface NavItemDef {
  id: NavTab;
  label: string;
  sanskrit: string;
  icon: React.ReactNode;
  badge?: number;
}

export const ScriptureNavbar: React.FC<ScriptureNavbarProps> = ({
  currentTab,
  onSelectTab,
  systemOnline = true,
  pendingApprovalsCount = 0,
  activeAgentsCount = 0,
  activeGoalsCount = 0,
  activeMissionsCount = 0,
}) => {
  const [openGranthaMenu, setOpenGranthaMenu] = useState<string | null>(null);
  const activeWorkTotal = activeGoalsCount + activeMissionsCount;

  // Primary Scripture Scroll Tabs
  const primaryTabs: NavItemDef[] = [
    { id: 'home', label: 'Home', sanskrit: 'पीठ', icon: <Home size={15} /> },
    { id: 'chat', label: 'Chat', sanskrit: 'संवाद', icon: <MessageSquare size={15} /> },
    { id: 'council-chat', label: 'Council', sanskrit: 'परिषद', icon: <Users size={15} /> },
    { id: 'work', label: 'Work', sanskrit: 'कर्म', icon: <Briefcase size={15} />, badge: activeWorkTotal > 0 ? activeWorkTotal : undefined },
    { id: 'agents', label: 'Agents', sanskrit: 'दूत', icon: <Network size={15} />, badge: activeAgentsCount > 0 ? activeAgentsCount : undefined },
    { id: 'agent-town', label: 'Town', sanskrit: 'नगर', icon: <Building2 size={15} /> },
    { id: 'knowledge', label: 'Knowledge', sanskrit: 'ज्ञान', icon: <Share2 size={15} /> },
    { id: 'memory', label: 'Memory', sanskrit: 'स्मृति', icon: <Database size={15} /> },
    { id: 'research', label: 'Research', sanskrit: 'शोध', icon: <Compass size={15} /> },
    { id: 'computer', label: 'Operator', sanskrit: 'यन्त्र', icon: <Monitor size={15} /> },
    { id: 'settings', label: 'Settings', sanskrit: 'व्यवस्था', icon: <Settings size={15} /> },
  ];

  // Grantha (Chapters / Extended Shastras)
  const granthaGroups: {
    id: string;
    title: string;
    sanskrit: string;
    icon: React.ReactNode;
    items: NavItemDef[];
  }[] = [
    {
      id: 'missions-tasks',
      title: 'Operations & Execution',
      sanskrit: 'अभियान एवं कार्य',
      icon: <Target size={14} />,
      items: [
        { id: 'missions', label: 'Missions', sanskrit: 'अभियान', icon: <Target size={14} />, badge: activeMissionsCount > 0 ? activeMissionsCount : undefined },
        { id: 'goals', label: 'Goals & Milestones', sanskrit: 'लक्ष्य', icon: <Target size={14} />, badge: activeGoalsCount > 0 ? activeGoalsCount : undefined },
        { id: 'tasks', label: 'Task Pipeline', sanskrit: 'कार्य', icon: <CheckSquare size={14} /> },
        { id: 'tools', label: 'Tool Registry', sanskrit: 'उपकरण', icon: <Wrench size={14} /> },
        { id: 'approvals', label: 'Security Approvals', sanskrit: 'अनुमति', icon: <ShieldAlert size={14} />, badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined },
      ],
    },
    {
      id: 'intelligence-shastra',
      title: 'Intelligence & Models',
      sanskrit: 'बुद्धि एवं शास्त्र',
      icon: <Cpu size={14} />,
      items: [
        { id: 'models', label: 'AI Models & Router', sanskrit: 'प्ररूप', icon: <Cpu size={14} /> },
        { id: 'skills', label: 'Procedural Skills', sanskrit: 'विद्या', icon: <Zap size={14} /> },
        { id: 'mcp', label: 'MCP Ecosystem', sanskrit: 'प्रणाली', icon: <Server size={14} /> },
        { id: 'multimodal', label: 'Vision & Audio', sanskrit: 'दृष्टि-ध्वनि', icon: <Sparkles size={14} /> },
        { id: 'self-improvement', label: 'Self-Evolution', sanskrit: 'आत्म-सुधार', icon: <RefreshCw size={14} /> },
      ],
    },
    {
      id: 'governance-ecosystem',
      title: 'Enterprise & Diagnostics',
      sanskrit: 'संगठन एवं परीक्षण',
      icon: <Building2 size={14} />,
      items: [
        { id: 'companies', label: 'Autonomous Companies', sanskrit: 'उद्यम', icon: <Building2 size={14} /> },
        { id: 'integrations', label: 'Service Integrations', sanskrit: 'संयोजन', icon: <Key size={14} /> },
        { id: 'audit', label: 'Security Audit Ledger', sanskrit: 'लेखा', icon: <Activity size={14} /> },
        { id: 'environment', label: 'Hardware Matrix', sanskrit: 'वातावरण', icon: <Layers size={14} /> },
      ],
    },
  ];

  const handleSelect = (tab: NavTab) => {
    onSelectTab(tab);
    setOpenGranthaMenu(null);
  };

  return (
    <header
      className="scripture-navbar-container"
      style={{
        position: 'relative',
        zIndex: 50,
        background: 'linear-gradient(180deg, #1C150E 0%, #150F0A 100%)',
        backgroundImage: 'linear-gradient(180deg, rgba(212, 175, 55, 0.05) 0%, transparent 100%), var(--sand-grain-fine)',
        backgroundSize: 'auto, 160px 160px',
        borderBottom: '2px solid rgba(212, 175, 55, 0.45)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 235, 180, 0.15)',
      }}
    >
      {/* Top Parchment Scripture Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 20px',
          borderBottom: '1px solid rgba(212, 175, 55, 0.2)',
          background: 'rgba(18, 14, 10, 0.75)',
        }}
      >
        {/* Left: Sacred Vedic Crest & Invocation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            onClick={() => handleSelect('home')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            {/* Traditional Temple Seal Crest */}
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #D97706 0%, #D4AF37 100%)',
                border: '1.5px solid rgba(253, 224, 71, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#120E0A',
                fontWeight: 900,
                fontSize: '18px',
                fontFamily: 'var(--font-devanagari)',
                boxShadow: '0 0 14px rgba(212, 175, 55, 0.45), inset 0 1px 2px rgba(255, 255, 255, 0.4)',
                flexShrink: 0,
              }}
            >
              ॐ
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '17px',
                    fontWeight: 700,
                    letterSpacing: '1.5px',
                    color: 'var(--text-gold)',
                    fontFamily: 'var(--font-cinzel)',
                    textShadow: '0 0 12px rgba(212, 175, 55, 0.35)',
                  }}
                >
                  HṚṢĪKEŚA
                </span>
                <span
                  style={{
                    fontSize: '11.5px',
                    color: '#FAF5EB',
                    background: 'rgba(212, 175, 55, 0.16)',
                    border: '1px solid rgba(212, 175, 55, 0.35)',
                    padding: '1px 8px',
                    borderRadius: '4px',
                    fontFamily: 'var(--font-devanagari)',
                    fontWeight: 600,
                    letterSpacing: '0.5px',
                  }}
                >
                  हृषीकेश • सार्वभौम शासन
                </span>
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', letterSpacing: '0.8px', marginTop: '1px' }}>
                ॥ स्वायत्त बुद्धि सर्वशास्त्र पारंगत ॥ Sovereign Autonomous Workspace
              </div>
            </div>
          </div>
        </div>

        {/* Right: Master Emblem & System Telemetry */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Kernel Health Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 10px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              fontSize: '11px',
              fontWeight: 600,
              color: '#10B981',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981' }} />
            <span>सक्रिय • Kernel Online</span>
          </div>

          {/* Pending Approvals Alert Badge if Any */}
          {pendingApprovalsCount > 0 && (
            <button
              onClick={() => handleSelect('approvals')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 10px',
                borderRadius: '12px',
                background: 'rgba(234, 88, 12, 0.2)',
                border: '1px solid rgba(234, 88, 12, 0.5)',
                fontSize: '11px',
                fontWeight: 700,
                color: '#FB923C',
                cursor: 'pointer',
              }}
            >
              <ShieldAlert size={12} />
              <span>{pendingApprovalsCount} Approvals</span>
            </button>
          )}

          {/* Master User Seal */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '3px 10px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, rgba(46, 32, 20, 0.9) 0%, rgba(26, 18, 12, 0.95) 100%)',
              border: '1px solid rgba(212, 175, 55, 0.35)',
              boxShadow: 'inset 0 1px 1px rgba(255, 235, 180, 0.1)',
            }}
          >
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent-saffron), var(--accent-gold))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#120E0A',
                fontWeight: 700,
                fontSize: '11px',
              }}
            >
              R
            </div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Rushikesh</span>
            <span
              style={{
                fontSize: '9.5px',
                color: 'var(--text-gold)',
                background: 'rgba(212, 175, 55, 0.15)',
                padding: '1px 5px',
                borderRadius: '3px',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                fontWeight: 700,
                letterSpacing: '0.5px',
              }}
            >
              स्वामी • MASTER
            </span>
          </div>
        </div>
      </div>

      {/* Traditional Palm-Leaf Scripture Parchment Ribbon */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 16px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          gap: '6px',
          position: 'relative',
          background: 'linear-gradient(90deg, rgba(30, 22, 14, 0.9) 0%, rgba(42, 30, 20, 0.95) 50%, rgba(30, 22, 14, 0.9) 100%)',
        }}
      >
        {/* Decorative Traditional Knot Glyph Left */}
        <span style={{ color: 'var(--text-gold)', fontSize: '14px', opacity: 0.6, userSelect: 'none', paddingLeft: '4px' }}>
          ࿓
        </span>

        {/* Primary Scripture Manuscript Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'nowrap' }}>
          {primaryTabs.map((tab) => {
            const isActive = currentTab === tab.id || (tab.id === 'home' && currentTab === 'command-center');

            return (
              <button
                key={tab.id}
                onClick={() => handleSelect(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: isActive
                    ? 'linear-gradient(180deg, rgba(212, 175, 55, 0.22) 0%, rgba(217, 119, 6, 0.28) 100%)'
                    : 'transparent',
                  border: isActive
                    ? '1.5px solid rgba(234, 193, 88, 0.75)'
                    : '1.5px solid transparent',
                  color: isActive ? 'var(--text-gold)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  whiteSpace: 'nowrap',
                  boxShadow: isActive
                    ? '0 0 14px rgba(212, 175, 55, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.15)'
                    : 'none',
                  position: 'relative',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', color: isActive ? 'var(--text-gold)' : 'var(--text-muted)' }}>
                  {tab.icon}
                </span>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.15 }}>
                  <span style={{ fontSize: '12.5px', fontWeight: isActive ? 700 : 500 }}>
                    {tab.label}
                  </span>
                  <span
                    style={{
                      fontSize: '9.5px',
                      color: isActive ? 'var(--accent-gold-bright)' : 'var(--text-muted)',
                      fontFamily: 'var(--font-devanagari)',
                      fontWeight: 500,
                    }}
                  >
                    {tab.sanskrit}
                  </span>
                </div>

                {tab.badge !== undefined && (
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '1px 6px',
                      borderRadius: '8px',
                      background: 'rgba(217, 119, 6, 0.35)',
                      border: '1px solid rgba(217, 119, 6, 0.6)',
                      color: '#FCD34D',
                      fontWeight: 700,
                      marginLeft: '2px',
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Traditional Gold Vertical Filigree Separator */}
        <div style={{ width: '1px', height: '26px', background: 'rgba(212, 175, 55, 0.3)', margin: '0 4px', flexShrink: 0 }} />

        {/* Scripture Chapters (Granthas) Dropdown Clusters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
          {granthaGroups.map((group) => {
            const isGroupActive = group.items.some((it) => it.id === currentTab);
            const isOpen = openGranthaMenu === group.id;

            return (
              <div key={group.id} style={{ position: 'relative' }}>
                <button
                  onClick={() => setOpenGranthaMenu(isOpen ? null : group.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 11px',
                    borderRadius: '6px',
                    background: isGroupActive
                      ? 'linear-gradient(180deg, rgba(212, 175, 55, 0.20) 0%, rgba(42, 30, 20, 0.8) 100%)'
                      : isOpen
                      ? 'rgba(46, 32, 20, 0.9)'
                      : 'rgba(28, 20, 13, 0.5)',
                    border: isGroupActive || isOpen
                      ? '1px solid rgba(212, 175, 55, 0.5)'
                      : '1px solid rgba(212, 175, 55, 0.2)',
                    color: isGroupActive ? 'var(--text-gold)' : 'var(--text-secondary)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ color: 'var(--text-gold)', display: 'flex', alignItems: 'center' }}>
                    {group.icon}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.1 }}>
                    <span style={{ fontWeight: 600 }}>{group.title}</span>
                    <span style={{ fontSize: '9px', color: 'var(--text-gold)', fontFamily: 'var(--font-devanagari)' }}>
                      {group.sanskrit}
                    </span>
                  </div>
                  <ChevronDown size={12} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
                </button>

                {/* Dropdown Parchment Scroll Leaf */}
                {isOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '6px',
                      minWidth: '220px',
                      background: '#1A130D',
                      backgroundImage: 'linear-gradient(180deg, rgba(212, 175, 55, 0.08) 0%, transparent 100%), var(--sand-grain-fine)',
                      backgroundSize: 'auto, 160px 160px',
                      border: '1.5px solid rgba(212, 175, 55, 0.55)',
                      borderRadius: '8px',
                      padding: '8px',
                      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.85), inset 0 1px 1px rgba(255, 235, 180, 0.15)',
                      zIndex: 100,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '10px',
                        color: 'var(--text-gold)',
                        fontFamily: 'var(--font-devanagari)',
                        fontWeight: 700,
                        padding: '4px 8px 6px 8px',
                        borderBottom: '1px solid rgba(212, 175, 55, 0.2)',
                        letterSpacing: '0.5px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>॥ {group.sanskrit} ॥</span>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{group.items.length} Shastras</span>
                    </div>

                    {group.items.map((it) => {
                      const isItemActive = currentTab === it.id;
                      return (
                        <button
                          key={it.id}
                          onClick={() => handleSelect(it.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            borderRadius: '5px',
                            background: isItemActive ? 'rgba(212, 175, 55, 0.18)' : 'transparent',
                            border: isItemActive ? '1px solid rgba(212, 175, 55, 0.4)' : '1px solid transparent',
                            color: isItemActive ? 'var(--text-gold)' : 'var(--text-primary)',
                            cursor: 'pointer',
                            fontSize: '12px',
                            textAlign: 'left',
                            transition: 'all 0.12s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: isItemActive ? 'var(--text-gold)' : 'var(--text-muted)' }}>{it.icon}</span>
                            <div>
                              <div style={{ fontWeight: isItemActive ? 700 : 500 }}>{it.label}</div>
                              <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-devanagari)' }}>
                                {it.sanskrit}
                              </div>
                            </div>
                          </div>

                          {it.badge !== undefined && (
                            <span
                              style={{
                                fontSize: '10px',
                                padding: '1px 6px',
                                borderRadius: '8px',
                                background: 'rgba(217, 119, 6, 0.35)',
                                border: '1px solid rgba(217, 119, 6, 0.5)',
                                color: '#FCD34D',
                                fontWeight: 700,
                              }}
                            >
                              {it.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Decorative Traditional Knot Glyph Right */}
        <span style={{ color: 'var(--text-gold)', fontSize: '14px', opacity: 0.6, userSelect: 'none', paddingRight: '4px' }}>
          ࿔
        </span>
      </nav>
    </header>
  );
};
