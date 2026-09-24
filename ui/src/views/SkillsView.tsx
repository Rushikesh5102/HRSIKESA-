import React, { useState, useEffect, useCallback } from 'react';
import {
  Zap,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Layers,
  Shield,
  Plus,
  Search,
  Eye,
  Settings,
  RefreshCw,
  Power,
  Sliders,
  TrendingUp,
  FileCode,
  Wrench,
  CheckSquare,
} from 'lucide-react';
import {
  SkillInfo,
  SkillUsageInfo,
  SkillStatisticsInfo,
  SkillImprovementInfo,
  SkillPreviewInfo,
  SkillMatchCandidate,
} from '../types/api.types';
import { api } from '../services/api';
import { IndianFrame } from '../components/IndianFrame';

export const SkillsView: React.FC = () => {
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState<SkillInfo | null>(null);
  const [executions, setExecutions] = useState<SkillUsageInfo[]>([]);
  const [statistics, setStatistics] = useState<SkillStatisticsInfo | null>(null);
  const [improvements, setImprovements] = useState<SkillImprovementInfo[]>([]);
  const [preview, setPreview] = useState<SkillPreviewInfo | null>(null);
  
  // Filtering
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showBuilder, setShowBuilder] = useState(false);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [showMatcherModal, setShowMatcherModal] = useState(false);

  // Matcher state
  const [matchQuery, setMatchQuery] = useState('');
  const [matchResults, setMatchResults] = useState<SkillMatchCandidate[]>([]);
  const [matching, setMatching] = useState(false);

  // Execute state
  const [executeInputs, setExecuteInputs] = useState('{}');
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);

  // Builder state
  const [builderData, setBuilderData] = useState({
    name: '',
    displayName: '',
    description: '',
    category: 'SOFTWARE',
    riskLevel: 'TIER_1',
    capabilities: 'filesystem',
    tools: 'filesystem.read',
    stepsJson: JSON.stringify([
      {
        stepId: 'step_1',
        name: 'Initial Check',
        description: 'Check environment prerequisites',
        stepType: 'DETERMINISTIC',
        dependencies: [],
      }
    ], null, 2),
  });
  const [builderErrors, setBuilderErrors] = useState<string[]>([]);
  const [builderWarnings, setBuilderWarnings] = useState<string[]>([]);

  // Improvement proposal state
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [proposalReason, setProposalReason] = useState('');

  const loadSkills = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getSkills();
      if (res && res.skills) {
        setSkills(res.skills);
      }
    } catch (err) {
      console.error('Failed to load skills:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const handleSelectSkill = async (skill: SkillInfo) => {
    setSelectedSkill(skill);
    try {
      const [statsRes, execsRes, impsRes, previewRes] = await Promise.all([
        api.getSkillStatistics(skill.id).catch(() => null),
        api.getSkillExecutions(skill.id).catch(() => null),
        api.getSkillImprovements(skill.id).catch(() => null),
        api.previewSkill(skill.id, {}).catch(() => null),
      ]);

      if (statsRes && statsRes.statistics) setStatistics(statsRes.statistics);
      if (execsRes && execsRes.executions) setExecutions(execsRes.executions);
      if (impsRes && impsRes.proposals) setImprovements(impsRes.proposals);
      if (previewRes && previewRes.preview) setPreview(previewRes.preview);
    } catch (err) {
      console.error('Failed to load skill details:', err);
    }
  };

  const handleToggleStatus = async (skill: SkillInfo) => {
    try {
      if (skill.status === 'ACTIVE') {
        await api.disableSkill(skill.id);
      } else {
        await api.enableSkill(skill.id);
      }
      loadSkills();
      if (selectedSkill?.id === skill.id) {
        setSelectedSkill({ ...skill, status: skill.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' });
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleRunMatch = async () => {
    if (!matchQuery.trim()) return;
    try {
      setMatching(true);
      const res = await api.matchSkills({ request: matchQuery.trim() });
      if (res && res.matches) {
        setMatchResults(res.matches);
      }
    } catch (err) {
      console.error('Matching failed:', err);
    } finally {
      setMatching(false);
    }
  };

  const handleExecuteSkill = async () => {
    if (!selectedSkill) return;
    try {
      setExecuting(true);
      setExecutionResult(null);
      let parsedInputs = {};
      try {
        parsedInputs = JSON.parse(executeInputs);
      } catch {
        alert('Invalid JSON inputs format.');
        setExecuting(false);
        return;
      }

      const res = await api.executeSkill(selectedSkill.id, parsedInputs);
      setExecutionResult(res.result || res);
      // Refresh executions
      const execs = await api.getSkillExecutions(selectedSkill.id);
      if (execs && execs.executions) setExecutions(execs.executions);
      const stats = await api.getSkillStatistics(selectedSkill.id);
      if (stats && stats.statistics) setStatistics(stats.statistics);
    } catch (err: any) {
      setExecutionResult({ success: false, error: err.message });
    } finally {
      setExecuting(false);
    }
  };

  const handleSaveSkill = async () => {
    setBuilderErrors([]);
    setBuilderWarnings([]);
    try {
      let parsedSteps: any[] = [];
      try {
        parsedSteps = JSON.parse(builderData.stepsJson);
      } catch {
        setBuilderErrors(['Invalid JSON in steps definition.']);
        return;
      }

      const skillPayload = {
        name: builderData.name.trim(),
        displayName: builderData.displayName.trim() || builderData.name.trim(),
        description: builderData.description.trim(),
        category: builderData.category,
        riskLevel: builderData.riskLevel,
        owner: 'ROOT_RUSHIKESH',
        scope: 'GLOBAL',
        requiredCapabilities: builderData.capabilities.split(',').map((c) => c.trim()).filter(Boolean),
        requiredTools: builderData.tools.split(',').map((t) => t.trim()).filter(Boolean),
        inputsSchema: { type: 'object' },
        outputsSchema: { type: 'object' },
        steps: parsedSteps.map((s: any, idx: number) => ({
          stepId: s.stepId || `step_${idx + 1}`,
          name: s.name || `Step ${idx + 1}`,
          description: s.description || '',
          stepType: s.stepType || 'DETERMINISTIC',
          stepIndex: idx,
          dependencies: s.dependencies || [],
          tool: s.tool,
          capability: s.capability,
          verification: s.verification,
        })),
        permissions: {
          maxDangerTier: 2,
          requiredCapabilities: builderData.capabilities.split(',').map((c) => c.trim()).filter(Boolean),
          requiredTools: builderData.tools.split(',').map((t) => t.trim()).filter(Boolean),
          requiresHumanApproval: builderData.riskLevel === 'TIER_3' || builderData.riskLevel === 'TIER_4',
          allowedScopes: ['GLOBAL'],
        },
      };

      const res = await api.createSkill(skillPayload);
      if (res && res.skill) {
        setShowBuilder(false);
        loadSkills();
        setSelectedSkill(res.skill);
      }
    } catch (err: any) {
      setBuilderErrors([err.message || 'Validation failed']);
    }
  };

  const handleCreateProposal = async () => {
    if (!selectedSkill || !proposalReason.trim()) return;
    try {
      await api.createSkillImprovement(selectedSkill.id, {
        reason: proposalReason.trim(),
        evidence: { timestamp: new Date().toISOString(), suggestedBy: 'Human Operator' },
      });
      setShowProposalModal(false);
      setProposalReason('');
      const imps = await api.getSkillImprovements(selectedSkill.id);
      if (imps && imps.proposals) setImprovements(imps.proposals);
    } catch (err: any) {
      alert(`Failed to create proposal: ${err.message}`);
    }
  };

  // Filter skills
  const filteredSkills = skills.filter((s) => {
    if (categoryFilter !== 'ALL' && s.category !== categoryFilter) return false;
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.displayName.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const categories = Array.from(new Set(skills.map((s) => s.category)));

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* Top Banner */}
      <IndianFrame>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 bg-slate-900/60 rounded-lg border border-amber-500/20">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-amber-400 animate-pulse" />
              <h1 className="text-2xl font-bold tracking-tight text-amber-200">
                Procedural Intelligence — Skills Engine
              </h1>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Deterministic, versioned, DAG-based procedures orchestrating tools, capabilities, and verification.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowMatcherModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded border border-amber-500/30 text-sm transition"
            >
              <Search className="w-4 h-4" />
              Test Matcher
            </button>
            <button
              onClick={() => setShowBuilder(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded text-sm transition"
            >
              <Plus className="w-4 h-4" />
              Build Skill
            </button>
            <button
              onClick={loadSkills}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition"
              title="Refresh Skills"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>
        </div>
      </IndianFrame>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-lg">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Skills</div>
          <div className="text-2xl font-bold text-slate-100 mt-1">{skills.length}</div>
        </div>
        <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-lg">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Active Procedures</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {skills.filter((s) => s.status === 'ACTIVE').length}
          </div>
        </div>
        <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-lg">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Categories</div>
          <div className="text-2xl font-bold text-amber-300 mt-1">{categories.length}</div>
        </div>
        <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-lg">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Authority Guard</div>
          <div className="text-sm font-semibold text-sky-400 mt-2 flex items-center gap-1">
            <Shield className="w-4 h-4" /> Rushikesh Pattiwar
          </div>
        </div>
      </div>

      {/* Main Layout: Skills List & Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Skill List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Controls bar */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search skills by name or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 pl-9 pr-3 py-1.5 text-sm rounded border border-slate-800 focus:outline-none focus:border-amber-500 text-slate-200"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-950 px-3 py-1.5 text-sm rounded border border-slate-800 text-slate-300 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 px-3 py-1.5 text-sm rounded border border-slate-800 text-slate-300 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="DISABLED">DISABLED</option>
              <option value="DRAFT">DRAFT</option>
            </select>
          </div>

          {/* Skill Grid */}
          <div className="space-y-3">
            {filteredSkills.map((skill) => {
              const isSelected = selectedSkill?.id === skill.id;
              return (
                <div
                  key={skill.id}
                  onClick={() => handleSelectSkill(skill)}
                  className={`p-4 rounded-lg border transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isSelected
                      ? 'bg-amber-950/20 border-amber-500/50 shadow-lg shadow-amber-950/30'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-100">{skill.displayName}</span>
                      <span className="text-xs text-slate-500 font-mono">({skill.name})</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-amber-300 border border-slate-700">
                        v{skill.version}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          skill.status === 'ACTIVE'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-red-950 text-red-300 border border-red-800'
                        }`}
                      >
                        {skill.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-1">{skill.description}</p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/50">
                        {skill.category}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/40">
                        {skill.riskLevel}
                      </span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Layers className="w-3 h-3" /> {skill.steps.length} steps
                      </span>
                      {skill.permissions.requiresHumanApproval && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-700/50">
                          HITL Approval Required
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectSkill(skill);
                        setShowExecuteModal(true);
                      }}
                      className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs rounded border border-amber-500/30 flex items-center gap-1"
                    >
                      <Play className="w-3 h-3" /> Execute
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(skill);
                      }}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 transition"
                      title={skill.status === 'ACTIVE' ? 'Disable Skill' : 'Enable Skill'}
                    >
                      <Power className={`w-3.5 h-3.5 ${skill.status === 'ACTIVE' ? 'text-emerald-400' : 'text-slate-600'}`} />
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredSkills.length === 0 && (
              <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-lg text-slate-500">
                No procedural skills match your filter criteria.
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Skill Inspector */}
        <div className="space-y-4">
          {selectedSkill ? (
            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-5 space-y-5">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-amber-200">{selectedSkill.displayName}</h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 font-mono text-slate-300">
                    v{selectedSkill.version}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1">{selectedSkill.description}</div>
              </div>

              {/* Execution Statistics */}
              {statistics && (
                <div className="p-3 bg-slate-950/60 rounded border border-slate-800 space-y-2">
                  <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-amber-400" /> Execution Metrics
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div>
                      <div className="text-[10px] text-slate-500">Runs</div>
                      <div className="text-sm font-bold text-slate-200">{statistics.totalExecutions}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">Success Rate</div>
                      <div className="text-sm font-bold text-emerald-400">
                        {Math.round(statistics.successRate * 100)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">Avg Duration</div>
                      <div className="text-sm font-bold text-slate-200">{statistics.averageDurationMs}ms</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Procedure Steps DAG */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-400" /> Procedure Pipeline ({selectedSkill.steps.length})
                </div>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {selectedSkill.steps.map((step, idx) => (
                    <div
                      key={step.stepId}
                      className="p-2.5 bg-slate-950/80 border border-slate-800/80 rounded text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">
                          {idx + 1}. {step.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 font-mono">
                          {step.stepType}
                        </span>
                      </div>
                      {step.description && <p className="text-[11px] text-slate-400">{step.description}</p>}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-slate-500">
                        {step.tool && <span>Tool: <strong className="text-slate-400">{step.tool}</strong></span>}
                        {step.capability && <span>Cap: <strong className="text-slate-400">{step.capability}</strong></span>}
                        {step.dependencies && step.dependencies.length > 0 && (
                          <span>Depends on: <strong className="text-slate-400">{step.dependencies.join(', ')}</strong></span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Capabilities & Tools Required */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Required Capabilities</div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedSkill.requiredCapabilities.map((cap) => (
                    <span key={cap} className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                      {cap}
                    </span>
                  ))}
                  {selectedSkill.requiredCapabilities.length === 0 && (
                    <span className="text-xs text-slate-500">None required</span>
                  )}
                </div>
              </div>

              {/* Improvement Proposals */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Self-Evolution ({improvements.length})
                  </div>
                  <button
                    onClick={() => setShowProposalModal(true)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Propose
                  </button>
                </div>
                {improvements.length > 0 ? (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {improvements.map((prop) => (
                      <div key={prop.id} className="p-2 bg-slate-950/70 border border-slate-800 rounded text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-300 font-semibold">{prop.status}</span>
                          <span className="text-[10px] text-slate-500 font-mono">v{prop.currentVersion}</span>
                        </div>
                        <p className="text-[11px] text-slate-400">{prop.reason}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No active improvement proposals for this skill.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-lg text-slate-500 text-sm">
              Select a skill from the list to inspect its procedure pipeline, execution metrics, and evolution proposals.
            </div>
          )}
        </div>
      </div>

      {/* Matcher Modal */}
      {showMatcherModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-xl w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-amber-300 flex items-center gap-2">
                <Search className="w-5 h-5 text-amber-400" /> Skill Matcher Sandbox
              </h2>
              <button onClick={() => setShowMatcherModal(false)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Test deterministic capability & intent recognition. Natural language queries resolve into versioned skills.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Inspect project code or investigate error..."
                value={matchQuery}
                onChange={(e) => setMatchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRunMatch()}
                className="flex-1 bg-slate-950 px-3 py-2 text-sm rounded border border-slate-800 focus:outline-none focus:border-amber-500 text-slate-100"
              />
              <button
                onClick={handleRunMatch}
                disabled={matching}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded text-sm transition"
              >
                {matching ? 'Matching...' : 'Match'}
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {matchResults.map((cand) => (
                <div key={cand.skill.id} className="p-3 bg-slate-950 rounded border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100">{cand.skill.displayName}</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-mono">
                      {Math.round(cand.confidence * 100)}% match
                    </span>
                  </div>
                  <p className="text-slate-400">{cand.reason}</p>
                  {cand.isAmbiguous && (
                    <span className="text-[10px] text-amber-400 flex items-center gap-1 font-semibold">
                      <AlertTriangle className="w-3 h-3" /> Ambiguity detected with alternative candidate skills
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Execute Modal */}
      {showExecuteModal && selectedSkill && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-amber-300 flex items-center gap-2">
                <Play className="w-5 h-5 text-amber-400" /> Execute: {selectedSkill.displayName}
              </h2>
              <button onClick={() => setShowExecuteModal(false)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Inputs (JSON format)</label>
              <textarea
                rows={4}
                value={executeInputs}
                onChange={(e) => setExecuteInputs(e.target.value)}
                className="w-full bg-slate-950 p-2 text-xs font-mono rounded border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowExecuteModal(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 text-sm rounded hover:bg-slate-700"
              >
                Close
              </button>
              <button
                onClick={handleExecuteSkill}
                disabled={executing}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm rounded flex items-center gap-1.5"
              >
                {executing ? 'Executing...' : 'Run Procedure'}
              </button>
            </div>

            {executionResult && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded text-xs space-y-1 font-mono">
                <div className="font-bold text-slate-300">
                  Status: {executionResult.status || (executionResult.success ? 'SUCCESS' : 'FAILED')}
                </div>
                <div className="text-slate-400 max-h-36 overflow-y-auto">
                  {JSON.stringify(executionResult, null, 2)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Builder Modal */}
      {showBuilder && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-2xl w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-amber-300 flex items-center gap-2">
                <FileCode className="w-5 h-5 text-amber-400" /> Safe Skill Builder
              </h2>
              <button onClick={() => setShowBuilder(false)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">Skill ID / Identifier</label>
                <input
                  type="text"
                  placeholder="e.g. custom-analyze-code"
                  value={builderData.name}
                  onChange={(e) => setBuilderData({ ...builderData, name: e.target.value })}
                  className="w-full bg-slate-950 px-3 py-1.5 text-xs rounded border border-slate-800 text-slate-200 mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400">Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Custom Code Analysis"
                  value={builderData.displayName}
                  onChange={(e) => setBuilderData({ ...builderData, displayName: e.target.value })}
                  className="w-full bg-slate-950 px-3 py-1.5 text-xs rounded border border-slate-800 text-slate-200 mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Description</label>
              <textarea
                rows={2}
                placeholder="What does this procedure accomplish?"
                value={builderData.description}
                onChange={(e) => setBuilderData({ ...builderData, description: e.target.value })}
                className="w-full bg-slate-950 px-3 py-1.5 text-xs rounded border border-slate-800 text-slate-200 mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">Category</label>
                <select
                  value={builderData.category}
                  onChange={(e) => setBuilderData({ ...builderData, category: e.target.value })}
                  className="w-full bg-slate-950 px-3 py-1.5 text-xs rounded border border-slate-800 text-slate-200 mt-1"
                >
                  <option value="SOFTWARE">SOFTWARE</option>
                  <option value="RESEARCH">RESEARCH</option>
                  <option value="WEB">WEB</option>
                  <option value="COMPUTER">COMPUTER</option>
                  <option value="DEVOPS">DEVOPS</option>
                  <option value="CUSTOM">CUSTOM</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400">Risk Level</label>
                <select
                  value={builderData.riskLevel}
                  onChange={(e) => setBuilderData({ ...builderData, riskLevel: e.target.value })}
                  className="w-full bg-slate-950 px-3 py-1.5 text-xs rounded border border-slate-800 text-slate-200 mt-1"
                >
                  <option value="TIER_0">TIER_0 (Read-only)</option>
                  <option value="TIER_1">TIER_1 (Workspace-scoped write)</option>
                  <option value="TIER_2">TIER_2 (Subprocess execution)</option>
                  <option value="TIER_3">TIER_3 (High risk, approval required)</option>
                  <option value="TIER_4">TIER_4 (Critical system action)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Procedure Steps (JSON Array)</label>
              <textarea
                rows={6}
                value={builderData.stepsJson}
                onChange={(e) => setBuilderData({ ...builderData, stepsJson: e.target.value })}
                className="w-full bg-slate-950 p-2 text-xs font-mono rounded border border-slate-800 text-slate-200 mt-1"
              />
            </div>

            {builderErrors.length > 0 && (
              <div className="p-3 bg-red-950/50 border border-red-800 rounded text-xs text-red-300 space-y-1">
                {builderErrors.map((err, i) => (
                  <div key={i}>• {err}</div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowBuilder(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 text-sm rounded hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSkill}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm rounded"
              >
                Save & Validate Skill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proposal Modal */}
      {showProposalModal && selectedSkill && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-amber-300">Propose Skill Evolution</h2>
            <p className="text-xs text-slate-400">
              HṚṢĪKEŚA does not automatically alter its skills without explicit human review. Enter the rationale for this proposed update.
            </p>
            <textarea
              rows={3}
              placeholder="e.g. Add validation step before file deployment..."
              value={proposalReason}
              onChange={(e) => setProposalReason(e.target.value)}
              className="w-full bg-slate-950 p-2 text-xs rounded border border-slate-800 text-slate-200"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowProposalModal(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProposal}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded"
              >
                Submit Proposal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
