import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { BottomBar } from './components/BottomBar';
import { CommandCenter } from './views/CommandCenter';
import { AnimationService } from './services/animation.service';
import { ChatView } from './views/ChatView';
import { WorkView } from './views/WorkView';
import { ComputerView } from './views/ComputerView';
import { ComputerOperatorView } from './views/ComputerOperatorView';
import { AgentTown } from './views/AgentTown';
import { AgentsView } from './views/AgentsView';
import { MissionsView } from './views/MissionsView';
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
  'home', 'command-center', 'chat', 'council-chat', 'work', 'goals', 'missions', 'research', 'knowledge',
  'agent-town', 'agents', 'tasks', 'tools', 'approvals', 'memory', 'computer', 'multimodal',
  'environment', 'models', 'integrations', 'audit', 'settings', 'companies', 'skills', 'mcp', 'self-improvement'
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
      model: 'qwen2.5:7b',
    },
  ]);

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
      ]);

      if (healthRes.status === 'fulfilled') setHealth(healthRes.value);
      if (statusRes.status === 'fulfilled') setStatus(statusRes.value);
      if (agentsRes.status === 'fulfilled') setAgents(agentsRes.value.agents || []);
      if (missionsRes.status === 'fulfilled') setMissions(missionsRes.value.missions || []);
      if (goalsRes.status === 'fulfilled') setGoals(goalsRes.value.goals || []);
      if (tasksRes.status === 'fulfilled') setTasks(tasksRes.value.tasks || []);
      if (toolsRes.status === 'fulfilled') setTools(toolsRes.value.tools || []);
      if (approvalsRes.status === 'fulfilled') setApprovals(approvalsRes.value.approvals || []);
      if (memoryRes.status === 'fulfilled') setMemoryItems(memoryRes.value.items || []);
      if (envRes.status === 'fulfilled') setEnvStatus(envRes.value);
      if (voiceRes.status === 'fulfilled') setVoiceStatus(voiceRes.value);
      if (modelsRes.status === 'fulfilled') setModels(modelsRes.value.providers || []);
      if (auditRes.status === 'fulfilled') setAuditLogs(auditRes.value.logs || []);
      if (companiesRes.status === 'fulfilled') setCompaniesCount(companiesRes.value.companies?.length || 0);
      if (knowledgeRes.status === 'fulfilled') setKnowledgeCount(knowledgeRes.value.entities?.length || 0);

      setSystemOnline(true);
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
      api.getHealth().then(setHealth).catch(() => setSystemOnline(false));
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

  // Seamless prompt handover from Home screen command box to Chat
  const handleStartPromptFromHome = (promptText: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: promptText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setCurrentTab('chat');

    api
      .sendChat(promptText, sessionId)
      .then((res) => {
        const assistantMsg: ChatMessage = {
          id: `ast-${Date.now()}`,
          role: 'assistant',
          content: res.response,
          timestamp: new Date().toISOString(),
          model: res.model || 'qwen2.5:7b',
          durationMs: res.durationMs,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      })
      .catch((err) => {
        const errorMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `Something went wrong.\n\nWhat happened:\n${err.message || String(err)}`,
          timestamp: new Date().toISOString(),
          error: true,
        };
        setMessages((prev) => [...prev, errorMsg]);
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
        totalAgentsCount={agents.length || 17}
        activeGoalsCount={activeGoalsCount}
        activeMissionsCount={activeMissionsCount}
        companiesCount={companiesCount}
        knowledgeCount={knowledgeCount}
      />


      <div className="main-wrapper">
        <TopBar
          systemOnline={systemOnline}
          activeMissionCount={activeMissionsCount}
          activeGoalCount={activeGoalsCount}
          pendingApprovalsCount={pendingApprovalsCount}
          onOpenApprovals={() => setCurrentTab('approvals')}
          onSearch={(q) => {
            handleStartPromptFromHome(q);
          }}
        />

        <main ref={contentAreaRef} className="content-area">
          {(currentTab === 'home' || currentTab === 'command-center') && (
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
            <AgentsView agents={agents} onOpenAgentTown={() => setCurrentTab('agent-town')} />
          )}

          {currentTab === 'agent-town' && <AgentTown agents={agents} onNavigate={setCurrentTab} />}

          {currentTab === 'memory' && <MemoryView memoryItems={memoryItems} />}

          {currentTab === 'goals' && <GoalsView onRefresh={loadAllData} />}

          {currentTab === 'missions' && (
            <MissionsView missions={missions} onRefresh={loadAllData} />
          )}

          {currentTab === 'tasks' && <TasksView tasks={tasks} />}

          {currentTab === 'tools' && <ToolsView tools={tools} />}

          {currentTab === 'approvals' && (
            <ApprovalsView approvals={approvals} onRefresh={loadAllData} />
          )}

          {currentTab === 'environment' && <EnvironmentView envStatus={envStatus} />}

          {currentTab === 'models' && <ModelsView providers={models} />}
          {currentTab === 'integrations' && <IntegrationsView />}

          {currentTab === 'audit' && <AuditView auditLogs={auditLogs} />}

          {currentTab === 'companies' && <CompaniesView />}
          {currentTab === 'research' && <ResearchView />}
          {currentTab === 'knowledge' && <KnowledgeView />}
          {currentTab === 'skills' && <SkillsView />}
          {currentTab === 'mcp' && <MCPView />}
          {currentTab === 'multimodal' && <MultimodalView />}
          {currentTab === 'self-improvement' && <SelfImprovementView />}

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
