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
  FileText,
  Folder,
  FolderOpen,
  File,
  Copy,
  Save,
  ChevronRight,
  ChevronDown,
  Plus,
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

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  sizeBytes?: number;
  children?: FileNode[];
}

interface DigitalWorkspaceViewProps {
  initialTab?: 'files' | 'workspaces' | 'apps' | 'operator';
}

export const DigitalWorkspaceView: React.FC<DigitalWorkspaceViewProps> = ({ initialTab = 'files' }) => {
  const [activeTab, setActiveTab] = useState<'files' | 'workspaces' | 'apps' | 'operator'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [workspaces, setWorkspaces] = useState<WorkspaceDescriptor[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('local_windows_main');
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [currentObservation, setCurrentObservation] = useState<WorkspaceObservation | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [actionPrompt, setActionPrompt] = useState<string>('');
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  // Files Tab State
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [activeFileContent, setActiveFileContent] = useState<string>('');
  const [fileLoading, setFileLoading] = useState<boolean>(false);
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [fileSearchQuery, setFileSearchQuery] = useState<string>('');
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

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

  const loadFileTree = useCallback(async () => {
    setFileLoading(true);
    try {
      const resp = await fetch('/api/ide/files?maxDepth=4');
      const data = await resp.json();
      if (data.success && data.files) {
        setFileTree(data.files);
        // If no file selected, select the first available file
        if (!activeFilePath && data.files.length > 0) {
          const findFirstFile = (nodes: FileNode[]): string | null => {
            for (const n of nodes) {
              if (n.type === 'file') return n.path;
              if (n.children) {
                const found = findFirstFile(n.children);
                if (found) return found;
              }
            }
            return null;
          };
          const first = findFirstFile(data.files);
          if (first) {
            loadFileContent(first);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load file tree', e);
    } finally {
      setFileLoading(false);
    }
  }, [activeFilePath]);

  const loadFileContent = async (filePath: string) => {
    setActiveFilePath(filePath);
    setFileLoading(true);
    setSaveStatus(null);
    try {
      const resp = await fetch(`/api/ide/file?path=${encodeURIComponent(filePath)}`);
      const data = await resp.json();
      if (data.success) {
        setActiveFileContent(data.content || '');
      } else {
        setActiveFileContent(`// Error reading file: ${data.error || 'Unknown error'}`);
      }
    } catch (e: any) {
      setActiveFileContent(`// Failed to fetch file: ${e.message}`);
    } finally {
      setFileLoading(false);
    }
  };

  const handleSaveFile = async () => {
    if (!activeFilePath) return;
    setSaveStatus('Saving...');
    try {
      const resp = await fetch('/api/ide/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: activeFilePath, content: activeFileContent }),
      });
      const data = await resp.json();
      if (data.success) {
        setSaveStatus('Saved successfully');
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus(`Save error: ${data.error || 'Failed'}`);
      }
    } catch (e: any) {
      setSaveStatus(`Save error: ${e.message}`);
    }
  };

  const handleCopyContent = () => {
    if (!activeFileContent) return;
    navigator.clipboard.writeText(activeFileContent);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  useEffect(() => {
    fetchWorkspaces();
    loadFileTree();
  }, [fetchWorkspaces, loadFileTree]);

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
      console.error('Failed to connect workspace', e);
    }
  };

  const handleDisconnect = async (wsId: string) => {
    try {
      await api.disconnectWorkspace(wsId);
      fetchWorkspaces();
    } catch (e) {
      console.error('Failed to disconnect workspace', e);
    }
  };

  const handleLaunchApp = async (appId: string) => {
    try {
      await api.launchApplication(appId);
      fetchApplications(selectedWorkspaceId);
      captureObservation(selectedWorkspaceId);
    } catch (e) {
      console.error('Failed to launch application', e);
    }
  };

  const handleExecuteAction = async () => {
    if (!actionPrompt.trim()) return;
    setActionStatus('Executing action...');
    try {
      const res = await api.executeOperatorAction({
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
        return <Monitor size={18} style={{ color: 'var(--accent-gold)' }} />;
      case 'BROWSER':
        return <Globe size={18} style={{ color: 'var(--accent-teal)' }} />;
      case 'TERMINAL':
        return <Terminal size={18} style={{ color: '#34d399' }} />;
      case 'IDE':
        return <Code2 size={18} style={{ color: '#38bdf8' }} />;
      case 'VDI':
      case 'RDP':
        return <Server size={18} style={{ color: '#c084fc' }} />;
      default:
        return <Layout size={18} style={{ color: 'var(--accent-gold)' }} />;
    }
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) return <Code2 size={13} color="#38bdf8" />;
    if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) return <Code2 size={13} color="#fbbf24" />;
    if (fileName.endsWith('.json')) return <FileText size={13} color="#f59e0b" />;
    if (fileName.endsWith('.md')) return <FileText size={13} color="#34d399" />;
    if (fileName.endsWith('.css')) return <FileText size={13} color="#818cf8" />;
    return <File size={13} color="var(--text-muted)" />;
  };

  const toggleFolder = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedFolders((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const renderFileTree = (nodes: FileNode[], depth = 0) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {nodes.map((node) => {
          const isDir = node.type === 'directory';
          const isCollapsed = collapsedFolders[node.path];
          const isSelected = activeFilePath === node.path;

          if (
            fileSearchQuery &&
            !node.name.toLowerCase().includes(fileSearchQuery.toLowerCase()) &&
            !node.children?.some((c) => c.name.toLowerCase().includes(fileSearchQuery.toLowerCase()))
          ) {
            return null;
          }

          return (
            <div key={node.path}>
              <div
                onClick={(e) => {
                  if (isDir) {
                    toggleFolder(node.path, e);
                  } else {
                    loadFileContent(node.path);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 8px',
                  paddingLeft: `${depth * 14 + 8}px`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
                  border: isSelected ? '1px solid rgba(212, 175, 55, 0.3)' : '1px solid transparent',
                  color: isSelected ? 'var(--accent-gold)' : 'var(--text-primary)',
                  fontSize: '12px',
                  userSelect: 'none',
                }}
              >
                {isDir ? (
                  <>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                    </span>
                    {isCollapsed ? (
                      <Folder size={14} style={{ color: 'var(--accent-gold)', opacity: 0.8 }} />
                    ) : (
                      <FolderOpen size={14} style={{ color: 'var(--accent-gold)' }} />
                    )}
                  </>
                ) : (
                  <>
                    <span style={{ width: '12px' }} />
                    {getFileIcon(node.name)}
                  </>
                )}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {node.name}
                </span>
              </div>

              {isDir && !isCollapsed && node.children && renderFileTree(node.children, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        overflow: 'hidden',
      }}
    >
      {/* Top Banner */}
      <div style={{ padding: '20px 24px 0' }}>
        <IndianFrame>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              padding: '18px 24px',
              background: 'var(--bg-glass)',
              backdropFilter: 'blur(16px)',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  padding: '10px',
                  borderRadius: '10px',
                  background: 'rgba(212, 175, 55, 0.1)',
                  border: '1px solid rgba(212, 175, 55, 0.25)',
                }}
              >
                <Monitor size={22} style={{ color: 'var(--accent-gold)' }} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--accent-gold)' }}>
                    Files & Sovereign Digital Workspace
                  </h1>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: 'rgba(212, 175, 55, 0.15)',
                      color: 'var(--accent-gold)',
                      border: '1px solid rgba(212, 175, 55, 0.3)',
                      fontWeight: 700,
                    }}
                  >
                    FP-13 / LIVE
                  </span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Workspace filesystem, multi-surface execution environments, and GUI computer vision telemetry.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => {
                  fetchWorkspaces();
                  loadFileTree();
                  if (selectedWorkspaceId) captureObservation(selectedWorkspaceId);
                }}
                className="btn btn-secondary"
                style={{
                  fontSize: '12px',
                  padding: '8px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <RefreshCw size={14} className={loading || fileLoading ? 'animate-spin' : ''} />
                Refresh Systems
              </button>
            </div>
          </div>
        </IndianFrame>
      </div>

      {/* Navigation Tabs Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '16px 24px 0',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <button
          onClick={() => setActiveTab('files')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: 700,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'files' ? '2px solid var(--accent-gold)' : '2px solid transparent',
            color: activeTab === 'files' ? 'var(--accent-gold)' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <FileText size={15} />
          Files & Codebase Explorer
        </button>

        <button
          onClick={() => setActiveTab('workspaces')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: 700,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'workspaces' ? '2px solid var(--accent-gold)' : '2px solid transparent',
            color: activeTab === 'workspaces' ? 'var(--accent-gold)' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Layers size={15} />
          Workspaces ({workspaces.length})
        </button>

        <button
          onClick={() => setActiveTab('apps')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: 700,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'apps' ? '2px solid var(--accent-gold)' : '2px solid transparent',
            color: activeTab === 'apps' ? 'var(--accent-gold)' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Layout size={15} />
          Applications ({applications.length})
        </button>

        <button
          onClick={() => setActiveTab('operator')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: 700,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'operator' ? '2px solid var(--accent-gold)' : '2px solid transparent',
            color: activeTab === 'operator' ? 'var(--accent-gold)' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Zap size={15} />
          Live Operator & Observation
        </button>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {/* Tab 1: Files & Codebase Explorer */}
        {activeTab === 'files' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(280px, 340px) 1fr',
              gap: '20px',
              height: 'calc(100vh - 240px)',
              minHeight: '500px',
            }}
          >
            {/* File Explorer Sidebar */}
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--bg-elevated)',
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Folder size={14} style={{ color: 'var(--accent-gold)' }} /> Workspace Root
                </span>
                <button
                  onClick={loadFileTree}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  title="Refresh File Tree"
                >
                  <RefreshCw size={13} className={fileLoading ? 'animate-spin' : ''} />
                </button>
              </div>

              {/* Search within files */}
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Filter files..."
                    value={fileSearchQuery}
                    onChange={(e) => setFileSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--bg-input)',
                      padding: '6px 10px 6px 30px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* File Tree List */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                {fileTree.length > 0 ? (
                  renderFileTree(fileTree)
                ) : (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    {fileLoading ? 'Loading workspace files...' : 'No files detected in workspace.'}
                  </div>
                )}
              </div>
            </div>

            {/* File Viewer / Editor Panel */}
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* File Header */}
              <div
                style={{
                  padding: '12px 18px',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--bg-elevated)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={15} style={{ color: 'var(--accent-gold)' }} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                    {activeFilePath || 'Select a file to inspect'}
                  </span>
                </div>

                {activeFilePath && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {saveStatus && (
                      <span style={{ fontSize: '11px', color: 'var(--accent-teal)', fontWeight: 600 }}>
                        {saveStatus}
                      </span>
                    )}
                    <button
                      onClick={handleCopyContent}
                      className="btn btn-secondary"
                      style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Copy size={12} /> {copiedNotification ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={handleSaveFile}
                      className="btn btn-primary"
                      style={{ fontSize: '11px', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Save size={12} /> Save
                    </button>
                  </div>
                )}
              </div>

              {/* Code Area */}
              <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                {activeFilePath ? (
                  <textarea
                    value={activeFileContent}
                    onChange={(e) => setActiveFileContent(e.target.value)}
                    style={{
                      width: '100%',
                      height: '100%',
                      background: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                      fontSize: '12.5px',
                      lineHeight: '1.6',
                      padding: '16px',
                      border: 'none',
                      outline: 'none',
                      resize: 'none',
                      boxSizing: 'border-box',
                      whiteSpace: 'pre',
                      overflowWrap: 'normal',
                      overflowX: 'auto',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      color: 'var(--text-muted)',
                      gap: '12px',
                    }}
                  >
                    <FileText size={48} style={{ opacity: 0.3 }} />
                    <span style={{ fontSize: '14px' }}>Click any file in the tree to view and edit its code.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Workspaces */}
        {activeTab === 'workspaces' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '20px',
            }}
          >
            {workspaces.map((ws) => {
              const isSelected = selectedWorkspaceId === ws.workspaceId;
              const isConnected = ws.status === 'CONNECTED' || ws.status === 'READY';
              return (
                <div
                  key={ws.workspaceId}
                  onClick={() => setSelectedWorkspaceId(ws.workspaceId)}
                  style={{
                    padding: '20px',
                    borderRadius: '12px',
                    border: isSelected
                      ? '1px solid var(--accent-gold)'
                      : '1px solid var(--border-color)',
                    background: isSelected
                      ? 'rgba(212, 175, 55, 0.08)'
                      : 'var(--bg-card)',
                    boxShadow: isSelected ? '0 0 20px rgba(212, 175, 55, 0.15)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {getWorkspaceIcon(ws.workspaceType)}
                      <div>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {ws.name}
                        </h3>
                        <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {ws.workspaceType}
                        </p>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontWeight: 700,
                        background: isConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: isConnected ? '#34d399' : 'var(--accent-saffron-light)',
                        border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                      }}
                    >
                      {ws.status}
                    </span>
                  </div>

                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Target URI: <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{ws.targetUri || 'Local System'}</span>
                  </p>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '8px',
                      padding: '10px',
                      borderRadius: '8px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-color)',
                      fontSize: '11px',
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>CPU Usage:</span>
                      <span style={{ marginLeft: '4px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {ws.resourceUsage?.cpuPercent || 0}%
                      </span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Memory:</span>
                      <span style={{ marginLeft: '4px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {ws.resourceUsage?.memoryMb || 0} MB
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Lock size={12} style={{ color: 'var(--accent-teal)' }} />
                      {ws.isAuthenticated ? 'Authenticated' : 'Unauthenticated'}
                    </span>
                    <div>
                      {isConnected ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDisconnect(ws.workspaceId);
                          }}
                          className="btn btn-secondary"
                          style={{ fontSize: '11px', padding: '4px 10px', color: '#f87171' }}
                        >
                          Disconnect
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConnect(ws.workspaceId);
                          }}
                          className="btn btn-primary"
                          style={{ fontSize: '11px', padding: '4px 12px' }}
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 3: Applications */}
        {activeTab === 'apps' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ maxWidth: '420px', position: 'relative' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                placeholder="Search discovered applications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  padding: '8px 12px 8px 34px',
                  fontSize: '13px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '16px',
              }}
            >
              {applications
                .filter((a) => a.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((app) => (
                  <div
                    key={app.applicationId}
                    style={{
                      padding: '18px',
                      borderRadius: '12px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {app.displayName}
                        </h4>
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            background: 'rgba(16, 185, 129, 0.12)',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                            fontWeight: 600,
                          }}
                        >
                          {app.readinessState}
                        </span>
                      </div>
                      <p style={{ margin: '0 0 10px', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {app.category}
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {app.capabilities.map((c) => (
                          <span
                            key={c}
                            style={{
                              fontSize: '10px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'var(--bg-elevated)',
                              color: 'var(--text-secondary)',
                              border: '1px solid var(--border-color)',
                            }}
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => handleLaunchApp(app.applicationId)}
                      className="btn btn-primary"
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        padding: '8px 14px',
                      }}
                    >
                      <Play size={14} /> Launch & Verify Readiness
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Tab 4: Live Operator HUD */}
        {activeTab === 'operator' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '20px',
            }}
          >
            {/* Control & Action Dispatch Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  padding: '20px',
                  borderRadius: '12px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '15px',
                      fontWeight: 700,
                      color: 'var(--accent-gold)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <Zap size={18} /> Operator Command Center
                  </h3>
                  <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Execute target-resolved, verified actions with automatic loop prevention and safe fallback.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Target Element / Intent
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Save, Text Editor, Submit Order"
                      value={actionPrompt}
                      onChange={(e) => setActionPrompt(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'var(--bg-input)',
                        padding: '8px 12px',
                        fontSize: '12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <button
                    onClick={handleExecuteAction}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '10px', fontSize: '12px', fontWeight: 700 }}
                  >
                    Execute Verified Action
                  </button>

                  {actionStatus && (
                    <div
                      style={{
                        padding: '10px',
                        borderRadius: '6px',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--accent-gold)',
                        fontSize: '11px',
                        color: 'var(--accent-gold)',
                        fontFamily: 'monospace',
                      }}
                    >
                      {actionStatus}
                    </div>
                  )}
                </div>
              </div>

              {/* Observation Layers */}
              {currentObservation && (
                <div
                  style={{
                    padding: '18px',
                    borderRadius: '12px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Observation Confidence & Layers
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: 'rgba(16, 185, 129, 0.12)',
                        color: '#34d399',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      Confidence: {currentObservation.confidence}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      Elements: {currentObservation.uiTree?.length || 0}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {currentObservation.observedLayers?.map((layer) => (
                      <span
                        key={layer}
                        style={{
                          fontSize: '10px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: 'var(--bg-elevated)',
                          color: 'var(--accent-teal)',
                          fontFamily: 'monospace',
                          border: '1px solid var(--border-color)',
                        }}
                      >
                        {layer}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Live Observation Inspector */}
            <div
              style={{
                padding: '20px',
                borderRadius: '12px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '15px',
                    fontWeight: 700,
                    color: 'var(--accent-teal)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Eye size={18} /> Live Workspace Observation
                </h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  Window: {currentObservation?.activeWindowTitle || 'None'}
                </span>
              </div>

              {currentObservation ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Resolved UI Tree Elements */}
                  <div>
                    <h4 style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Resolved UI Tree Elements
                    </h4>
                    <div
                      style={{
                        maxHeight: '220px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      {currentObservation.uiTree?.map((elem, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-color)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                          }}
                        >
                          <span style={{ fontWeight: 600, color: 'var(--accent-gold)' }}>
                            {elem.name || 'Unnamed Element'}
                          </span>
                          <div style={{ display: 'flex', gap: '8px', fontSize: '10px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>role: {elem.role}</span>
                            {elem.isFocused && (
                              <span style={{ color: '#34d399', fontWeight: 700 }}>[FOCUSED]</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* OCR Text Stream */}
                  {currentObservation.ocrText && (
                    <div>
                      <h4 style={{ margin: '0 0 6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        OCR Text Stream
                      </h4>
                      <div
                        style={{
                          padding: '10px',
                          borderRadius: '6px',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-color)',
                          fontSize: '11px',
                          color: 'var(--text-secondary)',
                          fontFamily: 'monospace',
                          maxHeight: '120px',
                          overflowY: 'auto',
                        }}
                      >
                        {currentObservation.ocrText}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '36px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                  No active observation recorded for this workspace.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
