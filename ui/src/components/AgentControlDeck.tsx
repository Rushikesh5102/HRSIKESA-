import React, { useState, useEffect, useCallback } from 'react';
import {
  StopCircle,
  Pause,
  Play,
  FileCode,
  Folder,
  Terminal,
  Cpu,
  RefreshCw,
  Eye,
  AlertOctagon,
  MessageSquare,
  Shield,
  Layers,
  Code,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  FolderOpen,
} from 'lucide-react';
import { MissionInfo, TaskInfo } from '../types/api.types';
import { api } from '../services/api';
import { IndianFrame } from './IndianFrame';

interface WorkspaceFile {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  extension: string;
  modifiedAt: string;
}

interface AgentControlDeckProps {
  activeMission?: MissionInfo;
  activeTasks?: TaskInfo[];
  onRefresh?: () => void;
}

export const AgentControlDeck: React.FC<AgentControlDeckProps> = ({
  activeMission,
  activeTasks = [],
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'files' | 'terminal' | 'telemetry'>('files');
  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<{ path: string; name: string; content: string; size: number } | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [interventionText, setInterventionText] = useState('');
  const [showInterveneModal, setShowInterveneModal] = useState(false);

  // Load workspace project files
  const loadFiles = useCallback(async () => {
    setLoadingFiles(true);
    try {
      const res = await api.getWorkspaceFiles();
      if (res && res.files) {
        setWorkspaceFiles(res.files);
      }
    } catch (err) {
      console.warn('Failed to load workspace files', err);
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
    const interval = setInterval(loadFiles, 4000);
    return () => clearInterval(interval);
  }, [loadFiles]);

  // Open file for code preview
  const handleOpenFile = async (file: WorkspaceFile) => {
    if (file.isDirectory) return;
    setLoadingContent(true);
    try {
      const res = await api.getWorkspaceFile(file.path);
      if (res && res.content !== undefined) {
        setSelectedFile(res);
      }
    } catch (err) {
      console.error('Failed to read file content', err);
    } finally {
      setLoadingContent(false);
    }
  };

  // Sovereign Controls: Emergency Abort
  const handleEmergencyAbort = async () => {
    if (!activeMission) return;
    if (!window.confirm('Are you sure you want to trigger an EMERGENCY STOP? This will immediately abort all active agent processes.')) {
      return;
    }
    setActionLoading(true);
    try {
      await api.abortMission(activeMission.id, 'Emergency Stop by Master Rushikesh');
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Abort failed', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Sovereign Controls: Pause / Resume
  const handleTogglePause = async () => {
    if (!activeMission) return;
    setActionLoading(true);
    try {
      if (activeMission.status === 'RUNNING') {
        await api.pauseMission(activeMission.id);
      } else {
        await api.resumeMission(activeMission.id);
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Toggle pause failed', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Sovereign Controls: Intervene
  const handleIntervene = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMission || !interventionText.trim()) return;
    setActionLoading(true);
    try {
      await api.resumeMission(activeMission.id, interventionText.trim());
      setInterventionText('');
      setShowInterveneModal(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Intervention failed', err);
    } finally {
      setActionLoading(false);
    }
  };

  const isMissionRunning = activeMission?.status === 'RUNNING';
  const isMissionPaused = activeMission?.status === 'paused';

  // Determine current active agent name and function
  const currentTask = activeTasks.find((t) => t.status === 'RUNNING') || activeTasks[0];
  const activeAgentName = currentTask?.assignedAgent ? currentTask.assignedAgent.toUpperCase() : activeMission?.rootAgentId ? activeMission.rootAgentId.toUpperCase() : 'IDLE (READY)';
  const activeToolName = currentTask ? (currentTask.toolUsage?.[0] || 'filesystem.write_file') : 'Autonomous Engine Standing By';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
      {/* Real-time Agent Telemetry & Sovereign Master Control Strip */}
      <IndianFrame variant="accent" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          {/* Active Agent & Tool Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--accent-saffron), var(--accent-gold))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#060810',
                boxShadow: '0 0 16px var(--accent-gold-glow)',
              }}
            >
              <Cpu size={22} className={isMissionRunning ? 'animate-pulse-ring' : ''} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Active Agent: {activeAgentName}
                </span>
                <span className={`badge ${isMissionRunning ? 'badge-running' : isMissionPaused ? 'badge-warning' : 'badge-online'}`}>
                  {isMissionRunning ? '● Live Executing' : isMissionPaused ? '❚❚ Paused' : 'Ready'}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '12px', marginTop: '2px' }}>
                <span>Function: <code style={{ color: 'var(--text-gold)', background: 'var(--bg-elevated)', padding: '1px 5px', borderRadius: '3px' }}>{activeToolName}</code></span>
                <span>Model: <span style={{ color: 'var(--accent-sapphire)' }}>qwen2.5:7b (Local Ollama)</span></span>
                <span>Language: <span style={{ color: '#10B981' }}>TypeScript / Node.js</span></span>
              </div>
            </div>
          </div>

          {/* Master Sovereign Control Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {activeMission && (
              <>
                <button
                  onClick={handleTogglePause}
                  disabled={actionLoading}
                  className="btn btn-secondary"
                  style={{ padding: '7px 14px', fontSize: '12.5px' }}
                  title={isMissionRunning ? 'Pause agent execution' : 'Resume agent execution'}
                >
                  {isMissionRunning ? <Pause size={14} color="var(--accent-saffron-light)" /> : <Play size={14} color="#10B981" />}
                  <span>{isMissionRunning ? 'Pause' : 'Resume'}</span>
                </button>

                <button
                  onClick={() => setShowInterveneModal(true)}
                  className="btn btn-secondary"
                  style={{ padding: '7px 14px', fontSize: '12.5px' }}
                  title="Inject live instructions or redirect the agent"
                >
                  <MessageSquare size={14} color="var(--accent-sapphire)" />
                  <span>Intervene</span>
                </button>

                <button
                  onClick={handleEmergencyAbort}
                  disabled={actionLoading}
                  className="btn btn-danger"
                  style={{ padding: '7px 14px', fontSize: '12.5px' }}
                  title="Instantly stop and terminate active agent process"
                >
                  <StopCircle size={15} />
                  <span>Emergency Stop</span>
                </button>
              </>
            )}

            <button
              onClick={loadFiles}
              className="btn btn-secondary"
              style={{ padding: '7px 10px' }}
              title="Refresh Workspace Files"
            >
              <RefreshCw size={14} className={loadingFiles ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </IndianFrame>

      {/* Main Workspace Panels: Filesystem Tree & Code Previewer */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '14px', height: '480px' }}>
        {/* Left: Live Project Filesystem Tree */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-glass)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FolderOpen size={16} color="var(--accent-gold)" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Live Project Files</span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{workspaceFiles.length} items</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {workspaceFiles.length === 0 ? (
              <div style={{ padding: '30px 12px', textAlign: 'center', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                {loadingFiles ? 'Scanning workspace directory...' : 'No files created yet.'}
              </div>
            ) : (
              workspaceFiles.map((f) => {
                const isSelected = selectedFile?.path === f.path;
                return (
                  <div
                    key={f.path}
                    onClick={() => handleOpenFile(f)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'rgba(245, 158, 11, 0.18)' : 'transparent',
                      border: isSelected ? '1px solid var(--border-accent)' : '1px solid transparent',
                      cursor: f.isDirectory ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12.5px',
                      color: f.isDirectory ? 'var(--text-gold)' : 'var(--text-primary)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {f.isDirectory ? <Folder size={15} color="var(--accent-gold)" /> : <FileCode size={15} color="var(--accent-sapphire)" />}
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.name}
                    </span>
                    {!f.isDirectory && (
                      <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                        {(f.size / 1024).toFixed(1)} KB
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Live In-Browser Code & Content Viewer */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '12px 18px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-glass)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Code size={16} color="var(--accent-sapphire)" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {selectedFile ? selectedFile.name : 'Code / File Inspector'}
              </span>
              {selectedFile && (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  ({selectedFile.path})
                </span>
              )}
            </div>

            {selectedFile && (
              <span style={{ fontSize: '11px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={12} /> Live Synced from Disk
              </span>
            )}
          </div>

          <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg-input)', padding: '14px' }}>
            {loadingContent ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-gold)', fontSize: '13px' }}>
                Reading file content from disk...
              </div>
            ) : selectedFile ? (
              <pre
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12.5px',
                  lineHeight: '1.6',
                  color: '#E2E8F0',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                <code>{selectedFile.content}</code>
              </pre>
            ) : (
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  gap: '10px',
                }}
              >
                <FileCode size={36} style={{ opacity: 0.4 }} />
                <span style={{ fontSize: '13px' }}>Click any project file on the left to inspect its code in real time</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Intervention Modal */}
      {showInterveneModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            style={{
              width: '520px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-accent)',
              borderRadius: 'var(--radius-md)',
              padding: '24px',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-gold)', marginBottom: '8px' }}>
              ✏️ Sovereign Master Intervention
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Inject an immediate directive or steering instruction to guide the active agent's work.
            </p>

            <form onSubmit={handleIntervene}>
              <textarea
                value={interventionText}
                onChange={(e) => setInterventionText(e.target.value)}
                placeholder="E.g., Stop working on the styling, focus on adding the square root and memory buttons in calculator.js..."
                rows={4}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 12px',
                  color: 'var(--text-primary)',
                  fontSize: '13.5px',
                  outline: 'none',
                  resize: 'vertical',
                  marginBottom: '16px',
                }}
                autoFocus
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowInterveneModal(false)}
                  className="btn btn-secondary"
                  style={{ fontSize: '12.5px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!interventionText.trim() || actionLoading}
                  className="btn btn-primary"
                  style={{ fontSize: '12.5px' }}
                >
                  Send Directive to Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
