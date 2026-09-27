import React, { useState, useEffect, useRef } from 'react';
import {
  Code,
  Folder,
  FolderOpen,
  File,
  Search,
  Play,
  PlayCircle,
  StopCircle,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Terminal as TerminalIcon,
  GitBranch,
  GitCommit,
  Layers,
  Activity,
  ExternalLink,
  Save,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Eye,
  Check,
  Cpu,
  Shield,
  FileText,
  Clock
} from 'lucide-react';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  sizeBytes?: number;
  children?: FileNode[];
}

interface WorkspaceInfo {
  id: string;
  name: string;
  rootPath: string;
  architecture?: {
    framework: string;
    language: string;
    entryPoints: string[];
    packageManager: string;
  };
}

interface SearchMatch {
  file: string;
  line: number;
  content: string;
}

interface VerificationStage {
  stage: string;
  status: 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'SKIPPED';
  durationMs: number;
  output?: string;
  error?: string;
}

interface VerificationRun {
  id: string;
  status: string;
  currentStage: string;
  summary: string;
  stages: VerificationStage[];
}

export const UniversalIDEView: React.FC = () => {
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isContentModified, setIsContentModified] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'explorer' | 'search' | 'git' | 'verify'>('explorer');

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isRegex, setIsRegex] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<SearchMatch[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Terminal state
  const [terminalOutput, setTerminalOutput] = useState<string>('HṚṢĪKEŚA IDE Terminal Online. Type a command or run automated verification.\n');
  const [terminalCmd, setTerminalCmd] = useState<string>('');
  const [isExecutingCmd, setIsExecutingCmd] = useState<boolean>(false);

  // Git state
  const [gitStatus, setGitStatus] = useState<{ branch: string; isClean: boolean; modified: string[]; staged: string[]; untracked: string[] }>({
    branch: 'main',
    isClean: true,
    modified: [],
    staged: [],
    untracked: [],
  });
  const [commitMsg, setCommitMsg] = useState<string>('');

  // Preview state
  const [previewRunning, setPreviewRunning] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewPort, setPreviewPort] = useState<number | null>(null);

  // Verification loop state
  const [verificationRun, setVerificationRun] = useState<VerificationRun | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [instruction, setInstruction] = useState<string>('Verify test suite and architecture conformance');

  // Collapsed folders map
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Load active workspace & file tree on mount
  useEffect(() => {
    loadWorkspace();
  }, []);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalOutput]);

  const loadWorkspace = async () => {
    try {
      const resp = await fetch('/api/ide/workspace/current');
      const data = await resp.json();
      if (data.success && data.workspace) {
        setWorkspace(data.workspace);
        await loadFileTree();
        await loadGitStatus();
      } else {
        // Open current workspace
        const openResp = await fetch('/api/ide/workspace/open', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rootPath: '.' }),
        });
        const openData = await openResp.json();
        if (openData.success && openData.workspace) {
          setWorkspace(openData.workspace);
          await loadFileTree();
          await loadGitStatus();
        }
      }
    } catch {
      // Offline fallback
    }
  };

  const loadFileTree = async () => {
    try {
      const resp = await fetch('/api/ide/files?maxDepth=3');
      const data = await resp.json();
      if (data.success && data.files) {
        setFileTree(data.files);
      }
    } catch {}
  };

  const loadGitStatus = async () => {
    try {
      const resp = await fetch('/api/ide/git/status');
      const data = await resp.json();
      if (data.success && data.status) {
        setGitStatus(data.status);
      }
    } catch {}
  };

  const openFile = async (path: string) => {
    try {
      const resp = await fetch(`/api/ide/file?path=${encodeURIComponent(path)}`);
      const data = await resp.json();
      if (data.success) {
        setActiveFile(path);
        setFileContent(data.content);
        setIsContentModified(false);
      }
    } catch (err: any) {
      alert(`Error loading file: ${err.message}`);
    }
  };

  const saveFile = async () => {
    if (!activeFile) return;
    try {
      const resp = await fetch('/api/ide/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: activeFile, content: fileContent }),
      });
      const data = await resp.json();
      if (data.success) {
        setIsContentModified(false);
        setTerminalOutput((prev) => `${prev}\n[FILE SAVED] ${activeFile} (${data.checksum.slice(0, 8)})\n`);
        await loadGitStatus();
      } else {
        alert(`Failed to save: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error saving file: ${err.message}`);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const resp = await fetch('/api/ide/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, isRegex, maxResults: 100 }),
      });
      const data = await resp.json();
      if (data.success) {
        setSearchResults(data.matches || []);
      }
    } catch (err: any) {
      alert(`Search error: ${err.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const executeCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalCmd.trim()) return;
    const cmd = terminalCmd.trim();
    setTerminalCmd('');
    setIsExecutingCmd(true);
    setTerminalOutput((prev) => `${prev}\n$ ${cmd}\n`);

    try {
      const resp = await fetch('/api/ide/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd, timeoutMs: 60000 }),
      });
      const data = await resp.json();
      setTerminalOutput((prev) => `${prev}${data.output || ''}\n[Exit: ${data.exitCode} in ${data.durationMs}ms]\n`);
      await loadGitStatus();
    } catch (err: any) {
      setTerminalOutput((prev) => `${prev}\nExecution failed: ${err.message}\n`);
    } finally {
      setIsExecutingCmd(false);
    }
  };

  const togglePreview = async () => {
    if (previewRunning) {
      try {
        const resp = await fetch('/api/ide/preview/servers');
        const data = await resp.json();
        const active = data.servers?.find((s: any) => s.status === 'RUNNING');
        if (active) {
          await fetch('/api/ide/preview/stop', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serverId: active.id }),
          });
        }
        setPreviewRunning(false);
        setPreviewUrl(null);
        setPreviewPort(null);
        setTerminalOutput((prev) => `${prev}\n[PREVIEW SERVER STOPPED]\n`);
      } catch {}
    } else {
      try {
        setTerminalOutput((prev) => `${prev}\n[STARTING PREVIEW DEV SERVER...]\n`);
        const resp = await fetch('/api/ide/preview/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ framework: 'vite' }),
        });
        const data = await resp.json();
        if (data.success && data.server) {
          setPreviewRunning(true);
          setPreviewUrl(data.server.url);
          setPreviewPort(data.server.port);
          setTerminalOutput((prev) => `${prev}\n[PREVIEW READY] ${data.server.url}\n`);
        } else {
          setTerminalOutput((prev) => `${prev}\n[PREVIEW FAILED] ${data.error}\n`);
        }
      } catch (err: any) {
        setTerminalOutput((prev) => `${prev}\n[PREVIEW ERROR] ${err.message}\n`);
      }
    }
  };

  const startVerificationLoop = async () => {
    setIsVerifying(true);
    setActiveTab('verify');
    setTerminalOutput((prev) => `${prev}\n>>> INITIATING 10-STAGE AUTONOMOUS VERIFICATION LOOP <<<\nInstruction: ${instruction}\n`);

    try {
      const resp = await fetch('/api/ide/verify/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction,
          autoFix: true,
          maxCorrectionAttempts: 2,
        }),
      });
      const data = await resp.json();
      if (data.success && data.run) {
        setVerificationRun(data.run);
        setTerminalOutput((prev) => `${prev}\n[VERIFICATION ${data.run.status}] ${data.run.summary}\n`);
      } else {
        setTerminalOutput((prev) => `${prev}\n[VERIFICATION ERROR] ${data.error}\n`);
      }
    } catch (err: any) {
      setTerminalOutput((prev) => `${prev}\n[VERIFICATION FAILED] ${err.message}\n`);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCommit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMsg.trim()) return;
    try {
      const resp = await fetch('/api/ide/git/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: commitMsg }),
      });
      const data = await resp.json();
      if (data.success) {
        setCommitMsg('');
        setTerminalOutput((prev) => `${prev}\n[GIT COMMIT] ${data.commitSha.slice(0, 8)} - ${data.message}\n`);
        await loadGitStatus();
      } else {
        alert(`Commit failed: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Commit error: ${err.message}`);
    }
  };

  const toggleFolder = (path: string) => {
    setCollapsed((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const renderFileTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map((node) => {
      const isDir = node.type === 'directory';
      const isCollapsed = !!collapsed[node.path];
      const isCurrent = activeFile === node.path;

      return (
        <div key={node.path} style={{ paddingLeft: `${depth * 14}px` }}>
          <div
            className={`file-item ${isCurrent ? 'active' : ''}`}
            onClick={() => {
              if (isDir) {
                toggleFolder(node.path);
              } else {
                openFile(node.path);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 8px',
              fontSize: '12px',
              cursor: 'pointer',
              borderRadius: '4px',
              backgroundColor: isCurrent ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
              color: isCurrent ? '#f5d77f' : '#e0e0e0',
              userSelect: 'none',
              transition: 'background 0.15s ease',
            }}
          >
            {isDir ? (
              <>
                {isCollapsed ? <ChevronRight size={13} color="#888" /> : <ChevronDown size={13} color="#888" />}
                {isCollapsed ? <Folder size={14} color="#e5a93c" /> : <FolderOpen size={14} color="#e5a93c" />}
              </>
            ) : (
              <>
                <span style={{ width: '13px' }} />
                <File size={14} color="#64b5f6" />
              </>
            )}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {node.name}
            </span>
          </div>
          {isDir && !isCollapsed && node.children && renderFileTree(node.children, depth + 1)}
        </div>
      );
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '10px' }}>
      {/* Top Banner / Workspace Bar */}
      <div
        style={{
          background: 'rgba(20, 24, 33, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(212, 175, 55, 0.25)',
          borderRadius: '10px',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #d4af37, #aa7c11)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0d1117',
              boxShadow: '0 0 12px rgba(212, 175, 55, 0.4)',
            }}
          >
            <Code size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '15px', fontWeight: 600, color: '#f0f6fc' }}>
                {workspace?.name || 'HṚṢĪKEŚA IDE'}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  background: 'rgba(56, 139, 253, 0.15)',
                  color: '#58a6ff',
                  border: '1px solid rgba(56, 139, 253, 0.3)',
                  padding: '1px 7px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <GitBranch size={11} /> {gitStatus.branch}
              </span>
              {workspace?.architecture && (
                <span
                  style={{
                    fontSize: '11px',
                    background: 'rgba(46, 160, 67, 0.15)',
                    color: '#3fb950',
                    border: '1px solid rgba(46, 160, 67, 0.3)',
                    padding: '1px 7px',
                    borderRadius: '10px',
                  }}
                >
                  {workspace.architecture.framework} ({workspace.architecture.language})
                </span>
              )}
            </div>
            <div style={{ fontSize: '11px', color: '#8b949e', marginTop: '2px' }}>
              Root: {workspace?.rootPath || '.'}
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={togglePreview}
            style={{
              background: previewRunning ? 'rgba(218, 54, 51, 0.2)' : 'rgba(46, 160, 67, 0.2)',
              border: `1px solid ${previewRunning ? '#f85149' : '#3fb950'}`,
              color: previewRunning ? '#f85149' : '#3fb950',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {previewRunning ? <StopCircle size={14} /> : <PlayCircle size={14} />}
            {previewRunning ? `Stop Preview (: ${previewPort})` : 'Launch Preview'}
          </button>

          <button
            onClick={startVerificationLoop}
            disabled={isVerifying}
            style={{
              background: 'linear-gradient(135deg, #d4af37, #9b7212)',
              border: 'none',
              color: '#0d1117',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: isVerifying ? 'wait' : 'pointer',
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(212, 175, 55, 0.3)',
            }}
          >
            <Sparkles size={14} />
            {isVerifying ? 'Verifying Loop...' : '10-Stage Loop'}
          </button>
        </div>
      </div>

      {/* Main 3-Column IDE Body */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 360px', gap: '10px', flex: 1, minHeight: 0 }}>
        {/* Left Column: Explorer / Search / Git */}
        <div
          style={{
            background: 'rgba(15, 18, 25, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Sub-tab navigation */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(10, 13, 20, 0.6)',
            }}
          >
            {[
              { id: 'explorer', label: 'Files', icon: Folder },
              { id: 'search', label: 'Search', icon: Search },
              { id: 'git', label: 'Git', icon: GitCommit },
              { id: 'verify', label: 'Loop', icon: Sparkles },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    flex: 1,
                    background: isActive ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
                    border: 'none',
                    borderBottom: isActive ? '2px solid #d4af37' : '2px solid transparent',
                    color: isActive ? '#f5d77f' : '#8b949e',
                    padding: '8px 4px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  <Icon size={12} /> {tab.label}
                </button>
              );
            })}
          </div>

          {/* Sub-tab Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
            {activeTab === 'explorer' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#8b949e', textTransform: 'uppercase' }}>
                    Workspace Files
                  </span>
                  <button
                    onClick={loadFileTree}
                    style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', padding: '2px' }}
                    title="Refresh Tree"
                  >
                    <RefreshCw size={12} />
                  </button>
                </div>
                {renderFileTree(fileTree)}
              </div>
            )}

            {activeTab === 'search' && (
              <div>
                <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search in files (regex supported)..."
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '6px',
                      color: '#fff',
                      padding: '6px 8px',
                      fontSize: '12px',
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '11px', color: '#8b949e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="checkbox"
                        checked={isRegex}
                        onChange={(e) => setIsRegex(e.target.checked)}
                      />
                      Regex
                    </label>
                    <button
                      type="submit"
                      disabled={isSearching}
                      style={{
                        background: '#238636',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 10px',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      {isSearching ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                </form>

                <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '6px' }}>
                  {searchResults.length} matches found
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {searchResults.map((m, idx) => (
                    <div
                      key={idx}
                      onClick={() => openFile(m.file)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        padding: '6px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                      }}
                    >
                      <div style={{ color: '#58a6ff', fontWeight: 500 }}>
                        {m.file}:{m.line}
                      </div>
                      <div style={{ color: '#c9d1d9', fontFamily: 'monospace', whiteSpace: 'pre-wrap', marginTop: '2px' }}>
                        {m.content.trim()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'git' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#8b949e', textTransform: 'uppercase' }}>
                    Source Control ({gitStatus.branch})
                  </span>
                  <button
                    onClick={loadGitStatus}
                    style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer' }}
                  >
                    <RefreshCw size={12} />
                  </button>
                </div>

                {gitStatus.isClean ? (
                  <div style={{ fontSize: '12px', color: '#3fb950', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle size={14} /> Working tree clean
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '11px', color: '#e3b341', fontWeight: 600, marginBottom: '4px' }}>
                      Modified ({gitStatus.modified.length})
                    </div>
                    {gitStatus.modified.map((f) => (
                      <div
                        key={f}
                        onClick={() => openFile(f)}
                        style={{ fontSize: '11px', color: '#e0e0e0', padding: '2px 4px', cursor: 'pointer' }}
                      >
                        • {f}
                      </div>
                    ))}

                    {gitStatus.untracked.length > 0 && (
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ fontSize: '11px', color: '#79c0ff', fontWeight: 600, marginBottom: '4px' }}>
                          Untracked ({gitStatus.untracked.length})
                        </div>
                        {gitStatus.untracked.map((f) => (
                          <div
                            key={f}
                            onClick={() => openFile(f)}
                            style={{ fontSize: '11px', color: '#8b949e', padding: '2px 4px', cursor: 'pointer' }}
                          >
                            + {f}
                          </div>
                        ))}
                      </div>
                    )}

                    <form onSubmit={handleCommit} style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <input
                        type="text"
                        value={commitMsg}
                        onChange={(e) => setCommitMsg(e.target.value)}
                        placeholder="Commit message..."
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '4px',
                          color: '#fff',
                          padding: '6px',
                          fontSize: '11px',
                        }}
                      />
                      <button
                        type="submit"
                        disabled={!commitMsg.trim()}
                        style={{
                          background: '#1f6feb',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '6px',
                          fontSize: '11px',
                          cursor: commitMsg.trim() ? 'pointer' : 'default',
                        }}
                      >
                        Commit Changes
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'verify' && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', marginBottom: '8px' }}>
                  10-Stage Verification Engine
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <input
                    type="text"
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    placeholder="Verification instruction..."
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '4px',
                      color: '#fff',
                      padding: '6px',
                      fontSize: '11px',
                      marginBottom: '6px',
                    }}
                  />
                  <button
                    onClick={startVerificationLoop}
                    disabled={isVerifying}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #d4af37, #9b7212)',
                      border: 'none',
                      color: '#0d1117',
                      borderRadius: '4px',
                      padding: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: isVerifying ? 'wait' : 'pointer',
                    }}
                  >
                    {isVerifying ? 'Running...' : 'Execute Loop'}
                  </button>
                </div>

                {verificationRun && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '11px', color: verificationRun.status === 'PASSED' ? '#3fb950' : '#f85149', fontWeight: 600 }}>
                      Status: {verificationRun.status}
                    </div>
                    {verificationRun.stages.map((s, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          padding: '6px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderLeft: `3px solid ${
                            s.status === 'PASSED' ? '#3fb950' : s.status === 'FAILED' ? '#f85149' : '#8b949e'
                          }`,
                        }}
                      >
                        <span style={{ color: '#c9d1d9' }}>{s.stage}</span>
                        <span style={{ color: '#8b949e' }}>{s.durationMs}ms</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center Column: Precision Code Editor */}
        <div
          style={{
            background: 'rgba(15, 18, 25, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Active File Header */}
          <div
            style={{
              padding: '8px 14px',
              background: 'rgba(10, 13, 20, 0.6)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileCodeIcon size={14} color="#58a6ff" />
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#f0f6fc' }}>
                {activeFile || 'No file opened'}
              </span>
              {isContentModified && (
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#d4af37' }} />
              )}
            </div>

            {activeFile && (
              <button
                onClick={saveFile}
                disabled={!isContentModified}
                style={{
                  background: isContentModified ? '#238636' : 'rgba(255, 255, 255, 0.05)',
                  border: 'none',
                  borderRadius: '4px',
                  color: isContentModified ? '#fff' : '#8b949e',
                  padding: '4px 10px',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: isContentModified ? 'pointer' : 'default',
                }}
              >
                <Save size={12} /> Save
              </button>
            )}
          </div>

          {/* Text Editor Textarea */}
          <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
            <textarea
              value={fileContent}
              onChange={(e) => {
                setFileContent(e.target.value);
                setIsContentModified(true);
              }}
              placeholder="Select a file from the explorer on the left to edit or inspect..."
              style={{
                width: '100%',
                height: '100%',
                background: 'transparent',
                border: 'none',
                color: '#e6edf3',
                fontFamily: 'Consolas, "Fira Code", monospace',
                fontSize: '12.5px',
                lineHeight: '1.5',
                padding: '12px',
                resize: 'none',
                outline: 'none',
                tabSize: 2,
              }}
            />
          </div>
        </div>

        {/* Right Column: Terminal & Live Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Live Preview Panel */}
          <div
            style={{
              flex: 1,
              background: 'rgba(15, 18, 25, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '8px 12px',
                background: 'rgba(10, 13, 20, 0.6)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Eye size={13} color="#58a6ff" />
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#f0f6fc' }}>
                  Live Web Preview
                </span>
              </div>
              {previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#58a6ff', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px' }}
                >
                  <ExternalLink size={12} />
                </a>
              )}
            </div>

            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {previewRunning && previewUrl ? (
                <iframe
                  src={previewUrl}
                  style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
                  title="Dev Server Preview"
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#8b949e', fontSize: '12px' }}>
                  <Layers size={28} style={{ opacity: 0.3, marginBottom: '8px' }} />
                  <div>No preview running</div>
                  <div style={{ fontSize: '11px', marginTop: '4px' }}>Click Launch Preview above</div>
                </div>
              )}
            </div>
          </div>

          {/* Integrated Terminal Panel */}
          <div
            style={{
              height: '240px',
              background: 'rgba(15, 18, 25, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '6px 12px',
                background: 'rgba(10, 13, 20, 0.7)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TerminalIcon size={13} color="#d4af37" />
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#f0f6fc' }}>
                  Integrated Terminal
                </span>
              </div>
              <button
                onClick={() => setTerminalOutput('')}
                style={{ background: 'none', border: 'none', color: '#8b949e', fontSize: '10px', cursor: 'pointer' }}
              >
                Clear
              </button>
            </div>

            <div
              style={{
                flex: 1,
                padding: '8px 12px',
                overflowY: 'auto',
                fontFamily: 'Consolas, monospace',
                fontSize: '11px',
                color: '#39d353',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.4,
              }}
            >
              {terminalOutput}
              <div ref={terminalEndRef} />
            </div>

            <form
              onSubmit={executeCommand}
              style={{
                display: 'flex',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(10, 13, 20, 0.5)',
              }}
            >
              <span style={{ padding: '6px 8px', color: '#d4af37', fontFamily: 'monospace', fontSize: '12px' }}>$</span>
              <input
                type="text"
                value={terminalCmd}
                onChange={(e) => setTerminalCmd(e.target.value)}
                disabled={isExecutingCmd}
                placeholder="npm test, git status, tsc..."
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  outline: 'none',
                  padding: '6px 4px',
                }}
              />
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

// Small helper icon component
const FileCodeIcon = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <polyline points="10 13 8 15 10 17" />
    <polyline points="14 13 16 15 14 17" />
  </svg>
);
