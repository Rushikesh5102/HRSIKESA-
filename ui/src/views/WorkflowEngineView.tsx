import React, { useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCw,
  Plus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
  GitBranch,
  Terminal,
  Activity,
  FileText,
  Search,
  Check,
  ChevronRight,
  RefreshCw,
  Sliders,
  Code,
  Zap,
} from 'lucide-react';
import { api } from '../services/api';

interface WorkflowItem {
  id: string;
  name: string;
  description: string;
  category: string;
  status: string;
  activeVersion: number;
  scope: string;
  createdAt: string;
  updatedAt: string;
}

interface WorkflowRunItem {
  id: string;
  workflowId: string;
  versionNumber: number;
  status: string;
  triggerType: string;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
  resourceUsage: {
    durationMs: number;
    modelCalls: number;
    toolCalls: number;
  };
}

interface WorkflowApprovalItem {
  id: string;
  runId: string;
  workflowId: string;
  nodeName: string;
  prompt: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: string;
  requestedAt: string;
}

export const WorkflowEngineView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'workflows' | 'canvas' | 'nl-builder' | 'runs' | 'approvals' | 'templates'>('workflows');
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [runs, setRuns] = useState<WorkflowRunItem[]>([]);
  const [approvals, setApprovals] = useState<WorkflowApprovalItem[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<any | null>(null);
  const [selectedRun, setSelectedRun] = useState<any | null>(null);
  const [runTimeline, setRunTimeline] = useState<any[]>([]);
  const [explanation, setExplanation] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [nlPrompt, setNlPrompt] = useState<string>('');
  const [nlLoading, setNlLoading] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [wfRes, appRes, tmplRes] = await Promise.all([
        api.listWorkflows().catch(() => ({ workflows: [] })),
        api.listWorkflowApprovals().catch(() => ({ approvals: [] })),
        api.listWorkflowTemplates().catch(() => ({ templates: [] })),
      ]);
      setWorkflows(wfRes.workflows || []);
      setApprovals(appRes.approvals || []);
      setTemplates(tmplRes.templates || []);
    } catch (err: any) {
      console.error('Failed to load workflow engine data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const unsub = api.subscribeWorkflowEvents((event) => {
      if (event?.type?.startsWith('workflow.')) {
        loadData();
      }
    });
    return () => unsub();
  }, [loadData]);

  const handleSelectWorkflow = async (wf: WorkflowItem) => {
    try {
      const full = await api.getWorkflow(wf.id);
      setSelectedWorkflow(full);
      const runsRes = await api.getWorkflowRuns(wf.id);
      setRuns(runsRes.runs || []);
      const explRes = await api.explainWorkflow(wf.id);
      setExplanation(explRes.explanation || null);
      setActiveSubTab('canvas');
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to fetch workflow details' });
    }
  };

  const handleRunWorkflow = async (wfId: string) => {
    try {
      setFeedbackMsg(null);
      const res = await api.runWorkflow(wfId);
      setFeedbackMsg({ type: 'success', text: `Workflow run triggered: ${res.run.id}` });
      loadData();
      if (selectedWorkflow?.workflow?.id === wfId) {
        const runsRes = await api.getWorkflowRuns(wfId);
        setRuns(runsRes.runs || []);
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Run failed' });
    }
  };

  const handleActivate = async (wfId: string) => {
    try {
      await api.activateWorkflow(wfId);
      setFeedbackMsg({ type: 'success', text: 'Workflow activated' });
      loadData();
      if (selectedWorkflow?.workflow?.id === wfId) {
        const full = await api.getWorkflow(wfId);
        setSelectedWorkflow(full);
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message });
    }
  };

  const handlePause = async (wfId: string) => {
    try {
      await api.pauseWorkflow(wfId);
      setFeedbackMsg({ type: 'success', text: 'Workflow paused' });
      loadData();
      if (selectedWorkflow?.workflow?.id === wfId) {
        const full = await api.getWorkflow(wfId);
        setSelectedWorkflow(full);
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message });
    }
  };

  const handleSelectRun = async (run: WorkflowRunItem) => {
    try {
      const runDetail = await api.getWorkflowRun(run.id);
      setSelectedRun(runDetail);
      const timelineRes = await api.getWorkflowRunTimeline(run.id);
      setRunTimeline(timelineRes.timeline || []);
      setActiveSubTab('runs');
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message });
    }
  };

  const handleApproval = async (approvalId: string, decision: 'APPROVE' | 'REJECT') => {
    try {
      await api.respondWorkflowApproval(approvalId, { decision, comments: 'Actioned via Vedic Workflow UI' });
      setFeedbackMsg({ type: 'success', text: `Approval gate ${decision.toLowerCase()}d.` });
      loadData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message });
    }
  };

  const handleInstantiateTemplate = async (templateId: string) => {
    try {
      const res = await api.instantiateWorkflowTemplate(templateId);
      setFeedbackMsg({ type: 'success', text: `Template instantiated: ${res.workflow.name}` });
      loadData();
      handleSelectWorkflow(res.workflow);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message });
    }
  };

  const handleNlPlan = async () => {
    if (!nlPrompt.trim()) return;
    try {
      setNlLoading(true);
      setFeedbackMsg(null);
      const res = await api.planWorkflowNaturalLanguage(nlPrompt);
      setFeedbackMsg({ type: 'success', text: `Workflow synthesized: "${res.workflow.name}"` });
      setNlPrompt('');
      loadData();
      handleSelectWorkflow(res.workflow);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Planning failed' });
    } finally {
      setNlLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'SUCCEEDED':
      case 'COMPLETED':
        return <span className="badge badge-success"><CheckCircle2 size={12} className="inline mr-1" />{status}</span>;
      case 'RUNNING':
        return <span className="badge badge-primary animate-pulse"><RotateCw size={12} className="inline mr-1 animate-spin" />{status}</span>;
      case 'WAITING_APPROVAL':
        return <span className="badge badge-warning"><Shield size={12} className="inline mr-1" />{status}</span>;
      case 'PAUSED':
      case 'WAITING':
        return <span className="badge badge-info"><Clock size={12} className="inline mr-1" />{status}</span>;
      case 'FAILED':
        return <span className="badge badge-error"><XCircle size={12} className="inline mr-1" />{status}</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  return (
    <div className="workflow-engine-view" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '100%' }}>
      {/* Header Banner with Vedic Motif */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(2, 128, 144, 0.08) 100%)',
        border: '1px solid rgba(212, 175, 55, 0.25)',
        borderRadius: '12px',
        padding: '20px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', letterSpacing: '2px', color: '#d4af37', textTransform: 'uppercase', fontWeight: 600 }}>
                WORKFLOW FABRIC
              </span>
              <span style={{ fontSize: '11px', background: 'rgba(212,175,55,0.15)', color: '#d4af37', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(212,175,55,0.3)' }}>
                FP-11 ENGINE
              </span>
            </div>
            <h1 style={{ margin: '6px 0 4px 0', fontSize: '24px', fontWeight: 700, color: 'var(--text-primary, #fff)', letterSpacing: '-0.5px' }}>
              Native Universal Workflow & Automation Engine
            </h1>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary, #a0aec0)', maxWidth: '750px' }}>
              Durable, event-driven, schedule-driven execution graphs orchestrating sovereign agents, capabilities, FP-10 autonomous coding, and human approvals under rigorous resource governance.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setActiveSubTab('nl-builder')}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #d4af37 0%, #aa820a 100%)', color: '#000', fontWeight: 600 }}
            >
              <Sparkles size={16} /> Natural Language Builder
            </button>
            <button
              onClick={loadData}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {feedbackMsg && (
          <div style={{
            marginTop: '16px',
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '13px',
            background: feedbackMsg.type === 'success' ? 'rgba(72, 187, 120, 0.15)' : 'rgba(245, 101, 101, 0.15)',
            color: feedbackMsg.type === 'success' ? '#48bb78' : '#f56565',
            border: `1px solid ${feedbackMsg.type === 'success' ? '#48bb78' : '#f56565'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span>{feedbackMsg.text}</span>
            <button onClick={() => setFeedbackMsg(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>×</button>
          </div>
        )}
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.1))', paddingBottom: '8px' }}>
        {[
          { id: 'workflows', label: 'Workflows', icon: <Layers size={16} />, badge: workflows.length },
          { id: 'canvas', label: 'Topology Canvas', icon: <GitBranch size={16} />, disabled: !selectedWorkflow },
          { id: 'nl-builder', label: 'NL Builder', icon: <Sparkles size={16} /> },
          { id: 'runs', label: 'Execution Runs', icon: <Activity size={16} />, badge: runs.length },
          { id: 'approvals', label: 'Human Approvals', icon: <Shield size={16} />, badge: approvals.filter(a => a.status === 'PENDING').length },
          { id: 'templates', label: 'Templates (10)', icon: <Code size={16} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            disabled={tab.disabled}
            onClick={() => setActiveSubTab(tab.id as any)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: activeSubTab === tab.id ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
              border: activeSubTab === tab.id ? '1px solid rgba(212, 175, 55, 0.4)' : '1px solid transparent',
              color: activeSubTab === tab.id ? '#d4af37' : 'var(--text-secondary, #a0aec0)',
              fontWeight: activeSubTab === tab.id ? 600 : 400,
              fontSize: '13px',
              cursor: tab.disabled ? 'not-allowed' : 'pointer',
              opacity: tab.disabled ? 0.4 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
            }}
          >
            {tab.icon}
            {tab.label}
            {typeof tab.badge === 'number' && tab.badge > 0 && (
              <span style={{
                fontSize: '11px',
                padding: '1px 6px',
                borderRadius: '10px',
                background: activeSubTab === tab.id ? '#d4af37' : 'rgba(255,255,255,0.1)',
                color: activeSubTab === tab.id ? '#000' : 'inherit',
                fontWeight: 600,
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* SUB-TAB 1: WORKFLOWS LIST */}
      {activeSubTab === 'workflows' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
          {workflows.map((wf) => (
            <div
              key={wf.id}
              style={{
                background: 'var(--card-bg, rgba(255,255,255,0.03))',
                border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
                borderRadius: '10px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '14px',
                transition: 'border-color 0.2s ease, transform 0.2s ease',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#028090', fontWeight: 600, letterSpacing: '0.5px' }}>
                    {wf.category || 'GENERAL'} • v{wf.activeVersion}
                  </span>
                  {getStatusBadge(wf.status)}
                </div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: 600, color: 'var(--text-primary, #fff)' }}>
                  {wf.name}
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary, #a0aec0)', lineHeight: '1.4' }}>
                  {wf.description || 'Autonomous workflow definition.'}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary, #718096)' }}>
                  Scope: <strong style={{ color: '#d4af37' }}>{wf.scope}</strong>
                </span>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleSelectWorkflow(wf)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '12px' }}
                  >
                    Canvas
                  </button>
                  {wf.status === 'ACTIVE' ? (
                    <>
                      <button
                        onClick={() => handlePause(wf.id)}
                        className="btn btn-secondary btn-sm"
                        title="Pause Workflow"
                        style={{ color: '#ecc94b' }}
                      >
                        <Pause size={12} />
                      </button>
                      <button
                        onClick={() => handleRunWorkflow(wf.id)}
                        className="btn btn-primary btn-sm"
                        style={{ background: '#48bb78', borderColor: '#48bb78', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Play size={12} /> Run
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleActivate(wf.id)}
                      className="btn btn-primary btn-sm"
                      style={{ background: '#d4af37', color: '#000', borderColor: '#d4af37' }}
                    >
                      Activate
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {workflows.length === 0 && !loading && (
            <div style={{ gridColumn: '1 / -1', padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary, #a0aec0)' }}>
              <Layers size={48} style={{ margin: '0 auto 16px auto', opacity: 0.3, color: '#d4af37' }} />
              <h3>No Workflows Registered</h3>
              <p style={{ maxWidth: '400px', margin: '0 auto 16px auto', fontSize: '14px' }}>
                Create a workflow using natural language or choose one of the 10 built-in production templates.
              </p>
              <button
                onClick={() => setActiveSubTab('templates')}
                className="btn btn-primary"
                style={{ background: '#d4af37', color: '#000' }}
              >
                Browse Built-in Templates
              </button>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: TOPOLOGY CANVAS & GRAPH EDITOR */}
      {activeSubTab === 'canvas' && selectedWorkflow && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', height: '650px' }}>
          {/* Main Visual Graph Canvas */}
          <div style={{
            background: 'radial-gradient(circle at center, rgba(212, 175, 55, 0.03) 0%, rgba(0,0,0,0.5) 100%)',
            border: '1px solid rgba(212, 175, 55, 0.2)',
            borderRadius: '10px',
            padding: '24px',
            position: 'relative',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '12px', color: '#d4af37', fontWeight: 600 }}>TOPOLOGY GRAPH</span>
                <h2 style={{ margin: '2px 0 0 0', fontSize: '18px', color: '#fff' }}>
                  {selectedWorkflow.workflow.name} (v{selectedWorkflow.activeVersion.versionNumber})
                </h2>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleRunWorkflow(selectedWorkflow.workflow.id)}
                  className="btn btn-primary btn-sm"
                  style={{ background: '#48bb78', borderColor: '#48bb78', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Play size={14} /> Run Graph
                </button>
              </div>
            </div>

            {/* Render Nodes Flow */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px', padding: '30px 0' }}>
              {selectedWorkflow.activeVersion?.graph?.nodes?.map((node: any, idx: number) => (
                <React.Fragment key={node.id}>
                  <div style={{
                    width: '380px',
                    background: 'var(--card-bg, #1a202c)',
                    border: '1px solid rgba(212, 175, 55, 0.35)',
                    borderRadius: '8px',
                    padding: '14px 18px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    position: 'relative',
                    transition: 'all 0.2s ease',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#d4af37', fontWeight: 700, letterSpacing: '1px' }}>
                        {node.type}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-tertiary, #718096)' }}>
                        {node.id}
                      </span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary, #fff)' }}>
                      {node.name}
                    </div>
                    {node.config && Object.keys(node.config).length > 0 && (
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary, #a0aec0)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {JSON.stringify(node.config)}
                      </div>
                    )}
                  </div>

                  {idx < selectedWorkflow.activeVersion.graph.nodes.length - 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#d4af37' }}>
                      <div style={{ width: '2px', height: '14px', background: 'rgba(212, 175, 55, 0.5)' }} />
                      <ArrowRight size={14} style={{ transform: 'rotate(90deg)' }} />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Properties & Explanation Panel */}
          <div style={{
            background: 'var(--card-bg, rgba(255,255,255,0.03))',
            border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
            borderRadius: '10px',
            padding: '20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: '#d4af37', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sliders size={16} /> Workflow Metadata
            </h3>

            <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div><strong>Status:</strong> {getStatusBadge(selectedWorkflow.workflow.status)}</div>
              <div><strong>Version:</strong> v{selectedWorkflow.activeVersion.versionNumber}</div>
              <div><strong>Scope:</strong> {selectedWorkflow.workflow.scope}</div>
              <div><strong>Timeout:</strong> {selectedWorkflow.activeVersion.timeoutSeconds}s</div>
              <div><strong>Max Retries:</strong> {selectedWorkflow.activeVersion.maxRetries}</div>
            </div>

            {explanation && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#028090' }}>Authoritative Explanation</h4>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary, #a0aec0)', lineHeight: '1.5' }}>
                  {explanation.description || 'No explanation generated.'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: NATURAL LANGUAGE BUILDER */}
      {activeSubTab === 'nl-builder' && (
        <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            background: 'var(--card-bg, rgba(255,255,255,0.03))',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            borderRadius: '12px',
            padding: '24px',
          }}>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#d4af37', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={20} /> Natural Language Workflow Synthesis
            </h2>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-secondary, #a0aec0)' }}>
              Describe what you want HṚṢĪKEŚA to automate. The Workflow Planner synthesizes a deterministic executable graph with appropriate triggers, nodes, risk analysis, and validation.
            </p>

            <textarea
              rows={4}
              value={nlPrompt}
              onChange={(e) => setNlPrompt(e.target.value)}
              placeholder="e.g. When a GitHub bug issue appears, investigate it, reproduce it, fix it, test it, and prepare the change for my approval."
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '8px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff',
                fontSize: '14px',
                resize: 'vertical',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary, #718096)' }}>
                Zero arbitrary code execution. Validated against sovereign capability registries.
              </div>
              <button
                disabled={nlLoading || !nlPrompt.trim()}
                onClick={handleNlPlan}
                className="btn btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #d4af37 0%, #aa820a 100%)',
                  color: '#000',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {nlLoading ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Synthesize Workflow
              </button>
            </div>
          </div>

          {/* Quick Examples */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: '#d4af37', fontWeight: 600, letterSpacing: '0.5px' }}>
              PROMPT INSPIRATIONS (CLICK TO LOAD):
            </span>
            {[
              'Every morning check my projects for blocked tasks and try to resolve them.',
              'When a GitHub bug issue appears, investigate it, reproduce it, fix it, test it, and prepare the change for my approval.',
              'Whenever a customer submits a support request, understand it, classify it, draft a response, and ask me before sending.',
              'Run website quality verification, inspect performance, test broken links, and report results.',
            ].map((p, idx) => (
              <div
                key={idx}
                onClick={() => setNlPrompt(p)}
                style={{
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--text-secondary, #cbd5e0)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                "{p}"
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: EXECUTION RUNS */}
      {activeSubTab === 'runs' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedRun ? '1fr 1fr' : '1fr', gap: '20px' }}>
          <div>
            <h3 style={{ margin: '0 0 14px 0', fontSize: '16px', color: '#fff' }}>Recent Execution Runs</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {runs.map((r) => (
                <div
                  key={r.id}
                  onClick={() => handleSelectRun(r)}
                  style={{
                    padding: '14px 18px',
                    background: selectedRun?.run?.id === r.id ? 'rgba(212, 175, 55, 0.1)' : 'var(--card-bg, rgba(255,255,255,0.02))',
                    border: selectedRun?.run?.id === r.id ? '1px solid #d4af37' : '1px solid var(--border-color, rgba(255,255,255,0.06))',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{r.id}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary, #a0aec0)' }}>
                      Trigger: {r.triggerType} • Started: {new Date(r.startedAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <div>{getStatusBadge(r.status)}</div>
                </div>
              ))}
              {runs.length === 0 && (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-tertiary, #718096)' }}>
                  No execution runs found.
                </div>
              )}
            </div>
          </div>

          {selectedRun && (
            <div style={{
              background: 'var(--card-bg, rgba(255,255,255,0.03))',
              border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
              borderRadius: '10px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#d4af37' }}>Run Detail: {selectedRun.run.id}</h3>
              <div style={{ fontSize: '13px' }}>
                <div><strong>Status:</strong> {getStatusBadge(selectedRun.run.status)}</div>
                <div><strong>Duration:</strong> {selectedRun.run.resourceUsage?.durationMs || 0}ms</div>
                <div><strong>Tool Calls:</strong> {selectedRun.run.resourceUsage?.toolCalls || 0}</div>
                <div><strong>Model Calls:</strong> {selectedRun.run.resourceUsage?.modelCalls || 0}</div>
              </div>

              <h4 style={{ margin: '8px 0 4px 0', fontSize: '14px', color: '#028090' }}>Node Execution Timeline</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto' }}>
                {runTimeline.map((item, idx) => (
                  <div key={idx} style={{ padding: '10px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>{item.nodeName || item.nodeId}</strong>
                      {getStatusBadge(item.status)}
                    </div>
                    <div style={{ color: 'var(--text-secondary, #a0aec0)', marginTop: '2px' }}>
                      Duration: {item.durationMs}ms {item.agentId ? `• Agent: ${item.agentId}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 5: HUMAN APPROVALS */}
      {activeSubTab === 'approvals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '17px', color: '#fff' }}>Pending Workflow Human Approvals</h3>
          {approvals.map((app) => (
            <div
              key={app.id}
              style={{
                background: 'var(--card-bg, rgba(255,255,255,0.03))',
                border: '1px solid rgba(212, 175, 55, 0.4)',
                borderRadius: '8px',
                padding: '18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Shield size={16} color="#d4af37" />
                  <span style={{ fontSize: '12px', color: '#d4af37', fontWeight: 600 }}>{app.riskLevel} RISK GATE</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary, #718096)' }}>Run: {app.runId}</span>
                </div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>{app.prompt}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary, #a0aec0)', marginTop: '4px' }}>
                  Node: {app.nodeName} • Requested: {new Date(app.requestedAt).toLocaleString()}
                </div>
              </div>

              {app.status === 'PENDING' ? (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleApproval(app.id, 'REJECT')}
                    className="btn btn-secondary btn-sm"
                    style={{ color: '#f56565', borderColor: '#f56565' }}
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApproval(app.id, 'APPROVE')}
                    className="btn btn-primary btn-sm"
                    style={{ background: '#48bb78', borderColor: '#48bb78' }}
                  >
                    Approve Action
                  </button>
                </div>
              ) : (
                getStatusBadge(app.status)
              )}
            </div>
          ))}

          {approvals.length === 0 && (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-tertiary, #718096)' }}>
              No pending approvals. System is operating smoothly.
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 6: BUILT-IN TEMPLATES */}
      {activeSubTab === 'templates' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              style={{
                background: 'var(--card-bg, rgba(255,255,255,0.03))',
                border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
                borderRadius: '10px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: '#d4af37', fontWeight: 600 }}>TEMPLATE</span>
                <h3 style={{ margin: '4px 0 6px 0', fontSize: '16px', color: '#fff' }}>{tmpl.name}</h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary, #a0aec0)' }}>{tmpl.description}</p>
              </div>

              <button
                onClick={() => handleInstantiateTemplate(tmpl.id)}
                className="btn btn-primary btn-sm"
                style={{ background: '#d4af37', color: '#000', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Plus size={14} /> Instantiate Workflow
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
