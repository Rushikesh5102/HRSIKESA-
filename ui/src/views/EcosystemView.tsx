import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe,
  Layers,
  Search,
  Activity,
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Shield,
  Terminal,
  ExternalLink,
  Laptop,
  Radio,
  FileCode,
  Zap,
} from 'lucide-react';
import { IndianFrame } from '../components/IndianFrame';

interface ServiceDescriptor {
  serviceId: string;
  providerId: string;
  name: string;
  displayName: string;
  category: string;
  interfaces: Array<{
    interfaceType: string;
    priority: number;
    reliabilityScore: number;
    averageLatencyMs: number;
    isAvailable: boolean;
  }>;
  capabilities: string[];
  risk: string;
  privacy: string;
  availability: string;
  health: string;
  license: string;
  version: string;
}

interface ApplicationDescriptor {
  applicationId: string;
  name: string;
  displayName: string;
  category: string;
  readinessState: string;
  executablePath: string;
  capabilities: string[];
}

interface EcosystemHealth {
  status: string;
  totalServices: number;
  availableServices: number;
  totalApplications: number;
  connectedAccounts: number;
  rateLimitedServices: string[];
  timestamp: string;
}

export const EcosystemView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'services' | 'applications' | 'capabilities' | 'interfaces' | 'health'>('services');
  const [services, setServices] = useState<ServiceDescriptor[]>([]);
  const [applications, setApplications] = useState<ApplicationDescriptor[]>([]);
  const [health, setHealth] = useState<EcosystemHealth | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [testQuery, setTestQuery] = useState('');
  const [testQueryResult, setTestQueryResult] = useState<string | null>(null);

  const loadEcosystemData = useCallback(async () => {
    setLoading(true);
    try {
      const [svcRes, appRes, healthRes] = await Promise.all([
        fetch('/api/ecosystem/services').then(r => r.json()).catch(() => ({ services: [] })),
        fetch('/api/ecosystem/applications').then(r => r.json()).catch(() => ({ applications: [] })),
        fetch('/api/ecosystem/health').then(r => r.json()).catch(() => ({ health: null })),
      ]);

      if (svcRes?.services) setServices(svcRes.services);
      if (appRes?.applications) setApplications(appRes.applications);
      if (healthRes?.health) setHealth(healthRes.health);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEcosystemData();
  }, [loadEcosystemData]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await fetch('/api/ecosystem/refresh', { method: 'POST' });
      await loadEcosystemData();
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  const handleRunTestQuery = async () => {
    if (!testQuery.trim()) return;
    try {
      const res = await fetch('/api/ecosystem/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: testQuery }),
      }).then(r => r.json());

      if (res?.result) {
        setTestQueryResult(res.result.responseMessage || 'Handled');
      } else {
        setTestQueryResult('No match found.');
      }
    } catch (err: unknown) {
      setTestQueryResult(`Error: ${(err as Error).message}`);
    }
  };

  const filteredCapabilities = services.flatMap(s =>
    s.capabilities.filter(c => c.toLowerCase().includes(searchQuery.toLowerCase())).map(cap => ({
      capability: cap,
      serviceName: s.displayName,
      providerId: s.providerId,
      availability: s.availability,
    }))
  );

  return (
    <IndianFrame title="UNIVERSAL APPLICATION & SERVICE ECOSYSTEM" subtitle="FP-15 Sovereign Ecosystem Resolution & Interface Governance">
      <div className="flex flex-col h-full space-y-6 text-slate-200">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-amber-500/20 backdrop-blur-md">
          <div className="flex items-center space-x-2">
            <Radio className="w-5 h-5 text-amber-400 animate-pulse" />
            <span className="font-semibold text-amber-200">Ecosystem Status:</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium uppercase ${health?.status === 'HEALTHY' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
              {health?.status || 'ONLINE'}
            </span>
            <span className="text-xs text-slate-400 ml-2">
              ({health?.availableServices || services.length} Active Services / {applications.length} Discovered Apps)
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:bg-teal-500/30 transition text-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Discover & Refresh</span>
            </button>
          </div>
        </div>

        {/* Natural Language Capability Tester */}
        <div className="p-4 rounded-xl bg-slate-900/40 border border-teal-500/20">
          <div className="text-xs uppercase tracking-wider text-teal-400 font-semibold mb-2 flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Deterministic Natural Language Capability Resolver (Fast Path)</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={testQuery}
              onChange={e => setTestQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRunTestQuery()}
              placeholder='e.g., "Can you access my Gmail?", "Use GitHub", "Open Blender", "Check my Slack"'
              className="flex-1 px-4 py-2 rounded-lg bg-slate-950/60 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-amber-400"
            />
            <button
              onClick={handleRunTestQuery}
              className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 text-sm font-medium transition"
            >
              Query
            </button>
          </div>
          {testQueryResult && (
            <div className="mt-2.5 p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-sm text-amber-200/90 font-mono">
              {testQueryResult}
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-2 border-b border-slate-800 pb-2">
          {(['services', 'applications', 'capabilities', 'interfaces', 'health'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition uppercase tracking-wide flex items-center space-x-2 ${
                activeTab === tab
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {tab === 'services' && <Globe className="w-4 h-4" />}
              {tab === 'applications' && <Laptop className="w-4 h-4" />}
              {tab === 'capabilities' && <Layers className="w-4 h-4" />}
              {tab === 'interfaces' && <Cpu className="w-4 h-4" />}
              {tab === 'health' && <Activity className="w-4 h-4" />}
              <span>{tab}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {/* TAB 1: SERVICES */}
          {activeTab === 'services' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map(s => (
                <div
                  key={s.serviceId}
                  className="p-5 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-amber-500/30 transition flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-slate-100 text-base">{s.displayName}</h4>
                        <div className="text-xs text-amber-400/80 font-mono mt-0.5">{s.providerId} • {s.category}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.availability === 'AVAILABLE' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                        {s.availability}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-xs">
                      <div className="text-slate-400">
                        <span className="text-slate-500">Interfaces:</span>{' '}
                        {s.interfaces?.map(i => i.interfaceType).join(', ') || 'API'}
                      </div>
                      <div className="text-slate-400">
                        <span className="text-slate-500">Capabilities:</span> {s.capabilities.length} exposed
                      </div>
                      <div className="text-slate-400">
                        <span className="text-slate-500">Risk Profile:</span> {s.risk}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 font-mono">
                    <span>v{s.version}</span>
                    <span>{s.license}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: APPLICATIONS */}
          {activeTab === 'applications' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {applications.map(app => (
                <div key={app.applicationId} className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-200">{app.displayName}</h4>
                      <div className="text-xs text-teal-400 font-mono mt-0.5">{app.name} • {app.category}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${app.readinessState === 'READY' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                      {app.readinessState}
                    </span>
                  </div>
                  <div className="mt-3 text-xs text-slate-400 truncate">
                    <span className="text-slate-500">Path:</span> {app.executablePath}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {app.capabilities?.map(c => (
                      <span key={c} className="px-1.5 py-0.5 rounded bg-slate-800/80 text-[10px] text-slate-300 font-mono">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: CAPABILITIES */}
          {activeTab === 'capabilities' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search registered ecosystem capabilities (e.g. gmail, repo, issue, calendar)..."
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-teal-400"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredCapabilities.map(item => (
                  <div key={item.capability} className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/80 flex flex-col justify-between">
                    <div>
                      <div className="font-mono text-xs text-amber-300 font-medium break-all">{item.capability}</div>
                      <div className="text-xs text-slate-400 mt-1">{item.serviceName}</div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-mono">{item.providerId}</span>
                      <span className={`px-1.5 py-0.5 rounded ${item.availability === 'AVAILABLE' ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {item.availability}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: INTERFACES */}
          {activeTab === 'interfaces' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 leading-relaxed">
                <strong className="text-amber-300">Deterministic Interface Ladder:</strong> HṚṢĪKEŚA evaluates execution interfaces strictly by reliability, privacy, and latency:
                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-[11px]">
                  <div className="p-2 rounded bg-slate-950/60 border border-emerald-500/20 text-emerald-300">1. LOCAL_API (Highest)</div>
                  <div className="p-2 rounded bg-slate-950/60 border border-teal-500/20 text-teal-300">2. AUTHENTICATED_API</div>
                  <div className="p-2 rounded bg-slate-950/60 border border-cyan-500/20 text-cyan-300">3. MCP (Model Context)</div>
                  <div className="p-2 rounded bg-slate-950/60 border border-blue-500/20 text-blue-300">4. CLI (Native Batch)</div>
                  <div className="p-2 rounded bg-slate-950/60 border border-indigo-500/20 text-indigo-300">5. BROWSER_DOM</div>
                  <div className="p-2 rounded bg-slate-950/60 border border-purple-500/20 text-purple-300">6. DESKTOP_UIA</div>
                  <div className="p-2 rounded bg-slate-950/60 border border-rose-500/20 text-rose-300">7. OCR_VISION</div>
                  <div className="p-2 rounded bg-slate-950/60 border border-slate-700 text-slate-400">8. COORDINATES</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: HEALTH */}
          {activeTab === 'health' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800">
                <div className="text-xs text-slate-500 uppercase font-semibold">Total Services</div>
                <div className="text-3xl font-bold text-slate-100 mt-2">{health?.totalServices || services.length}</div>
                <div className="text-xs text-emerald-400 mt-1">{health?.availableServices || 0} active & available</div>
              </div>
              <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800">
                <div className="text-xs text-slate-500 uppercase font-semibold">Desktop Applications</div>
                <div className="text-3xl font-bold text-slate-100 mt-2">{health?.totalApplications || applications.length}</div>
                <div className="text-xs text-slate-400 mt-1">Discovered via KnownAppCatalog</div>
              </div>
              <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800">
                <div className="text-xs text-slate-500 uppercase font-semibold">Connected Accounts</div>
                <div className="text-3xl font-bold text-slate-100 mt-2">{health?.connectedAccounts || 0}</div>
                <div className="text-xs text-amber-400 mt-1">Active OAuth & Vault credentials</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </IndianFrame>
  );
};
