import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  AlertTriangle,
  Home,
  Building2,
  Users,
  Network,
  MessageSquare,
  Target,
  CheckSquare,
  Code,
  Terminal,
  GitBranch,
  Github,
  Share2,
  Compass,
  Zap,
  Server,
  Wrench,
  Cpu,
  Globe,
  Database,
  Monitor,
  Sparkles,
  Key,
  Palette,
  RefreshCw,
  ShieldAlert,
  Activity,
  Layers,
  Settings,
  ArrowRight,
  Command,
  LucideIcon,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { NavTab } from './Sidebar';
import { VoiceStatusResponse } from '../types/api.types';
import { IndianEmblem } from './IndianEmblem';

export interface SearchDestination {
  id: NavTab;
  label: string;
  category: 'Core Workspaces' | 'Autonomous Workforce' | 'Engineering & Code' | 'Knowledge & Intel' | 'Infrastructure & Safety';
  keywords: string[];
  description: string;
  icon: LucideIcon;
}

const SEARCH_DESTINATIONS: SearchDestination[] = [
  {
    id: 'home',
    label: 'Command Center',
    category: 'Core Workspaces',
    keywords: ['home', 'dashboard', 'overview', 'kpi', 'status', 'metrics'],
    description: 'System health, real-time KPI metrics & sovereign command overview',
    icon: Home,
  },
  {
    id: 'office',
    label: 'Virtual Office (3D)',
    category: 'Core Workspaces',
    keywords: ['office', 'virtual', '3d', 'desks', 'rooms', 'agents office', 'tickets', 'feed', 'routines'],
    description: '3D Isometric multi-agent desks, routines, tickets & live workflow feed',
    icon: Building2,
  },
  {
    id: 'agents',
    label: 'Agents Roster',
    category: 'Autonomous Workforce',
    keywords: ['agents', 'workforce', 'roster', 'bots', 'personas', 'autonomy', 'staff'],
    description: 'Autonomous multi-agent roster, capabilities & autonomy governance',
    icon: Users,
  },
  {
    id: 'agent-town',
    label: 'Agent Town 3D',
    category: 'Autonomous Workforce',
    keywords: ['town', 'simulation', 'agent town', 'virtual space', 'game', '3d town'],
    description: '3D autonomous virtual simulation & agent community space',
    icon: Network,
  },
  {
    id: 'council-chat',
    label: 'Specialist Council',
    category: 'Autonomous Workforce',
    keywords: ['council', 'debate', 'deliberation', 'multi agent chat', 'meeting'],
    description: 'Multi-agent deliberative council & collaborative strategic debate',
    icon: Users,
  },
  {
    id: 'chat',
    label: 'Chat Intelligence',
    category: 'Core Workspaces',
    keywords: ['chat', 'conversation', 'assistant', 'prompt', 'talk', 'ai chat'],
    description: 'Direct conversational intelligence with HṚṢĪKEŚA sovereign core',
    icon: MessageSquare,
  },
  {
    id: 'companies',
    label: 'Companies Portfolio',
    category: 'Core Workspaces',
    keywords: ['companies', 'business', 'corporate', 'enterprises', 'portfolio', 'revenue'],
    description: 'Corporate entities, business operations & enterprise portfolio',
    icon: Building2,
  },
  {
    id: 'missions',
    label: 'Projects & Missions',
    category: 'Core Workspaces',
    keywords: ['projects', 'missions', 'goals', 'initiatives', 'targets', 'roadmap'],
    description: 'Autonomous goal execution, project orchestration & milestones',
    icon: Target,
  },
  {
    id: 'organization',
    label: 'Organization & Mandala',
    category: 'Autonomous Workforce',
    keywords: ['organization', 'mandala', '33 agents', 'vedic', 'hierarchy', 'adityas', 'rudras', 'vasus', 'indra', 'prajapati'],
    description: 'Concentric mandala visualization & 33-agent workforce structure',
    icon: Network,
  },
  {
    id: 'decisions',
    label: 'Decisions Center',
    category: 'Knowledge & Intel',
    keywords: ['decisions', 'rationale', 'confidence', 'why', 'evidence', 'postponed', 'approved'],
    description: 'Explainable AI decision log, agent consensus & confidence metrics',
    icon: Sparkles,
  },
  {
    id: 'attention',
    label: 'Attention Center',
    category: 'Core Workspaces',
    keywords: ['attention', 'needs you', 'blocked', 'approval', 'critical', 'alerts'],
    description: 'Critical items requiring human sign-off and immediate attention',
    icon: AlertTriangle,
  },
  {
    id: 'activity',
    label: 'Live Activity Stream',
    category: 'Core Workspaces',
    keywords: ['activity', 'stream', 'events', 'live', 'telemetry', 'actions', 'recent'],
    description: 'Unified real-time event stream across all 33 agents & missions',
    icon: Activity,
  },
  {
    id: 'automations',
    label: 'Automations & Processes',
    category: 'Core Workspaces',
    keywords: ['automations', 'recurring', 'schedules', 'cron', 'watchers', 'routines'],
    description: 'Autonomous scheduled workflows, competitor watch & recurring jobs',
    icon: RefreshCw,
  },
  {
    id: 'projects',
    label: 'Projects & Context',
    category: 'Core Workspaces',
    keywords: ['projects', 'codebase', 'milestones', 'repo', 'files', 'context'],
    description: 'Persistent workspace contexts, milestones, decisions & files',
    icon: CheckSquare,
  },
  {
    id: 'work',
    label: 'Mission Control',
    category: 'Core Workspaces',
    keywords: ['work', 'mission control', 'active jobs', 'execution', 'pipeline'],
    description: 'Active task execution, multi-agent pipeline monitoring & output review',
    icon: CheckSquare,
  },
  {
    id: 'ide',
    label: 'Universal IDE',
    category: 'Engineering & Code',
    keywords: ['ide', 'editor', 'code', 'vscode', 'files', 'workspace', 'terminal', 'coding'],
    description: 'Full-featured sovereign cloud IDE, code editor, workspace tree & terminal',
    icon: Code,
  },
  {
    id: 'engineering',
    label: 'Autonomous Engineering',
    category: 'Engineering & Code',
    keywords: ['engineering', 'autonomous coding', 'developer', 'repair', 'swe', 'git engine'],
    description: 'Autonomous software engineering agents, self-healing code & git workflows',
    icon: Terminal,
  },
  {
    id: 'workflows',
    label: 'Universal Workflows',
    category: 'Engineering & Code',
    keywords: ['workflows', 'dag', 'nodes', 'automation', 'flow', 'pipeline builder'],
    description: 'Visual node-based deterministic workflow builder & DAG orchestration',
    icon: GitBranch,
  },
  {
    id: 'github',
    label: 'GitHub Intelligence',
    category: 'Engineering & Code',
    keywords: ['github', 'git', 'repo', 'commits', 'pr', 'pull request', 'issues'],
    description: 'Repository synchronization, automated pull requests & issue tracking',
    icon: Github,
  },
  {
    id: 'knowledge',
    label: 'Knowledge Vault',
    category: 'Knowledge & Intel',
    keywords: ['knowledge', 'vault', 'rag', 'documents', 'vector', 'database', 'memory graph'],
    description: 'RAG vector database, knowledge graphs, documents & sovereign memories',
    icon: Share2,
  },
  {
    id: 'research',
    label: 'Research Engine',
    category: 'Knowledge & Intel',
    keywords: ['research', 'web search', 'intelligence', 'synthesis', 'competitor', 'market scan'],
    description: 'Deep automated web research, market scans & competitive intelligence',
    icon: Compass,
  },
  {
    id: 'skills',
    label: 'Skills & Procedures',
    category: 'Knowledge & Intel',
    keywords: ['skills', 'procedures', 'sop', 'cheatsheets', 'capabilities', 'playbook'],
    description: 'Custom agent skills, execution SOPs, cheatsheets & procedures',
    icon: Zap,
  },
  {
    id: 'mcp',
    label: 'MCP Ecosystem',
    category: 'Knowledge & Intel',
    keywords: ['mcp', 'model context protocol', 'servers', 'tools', 'connectors', 'protocol'],
    description: 'Model Context Protocol servers, tool connections & external hubs',
    icon: Server,
  },
  {
    id: 'tools',
    label: 'Tool Registry',
    category: 'Infrastructure & Safety',
    keywords: ['tools', 'registry', 'execution', 'governance', 'shell', 'api tools'],
    description: 'Governed tool bus, hardware levers, system execution & shell actions',
    icon: Wrench,
  },
  {
    id: 'tasks',
    label: 'Task Board',
    category: 'Core Workspaces',
    keywords: ['tasks', 'board', 'kanban', 'backlog', 'todo', 'tickets'],
    description: 'Task management, ticket backlog, work states & task dispatching',
    icon: CheckSquare,
  },
  {
    id: 'models',
    label: 'AI Models & Fleet',
    category: 'Infrastructure & Safety',
    keywords: ['models', 'llm', 'fleet', 'groq', 'nvidia', 'gemini', 'openrouter', 'ollama', 'tokens'],
    description: 'Connected AI model fleet (Groq LPU, Gemini 2.5, NVIDIA NIM, Ollama)',
    icon: Cpu,
  },
  {
    id: 'integrations',
    label: 'Integrations & APIs',
    category: 'Infrastructure & Safety',
    keywords: ['integrations', 'api keys', 'openrouter', 'groq', 'nvidia', 'google ai', 'quota', 'tokens'],
    description: 'Connected API services, token usage trackers & renewal monitors',
    icon: Globe,
  },
  {
    id: 'memory',
    label: 'Memory Tiers',
    category: 'Knowledge & Intel',
    keywords: ['memory', 'tiers', 'episodic', 'semantic', 'scratchpad', 'long term'],
    description: 'Tier-1 scratch, Tier-2 semantic, Tier-3 episodic & long-term persistence',
    icon: Database,
  },
  {
    id: 'computer',
    label: 'Computer Operator',
    category: 'Autonomous Workforce',
    keywords: ['computer', 'desktop', 'operator', 'os control', 'mouse', 'browser', 'gui'],
    description: 'Autonomous OS desktop control, browser automation & GUI actions',
    icon: Monitor,
  },
  {
    id: 'multimodal',
    label: 'Multimodal Vision',
    category: 'Engineering & Code',
    keywords: ['vision', 'multimodal', 'images', 'graphics', 'canvas', 'rendering'],
    description: 'Image generation, visual inspection, diagrams & artifact rendering',
    icon: Sparkles,
  },
  {
    id: 'accounts',
    label: 'Service Accounts',
    category: 'Infrastructure & Safety',
    keywords: ['accounts', 'service accounts', 'fp12', 'credentials', 'vault', 'tokens', 'oauth'],
    description: 'Credential vault, OAuth accounts, rotation & health monitoring',
    icon: Key,
  },
  {
    id: 'workspaces',
    label: 'Digital Workspaces',
    category: 'Infrastructure & Safety',
    keywords: ['workspaces', 'digital workspaces', 'fp13', 'environments', 'sandbox', 'vms'],
    description: 'Isolated workspace environments, sandbox runtime & virtualization',
    icon: Monitor,
  },
  {
    id: 'ecosystem',
    label: 'Ecosystem & Market',
    category: 'Infrastructure & Safety',
    keywords: ['ecosystem', 'fp15', 'marketplace', 'plugins', 'extensions', 'addons'],
    description: 'Third-party plugins, extensions, MCP nodes & bridge marketplace',
    icon: Globe,
  },
  {
    id: 'creation',
    label: 'Creation Studio',
    category: 'Engineering & Code',
    keywords: ['creation', 'studio', 'fp17', 'design', 'media', 'creative', 'assets'],
    description: 'Asset generation, design studio, audio/video pipelines & branding',
    icon: Palette,
  },
  {
    id: 'persistent-ops',
    label: 'Persistent Operations',
    category: 'Infrastructure & Safety',
    keywords: ['persistent', 'operations', 'fp19', '247', 'daemons', 'cron', 'background', 'heartbeat'],
    description: '24/7 background cron schedules, daemon monitoring & heartbeat health',
    icon: Cpu,
  },
  {
    id: 'evolution',
    label: 'Self-Evolution Engine',
    category: 'Autonomous Workforce',
    keywords: ['evolution', 'learning', 'self improvement', 'fine tuning', 'optimization'],
    description: 'Continuous self-improvement, model fine-tuning & feedback learning',
    icon: RefreshCw,
  },
  {
    id: 'approvals',
    label: 'Approvals & Guardrails',
    category: 'Infrastructure & Safety',
    keywords: ['approvals', 'guardrails', 'human in the loop', 'safety', 'security', 'permission'],
    description: 'Human-in-the-loop authorization, safety guardrails & sign-offs',
    icon: ShieldAlert,
  },
  {
    id: 'audit',
    label: 'Audit Trail',
    category: 'Infrastructure & Safety',
    keywords: ['audit', 'logs', 'trail', 'ledger', 'history', 'security logs'],
    description: 'Cryptographic event ledger, action verification & system history',
    icon: Activity,
  },
  {
    id: 'environment',
    label: 'System Resource Monitor',
    category: 'Infrastructure & Safety',
    keywords: ['environment', 'resources', 'hardware', 'cpu', 'gpu', 'ram', 'vram', 'governor'],
    description: 'Hardware resource governor (CPU, GPU, RAM, VRAM, NVMe telemetry)',
    icon: Layers,
  },
  {
    id: 'settings',
    label: 'Settings & Identity',
    category: 'Infrastructure & Safety',
    keywords: ['settings', 'config', 'theme', 'appearance', 'identity', 'profile', 'keys'],
    description: 'Global system configurations, themes, security & identity',
    icon: Settings,
  },
];

interface TopBarProps {
  systemOnline: boolean;
  degradedSubsystems?: string[];
  activeMissionCount: number;
  activeGoalCount?: number;
  pendingApprovalsCount: number;
  voiceStatus?: VoiceStatusResponse;
  theme?: string;
  onSetTheme?: (theme: string) => void;
  onOpenApprovals: () => void;
  onNavigate?: (tab: NavTab) => void;
  onSearchPrompt?: (query: string) => void;
  mobileNavOpen?: boolean;
  onToggleMobileNav?: () => void;
  sidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  systemOnline,
  degradedSubsystems = [],
  activeMissionCount,
  activeGoalCount = 0,
  pendingApprovalsCount,
  onOpenApprovals,
  onNavigate,
  onSearchPrompt,
  mobileNavOpen,
  onToggleMobileNav,
  sidebarCollapsed = false,
  onToggleSidebarCollapse,
}) => {
  const [searchVal, setSearchVal] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isWorking = activeMissionCount > 0 || activeGoalCount > 0;
  const isWaitingApproval = pendingApprovalsCount > 0;

  // Filter items matching query
  const filteredDestinations = React.useMemo(() => {
    const q = searchVal.trim().toLowerCase();
    if (!q) {
      return SEARCH_DESTINATIONS.slice(0, 8); // show top popular items on empty focus
    }
    return SEARCH_DESTINATIONS.filter((d) => {
      if (d.label.toLowerCase().includes(q)) return true;
      if (d.category.toLowerCase().includes(q)) return true;
      if (d.description.toLowerCase().includes(q)) return true;
      return d.keywords.some((kw) => kw.toLowerCase().includes(q));
    });
  }, [searchVal]);

  const totalOptions = filteredDestinations.length + (searchVal.trim() ? 1 : 0); // +1 for "Ask AI"

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (destination: SearchDestination) => {
    if (onNavigate) {
      onNavigate(destination.id);
    }
    setIsOpen(false);
    setSearchVal('');
  };

  const handleAskAI = (promptText: string) => {
    if (onSearchPrompt) {
      onSearchPrompt(promptText);
    } else if (onNavigate) {
      onNavigate('chat');
    }
    setIsOpen(false);
    setSearchVal('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, totalOptions));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + totalOptions) % Math.max(1, totalOptions));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex < filteredDestinations.length) {
        handleSelect(filteredDestinations[selectedIndex]);
      } else if (searchVal.trim()) {
        handleAskAI(searchVal.trim());
      }
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Mobile Sidebar Hamburger Toggle */}
        <button
          className="topbar-mobile-toggle btn-icon"
          onClick={onToggleMobileNav}
          aria-label="Toggle navigation drawer"
          style={{
            background: 'rgba(212, 168, 55, 0.12)',
            border: '1px solid rgba(212, 168, 55, 0.35)',
            borderRadius: '6px',
            padding: '5px',
            color: 'var(--text-gold)',
            cursor: 'pointer',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Menu size={18} />
        </button>

        {/* Desktop Sidebar Collapse Toggle */}
        {onToggleSidebarCollapse && (
          <button
            className="sidebar-collapse-btn topbar-desktop-toggle"
            onClick={onToggleSidebarCollapse}
            title={sidebarCollapsed ? 'Expand Sidebar (Ctrl+B)' : 'Collapse Sidebar (Ctrl+B)'}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{
              padding: '5px',
            }}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        )}

        {/* Sanskrit Title Tag with Sacred Brand Emblem - only shown when sidebar is collapsed or on mobile */}
        <div
          className={`topbar-brand-section ${sidebarCollapsed ? 'show-collapsed' : 'hide-desktop-expanded'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <IndianEmblem size={26} showText={false} variant="crest" />
          <span
            style={{
              fontSize: '14.5px',
              fontWeight: 800,
              fontFamily: 'var(--font-cinzel)',
              letterSpacing: '1.5px',
              color: 'var(--text-gold)',
              whiteSpace: 'nowrap',
            }}
          >
            HṚṢĪKEŚA
          </span>
        </div>

        {/* Approvals Alert Notification Button if pending */}
        {pendingApprovalsCount > 0 && (
          <button
            onClick={onOpenApprovals}
            className="btn btn-primary"
            style={{
              padding: '3px 10px',
              fontSize: '11px',
              height: '26px',
            }}
          >
            <AlertTriangle size={12} />
            <span>{pendingApprovalsCount} Action{pendingApprovalsCount > 1 ? 's' : ''} to Approve</span>
          </button>
        )}
      </div>

      {/* Center: Universal Command & Navigation Palette */}
      <div
        ref={containerRef}
        className="topbar-center"
        style={{ flex: 1, maxWidth: '460px', margin: '0 auto', position: 'relative' }}
      >
        <div style={{ width: '100%', position: 'relative' }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--accent-gold)',
              pointerEvents: 'none',
            }}
          />
          <input
            ref={inputRef}
            type="text"
            placeholder="Jump to any screen or module... (e.g. office, ide, models)"
            value={searchVal}
            onChange={(e) => {
              setSearchVal(e.target.value);
              setIsOpen(true);
              setSelectedIndex(0);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              padding: '6px 36px 6px 34px',
              background: 'rgba(20, 14, 8, 0.88)',
              border: isOpen ? '1px solid var(--accent-gold)' : '1px solid rgba(212, 168, 55, 0.35)',
              borderRadius: '20px',
              color: 'var(--text-primary)',
              fontSize: '12px',
              outline: 'none',
              boxShadow: isOpen
                ? '0 0 16px rgba(212, 175, 55, 0.25), inset 0 1px 3px rgba(0,0,0,0.6)'
                : 'inset 0 1px 3px rgba(0,0,0,0.5)',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            }}
          />
          <span
            onClick={() => {
              setIsOpen(true);
              inputRef.current?.focus();
            }}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '10px',
              color: 'var(--accent-gold)',
              background: 'rgba(212, 175, 55, 0.12)',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              padding: '1px 5px',
              borderRadius: '4px',
              fontFamily: 'monospace',
              cursor: 'pointer',
            }}
          >
            {typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? '⌘K' : 'Ctrl K'}
          </span>
        </div>

        {/* Universal Navigation Dropdown Palette */}
        {isOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              right: 0,
              background: 'rgba(14, 11, 8, 0.96)',
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
              border: '1px solid rgba(212, 175, 55, 0.35)',
              borderRadius: '12px',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.8), 0 0 24px rgba(212, 175, 55, 0.15)',
              overflow: 'hidden',
              zIndex: 1000,
              maxHeight: '420px',
              display: 'flex',
              flexDirection: 'column',
              animation: 'paletteIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Header info */}
            <div
              style={{
                padding: '8px 14px',
                background: 'rgba(212, 175, 55, 0.06)',
                borderBottom: '1px solid rgba(212, 175, 55, 0.18)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '11px',
                color: 'var(--accent-gold)',
                fontWeight: 600,
                letterSpacing: '0.5px',
              }}
            >
              <span>{searchVal.trim() ? `SEARCH RESULTS (${filteredDestinations.length})` : 'QUICK NAVIGATION'}</span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>↑↓ to navigate · ↵ to jump · Esc to close</span>
            </div>

            {/* Results list */}
            <div
              style={{
                overflowY: 'auto',
                padding: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              {filteredDestinations.length === 0 && !searchVal.trim() && (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                  Type a destination name or keyword to navigate...
                </div>
              )}

              {filteredDestinations.map((dest, idx) => {
                const isSelected = selectedIndex === idx;
                const IconComp = dest.icon;
                return (
                  <div
                    key={dest.id}
                    onClick={() => handleSelect(dest)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: isSelected ? 'rgba(212, 175, 55, 0.16)' : 'transparent',
                      border: isSelected ? '1px solid rgba(212, 175, 55, 0.4)' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        background: isSelected ? 'var(--accent-gold)' : 'rgba(212, 175, 55, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isSelected ? '#0A0908' : 'var(--accent-gold)',
                        flexShrink: 0,
                      }}
                    >
                      <IconComp size={15} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span
                          style={{
                            fontSize: '12.5px',
                            fontWeight: 700,
                            color: isSelected ? 'var(--text-gold-bright)' : 'var(--text-primary)',
                          }}
                        >
                          {dest.label}
                        </span>
                        <span
                          style={{
                            fontSize: '9.5px',
                            fontWeight: 600,
                            letterSpacing: '0.5px',
                            color: 'var(--text-muted)',
                            background: 'rgba(255, 255, 255, 0.04)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                          }}
                        >
                          {dest.category}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {dest.description}
                      </span>
                    </div>

                    <ArrowRight
                      size={13}
                      style={{
                        color: isSelected ? 'var(--accent-gold)' : 'transparent',
                        transform: isSelected ? 'translateX(0)' : 'translateX(-4px)',
                        transition: 'all 0.15s ease',
                        flexShrink: 0,
                      }}
                    />
                  </div>
                );
              })}

              {/* Dedicated Ask AI Option if query entered */}
              {searchVal.trim() && (
                <div
                  onClick={() => handleAskAI(searchVal.trim())}
                  onMouseEnter={() => setSelectedIndex(filteredDestinations.length)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '9px 12px',
                    marginTop: '4px',
                    borderRadius: '8px',
                    background: selectedIndex === filteredDestinations.length ? 'rgba(0, 229, 153, 0.16)' : 'rgba(0, 229, 153, 0.06)',
                    border: selectedIndex === filteredDestinations.length ? '1px solid rgba(0, 229, 153, 0.5)' : '1px dashed rgba(0, 229, 153, 0.3)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      background: '#00E599',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#0A0908',
                      flexShrink: 0,
                      fontWeight: 800,
                    }}
                  >
                    ⚡
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#00E599' }}>
                      Ask HṚṢĪKEŚA AI Core
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      Send prompt: "{searchVal.trim()}"
                    </span>
                  </div>
                  <span style={{ fontSize: '10.5px', color: '#00E599', fontWeight: 600 }}>Chat ↵</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Truthful Subsystem Status Pill */}
        <span
          className={`badge ${
            !systemOnline
              ? 'badge-warning'
              : degradedSubsystems.length > 0
              ? 'badge-warning'
              : isWaitingApproval
              ? 'badge-warning'
              : isWorking
              ? 'badge-running'
              : 'badge-online'
          }`}
          style={{ fontSize: '11px', padding: '3px 9px', cursor: degradedSubsystems.length > 0 ? 'help' : 'default' }}
          title={
            !systemOnline
              ? 'Backend sovereign server offline'
              : degradedSubsystems.length > 0
              ? `Degraded subsystems: ${degradedSubsystems.join(', ')}`
              : 'All core systems nominal & operational'
          }
        >
          ● {!systemOnline
            ? 'Offline'
            : degradedSubsystems.length > 0
            ? `Core Online (${degradedSubsystems.length} Degraded)`
            : isWorking
            ? 'Executing'
            : 'Online'}
        </span>

        {/* Master User Profile: Sovereign Authority */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '9px',
            padding: '4px 10px',
            borderRadius: '20px',
            background: 'linear-gradient(90deg, rgba(34, 20, 10, 0.9) 0%, rgba(20, 12, 5, 0.9) 100%)',
            border: '1px solid rgba(212, 168, 55, 0.4)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
          }}
        >
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-saffron), var(--accent-gold))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0F0D0A',
              fontWeight: 800,
              fontSize: '11.5px',
              boxShadow: '0 0 8px rgba(245, 200, 66, 0.4)',
            }}
          >
            R
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>
              Rushikesh
            </span>
            <span style={{ fontSize: '9.5px', color: 'var(--accent-gold)', letterSpacing: '0.4px', fontWeight: 500 }}>
              Sovereign Authority
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
