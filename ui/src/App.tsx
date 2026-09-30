import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { BottomBar } from './components/BottomBar';
import { CommandCenter } from './views/CommandCenter';
import { HomeView } from './views/HomeView';
import { AnimationService } from './services/animation.service';
import { ChatView } from './views/ChatView';
import { WorkView } from './views/WorkView';
import { ComputerView } from './views/ComputerView';
import { ComputerOperatorView } from './views/ComputerOperatorView';
import { AgentTown } from './views/AgentTown';
import { AgentsView } from './views/AgentsView';
import { MissionsView } from './views/MissionsView';
import { MissionControlView } from './views/MissionControlView';
import { TasksView } from './views/TasksView';
import { ToolsView } from './views/ToolsView';
import { ApprovalsView } from './views/ApprovalsView';
import { MemoryView } from './views/MemoryView';
import { EnvironmentView } from './views/EnvironmentView';
import { ModelsView } from './views/ModelsView';
import { AuditView } from './views/AuditView';
import { SettingsView } from './views/SettingsView';
import { CompaniesView } from './views/CompaniesView';
import { GoalsView } from './views/GoalsView';
import { ResearchView } from './views/ResearchView';
import { KnowledgeView } from './views/KnowledgeView';
import { SkillsView } from './views/SkillsView';
import { MCPView } from './views/MCPView';
import { MultimodalView } from './views/MultimodalView';
import { SelfImprovementView } from './views/SelfImprovementView';
import { IntegrationsView } from './views/IntegrationsView';
import { CouncilChatView } from './views/CouncilChatView';
import { WorkersView } from './views/WorkersView';
import { CapabilityCenter } from './views/CapabilityCenter';
import { GitHubIntelligenceCenter } from './views/GitHubIntelligenceCenter';
import { UniversalIDEView } from './views/UniversalIDEView';
import { AutonomousEngineeringView } from './views/AutonomousEngineeringView';
import { WorkflowEngineView } from './views/WorkflowEngineView';
import { AccountsView } from './views/AccountsView';
import { DigitalWorkspaceView } from './views/DigitalWorkspaceView';
import { EcosystemView } from './views/EcosystemView';
import { CreationStudioView } from './views/CreationStudioView';
import { PersistentOperationsView } from './views/PersistentOperationsView';
import { EvolutionMonitorView } from './views/EvolutionMonitorView';
import { VirtualOfficeView } from './views/VirtualOfficeView';
import { OrganizationView } from './views/OrganizationView';
import { DecisionsView } from './views/DecisionsView';
import { AttentionView } from './views/AttentionView';
import { ActivityView } from './views/ActivityView';
import { AutomationsView } from './views/AutomationsView';

import {
  HealthResponse,
  SystemStatusResponse,
  AgentInfo,
  MissionInfo,
  TaskInfo,
  ToolInfo,
  ApprovalRequest,
  MemoryTierItem,
  EnvironmentStatusResponse,
  VoiceStatusResponse,
  ModelProviderInfo,
  AuditRecord,
  ChatMessage,
  GoalInfo,
} from './types/api.types';
import { api } from './services/api';

const VALID_TABS: NavTab[] = [
  'home', 'command-center', 'chat', 'council-chat', 'work', 'goals', 'projects', 'missions', 'attention', 'research', 'knowledge',
  'agent-town', 'agents', 'organization', 'decisions', 'activity', 'automations', 'office', 'tasks', 'tools', 'approvals', 'memory', 'computer', 'multimodal',
  'environment', 'system-health', 'security', 'models', 'integrations', 'capabilities', 'audit', 'settings', 'companies', 'skills', 'mcp', 'self-improvement', 'workers', 'github', 'ide', 'engineering', 'workflows', 'accounts', 'workspaces', 'files', 'ecosystem', 'creation', 'persistent-ops', 'evolution'
];

export const App: React.FC = () => {
  const [currentTab, setCurrentTabState] = useState<NavTab>(() => {
    const hash = window.location.hash.replace(/^#\/?/, '') as NavTab;
    if (VALID_TABS.includes(hash)) return hash;
    const saved = localStorage.getItem('hrisekesa_tab') as NavTab;
    if (saved && VALID_TABS.includes(saved)) return saved;
    return 'home';
  });

  const setCurrentTab = useCallback((tab: NavTab) => {
    setCurrentTabState(tab);
    window.location.hash = tab;
    localStorage.setItem('hrisekesa_tab', tab);
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '') as NavTab;
      if (VALID_TABS.includes(hash)) {
        setCurrentTabState(hash);
        localStorage.setItem('hrisekesa_tab', hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const [systemOnline, setSystemOnline] = useState<boolean>(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('hrisekesa_sidebar_collapsed') === 'true';
  });
  const [degradedSubsystems, setDegradedSubsystems] = useState<string[]>([]);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('hrisekesa_sidebar_collapsed', String(next));
      return next;
    });
  }, []);

  // Global Ctrl+B / Cmd+B keyboard shortcut to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
          return; // Allow native bolding in text inputs
        }
        e.preventDefault();
        toggleSidebarCollapsed();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebarCollapsed]);

  // Theme State: 'cosmic' | 'mahabharata' | 'shiva' | 'surya' | 'light'
  const [theme, setTheme] = useState<string>(() => {
    const saved = localStorage.getItem('hrisekesa_theme');
    if (saved && ['cosmic', 'mahabharata', 'shiva', 'surya', 'light', 'dark'].includes(saved)) {
      return saved === 'dark' ? 'cosmic' : saved;
    }
    return 'cosmic';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('hrisekesa_theme', theme);
  }, [theme]);

  const contentAreaRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (contentAreaRef.current) {
      AnimationService.animateViewEnter(contentAreaRef.current);
    }
  }, [currentTab]);

  // Core Data States
  const [health, setHealth] = useState<HealthResponse | undefined>();
  const [status, setStatus] = useState<SystemStatusResponse | undefined>();
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [missions, setMissions] = useState<MissionInfo[]>([]);
  const [goals, setGoals] = useState<GoalInfo[]>([]);
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [memoryItems, setMemoryItems] = useState<MemoryTierItem[]>([]);
  const [envStatus, setEnvStatus] = useState<EnvironmentStatusResponse | undefined>();
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatusResponse | undefined>();
  const [models, setModels] = useState<ModelProviderInfo[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>([]);
  const [companiesCount, setCompaniesCount] = useState<number>(0);
  const [knowledgeCount, setKnowledgeCount] = useState<number>(0);

  // Chat State
  const [sessionId, setSessionId] = useState<string>(`session-${Date.now()}`);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      role: 'assistant',
      content:
        'HṚṢĪKEŚA Sovereign Control Plane online. Multi-agent workforce and governed tool bus active. How may I serve you, Master Rushikesh?',
      timestamp: new Date().toISOString(),
    },
  ]);

  const [projectsCount, setProjectsCount] = useState<number>(0);

  const loadAllData = useCallback(async () => {
    try {
      const [
        healthRes,
        statusRes,
        agentsRes,
        missionsRes,
        goalsRes,
        tasksRes,
        toolsRes,
        approvalsRes,
        memoryRes,
        envRes,
        voiceRes,
        modelsRes,
        auditRes,
        companiesRes,
        knowledgeRes,
        projectsRes,
      ] = await Promise.allSettled([
        api.getHealth(),
        api.getStatus(),
        api.getAgents(),
        api.getMissions(),
        api.getGoals(),
        api.getTasks(),
        api.getTools(),
        api.getApprovals(),
        api.getMemory(),
        api.getEnvironmentStatus(),
        api.getVoiceStatus(),
        api.getModels(),
        api.getAudit(),
        api.getCompanies(),
        api.getKnowledgeEntities(),
        api.getProjects(),
      ]);

      const degraded: string[] = [];
      let isHealthy = false;
      if (healthRes.status === 'fulfilled' && healthRes.value) {
        setHealth(healthRes.value);
        isHealthy = healthRes.value.status === 'ok' || healthRes.value.lifecycleState === 'READY';
        if (healthRes.value.degradedReason) {
          degraded.push(healthRes.value.degradedReason);
        }
      } else {
        degraded.push('Kernel Health API');
      }

      if (statusRes.status === 'fulfilled') {
        setStatus(statusRes.value);
      } else {
        degraded.push('Status API');
      }

      if (agentsRes.status === 'fulfilled') {
        setAgents(agentsRes.value.agents || []);
      } else {
        degraded.push('Agents Registry');
      }

      if (missionsRes.status === 'fulfilled') {
        setMissions(missionsRes.value.missions || []);
      } else {
        degraded.push('Missions Subsystem');
      }

      if (goalsRes.status === 'fulfilled') {
        setGoals(goalsRes.value.goals || []);
      } else {
        degraded.push('Goals Subsystem');
      }

      if (tasksRes.status === 'fulfilled') {
        setTasks(tasksRes.value.tasks || []);
      } else {
        degraded.push('Task Board');
      }

      if (toolsRes.status === 'fulfilled') {
        setTools(toolsRes.value.tools || []);
      } else {
        degraded.push('Tool Bus');
      }

      if (approvalsRes.status === 'fulfilled') {
        setApprovals(approvalsRes.value.approvals || []);
      } else {
        degraded.push('Approvals Engine');
      }

      if (memoryRes.status === 'fulfilled') {
        setMemoryItems(memoryRes.value.items || []);
      } else {
        degraded.push('Memory Subsystem');
      }

      if (envRes.status === 'fulfilled') {
        setEnvStatus(envRes.value);
      } else {
        degraded.push('Environment Monitor');
      }

      if (voiceRes.status === 'fulfilled') {
        setVoiceStatus(voiceRes.value);
      } else {
        degraded.push('Voice Pipeline');
      }

      if (modelsRes.status === 'fulfilled') {
        setModels(modelsRes.value.providers || []);
      } else {
        degraded.push('Models Registry');
      }

      if (auditRes.status === 'fulfilled') {
        setAuditLogs(auditRes.value.logs || []);
      } else {
        degraded.push('Audit Trail');
      }

      if (companiesRes.status === 'fulfilled') {
        setCompaniesCount(companiesRes.value.companies?.length || 0);
      } else {
        degraded.push('Company OS');
      }

      if (knowledgeRes.status === 'fulfilled') {
        setKnowledgeCount(knowledgeRes.value.entities?.length || 0);
      } else {
        degraded.push('Knowledge Graph');
      }

      if (projectsRes.status === 'fulfilled') {
        setProjectsCount(projectsRes.value.projects?.length || 0);
      } else {
        degraded.push('Projects');
      }

      setDegradedSubsystems(degraded);

      // System online is derived strictly from real /health response
      setSystemOnline(isHealthy);
    } catch (err) {
      console.error('Failed to load system data', err);
      setSystemOnline(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();

    // SSE Event Stream for live reactive updates
    const unsubscribe = api.subscribeEvents((event) => {
      if (event.type === 'AUDIT_RECORD' && event.payload) {
        setAuditLogs((prev) => [event.payload, ...prev]);
      } else if (event.type === 'APPROVAL_REQUEST') {
        loadAllData();
      } else if (
        event.type === 'AGENT_STATE' ||
        event.type === 'TASK_STATE' ||
        (typeof event.type === 'string' && (event.type.startsWith('goal.') || event.type.startsWith('milestone.')))
      ) {
        loadAllData();
      }
    });

    // Conservative polling for health & approvals every 10 seconds
    const interval = setInterval(() => {
      api
        .getHealth()
        .then((res) => {
          setHealth(res);
          setSystemOnline(res.status === 'ok' || res.lifecycleState === 'READY');
        })
        .catch(() => setSystemOnline(false));
      api.getApprovals().then((res) => setApprovals(res.approvals || [])).catch(() => {});
    }, 10000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [loadAllData]);

  const handleVoiceSynthesize = async (text: string) => {
    try {
      await api.synthesizeSpeech(text);
    } catch (err) {
      console.error('Speech synthesis error', err);
    }
  };

  // Seamless prompt handover from Home screen command box to Chat (streaming enabled)
  const handleStartPromptFromHome = (promptText: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: promptText,
      timestamp: new Date().toISOString(),
    };

    const astMsgId = `ast-${Date.now()}`;
    const initialAssistantMsg: ChatMessage = {
      id: astMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      streaming: true,
    };

    setMessages((prev) => [...prev, userMsg, initialAssistantMsg]);
    setCurrentTab('chat');

    api
      .streamChat(promptText, sessionId, undefined, undefined, (token) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === astMsgId ? { ...m, content: m.content + token } : m))
        );
      })
      .then((res) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === astMsgId
              ? {
                  ...m,
                  content: res.response || m.content,
                  model: res.model,
                  durationMs: res.durationMs,
                  streaming: false,
                }
              : m
          )
        );
      })
      .catch((err) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === astMsgId
              ? {
                  ...m,
                  content: `Something went wrong.\n\nWhat happened:\n${err.message || String(err)}`,
                  error: true,
                  streaming: false,
                }
              : m
          )
        );
      });
  };

  const pendingApprovalsCount = approvals.filter((a) => a.status === 'PENDING').length;
  const activeAgentsCount = agents.filter((a) => a.status === 'RUNNING').length;
  const activeMissionsCount = missions.filter((m) => m.status === 'RUNNING').length;
  const activeGoalsCount = goals.filter((g) => g.status === 'EXECUTING' || g.status === 'VERIFYING').length;

  return (
    <div className="app-container" data-theme={theme}>
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        pendingApprovalsCount={pendingApprovalsCount}
        activeAgentsCount={activeAgentsCount}
        totalAgentsCount={agents.length}
        activeGoalsCount={activeGoalsCount}
        activeMissionsCount={activeMissionsCount}
        companiesCount={companiesCount}
        projectsCount={projectsCount}
        knowledgeCount={knowledgeCount}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapsed}
      />

      <div className="main-wrapper">
        <TopBar
          systemOnline={systemOnline}
          degradedSubsystems={degradedSubsystems}
          activeMissionCount={activeMissionsCount}
          activeGoalCount={activeGoalsCount}
          pendingApprovalsCount={pendingApprovalsCount}
          onOpenApprovals={() => setCurrentTab('approvals')}
          onNavigate={setCurrentTab}
          onSearchPrompt={handleStartPromptFromHome}
          mobileNavOpen={mobileSidebarOpen}
          onToggleMobileNav={() => setMobileSidebarOpen((prev) => !prev)}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebarCollapse={toggleSidebarCollapsed}
        />

        <main ref={contentAreaRef} className="content-area">
          {currentTab === 'home' && (
            <HomeView
              health={health}
              status={status}
              agents={agents}
              onNavigate={setCurrentTab}
            />
          )}

          {currentTab === 'command-center' && (
            <CommandCenter
              health={health}
              status={status}
              agents={agents}
              missions={missions}
              goals={goals}
              tasks={tasks}
              approvals={approvals}
              envStatus={envStatus}
              recentAudit={auditLogs}
              companiesCount={companiesCount}
              knowledgeCount={knowledgeCount}
              onNavigate={setCurrentTab}
              onStartPrompt={handleStartPromptFromHome}
            />
          )}

          {currentTab === 'chat' && (
            <ChatView
              messages={messages}
              setMessages={setMessages}
              sessionId={sessionId}
              setSessionId={setSessionId}
              onVoiceSynthesize={handleVoiceSynthesize}
            />
          )}

          {currentTab === 'council-chat' && (
            <CouncilChatView agents={agents} onOpenWork={() => setCurrentTab('work')} />
          )}

          {currentTab === 'work' && (
            <WorkView
              goals={goals}
              missions={missions}
              tasks={tasks}
              onRefresh={loadAllData}
              onOpenAdvancedMission={() => setCurrentTab('missions')}
            />
          )}

          {currentTab === 'computer' && <ComputerOperatorView envStatus={envStatus} />}

          {currentTab === 'agents' && (
            <AgentsView
              agents={agents}
              onOpenAgentTown={() => setCurrentTab('agent-town')}
              onOpenOffice={() => setCurrentTab('office')}
            />
          )}

          {currentTab === 'organization' && (
            <OrganizationView agents={agents} onNavigate={setCurrentTab} />
          )}

          {currentTab === 'decisions' && (
            <DecisionsView onNavigate={setCurrentTab} />
          )}

          {(currentTab === 'attention' || currentTab === 'approvals') && (
            <AttentionView approvals={approvals} onRefresh={loadAllData} onNavigate={setCurrentTab} />
          )}

          {(currentTab === 'activity' || currentTab === 'audit') && (
            <ActivityView auditLogs={auditLogs} onNavigate={setCurrentTab} />
          )}

          {(currentTab === 'automations' || currentTab === 'schedules') && (
            <AutomationsView onNavigate={setCurrentTab} />
          )}

          {currentTab === 'office' && <VirtualOfficeView />}

          {currentTab === 'agent-town' && <AgentTown agents={agents} onNavigate={setCurrentTab} />}

          {currentTab === 'memory' && <MemoryView memoryItems={memoryItems} />}

          {currentTab === 'goals' && <GoalsView onRefresh={loadAllData} />}
          {currentTab === 'projects' && <MissionsView missions={missions} onRefresh={loadAllData} />}

          {currentTab === 'missions' && <MissionControlView />}

          {currentTab === 'tasks' && <TasksView tasks={tasks} />}

          {currentTab === 'tools' && <ToolsView tools={tools} />}

          {(currentTab === 'environment' || currentTab === 'system-health') && <EnvironmentView envStatus={envStatus} />}

          {currentTab === 'models' && <ModelsView providers={models} />}
          {currentTab === 'integrations' && <IntegrationsView />}
          {(currentTab === 'capabilities' || currentTab === 'security') && <CapabilityCenter />}

          {currentTab === 'companies' && <CompaniesView />}
          {currentTab === 'research' && <ResearchView />}
          {currentTab === 'knowledge' && <KnowledgeView />}
          {currentTab === 'skills' && <SkillsView />}
          {currentTab === 'mcp' && <MCPView />}
          {currentTab === 'multimodal' && <MultimodalView />}
          {currentTab === 'self-improvement' && <SelfImprovementView />}
          {currentTab === 'workers' && <WorkersView />}
          {currentTab === 'github' && <GitHubIntelligenceCenter />}
          {currentTab === 'ide' && <UniversalIDEView />}
          {currentTab === 'engineering' && <AutonomousEngineeringView />}
          {currentTab === 'workflows' && <WorkflowEngineView />}
          {currentTab === 'accounts' && <AccountsView />}
          {(currentTab === 'workspaces' || currentTab === 'files') && (
            <DigitalWorkspaceView initialTab={currentTab === 'files' ? 'files' : 'workspaces'} />
          )}
          {currentTab === 'ecosystem' && <EcosystemView />}
          {currentTab === 'creation' && <CreationStudioView />}
          {currentTab === 'persistent-ops' && <PersistentOperationsView />}
          {currentTab === 'evolution' && <EvolutionMonitorView />}

          {currentTab === 'settings' && (
            <SettingsView
              status={status}
              voiceStatus={voiceStatus}
              theme={theme}
              onSetTheme={setTheme}
            />
          )}
        </main>

        <BottomBar
          systemOnline={systemOnline}
          health={health}
          status={status}
          activeAgentsCount={activeAgentsCount}
          totalAgentsCount={agents.length}
        />
      </div>
    </div>
  );
};
