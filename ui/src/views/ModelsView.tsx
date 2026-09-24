import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Zap,
  CheckCircle2,
  AlertCircle,
  Cloud,
  HardDrive,
  Shield,
  RefreshCw,
  Sliders,
  DollarSign,
  Activity,
  Layers,
  ArrowRight,
  Eye,
  Info,
  Clock,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';

interface ModelsViewProps {
  providers?: any[];
}

export const ModelsView: React.FC<ModelsViewProps> = ({ providers: initialProviders }) => {
  const [providers, setProviders] = useState<any[]>(initialProviders || []);
  const [activePolicy, setActivePolicy] = useState<string>('BALANCED');
  const [policyConfig, setPolicyConfig] = useState<any>(null);
  const [usageStats, setUsageStats] = useState<any>(null);
  const [recentAudits, setRecentAudits] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'catalog' | 'preview' | 'usage' | 'policy'>('catalog');

  // Previewer state
  const [previewPrompt, setPreviewPrompt] = useState<string>('Write a TypeScript function to sanitize user input.');
  const [previewPrivacy, setPreviewPrivacy] = useState<string>('');
  const [previewTaskType, setPreviewTaskType] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [previewResult, setPreviewResult] = useState<any>(null);

  const loadData = async () => {
    try {
      const [modelsRes, policyRes, usageRes] = await Promise.allSettled([
        api.getModels(),
        api.getRoutingPolicy(),
        api.getRoutingUsage(20),
      ]);

      if (modelsRes.status === 'fulfilled') {
        setProviders(modelsRes.value.providers || []);
        if (modelsRes.value.activePolicy) setActivePolicy(modelsRes.value.activePolicy);
      }
      if (policyRes.status === 'fulfilled') {
        setActivePolicy(policyRes.value.policy || 'BALANCED');
        setPolicyConfig(policyRes.value);
      }
      if (usageRes.status === 'fulfilled') {
        setUsageStats(usageRes.value.stats);
        setRecentAudits(usageRes.value.recentAudits || []);
      }
    } catch (err) {
      console.error('Failed to load model router data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await api.refreshModels();
      await loadData();
    } catch (err) {
      console.error('Failed to refresh models:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handlePolicyChange = async (newPolicy: string) => {
    try {
      setActivePolicy(newPolicy);
      await api.updateRoutingPolicy(newPolicy);
      await loadData();
    } catch (err) {
      console.error('Failed to set routing policy:', err);
    }
  };

  const handleRunPreview = async () => {
    if (!previewPrompt.trim()) return;
    setPreviewLoading(true);
    try {
      const res = await api.previewRouting({
        prompt: previewPrompt,
        privacyLevel: previewPrivacy || undefined,
        taskType: previewTaskType || undefined,
      });
      if (res.success) {
        setPreviewResult(res.preview);
      }
    } catch (err) {
      console.error('Failed to preview routing:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const localProviders = providers.filter((p) => p.isLocal);
  const cloudProviders = providers.filter((p) => !p.isLocal);
  const totalModelsCount = providers.reduce((acc, p) => acc + (p.models?.length || 0), 0);

  const policyDescriptions: Record<string, { title: string; desc: string; icon: string }> = {
    BALANCED: { title: 'Balanced Routing', desc: 'Harmonious multi-objective optimization balancing capability, latency, cost, and privacy.', icon: '⚖️' },
    LOCAL_FIRST: { title: 'Local First (Sovereign)', desc: 'Maximizes offline execution on local machine unless task strictly requires cloud.', icon: '🛡️' },
    QUALITY_FIRST: { title: 'Quality First', desc: 'Routes to the highest capability reasoning and coding models available.', icon: '💎' },
    SPEED_FIRST: { title: 'Speed & Low Latency', desc: 'Favors rapid local or fast cloud inference models for maximum responsiveness.', icon: '⚡' },
    COST_FIRST: { title: 'Cost Minimizer', desc: 'Prioritizes zero-cost local inference and economical per-token tier models.', icon: '🪙' },
    PRIVACY_FIRST: { title: 'Privacy Strict', desc: 'Strictly forbids sensitive data transit to external cloud networks.', icon: '🔒' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '30px' }}>
      {/* Header with Traditional Indian Aesthetics */}
      <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>☸</span>
            <h1 className="view-title" style={{ margin: 0 }}>Model Intelligence & Routing</h1>
          </div>
          <p className="view-subtitle" style={{ margin: '4px 0 0 0' }}>
            Provider-agnostic intelligence engine selecting the right model for the right job under sovereign privacy constraints.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className="btn btn-secondary"
            onClick={handleRefresh}
            disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            <span>{refreshing ? 'Polling Providers...' : 'Refresh Providers'}</span>
          </button>
        </div>
      </div>

      {/* Top Intelligence Telemetry Grid */}
      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
        {/* Local AI State */}
        <div className="card" style={{ borderLeft: '3px solid var(--accent-emerald)', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)' }}>LOCAL AI (OLLAMA)</span>
            <HardDrive size={16} color="var(--accent-emerald)" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {localProviders.some((p) => p.health?.status === 'healthy' || p.health?.status === 'degraded') ? (
              <span style={{ color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-emerald)', display: 'inline-block' }} />
                Ready
              </span>
            ) : (
              <span style={{ color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-amber)', display: 'inline-block' }} />
                Offline
              </span>
            )}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {localProviders.reduce((sum, p) => sum + (p.models?.length || 0), 0)} local models available • 100% Private
          </div>
        </div>

        {/* Cloud AI State */}
        <div className="card" style={{ borderLeft: '3px solid var(--accent-indigo)', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)' }}>CLOUD PROVIDERS</span>
            <Cloud size={16} color="var(--accent-indigo)" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {cloudProviders.filter((p) => p.health?.status === 'healthy').length > 0 ? (
              <span style={{ color: 'var(--accent-cyan)' }}>
                {cloudProviders.filter((p) => p.health?.status === 'healthy').length} Authorized
              </span>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>Unconfigured (Optional)</span>
            )}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            OpenAI, Anthropic, Google Gemini gateways
          </div>
        </div>

        {/* Active Policy */}
        <div className="card" style={{ borderLeft: '3px solid var(--color-gold)', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)' }}>ACTIVE POLICY</span>
            <Sliders size={16} color="var(--color-gold)" />
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-gold)', marginBottom: '4px' }}>
            {policyDescriptions[activePolicy]?.icon} {activePolicy}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {policyDescriptions[activePolicy]?.title}
          </div>
        </div>

        {/* Usage & Cost */}
        <div className="card" style={{ borderLeft: '3px solid var(--accent-cyan)', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)' }}>TOTAL TOKENS & COST</span>
            <DollarSign size={16} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {usageStats ? (usageStats.totalInputTokens + usageStats.totalOutputTokens).toLocaleString() : '0'} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>tokens</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Est. Cost: <strong style={{ color: 'var(--accent-emerald)' }}>${usageStats ? Number(usageStats.totalCostUsd).toFixed(4) : '0.0000'}</strong> • {usageStats?.totalCalls || 0} calls
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
        <button
          className={`btn ${activeTab === 'catalog' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('catalog')}
          style={{ fontSize: '13px', padding: '6px 14px' }}
        >
          <Layers size={14} style={{ marginRight: '6px' }} />
          Providers & Models ({totalModelsCount})
        </button>
        <button
          className={`btn ${activeTab === 'preview' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('preview')}
          style={{ fontSize: '13px', padding: '6px 14px' }}
        >
          <Sparkles size={14} style={{ marginRight: '6px' }} />
          Routing Decision Preview
        </button>
        <button
          className={`btn ${activeTab === 'policy' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('policy')}
          style={{ fontSize: '13px', padding: '6px 14px' }}
        >
          <Sliders size={14} style={{ marginRight: '6px' }} />
          Policy & Weights
        </button>
        <button
          className={`btn ${activeTab === 'usage' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('usage')}
          style={{ fontSize: '13px', padding: '6px 14px' }}
        >
          <Activity size={14} style={{ marginRight: '6px' }} />
          Audit & Usage Telemetry ({recentAudits.length})
        </button>
      </div>

      {/* TAB 1: CATALOG OF PROVIDERS & MODELS */}
      {activeTab === 'catalog' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {providers.map((p) => {
            const isHealthy = p.health?.status === 'healthy';
            const isDegraded = p.health?.status === 'degraded';
            const isUnconfigured = p.health?.status === 'unconfigured';

            return (
              <div key={p.providerId} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {p.isLocal ? <HardDrive size={20} color="var(--accent-emerald)" /> : <Cloud size={20} color="var(--accent-indigo)" />}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{p.displayName || p.providerId.toUpperCase()}</span>
                        <span className={`badge ${isHealthy ? 'badge-emerald' : isDegraded ? 'badge-amber' : 'badge-indigo'}`} style={{ fontSize: '10px' }}>
                          {p.health?.status?.toUpperCase() || 'UNKNOWN'}
                        </span>
                        {p.isLocal && (
                          <span className="badge badge-cyan" style={{ fontSize: '10px' }}>
                            100% SOVEREIGN LOCAL
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {p.health?.message || (p.isLocal ? 'Local Ollama runtime' : 'Cloud API endpoint')}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {p.models?.length || 0} models registered
                  </div>
                </div>

                {/* Models Sub-Grid */}
                {p.models && p.models.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                    {p.models.map((m: any) => (
                      <div
                        key={m.id}
                        style={{
                          background: 'rgba(0,0,0,0.25)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                              {m.id}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {m.displayName}
                            </div>
                          </div>
                          <span className="badge badge-indigo" style={{ fontSize: '10px' }}>
                            {m.costClassification === 'free-local' ? 'FREE' : 'CLOUD'}
                          </span>
                        </div>

                        {/* Capabilities Tags */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                          {m.capabilities?.map((cap: string) => (
                            <span
                              key={cap}
                              style={{
                                fontSize: '10px',
                                background: 'rgba(255, 153, 51, 0.1)',
                                color: 'var(--color-gold)',
                                border: '1px solid rgba(255, 153, 51, 0.25)',
                                borderRadius: '3px',
                                padding: '2px 5px',
                              }}
                            >
                              {cap}
                            </span>
                          ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <span>Context: <strong>{m.contextWindow ? `${(m.contextWindow / 1024).toFixed(0)}k` : '8k'}</strong></span>
                          <span>Latency: <strong>{m.latencyClass || 'FAST'}</strong></span>
                          <span>Privacy: <strong>{m.isLocal ? 'LOCAL' : 'CLOUD'}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '12px', background: 'rgba(0,0,0,0.15)', borderRadius: 'var(--radius-xs)' }}>
                    {isUnconfigured
                      ? 'Provider is not configured with an API key. Local model operations remain fully operational.'
                      : 'No models currently registered for this provider.'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: ROUTING DECISION PREVIEW PLAYGROUND */}
      {activeTab === 'preview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
          {/* Input Panel */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="card-header">
              <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} color="var(--color-gold)" />
                Task & Prompt Input
              </span>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Enter task description or prompt to simulate routing:
              </label>
              <textarea
                value={previewPrompt}
                onChange={(e) => setPreviewPrompt(e.target.value)}
                rows={5}
                style={{
                  width: '100%',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-xs)',
                  color: 'var(--text-primary)',
                  padding: '10px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Task Type Override (Optional)
                </label>
                <select
                  value={previewTaskType}
                  onChange={(e) => setPreviewTaskType(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-xs)',
                    color: 'var(--text-primary)',
                    padding: '8px',
                    fontSize: '12px',
                  }}
                >
                  <option value="">Auto-Detect</option>
                  <option value="CONVERSATION">CONVERSATION</option>
                  <option value="REASONING">REASONING</option>
                  <option value="CODE">CODE</option>
                  <option value="RESEARCH">RESEARCH</option>
                  <option value="GOAL_DECOMPOSITION">GOAL_DECOMPOSITION</option>
                  <option value="STRUCTURED_EXTRACTION">STRUCTURED_EXTRACTION</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Privacy Override (Optional)
                </label>
                <select
                  value={previewPrivacy}
                  onChange={(e) => setPreviewPrivacy(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-xs)',
                    color: 'var(--text-primary)',
                    padding: '8px',
                    fontSize: '12px',
                  }}
                >
                  <option value="">Auto-Detect</option>
                  <option value="PUBLIC">PUBLIC</option>
                  <option value="NORMAL">NORMAL</option>
                  <option value="PRIVATE">PRIVATE</option>
                  <option value="HIGHLY_PRIVATE">HIGHLY_PRIVATE</option>
                </select>
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleRunPreview}
              disabled={previewLoading || !previewPrompt.trim()}
              style={{ marginTop: '6px' }}
            >
              {previewLoading ? 'Evaluating Candidates...' : 'Preview Routing Decision'}
            </button>
          </div>

          {/* Decision Results Panel */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="card-header">
              <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={16} color="var(--accent-cyan)" />
                Explainable Routing Output
              </span>
              {previewResult && (
                <span className={`badge ${previewResult.selected ? 'badge-emerald' : 'badge-amber'}`}>
                  {previewResult.selected ? 'ROUTED' : 'REJECTED'}
                </span>
              )}
            </div>

            {previewResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Selected Model Highlight */}
                {previewResult.selected && (
                  <div
                    style={{
                      background: 'rgba(255, 153, 51, 0.1)',
                      border: '1px solid rgba(255, 153, 51, 0.35)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '14px',
                    }}
                  >
                    <div style={{ fontSize: '11px', color: 'var(--color-gold)', fontWeight: 700, letterSpacing: '0.5px' }}>
                      SELECTED OPTIMAL MODEL
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                      {previewResult.providerId} / {previewResult.modelId}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
                      {previewResult.reason}
                    </div>
                  </div>
                )}

                {/* Task Profile Details */}
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: 'var(--radius-xs)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    TASK PROFILE DETECTED
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                    <div>Type: <strong>{previewResult.taskProfile?.taskType}</strong></div>
                    <div>Complexity: <strong>{previewResult.taskProfile?.complexity}</strong></div>
                    <div>Privacy: <strong>{previewResult.taskProfile?.privacyLevel}</strong></div>
                    <div>Est. Tokens: <strong>{previewResult.taskProfile?.estimatedInputTokens}</strong></div>
                    <div>Tools Needed: <strong>{previewResult.taskProfile?.requiresTools ? 'YES' : 'NO'}</strong></div>
                    <div>JSON Required: <strong>{previewResult.taskProfile?.requiresStructuredOutput ? 'YES' : 'NO'}</strong></div>
                  </div>
                </div>

                {/* Candidate Scores Breakdown */}
                {previewResult.candidateScores && previewResult.candidateScores.length > 0 && (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
                      CANDIDATE MODELS SCORING BREAKDOWN
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {previewResult.candidateScores.map((c: any, i: number) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 10px',
                            background: c.passedHardConstraints ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                            border: `1px solid ${c.passedHardConstraints ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                            borderRadius: 'var(--radius-xs)',
                            fontSize: '12px',
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.providerId}/{c.modelId}</span>
                            {c.rejectionReason && (
                              <div style={{ fontSize: '10px', color: 'var(--accent-red)' }}>{c.rejectionReason}</div>
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontWeight: 700, color: c.passedHardConstraints ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                              {c.passedHardConstraints ? `${c.totalScore.toFixed(1)} pts` : 'REJECTED'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                Enter a task prompt and click "Preview Routing Decision" to view the deterministic constraint validation and explainable score ranking.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: POLICY & WEIGHTS CONFIGURATION */}
      {activeTab === 'policy' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Routing Policy Selector</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '-6px', marginBottom: '16px' }}>
              Select the active policy governing how the router balances quality, latency, privacy, and compute costs.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              {Object.entries(policyDescriptions).map(([key, item]) => {
                const isSelected = activePolicy === key;
                return (
                  <div
                    key={key}
                    onClick={() => handlePolicyChange(key)}
                    style={{
                      border: isSelected ? '2px solid var(--color-gold)' : '1px solid var(--border-color)',
                      background: isSelected ? 'rgba(255, 153, 51, 0.1)' : 'var(--bg-card)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: isSelected ? 'var(--color-gold)' : 'var(--text-primary)' }}>
                        {item.icon} {item.title}
                      </span>
                      {isSelected && <CheckCircle2 size={16} color="var(--color-gold)" />}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      {item.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT & USAGE TELEMETRY */}
      {activeTab === 'usage' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Recent Model Execution Audits</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Credentials redacted automatically</span>
            </div>

            {recentAudits.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '8px' }}>Timestamp</th>
                      <th style={{ padding: '8px' }}>Model</th>
                      <th style={{ padding: '8px' }}>Task Type</th>
                      <th style={{ padding: '8px' }}>Tokens</th>
                      <th style={{ padding: '8px' }}>Latency</th>
                      <th style={{ padding: '8px' }}>Cost ($)</th>
                      <th style={{ padding: '8px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAudits.map((a) => (
                      <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '8px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {new Date(a.createdAt).toLocaleTimeString()}
                        </td>
                        <td style={{ padding: '8px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {a.providerId}/{a.modelId}
                        </td>
                        <td style={{ padding: '8px' }}>
                          <span className="badge badge-indigo" style={{ fontSize: '10px' }}>{a.taskType}</span>
                        </td>
                        <td style={{ padding: '8px', fontFamily: 'var(--font-mono)' }}>
                          {a.totalTokens}
                        </td>
                        <td style={{ padding: '8px', fontFamily: 'var(--font-mono)' }}>
                          {a.latencyMs}ms
                        </td>
                        <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', color: 'var(--accent-emerald)' }}>
                          ${Number(a.estimatedCostUsd).toFixed(4)}
                        </td>
                        <td style={{ padding: '8px' }}>
                          <span className={`badge ${a.success ? 'badge-emerald' : 'badge-red'}`} style={{ fontSize: '10px' }}>
                            {a.success ? (a.fallbackOccurred ? 'FALLBACK' : 'SUCCESS') : 'FAILED'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No model audits recorded yet. Inferences executed by conversation, agents, missions, or research will automatically log here.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
