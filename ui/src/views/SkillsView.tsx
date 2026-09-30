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
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      {/* Top Banner */}
      <IndianFrame>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            padding: '20px',
            background: 'var(--bg-glass)',
            backdropFilter: 'blur(16px)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Zap style={{ width: '24px', height: '24px', color: 'var(--accent-gold)' }} />
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--accent-gold)' }}>
                Procedural Intelligence — Skills Engine
              </h1>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Deterministic, versioned, DAG-based procedures orchestrating tools, capabilities, and verification.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setShowMatcherModal(true)}
              className="btn btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                padding: '8px 14px',
              }}
            >
              <Search size={14} />
              Test Matcher
            </button>
            <button
              onClick={() => setShowBuilder(true)}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                padding: '8px 14px',
              }}
            >
              <Plus size={14} />
              Build Skill
            </button>
            <button
              onClick={loadSkills}
              className="btn btn-secondary"
              style={{ padding: '8px 10px' }}
              title="Refresh Skills"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </IndianFrame>

      {/* Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        <div
          style={{
            padding: '16px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
          }}
        >
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
            Total Skills
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
            {skills.length}
          </div>
        </div>

        <div
          style={{
            padding: '16px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
          }}
        >
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
            Active Procedures
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--accent-teal)', marginTop: '4px' }}>
            {skills.filter((s) => s.status === 'ACTIVE').length}
          </div>
        </div>

        <div
          style={{
            padding: '16px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
          }}
        >
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
            Categories
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--accent-gold)', marginTop: '4px' }}>
            {categories.length}
          </div>
        </div>

        <div
          style={{
            padding: '16px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
          }}
        >
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
            Authority Guard
          </div>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#38bdf8',
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Shield size={16} /> Rushikesh Pattiwar
          </div>
        </div>
      </div>

      {/* Main Layout: Skills List & Inspector */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Skills List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Controls Bar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '12px',
              background: 'var(--bg-card)',
              padding: '12px 16px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ position: 'relative', flex: '1 1 200px' }}>
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
                placeholder="Search skills by name or keyword..."
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

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                background: 'var(--bg-input)',
                padding: '8px 12px',
                fontSize: '12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                background: 'var(--bg-input)',
                padding: '8px 12px',
                fontSize: '12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="DISABLED">DISABLED</option>
              <option value="DRAFT">DRAFT</option>
            </select>
          </div>

          {/* Skill Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredSkills.map((skill) => {
              const isSelected = selectedSkill?.id === skill.id;
              return (
                <div
                  key={skill.id}
                  onClick={() => handleSelectSkill(skill)}
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    border: isSelected
                      ? '1px solid var(--accent-gold)'
                      : '1px solid var(--border-color)',
                    background: isSelected
                      ? 'rgba(212, 175, 55, 0.08)'
                      : 'var(--bg-card)',
                    boxShadow: isSelected ? '0 0 16px rgba(212, 175, 55, 0.15)' : 'none',
                    transition: 'all 0.15s ease',
                    cursor: 'pointer',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                        {skill.displayName}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        ({skill.name})
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'rgba(212, 175, 55, 0.1)',
                          color: 'var(--accent-gold)',
                          fontFamily: 'monospace',
                          border: '1px solid rgba(212, 175, 55, 0.25)',
                        }}
                      >
                        v{skill.version}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          background: skill.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: skill.status === 'ACTIVE' ? '#34d399' : '#f87171',
                          border: `1px solid ${skill.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                        }}
                      >
                        {skill.status}
                      </span>
                    </div>

                    <p
                      style={{
                        margin: 0,
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.4,
                      }}
                    >
                      {skill.description}
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: 'var(--bg-elevated)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-color)',
                        }}
                      >
                        {skill.category}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: 'rgba(99, 102, 241, 0.12)',
                          color: '#818cf8',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                        }}
                      >
                        {skill.riskLevel}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Layers size={12} /> {skill.steps.length} steps
                      </span>
                      {skill.permissions.requiresHumanApproval && (
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: 'var(--accent-saffron-light)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                          }}
                        >
                          HITL Required
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectSkill(skill);
                        setShowExecuteModal(true);
                      }}
                      className="btn btn-secondary"
                      style={{
                        fontSize: '12px',
                        padding: '6px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: 'var(--accent-gold)',
                      }}
                    >
                      <Play size={12} /> Execute
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(skill);
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '6px 10px' }}
                      title={skill.status === 'ACTIVE' ? 'Disable Skill' : 'Enable Skill'}
                    >
                      <Power
                        size={14}
                        style={{ color: skill.status === 'ACTIVE' ? '#34d399' : 'var(--text-muted)' }}
                      />
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredSkills.length === 0 && (
              <div
                style={{
                  padding: '32px',
                  textAlign: 'center',
                  background: 'var(--bg-card)',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                }}
              >
                No procedural skills match your filter criteria.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Skill Inspector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {selectedSkill ? (
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--accent-gold)' }}>
                    {selectedSkill.displayName}
                  </h3>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: 'var(--bg-elevated)',
                      color: 'var(--text-secondary)',
                      fontFamily: 'monospace',
                    }}
                  >
                    v{selectedSkill.version}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                  {selectedSkill.description}
                </div>
              </div>

              {/* Execution Statistics */}
              {statistics && (
                <div
                  style={{
                    padding: '14px',
                    background: 'var(--bg-elevated)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <TrendingUp size={14} style={{ color: 'var(--accent-gold)' }} /> Execution Metrics
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Runs</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                        {statistics.totalExecutions}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Success Rate</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>
                        {Math.round(statistics.successRate * 100)}%
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Avg Duration</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                        {statistics.averageDurationMs}ms
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Procedure Steps DAG */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Layers size={14} style={{ color: 'var(--accent-gold)' }} /> Procedure Pipeline ({selectedSkill.steps.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                  {selectedSkill.steps.map((step, idx) => (
                    <div
                      key={step.stepId}
                      style={{
                        padding: '10px',
                        background: 'var(--bg-elevated)',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        fontSize: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {idx + 1}. {step.name}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '1px 6px',
                            borderRadius: '3px',
                            background: 'rgba(56, 189, 248, 0.1)',
                            color: '#38bdf8',
                            fontFamily: 'monospace',
                          }}
                        >
                          {step.stepType}
                        </span>
                      </div>
                      {step.description && (
                        <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>{step.description}</p>
                      )}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '10px', color: 'var(--text-muted)' }}>
                        {step.tool && (
                          <span>
                            Tool: <strong style={{ color: 'var(--text-primary)' }}>{step.tool}</strong>
                          </span>
                        )}
                        {step.capability && (
                          <span>
                            Cap: <strong style={{ color: 'var(--text-primary)' }}>{step.capability}</strong>
                          </span>
                        )}
                        {step.dependencies && step.dependencies.length > 0 && (
                          <span>
                            Depends on: <strong style={{ color: 'var(--text-primary)' }}>{step.dependencies.join(', ')}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Required Capabilities */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  Required Capabilities
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selectedSkill.requiredCapabilities.map((cap) => (
                    <span
                      key={cap}
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'rgba(212, 175, 55, 0.1)',
                        color: 'var(--accent-gold)',
                        border: '1px solid rgba(212, 175, 55, 0.25)',
                      }}
                    >
                      {cap}
                    </span>
                  ))}
                  {selectedSkill.requiredCapabilities.length === 0 && (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>None required</span>
                  )}
                </div>
              </div>

              {/* Improvement Proposals */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border-color)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                    Self-Evolution ({improvements.length})
                  </div>
                  <button
                    onClick={() => setShowProposalModal(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-gold)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: 600,
                    }}
                  >
                    <Plus size={12} /> Propose
                  </button>
                </div>
                {improvements.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                    {improvements.map((prop) => (
                      <div
                        key={prop.id}
                        style={{
                          padding: '8px',
                          background: 'var(--bg-elevated)',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          fontSize: '11px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '3px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{prop.status}</span>
                          <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>v{prop.currentVersion}</span>
                        </div>
                        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{prop.reason}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                    No active improvement proposals for this skill.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: '32px',
                textAlign: 'center',
                background: 'var(--bg-card)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                color: 'var(--text-muted)',
                fontSize: '13px',
              }}
            >
              Select a skill from the list to inspect its procedure pipeline, execution metrics, and evolution proposals.
            </div>
          )}
        </div>
      </div>

      {/* Matcher Modal */}
      {showMatcherModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '14px',
              padding: '24px',
              maxWidth: '560px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Search size={18} /> Skill Matcher Sandbox
              </h2>
              <button
                onClick={() => setShowMatcherModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
              Test deterministic capability & intent recognition. Natural language queries resolve into versioned skills.
            </p>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="e.g. Inspect project code or investigate error..."
                value={matchQuery}
                onChange={(e) => setMatchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRunMatch()}
                style={{
                  flex: 1,
                  background: 'var(--bg-input)',
                  padding: '8px 12px',
                  fontSize: '13px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
              <button onClick={handleRunMatch} disabled={matching} className="btn btn-primary" style={{ fontSize: '12px', padding: '8px 16px' }}>
                {matching ? 'Matching...' : 'Match'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '260px', overflowY: 'auto' }}>
              {matchResults.map((cand) => (
                <div
                  key={cand.skill.id}
                  style={{
                    padding: '12px',
                    background: 'var(--bg-elevated)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    fontSize: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{cand.skill.displayName}</span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#34d399',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                      }}
                    >
                      {Math.round(cand.confidence * 100)}% match
                    </span>
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{cand.reason}</p>
                  {cand.isAmbiguous && (
                    <span style={{ fontSize: '11px', color: 'var(--accent-saffron-light)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                      <AlertTriangle size={12} /> Ambiguity detected with alternative candidate skills
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
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '14px',
              padding: '24px',
              maxWidth: '520px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Play size={18} /> Execute: {selectedSkill.displayName}
              </h2>
              <button
                onClick={() => setShowExecuteModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Inputs (JSON format)</label>
              <textarea
                rows={4}
                value={executeInputs}
                onChange={(e) => setExecuteInputs(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  padding: '10px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setShowExecuteModal(false)} className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 14px' }}>
                Close
              </button>
              <button
                onClick={handleExecuteSkill}
                disabled={executing}
                className="btn btn-primary"
                style={{ fontSize: '12px', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {executing ? 'Executing...' : 'Run Procedure'}
              </button>
            </div>

            {executionResult && (
              <div
                style={{
                  padding: '12px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  Status: {executionResult.status || (executionResult.success ? 'SUCCESS' : 'FAILED')}
                </div>
                <div style={{ color: 'var(--text-secondary)', maxHeight: '120px', overflowY: 'auto' }}>
                  {JSON.stringify(executionResult, null, 2)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Builder Modal */}
      {showBuilder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '14px',
              padding: '24px',
              maxWidth: '640px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileCode size={18} /> Safe Skill Builder
              </h2>
              <button
                onClick={() => setShowBuilder(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Skill ID / Identifier</label>
                <input
                  type="text"
                  placeholder="e.g. custom-analyze-code"
                  value={builderData.name}
                  onChange={(e) => setBuilderData({ ...builderData, name: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'var(--bg-input)',
                    padding: '8px 10px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    marginTop: '4px',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Custom Code Analysis"
                  value={builderData.displayName}
                  onChange={(e) => setBuilderData({ ...builderData, displayName: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'var(--bg-input)',
                    padding: '8px 10px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    marginTop: '4px',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Description</label>
              <textarea
                rows={2}
                placeholder="What does this procedure accomplish?"
                value={builderData.description}
                onChange={(e) => setBuilderData({ ...builderData, description: e.target.value })}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  padding: '8px 10px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  marginTop: '4px',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Category</label>
                <select
                  value={builderData.category}
                  onChange={(e) => setBuilderData({ ...builderData, category: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'var(--bg-input)',
                    padding: '8px 10px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    marginTop: '4px',
                  }}
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
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Risk Level</label>
                <select
                  value={builderData.riskLevel}
                  onChange={(e) => setBuilderData({ ...builderData, riskLevel: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'var(--bg-input)',
                    padding: '8px 10px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    marginTop: '4px',
                  }}
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
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Procedure Steps (JSON Array)</label>
              <textarea
                rows={5}
                value={builderData.stepsJson}
                onChange={(e) => setBuilderData({ ...builderData, stepsJson: e.target.value })}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  padding: '8px 10px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  marginTop: '4px',
                }}
              />
            </div>

            {builderErrors.length > 0 && (
              <div
                style={{
                  padding: '10px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '6px',
                  fontSize: '11px',
                  color: '#f87171',
                }}
              >
                {builderErrors.map((err, i) => (
                  <div key={i}>• {err}</div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '6px' }}>
              <button onClick={() => setShowBuilder(false)} className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 14px' }}>
                Cancel
              </button>
              <button onClick={handleSaveSkill} className="btn btn-primary" style={{ fontSize: '12px', padding: '6px 16px' }}>
                Save & Validate Skill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proposal Modal */}
      {showProposalModal && selectedSkill && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '14px',
              padding: '24px',
              maxWidth: '440px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
          >
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--accent-gold)' }}>
              Propose Skill Evolution
            </h2>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
              HṚṢĪKEŚA does not automatically alter its skills without explicit human review. Enter the rationale for this proposed update.
            </p>
            <textarea
              rows={3}
              placeholder="e.g. Add validation step before file deployment..."
              value={proposalReason}
              onChange={(e) => setProposalReason(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-input)',
                padding: '8px 10px',
                fontSize: '12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setShowProposalModal(false)} className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 14px' }}>
                Cancel
              </button>
              <button onClick={handleCreateProposal} className="btn btn-primary" style={{ fontSize: '12px', padding: '6px 16px' }}>
                Submit Proposal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
