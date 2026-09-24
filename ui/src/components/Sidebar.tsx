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
  ChevronRight,
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
  Globe,
} from 'lucide-react';
import { IndianEmblem } from './IndianEmblem';

export type NavTab =
  | 'home'
  | 'command-center'
  | 'chat'
  | 'council-chat'
  | 'work'
  | 'goals'
  | 'missions'
  | 'research'
  | 'knowledge'
  | 'agent-town'
  | 'agents'
  | 'tasks'
  | 'tools'
  | 'approvals'
  | 'memory'
  | 'computer'
  | 'multimodal'
  | 'environment'
  | 'models'
  | 'integrations'
  | 'audit'
  | 'settings'
  | 'companies'
  | 'skills'
  | 'mcp'
  | 'self-improvement';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  pendingApprovalsCount: number;
  activeAgentsCount: number;
  totalAgentsCount?: number;
  activeGoalsCount?: number;
  activeMissionsCount?: number;
  companiesCount?: number;
  projectsCount?: number;
  knowledgeCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  pendingApprovalsCount,
  activeAgentsCount,
  totalAgentsCount = 17,
  activeGoalsCount = 0,
  activeMissionsCount = 0,
  companiesCount = 0,
  projectsCount = 0,
  knowledgeCount = 0,
}) => {
  const [advancedOpen, setAdvancedOpen] = useState(
    ['missions', 'tasks', 'tools', 'approvals', 'agent-town', 'companies', 'models', 'integrations', 'audit', 'environment', 'research', 'knowledge', 'skills', 'mcp', 'self-improvement'].includes(currentTab)
  );

  const activeWorkTotal = activeGoalsCount + activeMissionsCount;

  const isHomeActive = currentTab === 'home' || currentTab === 'command-center';
  const isWorkActive = currentTab === 'work' || currentTab === 'goals' || currentTab === 'tasks' || currentTab === 'tools';

  const primaryNavItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: string | number; isActive: boolean }[] = [
    {
      id: 'home',
      label: 'Home',
      icon: <Home size={17} />,
      isActive: isHomeActive,
    },
    {
      id: 'agents',
      label: 'Agents',
      icon: <Users size={17} />,
      badge: activeAgentsCount > 0 ? `${activeAgentsCount} Active` : `${totalAgentsCount} Ready`,
      isActive: currentTab === 'agents' || currentTab === 'agent-town',
    },
    {
      id: 'companies',
      label: 'Companies',
      icon: <Building2 size={17} />,
      badge: companiesCount > 0 ? `${companiesCount} Op.` : '0',
      isActive: currentTab === 'companies',
    },
    {
      id: 'missions',
      label: 'Projects',
      icon: <Target size={17} />,
      badge: projectsCount > 0 ? `${projectsCount} Active` : activeMissionsCount > 0 ? `${activeMissionsCount} Active` : '0',
      isActive: currentTab === 'missions',
    },
    {
      id: 'work',
      label: 'Missions',
      icon: <CheckSquare size={17} />,
      badge: activeWorkTotal > 0 ? `${activeWorkTotal} Run.` : '0',
      isActive: isWorkActive,
    },
    {
      id: 'knowledge',
      label: 'Knowledge',
      icon: <Share2 size={17} />,
      badge: knowledgeCount > 0 ? `${knowledgeCount}` : '0',
      isActive: currentTab === 'knowledge' || currentTab === 'research',
    },
    {
      id: 'memory',
      label: 'Memory',
      icon: <Database size={17} />,
      badge: '∞ Grow',
      isActive: currentTab === 'memory',
    },
    {
      id: 'self-improvement',
      label: 'Self-Improvement',
      icon: <RefreshCw size={17} />,
      isActive: currentTab === 'self-improvement',
    },
    {
      id: 'chat',
      label: 'Chat Interface',
      icon: <MessageSquare size={17} />,
      isActive: currentTab === 'chat' || currentTab === 'council-chat',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings size={17} />,
      isActive: currentTab === 'settings',
    },
  ];

  const advancedNavItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'agent-town', label: 'Agent Town 3D', icon: <Network size={15} /> },
    { id: 'council-chat', label: 'Council Sabha', icon: <Users size={15} /> },
    { id: 'computer', label: 'Computer Operator', icon: <Monitor size={15} /> },
    { id: 'multimodal', label: 'Multimodal Vision', icon: <Sparkles size={15} /> },
    { id: 'mcp', label: 'MCP Ecosystem', icon: <Server size={15} /> },
    { id: 'skills', label: 'Skills & Procedures', icon: <Zap size={15} /> },
    { id: 'research', label: 'Research Engine', icon: <Compass size={15} /> },
    { id: 'tasks', label: 'Task Board', icon: <CheckSquare size={15} /> },
    { id: 'tools', label: 'Tool Registry', icon: <Wrench size={15} /> },
    {
      id: 'approvals',
      label: 'Approvals',
      icon: <ShieldAlert size={15} />,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
    },
    { id: 'models', label: 'AI Models', icon: <Cpu size={15} /> },
    { id: 'integrations', label: 'Integrations & APIs', icon: <Globe size={15} /> },
    { id: 'audit', label: 'Audit Trail', icon: <Activity size={15} /> },
    { id: 'environment', label: 'System Monitoring', icon: <Layers size={15} /> },
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header with Sacred Emblem */}
      <div className="sidebar-header">
        <IndianEmblem size={34} showText={true} />
      </div>

      <nav style={{ padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, overflowY: 'auto' }}>
        {/* Primary Navigation */}
        {primaryNavItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${item.isActive ? 'active' : ''}`}
            onClick={() => onSelectTab(item.id)}
            style={{ width: '100%' }}
          >
            <span className="nav-item-icon">{item.icon}</span>
            <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
            {item.badge !== undefined && (
              <span className="nav-badge warning">{item.badge}</span>
            )}
          </button>
        ))}

        {/* Subtle Gold Divider */}
        <div
          style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, var(--border-gold), transparent)',
            margin: '14px 8px',
            opacity: 0.4,
          }}
        />

        {/* Advanced Systems Collapsible Section */}
        <div>
          <button
            onClick={() => setAdvancedOpen(!advancedOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '8px 12px',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              borderRadius: 'var(--radius-xs)',
              transition: 'color 0.15s ease',
            }}
          >
            <span>Systems & Diagnostics</span>
            {advancedOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {advancedOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px', paddingLeft: '4px' }}>
              {advancedNavItems.map((item) => {
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => onSelectTab(item.id)}
                    style={{
                      fontSize: '12.5px',
                      padding: '7px 11px',
                    }}
                  >
                    <span className="nav-item-icon">{item.icon}</span>
                    <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                    {item.badge !== undefined && (
                      <span className="nav-badge warning">{item.badge}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      {/* Bottom Status Indicator */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '11.5px',
          color: 'var(--text-secondary)',
          background: 'var(--bg-card)',
        }}
      >
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#10B981',
            boxShadow: '0 0 8px #10B981',
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Autonomous Kernel</span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Sovereign OS
          </span>
        </div>
      </div>
    </aside>
  );
};
