import React, { useState, useEffect, useCallback } from 'react';
import {
  Monitor,
  Layout,
  Terminal,
  Globe,
  Code2,
  Server,
  Play,
  Square,
  Eye,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Search,
  RefreshCw,
  Layers,
  Lock,
  Zap,
  Activity,
  Maximize2,
  Sparkles,
  FileCheck,
  RotateCcw,
} from 'lucide-react';
import { api } from '../services/api';
import { IndianFrame } from '../components/IndianFrame';

interface WorkspaceDescriptor {
  workspaceId: string;
  name: string;
  workspaceType: string;
  status: string;
  targetUri?: string;
  capabilities: Record<string, boolean>;
  resourceUsage: { cpuPercent?: number; memoryMb?: number };
  activeApplicationId?: string | null;
  isAuthenticated: boolean;
}

interface ApplicationItem {
  applicationId: string;
  name: string;
  displayName: string;
  category: string;
  workspaceId: string;
  readinessState: string;
  healthStatus: string;
  capabilities: string[];
}

interface WorkspaceObservation {
  observationId: string;
  workspaceId: string;
  activeWindowTitle?: string;
  activeApplicationId?: string;
  uiTree: Array<{
    elementId: string;
    name: string;
    role: string;
    controlType?: string;
    value?: string;
    isFocused?: boolean;
    isPassword?: boolean;
  }>;
  ocrText?: string;
  screenshotRef?: string;
  confidence: string;
  observedLayers: string[];
  capturedAt: string;
  hasModal?: boolean;
  hasSecurityChallenge?: boolean;
}

export const DigitalWorkspaceView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'workspaces' | 'apps' | 'operator' | 'timeline' | 'patterns'>('workspaces');
  const [workspaces, setWorkspaces] = useState<WorkspaceDescriptor[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('local_windows_main');
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [currentObservation, setCurrentObservation] = useState<WorkspaceObservation | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [actionPrompt, setActionPrompt] = useState<string>('');
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  const fetchWorkspaces = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getWorkspaces();
      if (res && res.workspaces) {
        setWorkspaces(res.workspaces);
      }
    } catch (e) {
      console.error('Failed to load workspaces', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchApplications = useCallback(async (wsId: string) => {
    try {
      const res = await api.getWorkspaceApplications(wsId);
      if (res && res.applications) {
        setApplications(res.applications);
      }
    } catch (e) {
      console.error('Failed to load applications', e);
    }
  }, []);

  const captureObservation = useCallback(async (wsId: string) => {
    setLoading(true);
    try {
      const res = await api.observeWorkspace(wsId);
      if (res && res.observation) {
        setCurrentObservation(res.observation);
      }
    } catch (e) {
      console.error('Failed to capture observation', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  useEffect(() => {
    if (selectedWorkspaceId) {
      fetchApplications(selectedWorkspaceId);
      captureObservation(selectedWorkspaceId);
    }
  }, [selectedWorkspaceId, fetchApplications, captureObservation]);

  const handleConnect = async (wsId: string) => {
    try {
      await api.connectWorkspace(wsId, 'agent_user');
      fetchWorkspaces();
    } catch (e) {
      console.error('Connect failed', e);
    }
  };

  const handleDisconnect = async (wsId: string) => {
    try {
      await api.disconnectWorkspace(wsId);
      fetchWorkspaces();
    } catch (e) {
      console.error('Disconnect failed', e);
    }
  };

  const handleLaunchApp = async (appId: string) => {
    try {
      await api.launchApplication(appId, { workspaceId: selectedWorkspaceId });
      fetchApplications(selectedWorkspaceId);
      captureObservation(selectedWorkspaceId);
    } catch (e) {
      console.error('Launch failed', e);
    }
  };

  const handleExecuteAction = async () => {
    if (!actionPrompt.trim()) return;
    setActionStatus('Executing action with precondition checks and post-action verification...');
    try {
      const res = await api.executeOperatorAction({
        actionId: `act_ui_${Date.now()}`,
        workspaceId: selectedWorkspaceId,
        actionType: 'CLICK',
        riskLevel: 'TIER_1_READ',
        target: { textLabel: actionPrompt },
        parameters: { prompt: actionPrompt },
        confidence: 'HIGH',
      });
      if (res && res.result) {
        setActionStatus(`Result: ${res.result.status} (Verified: ${res.result.isVerified ? 'YES' : 'NO'})`);
      }
      captureObservation(selectedWorkspaceId);
    } catch (err: any) {
      setActionStatus(`Error: ${err.message}`);
    }
  };

  const getWorkspaceIcon = (type: string) => {
    switch (type) {
      case 'LOCAL_WINDOWS':
        return <Monitor className="w-5 h-5 text-amber-400" />;
      case 'BROWSER':
        return <Globe className="w-5 h-5 text-teal-400" />;
      case 'TERMINAL':
        return <Terminal className="w-5 h-5 text-emerald-400" />;
      case 'IDE':
        return <Code2 className="w-5 h-5 text-cyan-400" />;
      case 'VDI':
      case 'RDP':
        return <Server className="w-5 h-5 text-purple-400" />;
      default:
        return <Layout className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0d14] text-[#d1d5db] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#2d3748] bg-[#0f1422]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <Monitor className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-wide text-white">Universal Digital Workspace & Operator</h1>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                FP-13
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Observe → Understand → Act → Observe → Verify orchestration across GUI, Browser, Terminal, IDE & VDI
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchWorkspaces();
              if (selectedWorkspaceId) captureObservation(selectedWorkspaceId);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-[#1e2638] hover:bg-[#28334a] text-gray-200 border border-[#2d3748] transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center px-6 border-b border-[#2d3748] bg-[#0c101c]">
        <button
          onClick={() => setActiveTab('workspaces')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition ${
            activeTab === 'workspaces'
              ? 'border-amber-400 text-amber-400 bg-amber-500/5'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          Workspaces ({workspaces.length})
        </button>
        <button
          onClick={() => setActiveTab('apps')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition ${
            activeTab === 'apps'
              ? 'border-amber-400 text-amber-400 bg-amber-500/5'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Layout className="w-4 h-4" />
          Applications ({applications.length})
        </button>
        <button
          onClick={() => setActiveTab('operator')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition ${
            activeTab === 'operator'
              ? 'border-amber-400 text-amber-400 bg-amber-500/5'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Zap className="w-4 h-4" />
          Live Operator & Observation
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'workspaces' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces.map((ws) => (
              <div
                key={ws.workspaceId}
                onClick={() => setSelectedWorkspaceId(ws.workspaceId)}
                className={`p-5 rounded-xl border transition cursor-pointer ${
                  selectedWorkspaceId === ws.workspaceId
                    ? 'bg-[#151c2e] border-amber-500/60 ring-1 ring-amber-500/30'
                    : 'bg-[#101524] border-[#252f44] hover:border-[#3b4764]'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    {getWorkspaceIcon(ws.workspaceType)}
                    <div>
                      <h3 className="text-sm font-semibold text-white">{ws.name}</h3>
                      <p className="text-[11px] text-gray-400 font-mono">{ws.workspaceType}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                      ws.status === 'AVAILABLE' || ws.status === 'READY' || ws.status === 'CONNECTED'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {ws.status}
                  </span>
                </div>

                <p className="text-xs text-gray-400 mb-4 line-clamp-2">
                  Target URI: <span className="font-mono text-gray-300">{ws.targetUri || 'Local System'}</span>
                </p>

                <div className="grid grid-cols-2 gap-2 mb-4 p-2.5 rounded-lg bg-[#0a0d16] border border-[#1e2638] text-[11px]">
                  <div>
                    <span className="text-gray-500">CPU Usage:</span>
                    <span className="ml-1 text-gray-300 font-medium">{ws.resourceUsage?.cpuPercent || 0}%</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Memory:</span>
                    <span className="ml-1 text-gray-300 font-medium">{ws.resourceUsage?.memoryMb || 0} MB</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#1e2638]">
                  <span className="text-[11px] text-gray-500 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-teal-400" />
                    {ws.isAuthenticated ? 'Authenticated' : 'Unauthenticated'}
                  </span>
                  <div className="flex gap-2">
                    {ws.status === 'CONNECTED' || ws.status === 'READY' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDisconnect(ws.workspaceId);
                        }}
                        className="px-2.5 py-1 text-xs rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConnect(ws.workspaceId);
                        }}
                        className="px-2.5 py-1 text-xs rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'apps' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search discovered applications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-[#101524] border border-[#252f44] text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {applications
                .filter((a) => a.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((app) => (
                  <div key={app.applicationId} className="p-4 rounded-xl bg-[#101524] border border-[#252f44] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-white">{app.displayName}</h4>
                        <span className="px-2 py-0.5 text-[10px] rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {app.readinessState}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 font-mono mb-2">{app.category}</p>
                      <div className="flex flex-wrap gap-1 mb-4">
                        {app.capabilities.map((c) => (
                          <span key={c} className="px-1.5 py-0.5 text-[9px] rounded bg-[#1c2438] text-gray-300">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => handleLaunchApp(app.applicationId)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Launch & Verify Readiness
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {activeTab === 'operator' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Control & Action Dispatch Panel */}
            <div className="lg:col-span-1 space-y-4">
              <div className="p-4 rounded-xl bg-[#101524] border border-[#252f44]">
                <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Operator Command Center
                </h3>
                <p className="text-xs text-gray-400 mb-4">
                  Execute target-resolved, verified actions with automatic loop prevention and safe fallback.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Target Element / Intent</label>
                    <input
                      type="text"
                      placeholder="e.g. Save, Text Editor, Submit Order"
                      value={actionPrompt}
                      onChange={(e) => setActionPrompt(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-[#0a0d16] border border-[#252f44] text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <button
                    onClick={handleExecuteAction}
                    className="w-full py-2 text-xs font-semibold rounded-lg bg-amber-500 text-black hover:bg-amber-400 transition"
                  >
                    Execute Verified Action
                  </button>

                  {actionStatus && (
                    <div className="p-2.5 rounded bg-[#151c2e] border border-amber-500/30 text-xs text-amber-300 font-mono">
                      {actionStatus}
                    </div>
                  )}
                </div>
              </div>

              {/* Observation Layers */}
              {currentObservation && (
                <div className="p-4 rounded-xl bg-[#101524] border border-[#252f44]">
                  <h3 className="text-sm font-semibold text-white mb-2">Observation Confidence & Layers</h3>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      Confidence: {currentObservation.confidence}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">
                      Elements: {currentObservation.uiTree?.length || 0}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {currentObservation.observedLayers?.map((layer) => (
                      <span key={layer} className="px-2 py-0.5 text-[10px] rounded bg-[#1e2638] text-teal-300 font-mono">
                        {layer}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Live Observation Inspector */}
            <div className="lg:col-span-2 space-y-4">
              <div className="p-4 rounded-xl bg-[#101524] border border-[#252f44]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Eye className="w-4 h-4 text-teal-400" />
                    Live Workspace Observation
                  </h3>
                  <span className="text-xs text-gray-400 font-mono">
                    Window: {currentObservation?.activeWindowTitle || 'None'}
                  </span>
                </div>

                {currentObservation ? (
                  <div className="space-y-4">
                    {/* UI Element Tree */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 mb-2">Resolved UI Tree Elements</h4>
                      <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                        {currentObservation.uiTree?.map((elem, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded bg-[#0a0d16] border border-[#1e2638] flex items-center justify-between text-xs font-mono"
                          >
                            <span className="text-amber-300 font-medium">{elem.name || 'Unnamed Element'}</span>
                            <div className="flex gap-2 text-[10px]">
                              <span className="text-gray-400">role: {elem.role}</span>
                              {elem.isFocused && <span className="text-emerald-400 font-bold">[FOCUSED]</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* OCR Text */}
                    {currentObservation.ocrText && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-400 mb-1">OCR Text Stream</h4>
                        <div className="p-2.5 rounded bg-[#0a0d16] border border-[#1e2638] text-xs text-gray-300 font-mono">
                          {currentObservation.ocrText}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-gray-500">
                    No active observation recorded for this workspace.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
