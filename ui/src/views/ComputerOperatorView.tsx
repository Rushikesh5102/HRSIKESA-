import React, { useState, useEffect } from 'react';
import {
  Monitor,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Layers,
  Crosshair,
  ShieldCheck,
  RefreshCw,
  Search,
  Eye,
  FileText,
  Activity,
  Maximize2
} from 'lucide-react';

interface ComputerStatus {
  status: string;
  activeContext?: {
    applicationName: string;
    processId: number;
    windowTitle: string;
    scope: string;
  };
  latestObservation?: {
    active_window_title: string;
    active_process_name: string;
    node_count: number;
    screen_width: number;
    screen_height: number;
    observation_summary: string;
    created_at: string;
  };
  recentTasks: any[];
}

interface ComputerOperatorViewProps {
  envStatus?: any;
}

export const ComputerOperatorView: React.FC<ComputerOperatorViewProps> = ({ envStatus }) => {
  const [statusData, setStatusData] = useState<ComputerStatus | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [actionHistory, setActionHistory] = useState<any[]>([]);
  const [observation, setObservation] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'observation' | 'tasks' | 'sandbox'>('overview');

  // Sandbox inputs
  const [targetQuery, setTargetQuery] = useState('Save');
  const [actionType, setActionType] = useState('CLICK');
  const [actionParamText, setActionParamText] = useState('');
  const [newIntent, setNewIntent] = useState('Automated Document Workflow');
  const [newObjective, setNewObjective] = useState('Open Notepad, type "HṚṢĪKEŚA Computer Operator Live Test", save file and close');

  const fetchStatus = async () => {
    try {
      const res = await fetch('/computer/status');
      if (res.ok) {
        const data = await res.json();
        setStatusData(data);
      }
    } catch (e) {
      console.error('Error fetching computer status', e);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch('/computer/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (e) {
      console.error('Error fetching computer tasks', e);
    }
  };

  const fetchObservation = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/computer/observation');
      if (res.ok) {
        const data = await res.json();
        setObservation(data.observation);
      }
    } catch (e) {
      console.error('Error fetching observation', e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTaskDetails = async (taskId: string) => {
    try {
      const res = await fetch(`/computer/tasks/${taskId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTask(data.task);
        setActionHistory(data.actions || []);
      }
    } catch (e) {
      console.error('Error fetching task details', e);
    }
  };

  const handleLaunchTask = async () => {
    if (!newObjective.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch('/computer/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: newIntent,
          objective: newObjective,
          maxActions: 20,
        }),
      });
      if (res.ok) {
        await fetchTasks();
        await fetchStatus();
      }
    } catch (e) {
      console.error('Error launching task', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (taskId: string) => {
    try {
      const res = await fetch(`/computer/tasks/${taskId}/approve`, { method: 'POST' });
      if (res.ok) {
        await fetchTasks();
        if (selectedTask?.id === taskId) {
          await fetchTaskDetails(taskId);
        }
      }
    } catch (e) {
      console.error('Error approving task', e);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchTasks();
    fetchObservation();
    const interval = setInterval(() => {
      fetchStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
            <Monitor className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              HṚṢĪKEŚA Computer Operator
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Phase 22 Active
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Autonomous desktop perception, UI Automation resolution, verified actions & safe recovery
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => { fetchStatus(); fetchObservation(); fetchTasks(); }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center space-x-3">
          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Active Application</div>
            <div className="text-sm font-semibold text-white truncate max-w-[150px]">
              {statusData?.activeContext?.applicationName || 'explorer.exe'}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Safety Boundary</div>
            <div className="text-sm font-semibold text-emerald-400">
              Governed (HITL Active)
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">UI Controls Observable</div>
            <div className="text-sm font-semibold text-white">
              {observation?.nodeCount || statusData?.latestObservation?.node_count || 0} Nodes
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center space-x-3">
          <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-lg">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Tasks</div>
            <div className="text-sm font-semibold text-white">{tasks.length} Executed</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-800 space-x-4">
        {(['overview', 'observation', 'tasks', 'sandbox'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-medium transition capitalize ${
              activeTab === tab
                ? 'text-indigo-400 border-b-2 border-indigo-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Context Card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-indigo-400" />
                Live Foreground Window State
              </h2>
              <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Window Title:</span>
                  <span className="text-white font-medium">{statusData?.activeContext?.windowTitle || 'Desktop Background'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Process Name:</span>
                  <span className="text-indigo-300 font-mono">{statusData?.activeContext?.applicationName || 'explorer.exe'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Process ID (PID):</span>
                  <span className="text-slate-300 font-mono">{statusData?.activeContext?.processId || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Scope Level:</span>
                  <span className="text-emerald-400 font-medium">{statusData?.activeContext?.scope || 'DESKTOP'}</span>
                </div>
              </div>
            </div>

            {/* Launch Autonomous Task Form */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Play className="w-4 h-4 text-emerald-400" />
                Launch Governed Computer Task
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 font-medium">Intent</label>
                  <input
                    type="text"
                    value={newIntent}
                    onChange={(e) => setNewIntent(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium">Objective Workflow</label>
                  <textarea
                    rows={2}
                    value={newObjective}
                    onChange={(e) => setNewObjective(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  onClick={handleLaunchTask}
                  disabled={isLoading}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition disabled:opacity-50"
                >
                  {isLoading ? 'Executing Workflow...' : 'Execute Task with Verification'}
                </button>
              </div>
            </div>
          </div>

          {/* Recent Tasks List */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              Recent Operator Tasks
            </h2>
            <div className="space-y-2.5 max-h-[400px] overflow-y-auto">
              {tasks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => fetchTaskDetails(t.id)}
                  className={`p-3 rounded-xl border transition cursor-pointer text-xs space-y-1 ${
                    selectedTask?.id === t.id
                      ? 'bg-indigo-500/10 border-indigo-500/50'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-white truncate max-w-[150px]">{t.intent}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        t.status === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : t.status === 'PENDING_APPROVAL'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">{t.objective}</div>
                  {t.status === 'PENDING_APPROVAL' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleApprove(t.id); }}
                      className="mt-2 w-full py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-bold"
                    >
                      Approve Consequential Action
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Observation Explorer Tab */}
      {activeTab === 'observation' && (
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Eye className="w-4 h-4 text-indigo-400" />
              Live Desktop Semantic Controls Tree
            </h2>
            <button
              onClick={fetchObservation}
              className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300"
            >
              Re-scan Tree
            </button>
          </div>

          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 max-h-[500px] overflow-y-auto">
            {observation?.activeWindow?.controls?.length ? (
              <div className="space-y-1 font-mono text-xs">
                {observation.activeWindow.controls.map((c: any) => (
                  <div key={c.id} className="p-2 rounded bg-slate-900/80 border border-slate-800/80 flex justify-between items-center">
                    <div>
                      <span className="text-indigo-400 font-semibold">{c.controlType}</span>{' '}
                      <span className="text-white">"{c.name}"</span>{' '}
                      {c.automationId && <span className="text-slate-500 text-[10px]">({c.automationId})</span>}
                    </div>
                    {c.bounds && (
                      <span className="text-slate-400 text-[10px]">
                        [{c.bounds.x},{c.bounds.y} {c.bounds.width}x{c.bounds.height}]
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 text-xs">
                No active UI Automation controls discovered in current window.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Task & Action History Tab */}
      {activeTab === 'tasks' && (
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            Transaction Action Ledger
          </h2>
          {actionHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Target</th>
                    <th className="p-3">Method</th>
                    <th className="p-3">Verification Strategy</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {actionHistory.map((act) => (
                    <tr key={act.id} className="hover:bg-slate-800/30">
                      <td className="p-3 font-mono">{act.sequence_number}</td>
                      <td className="p-3 font-semibold text-indigo-400">{act.action_type}</td>
                      <td className="p-3 text-white truncate max-w-[150px]">{act.target_description || '-'}</td>
                      <td className="p-3 text-slate-400">{act.resolution_method || '-'}</td>
                      <td className="p-3 font-mono text-[11px] text-slate-300">{act.verification_strategy || '-'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          act.execution_status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {act.execution_status}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-400">{act.duration_ms}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 text-xs">
              Select a task from Overview or launch a task to view execution transactions.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
