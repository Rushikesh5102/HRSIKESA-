import {
  HealthResponse,
  SystemStatusResponse,
  AgentInfo,
  TaskInfo,
  MissionInfo,
  ToolInfo,
  ApprovalRequest,
  MemoryTierItem,
  AppInfo,
  ProcessInfo,
  EnvironmentStatusResponse,
  VoiceStatusResponse,
  ModelProviderInfo,
  AuditRecord,
  CompanyInfo,
  ProjectInfo,
  DepartmentInfo,
  WorkforceAssignmentInfo,
  ProductInfo,
  CustomerInfo,
  DecisionInfo,
  CompanyOverviewInfo,
  ProjectOverviewInfo,
  LifecycleStageInfo,
  WorkerInfo,
  WorkerCapabilityInfo,
  ResourceSnapshotInfo,
  WorkerTaskInfo,
  ResourceFabricOverview,
  EnrollmentTokenResponse,
} from '../types/api.types';

const API_BASE = '';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
    try {
      const errBody = await response.json();
      if (errBody.error) {
        errorMsg = errBody.error;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // System Health & Status
  getHealth: () => fetchJson<HealthResponse>(`${API_BASE}/health`),
  getStatus: () => fetchJson<SystemStatusResponse>(`${API_BASE}/status`),

  // Chat & Multi-Session History
  sendChat: (message: string, sessionId?: string, preferredModel?: string, preferredProvider?: string, responseMode?: 'CONCISE' | 'NORMAL' | 'DETAILED' | 'DEEP') =>
    fetchJson<{ response: string; sessionId: string; model?: string; provider?: string; toolsUsed?: string[]; durationMs?: number; responseMode?: string; metrics?: any }>(
      `${API_BASE}/chat`,
      {
        method: 'POST',
        body: JSON.stringify({ message, sessionId, preferredModel, preferredProvider, responseMode }),
      }
    ),
  streamChat: async (
    message: string,
    sessionId: string | undefined,
    preferredModel: string | undefined,
    preferredProvider: string | undefined,
    onToken: (token: string) => void,
    responseMode?: 'CONCISE' | 'NORMAL' | 'DETAILED' | 'DEEP'
  ): Promise<{ response: string; sessionId: string; model?: string; provider?: string; durationMs?: number; responseMode?: string; metrics?: any }> => {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        message,
        sessionId,
        preferredModel,
        preferredProvider,
        responseMode,
        stream: true
      })
    });

    if (!response.ok) {
      let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
      try {
        const errJson = await response.json();
        if (errJson.error) errorMsg = errJson.error;
      } catch {}
      throw new Error(errorMsg);
    }

    if (!response.body) {
      throw new Error('Streaming response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedText = '';
    let finalPayload: any = null;
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const evt of events) {
        const lines = evt.split('\n');
        let eventType = 'message';
        let dataStr = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            dataStr = line.slice(6).trim();
          }
        }

        if (!dataStr) continue;

        try {
          const parsed = JSON.parse(dataStr);
          if (eventType === 'token' && parsed.token) {
            accumulatedText += parsed.token;
            onToken(parsed.token);
          } else if (eventType === 'done') {
            finalPayload = parsed;
          }
        } catch {}
      }
    }

    return (
      finalPayload || {
        response: accumulatedText,
        sessionId: sessionId || 'default',
        model: preferredModel || 'local',
        provider: preferredProvider || 'local'
      }
    );
  },
  getChatTelemetry: () => fetchJson<{ success: boolean; telemetry: any }>(`${API_BASE}/chat/telemetry`),
  getConversations: () =>
    fetchJson<{ success: boolean; sessions: Array<{ id: string; title?: string; createdAt: string; updatedAt?: string; messageCount?: number; metadata?: any }> }>(
      `${API_BASE}/conversations`
    ),
  getConversation: (id: string) =>
    fetchJson<{ success: boolean; session: any; messages: any[] }>(`${API_BASE}/conversations/${encodeURIComponent(id)}`),
  deleteConversation: (id: string) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => ({ success: true })),

  // Agents
  getAgents: () => fetchJson<{ agents: AgentInfo[] }>(`${API_BASE}/agents`),
  getAgent: (id: string) => fetchJson<{ agent: AgentInfo }>(`${API_BASE}/agents/${id}`),

  // Missions
  getMissions: () => fetchJson<{ missions: MissionInfo[] }>(`${API_BASE}/missions`),
  getMission: (id: string) => fetchJson<{ mission: MissionInfo }>(`${API_BASE}/missions/${id}`),
  createMission: (
    titleOrParams:
      | string
      | {
          objective: string;
          rootAgentId?: string;
          context?: string;
          companyId?: string;
          projectId?: string;
          productId?: string;
          departmentId?: string;
          executeImmediately?: boolean;
          autoPlan?: boolean;
        },
    description?: string,
    autoPlan = true,
    executeImmediately = false
  ) => {
    if (typeof titleOrParams === 'string') {
      return fetchJson<{ success: boolean; mission: MissionInfo; missionResult?: any }>(
        `${API_BASE}/missions`,
        {
          method: 'POST',
          body: JSON.stringify({
            objective: description || titleOrParams,
            context: titleOrParams,
            autoPlan,
            executeImmediately,
          }),
        }
      );
    }
    return fetchJson<{ success: boolean; mission: MissionInfo; missionResult?: any }>(
      `${API_BASE}/missions`,
      {
        method: 'POST',
        body: JSON.stringify(titleOrParams),
      }
    );
  },
  pauseMission: (missionId: string) =>
    fetchJson<{ success: boolean; status: string }>(`${API_BASE}/missions/${missionId}/pause`, { method: 'POST' }),
  resumeMission: (missionId: string, resolution?: string) =>
    fetchJson<{ success: boolean; missionResult?: any }>(`${API_BASE}/missions/${missionId}/resume`, {
      method: 'POST',
      body: JSON.stringify({ resolution }),
    }),
  abortMission: (missionId: string, reason?: string) =>
    fetchJson<{ success: boolean; aborted: boolean }>(`${API_BASE}/missions/${missionId}/abort`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // Workspace Filesystem Live Inspector
  getWorkspaceFiles: (dir = '') =>
    fetchJson<{ success: boolean; files: Array<{ name: string; path: string; isDirectory: boolean; size: number; extension: string; modifiedAt: string }>; currentPath: string; total: number }>(
      `${API_BASE}/workspace/files${dir ? `?dir=${encodeURIComponent(dir)}` : ''}`
    ),
  getWorkspaceFile: (filePath: string) =>
    fetchJson<{ success: boolean; path: string; name: string; extension: string; size: number; modifiedAt: string; content: string }>(
      `${API_BASE}/workspace/file?path=${encodeURIComponent(filePath)}`
    ),
  cancelMission: (missionId: string, reason?: string) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/missions/${missionId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  getMissionReport: (missionId: string) =>
    fetchJson<{ report: any }>(`${API_BASE}/missions/${missionId}/report`),
  getMissionArtifacts: (missionId: string) =>
    fetchJson<{ artifacts: any[] }>(`${API_BASE}/missions/${missionId}/artifacts`),

  // Tasks
  getTasks: () => fetchJson<{ tasks: TaskInfo[] }>(`${API_BASE}/tasks`),

  // Phase 14: Companies & Projects Operating System
  getCompanies: () => fetchJson<{ success: boolean; companies: CompanyInfo[] }>(`${API_BASE}/companies`),
  getCompany: (id: string) => fetchJson<{ success: boolean; company: CompanyInfo }>(`${API_BASE}/companies/${id}`),
  createCompany: (data: {
    name: string;
    slug?: string;
    description?: string;
    mission?: string;
    vision?: string;
    industry?: string;
    autoSetupDepartments?: boolean;
  }) =>
    fetchJson<{ success: boolean; company: CompanyInfo }>(`${API_BASE}/companies`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getCompanyOverview: (id: string) =>
    fetchJson<{ success: boolean; overview: CompanyOverviewInfo }>(`${API_BASE}/companies/${id}/overview`),
  getCompanyProjects: (companyId: string) =>
    fetchJson<{ success: boolean; projects: ProjectInfo[] }>(`${API_BASE}/companies/${companyId}/projects`),
  createCompanyProject: (companyId: string, data: { name: string; objective: string; description?: string; priority?: string }) =>
    fetchJson<{ success: boolean; project: ProjectInfo }>(`${API_BASE}/companies/${companyId}/projects`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getCompanyDepartments: (companyId: string) =>
    fetchJson<{ success: boolean; departments: DepartmentInfo[] }>(`${API_BASE}/companies/${companyId}/departments`),
  getCompanyWorkforce: (companyId: string) =>
    fetchJson<{ success: boolean; workforce: WorkforceAssignmentInfo[] }>(`${API_BASE}/companies/${companyId}/workforce`),
  getCompanyProducts: (companyId: string) =>
    fetchJson<{ success: boolean; products: ProductInfo[] }>(`${API_BASE}/companies/${companyId}/products`),
  createCompanyProduct: (companyId: string, data: { name: string; description?: string; type?: string; version?: string }) =>
    fetchJson<{ success: boolean; product: ProductInfo }>(`${API_BASE}/companies/${companyId}/products`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getCompanyCustomers: (companyId: string) =>
    fetchJson<{ success: boolean; customers: CustomerInfo[] }>(`${API_BASE}/companies/${companyId}/customers`),
  createCompanyCustomer: (companyId: string, data: { name: string; type?: string; contactReference?: string }) =>
    fetchJson<{ success: boolean; customer: CustomerInfo }>(`${API_BASE}/companies/${companyId}/customers`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getCompanyDecisions: (companyId: string) =>
    fetchJson<{ success: boolean; decisions: DecisionInfo[] }>(`${API_BASE}/companies/${companyId}/decisions`),
  createCompanyDecision: (companyId: string, data: { title: string; decision: string; reasoning?: string; madeBy: string }) =>
    fetchJson<{ success: boolean; decision: DecisionInfo }>(`${API_BASE}/companies/${companyId}/decisions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getCompanyMissions: (companyId: string) =>
    fetchJson<{ success: boolean; missions: MissionInfo[] }>(`${API_BASE}/companies/${companyId}/missions`),
  getCompanyArtifacts: (companyId: string) =>
    fetchJson<{ success: boolean; artifacts: any[] }>(`${API_BASE}/companies/${companyId}/artifacts`),
  getProjects: (companyId?: string) =>
    fetchJson<{ success: boolean; projects: ProjectInfo[] }>(
      `${API_BASE}/projects${companyId ? `?companyId=${encodeURIComponent(companyId)}` : ''}`
    ),
  getProject: (id: string) => fetchJson<{ success: boolean; project: ProjectInfo }>(`${API_BASE}/projects/${id}`),
  getProjectOverview: (id: string) =>
    fetchJson<{ success: boolean; overview: ProjectOverviewInfo }>(`${API_BASE}/projects/${id}/overview`),
  getLifecycleStages: () =>
    fetchJson<{ success: boolean; stages: LifecycleStageInfo[] }>(`${API_BASE}/companies/lifecycle/stages`),

  // Tools
  getTools: () => fetchJson<{ tools: ToolInfo[] }>(`${API_BASE}/tools`),
  executeTool: (toolId: string, input: Record<string, unknown> = {}, approvalId?: string) =>
    fetchJson<{ success: boolean; result?: any; error?: string }>(`${API_BASE}/tools/${toolId}/execute`, {
      method: 'POST',
      body: JSON.stringify({ input, approvalId }),
    }),

  // Approvals
  getApprovals: () => fetchJson<{ approvals: ApprovalRequest[] }>(`${API_BASE}/approvals`),
  respondApproval: (approvalId: string, decision: 'APPROVE' | 'DENY', reason?: string) =>
    fetchJson<{ success: boolean; id: string; status: string }>(`${API_BASE}/approvals`, {
      method: 'POST',
      body: JSON.stringify({ approvalId, decision, reason }),
    }),

  // Memory
  getMemory: () => fetchJson<{ items: MemoryTierItem[] }>(`${API_BASE}/memory/items`),

  // Environment
  getEnvironmentStatus: () => fetchJson<EnvironmentStatusResponse>(`${API_BASE}/environment/status`),
  getApplications: () => fetchJson<{ applications: AppInfo[] }>(`${API_BASE}/environment/applications`),
  getProcesses: () => fetchJson<{ processes: ProcessInfo[] }>(`${API_BASE}/environment/processes`),

  // Phase 18: Model Registry & Advanced Routing
  getModels: () => fetchJson<{ providers: ModelProviderInfo[]; totalModels: number; availableModelsCount: number; activePolicy: string }>(`${API_BASE}/models`),
  getModelsHealth: () => fetchJson<{ status: string; totalRegistered: number; totalAvailable: number; providers: any[] }>(`${API_BASE}/models/health`),
  getModelById: (id: string) => fetchJson<{ success: boolean; model: any }>(`${API_BASE}/models/${encodeURIComponent(id)}`),
  getProviders: () => fetchJson<{ providers: any[] }>(`${API_BASE}/providers`),
  refreshModels: () => fetchJson<{ success: boolean; totalModels: number; providers: any[] }>(`${API_BASE}/models/refresh`, { method: 'POST' }),
  getRoutingPolicy: () => fetchJson<{ success: boolean; policy: string; weights: any; autoFallback: boolean; maxCloudCostPerTaskUsd: number }>(`${API_BASE}/routing/policy`),
  updateRoutingPolicy: (policy: string, weights?: any) => fetchJson<{ success: boolean; policy: string; config: any }>(`${API_BASE}/routing/policy`, {
    method: 'POST',
    body: JSON.stringify({ policy, weights }),
  }),
  previewRouting: (payload: { prompt: string; preferredModel?: string; preferredProvider?: string; requireLocal?: boolean; taskType?: string; complexity?: string; privacyLevel?: string }) =>
    fetchJson<{ success: boolean; preview: any }>(`${API_BASE}/routing/preview`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getRoutingUsage: (limit: number = 50) =>
    fetchJson<{ success: boolean; stats: { totalCalls: number; totalInputTokens: number; totalOutputTokens: number; totalCostUsd: number; fallbackCount: number }; recentAudits: any[] }>(`${API_BASE}/routing/usage?limit=${limit}`),

  // Audit
  getAudit: () => fetchJson<{ logs: AuditRecord[] }>(`${API_BASE}/audit`),

  // Integrations & API Keys
  getIntegrations: () =>
    fetchJson<{
      success: boolean;
      aiProviders: Array<{ id: string; name: string; category: string; description: string; status: string; isConfigured: boolean; modelsCount: number; icon: string }>;
      appServices: Array<{ id: string; name: string; category: string; description: string; status: string; capabilities: string[] }>;
    }>(`${API_BASE}/integrations`),

  saveApiKey: (providerId: string, apiKey: string) =>
    fetchJson<{ success: boolean; providerId: string; status: string; message: string }>(`${API_BASE}/integrations/keys`, {
      method: 'POST',
      body: JSON.stringify({ providerId, apiKey }),
    }),

  saveAppService: (serviceId: string, token: string, config?: any) =>
    fetchJson<{ success: boolean; serviceId: string; status: string; message: string }>(`${API_BASE}/integrations/services`, {
      method: 'POST',
      body: JSON.stringify({ serviceId, token, config }),
    }),

  // Multi-Agent Council Discussion
  startCouncilDiscussion: (topic: string, agentIds?: string[], mode?: string) =>
    fetchJson<{
      success: boolean;
      topic: string;
      mode: string;
      turns: Array<{ agentId: string; agentName: string; role: string; content: string; timestamp: string; suggestions: string[] }>;
      consensusSummary: string;
      recommendedMission: { objective: string; tasks: Array<{ id: string; agentId: string; agentName: string; title: string; objective: string }> };
    }>(`${API_BASE}/council/discuss`, {
      method: 'POST',
      body: JSON.stringify({ topic, agentIds, mode }),
    }),

  convertCouncilToMission: (objective: string, tasks?: any[]) =>
    fetchJson<{ success: boolean; missionId: string; status: string; message: string }>(`${API_BASE}/council/convert-mission`, {
      method: 'POST',
      body: JSON.stringify({ objective, tasks }),
    }),

  // Voice & Pronunciation Subsystems
  getVoiceStatus: () => fetchJson<VoiceStatusResponse>(`${API_BASE}/voice/status`),
  synthesizeSpeech: (text: string) =>
    fetchJson<{ success: boolean; audioBase64?: string; audioFilePath?: string; durationMs?: number }>(`${API_BASE}/voice/synthesize`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
  getPronunciations: (search?: string) =>
    fetchJson<{ success: boolean; total: number; entries: any[] }>(
      `${API_BASE}/voice/pronunciations${search ? `?q=${encodeURIComponent(search)}` : ''}`
    ),
  savePronunciation: (payload: any) =>
    fetchJson<{ success: boolean; entry: any }>(`${API_BASE}/voice/pronunciations`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deletePronunciation: (canonical: string) =>
    fetchJson<{ success: boolean; canonical: string }>(
      `${API_BASE}/voice/pronunciations/${encodeURIComponent(canonical)}`,
      { method: 'DELETE' }
    ),
  getVoiceProfiles: () =>
    fetchJson<{ success: boolean; profiles: any[]; preferences: any; activeProfile: any }>(
      `${API_BASE}/voice/profiles`
    ),
  updateVoicePreferences: (preferences: any) =>
    fetchJson<{ success: boolean; preferences: any }>(`${API_BASE}/voice/preferences`, {
      method: 'POST',
      body: JSON.stringify(preferences),
    }),
  testVoiceAudio: (payload: { text?: string; engine?: string; language?: string; speed?: number }) =>
    fetchJson<{
      success: boolean;
      text: string;
      normalizedText: string;
      engine: string;
      formatUsed: string;
      audioFilePath: string;
      durationMs: number;
      latencyMs: number;
      characterCount: number;
    }>(`${API_BASE}/voice/test`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  interruptVoice: () =>
    fetchJson<{ success: boolean; message: string }>(`${API_BASE}/voice/interrupt`, {
      method: 'POST',
    }),

  // Phase 15: Goals
  getGoals: (filters?: { companyId?: string; projectId?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.companyId) params.set('companyId', filters.companyId);
    if (filters?.projectId) params.set('projectId', filters.projectId);
    if (filters?.status) params.set('status', filters.status);
    const qs = params.toString();
    return fetchJson<{ success: boolean; goals: import('../types/api.types').GoalInfo[]; count: number }>(
      `${API_BASE}/goals${qs ? `?${qs}` : ''}`
    );
  },
  getGoal: (id: string) =>
    fetchJson<{
      success: boolean;
      goal: import('../types/api.types').GoalInfo;
      milestones: import('../types/api.types').MilestoneInfo[];
      progress?: import('../types/api.types').GoalProgressInfo;
    }>(`${API_BASE}/goals/${id}`),
  createGoal: (payload: import('../types/api.types').CreateGoalPayload) =>
    fetchJson<{ success: boolean; goal: import('../types/api.types').GoalInfo }>(`${API_BASE}/goals`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  planGoal: (id: string) =>
    fetchJson<{
      success: boolean;
      goal: import('../types/api.types').GoalInfo;
      plan: import('../types/api.types').GoalPlanInfo;
    }>(`${API_BASE}/goals/${id}/plan`, {
      method: 'POST',
    }),
  startGoal: (id: string) =>
    fetchJson<{ success: boolean; goal: import('../types/api.types').GoalInfo }>(`${API_BASE}/goals/${id}/start`, {
      method: 'POST',
    }),
  pauseGoal: (id: string) =>
    fetchJson<{ success: boolean; goal: import('../types/api.types').GoalInfo }>(`${API_BASE}/goals/${id}/pause`, {
      method: 'POST',
    }),
  resumeGoal: (id: string) =>
    fetchJson<{ success: boolean; goal: import('../types/api.types').GoalInfo }>(`${API_BASE}/goals/${id}/resume`, {
      method: 'POST',
    }),
  cancelGoal: (id: string, reason?: string) =>
    fetchJson<{ success: boolean; goal: import('../types/api.types').GoalInfo }>(`${API_BASE}/goals/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  replanGoal: (id: string, failedMilestoneId?: string, reason?: string) =>
    fetchJson<{
      success: boolean;
      goal: import('../types/api.types').GoalInfo;
      plan: import('../types/api.types').GoalPlanInfo;
    }>(`${API_BASE}/goals/${id}/replan`, {
      method: 'POST',
      body: JSON.stringify({ failedMilestoneId, reason }),
    }),
  getGoalMilestones: (id: string) =>
    fetchJson<{ success: boolean; milestones: import('../types/api.types').MilestoneInfo[]; count: number }>(
      `${API_BASE}/goals/${id}/milestones`
    ),
  getGoalProgress: (id: string) =>
    fetchJson<{ success: boolean; progress: import('../types/api.types').GoalProgressInfo }>(
      `${API_BASE}/goals/${id}/progress`
    ),
  getGoalVerification: (id: string) =>
    fetchJson<{ success: boolean; verification: import('../types/api.types').GoalVerificationInfo | null }>(
      `${API_BASE}/goals/${id}/verification`
    ),
  getGoalReport: (id: string) =>
    fetchJson<{ success: boolean; report: import('../types/api.types').GoalReportInfo }>(
      `${API_BASE}/goals/${id}/report`
    ),

  // Knowledge System (Phase 19)
  getKnowledgeEntities: (params?: { type?: string; entityType?: string; scope?: string; search?: string; limit?: number }) => {
    const query = new URLSearchParams();
    const eType = params?.entityType || params?.type;
    if (eType) query.set('entityType', eType);
    if (params?.scope) query.set('scope', params.scope);
    if (params?.search) query.set('search', params.search);
    if (params?.limit) query.set('limit', String(params.limit));
    return fetchJson<{ success: boolean; entities: import('../types/api.types').KnowledgeEntityInfo[]; count?: number; total?: number }>(
      `${API_BASE}/knowledge/entities?${query.toString()}`
    );
  },
  createKnowledgeEntity: (payload: Partial<import('../types/api.types').KnowledgeEntityInfo>) =>
    fetchJson<{ success: boolean; entity: import('../types/api.types').KnowledgeEntityInfo }>(`${API_BASE}/knowledge/entities`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getKnowledgeEntity: (id: string) =>
    fetchJson<{ success: boolean; entity: import('../types/api.types').KnowledgeEntityInfo }>(`${API_BASE}/knowledge/entities/${id}`),
  getEntityRelationships: (id: string) =>
    fetchJson<{ success: boolean; relationships: import('../types/api.types').KnowledgeRelationshipInfo[]; count?: number; total?: number }>(
      `${API_BASE}/knowledge/entities/${id}/relationships`
    ),
  getEntityFacts: (id: string, currentOnly = false) =>
    fetchJson<{ success: boolean; facts: import('../types/api.types').KnowledgeFactInfo[]; count?: number; total?: number }>(
      `${API_BASE}/knowledge/entities/${id}/facts?currentOnly=${currentOnly}`
    ),
  getKnowledgeRelationships: (params?: { sourceEntityId?: string; targetEntityId?: string; type?: string; relationshipType?: string; scope?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.sourceEntityId) query.set('sourceEntityId', params.sourceEntityId);
    if (params?.targetEntityId) query.set('targetEntityId', params.targetEntityId);
    const rType = params?.relationshipType || params?.type;
    if (rType) query.set('relationshipType', rType);
    if (params?.scope) query.set('scope', params.scope);
    if (params?.limit) query.set('limit', String(params.limit));
    return fetchJson<{ success: boolean; relationships: import('../types/api.types').KnowledgeRelationshipInfo[]; count?: number; total?: number }>(
      `${API_BASE}/knowledge/relationships?${query.toString()}`
    );
  },
  createKnowledgeRelationship: (payload: Partial<import('../types/api.types').KnowledgeRelationshipInfo>) =>
    fetchJson<{ success: boolean; relationship: import('../types/api.types').KnowledgeRelationshipInfo }>(
      `${API_BASE}/knowledge/relationships`,
      { method: 'POST', body: JSON.stringify(payload) }
    ),
  getKnowledgeFacts: (params?: { subjectEntityId?: string; predicate?: string; currentOnly?: boolean; scope?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.subjectEntityId) query.set('subjectEntityId', params.subjectEntityId);
    if (params?.predicate) query.set('predicate', params.predicate);
    if (params?.currentOnly !== undefined) query.set('currentOnly', String(params.currentOnly));
    if (params?.scope) query.set('scope', params.scope);
    if (params?.limit) query.set('limit', String(params.limit));
    return fetchJson<{ success: boolean; facts: import('../types/api.types').KnowledgeFactInfo[]; count?: number; total?: number }>(
      `${API_BASE}/knowledge/facts?${query.toString()}`
    );
  },
  createKnowledgeFact: (payload: any) =>
    fetchJson<{ success: boolean; fact: import('../types/api.types').KnowledgeFactInfo; contradictions?: any[] }>(
      `${API_BASE}/knowledge/facts`,
      { method: 'POST', body: JSON.stringify(payload) }
    ),
  searchKnowledge: (params: { q: string; scope?: string; maxDepth?: number; limit?: number }) => {
    const query = new URLSearchParams({ q: params.q });
    if (params.scope) query.set('scope', params.scope);
    if (params.maxDepth) query.set('maxDepth', String(params.maxDepth));
    if (params.limit) query.set('limit', String(params.limit));
    return fetchJson<{ success: boolean; searchResult: import('../types/api.types').KnowledgeSearchResult; query: string }>(
      `${API_BASE}/knowledge/search?${query.toString()}`
    );
  },
  getKnowledgeGraph: (params?: { entityId?: string; centerEntityId?: string; depth?: number; scope?: string; limit?: number }) => {
    const query = new URLSearchParams();
    const cId = params?.centerEntityId || params?.entityId;
    if (cId) query.set('centerEntityId', cId);
    if (params?.depth) query.set('depth', String(params.depth));
    if (params?.scope) query.set('scope', params.scope);
    if (params?.limit) query.set('limit', String(params.limit));
    return fetchJson<{ success: boolean; graph: import('../types/api.types').KnowledgeGraphData }>(
      `${API_BASE}/knowledge/graph?${query.toString()}`
    );
  },
  getKnowledgeContradictions: (params?: { subjectEntityId?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.subjectEntityId) query.set('subjectEntityId', params.subjectEntityId);
    if (params?.status) query.set('status', params.status);
    return fetchJson<{ success: boolean; contradictions: import('../types/api.types').KnowledgeContradictionInfo[]; total: number }>(
      `${API_BASE}/knowledge/contradictions?${query.toString()}`
    );
  },
  getKnowledgeTimeline: (params?: { entityId?: string; scope?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.entityId) query.set('entityId', params.entityId);
    if (params?.scope) query.set('scope', params.scope);
    if (params?.limit) query.set('limit', String(params.limit));
    return fetchJson<{ success: boolean; timeline: import('../types/api.types').KnowledgeTimelineItem[]; total: number }>(
      `${API_BASE}/knowledge/timeline?${query.toString()}`
    );
  },
  consolidateKnowledge: () =>
    fetchJson<{ success: boolean; result: any }>(`${API_BASE}/knowledge/consolidate`, {
      method: 'POST',
    }),

  // Phase 20: Skills & Procedural Intelligence
  getSkills: (params?: { category?: string; status?: string; scope?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.status) query.set('status', params.status);
    if (params?.scope) query.set('scope', params.scope);
    if (params?.limit) query.set('limit', String(params.limit));
    return fetchJson<{ success: boolean; count: number; skills: import('../types/api.types').SkillInfo[] }>(
      `${API_BASE}/skills?${query.toString()}`
    );
  },
  getSkill: (id: string) =>
    fetchJson<{ success: boolean; skill: import('../types/api.types').SkillInfo; statistics?: import('../types/api.types').SkillStatisticsInfo; versionsCount?: number }>(
      `${API_BASE}/skills/${id}`
    ),
  createSkill: (payload: any) =>
    fetchJson<{ success: boolean; skill: import('../types/api.types').SkillInfo; warnings?: string[] }>(
      `${API_BASE}/skills`,
      { method: 'POST', body: JSON.stringify(payload) }
    ),
  enableSkill: (id: string) =>
    fetchJson<{ success: boolean; skill: import('../types/api.types').SkillInfo }>(
      `${API_BASE}/skills/${id}/enable`,
      { method: 'POST' }
    ),
  disableSkill: (id: string) =>
    fetchJson<{ success: boolean; skill: import('../types/api.types').SkillInfo }>(
      `${API_BASE}/skills/${id}/disable`,
      { method: 'POST' }
    ),
  validateSkill: (id: string) =>
    fetchJson<{ success: boolean; valid: boolean; errors: string[]; warnings: string[] }>(
      `${API_BASE}/skills/${id}/validate`,
      { method: 'POST' }
    ),
  executeSkill: (id: string, inputs: Record<string, unknown> = {}, options: any = {}) =>
    fetchJson<{ success: boolean; result: any }>(
      `${API_BASE}/skills/${id}/execute`,
      { method: 'POST', body: JSON.stringify({ inputs, ...options }) }
    ),
  getSkillExecutions: (id: string, limit = 50) =>
    fetchJson<{ success: boolean; count: number; executions: import('../types/api.types').SkillUsageInfo[] }>(
      `${API_BASE}/skills/${id}/executions?limit=${limit}`
    ),
  getSkillStatistics: (id: string) =>
    fetchJson<{ success: boolean; statistics: import('../types/api.types').SkillStatisticsInfo }>(
      `${API_BASE}/skills/${id}/statistics`
    ),
  getSkillImprovements: (id: string) =>
    fetchJson<{ success: boolean; count: number; proposals: import('../types/api.types').SkillImprovementInfo[] }>(
      `${API_BASE}/skills/${id}/improvements`
    ),
  createSkillImprovement: (id: string, payload: { reason: string; evidence?: any; proposedChanges?: any }) =>
    fetchJson<{ success: boolean; proposal: import('../types/api.types').SkillImprovementInfo }>(
      `${API_BASE}/skills/${id}/improvements`,
      { method: 'POST', body: JSON.stringify(payload) }
    ),
  updateSkillImprovementStatus: (proposalId: string, status: string) =>
    fetchJson<{ success: boolean; proposal: import('../types/api.types').SkillImprovementInfo }>(
      `${API_BASE}/skills/improvements/${proposalId}/status`,
      { method: 'POST', body: JSON.stringify({ status }) }
    ),
  matchSkills: (payload: { request: string; goal?: string; mission?: string; task?: string; context?: any }) =>
    fetchJson<{ success: boolean; count: number; matches: import('../types/api.types').SkillMatchCandidate[] }>(
      `${API_BASE}/skills/match`,
      { method: 'POST', body: JSON.stringify(payload) }
    ),
  previewSkill: (skillId: string, inputs: Record<string, unknown> = {}) =>
    fetchJson<{ success: boolean; preview: import('../types/api.types').SkillPreviewInfo }>(
      `${API_BASE}/skills/preview`,
      { method: 'POST', body: JSON.stringify({ skillId, inputs }) }
    ),

  // Phase 23: External / Enterprise Environments API
  getEnvironments: (params?: { type?: string; status?: string; scope?: string; companyId?: string; projectId?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return fetchJson<{ success: boolean; count: number; environments: any[] }>(`${API_BASE}/environments${query ? `?${query}` : ''}`);
  },
  getEnvironment: (id: string) =>
    fetchJson<{ success: boolean; environment: any; capabilities: any[]; health: any }>(`${API_BASE}/environments/${id}`),
  registerEnvironment: (payload: any) =>
    fetchJson<{ success: boolean; environment: any }>(`${API_BASE}/environments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  authorizeEnvironment: (id: string, trustLevel = 'TRUSTED') =>
    fetchJson<{ success: boolean; environment: any }>(`${API_BASE}/environments/${id}/authorize`, {
      method: 'POST',
      body: JSON.stringify({ trustLevel }),
    }),
  revokeEnvironment: (id: string) =>
    fetchJson<{ success: boolean; environment: any }>(`${API_BASE}/environments/${id}/revoke`, { method: 'POST' }),
  disableEnvironment: (id: string) =>
    fetchJson<{ success: boolean; environment: any }>(`${API_BASE}/environments/${id}/disable`, { method: 'POST' }),
  inspectEnvironment: (id: string) =>
    fetchJson<{ success: boolean; environment: any }>(`${API_BASE}/environments/${id}/inspect`, { method: 'POST' }),
  connectEnvironment: (id: string, agentId?: string) =>
    fetchJson<{ success: boolean; session: any }>(`${API_BASE}/environments/${id}/connect`, {
      method: 'POST',
      body: JSON.stringify({ agentId }),
    }),
  disconnectEnvironment: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`${API_BASE}/environments/${id}/disconnect`, { method: 'POST' }),
  checkEnvironmentHealth: (id: string) =>
    fetchJson<{ success: boolean; health: any }>(`${API_BASE}/environments/${id}/health`, { method: 'POST' }),
  getEnvironmentCapabilities: (id: string) =>
    fetchJson<{ success: boolean; capabilities: any[] }>(`${API_BASE}/environments/${id}/capabilities`),
  getEnvironmentProcesses: (id: string) =>
    fetchJson<{ success: boolean; processes: any[] }>(`${API_BASE}/environments/${id}/processes`),
  getEnvironmentFiles: (id: string, path = '/', maxItems = 100) =>
    fetchJson<{ success: boolean; path: string; files: any[] }>(`${API_BASE}/environments/${id}/files?path=${encodeURIComponent(path)}&maxItems=${maxItems}`),
  executeEnvironmentCommand: (id: string, command: string, options?: any) =>
    fetchJson<{ success: boolean; result: any }>(`${API_BASE}/environments/${id}/execute`, {
      method: 'POST',
      body: JSON.stringify({ command, options }),
    }),
  getEnvironmentSessions: (id: string) =>
    fetchJson<{ success: boolean; sessions: any[] }>(`${API_BASE}/environments/${id}/sessions`),
  deleteEnvironment: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`${API_BASE}/environments/${id}`, { method: 'DELETE' }),

  // Phase 24: Multimodal Vision + Advanced Voice
  getMultimodalStatus: () =>
    fetchJson<{
      success: boolean;
      status: string;
      microphoneState: string;
      speakerState: string;
      cameraState: string;
      latestObservation?: any;
      activeModalities: string[];
    }>(`${API_BASE}/multimodal/status`),
  getMultimodalSessions: () =>
    fetchJson<{ success: boolean; sessions: any[] }>(`${API_BASE}/multimodal/sessions`),
  createMultimodalSession: (payload: any) =>
    fetchJson<{ success: boolean; session: any }>(`${API_BASE}/multimodal/sessions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  observeMultimodal: (payload?: { targetApp?: string; expectedKeywords?: string[] }) =>
    fetchJson<{ success: boolean; observation: any }>(`${API_BASE}/multimodal/observe`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),
  analyzeMultimodalImage: (payload: { imageData: string; prompt?: string }) =>
    fetchJson<{ success: boolean; observation: any; analysis: string }>(`${API_BASE}/multimodal/analyze`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  startVoiceListening: () =>
    fetchJson<{ success: boolean; microphoneState: string }>(`${API_BASE}/multimodal/voice/start`, { method: 'POST' }),
  stopVoiceListening: () =>
    fetchJson<{ success: boolean; microphoneState: string }>(`${API_BASE}/multimodal/voice/stop`, { method: 'POST' }),
  getMultimodalVoiceStatus: () =>
    fetchJson<{ success: boolean; microphoneState: string; speakerState: string; currentPartial: string }>(
      `${API_BASE}/multimodal/voice/status`
    ),
  speakVoice: (text: string, language = 'en') =>
    fetchJson<{ success: boolean; spokenText: string; status: string }>(`${API_BASE}/multimodal/speak`, {
      method: 'POST',
      body: JSON.stringify({ text, language }),
    }),
  startCamera: () =>
    fetchJson<{ success: boolean; cameraState: string }>(`${API_BASE}/multimodal/camera/start`, { method: 'POST' }),
  stopCamera: () =>
    fetchJson<{ success: boolean; cameraState: string }>(`${API_BASE}/multimodal/camera/stop`, { method: 'POST' }),
  getCameraStatus: () =>
    fetchJson<{ success: boolean; cameraState: string; availableCameras: any[] }>(`${API_BASE}/multimodal/camera/status`),

  // Phase 25: Autonomous Company Operations
  getCompanyHealth: (id: string) =>
    fetchJson<{ success: boolean; health: any }>(`${API_BASE}/companies/${id}/health`),
  getCompanyOperatingState: (id: string) =>
    fetchJson<{ success: boolean; state: string; isPaused: boolean }>(`${API_BASE}/companies/${id}/status`),
  executeCompanyCycle: (id: string) =>
    fetchJson<{ success: boolean; result: any }>(`${API_BASE}/companies/${id}/cycle`, { method: 'POST' }),
  pauseCompany: (id: string) =>
    fetchJson<{ success: boolean; state: string }>(`${API_BASE}/companies/${id}/pause`, { method: 'POST' }),
  resumeCompany: (id: string) =>
    fetchJson<{ success: boolean; state: string }>(`${API_BASE}/companies/${id}/resume`, { method: 'POST' }),
  getCompanyObjectives: (id: string) =>
    fetchJson<{ success: boolean; count: number; objectives: any[] }>(`${API_BASE}/companies/${id}/objectives`),
  createCompanyObjective: (id: string, payload: any) =>
    fetchJson<{ success: boolean; objective: any }>(`${API_BASE}/companies/${id}/objectives`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getCompanyKpis: (id: string) =>
    fetchJson<{ success: boolean; totalKpis: number; achievedKpis: number; underperformingKpis: number; kpis: any[] }>(
      `${API_BASE}/companies/${id}/kpis`
    ),
  createCompanyKpi: (id: string, payload: any) =>
    fetchJson<{ success: boolean; kpi: any }>(`${API_BASE}/companies/${id}/kpis`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getCompanyOrders: (id: string) =>
    fetchJson<{ success: boolean; count: number; orders: any[] }>(`${API_BASE}/companies/${id}/orders`),
  createCompanyOrder: (id: string, payload: any) =>
    fetchJson<{ success: boolean; order: any }>(`${API_BASE}/companies/${id}/orders`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getCompanyIncidents: (id: string) =>
    fetchJson<{ success: boolean; count: number; incidents: any[] }>(`${API_BASE}/companies/${id}/incidents`),
  createCompanyIncident: (id: string, payload: any) =>
    fetchJson<{ success: boolean; incident: any }>(`${API_BASE}/companies/${id}/incidents`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getCompanyRisks: (id: string) =>
    fetchJson<{ success: boolean; count: number; risks: any[] }>(`${API_BASE}/companies/${id}/risks`),
  createCompanyRisk: (id: string, payload: any) =>
    fetchJson<{ success: boolean; risk: any }>(`${API_BASE}/companies/${id}/risks`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getCompanyApprovals: (id: string) =>
    fetchJson<{ success: boolean; count: number; approvals: any[] }>(`${API_BASE}/companies/${id}/approvals`),
  getCompanySops: (id: string) =>
    fetchJson<{ success: boolean; count: number; sops: any[] }>(`${API_BASE}/companies/${id}/sops`),
  getCompanyReleases: (id: string) =>
    fetchJson<{ success: boolean; count: number; releases: any[] }>(`${API_BASE}/companies/${id}/releases`),
  getCompanyWorkforceCapacities: (id: string) =>
    fetchJson<{ success: boolean; count: number; workforce: any[] }>(`${API_BASE}/companies/${id}/workforce`),

  // Phase 26: Safe Self-Improvement & Self-Maintenance
  getSelfHealth: (companyId?: string) =>
    fetchJson<{ success: boolean; health: any }>(`${API_BASE}/self/health${companyId ? `?companyId=${companyId}` : ''}`),
  getSelfAnomalies: (params?: { status?: string; severity?: string; component?: string; companyId?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return fetchJson<{ success: boolean; count: number; anomalies: any[] }>(`${API_BASE}/self/anomalies${query ? `?${query}` : ''}`);
  },
  getSelfProposals: (params?: { category?: string; state?: string; riskLevel?: string; companyId?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return fetchJson<{ success: boolean; count: number; proposals: any[] }>(`${API_BASE}/self/improvements${query ? `?${query}` : ''}`);
  },
  getSelfProposalById: (id: string) =>
    fetchJson<{
      success: boolean;
      proposal: any;
      evidence: any[];
      changeset: any;
      tests: any[];
      benchmarks: any[];
      approval: any;
    }>(`${API_BASE}/self/improvements/${id}`),
  createSelfProposal: (payload: any) =>
    fetchJson<{ success: boolean; proposal: any }>(`${API_BASE}/self/improvements`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  transitionSelfProposal: (id: string, state: string) =>
    fetchJson<{ success: boolean; proposal: any }>(`${API_BASE}/self/improvements/${id}/transition`, {
      method: 'POST',
      body: JSON.stringify({ state }),
    }),
  approveSelfProposal: (id: string, resolvedBy?: string, rationale?: string) =>
    fetchJson<{ success: boolean; proposal: any }>(`${API_BASE}/self/improvements/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ resolvedBy, rationale }),
    }),
  rejectSelfProposal: (id: string, resolvedBy?: string, rationale?: string) =>
    fetchJson<{ success: boolean; proposal: any }>(`${API_BASE}/self/improvements/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ resolvedBy, rationale }),
    }),
  sandboxSelfProposal: (id: string, payload?: any) =>
    fetchJson<{ success: boolean; testResult: any }>(`${API_BASE}/self/improvements/${id}/sandbox`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),
  benchmarkSelfProposal: (id: string, payload?: any) =>
    fetchJson<{ success: boolean; benchmark: any }>(`${API_BASE}/self/improvements/${id}/benchmark`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),
  applySelfProposal: (id: string, payload?: any) =>
    fetchJson<{ success: boolean; deployment: any }>(`${API_BASE}/self/improvements/${id}/apply`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),
  rollbackSelfProposal: (id: string, payload?: any) =>
    fetchJson<{ success: boolean; rollback: any }>(`${API_BASE}/self/improvements/${id}/rollback`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),
  runSelfCycle: (companyId?: string) =>
    fetchJson<{ success: boolean; result: any }>(`${API_BASE}/self/cycle`, {
      method: 'POST',
      body: JSON.stringify({ companyId }),
    }),
  getSelfMaintenance: () =>
    fetchJson<{ success: boolean; count: number; jobs: any[] }>(`${API_BASE}/self/maintenance`),
  runSelfMaintenance: (type: string, target?: string) =>
    fetchJson<{ success: boolean; job: any }>(`${API_BASE}/self/maintenance/run`, {
      method: 'POST',
      body: JSON.stringify({ type, target }),
    }),
  getSelfDependencies: () =>
    fetchJson<{ success: boolean; count: number; findings: any[] }>(`${API_BASE}/self/dependencies`),

  // FP-03: Distributed Resource Fabric & Worker Fleet
  getFabricOverview: () =>
    fetchJson<ResourceFabricOverview>(`${API_BASE}/resources/overview`),
  getWorkers: () =>
    fetchJson<{ workers: WorkerInfo[]; total: number }>(`${API_BASE}/resources/workers`),
  getWorker: (id: string) =>
    fetchJson<{ worker: WorkerInfo; latestSnapshots: ResourceSnapshotInfo[]; recentTasks: WorkerTaskInfo[] }>(`${API_BASE}/resources/workers/${id}`),
  pairWorker: (name?: string, ttlSeconds = 600) =>
    fetchJson<EnrollmentTokenResponse>(`${API_BASE}/resources/workers/pair`, {
      method: 'POST',
      body: JSON.stringify({ name, ttlSeconds }),
    }),
  enrollWorker: (worker: any, token: string) =>
    fetchJson<{ success: boolean; workerId: string }>(`${API_BASE}/resources/workers/enroll`, {
      method: 'POST',
      body: JSON.stringify({ worker, token }),
    }),
  revokeWorker: (id: string) =>
    fetchJson<{ success: boolean; workerId: string }>(`${API_BASE}/resources/workers/${id}/revoke`, { method: 'POST' }),
  drainWorker: (id: string) =>
    fetchJson<{ success: boolean; workerId: string }>(`${API_BASE}/resources/workers/${id}/drain`, { method: 'POST' }),
  resumeWorker: (id: string) =>
    fetchJson<{ success: boolean; workerId: string }>(`${API_BASE}/resources/workers/${id}/resume`, { method: 'POST' }),
  getWorkerCapabilities: (id: string) =>
    fetchJson<{ workerId: string; capabilities: WorkerCapabilityInfo[] }>(`${API_BASE}/resources/workers/${id}/capabilities`),
  getWorkerHealth: (id: string) =>
    fetchJson<{ workerId: string; status: string; trustLevel: string; lastHeartbeat: string; loadScore: number }>(`${API_BASE}/resources/workers/${id}/health`),
  getWorkerTasks: () =>
    fetchJson<{ tasks: WorkerTaskInfo[]; total: number }>(`${API_BASE}/resources/tasks`),
  getWorkerTask: (id: string) =>
    fetchJson<{ task: WorkerTaskInfo }>(`${API_BASE}/resources/tasks/${id}`),
  submitWorkerTask: (payload: {
    taskType: string;
    priority?: number;
    privacyLevel?: string;
    requiredCapabilities?: string[];
    resourceRequirements?: any;
    preferredWorkerId?: string;
    inputPayload?: Record<string, unknown>;
  }) =>
    fetchJson<{ success: boolean; taskId: string; workerId?: string; output?: any; error?: string }>(`${API_BASE}/resources/tasks`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  cancelWorkerTask: (id: string) =>
    fetchJson<{ success: boolean; taskId: string }>(`${API_BASE}/resources/tasks/${id}/cancel`, { method: 'POST' }),

  // FP-11 Universal Workflow & Automation Engine
  listWorkflows: (params?: { scope?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.scope) q.set('scope', params.scope);
    if (params?.status) q.set('status', params.status);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return fetchJson<{ success: boolean; count: number; workflows: any[] }>(`${API_BASE}/api/workflows${qs}`);
  },
  getWorkflow: (id: string) =>
    fetchJson<{ success: boolean; workflow: any; activeVersion: any }>(`${API_BASE}/api/workflows/${id}`),
  createWorkflow: (payload: any) =>
    fetchJson<{ success: boolean; workflow: any; version: any }>(`${API_BASE}/api/workflows`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  validateWorkflow: (id: string) =>
    fetchJson<{ success: boolean; validation: any }>(`${API_BASE}/api/workflows/${id}/validate`, { method: 'POST' }),
  activateWorkflow: (id: string) =>
    fetchJson<{ success: boolean; status: string }>(`${API_BASE}/api/workflows/${id}/activate`, { method: 'POST' }),
  pauseWorkflow: (id: string) =>
    fetchJson<{ success: boolean; status: string }>(`${API_BASE}/api/workflows/${id}/pause`, { method: 'POST' }),
  resumeWorkflow: (id: string) =>
    fetchJson<{ success: boolean; status: string }>(`${API_BASE}/api/workflows/${id}/resume`, { method: 'POST' }),
  disableWorkflow: (id: string) =>
    fetchJson<{ success: boolean; status: string }>(`${API_BASE}/api/workflows/${id}/disable`, { method: 'POST' }),
  runWorkflow: (id: string, payload?: { inputVariables?: Record<string, any>; triggerType?: string }) =>
    fetchJson<{ success: boolean; run: any }>(`${API_BASE}/api/workflows/${id}/run`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),
  getWorkflowRuns: (id: string) =>
    fetchJson<{ success: boolean; count: number; runs: any[] }>(`${API_BASE}/api/workflows/${id}/runs`),
  getWorkflowRun: (runId: string) =>
    fetchJson<{ success: boolean; run: any; nodes: any[]; approvals: any[]; checkpoints: any[] }>(`${API_BASE}/api/workflow-runs/${runId}`),
  getWorkflowRunTimeline: (runId: string) =>
    fetchJson<{ success: boolean; runId: string; status: string; durationMs: number; timeline: any[] }>(`${API_BASE}/api/workflow-runs/${runId}/timeline`),
  pauseWorkflowRun: (runId: string) =>
    fetchJson<{ success: boolean; status: string }>(`${API_BASE}/api/workflow-runs/${runId}/pause`, { method: 'POST' }),
  resumeWorkflowRun: (runId: string) =>
    fetchJson<{ success: boolean; status: string }>(`${API_BASE}/api/workflow-runs/${runId}/resume`, { method: 'POST' }),
  cancelWorkflowRun: (runId: string) =>
    fetchJson<{ success: boolean; status: string }>(`${API_BASE}/api/workflow-runs/${runId}/cancel`, { method: 'POST' }),
  retryWorkflowRun: (runId: string) =>
    fetchJson<{ success: boolean; run: any }>(`${API_BASE}/api/workflow-runs/${runId}/retry`, { method: 'POST' }),
  listWorkflowApprovals: (status?: string) => {
    const qs = status ? `?status=${status}` : '';
    return fetchJson<{ success: boolean; count: number; approvals: any[] }>(`${API_BASE}/api/workflow-approvals${qs}`);
  },
  respondWorkflowApproval: (approvalId: string, payload: { decision: 'APPROVE' | 'REJECT'; decidedBy?: string; comments?: string }) =>
    fetchJson<{ success: boolean; approval: any }>(`${API_BASE}/api/workflow-approvals/${approvalId}/respond`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  listWorkflowTemplates: () =>
    fetchJson<{ success: boolean; count: number; templates: any[] }>(`${API_BASE}/api/workflow-templates`),
  instantiateWorkflowTemplate: (templateId: string) =>
    fetchJson<{ success: boolean; workflow: any; version: any }>(`${API_BASE}/api/workflow-templates/${templateId}/instantiate`, { method: 'POST' }),
  planWorkflowNaturalLanguage: (prompt: string, scope?: string) =>
    fetchJson<{ success: boolean; workflow: any; version: any }>(`${API_BASE}/api/workflows/plan`, {
      method: 'POST',
      body: JSON.stringify({ prompt, scope }),
    }),
  explainWorkflow: (workflowId: string, runId?: string) => {
    const qs = runId ? `?runId=${runId}` : '';
    return fetchJson<{ success: boolean; explanation: any }>(`${API_BASE}/api/workflows/${workflowId}/explain${qs}`);
  },
  subscribeWorkflowEvents: (onMessage: (event: any) => void) => {
    const eventSource = new EventSource(`${API_BASE}/api/workflow-events`);
    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onMessage(data);
      } catch (err) {
        console.error('Failed to parse workflow SSE payload', err);
      }
    };
    return () => {
      eventSource.close();
    };
  },

  // FP-12: Universal Service & Account Integration Fabric
  listAccounts: (params?: { providerId?: string; status?: string }) => {
    const qs = new URLSearchParams(params as any).toString();
    return fetchJson<{ success: boolean; count: number; accounts: any[] }>(`${API_BASE}/api/accounts${qs ? `?${qs}` : ''}`);
  },
  getAccount: (id: string) =>
    fetchJson<{ success: boolean; account: any }>(`${API_BASE}/api/accounts/${id}`),
  connectAccount: (payload: { providerId: string; ownerIdentity?: string; scopeType?: string; requestedScopes?: string[] }) =>
    fetchJson<{ success: boolean; authorizationRequest: any }>(`${API_BASE}/api/accounts/connect`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  verifyAccount: (id: string) =>
    fetchJson<{ success: boolean; health: any }>(`${API_BASE}/api/accounts/${id}/verify`, { method: 'POST' }),
  refreshAccount: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`${API_BASE}/api/accounts/${id}/refresh`, { method: 'POST' }),
  revokeAccount: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`${API_BASE}/api/accounts/${id}/revoke`, { method: 'POST' }),
  deleteAccount: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`${API_BASE}/api/accounts/${id}`, { method: 'DELETE' }),
  getAccountHealth: (id: string) =>
    fetchJson<{ success: boolean; health: any }>(`${API_BASE}/api/accounts/${id}/health`),
  getAccountUsage: (id: string) =>
    fetchJson<{ success: boolean; usage: any }>(`${API_BASE}/api/accounts/${id}/usage`),
  listProviders: () =>
    fetchJson<{ success: boolean; count: number; providers: any[] }>(`${API_BASE}/api/providers`),
  getProvider: (id: string) =>
    fetchJson<{ success: boolean; provider: any }>(`${API_BASE}/api/providers/${id}`),
  getProviderCapabilities: (id: string) =>
    fetchJson<{ success: boolean; capabilities: any[] }>(`${API_BASE}/api/providers/${id}/capabilities`),
  resolveAccountIntent: (prompt: string, ownerIdentity?: string) =>
    fetchJson<{ success: boolean; result: any }>(`${API_BASE}/api/accounts/intent`, {
      method: 'POST',
      body: JSON.stringify({ prompt, ownerIdentity }),
    }),
  subscribeAccountEvents: (onMessage: (event: any) => void) => {
    const eventSource = new EventSource(`${API_BASE}/api/accounts/events/stream`);
    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onMessage(data);
      } catch (err) {
        console.error('Failed to parse account SSE payload', err);
      }
    };
    return () => {
      eventSource.close();
    };
  },

  // FP-13 Universal Digital Workspace & Application Operator
  getWorkspaces: () =>
    fetchJson<{ success: boolean; count: number; workspaces: any[] }>(`${API_BASE}/api/workspaces`),
  getWorkspace: (id: string) =>
    fetchJson<{ success: boolean; workspace: any }>(`${API_BASE}/api/workspaces/${id}`),
  connectWorkspace: (workspaceId: string, agentId?: string) =>
    fetchJson<{ success: boolean; sessionId: string; status: string }>(`${API_BASE}/api/workspaces/connect`, {
      method: 'POST',
      body: JSON.stringify({ workspaceId, agentId }),
    }),
  disconnectWorkspace: (id: string) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/api/workspaces/${id}/disconnect`, {
      method: 'POST',
    }),
  observeWorkspace: (id: string) =>
    fetchJson<{ success: boolean; observation: any }>(`${API_BASE}/api/workspaces/${id}/observe`, {
      method: 'POST',
    }),
  getWorkspaceApplications: (id: string) =>
    fetchJson<{ success: boolean; applications: any[] }>(`${API_BASE}/api/workspaces/${id}/applications`),
  getOperatorApplications: () =>
    fetchJson<{ success: boolean; count: number; applications: any[] }>(`${API_BASE}/api/applications`),
  launchApplication: (id: string, options?: any) =>
    fetchJson<{ success: boolean; session: any }>(`${API_BASE}/api/applications/${id}/launch`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    }),
  focusApplication: (id: string) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/api/applications/${id}/focus`, {
      method: 'POST',
    }),
  closeApplication: (id: string) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/api/applications/${id}/close`, {
      method: 'POST',
    }),
  resolveOperatorTarget: (workspaceId: string, request: any) =>
    fetchJson<{ success: boolean; resolution: any }>(`${API_BASE}/api/operator/resolve-target`, {
      method: 'POST',
      body: JSON.stringify({ workspaceId, request }),
    }),
  executeOperatorAction: (action: any) =>
    fetchJson<{ success: boolean; result: any }>(`${API_BASE}/api/operator/action`, {
      method: 'POST',
      body: JSON.stringify(action),
    }),
  subscribeOperatorEvents: (onMessage: (event: any) => void) => {
    const eventSource = new EventSource(`${API_BASE}/api/operator/events/stream`);
    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onMessage(data);
      } catch (err) {
        console.error('Failed to parse operator SSE payload', err);
      }
    };
    return () => {
      eventSource.close();
    };
  },

  // FP-14 Universal Agentic Mission & Workforce Runtime API
  getRuntimeMissions: () =>
    fetchJson<{ success: boolean; data: any[] }>(`${API_BASE}/api/missions`),
  submitMissionObjective: (objective: string, options?: any) =>
    fetchJson<{ success: boolean; data: any }>(`${API_BASE}/api/missions`, {
      method: 'POST',
      body: JSON.stringify({ objective, ...(options || {}) }),
    }),
  getRuntimeMission: (id: string) =>
    fetchJson<{ success: boolean; data: any }>(`${API_BASE}/api/missions/${id}`),
  startRuntimeMission: (id: string) =>
    fetchJson<{ success: boolean; data: any }>(`${API_BASE}/api/missions/${id}/start`, { method: 'POST' }),
  pauseRuntimeMission: (id: string, reason?: string) =>
    fetchJson<{ success: boolean; data: any }>(`${API_BASE}/api/missions/${id}/pause`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  resumeRuntimeMission: (id: string) =>
    fetchJson<{ success: boolean; data: any }>(`${API_BASE}/api/missions/${id}/resume`, { method: 'POST' }),
  cancelRuntimeMission: (id: string, reason?: string) =>
    fetchJson<{ success: boolean; data: any }>(`${API_BASE}/api/missions/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  replanRuntimeMission: (id: string, reason: string, author?: string) =>
    fetchJson<{ success: boolean; data: any }>(`${API_BASE}/api/missions/${id}/replan`, {
      method: 'POST',
      body: JSON.stringify({ reason, author }),
    }),
  approveMissionTask: (missionId: string, taskId: string, approvedBy?: string) =>
    fetchJson<{ success: boolean; message: string }>(`${API_BASE}/api/missions/${missionId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ taskId, approvedBy }),
    }),
  getRuntimeMissionOutcomes: (id: string) =>
    fetchJson<{ success: boolean; data: any[] }>(`${API_BASE}/api/missions/${id}/outcomes`),
  getRuntimeMissionTasks: (id: string) =>
    fetchJson<{ success: boolean; data: any[] }>(`${API_BASE}/api/missions/${id}/tasks`),
  getRuntimeMissionArtifacts: (id: string) =>
    fetchJson<{ success: boolean; data: any[] }>(`${API_BASE}/api/missions/${id}/artifacts`),
  getRuntimeMissionBlackboard: (id: string) =>
    fetchJson<{ success: boolean; data: any[] }>(`${API_BASE}/api/missions/${id}/blackboard`),
  getRuntimeMissionReport: (id: string) =>
    fetchJson<{ success: boolean; data: any }>(`${API_BASE}/api/missions/${id}/report`),
  getWorkforceCapacities: () =>
    fetchJson<{ success: boolean; data: any[] }>(`${API_BASE}/api/missions/workforce/capacities`),
  subscribeMissionEvents: (onMessage: (event: any) => void) => {
    const eventSource = new EventSource(`${API_BASE}/api/missions/events/stream`);
    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onMessage(data);
      } catch (err) {
        console.error('Failed to parse mission SSE payload', err);
      }
    };
    return () => {
      eventSource.close();
    };
  },

  subscribeEvents: (onMessage: (event: any) => void, onError?: (err: any) => void) => {
    const eventSource = new EventSource(`${API_BASE}/events`);
    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onMessage(data);
      } catch (err) {
        console.error('Failed to parse SSE payload', err);
      }
    };
    eventSource.onerror = (err) => {
      if (onError) onError(err);
    };
    return () => {
      eventSource.close();
    };
  },

  // FP-19 Persistent Distributed Execution API
  getExecutionSummary: () =>
    fetchJson<any>(`${API_BASE}/api/execution/summary`),
  getExecutionWorkers: () =>
    fetchJson<any>(`${API_BASE}/api/execution/workers`),
  getExecutionJobs: () =>
    fetchJson<any>(`${API_BASE}/api/execution/jobs`),
  pauseExecutionJob: (id: string) =>
    fetchJson<any>(`${API_BASE}/api/execution/jobs/${id}/pause`, { method: 'POST' }),
  resumeExecutionJob: (id: string) =>
    fetchJson<any>(`${API_BASE}/api/execution/jobs/${id}/resume`, { method: 'POST' }),
  cancelExecutionJob: (id: string) =>
    fetchJson<any>(`${API_BASE}/api/execution/jobs/${id}/cancel`, { method: 'POST' }),
  drainExecutionWorker: (id: string) =>
    fetchJson<any>(`${API_BASE}/api/workers/${id}/drain`, { method: 'POST' }),

  // Self-Evolution Engine API (Safe Self-Development)
  getEvolutionStatus: () =>
    fetchJson<any>(`${API_BASE}/api/evolution/status`),
  getEvolutionObjectives: () =>
    fetchJson<any>(`${API_BASE}/api/evolution/objectives`),
  getEvolutionObjective: (id: string) =>
    fetchJson<any>(`${API_BASE}/api/evolution/objectives/${id}`),
  createEvolutionObjective: (body: any) =>
    fetchJson<any>(`${API_BASE}/api/evolution/objectives`, { method: 'POST', body: JSON.stringify(body) }),
  deleteEvolutionObjective: (id: string) =>
    fetchJson<any>(`${API_BASE}/api/evolution/objectives/${id}`, { method: 'DELETE' }),
  cancelEvolutionObjective: (id: string) =>
    fetchJson<any>(`${API_BASE}/api/evolution/objectives/${id}/cancel`, { method: 'POST' }),
  resumeEvolutionObjective: (id: string) =>
    fetchJson<any>(`${API_BASE}/api/evolution/objectives/${id}/resume`, { method: 'POST' }),
  triggerEvolutionObjective: (id: string) =>
    fetchJson<any>(`${API_BASE}/api/evolution/objectives/${id}/trigger`, { method: 'POST' }),
  getEvolutionExperiments: (objectiveId?: string) =>
    fetchJson<any>(`${API_BASE}/api/evolution/experiments${objectiveId ? `?objectiveId=${encodeURIComponent(objectiveId)}` : ''}`),
  getEvolutionExperiment: (id: string) =>
    fetchJson<any>(`${API_BASE}/api/evolution/experiments/${id}`),
  getEvolutionCheckpoints: (objectiveId?: string) =>
    fetchJson<any>(`${API_BASE}/api/evolution/checkpoints${objectiveId ? `?objectiveId=${encodeURIComponent(objectiveId)}` : ''}`),
  getEvolutionAuditLogs: (limit?: number) =>
    fetchJson<any>(`${API_BASE}/api/evolution/audit-logs${limit ? `?limit=${limit}` : ''}`),
  pauseEvolution: () =>
    fetchJson<any>(`${API_BASE}/api/evolution/safety/pause`, { method: 'POST' }),
  resumeEvolution: () =>
    fetchJson<any>(`${API_BASE}/api/evolution/safety/resume`, { method: 'POST' }),
  cancelEvolution: () =>
    fetchJson<any>(`${API_BASE}/api/evolution/cancel`, { method: 'POST' }),
  emergencyStopEvolution: (reason?: string) =>
    fetchJson<any>(`${API_BASE}/api/evolution/safety/emergency-stop`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason || 'Sovereign Creator Directive: Instant Emergency Stop (RUSHIKESH)' }),
    }),
  promoteEvolutionExperiment: (id: string) =>
    fetchJson<any>(`${API_BASE}/api/evolution/experiments/${id}/promote`, { method: 'POST' }),
  subscribeEvolutionEvents: (onMessage: (event: any) => void, onError?: (err: any) => void) => {
    const eventSource = new EventSource(`${API_BASE}/api/evolution/events`);
    
    eventSource.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        onMessage(payload);
      } catch (err) {
        console.error('Failed to parse evolution SSE message payload', err);
      }
    };

    const eventNames = [
      'connected',
      'evolution.objective.created',
      'evolution.objective.progress',
      'evolution.experiment.started',
      'evolution.experiment.phase',
      'evolution.experiment.completed',
      'evolution.supervisor.evaluated',
      'evolution.log',
      'evolution.safety.paused',
      'evolution.safety.resumed',
      'evolution.safety.emergency_stopped',
    ];

    eventNames.forEach((name) => {
      eventSource.addEventListener(name, (e: any) => {
        try {
          const parsed = JSON.parse(e.data);
          onMessage({ type: name, data: parsed, timestamp: new Date().toISOString() });
        } catch (err) {
          console.error(`Failed to parse SSE event [${name}]`, err);
        }
      });
    });

    eventSource.onerror = (err) => {
      if (onError) onError(err);
    };
    return () => {
      eventSource.close();
    };
  },
};
