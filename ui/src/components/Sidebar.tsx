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
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  Lock,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { IndianEmblem } from './IndianEmblem';

export type NavTab =
  | 'home'
  | 'command-center'
  | 'missions'
  | 'attention'
  | 'agents'
  | 'organization'
  | 'agent-town'
  | 'companies'
  | 'office'
  | 'work'
  | 'goals'
  | 'projects'
  | 'workflows'
  | 'automations'
  | 'schedules'
  | 'memory'
  | 'research'
  | 'decisions'
  | 'models'
  | 'knowledge'
  | 'skills'
  | 'mcp'
  | 'activity'
  | 'audit'
  | 'environment'
  | 'system-health'
  | 'security'
  | 'approvals'
  | 'workspaces'
  | 'files'
  | 'settings'
  | 'chat'
  | 'council-chat'
  | 'ide'
  | 'engineering'
  | 'computer'
  | 'multimodal'
  | 'self-improvement'
  | 'workers'
  | 'capabilities'
  | 'github'
  | 'accounts'
  | 'ecosystem'
  | 'creation'
  | 'persistent-ops'
  | 'evolution'
  | 'integrations'
  | 'tasks'
  | 'tools';

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
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  pendingApprovalsCount,
  activeAgentsCount,
  totalAgentsCount = 33,
  activeGoalsCount = 0,
  activeMissionsCount = 0,
  companiesCount = 0,
  projectsCount = 0,
  knowledgeCount = 0,
  mobileOpen = false,
  onCloseMobile,
  collapsed,
  onToggleCollapse,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('hrisekesa_sidebar_collapsed') === 'true';
  });

  const isCollapsed = typeof collapsed === 'boolean' ? collapsed : internalCollapsed;
  const [isHovered, setIsHovered] = useState(false);
  const isEffectiveCollapsed = isCollapsed && !isHovered;

  const handleToggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed((prev) => {
        const next = !prev;
        localStorage.setItem('hrisekesa_sidebar_collapsed', String(next));
        return next;
      });
    }
  };

  const handleSelectTab = (tab: NavTab) => {
    onSelectTab(tab);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  // Structured Categorical Navigation Sections (Section 5 of Spec)
  const navSections = [
    {
      title: 'COMMAND',
      items: [
        {
          id: 'home' as NavTab,
          label: 'Command Center',
          icon: <Home size={17} />,
          badge: 'Live',
          isActive: currentTab === 'home' || currentTab === 'command-center',
        },
        {
          id: 'missions' as NavTab,
          label: 'Missions Cockpit',
          icon: <Target size={17} />,
          badge: activeMissionsCount > 0 ? `${activeMissionsCount} Run` : undefined,
          isActive: currentTab === 'missions',
        },
        {
          id: 'attention' as NavTab,
          label: 'Attention',
          icon: <ShieldAlert size={17} />,
          badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
          badgeColor: '#F59E0B',
          isActive: currentTab === 'attention' || currentTab === 'approvals',
        },
        {
          id: 'chat' as NavTab,
          label: 'Direct Dialogue',
          icon: <MessageSquare size={17} />,
          isActive: currentTab === 'chat' || currentTab === 'council-chat',
        },
      ],
    },
    {
      title: 'ORGANIZATION',
      items: [
        {
          id: 'agents' as NavTab,
          label: '33 Agents Roster',
          icon: <Users size={17} />,
          badge: activeAgentsCount > 0 ? `${activeAgentsCount} Active` : `${totalAgentsCount} Ready`,
          isActive: currentTab === 'agents',
        },
        {
          id: 'organization' as NavTab,
          label: 'Mandala Architecture',
          icon: <Layers size={17} />,
          isActive: currentTab === 'organization',
        },
        {
          id: 'agent-town' as NavTab,
          label: 'Agent Town (Districts)',
          icon: <Network size={17} />,
          isActive: currentTab === 'agent-town',
        },
        {
          id: 'companies' as NavTab,
          label: 'Companies OS',
          icon: <Building2 size={17} />,
          badge: companiesCount > 0 ? `${companiesCount} Org` : undefined,
          isActive: currentTab === 'companies',
        },
        {
          id: 'office' as NavTab,
          label: '3D Virtual Office',
          icon: <Building2 size={17} />,
          isActive: currentTab === 'office',
        },
      ],
    },
    {
      title: 'WORK',
      items: [
        {
          id: 'work' as NavTab,
          label: 'Projects & Goals',
          icon: <CheckSquare size={17} />,
          badge: activeGoalsCount > 0 ? `${activeGoalsCount}` : undefined,
          isActive: currentTab === 'work' || currentTab === 'goals' || currentTab === 'projects',
        },
        {
          id: 'workflows' as NavTab,
          label: 'Universal Workflows',
          icon: <GitBranch size={17} />,
          isActive: currentTab === 'workflows',
        },
        {
          id: 'automations' as NavTab,
          label: 'Automations & Loops',
          icon: <RefreshCw size={17} />,
          badge: '4 Active',
          isActive: currentTab === 'automations' || currentTab === 'schedules',
        },
        {
          id: 'ide' as NavTab,
          label: 'Universal IDE',
          icon: <Code size={17} />,
          isActive: currentTab === 'ide' || currentTab === 'engineering',
        },
      ],
    },
    {
      title: 'INTELLIGENCE',
      items: [
        {
          id: 'memory' as NavTab,
          label: 'Hierarchical Memory',
          icon: <Database size={17} />,
          isActive: currentTab === 'memory',
        },
        {
          id: 'research' as NavTab,
          label: 'Research Engine',
          icon: <Compass size={17} />,
          isActive: currentTab === 'research',
        },
        {
          id: 'decisions' as NavTab,
          label: 'Decisions Center',
          icon: <Sparkles size={17} />,
          isActive: currentTab === 'decisions',
        },
        {
          id: 'models' as NavTab,
          label: 'Intelligence Fabric',
          icon: <Cpu size={17} />,
          badge: 'Ollama Offline',
          isActive: currentTab === 'models',
        },
        {
          id: 'skills' as NavTab,
          label: 'Skills & MCP',
          icon: <Zap size={17} />,
          isActive: currentTab === 'skills' || currentTab === 'mcp' || currentTab === 'knowledge',
        },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        {
          id: 'activity' as NavTab,
          label: 'Live Activity Stream',
          icon: <Activity size={17} />,
          isActive: currentTab === 'activity' || currentTab === 'audit',
        },
        {
          id: 'environment' as NavTab,
          label: 'System Health',
          icon: <Server size={17} />,
          badge: 'Healthy',
          badgeColor: '#10B981',
          isActive: currentTab === 'environment' || currentTab === 'system-health',
        },
        {
          id: 'security' as NavTab,
          label: 'Security & Air-Gap',
          icon: <Lock size={17} />,
          isActive: currentTab === 'security' || currentTab === 'capabilities',
        },
        {
          id: 'workspaces' as NavTab,
          label: 'Files & Workspace',
          icon: <Monitor size={17} />,
          isActive: currentTab === 'workspaces' || currentTab === 'files',
        },
        {
          id: 'settings' as NavTab,
          label: 'Settings',
          icon: <Settings size={17} />,
          isActive: currentTab === 'settings',
        },
      ],
    },
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
      <aside
        className={`sidebar ${mobileOpen ? 'mobile-open' : ''} ${isCollapsed ? 'collapsed' : ''} ${isHovered && isCollapsed ? 'sidebar-hover-expanded' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Brand Header */}
        <div
          className="sidebar-header"
          style={{
            padding: isEffectiveCollapsed ? '14px 6px' : '16px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isEffectiveCollapsed ? 'center' : 'space-between',
            flexDirection: isEffectiveCollapsed ? 'column' : 'row',
            gap: isEffectiveCollapsed ? '8px' : '10px',
            borderBottom: '1px solid rgba(212, 168, 55, 0.15)',
          }}
        >
          <div
            onClick={() => handleSelectTab('home')}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            title="HṚṢĪKEŚA Command Center"
          >
            <IndianEmblem size={isEffectiveCollapsed ? 34 : 38} showText={!isEffectiveCollapsed} variant="crest" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={handleToggleCollapse}
              className="sidebar-collapse-btn"
              title={isCollapsed ? 'Expand Sidebar (Ctrl+B)' : 'Collapse Sidebar (Ctrl+B)'}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>

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
        </div>

        {/* Categorized Navigation List */}
        <nav
          style={{
            padding: isEffectiveCollapsed ? '10px 6px' : '12px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            flex: 1,
            overflowY: 'auto',
          }}
        >
          {navSections.map((sec) => (
            <div key={sec.title} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {!isEffectiveCollapsed && (
                <span
                  style={{
                    fontSize: '10px',
                    fontFamily: 'var(--font-cinzel)',
                    fontWeight: 700,
                    letterSpacing: '1.2px',
                    color: 'var(--text-muted)',
                    padding: '4px 10px',
                    textTransform: 'uppercase',
                  }}
                >
                  {sec.title}
                </span>
              )}
              {sec.items.map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${item.isActive ? 'active' : ''}`}
                  onClick={() => handleSelectTab(item.id)}
                  style={{ width: '100%', position: 'relative' }}
                  title={isEffectiveCollapsed ? `${item.label}${item.badge !== undefined ? ` • ${item.badge}` : ''}` : undefined}
                >
                  <span className="nav-item-icon">{item.icon}</span>
                  {!isEffectiveCollapsed && <span style={{ flex: 1, textAlign: 'left', fontSize: '13px' }}>{item.label}</span>}
                  {!isEffectiveCollapsed && item.badge !== undefined && (
                    <span
                      className="nav-badge"
                      style={{
                        background: item.badgeColor ? `${item.badgeColor}22` : undefined,
                        color: item.badgeColor || undefined,
                        borderColor: item.badgeColor ? `${item.badgeColor}55` : undefined,
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isEffectiveCollapsed && item.badge !== undefined && (
                    <span className="nav-badge-dot" title={String(item.badge)} />
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* System Status Footer (Section 5 of Spec) */}
        <div
          style={{
            padding: isEffectiveCollapsed ? '10px 4px' : '14px 16px',
            borderTop: '1px solid rgba(212, 168, 55, 0.18)',
            background: 'rgba(14, 8, 4, 0.85)',
            fontSize: '11px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10B981', fontWeight: 700 }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981' }} />
            {!isEffectiveCollapsed && <span>HṚṢĪKEŚA ONLINE</span>}
          </div>
          {!isEffectiveCollapsed && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '10.5px' }}>
              <span>{totalAgentsCount} CORE AGENTS</span>
              <span style={{ color: 'var(--accent-teal)' }}>LOCAL-FIRST</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
