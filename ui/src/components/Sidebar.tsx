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
  Github,
  Code,
  Terminal,
  GitBranch,
  Palette,
  X,
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
  | 'office'
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
  | 'self-improvement'
  | 'capabilities'
  | 'workers'
  | 'github'
  | 'ide'
  | 'engineering'
  | 'workflows'
  | 'accounts'
  | 'workspaces'
  | 'ecosystem'
  | 'creation'
  | 'persistent-ops'
  | 'evolution';

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
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
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
  mobileOpen = false,
  onCloseMobile,
}) => {
  const [advancedOpen, setAdvancedOpen] = useState(
    ['missions', 'tasks', 'tools', 'approvals', 'agent-town', 'companies', 'models', 'integrations', 'capabilities', 'workers', 'github', 'ide', 'engineering', 'workflows', 'accounts', 'audit', 'environment', 'research', 'knowledge', 'skills', 'mcp', 'self-improvement', 'creation', 'persistent-ops', 'evolution'].includes(currentTab)
  );

  const handleSelectTab = (tab: NavTab) => {
    onSelectTab(tab);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

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
      id: 'office',
      label: 'Virtual Office',
      icon: <Building2 size={17} />,
      badge: '17 Desks (Live)',
      isActive: currentTab === 'office',
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
      id: 'work',
      label: 'Work & Goals',
      icon: <CheckSquare size={17} />,
      badge: activeWorkTotal > 0 ? `${activeWorkTotal} Run.` : '0',
      isActive: isWorkActive,
    },
    {
      id: 'missions',
      label: 'Mission Control',
      icon: <Target size={17} />,
      badge: activeMissionsCount > 0 ? `${activeMissionsCount} Active` : projectsCount > 0 ? `${projectsCount} Proj.` : '0',
      isActive: currentTab === 'missions',
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
    { id: 'capabilities', label: 'Capability Fabric', icon: <Layers size={15} /> },
    { id: 'workers', label: 'Resource Fabric', icon: <Server size={15} /> },
    { id: 'github', label: 'GitHub Intelligence', icon: <Github size={15} /> },
    { id: 'ide', label: 'Universal IDE', icon: <Code size={15} /> },
    { id: 'engineering', label: 'Autonomous Coding', icon: <Terminal size={15} /> },
    { id: 'workflows', label: 'Universal Workflows', icon: <GitBranch size={15} /> },
    { id: 'accounts', label: 'Service Accounts (FP-12)', icon: <Key size={15} /> },
    { id: 'workspaces', label: 'Digital Workspaces (FP-13)', icon: <Monitor size={15} /> },
    { id: 'ecosystem', label: 'Ecosystem (FP-15)', icon: <Globe size={15} /> },
    { id: 'creation', label: 'Creation Studio (FP-17)', icon: <Palette size={15} /> },
    { id: 'persistent-ops', label: 'Persistent Operations (FP-19)', icon: <Cpu size={15} /> },
    { id: 'evolution', label: 'Self-Evolution Engine', icon: <RefreshCw size={15} /> },
    { id: 'audit', label: 'Audit Trail', icon: <Activity size={15} /> },
    { id: 'environment', label: 'System Monitoring', icon: <Layers size={15} /> },
  ];

  return (
    <>
      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={onCloseMobile}
          aria-label="Close navigation overlay"
        />
      )}
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Brand Header with Sacred Feather Emblem */}
        <div
          className="sidebar-header"
          style={{
            padding: '16px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <IndianEmblem size={40} showText={true} variant="crest" />
          {mobileOpen && onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="btn-icon"
              style={{
                background: 'rgba(212, 168, 55, 0.12)',
                border: '1px solid rgba(212, 168, 55, 0.3)',
                borderRadius: '6px',
                padding: '4px',
                color: 'var(--text-gold)',
                cursor: 'pointer',
              }}
              aria-label="Close navigation"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <nav style={{ padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, overflowY: 'auto' }}>
          {/* Primary Navigation */}
          {primaryNavItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${item.isActive ? 'active' : ''}`}
              onClick={() => handleSelectTab(item.id)}
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
                      onClick={() => handleSelectTab(item.id)}
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
    </>
  );
};
