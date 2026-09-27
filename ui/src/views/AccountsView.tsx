import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Key,
  Globe,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Lock,
  Trash2,
  Layers,
  Search,
  Activity,
  Zap,
  Clock,
  Sparkles,
  Send,
  Terminal,
  Cpu,
  Mail,
  Calendar,
  FolderGit2,
  MessageSquare,
  HardDrive
} from 'lucide-react';
import { api } from '../services/api';
import { IndianFrame } from '../components/IndianFrame';

interface ServiceAccount {
  id: string;
  providerId: string;
  ownerIdentity: string;
  scopeType: string;
  companyId?: string;
  projectId?: string;
  status: string;
  identity?: string;
  credentialReference: string;
  scopes: Array<{ scope: string; description?: string; riskLevel: string }>;
  capabilities: string[];
  createdAt: number;
  updatedAt: number;
  lastVerifiedAt?: number;
}

interface ServiceProvider {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  authMethods: string[];
  status: string;
  supportedScopes: Array<{ scope: string; description: string; riskLevel: string; required: boolean }>;
  capabilities: Array<{
    id: string;
    name: string;
    description: string;
    action: string;
    requiredScopes: string[];
    riskLevel: string;
  }>;
}

export const AccountsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'accounts' | 'providers' | 'capabilities' | 'health'>('accounts');
  const [accounts, setAccounts] = useState<ServiceAccount[]>([]);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [healthRecords, setHealthRecords] = useState<Record<string, any>>({});
  const [usageRecords, setUsageRecords] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [nlPrompt, setNlPrompt] = useState('');
  const [nlResult, setNlResult] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<ServiceAccount | null>(null);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [accRes, provRes] = await Promise.all([
        api.listAccounts(),
        api.listProviders(),
      ]);

      if (accRes.success) setAccounts(accRes.accounts);
      if (provRes.success) setProviders(provRes.providers);

      // Load health & usage for each account
      if (accRes.success && accRes.accounts.length > 0) {
        const healthMap: Record<string, any> = {};
        const usageMap: Record<string, any> = {};

        await Promise.all(
          accRes.accounts.map(async (acc) => {
            try {
              const h = await api.getAccountHealth(acc.id);
              if (h.success) healthMap[acc.id] = h.health;
            } catch {}
            try {
              const u = await api.getAccountUsage(acc.id);
              if (u.success) usageMap[acc.id] = u.usage;
            } catch {}
          })
        );

        setHealthRecords(healthMap);
        setUsageRecords(usageMap);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setNotification({ msg: `Failed to load accounts: ${msg}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const unsubscribe = api.subscribeAccountEvents(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [loadData]);

  const handleConnect = async (providerId: string) => {
    try {
      const res = await api.connectAccount({ providerId });
      if (res.success && res.authorizationRequest?.authUrl) {
        window.open(res.authorizationRequest.authUrl, '_blank');
        setNotification({
          msg: `Opened OAuth authorization for ${providerId}. Complete approval in your browser.`,
          type: 'success',
        });
      } else {
        setNotification({
          msg: `Connection initiated for ${providerId}. Check settings if API key required.`,
          type: 'success',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setNotification({ msg: `Connect failed: ${msg}`, type: 'error' });
    }
  };

  const handleVerify = async (id: string) => {
    try {
      const res = await api.verifyAccount(id);
      if (res.success) {
        setNotification({
          msg: `Account verified: Status is ${res.health.status} (${res.health.latencyMs || 0}ms)`,
          type: 'success',
        });
        loadData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setNotification({ msg: `Verification failed: ${msg}`, type: 'error' });
    }
  };

  const handleRefresh = async (id: string) => {
    try {
      const res = await api.refreshAccount(id);
      if (res.success) {
        setNotification({ msg: res.message || 'Token refreshed', type: 'success' });
        loadData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setNotification({ msg: `Refresh failed: ${msg}`, type: 'error' });
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Are you sure you want to disconnect and revoke this account?')) return;
    try {
      const res = await api.revokeAccount(id);
      if (res.success) {
        setNotification({ msg: 'Account disconnected and revoked', type: 'success' });
        loadData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setNotification({ msg: `Revoke failed: ${msg}`, type: 'error' });
    }
  };

  const handleNlExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlPrompt.trim()) return;

    try {
      const res = await api.resolveAccountIntent(nlPrompt);
      if (res.success && res.result?.responseMessage) {
        setNlResult(res.result.responseMessage);
        loadData();
      } else {
        setNlResult('Command processed.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setNlResult(`Error: ${msg}`);
    }
  };

  const getProviderIcon = (providerId: string) => {
    switch (providerId.toLowerCase()) {
      case 'google': return <Mail className="w-5 h-5 text-amber-500" />;
      case 'github': return <FolderGit2 className="w-5 h-5 text-emerald-400" />;
      case 'microsoft': return <HardDrive className="w-5 h-5 text-blue-400" />;
      case 'slack': return <MessageSquare className="w-5 h-5 text-purple-400" />;
      case 'generic_rest': return <Globe className="w-5 h-5 text-teal-400" />;
      case 'cli_tools': return <Terminal className="w-5 h-5 text-indigo-400" />;
      case 'mcp_server': return <Cpu className="w-5 h-5 text-cyan-400" />;
      default: return <Key className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-900/30 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-wide text-amber-100 flex items-center gap-3">
            <Shield className="w-7 h-7 text-amber-400" />
            Universal Service & Account Fabric
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-950/80 text-amber-400 border border-amber-800/60 font-mono">
              FP-12
            </span>
          </h1>
          <p className="text-sm text-stone-400 mt-1">
            Secure, provider-independent authentication, zero-secret credential vault, and authorized capability execution.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-3 py-1.5 rounded bg-stone-900/80 hover:bg-stone-800 text-stone-300 border border-amber-900/40 text-sm flex items-center gap-2 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`p-3 rounded-lg text-sm flex items-center justify-between border ${
            notification.type === 'success'
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
              : 'bg-red-950/40 text-red-300 border-red-800/60'
          }`}
        >
          <span>{notification.msg}</span>
          <button onClick={() => setNotification(null)} className="text-xs underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* Natural Language Command Bar */}
      <IndianFrame>
        <form onSubmit={handleNlExecute} className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Assistant:</span>
          </div>
          <input
            type="text"
            placeholder='e.g., "Connect my Google account", "What accounts are connected?", "Test GitHub connection"'
            value={nlPrompt}
            onChange={(e) => setNlPrompt(e.target.value)}
            className="flex-1 bg-stone-950/80 border border-amber-900/50 rounded px-3 py-2 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500/80 w-full"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-stone-950 font-medium rounded text-sm flex items-center gap-2 transition-all shadow-md w-full sm:w-auto justify-center"
          >
            <Send className="w-4 h-4" />
            Execute
          </button>
        </form>

        {nlResult && (
          <div className="mt-3 p-3 bg-stone-950/90 border border-amber-900/40 rounded text-sm text-stone-300 whitespace-pre-line font-mono">
            {nlResult}
          </div>
        )}
      </IndianFrame>

      {/* Navigation Tabs */}
      <div className="flex border-b border-stone-800 gap-2">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'accounts'
              ? 'border-amber-400 text-amber-300 bg-amber-950/20'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <Key className="w-4 h-4" />
          Connected Accounts ({accounts.length})
        </button>

        <button
          onClick={() => setActiveTab('providers')}
          className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'providers'
              ? 'border-amber-400 text-amber-300 bg-amber-950/20'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <Globe className="w-4 h-4" />
          Available Providers ({providers.length})
        </button>

        <button
          onClick={() => setActiveTab('capabilities')}
          className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'capabilities'
              ? 'border-amber-400 text-amber-300 bg-amber-950/20'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          Capability Matrix
        </button>

        <button
          onClick={() => setActiveTab('health')}
          className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'health'
              ? 'border-amber-400 text-amber-300 bg-amber-950/20'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          Health & Rate Limits
        </button>
      </div>

      {/* TAB 1: Connected Accounts */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          {accounts.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-stone-800 rounded-xl bg-stone-950/40">
              <Key className="w-12 h-12 text-stone-600 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-stone-300">No Service Accounts Connected</h3>
              <p className="text-sm text-stone-500 max-w-md mx-auto mt-1 mb-4">
                Connect external accounts like Google Workspace, GitHub, Microsoft 365, or Slack to give HṚṢĪKEŚA authorized superpowers.
              </p>
              <button
                onClick={() => setActiveTab('providers')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-medium rounded text-sm transition-colors"
              >
                Browse Providers
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((acc) => {
                const health = healthRecords[acc.id];
                const usage = usageRecords[acc.id];

                return (
                  <div
                    key={acc.id}
                    className="p-4 rounded-xl bg-stone-900/60 border border-amber-900/30 hover:border-amber-600/50 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-stone-950 border border-stone-800">
                            {getProviderIcon(acc.providerId)}
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-stone-200">
                              {acc.providerId.toUpperCase()}
                            </h3>
                            <p className="text-xs text-amber-400 font-mono truncate max-w-[180px]">
                              {acc.identity || acc.ownerIdentity}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                            acc.status === 'CONNECTED'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                              : acc.status === 'REAUTH_REQUIRED'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                              : 'bg-red-950 text-red-400 border border-red-800/60'
                          }`}
                        >
                          {acc.status}
                        </span>
                      </div>

                      {/* Scopes & Capabilities Count */}
                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-stone-950/80 rounded border border-stone-800/60">
                          <span className="text-stone-500 block">Scopes:</span>
                          <span className="text-stone-300 font-medium">{acc.scopes.length} authorized</span>
                        </div>
                        <div className="p-2 bg-stone-950/80 rounded border border-stone-800/60">
                          <span className="text-stone-500 block">Capabilities:</span>
                          <span className="text-stone-300 font-medium">{acc.capabilities?.length || 0} active</span>
                        </div>
                      </div>

                      {/* Health Snippet */}
                      <div className="mt-3 text-xs flex items-center justify-between text-stone-400">
                        <span className="flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-stone-500" />
                          Health: <span className="text-stone-300">{health?.status || 'HEALTHY'}</span>
                        </span>
                        {health?.latencyMs && (
                          <span className="text-stone-500">{health.latencyMs}ms</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 pt-3 border-t border-stone-800 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleVerify(acc.id)}
                          title="Verify live connection"
                          className="p-1.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs flex items-center gap-1 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          Verify
                        </button>
                        <button
                          onClick={() => handleRefresh(acc.id)}
                          title="Refresh OAuth Token"
                          className="p-1.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                        </button>
                        <button
                          onClick={() => setSelectedAccount(acc)}
                          className="p-1.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition-colors"
                        >
                          Inspect
                        </button>
                      </div>

                      <button
                        onClick={() => handleRevoke(acc.id)}
                        title="Revoke & Disconnect"
                        className="p-1.5 rounded bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/40 text-xs transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Available Providers */}
      {activeTab === 'providers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map((prov) => (
            <div
              key={prov.id}
              className="p-5 rounded-xl bg-stone-900/60 border border-amber-900/30 hover:border-amber-600/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-stone-950 border border-stone-800">
                      {getProviderIcon(prov.id)}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-stone-100">{prov.displayName}</h3>
                      <span className="text-xs text-stone-500 uppercase tracking-wider">{prov.category}</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-stone-400 mt-3 leading-relaxed">
                  {prov.description}
                </p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {prov.authMethods.map((m) => (
                    <span
                      key={m}
                      className="text-[10px] px-2 py-0.5 rounded bg-stone-950 text-amber-400/90 border border-amber-950"
                    >
                      {m}
                    </span>
                  ))}
                  <span className="text-[10px] px-2 py-0.5 rounded bg-stone-950 text-stone-400 border border-stone-800">
                    {prov.capabilities.length} capabilities
                  </span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-stone-800/80 flex items-center justify-between">
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Ready to Connect
                </span>

                <button
                  onClick={() => handleConnect(prov.id)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-medium rounded text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Key className="w-3.5 h-3.5" />
                  Connect
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: Capability Matrix */}
      {activeTab === 'capabilities' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-stone-950/80 border border-amber-900/30 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-stone-500" />
            <input
              type="text"
              placeholder="Search capabilities by name, provider, or scope..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-sm text-stone-200 placeholder-stone-500 focus:outline-none w-full"
            />
          </div>

          <div className="border border-stone-800 rounded-xl overflow-hidden bg-stone-900/40">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-950/90 text-stone-400 text-xs uppercase tracking-wider border-b border-stone-800">
                <tr>
                  <th className="px-4 py-3">Capability ID</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Required Scopes</th>
                  <th className="px-4 py-3">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 font-mono text-xs text-stone-300">
                {providers.flatMap((p) =>
                  p.capabilities
                    .filter((c) =>
                      searchQuery
                        ? c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.displayName.toLowerCase().includes(searchQuery.toLowerCase())
                        : true
                    )
                    .map((c) => (
                      <tr key={c.id} className="hover:bg-stone-800/30">
                        <td className="px-4 py-2.5 text-amber-300">{c.id}</td>
                        <td className="px-4 py-2.5 text-stone-400 font-sans">{p.displayName}</td>
                        <td className="px-4 py-2.5">
                          <span className="px-1.5 py-0.5 rounded bg-stone-950 text-stone-300 text-[10px]">
                            {c.action}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-stone-400">{c.requiredScopes.join(', ')}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              c.riskLevel === 'HIGH'
                                ? 'bg-red-950 text-red-400'
                                : c.riskLevel === 'MEDIUM'
                                ? 'bg-amber-950 text-amber-400'
                                : 'bg-emerald-950 text-emerald-400'
                            }`}
                          >
                            {c.riskLevel}
                          </span>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Health & Rate Limits */}
      {activeTab === 'health' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map((acc) => {
              const health = healthRecords[acc.id];
              const usage = usageRecords[acc.id];

              return (
                <div
                  key={acc.id}
                  className="p-4 rounded-xl bg-stone-900/60 border border-stone-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-stone-200 flex items-center gap-2">
                      {getProviderIcon(acc.providerId)}
                      {acc.providerId.toUpperCase()} ({acc.identity || acc.id})
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                      {health?.status || 'HEALTHY'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2 bg-stone-950 rounded">
                      <span className="text-stone-500 block">Total Requests</span>
                      <span className="text-stone-200 font-mono">{usage?.totalRequests || 0}</span>
                    </div>
                    <div className="p-2 bg-stone-950 rounded">
                      <span className="text-stone-500 block">Failures</span>
                      <span className="text-stone-200 font-mono">{usage?.failedRequests || 0}</span>
                    </div>
                    <div className="p-2 bg-stone-950 rounded">
                      <span className="text-stone-500 block">Latency</span>
                      <span className="text-stone-200 font-mono">{health?.latencyMs ? `${health.latencyMs}ms` : '—'}</span>
                    </div>
                  </div>

                  <div className="text-xs text-stone-400 border-t border-stone-800/80 pt-2 flex items-center justify-between font-mono">
                    <span>Quota: UNKNOWN (Provider does not expose limit)</span>
                    <span className="text-stone-500">Vault Encrypted</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Account Inspect Modal */}
      {selectedAccount && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-stone-900 border border-amber-900/50 rounded-xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="text-lg font-semibold text-stone-100 flex items-center gap-2">
                {getProviderIcon(selectedAccount.providerId)}
                Account Details: {selectedAccount.id}
              </h3>
              <button
                onClick={() => setSelectedAccount(null)}
                className="text-stone-400 hover:text-stone-200 text-sm font-mono"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-stone-500 block">Identity / Holder:</span>
                <span className="text-amber-300 font-mono">{selectedAccount.identity || selectedAccount.ownerIdentity}</span>
              </div>
              <div>
                <span className="text-stone-500 block">Credential Reference (AES-256-GCM Vault):</span>
                <span className="text-stone-300 font-mono">{selectedAccount.credentialReference}</span>
              </div>
              <div>
                <span className="text-stone-500 block">Scope Isolation:</span>
                <span className="text-stone-300 font-mono">{selectedAccount.scopeType}</span>
              </div>
              <div>
                <span className="text-stone-500 block mb-1">Authorized Scopes ({selectedAccount.scopes.length}):</span>
                <div className="space-y-1 bg-stone-950 p-2.5 rounded font-mono text-[11px] text-stone-400 max-h-36 overflow-y-auto">
                  {selectedAccount.scopes.map((s) => (
                    <div key={s.scope}>• {s.scope}</div>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-stone-500 block mb-1">Active Capabilities ({selectedAccount.capabilities?.length || 0}):</span>
                <div className="space-y-1 bg-stone-950 p-2.5 rounded font-mono text-[11px] text-emerald-400/90 max-h-36 overflow-y-auto">
                  {(selectedAccount.capabilities || []).map((c) => (
                    <div key={c}>✓ {c}</div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-800 flex justify-end">
              <button
                onClick={() => setSelectedAccount(null)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
