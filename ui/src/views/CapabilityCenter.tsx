import React, { useState, useEffect } from 'react';
import {
  Layers,
  Search,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Shield,
  Zap,
  RefreshCw,
  Key,
  Activity,
  FileCode,
  Lock,
  Eye,
  Sliders,
  Terminal,
  Globe,
  Radio,
} from 'lucide-react';

export interface CapabilityItem {
  id: string;
  name: string;
  description: string;
  category: string;
  provider: string;
  source: string;
  version: string;
  protocol: string;
  status: string;
  trustLevel: string;
  riskLevel: string;
  privacyClass: string;
  authentication: {
    type: string;
    credentialRef?: string;
    scopes?: string[];
  };
  scopes: string[];
  supportedOperations: string[];
  provenance: {
    source: string;
    provider: string;
    version: string;
    license?: string;
    discoveredAt: string;
    registeredBy: string;
    verificationStatus: string;
  };
  verification: {
    verified: boolean;
    strategy: string;
    lastVerifiedAt?: string;
  };
  health: {
    status: string;
    lastCheckedAt: string;
    latencyMs?: number;
    consecutiveFailures: number;
    message?: string;
  };
  enabled: boolean;
}

export interface InvocationItem {
  invocation_id: string;
  capability_id: string;
  operation: string;
  actor: string;
  status: string;
  verified: number;
  duration_ms: number;
  provider: string;
  requested_at: string;
}

export const CapabilityCenter: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'capabilities' | 'connectors' | 'auth' | 'health' | 'dependencies' | 'activity' | 'permissions'>('capabilities');
  const [capabilities, setCapabilities] = useState<CapabilityItem[]>([]);
  const [invocations, setInvocations] = useState<InvocationItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedCap, setSelectedCap] = useState<CapabilityItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchCapabilities = async () => {
    try {
      setLoading(true);
      const res = await fetch('/capabilities');
      if (res.ok) {
        const data = await res.json();
        setCapabilities(data.capabilities || []);
      }
    } catch (err) {
      console.error('Failed to load capabilities:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivity = async () => {
    try {
      const res = await fetch('/capabilities/filesystem.read/invocations'); // or general list
      if (res.ok) {
        const data = await res.json();
        setInvocations(data.invocations || []);
      }
    } catch {
      // Non-blocking
    }
  };

  useEffect(() => {
    fetchCapabilities();
    fetchActivity();

    // Connect to SSE stream
    const eventSource = new EventSource('/capabilities/events');
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Capability SSE Event:', data);
        fetchCapabilities();
      } catch {
        // Ignore parse error
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const handleVerify = async (id: string) => {
    try {
      setMessage(`Verifying capability '${id}'...`);
      const res = await fetch(`/capabilities/${id}/verify`, { method: 'POST' });
      const data = await res.json();
      setMessage(data.verification?.verified ? `Verified operational: ${data.verification.details}` : `Verification failed: ${data.verification?.details || data.error}`);
      fetchCapabilities();
    } catch (err: any) {
      setMessage(`Verification error: ${err.message}`);
    }
  };

  const handleToggleEnable = async (id: string, currentlyEnabled: boolean) => {
    const endpoint = currentlyEnabled ? `/capabilities/${id}/disable` : `/capabilities/${id}/enable`;
    try {
      await fetch(endpoint, { method: 'POST' });
      setMessage(`Capability '${id}' is now ${currentlyEnabled ? 'DISABLED' : 'AVAILABLE'}.`);
      fetchCapabilities();
    } catch (err: any) {
      setMessage(`Action error: ${err.message}`);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!window.confirm(`Are you certain you want to permanently REVOKE capability '${id}'? This will immediately prevent future invocations.`)) {
      return;
    }
    try {
      await fetch(`/capabilities/${id}/revoke`, { method: 'POST' });
      setMessage(`Capability '${id}' REVOKED.`);
      fetchCapabilities();
    } catch (err: any) {
      setMessage(`Revoke error: ${err.message}`);
    }
  };

  const filteredCapabilities = capabilities.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || c.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = ['ALL', ...Array.from(new Set(capabilities.map((c) => c.category)))];

  return (
    <div style={{ padding: '24px', color: '#e2e8f0', minHeight: '100%', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '26px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers color="#38bdf8" /> Universal Capability & Connector Fabric
          </h1>
          <p style={{ margin: '6px 0 0 0', color: '#94a3b8', fontSize: '14px' }}>
            Unified discoverability, governance, authentication references, and deterministic verification.
          </p>
        </div>
        <button
          onClick={fetchCapabilities}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid #38bdf8',
            color: '#38bdf8',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh Fabric
        </button>
      </div>

      {message && (
        <div style={{ background: 'rgba(30, 41, 59, 0.8)', border: '1px solid #38bdf8', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{message}</span>
          <button onClick={() => setMessage(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginBottom: '20px' }}>
        {(['capabilities', 'connectors', 'auth', 'health', 'dependencies', 'activity', 'permissions'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            style={{
              background: activeSubTab === tab ? '#0284c7' : 'rgba(255,255,255,0.05)',
              color: activeSubTab === tab ? '#fff' : '#94a3b8',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
              textTransform: 'capitalize',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* VIEW: CAPABILITIES */}
      {activeSubTab === 'capabilities' && (
        <div>
          {/* Controls bar */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: '#64748b' }} />
              <input
                type="text"
                placeholder="Search capabilities by name, ID, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 38px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '8px',
                  color: '#fff',
                  outline: 'none',
                }}
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                padding: '9px 16px',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '8px',
                color: '#fff',
                outline: 'none',
              }}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
            {filteredCapabilities.map((cap) => (
              <div
                key={cap.id}
                style={{
                  background: 'rgba(30, 41, 59, 0.5)',
                  border: `1px solid ${cap.status === 'REVOKED' ? '#ef4444' : cap.enabled ? 'rgba(255,255,255,0.1)' : '#64748b'}`,
                  borderRadius: '12px',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                      {cap.category} • {cap.protocol}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        background:
                          cap.status === 'AVAILABLE' ? 'rgba(34, 197, 94, 0.15)' :
                          cap.status === 'REVOKED' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.15)',
                        color:
                          cap.status === 'AVAILABLE' ? '#4ade80' :
                          cap.status === 'REVOKED' ? '#f87171' : '#fbbf24',
                      }}
                    >
                      {cap.status}
                    </span>
                  </div>

                  <h3 style={{ margin: '0 0 6px 0', fontSize: '17px', color: '#f8fafc' }}>{cap.name}</h3>
                  <code style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '10px' }}>{cap.id}</code>
                  <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: '1.4', minHeight: '36px' }}>{cap.description}</p>

                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '12px' }}>
                    <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                      Provider: <strong>{cap.provider}</strong>
                    </span>
                    <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                      Risk: <strong>{cap.riskLevel}</strong>
                    </span>
                    <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                      Trust: <strong>{cap.trustLevel}</strong>
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    onClick={() => setSelectedCap(cap)}
                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#e2e8f0', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Eye size={14} /> Inspect
                  </button>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => handleVerify(cap.id)}
                      style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22c55e', color: '#4ade80', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                      title="Run deterministic verification check"
                    >
                      Verify
                    </button>
                    <button
                      onClick={() => handleToggleEnable(cap.id, cap.enabled)}
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', color: '#cbd5e1', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      {cap.enabled ? 'Disable' : 'Enable'}
                    </button>
                    {cap.status !== 'REVOKED' && (
                      <button
                        onClick={() => handleRevoke(cap.id)}
                        style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#f87171', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                        title="Permanent security revocation"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW: CONNECTORS */}
      {activeSubTab === 'connectors' && (
        <div style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '20px' }}>
          <h2 style={{ marginTop: 0 }}>Registered Capability Connectors</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                <th style={{ padding: '10px' }}>Connector Name</th>
                <th style={{ padding: '10px' }}>Protocol</th>
                <th style={{ padding: '10px' }}>Governance / Sandbox</th>
                <th style={{ padding: '10px' }}>Verification Method</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '12px 10px', fontWeight: 600 }}>SafeCliConnector</td>
                <td style={{ padding: '12px 10px' }}>CLI</td>
                <td style={{ padding: '12px 10px' }}>Strict binary allowlist, argument metacharacter rejection, working directory jail</td>
                <td style={{ padding: '12px 10px' }}>Exit Code 0 & Output Presence</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '12px 10px', fontWeight: 600 }}>PlaywrightBrowserConnector</td>
                <td style={{ padding: '12px 10px' }}>BROWSER</td>
                <td style={{ padding: '12px 10px' }}>Headless Chromium sandbox, URL domain policy, DOM inspection</td>
                <td style={{ padding: '12px 10px' }}>DOM Element Presence & Screenshot Hash</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '12px 10px', fontWeight: 600 }}>SoftwareEnvironmentConnector</td>
                <td style={{ padding: '12px 10px' }}>LOCAL_PROCESS</td>
                <td style={{ padding: '12px 10px' }}>Windows AppDiscovery catalog, process governor</td>
                <td style={{ padding: '12px 10px' }}>Active Process PID & State Verification</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '12px 10px', fontWeight: 600 }}>McpCapabilityBridgeConnector</td>
                <td style={{ padding: '12px 10px' }}>MCP</td>
                <td style={{ padding: '12px 10px' }}>Strict JSON schema check, subprocess isolation, prompt injection defanging</td>
                <td style={{ padding: '12px 10px' }}>Output Schema Match</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '12px 10px', fontWeight: 600 }}>LocalToolConnector</td>
                <td style={{ padding: '12px 10px' }}>NATIVE</td>
                <td style={{ padding: '12px 10px' }}>ToolExecutionBus, PermissionManager, Audit Ledger</td>
                <td style={{ padding: '12px 10px' }}>Structured Response Payload Check</td>
              </tr>
              <tr>
                <td style={{ padding: '12px 10px', fontWeight: 600 }}>RestApiConnector</td>
                <td style={{ padding: '12px 10px' }}>REST</td>
                <td style={{ padding: '12px 10px' }}>Secret vault references (no plaintext), rate-limit recognition</td>
                <td style={{ padding: '12px 10px' }}>HTTP 2xx Status & Schema Conformance</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW: AUTHENTICATION */}
      {activeSubTab === 'auth' && (
        <div style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '20px' }}>
          <h2 style={{ marginTop: 0 }}>Authentication & Credential References</h2>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>
            Zero plaintext secrets stored. All integrations use indirect references (<code>vault://</code>, <code>env://</code>).
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', marginTop: '16px' }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#38bdf8' }}>
                <Key size={18} /> <strong>OAuth 2.0 State Machine</strong>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1' }}>
                PKCE S256 code challenge generation, interactive state validation, token lifecycle and expiry tracking.
              </p>
            </div>
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#4ade80' }}>
                <Lock size={18} /> <strong>Secret Redaction Filter</strong>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1' }}>
                Active in memory. Masks Authorization headers, API keys, tokens, and cookies before logging or audit persistence.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: HEALTH */}
      {activeSubTab === 'health' && (
        <div style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '20px' }}>
          <h2 style={{ marginTop: 0 }}>Capability Telemetry & Health Monitoring</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                <th style={{ padding: '10px' }}>Capability ID</th>
                <th style={{ padding: '10px' }}>Status</th>
                <th style={{ padding: '10px' }}>Latency</th>
                <th style={{ padding: '10px' }}>Failures</th>
                <th style={{ padding: '10px' }}>Last Checked</th>
              </tr>
            </thead>
            <tbody>
              {capabilities.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '10px', fontFamily: 'monospace' }}>{c.id}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ color: c.health?.status === 'HEALTHY' ? '#4ade80' : '#f87171', fontWeight: 600 }}>
                      {c.health?.status || 'UNKNOWN'}
                    </span>
                  </td>
                  <td style={{ padding: '10px' }}>{c.health?.latencyMs !== undefined ? `${c.health.latencyMs}ms` : '—'}</td>
                  <td style={{ padding: '10px' }}>{c.health?.consecutiveFailures ?? 0}</td>
                  <td style={{ padding: '10px', fontSize: '12px', color: '#94a3b8' }}>{new Date(c.health?.lastCheckedAt || Date.now()).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW: ACTIVITY */}
      {activeSubTab === 'activity' && (
        <div style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '20px' }}>
          <h2 style={{ marginTop: 0 }}>Invocation Audit Trail</h2>
          {invocations.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>No recent capability invocations recorded.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                  <th style={{ padding: '10px' }}>Invocation ID</th>
                  <th style={{ padding: '10px' }}>Capability</th>
                  <th style={{ padding: '10px' }}>Operation</th>
                  <th style={{ padding: '10px' }}>Actor</th>
                  <th style={{ padding: '10px' }}>Status</th>
                  <th style={{ padding: '10px' }}>Verified</th>
                  <th style={{ padding: '10px' }}>Duration</th>
                </tr>
              </thead>
              <tbody>
                {invocations.map((inv) => (
                  <tr key={inv.invocation_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '10px', fontFamily: 'monospace', fontSize: '12px' }}>{inv.invocation_id.slice(0, 8)}...</td>
                    <td style={{ padding: '10px' }}>{inv.capability_id}</td>
                    <td style={{ padding: '10px' }}>{inv.operation}</td>
                    <td style={{ padding: '10px' }}>{inv.actor}</td>
                    <td style={{ padding: '10px' }}>{inv.status}</td>
                    <td style={{ padding: '10px' }}>{inv.verified ? '✓' : '✗'}</td>
                    <td style={{ padding: '10px' }}>{inv.duration_ms}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* MODAL: INSPECT CAPABILITY */}
      {selectedCap && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '16px',
              width: '90%',
              maxWidth: '680px',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#f8fafc' }}>{selectedCap.name}</h2>
              <button
                onClick={() => setSelectedCap(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '24px', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <span style={{ background: '#0284c7', color: '#fff', fontSize: '11px', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>{selectedCap.protocol}</span>
              <span style={{ background: 'rgba(255,255,255,0.1)', fontSize: '11px', padding: '3px 8px', borderRadius: '4px' }}>{selectedCap.category}</span>
              <span style={{ background: 'rgba(255,255,255,0.1)', fontSize: '11px', padding: '3px 8px', borderRadius: '4px' }}>{selectedCap.privacyClass}</span>
              <span style={{ background: 'rgba(255,255,255,0.1)', fontSize: '11px', padding: '3px 8px', borderRadius: '4px' }}>Version {selectedCap.version}</span>
            </div>

            <p style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: '1.5', marginBottom: '16px' }}>{selectedCap.description}</p>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#94a3b8' }}>Provenance & Licensing</h4>
              <div style={{ fontSize: '12px', color: '#e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <div>Source: <strong>{selectedCap.provenance?.source}</strong></div>
                <div>License: <strong>{selectedCap.provenance?.license || 'Standard'}</strong></div>
                <div>Registered By: <strong>{selectedCap.provenance?.registeredBy}</strong></div>
                <div>Status: <strong>{selectedCap.provenance?.verificationStatus}</strong></div>
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#94a3b8' }}>Supported Operations</h4>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {selectedCap.supportedOperations?.map((op) => (
                  <code key={op} style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>
                    {op}
                  </code>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => setSelectedCap(null)}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#e2e8f0', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
