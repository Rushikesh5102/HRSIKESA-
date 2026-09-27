import React, { useState, useEffect } from 'react';
import {
  Github,
  Search,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Box,
  Package,
  Play,
  Cpu,
  RefreshCw,
  Terminal,
  Clock,
  ExternalLink,
  Layers,
  FileText,
  GitBranch,
  GitCommit,
  Activity,
  Award,
  Radio,
} from 'lucide-react';

export interface GitHubRepoItem {
  id: string;
  githubId: number;
  owner: string;
  name: string;
  fullName: string;
  url: string;
  defaultBranch: string;
  description: string;
  stars: number;
  forks: number;
  openIssues: number;
  language: string;
  licenseSpdx: string;
  licenseName: string;
  topics: string[];
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  archived: boolean;
  sizeKb: number;
  visibility: string;
  discoveredAt: string;
}

export interface LicenseAnalysis {
  spdx: string;
  spdxId?: string;
  name: string;
  compatibility: string;
  commercialUse: boolean;
  modificationAllowed: boolean;
  distributionAllowed: boolean;
  copyleft: boolean;
  attributionRequired: boolean;
  requiresLegalReview?: boolean;
}

export interface DependencyItem {
  id: string;
  manifestFile: string;
  name: string;
  versionSpec: string;
  dependencyType: string;
  runtime: string;
  riskLevel: string;
  riskReasons: string[];
}

export interface SecurityFindingItem {
  id: string;
  category: string;
  indicator: string;
  evidence: string;
  filePath?: string;
  lineNumber?: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface AcquisitionItem {
  id: string;
  repositoryId: string;
  targetPath: string;
  commitSha: string;
  refName: string;
  status: string;
  acquiredBy: string;
  acquiredAt: string;
}

export interface ProvenanceItem {
  id: string;
  repositoryId: string;
  url: string;
  owner: string;
  repository: string;
  commitSha?: string;
  branchOrTag?: string;
  license: string;
  discoveredSource: string;
  createdAt: string;
  integrationStatus?: string;
}

export interface ProposalItem {
  id: string;
  repositoryId: string;
  capabilityId: string;
  name: string;
  description: string;
  category: string;
  protocol: string;
  status: string;
  riskLevel: string;
  trustLevel: string;
  requiresHumanApproval: boolean;
  decisionReason?: string;
  decidedBy?: string;
  decidedAt?: string;
  createdAt: string;
}

export interface RateLimitData {
  limit: number;
  remaining: number;
  resetAt: string;
  authenticated: boolean;
  status: string;
}

export const GitHubIntelligenceCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'repositories' | 'search' | 'detail' | 'security' | 'dependencies' | 'sandbox' | 'buildtest' | 'proposals' | 'provenance'
  >('repositories');

  const [repositories, setRepositories] = useState<GitHubRepoItem[]>([]);
  const [acquisitions, setAcquisitions] = useState<AcquisitionItem[]>([]);
  const [provenanceList, setProvenanceList] = useState<ProvenanceItem[]>([]);
  const [proposals, setProposals] = useState<ProposalItem[]>([]);
  const [rateLimit, setRateLimit] = useState<RateLimitData | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLanguage, setSearchLanguage] = useState('');
  const [searchResults, setSearchResults] = useState<GitHubRepoItem[]>([]);
  const [searching, setSearching] = useState(false);

  // Selected Repository Detail & Intelligence state
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepoItem | null>(null);
  const [repoIntelligence, setRepoIntelligence] = useState<any | null>(null);
  const [repoDependencies, setRepoDependencies] = useState<DependencyItem[]>([]);
  const [repoSecurityFindings, setRepoSecurityFindings] = useState<SecurityFindingItem[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  // Sandbox & Build/Test state
  const [selectedAcqRepo, setSelectedAcqRepo] = useState<string>('');
  const [buildCommand, setBuildCommand] = useState('npm run build');
  const [testCommand, setTestCommand] = useState('npm test');
  const [buildLogs, setBuildLogs] = useState<{ stdout: string; stderr: string; success: boolean; durationMs: number } | null>(null);
  const [testLogs, setTestLogs] = useState<{ stdout: string; stderr: string; success: boolean; durationMs: number } | null>(null);
  const [executing, setExecuting] = useState(false);

  // Proposal modal state
  const [proposalActionStatus, setProposalActionStatus] = useState<string | null>(null);

  // Real-time events state
  const [events, setEvents] = useState<Array<{ type: string; timestamp: string; payload: any }>>([]);
  const [sseConnected, setSseConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    fetchRepositories();
    fetchAcquisitions();
    fetchProvenance();
    fetchProposals();
    fetchRateLimit();

    // Setup SSE connection
    const es = new EventSource('/github/events');
    es.onopen = () => setSseConnected(true);
    es.onerror = () => setSseConnected(false);

    const eventNames = [
      'connected',
      'github.search.started',
      'github.search.completed',
      'github.repository.discovered',
      'github.repository.analysis_started',
      'github.repository.analysis_completed',
      'github.acquisition.started',
      'github.acquisition.completed',
      'github.build.started',
      'github.build.completed',
      'github.test.started',
      'github.test.completed',
      'github.integration.proposed',
      'github.integration.approved',
      'github.integration.rejected',
    ];

    eventNames.forEach((evt) => {
      es.addEventListener(evt, (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data);
          setEvents((prev) => [
            { type: evt, timestamp: new Date().toLocaleTimeString(), payload: parsed },
            ...prev.slice(0, 49),
          ]);
          if (evt === 'github.repository.discovered' || evt === 'github.acquisition.completed') {
            fetchRepositories();
            fetchAcquisitions();
          }
          if (evt === 'github.integration.proposed' || evt === 'github.integration.approved') {
            fetchProposals();
          }
        } catch {}
      });
    });

    return () => {
      es.close();
    };
  }, []);

  const fetchRepositories = async () => {
    try {
      setLoading(true);
      const res = await fetch('/github/repositories?limit=50');
      if (res.ok) {
        const data = await res.json();
        setRepositories(data.repositories || []);
      }
    } catch (err) {
      console.error('Failed to load repositories', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAcquisitions = async () => {
    try {
      const res = await fetch('/github/acquisitions?limit=50');
      if (res.ok) {
        const data = await res.json();
        setAcquisitions(data.acquisitions || []);
      }
    } catch (err) {
      console.error('Failed to load acquisitions', err);
    }
  };

  const fetchProvenance = async () => {
    try {
      const res = await fetch('/github/provenance?limit=50');
      if (res.ok) {
        const data = await res.json();
        setProvenanceList(data.provenance || []);
      }
    } catch (err) {
      console.error('Failed to load provenance', err);
    }
  };

  const fetchProposals = async () => {
    try {
      const res = await fetch('/github/proposals');
      if (res.ok) {
        const data = await res.json();
        setProposals(data.proposals || []);
      }
    } catch (err) {
      console.error('Failed to load proposals', err);
    }
  };

  const fetchRateLimit = async () => {
    try {
      const res = await fetch('/github/ratelimit');
      if (res.ok) {
        const data = await res.json();
        setRateLimit(data);
      }
    } catch (err) {
      console.error('Failed to load rate limit', err);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      setSearching(true);
      const params = new URLSearchParams({
        query: searchQuery,
        limit: '15',
      });
      if (searchLanguage) params.append('language', searchLanguage);
      const res = await fetch(`/github/search?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.repositories || []);
        setActiveTab('search');
        fetchRateLimit();
      }
    } catch (err) {
      console.error('Search error', err);
    } finally {
      setSearching(false);
    }
  };

  const selectRepository = async (repo: GitHubRepoItem) => {
    setSelectedRepo(repo);
    setSelectedAcqRepo(repo.fullName);
    setActiveTab('detail');
    try {
      setAnalyzing(true);
      const res = await fetch(`/github/repositories/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}/analysis`);
      if (res.ok) {
        const data = await res.json();
        setRepoIntelligence(data.intelligence);
        setRepoDependencies(data.dependencies || []);
        setRepoSecurityFindings(data.securityFindings || []);
      }
    } catch (err) {
      console.error('Analysis load error', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const triggerAnalyze = async () => {
    if (!selectedRepo) return;
    try {
      setAnalyzing(true);
      const res = await fetch(`/github/repositories/${encodeURIComponent(selectedRepo.owner)}/${encodeURIComponent(selectedRepo.name)}/analyze`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setRepoIntelligence(data.intelligence);
        setRepoDependencies(data.dependencies || []);
        setRepoSecurityFindings(data.securityFindings || []);
        setNotification(`Intelligence analysis refreshed for ${selectedRepo.fullName}`);
      }
    } catch (err: any) {
      setNotification(`Analysis failed: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const triggerAcquire = async (owner: string, repo: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/github/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/acquire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shallow: true }),
      });
      if (res.ok) {
        const data = await res.json();
        setNotification(`Acquisition successful: Sandboxed at ${data.acquisition.targetPath}`);
        fetchAcquisitions();
        fetchProvenance();
        setActiveTab('sandbox');
      } else {
        const err = await res.json();
        setNotification(`Acquisition error: ${err.error}`);
      }
    } catch (err: any) {
      setNotification(`Acquisition failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runBuild = async () => {
    if (!selectedAcqRepo.includes('/')) {
      setNotification('Please select or specify a repository owner/name');
      return;
    }
    const [owner, name] = selectedAcqRepo.split('/');
    try {
      setExecuting(true);
      const res = await fetch(`/github/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: buildCommand, timeoutMs: 60000 }),
      });
      const data = await res.json();
      setBuildLogs(data);
      setNotification(data.success ? 'Build succeeded!' : `Build failed (Exit Code: ${data.exitCode})`);
    } catch (err: any) {
      setNotification(`Build execution failed: ${err.message}`);
    } finally {
      setExecuting(false);
    }
  };

  const runTest = async () => {
    if (!selectedAcqRepo.includes('/')) {
      setNotification('Please select or specify a repository owner/name');
      return;
    }
    const [owner, name] = selectedAcqRepo.split('/');
    try {
      setExecuting(true);
      const res = await fetch(`/github/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: testCommand, timeoutMs: 60000 }),
      });
      const data = await res.json();
      setTestLogs(data);
      setNotification(data.success ? 'Tests passed!' : `Tests failed (Exit Code: ${data.exitCode})`);
    } catch (err: any) {
      setNotification(`Test execution failed: ${err.message}`);
    } finally {
      setExecuting(false);
    }
  };

  const proposeIntegration = async () => {
    if (!selectedRepo) return;
    try {
      setLoading(true);
      const res = await fetch(`/github/repositories/${encodeURIComponent(selectedRepo.owner)}/${encodeURIComponent(selectedRepo.name)}/propose-integration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'OPEN_SOURCE_SOFTWARE',
          protocol: 'CLI',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setNotification(`Integration proposal created: [${data.proposal.capabilityId}]`);
        fetchProposals();
        setActiveTab('proposals');
      } else {
        const err = await res.json();
        setNotification(`Proposal failed: ${err.error}`);
      }
    } catch (err: any) {
      setNotification(`Proposal error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const approveProposal = async (proposalId: string) => {
    try {
      setProposalActionStatus('Approving...');
      const res = await fetch(`/github/proposals/${proposalId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decidedBy: 'RUSHIKESH', reason: 'Verified open-source capability' }),
      });
      if (res.ok) {
        const data = await res.json();
        setNotification(`Proposal approved & registered into FP-07 fabric: ${data.proposal.capabilityId}`);
        fetchProposals();
      }
    } catch (err: any) {
      setNotification(`Approval error: ${err.message}`);
    } finally {
      setProposalActionStatus(null);
    }
  };

  const rejectProposal = async (proposalId: string) => {
    try {
      setProposalActionStatus('Rejecting...');
      const res = await fetch(`/github/proposals/${proposalId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Rejected by security policy' }),
      });
      if (res.ok) {
        setNotification(`Proposal rejected.`);
        fetchProposals();
      }
    } catch (err: any) {
      setNotification(`Rejection error: ${err.message}`);
    } finally {
      setProposalActionStatus(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-gray-100">
      {/* Header & Status Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <Github className="w-8 h-8 text-indigo-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">GitHub Intelligence Center</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-indigo-950/80 text-indigo-300 border border-indigo-700/50">
              FP-08
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Sovereign discovery, static intelligence, sandboxing, and capability acquisition pipeline
          </p>
        </div>

        {/* Global Controls & Rate Limit Indicator */}
        <div className="flex items-center space-x-3">
          {rateLimit && (
            <div className="flex items-center space-x-2 text-xs bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-gray-400">Rate Limit:</span>
              <span className={`font-mono font-medium ${rateLimit.remaining < 10 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {rateLimit.remaining}/{rateLimit.limit}
              </span>
              <span className="text-gray-500">({rateLimit.authenticated ? 'AUTH' : 'PUBLIC'})</span>
            </div>
          )}
          <div className="flex items-center space-x-1.5 text-xs bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5">
            <Radio className={`w-3.5 h-3.5 ${sseConnected ? 'text-emerald-400 animate-pulse' : 'text-gray-500'}`} />
            <span className="text-gray-300">{sseConnected ? 'SSE Live' : 'Disconnected'}</span>
          </div>
          <button
            onClick={() => {
              fetchRepositories();
              fetchAcquisitions();
              fetchProvenance();
              fetchProposals();
              fetchRateLimit();
            }}
            className="p-1.5 text-gray-400 hover:text-white bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-lg transition"
            title="Refresh All"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="bg-indigo-950/60 border border-indigo-800/80 text-indigo-200 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-indigo-400 hover:text-white font-mono ml-4">
            ×
          </button>
        </div>
      )}

      {/* Search Header Bar */}
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search GitHub repositories (e.g. 'browser automation', 'whisper stt', 'workflow engine')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <input
          type="text"
          placeholder="Language (optional)"
          value={searchLanguage}
          onChange={(e) => setSearchLanguage(e.target.value)}
          className="sm:w-44 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={searching}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg flex items-center justify-center space-x-2 transition"
        >
          <Search className="w-4 h-4" />
          <span>{searching ? 'Searching...' : 'Search'}</span>
        </button>
      </form>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-gray-800 space-x-1 overflow-x-auto text-sm">
        {[
          { id: 'repositories', label: 'Discovered', count: repositories.length, icon: Layers },
          { id: 'search', label: 'Search Results', count: searchResults.length, icon: Search },
          { id: 'detail', label: 'Repository Intelligence', icon: FileText, disabled: !selectedRepo },
          { id: 'security', label: 'Security Heuristics', count: repoSecurityFindings.length, icon: Shield },
          { id: 'dependencies', label: 'Dependencies', count: repoDependencies.length, icon: Package },
          { id: 'sandbox', label: 'Sandbox Workspaces', count: acquisitions.length, icon: Box },
          { id: 'buildtest', label: 'Build & Test', icon: Terminal },
          { id: 'proposals', label: 'Capability Proposals', count: proposals.length, icon: Award },
          { id: 'provenance', label: 'Provenance Ledger', count: provenanceList.length, icon: GitCommit },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              disabled={(tab as any).disabled}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-3.5 py-2.5 border-b-2 font-medium transition whitespace-nowrap ${
                isActive
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-950/20'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
              } ${(tab as any).disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-300 font-mono">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: REPOSITORIES */}
      {activeTab === 'repositories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Showing {repositories.length} discovered / cached repositories</span>
            <span>All repository content treated as untrusted DATA</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {repositories.map((repo) => (
              <div
                key={repo.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-white text-base truncate" title={repo.fullName}>
                      {repo.fullName}
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-300 font-mono">
                      ⭐ {repo.stars.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 line-clamp-2 min-h-[32px]">
                    {repo.description || 'No description provided.'}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3 text-xs">
                    {repo.language && (
                      <span className="px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/40 font-mono">
                        {repo.language}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 font-mono">
                      {repo.licenseSpdx || 'NO_LICENSE'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">
                      {(repo.sizeKb / 1024).toFixed(1)} MB
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-800/80 pt-3 mt-4 flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-mono">Updated: {repo.updatedAt.slice(0, 10)}</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => selectRepository(repo)}
                      className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 rounded font-medium transition"
                    >
                      Inspect
                    </button>
                    <button
                      onClick={() => triggerAcquire(repo.owner, repo.name)}
                      className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded font-medium transition flex items-center space-x-1"
                    >
                      <Box className="w-3 h-3" />
                      <span>Sandbox</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {repositories.length === 0 && !loading && (
            <div className="text-center py-16 bg-gray-900/50 border border-dashed border-gray-800 rounded-xl">
              <Github className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No repositories discovered yet.</p>
              <p className="text-xs text-gray-500 mt-1">Use the search box above to discover open-source candidate repositories.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SEARCH RESULTS */}
      {activeTab === 'search' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Found {searchResults.length} candidates for query "{searchQuery}"</span>
            <span>Factual candidate metrics without arbitrary scoring</span>
          </div>

          <div className="space-y-3">
            {searchResults.map((repo) => (
              <div
                key={repo.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="font-semibold text-white text-base hover:text-indigo-400 transition cursor-pointer" onClick={() => selectRepository(repo)}>
                      {repo.fullName}
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-300 font-mono">
                      ⭐ {repo.stars.toLocaleString()}
                    </span>
                    {repo.language && (
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/40 font-mono">
                        {repo.language}
                      </span>
                    )}
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 font-mono">
                      {repo.licenseSpdx || 'NO_LICENSE'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{repo.description || 'No description provided.'}</p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500 font-mono">
                    <span>Forks: {repo.forks}</span>
                    <span>Open Issues: {repo.openIssues}</span>
                    <span>Pushed: {repo.pushedAt?.slice(0, 10)}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 text-gray-400 hover:text-white bg-gray-800 rounded-lg transition"
                    title="Open on GitHub"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => selectRepository(repo)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition"
                  >
                    Inspect & Analyze
                  </button>
                  <button
                    onClick={() => triggerAcquire(repo.owner, repo.name)}
                    className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-medium transition flex items-center space-x-1"
                  >
                    <Box className="w-3.5 h-3.5" />
                    <span>Acquire</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: REPOSITORY DETAIL & INTELLIGENCE */}
      {activeTab === 'detail' && selectedRepo && (
        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <div className="flex items-center space-x-3">
                  <h2 className="text-xl font-bold text-white">{selectedRepo.fullName}</h2>
                  <a
                    href={selectedRepo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-gray-400 hover:text-white"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
                <p className="text-sm text-gray-300 mt-2">{selectedRepo.description}</p>
                <div className="flex flex-wrap gap-2 mt-4 text-xs font-mono">
                  <span className="px-2.5 py-1 rounded bg-gray-800 text-gray-300">Default Branch: {selectedRepo.defaultBranch}</span>
                  <span className="px-2.5 py-1 rounded bg-gray-800 text-gray-300">Stars: {selectedRepo.stars}</span>
                  <span className="px-2.5 py-1 rounded bg-gray-800 text-gray-300">Forks: {selectedRepo.forks}</span>
                  <span className="px-2.5 py-1 rounded bg-gray-800 text-gray-300">Issues: {selectedRepo.openIssues}</span>
                  <span className="px-2.5 py-1 rounded bg-gray-800 text-gray-300">Size: {(selectedRepo.sizeKb / 1024).toFixed(1)} MB</span>
                </div>
              </div>

              <div className="flex flex-wrap md:flex-col gap-2">
                <button
                  onClick={triggerAnalyze}
                  disabled={analyzing}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center justify-center space-x-2 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
                  <span>{analyzing ? 'Analyzing...' : 'Re-Analyze'}</span>
                </button>
                <button
                  onClick={() => triggerAcquire(selectedRepo.owner, selectedRepo.name)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-medium flex items-center justify-center space-x-2 transition"
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>Acquire to Sandbox</span>
                </button>
                <button
                  onClick={proposeIntegration}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium flex items-center justify-center space-x-2 transition"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Propose Integration</span>
                </button>
              </div>
            </div>
          </div>

          {/* Intelligence Overview Cards */}
          {repoIntelligence && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* License Card */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
                <span className="text-xs text-gray-400 font-medium">License Intelligence</span>
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold text-white">{repoIntelligence.license.spdx}</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                    repoIntelligence.license.compatibility === 'COMPATIBLE'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    {repoIntelligence.license.compatibility}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  Copyleft: {repoIntelligence.license.copyleft ? 'Yes (Viral)' : 'No'} • Commercial: {repoIntelligence.license.commercialUse ? 'Yes' : 'No'}
                </p>
              </div>

              {/* Architecture Card */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
                <span className="text-xs text-gray-400 font-medium">Inferred Architecture</span>
                <div className="text-lg font-bold text-white">{repoIntelligence.architecture}</div>
                <p className="text-xs text-gray-400">
                  Target: {repoIntelligence.compatibility.status} (OS: {repoIntelligence.compatibility.osCompatible ? 'Windows OK' : 'Non-Windows'})
                </p>
              </div>

              {/* Security Heuristics Card */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
                <span className="text-xs text-gray-400 font-medium">Security Static Risk</span>
                <div className="flex items-center space-x-2">
                  <span className={`text-lg font-bold ${
                    repoSecurityFindings.length === 0 ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {repoSecurityFindings.length === 0 ? 'CLEAN' : `${repoSecurityFindings.length} FINDINGS`}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  Static heuristic scan only. Untrusted execution prohibited.
                </p>
              </div>

              {/* Resource Estimates Card */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
                <span className="text-xs text-gray-400 font-medium">Resource Estimation</span>
                <div className="text-lg font-bold text-white font-mono">
                  {repoIntelligence.resourceEstimate.ramMb} MB RAM
                </div>
                <p className="text-xs text-gray-400">
                  CPU: {repoIntelligence.resourceEstimate.cpu} • Build Time: ~{repoIntelligence.resourceEstimate.estimatedBuildTimeSec}s
                </p>
              </div>
            </div>
          )}

          {/* README Intelligence Section */}
          {repoIntelligence?.readme && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
              <h3 className="font-semibold text-white text-base flex items-center space-x-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>README Defanged Intelligence</span>
              </h3>
              <p className="text-xs text-amber-300/80 bg-amber-950/30 border border-amber-800/40 p-3 rounded-lg">
                Prompt injection defense active: README text defanged and sanitized. System instructions in documentation are treated strictly as data.
              </p>
              <div className="bg-gray-950 rounded-lg p-4 font-mono text-xs text-gray-300 whitespace-pre-wrap max-h-72 overflow-y-auto border border-gray-800/80">
                {repoIntelligence.readme.defangedSummary}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SECURITY HEURISTICS */}
      {activeTab === 'security' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Static Heuristics Inspection: {repoSecurityFindings.length} findings for {selectedRepo?.fullName || 'Selected Repo'}</span>
            <span>Checks for reverse shells, credential harvesting, dynamic execution, and privileged docker runs</span>
          </div>

          <div className="space-y-3">
            {repoSecurityFindings.map((f) => (
              <div
                key={f.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-start space-x-4"
              >
                <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  f.severity === 'CRITICAL' || f.severity === 'HIGH' ? 'text-red-400' : 'text-amber-400'
                }`} />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center space-x-3">
                    <span className="font-semibold text-white text-sm">{f.indicator}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                      f.severity === 'CRITICAL' ? 'bg-red-950 text-red-300 border border-red-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}>
                      {f.severity}
                    </span>
                    <span className="text-xs text-gray-500 font-mono">Confidence: {f.confidence}</span>
                  </div>
                  <p className="text-xs text-gray-300 font-mono">{f.evidence}</p>
                  {f.filePath && (
                    <span className="text-xs text-gray-500 font-mono">File: {f.filePath}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {repoSecurityFindings.length === 0 && (
            <div className="text-center py-12 bg-gray-900/50 border border-dashed border-gray-800 rounded-xl">
              <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-gray-300 font-medium">No Security Risk Indicators Detected</p>
              <p className="text-xs text-gray-500 mt-1">Static heuristics did not find credential harvesting, reverse shells, or malicious installation hooks.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: DEPENDENCIES */}
      {activeTab === 'dependencies' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Declared Manifest Dependencies: {repoDependencies.length} records</span>
            <span>Static inspection without running dependency install lifecycle hooks</span>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-800/50 text-gray-400 font-mono border-b border-gray-800">
                <tr>
                  <th className="p-3">Package Name</th>
                  <th className="p-3">Version Spec</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Runtime</th>
                  <th className="p-3">Manifest</th>
                  <th className="p-3">Risk Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-gray-300 font-mono">
                {repoDependencies.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-800/30">
                    <td className="p-3 font-semibold text-white">{d.name}</td>
                    <td className="p-3 text-gray-400">{d.versionSpec}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300">{d.dependencyType}</span>
                    </td>
                    <td className="p-3">{d.runtime}</td>
                    <td className="p-3 text-gray-500">{d.manifestFile}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded ${
                        d.riskLevel === 'HIGH' || d.riskLevel === 'CRITICAL' ? 'bg-red-950 text-red-300' : 'bg-emerald-950 text-emerald-300'
                      }`}>
                        {d.riskLevel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {repoDependencies.length === 0 && (
            <div className="text-center py-12 bg-gray-900/50 border border-dashed border-gray-800 rounded-xl">
              <Package className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No dependencies declared or analyzed yet.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: SANDBOX WORKSPACES */}
      {activeTab === 'sandbox' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Isolated Sandbox Environments ({acquisitions.length})</span>
            <span>Cloned with strict sandbox separation, zero credential access, and resource isolation</span>
          </div>

          <div className="space-y-3">
            {acquisitions.map((acq) => (
              <div
                key={acq.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <span className="font-semibold text-white text-sm">{acq.repositoryId}</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      {acq.status}
                    </span>
                  </div>
                  <div className="text-gray-400">Path: {acq.targetPath}</div>
                  <div className="text-gray-500 flex items-center space-x-3">
                    <span>Commit: {(acq.commitSha || 'HEAD').slice(0, 10)}</span>
                    <span>Ref: {acq.refName}</span>
                    <span>Acquired: {acq.acquiredAt.slice(0, 19)}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      const cleanRepo = acq.repositoryId.replace(/^github_/, '').replace('_', '/');
                      setSelectedAcqRepo(cleanRepo);
                      setActiveTab('buildtest');
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium transition flex items-center space-x-1"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Build / Test</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {acquisitions.length === 0 && (
            <div className="text-center py-12 bg-gray-900/50 border border-dashed border-gray-800 rounded-xl">
              <Box className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No sandbox workspaces acquired yet.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 7: BUILD & TEST */}
      {activeTab === 'buildtest' && (
        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-white text-base flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-indigo-400" />
              <span>Isolated Sandboxed Execution Control</span>
            </h3>
            <p className="text-xs text-gray-400">
              Commands are executed strictly inside the sandbox directory with scrubbed credentials, strict allowlists, and timeout governance.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-mono">Target Repository (owner/name)</label>
                <input
                  type="text"
                  value={selectedAcqRepo}
                  onChange={(e) => setSelectedAcqRepo(e.target.value)}
                  placeholder="e.g. octocat/Hello-World"
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Build Section */}
              <div className="bg-gray-950 border border-gray-800/80 rounded-lg p-4 space-y-3">
                <span className="text-xs font-semibold text-indigo-300">Sandboxed Build Execution</span>
                <input
                  type="text"
                  value={buildCommand}
                  onChange={(e) => setBuildCommand(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded p-2 text-xs text-white font-mono"
                />
                <button
                  onClick={runBuild}
                  disabled={executing}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium py-2 rounded transition flex items-center justify-center space-x-1"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Execute Controlled Build</span>
                </button>
              </div>

              {/* Test Section */}
              <div className="bg-gray-950 border border-gray-800/80 rounded-lg p-4 space-y-3">
                <span className="text-xs font-semibold text-emerald-300">Sandboxed Test Execution</span>
                <input
                  type="text"
                  value={testCommand}
                  onChange={(e) => setTestCommand(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded p-2 text-xs text-white font-mono"
                />
                <button
                  onClick={runTest}
                  disabled={executing}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium py-2 rounded transition flex items-center justify-center space-x-1"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Execute Controlled Test</span>
                </button>
              </div>
            </div>
          </div>

          {/* Execution Output Logs */}
          {(buildLogs || testLogs) && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
              <h4 className="font-semibold text-white text-sm">Execution Output Logs</h4>
              {buildLogs && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-indigo-400">BUILD LOG ({buildLogs.durationMs}ms)</span>
                    <span className={buildLogs.success ? 'text-emerald-400' : 'text-red-400'}>
                      {buildLogs.success ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>
                  <pre className="bg-gray-950 p-3 rounded font-mono text-xs text-gray-300 overflow-x-auto max-h-48 border border-gray-800">
                    {buildLogs.stdout || buildLogs.stderr || 'No output.'}
                  </pre>
                </div>
              )}
              {testLogs && (
                <div className="space-y-1 pt-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-emerald-400">TEST LOG ({testLogs.durationMs}ms)</span>
                    <span className={testLogs.success ? 'text-emerald-400' : 'text-red-400'}>
                      {testLogs.success ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>
                  <pre className="bg-gray-950 p-3 rounded font-mono text-xs text-gray-300 overflow-x-auto max-h-48 border border-gray-800">
                    {testLogs.stdout || testLogs.stderr || 'No output.'}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 8: CAPABILITY PROPOSALS */}
      {activeTab === 'proposals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Integration Proposals ({proposals.length})</span>
            <span>Human-in-the-loop approval boundary before registration into Universal Capability Fabric</span>
          </div>

          <div className="space-y-3">
            {proposals.map((prop) => (
              <div
                key={prop.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <span className="font-semibold text-white text-sm">{prop.name}</span>
                    <span className={`px-2 py-0.5 rounded ${
                      prop.status === 'APPROVED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                    }`}>
                      {prop.status}
                    </span>
                    <span className="text-gray-400">[{prop.capabilityId}]</span>
                  </div>
                  <p className="text-gray-400 font-sans">{prop.description}</p>
                  <div className="flex items-center space-x-4 text-gray-500">
                    <span>Protocol: {prop.protocol}</span>
                    <span>Risk: {prop.riskLevel}</span>
                    <span>Approval Required: {prop.requiresHumanApproval ? 'YES' : 'NO'}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {prop.status !== 'APPROVED' && (
                    <button
                      onClick={() => approveProposal(prop.id)}
                      disabled={Boolean(proposalActionStatus)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium transition"
                    >
                      Approve & Register
                    </button>
                  )}
                  {prop.status !== 'REJECTED' && prop.status !== 'APPROVED' && (
                    <button
                      onClick={() => rejectProposal(prop.id)}
                      disabled={Boolean(proposalActionStatus)}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded font-medium transition"
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {proposals.length === 0 && (
            <div className="text-center py-12 bg-gray-900/50 border border-dashed border-gray-800 rounded-xl">
              <Award className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No integration proposals generated yet.</p>
              <p className="text-xs text-gray-500 mt-1">Select an analyzed repository and click "Propose Integration".</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 9: PROVENANCE */}
      {activeTab === 'provenance' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Immutable Provenance Ledger ({provenanceList.length})</span>
            <span>Complete audit trail: source repository, commit SHA, license, and integration records</span>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-800/50 text-gray-400 font-mono border-b border-gray-800">
                <tr>
                  <th className="p-3">Repository</th>
                  <th className="p-3">Commit SHA</th>
                  <th className="p-3">License</th>
                  <th className="p-3">Source URL</th>
                  <th className="p-3">Acquired At</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-gray-300 font-mono">
                {provenanceList.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-800/30">
                    <td className="p-3 font-semibold text-white">{p.owner}/{p.repository}</td>
                    <td className="p-3 text-indigo-400">{(p.commitSha || 'unknown').slice(0, 10)}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300">{p.license}</span>
                    </td>
                    <td className="p-3 text-gray-400 truncate max-w-xs">{p.url}</td>
                    <td className="p-3 text-gray-500">{p.createdAt?.slice(0, 19)}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300">
                        {p.integrationStatus || 'PENDING'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {provenanceList.length === 0 && (
            <div className="text-center py-12 bg-gray-900/50 border border-dashed border-gray-800 rounded-xl">
              <GitCommit className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No provenance records recorded yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Live SSE Event Stream Box */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <Radio className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span className="font-semibold text-gray-300">Real-Time Event Stream</span>
          </div>
          <span className="text-gray-500 font-mono">{events.length} events logged</span>
        </div>
        <div className="bg-gray-950 rounded-lg p-3 font-mono text-xs text-gray-400 max-h-36 overflow-y-auto space-y-1 border border-gray-800/80">
          {events.map((e, idx) => (
            <div key={idx} className="flex items-start space-x-2">
              <span className="text-gray-600">[{e.timestamp}]</span>
              <span className="text-indigo-400">{e.type}:</span>
              <span className="text-gray-300 truncate">{JSON.stringify(e.payload)}</span>
            </div>
          ))}
          {events.length === 0 && <div className="text-gray-600">Waiting for intelligence fabric events...</div>}
        </div>
      </div>
    </div>
  );
};
