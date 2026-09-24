import React, { useState, useEffect } from 'react';
import {
  Server,
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Plus,
  Play,
  Pause,
  Trash2,
  Eye,
  Search,
  Cpu,
  Layers,
  Terminal,
  Activity,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { Modal } from '../components/Modal';

export interface MCPServerInfo {
  id: string;
  name: string;
  displayName: string;
  description: string;
  version: string;
  transport: string;
  command?: string;
  args?: string[];
  endpoint?: string;
  status: string;
  trustLevel: string;
  source: string;
  license: string;
  enabled: boolean;
  authorized: boolean;
  health: string;
  lastCheckedAt?: string;
  pid?: number;
  restartCount?: number;
  errorMessage?: string;
  createdAt: string;
}

export interface MCPToolInfo {
  id: string;
  serverId: string;
  name: string;
  displayName?: string;
  description: string;
  riskLevel: number;
  requiredPermissions: string[];
  enabled: boolean;
  verified: boolean;
}

export interface MCPSecurityReviewInfo {
  id: string;
  serverId: string;
  reviewedAt: string;
  reviewer: string;
  findings: Array<{ type: string; severity: string; description: string; parameter?: string }>;
  riskScore: number;
  decision: string;
  notes?: string;
}

export const MCPView: React.FC = () => {
  const [servers, setServers] = useState<MCPServerInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedServer, setSelectedServer] = useState<MCPServerInfo | null>(null);
  const [serverTools, setServerTools] = useState<MCPToolInfo[]>([]);
  const [serverResources, setServerResources] = useState<any[]>([]);
  const [serverPrompts, setServerPrompts] = useState<any[]>([]);
  const [isRegisterOpen, setIsRegisterOpen] = useState<boolean>(false);
  const [registerForm, setRegisterForm] = useState({
    name: '',
    displayName: '',
    description: '',
    transport: 'stdio',
    command: '',
    args: '',
    endpoint: '',
    source: 'LOCAL',
    license: 'MIT',
  });
  const [testTool, setTestTool] = useState<MCPToolInfo | null>(null);
  const [testInput, setTestInput] = useState<string>('{}');
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'servers' | 'capabilities'>('servers');
  const [allCapabilities, setAllCapabilities] = useState<any[]>([]);

  const fetchServers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/mcp/servers');
      if (res.ok) {
        const data = await res.json();
        setServers(data.servers || []);
      }
    } catch (err) {
      console.error('Failed to fetch MCP servers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCapabilities = async () => {
    try {
      const res = await fetch('/capabilities');
      if (res.ok) {
        const data = await res.json();
        setAllCapabilities(data.capabilities || []);
      }
    } catch (err) {
      console.error('Failed to fetch capabilities:', err);
    }
  };

  useEffect(() => {
    fetchServers();
    fetchCapabilities();
  }, []);

  const handleInspectServer = async (server: MCPServerInfo) => {
    setSelectedServer(server);
    try {
      const [toolsRes, resRes, promptsRes] = await Promise.all([
        fetch(`/mcp/servers/${server.id}/tools`),
        fetch(`/mcp/servers/${server.id}/resources`),
        fetch(`/mcp/servers/${server.id}/prompts`),
      ]);
      if (toolsRes.ok) {
        const d = await toolsRes.json();
        setServerTools(d.tools || []);
      }
      if (resRes.ok) {
        const d = await resRes.json();
        setServerResources(d.resources || []);
      }
      if (promptsRes.ok) {
        const d = await promptsRes.json();
        setServerPrompts(d.prompts || []);
      }
    } catch (err) {
      console.error('Failed to inspect server details:', err);
    }
  };

  const handleApproveServer = async (serverId: string) => {
    if (!confirm('Authorize this MCP server? Executions will be governed by PermissionManager and ToolExecutionBus.')) return;
    try {
      const res = await fetch(`/mcp/servers/${serverId}/approve`, { method: 'POST' });
      if (res.ok) {
        fetchServers();
        if (selectedServer?.id === serverId) {
          const s = await res.json();
          setSelectedServer(s.server);
        }
      }
    } catch (err) {
      console.error('Approve failed:', err);
    }
  };

  const handleDisableServer = async (serverId: string) => {
    try {
      const res = await fetch(`/mcp/servers/${serverId}/disable`, { method: 'POST' });
      if (res.ok) {
        fetchServers();
        if (selectedServer?.id === serverId) {
          const s = await res.json();
          setSelectedServer(s.server);
        }
      }
    } catch (err) {
      console.error('Disable failed:', err);
    }
  };

  const handleRevokeServer = async (serverId: string) => {
    const reason = prompt('Enter reason for revoking authorization:');
    if (!reason) return;
    try {
      const res = await fetch(`/mcp/servers/${serverId}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        fetchServers();
        if (selectedServer?.id === serverId) {
          const s = await res.json();
          setSelectedServer(s.server);
        }
      }
    } catch (err) {
      console.error('Revoke failed:', err);
    }
  };

  const handleRefreshServer = async (serverId: string) => {
    try {
      const res = await fetch(`/mcp/servers/${serverId}/refresh`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        alert(`Refreshed server. Added: ${data.diff?.addedTools?.length || 0}, Schema changed: ${data.diff?.schemaChangedTools?.length || 0}`);
        fetchServers();
        if (selectedServer?.id === serverId) {
          handleInspectServer(selectedServer);
        }
      }
    } catch (err) {
      console.error('Refresh failed:', err);
    }
  };

  const handleRegisterServer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const argsArray = registerForm.args.split(',').map((a) => a.trim()).filter(Boolean);
      const payload = {
        name: registerForm.name.toLowerCase().trim(),
        displayName: registerForm.displayName || registerForm.name,
        description: registerForm.description,
        transport: registerForm.transport,
        command: registerForm.command || undefined,
        args: argsArray.length > 0 ? argsArray : undefined,
        endpoint: registerForm.endpoint || undefined,
        source: registerForm.source,
        license: registerForm.license,
      };

      const res = await fetch('/mcp/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsRegisterOpen(false);
        setRegisterForm({
          name: '',
          displayName: '',
          description: '',
          transport: 'stdio',
          command: '',
          args: '',
          endpoint: '',
          source: 'LOCAL',
          license: 'MIT',
        });
        fetchServers();
      } else {
        const errData = await res.json();
        alert(`Registration failed: ${errData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Registration failed:', err);
    }
  };

  const handleExecuteToolTest = async () => {
    if (!testTool || !selectedServer) return;
    try {
      setIsTesting(true);
      setTestResult(null);
      let parsedInput = {};
      try {
        parsedInput = JSON.parse(testInput);
      } catch (err) {
        alert('Invalid JSON input for tool test.');
        setIsTesting(false);
        return;
      }

      const res = await fetch(`/capabilities/mcp.${selectedServer.name}.${testTool.name}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: parsedInput }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AUTHORIZED':
      case 'ACTIVE':
        return <span className="badge badge-emerald"><CheckCircle2 size={12} style={{ marginRight: '4px' }} /> {status}</span>;
      case 'PENDING_APPROVAL':
        return <span className="badge badge-amber"><ShieldAlert size={12} style={{ marginRight: '4px' }} /> PENDING APPROVAL</span>;
      case 'DISABLED':
        return <span className="badge badge-indigo"><Pause size={12} style={{ marginRight: '4px' }} /> DISABLED</span>;
      case 'REVOKED':
      case 'FAILED':
        return <span className="badge badge-rose"><ShieldAlert size={12} style={{ marginRight: '4px' }} /> {status}</span>;
      default:
        return <span className="badge badge-cyan">{status}</span>;
    }
  };

  const getTrustBadge = (trust: string) => {
    switch (trust) {
      case 'USER_APPROVED':
        return <span className="badge badge-emerald"><ShieldCheck size={12} style={{ marginRight: '4px' }} /> USER APPROVED</span>;
      case 'TRUSTED':
        return <span className="badge badge-cyan"><Shield size={12} style={{ marginRight: '4px' }} /> TRUSTED</span>;
      case 'REVIEWED':
        return <span className="badge badge-amber">REVIEWED</span>;
      default:
        return <span className="badge badge-rose">UNTRUSTED</span>;
    }
  };

  const filteredServers = servers.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="view-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server size={22} color="var(--gold)" />
            MCP & Dynamic Capability Ecosystem
          </h1>
          <p className="view-subtitle">
            Secure, governed integration layer for external capabilities via Model Context Protocol (MCP). Untrusted by default, sandboxed, and authorized strictly by Rushikesh.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className={`btn ${activeTab === 'servers' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('servers')}
            style={{ fontSize: '12px', height: '36px' }}
          >
            <Server size={14} style={{ marginRight: '6px' }} />
            MCP Servers ({servers.length})
          </button>
          <button
            className={`btn ${activeTab === 'capabilities' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('capabilities')}
            style={{ fontSize: '12px', height: '36px' }}
          >
            <Zap size={14} style={{ marginRight: '6px' }} />
            All Capabilities ({allCapabilities.length})
          </button>
          <button
            className="btn btn-secondary"
            onClick={fetchServers}
            style={{ fontSize: '12px', height: '36px' }}
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setIsRegisterOpen(true)}
            style={{ fontSize: '12px', height: '36px' }}
          >
            <Plus size={14} style={{ marginRight: '6px' }} />
            Add Server
          </button>
        </div>
      </div>

      {/* Overview Stat Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '14px', background: 'var(--card-bg)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Registered Servers</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--gold)', marginTop: '4px' }}>{servers.length}</div>
        </div>
        <div className="card" style={{ padding: '14px', background: 'var(--card-bg)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active / Authorized</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--emerald)', marginTop: '4px' }}>
            {servers.filter((s) => s.authorized && s.enabled).length}
          </div>
        </div>
        <div className="card" style={{ padding: '14px', background: 'var(--card-bg)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending Approval</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--amber)', marginTop: '4px' }}>
            {servers.filter((s) => s.status === 'PENDING_APPROVAL').length}
          </div>
        </div>
        <div className="card" style={{ padding: '14px', background: 'var(--card-bg)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Capabilities</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--cyan)', marginTop: '4px' }}>{allCapabilities.length}</div>
        </div>
      </div>

      {activeTab === 'servers' ? (
        <>
          {/* Filter & Search Bar */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <input
                type="text"
                className="input"
                placeholder="Search MCP servers by name or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '34px', width: '100%', height: '38px' }}
              />
              <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '11px', top: '12px' }} />
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              {['ALL', 'PENDING_APPROVAL', 'AUTHORIZED', 'ACTIVE', 'DISABLED', 'REVOKED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`btn ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '11px', padding: '6px 10px', height: '38px' }}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Servers Grid */}
          {loading ? (
            <div className="card" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading MCP server registry...
            </div>
          ) : filteredServers.length === 0 ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Server size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <h3>No MCP Servers Found</h3>
              <p style={{ fontSize: '13px', marginTop: '6px' }}>
                Register an external MCP server to expand HṚṢĪKEŚA's governed capability ecosystem.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => setIsRegisterOpen(true)}
                style={{ marginTop: '16px' }}
              >
                <Plus size={14} style={{ marginRight: '6px' }} /> Register MCP Server
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '14px' }}>
              {filteredServers.map((server) => (
                <div
                  key={server.id}
                  className="card hover-card"
                  style={{
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderLeft: `3px solid ${
                      server.status === 'AUTHORIZED' || server.status === 'ACTIVE'
                        ? 'var(--emerald)'
                        : server.status === 'PENDING_APPROVAL'
                        ? 'var(--amber)'
                        : 'var(--rose)'
                    }`,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {server.displayName || server.name}
                        </h3>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {server.name} • v{server.version}
                        </div>
                      </div>
                      {getStatusBadge(server.status)}
                    </div>

                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.4 }}>
                      {server.description}
                    </p>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                      {getTrustBadge(server.trustLevel)}
                      <span className="badge badge-indigo">
                        <Terminal size={11} style={{ marginRight: '4px' }} />
                        {server.transport.toUpperCase()}
                      </span>
                      <span className="badge badge-cyan">{server.source}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', marginTop: '8px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Health: <span style={{ color: server.health === 'HEALTHY' ? 'var(--emerald)' : 'var(--amber)' }}>{server.health}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      {server.status === 'PENDING_APPROVAL' && (
                        <button
                          className="btn btn-primary"
                          onClick={() => handleApproveServer(server.id)}
                          style={{ fontSize: '11px', padding: '4px 8px', height: '28px' }}
                          title="Authorize Server"
                        >
                          <CheckCircle2 size={12} style={{ marginRight: '4px' }} /> Authorize
                        </button>
                      )}
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleInspectServer(server)}
                        style={{ fontSize: '11px', padding: '4px 8px', height: '28px' }}
                      >
                        <Eye size={12} style={{ marginRight: '4px' }} /> Inspect
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Capabilities View */
        <div className="card" style={{ padding: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '14px', color: 'var(--text-primary)' }}>
            All Registered Capabilities ({allCapabilities.length})
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 8px' }}>Capability ID</th>
                  <th style={{ padding: '10px 8px' }}>Provider</th>
                  <th style={{ padding: '10px 8px' }}>Source</th>
                  <th style={{ padding: '10px 8px' }}>Risk Level</th>
                  <th style={{ padding: '10px 8px' }}>Status</th>
                  <th style={{ padding: '10px 8px' }}>Security</th>
                </tr>
              </thead>
              <tbody>
                {allCapabilities.map((cap) => (
                  <tr key={cap.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 8px', fontWeight: 600, fontFamily: 'monospace', color: 'var(--gold)' }}>
                      {cap.id}
                    </td>
                    <td style={{ padding: '10px 8px' }}>{cap.provider}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <span className="badge badge-indigo">{cap.source?.toUpperCase()}</span>
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <span className={`badge ${cap.riskLevel === 'LOW' ? 'badge-emerald' : cap.riskLevel === 'MEDIUM' ? 'badge-cyan' : cap.riskLevel === 'HIGH' ? 'badge-amber' : 'badge-rose'}`}>
                        {cap.riskLevel}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      {cap.enabled ? <span className="badge badge-emerald">ENABLED</span> : <span className="badge badge-rose">DISABLED</span>}
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <span className="badge badge-cyan">{cap.securityStatus}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inspect Server Modal */}
      {selectedServer && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedServer(null)}
          title={`MCP Server: ${selectedServer.displayName || selectedServer.name}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header / Badges */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {getStatusBadge(selectedServer.status)}
              {getTrustBadge(selectedServer.trustLevel)}
              <span className="badge badge-indigo">{selectedServer.transport.toUpperCase()}</span>
              <span className="badge badge-cyan">{selectedServer.source}</span>
              <span className="badge badge-amber">v{selectedServer.version}</span>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {selectedServer.description}
            </p>

            {/* Server Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'var(--surface-color)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}>
              {selectedServer.command && (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Command:</span>{' '}
                  <span style={{ fontFamily: 'monospace' }}>{selectedServer.command}</span>
                </div>
              )}
              {selectedServer.args && selectedServer.args.length > 0 && (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Args:</span>{' '}
                  <span style={{ fontFamily: 'monospace' }}>{selectedServer.args.join(' ')}</span>
                </div>
              )}
              {selectedServer.endpoint && (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Endpoint:</span>{' '}
                  <span style={{ fontFamily: 'monospace' }}>{selectedServer.endpoint}</span>
                </div>
              )}
              <div>
                <span style={{ color: 'var(--text-muted)' }}>License:</span> {selectedServer.license}
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>PID:</span> {selectedServer.pid || 'Inactive'}
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Restarts:</span> {selectedServer.restartCount || 0}
              </div>
            </div>

            {/* Tools List */}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={14} color="var(--gold)" />
                Discovered Tools ({serverTools.length})
              </h4>
              {serverTools.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No tools discovered yet. Refresh server metadata to extract capabilities.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {serverTools.map((tool) => (
                    <div
                      key={tool.id}
                      style={{
                        padding: '10px',
                        background: 'var(--surface-color)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                          {tool.name}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {tool.description}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span className="badge badge-indigo">Tier {tool.riskLevel}</span>
                        {selectedServer.authorized && (
                          <button
                            className="btn btn-secondary"
                            onClick={() => setTestTool(tool)}
                            style={{ fontSize: '11px', padding: '3px 8px', height: '24px' }}
                          >
                            <Play size={10} style={{ marginRight: '3px' }} /> Test
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Resources List */}
            {serverResources.length > 0 && (
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={14} color="var(--cyan)" />
                  Resources ({serverResources.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {serverResources.map((res) => (
                    <div key={res.id} style={{ padding: '8px', background: 'var(--surface-color)', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--cyan)' }}>{res.name}</span> — <span style={{ fontFamily: 'monospace' }}>{res.uri}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prompts List */}
            {serverPrompts.length > 0 && (
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Cpu size={14} color="var(--emerald)" />
                  Prompts ({serverPrompts.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {serverPrompts.map((p) => (
                    <div key={p.id} style={{ padding: '8px', background: 'var(--surface-color)', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}>
                      <span style={{ fontWeight: 600 }}>{p.name}</span> — {p.description}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions Bar */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => handleRefreshServer(selectedServer.id)}
                style={{ fontSize: '12px' }}
              >
                <RefreshCw size={13} style={{ marginRight: '4px' }} /> Refresh Metadata
              </button>

              {selectedServer.status === 'PENDING_APPROVAL' && (
                <button
                  className="btn btn-primary"
                  onClick={() => handleApproveServer(selectedServer.id)}
                  style={{ fontSize: '12px' }}
                >
                  <CheckCircle2 size={13} style={{ marginRight: '4px' }} /> Authorize Server
                </button>
              )}

              {selectedServer.enabled && (
                <button
                  className="btn btn-secondary"
                  onClick={() => handleDisableServer(selectedServer.id)}
                  style={{ fontSize: '12px' }}
                >
                  <Pause size={13} style={{ marginRight: '4px' }} /> Disable
                </button>
              )}

              {selectedServer.status !== 'REVOKED' && (
                <button
                  className="btn btn-danger"
                  onClick={() => handleRevokeServer(selectedServer.id)}
                  style={{ fontSize: '12px' }}
                >
                  <Trash2 size={13} style={{ marginRight: '4px' }} /> Revoke
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Tool Test Runner Modal */}
      {testTool && (
        <Modal
          isOpen={true}
          onClose={() => setTestTool(null)}
          title={`Test Tool: ${testTool.name}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {testTool.description}
            </p>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Input JSON Parameters:
              </label>
              <textarea
                className="input"
                rows={4}
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                style={{ fontFamily: 'monospace', fontSize: '12px', width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                className="btn btn-primary"
                onClick={handleExecuteToolTest}
                disabled={isTesting}
                style={{ fontSize: '12px' }}
              >
                <Play size={13} style={{ marginRight: '4px' }} />
                {isTesting ? 'Executing...' : 'Execute Test'}
              </button>
            </div>

            {testResult && (
              <div style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Execution Result:</div>
                <pre
                  style={{
                    background: 'var(--surface-color)',
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    overflowX: 'auto',
                    border: `1px solid ${testResult.success ? 'var(--emerald)' : 'var(--rose)'}`,
                  }}
                >
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Add / Register Server Modal */}
      {isRegisterOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsRegisterOpen(false)}
          title="Register New MCP Server"
        >
          <form onSubmit={handleRegisterServer} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Server Identifier Name (alphanumeric, lowercase):
              </label>
              <input
                type="text"
                required
                className="input"
                placeholder="e.g. github, filesystem, weather"
                value={registerForm.name}
                onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Display Name:
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. GitHub Repository Operations"
                value={registerForm.displayName}
                onChange={(e) => setRegisterForm({ ...registerForm, displayName: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Description:
              </label>
              <textarea
                required
                className="input"
                rows={2}
                placeholder="Brief summary of capabilities provided..."
                value={registerForm.description}
                onChange={(e) => setRegisterForm({ ...registerForm, description: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Transport:
                </label>
                <select
                  className="input"
                  value={registerForm.transport}
                  onChange={(e) => setRegisterForm({ ...registerForm, transport: e.target.value })}
                  style={{ width: '100%' }}
                >
                  <option value="stdio">STDIO (Child Process)</option>
                  <option value="http">HTTP (SSE / REST)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Source:
                </label>
                <select
                  className="input"
                  value={registerForm.source}
                  onChange={(e) => setRegisterForm({ ...registerForm, source: e.target.value })}
                  style={{ width: '100%' }}
                >
                  <option value="LOCAL">LOCAL</option>
                  <option value="OFFICIAL">OFFICIAL</option>
                  <option value="COMMUNITY">COMMUNITY</option>
                  <option value="GITHUB">GITHUB</option>
                </select>
              </div>
            </div>

            {registerForm.transport === 'stdio' ? (
              <>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Executable Command:
                  </label>
                  <input
                    type="text"
                    required
                    className="input"
                    placeholder="e.g. node, npx, python"
                    value={registerForm.command}
                    onChange={(e) => setRegisterForm({ ...registerForm, command: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Arguments (comma separated):
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. dist/index.js, --scoped"
                    value={registerForm.args}
                    onChange={(e) => setRegisterForm({ ...registerForm, args: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
              </>
            ) : (
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  HTTP Endpoint URL:
                </label>
                <input
                  type="url"
                  required
                  className="input"
                  placeholder="https://mcp.example.com/api"
                  value={registerForm.endpoint}
                  onChange={(e) => setRegisterForm({ ...registerForm, endpoint: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsRegisterOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Register Server
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
