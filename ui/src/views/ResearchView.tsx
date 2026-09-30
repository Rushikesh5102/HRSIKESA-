/**
 * HṚṢĪKEŚA — Research & Web Intelligence View
 *
 * Phase 17: Research Interface
 * Displays live research studies, source provenance, evidence graph,
 * contradiction matrices, and traceable citations with sovereign styling.
 */

import React, { useState, useEffect } from 'react';
import {
  Compass,
  Search,
  BookOpen,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  Layers,
  ChevronRight,
  ChevronDown,
  Play,
  Pause,
  XCircle,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Award,
} from 'lucide-react';
import { IndianEmblem } from '../components/IndianEmblem';

interface StudyRecord {
  id: string;
  title: string;
  question: string;
  scope?: string;
  status: string;
  depth: string;
  budget: {
    maxSources: number;
    maxPages: number;
    maxBrowserActions: number;
    maxModelCalls: number;
    maxDurationMs: number;
  };
  summary?: string;
  createdArtifacts?: string[];
  createdAt: string;
  updatedAt: string;
  completionState?: {
    completedAt?: string;
    sourcesReviewed?: number;
    findingsGenerated?: number;
    conflictsDetected?: number;
    durationMs?: number;
    error?: string;
  };
}

interface SourceRecord {
  id: string;
  title: string;
  url: string;
  domain: string;
  publisher?: string;
  sourceType: string;
  credibilityTier: string;
  freshness: string;
  isDuplicate: boolean;
  status: string;
  retrievedAt: string;
}

interface EvidenceRecord {
  id: string;
  sourceId: string;
  claimText: string;
  quoteText?: string;
  claimType: string;
  confidence: number;
}

interface FindingRecord {
  id: string;
  title: string;
  statement: string;
  findingType: string;
  status: string;
  confidence: number;
  citations?: Array<{ index: number; sourceTitle: string; url: string }>;
  contradictionNotes?: string;
}

export const ResearchView: React.FC = () => {
  const [studies, setStudies] = useState<StudyRecord[]>([]);
  const [selectedStudyId, setSelectedStudyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'decisions' | 'new'>('active');
  const [loading, setLoading] = useState<boolean>(false);
  const [decisionRecords, setDecisionRecords] = useState<any[]>([]);
  const [selectedDecision, setSelectedDecision] = useState<any | null>(null);

  // Selected Study Detail state
  const [selectedStudy, setSelectedStudy] = useState<StudyRecord | null>(null);
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [findings, setFindings] = useState<FindingRecord[]>([]);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);

  // New Research State
  const [question, setQuestion] = useState('');
  const [title, setTitle] = useState('');
  const [depth, setDepth] = useState<'QUICK' | 'STANDARD' | 'DEEP'>('STANDARD');
  const [customUrls, setCustomUrls] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchStudies = async () => {
    setLoading(true);
    try {
      const res = await fetch('/research');
      if (res.ok) {
        const data = await res.json();
        setStudies(data.studies || []);
        if (data.studies?.length > 0 && !selectedStudyId) {
          setSelectedStudyId(data.studies[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch research studies', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDecisions = async () => {
    try {
      const res = await fetch('/decisions');
      if (res.ok) {
        const data = await res.json();
        setDecisionRecords(data.decisions || []);
        if (data.decisions?.length > 0 && !selectedDecision) {
          setSelectedDecision(data.decisions[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load decisions', err);
    }
  };

  const fetchStudyDetails = async (id: string) => {
    setDetailsLoading(true);
    try {
      const [studyRes, sourcesRes, evidenceRes, findingsRes] = await Promise.all([
        fetch(`/research/${id}`),
        fetch(`/research/${id}/sources`),
        fetch(`/research/${id}/evidence`),
        fetch(`/research/${id}/findings`),
      ]);

      if (studyRes.ok) {
        const data = await studyRes.json();
        setSelectedStudy(data.study);
      }
      if (sourcesRes.ok) {
        const data = await sourcesRes.json();
        setSources(data.sources || []);
      }
      if (evidenceRes.ok) {
        const data = await evidenceRes.json();
        setEvidence(data.evidence || []);
      }
      if (findingsRes.ok) {
        const data = await findingsRes.json();
        setFindings(data.findings || []);
      }
    } catch (err) {
      console.error('Failed to fetch study details', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudies();
    fetchDecisions();
  }, []);

  useEffect(() => {
    if (selectedStudyId) {
      fetchStudyDetails(selectedStudyId);
    }
  }, [selectedStudyId]);

  const handleCreateStudy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setSubmitting(true);
    try {
      const seedUrls = customUrls
        .split('\n')
        .map((u) => u.trim())
        .filter((u) => u.length > 0);

      const res = await fetch('/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          title: title.trim() || undefined,
          depth,
          seedUrls: seedUrls.length > 0 ? seedUrls : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setQuestion('');
        setTitle('');
        setCustomUrls('');
        setActiveTab('active');
        await fetchStudies();
        if (data.study?.id) {
          setSelectedStudyId(data.study.id);
        }
      }
    } catch (err) {
      console.error('Failed to create research study', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecuteStudy = async (id: string) => {
    try {
      await fetch(`/research/${id}/execute`, { method: 'POST' });
      fetchStudies();
      fetchStudyDetails(id);
    } catch (err) {
      console.error('Failed to execute study', err);
    }
  };

  const handlePauseStudy = async (id: string) => {
    try {
      await fetch(`/research/${id}/pause`, { method: 'POST' });
      fetchStudies();
      fetchStudyDetails(id);
    } catch (err) {
      console.error('Failed to pause study', err);
    }
  };

  const handleCancelStudy = async (id: string) => {
    try {
      await fetch(`/research/${id}/cancel`, { method: 'POST' });
      fetchStudies();
      fetchStudyDetails(id);
    } catch (err) {
      console.error('Failed to cancel study', err);
    }
  };

  const activeStudies = studies.filter(
    (s) => s.status === 'PLANNING' || s.status === 'RESEARCHING' || s.status === 'VERIFYING' || s.status === 'PAUSED'
  );
  const completedStudies = studies.filter((s) => s.status === 'COMPLETED' || s.status === 'FAILED' || s.status === 'CANCELLED');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      {/* Header Banner */}
      <div
        className="glass-panel"
        style={{
          background: 'var(--bg-glass)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--accent-saffron), var(--accent-gold))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0F0D0A',
              boxShadow: '0 0 16px var(--accent-gold-glow)',
            }}
          >
            <Compass size={22} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-cinzel)' }}>
              Research & Web Intelligence
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Multi-source discovery, evidence verification, conflict detection & provenance tracking
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-card)', padding: '4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setActiveTab('active')}
            className={`btn ${activeTab === 'active' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '12px', padding: '6px 14px' }}
          >
            <RefreshCw size={13} />
            Active ({activeStudies.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`btn ${activeTab === 'completed' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '12px', padding: '6px 14px' }}
          >
            <CheckCircle2 size={13} />
            Completed ({completedStudies.length})
          </button>
          <button
            onClick={() => { setActiveTab('decisions'); fetchDecisions(); }}
            className={`btn ${activeTab === 'decisions' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '12px', padding: '6px 14px' }}
          >
            <Award size={13} />
            Decisions ({decisionRecords.length})
          </button>
          <button
            onClick={() => setActiveTab('new')}
            className={`btn ${activeTab === 'new' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '12px', padding: '6px 14px' }}
          >
            <Sparkles size={13} />
            New Research
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {activeTab === 'new' ? (
          /* New Research Form */
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            <div
              className="card"
              style={{
                maxWidth: '680px',
                margin: '0 auto',
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <IndianEmblem size={32} showText={false} variant="crest" />
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-cinzel)' }}>
                    Formulate Research Objective
                  </h2>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    HṚṢĪKEŚA will plan discovery, acquire sources, evaluate evidence, and detect discrepancies.
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateStudy} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Research Objective / Question *
                  </label>
                  <textarea
                    rows={3}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="e.g. Research open-source AI agent frameworks for Windows laptops. Compare licensing, architecture, and resource footprints."
                    style={{
                      width: '100%',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 14px',
                      fontSize: '13px',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                      Study Title (Optional)
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Autonomous Agents Benchmark"
                      style={{
                        width: '100%',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '9px 12px',
                        fontSize: '13px',
                        color: 'var(--text-primary)',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                      Research Depth
                    </label>
                    <select
                      value={depth}
                      onChange={(e) => setDepth(e.target.value as any)}
                      style={{
                        width: '100%',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '9px 12px',
                        fontSize: '13px',
                        color: 'var(--text-primary)',
                        outline: 'none',
                      }}
                    >
                      <option value="QUICK">Quick (5 sources, 2 min)</option>
                      <option value="STANDARD">Standard (12 sources, 5 min)</option>
                      <option value="DEEP">Deep (25 sources, 10 min)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Custom URLs / Seed Repositories (Optional, 1 per line)
                  </label>
                  <textarea
                    rows={2}
                    value={customUrls}
                    onChange={(e) => setCustomUrls(e.target.value)}
                    placeholder="https://github.com/...&#10;https://docs.example.com/..."
                    style={{
                      width: '100%',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '9px 12px',
                      fontSize: '12px',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-gold-bright)', fontWeight: 700 }}>
                    <Shield size={15} />
                    Security & Trust Invariant
                  </div>
                  <p style={{ margin: '4px 0 0', lineHeight: '1.4' }}>
                    Web data is ingested strictly as untrusted text. No injected prompt can trigger tool executions, bypass access boundaries, or disclose system credentials.
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="submit"
                    disabled={submitting || !question.trim()}
                    className="btn btn-primary"
                    style={{ padding: '10px 20px', fontSize: '13px' }}
                  >
                    <Sparkles size={15} />
                    {submitting ? 'Initiating...' : 'Start Research'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : activeTab === 'decisions' ? (
          /* Master-Detail Decisions Browser */
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '16px', flex: 1, overflow: 'hidden' }}>
            {/* Left list */}
            <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-gold-bright)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Decision Records
                </span>
                <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700, background: 'rgba(200, 146, 14, 0.15)', color: 'var(--accent-gold)' }}>
                  {decisionRecords.length}
                </span>
              </div>
              {decisionRecords.length === 0 ? (
                <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                  No decision records found. Completed research cases can record formal decisions.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {decisionRecords.map((dec) => {
                    const isSelected = selectedDecision?.id === dec.id;
                    return (
                      <button
                        key={dec.id}
                        onClick={() => setSelectedDecision(dec)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '12px',
                          borderRadius: '8px',
                          border: `1px solid ${isSelected ? 'var(--accent-gold)' : 'var(--border-subtle)'}`,
                          background: isSelected ? 'rgba(200, 146, 14, 0.14)' : 'var(--bg-card)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '12.5px', color: isSelected ? 'var(--accent-gold-bright)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {dec.objective}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Opt: {dec.selectedOption?.name}</span>
                          <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '9.5px', fontWeight: 700, background: 'rgba(0, 196, 168, 0.15)', color: 'var(--accent-teal)' }}>
                            {dec.status}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right details */}
            <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px', overflowY: 'auto' }}>
              {selectedDecision ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '800px', margin: '0 auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, background: 'rgba(200, 146, 14, 0.15)', color: 'var(--accent-gold-bright)', textTransform: 'uppercase' }}>
                        {selectedDecision.status}
                      </span>
                      <h2 style={{ margin: '8px 0 0', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-cinzel)' }}>
                        {selectedDecision.objective}
                      </h2>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>Context: {selectedDecision.context}</p>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <div>Approver: <strong style={{ color: 'var(--text-primary)' }}>{selectedDecision.approver}</strong></div>
                      <div style={{ fontSize: '11px', marginTop: '2px' }}>{new Date(selectedDecision.timestamp).toLocaleString()}</div>
                    </div>
                  </div>

                  <div style={{ padding: '14px', background: 'rgba(200, 146, 14, 0.1)', border: '1px solid var(--accent-gold)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-gold-bright)', textTransform: 'uppercase' }}>Selected Candidate</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>{selectedDecision.selectedOption?.name}</div>
                    <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '6px' }}>{selectedDecision.rationale}</div>
                  </div>

                  {selectedDecision.evidenceSummary && (
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>Evidence Summary</div>
                      <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                        {selectedDecision.evidenceSummary}
                      </div>
                    </div>
                  )}

                  {selectedDecision.resultingActions?.length > 0 && (
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-gold-bright)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                        Resulting Proposed Actions ({selectedDecision.resultingActions.length})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {selectedDecision.resultingActions.map((act: any) => (
                          <div key={act.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '12.5px' }}>
                            <div>
                              <span style={{ fontWeight: 700, color: 'var(--accent-gold)', marginRight: '8px' }}>[{act.type}]</span>
                              <strong style={{ color: 'var(--text-primary)' }}>{act.title}</strong>
                              <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: 'var(--text-muted)' }}>{act.description}</p>
                            </div>
                            <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, background: 'rgba(0, 196, 168, 0.15)', color: 'var(--accent-teal)' }}>
                              {act.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                  Select a decision record to view details, criteria, and resulting actions.
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Master-Detail Research Browser */
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '16px', flex: 1, overflow: 'hidden' }}>
            {/* Sidebar Study List */}
            <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-gold-bright)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {activeTab === 'active' ? 'Active Inquiries' : 'Completed Archives'}
              </div>

              {(activeTab === 'active' ? activeStudies : completedStudies).length === 0 ? (
                <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                  No {activeTab} research studies found.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(activeTab === 'active' ? activeStudies : completedStudies).map((s) => {
                    const isSelected = selectedStudyId === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSelectedStudyId(s.id)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '12px',
                          borderRadius: '8px',
                          border: `1px solid ${isSelected ? 'var(--accent-gold)' : 'var(--border-subtle)'}`,
                          background: isSelected ? 'rgba(200, 146, 14, 0.14)' : 'var(--bg-card)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12.5px', fontWeight: 700, color: isSelected ? 'var(--accent-gold-bright)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.title || s.question}
                          </span>
                          <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '9.5px', fontWeight: 700, background: s.status === 'COMPLETED' ? 'rgba(0, 196, 168, 0.15)' : 'rgba(200, 146, 14, 0.15)', color: s.status === 'COMPLETED' ? 'var(--accent-teal)' : 'var(--accent-gold)' }}>
                            {s.status}
                          </span>
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4' }}>
                          {s.question}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '10.5px', color: 'var(--text-muted)' }}>
                          <span>Depth: {s.depth}</span>
                          <span>{new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Main Study Details View */}
            <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px', overflowY: 'auto' }}>
              {detailsLoading ? (
                <div style={{ display: 'flex', height: '240px', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Loading research study intelligence...
                </div>
              ) : !selectedStudy ? (
                <div style={{ display: 'flex', height: '240px', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Select a research inquiry to inspect sources, evidence, and findings.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '920px', margin: '0 auto' }}>
                  {/* Study Title Card */}
                  <div style={{ padding: '18px 20px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-cinzel)' }}>
                            {selectedStudy.title || 'Research Inquiry'}
                          </h2>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10.5px', background: 'var(--bg-elevated)', color: 'var(--accent-gold-bright)', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-mono)' }}>
                            {selectedStudy.depth}
                          </span>
                        </div>
                        <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          "{selectedStudy.question}"
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {selectedStudy.status === 'RESEARCHING' && (
                          <button onClick={() => handlePauseStudy(selectedStudy.id)} className="btn btn-secondary" style={{ fontSize: '11.5px', padding: '5px 12px' }}>
                            <Pause size={13} /> Pause
                          </button>
                        )}
                        {(selectedStudy.status === 'PAUSED' || selectedStudy.status === 'PLANNING') && (
                          <button onClick={() => handleExecuteStudy(selectedStudy.id)} className="btn btn-primary" style={{ fontSize: '11.5px', padding: '5px 12px' }}>
                            <Play size={13} /> Execute
                          </button>
                        )}
                        {selectedStudy.status !== 'COMPLETED' && selectedStudy.status !== 'CANCELLED' && (
                          <button onClick={() => handleCancelStudy(selectedStudy.id)} className="btn btn-secondary" style={{ fontSize: '11.5px', padding: '5px 12px', color: '#FDA4AF', borderColor: 'rgba(225, 29, 72, 0.4)' }}>
                            <XCircle size={13} /> Cancel
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Metrics Strip */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
                      <div style={{ padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sources Acquired</div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-gold-bright)', marginTop: '2px' }}>{sources.length}</div>
                      </div>
                      <div style={{ padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Evidence Collected</div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-gold-bright)', marginTop: '2px' }}>{evidence.length}</div>
                      </div>
                      <div style={{ padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Verified Findings</div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-teal)', marginTop: '2px' }}>{findings.length}</div>
                      </div>
                      <div style={{ padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Conflicts Detected</div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#FDA4AF', marginTop: '2px' }}>
                          {selectedStudy.completionState?.conflictsDetected || 0}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Research Constellation Pipeline */}
                  <div style={{ padding: '18px 20px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: 'var(--accent-gold-bright)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <Layers size={14} color="var(--accent-gold)" />
                        Research Constellation Graph
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Live Traceability Nodes</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '16px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-saffron), var(--accent-gold))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F0D0A', fontWeight: 800 }}>
                          🎯
                        </div>
                        <span style={{ marginTop: '6px', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>Objective</span>
                      </div>

                      <div style={{ flex: 1, height: '2px', background: 'linear-gradient(90deg, var(--accent-gold), var(--accent-teal))', margin: '0 16px' }} />

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.2)', border: '1px solid #38BDF8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38BDF8' }}>
                          <BookOpen size={18} />
                        </div>
                        <span style={{ marginTop: '6px', fontSize: '11px', fontWeight: 600, color: '#38BDF8' }}>{sources.length} Sources</span>
                      </div>

                      <div style={{ flex: 1, height: '2px', background: 'linear-gradient(90deg, #38BDF8, var(--accent-teal))', margin: '0 16px' }} />

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(0, 196, 168, 0.2)', border: '1px solid var(--accent-teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-teal)' }}>
                          <Award size={18} />
                        </div>
                        <span style={{ marginTop: '6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-teal)' }}>{findings.length} Findings</span>
                      </div>
                    </div>
                  </div>

                  {/* Synthesized Key Findings */}
                  <div style={{ padding: '18px 20px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <h3 style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: 'var(--accent-gold-bright)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Synthesized Key Findings & Citations
                      </h3>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{findings.length} items</span>
                    </div>

                    {findings.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                        No synthesized findings yet.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {findings.map((f, idx) => (
                          <div
                            key={f.id || idx}
                            style={{
                              padding: '14px 16px',
                              background: 'var(--bg-elevated)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: '8px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                              <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                                {idx + 1}. {f.title}
                              </div>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, background: 'rgba(200, 146, 14, 0.15)', color: 'var(--accent-gold)' }}>
                                  {f.findingType}
                                </span>
                                <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, background: f.status === 'CONFIRMED' ? 'rgba(0, 196, 168, 0.15)' : 'rgba(56, 189, 248, 0.15)', color: f.status === 'CONFIRMED' ? 'var(--accent-teal)' : '#38BDF8' }}>
                                  {f.status}
                                </span>
                              </div>
                            </div>
                            <p style={{ margin: '8px 0 0', fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                              {f.statement}
                            </p>
                            {f.contradictionNotes && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', padding: '8px 12px', background: 'rgba(225, 29, 72, 0.12)', border: '1px solid rgba(225, 29, 72, 0.3)', borderRadius: '6px', fontSize: '11.5px', color: '#FDA4AF' }}>
                                <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                                <span>{f.contradictionNotes}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Sources Matrix */}
                  <div style={{ padding: '18px 20px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <h3 style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: 'var(--accent-gold-bright)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Consulted Sources & Provenance
                      </h3>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{sources.length} sources</span>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--accent-gold-bright)' }}>
                            <th style={{ padding: '10px 12px' }}>Source Title</th>
                            <th style={{ padding: '10px 12px' }}>Domain</th>
                            <th style={{ padding: '10px 12px' }}>Tier</th>
                            <th style={{ padding: '10px 12px' }}>Freshness</th>
                            <th style={{ padding: '10px 12px' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sources.map((src) => (
                            <tr key={src.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                              <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                <a
                                  href={src.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: 'var(--accent-gold)', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                                >
                                  <span>{src.title || src.url}</span>
                                  <ExternalLink size={12} />
                                </a>
                              </td>
                              <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{src.domain}</td>
                              <td style={{ padding: '10px 12px' }}>
                                <span style={{ padding: '2px 6px', borderRadius: '4px', background: 'var(--bg-elevated)', color: 'var(--accent-gold)' }}>
                                  {src.credibilityTier}
                                </span>
                              </td>
                              <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{src.freshness}</td>
                              <td style={{ padding: '10px 12px' }}>
                                <span style={{ color: src.status === 'ACQUIRED' ? 'var(--accent-teal)' : 'var(--text-muted)', fontWeight: 600 }}>
                                  {src.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
