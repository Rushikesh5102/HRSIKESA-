/**
 * HṚṢĪKEŚA (हृषीकेश) — Research & Web Intelligence View
 *
 * Phase 17: Indian Traditional + 3D Visual Research Interface
 * Displays live research studies, source provenance, evidence graph,
 * contradiction matrices, and traceable citations.
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

  // New Research Form State
  const [question, setQuestion] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [depth, setDepth] = useState<'QUICK' | 'STANDARD' | 'DEEP'>('STANDARD');
  const [customUrls, setCustomUrls] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Selected Study Details
  const [selectedStudy, setSelectedStudy] = useState<StudyRecord | null>(null);
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [findings, setFindings] = useState<FindingRecord[]>([]);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);

  const fetchStudies = async () => {
    setLoading(true);
    try {
      const res = await fetch('/research');
      if (res.ok) {
        const data = await res.json();
        setStudies(data.studies || []);
        if (!selectedStudyId && data.studies?.length > 0) {
          setSelectedStudyId(data.studies[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load research studies', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudyDetails = async (id: string) => {
    setDetailsLoading(true);
    try {
      const res = await fetch(`/research/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedStudy(data.study);
        setSources(data.sources || []);
        setEvidence(data.evidence || []);
        setFindings(data.findings || []);
      }
    } catch (err) {
      console.error(`Failed to load details for study ${id}`, err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const fetchDecisions = async () => {
    try {
      const res = await fetch('/api/decision/records');
      if (res.ok) {
        const data = await res.json();
        setDecisionRecords(data.records || []);
        if (data.records?.length > 0 && !selectedDecision) {
          setSelectedDecision(data.records[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load decision records', err);
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
      const urls = customUrls
        .split('\n')
        .map((u) => u.trim())
        .filter((u) => u.startsWith('http://') || u.startsWith('https://'));

      const res = await fetch('/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          title: title.trim() || undefined,
          depth,
          customUrls: urls.length > 0 ? urls : undefined,
          autoExecute: true,
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
    <div className="flex h-full flex-col bg-stone-950 text-stone-100">
      {/* Header Banner */}
      <div className="border-b border-amber-900/30 bg-stone-900/50 p-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-950/40 text-amber-400 shadow-inner">
              <Compass className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-wide text-amber-200">
                  Research & Web Intelligence
                </h1>
                <span className="rounded border border-amber-500/30 bg-amber-950/60 px-2 py-0.5 text-xs font-semibold text-amber-300">
                  अनुसंधान
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Multi-source discovery, evidence verification, conflict detection & provenance tracking
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 rounded-lg border border-stone-800 bg-stone-900/80 p-1">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex items-center gap-2 rounded px-3 py-1.5 text-xs font-medium transition ${
                activeTab === 'active'
                  ? 'border border-amber-500/40 bg-amber-950/60 text-amber-200 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Active ({activeStudies.length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`flex items-center gap-2 rounded px-3 py-1.5 text-xs font-medium transition ${
                activeTab === 'completed'
                  ? 'border border-amber-500/40 bg-amber-950/60 text-amber-200 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Completed ({completedStudies.length})
            </button>
            <button
              onClick={() => { setActiveTab('decisions'); fetchDecisions(); }}
              className={`flex items-center gap-2 rounded px-3 py-1.5 text-xs font-medium transition ${
                activeTab === 'decisions'
                  ? 'border border-amber-500/40 bg-amber-950/60 text-amber-200 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Award className="h-3.5 w-3.5" />
              Decisions ({decisionRecords.length})
            </button>
            <button
              onClick={() => setActiveTab('new')}
              className={`flex items-center gap-2 rounded px-3 py-1.5 text-xs font-medium transition ${
                activeTab === 'new'
                  ? 'border border-amber-500/40 bg-amber-950/60 text-amber-200 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              New Research
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {activeTab === 'new' ? (
          /* New Research Form */
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-2xl rounded-xl border border-amber-900/40 bg-stone-900/60 p-6 shadow-xl backdrop-blur">
              <div className="mb-6 flex items-center gap-3">
                <IndianEmblem size={32} showText={false} variant="crest" />
                <div>
                  <h2 className="text-lg font-bold text-amber-200">Formulate Research Objective</h2>
                  <p className="text-xs text-stone-400">
                    HṚṢĪKEŚA will plan discovery, acquire sources, evaluate evidence, and detect discrepancies.
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateStudy} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-300">
                    Research Objective / Question *
                  </label>
                  <textarea
                    rows={3}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="e.g. Research open-source AI agent frameworks for Windows laptops. Compare licensing, architecture, and resource footprints."
                    className="w-full rounded-lg border border-stone-700 bg-stone-950 p-3 text-sm text-stone-100 placeholder-stone-500 focus:border-amber-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-stone-300">
                      Study Title (Optional)
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Autonomous Agents Benchmark"
                      className="w-full rounded-lg border border-stone-700 bg-stone-950 p-2.5 text-sm text-stone-100 placeholder-stone-500 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-stone-300">
                      Research Depth
                    </label>
                    <select
                      value={depth}
                      onChange={(e) => setDepth(e.target.value as any)}
                      className="w-full rounded-lg border border-stone-700 bg-stone-950 p-2.5 text-sm text-stone-100 focus:border-amber-500 focus:outline-none"
                    >
                      <option value="QUICK">Quick (5 sources, 2 min)</option>
                      <option value="STANDARD">Standard (12 sources, 5 min)</option>
                      <option value="DEEP">Deep (25 sources, 10 min)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-300">
                    Custom URLs / Seed Repositories (Optional, 1 per line)
                  </label>
                  <textarea
                    rows={2}
                    value={customUrls}
                    onChange={(e) => setCustomUrls(e.target.value)}
                    placeholder="https://github.com/...&#10;https://docs.example.com/..."
                    className="w-full rounded-lg border border-stone-700 bg-stone-950 p-2.5 text-xs text-stone-100 placeholder-stone-500 focus:border-amber-500 focus:outline-none font-mono"
                  />
                </div>

                <div className="rounded-lg border border-stone-800 bg-stone-950/80 p-3 text-xs text-stone-400">
                  <div className="flex items-center gap-2 font-semibold text-amber-300">
                    <Shield className="h-4 w-4" />
                    Security & Trust Invariant
                  </div>
                  <p className="mt-1">
                    Web data is ingested strictly as untrusted text. No injected prompt can trigger tool executions, bypass access boundaries, or disclose system credentials.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={submitting || !question.trim()}
                    className="flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-600 px-5 py-2.5 text-sm font-semibold text-stone-950 shadow-md transition hover:bg-amber-500 disabled:opacity-50"
                  >
                    <Sparkles className="h-4 w-4" />
                    {submitting ? 'Initiating...' : 'Start Research'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : activeTab === 'decisions' ? (
          /* Master-Detail Decisions Browser */
          <div className="flex flex-1 overflow-hidden">
            {/* Left list */}
            <div className="w-80 border-r border-stone-800 bg-stone-900/30 overflow-y-auto p-3">
              <div className="mb-3 text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center justify-between">
                <span>Decision Records</span>
                <span className="rounded bg-amber-950/60 px-1.5 py-0.5 text-[10px] text-amber-300">
                  {decisionRecords.length}
                </span>
              </div>
              {decisionRecords.length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-500">
                  No decision records found. Completed research cases can record formal decisions.
                </div>
              ) : (
                <div className="space-y-2">
                  {decisionRecords.map((dec) => (
                    <button
                      key={dec.id}
                      onClick={() => setSelectedDecision(dec)}
                      className={`w-full text-left rounded-lg p-3 border text-xs transition ${
                        selectedDecision?.id === dec.id
                          ? 'border-amber-500/60 bg-amber-950/40 text-stone-100'
                          : 'border-stone-800 bg-stone-950/60 text-stone-400 hover:border-stone-700'
                      }`}
                    >
                      <div className="font-semibold text-amber-200 line-clamp-1">{dec.objective}</div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-[10px] text-stone-400">Selected: {dec.selectedOption?.name}</span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                            dec.status === 'ACTIVE'
                              ? 'bg-emerald-950 text-emerald-400'
                              : dec.status === 'UNDER_REVIEW'
                              ? 'bg-amber-950 text-amber-400'
                              : 'bg-stone-800 text-stone-400'
                          }`}
                        >
                          {dec.status}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right details */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedDecision ? (
                <div className="space-y-6 max-w-4xl mx-auto">
                  <div className="rounded-xl border border-amber-900/40 bg-stone-900/40 p-6 backdrop-blur">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="rounded border border-amber-500/30 bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                          {selectedDecision.status}
                        </span>
                        <h2 className="mt-2 text-lg font-bold text-amber-100">{selectedDecision.objective}</h2>
                        <p className="text-xs text-stone-400 mt-1">Context: {selectedDecision.context}</p>
                      </div>
                      <div className="text-right text-xs text-stone-400">
                        <div>Approver: <span className="font-semibold text-stone-200">{selectedDecision.approver}</span></div>
                        <div className="text-[11px] text-stone-500">{new Date(selectedDecision.timestamp).toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-950/20 p-4">
                      <div className="text-xs font-semibold uppercase text-amber-400">Selected Candidate</div>
                      <div className="mt-1 text-base font-bold text-amber-200">{selectedDecision.selectedOption?.name}</div>
                      <div className="mt-2 text-xs text-stone-300">{selectedDecision.rationale}</div>
                    </div>

                    {selectedDecision.evidenceSummary && (
                      <div className="mt-4">
                        <div className="text-xs font-semibold text-stone-300 mb-1">Evidence Summary</div>
                        <div className="text-xs text-stone-400 bg-stone-950/60 p-3 rounded-lg border border-stone-800">
                          {selectedDecision.evidenceSummary}
                        </div>
                      </div>
                    )}

                    {selectedDecision.resultingActions?.length > 0 && (
                      <div className="mt-5">
                        <div className="text-xs font-bold uppercase tracking-wider text-amber-300 mb-2">
                          Resulting Proposed Actions ({selectedDecision.resultingActions.length})
                        </div>
                        <div className="space-y-2">
                          {selectedDecision.resultingActions.map((act: any) => (
                            <div key={act.id} className="rounded-lg border border-stone-800 bg-stone-950 p-3 text-xs flex items-center justify-between">
                              <div>
                                <span className="font-bold text-amber-400 mr-2">[{act.type}]</span>
                                <span className="text-stone-200">{act.title}</span>
                                <p className="text-[11px] text-stone-400 mt-0.5">{act.description}</p>
                              </div>
                              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                act.status === 'APPROVED' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                              }`}>
                                {act.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-stone-500">
                  Select a decision record to view details, criteria, and resulting actions.
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Master-Detail Research Browser */
          <>
            {/* Sidebar Study List */}
            <div className="w-80 border-r border-stone-800 bg-stone-900/30 overflow-y-auto">
              <div className="p-3">
                <div className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  {activeTab === 'active' ? 'Active Inquiries' : 'Completed Archives'}
                </div>
              </div>

              {(activeTab === 'active' ? activeStudies : completedStudies).length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-500">
                  No {activeTab} research studies found.
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {(activeTab === 'active' ? activeStudies : completedStudies).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStudyId(s.id)}
                      className={`w-full text-left rounded-lg p-3 transition ${
                        selectedStudyId === s.id
                          ? 'border border-amber-500/40 bg-amber-950/40 text-amber-100 shadow-sm'
                          : 'hover:bg-stone-800/60 text-stone-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold line-clamp-1">{s.title || s.question}</span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            s.status === 'COMPLETED'
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                              : s.status === 'RESEARCHING' || s.status === 'VERIFYING'
                              ? 'bg-amber-950/80 text-amber-300 border border-amber-800 animate-pulse'
                              : 'bg-stone-800 text-stone-400'
                          }`}
                        >
                          {s.status}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-stone-400 line-clamp-2">{s.question}</p>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-stone-500">
                        <span>Depth: {s.depth}</span>
                        <span>{new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Main Study Details View */}
            <div className="flex-1 overflow-y-auto p-6">
              {detailsLoading ? (
                <div className="flex h-64 items-center justify-center text-stone-400 text-sm">
                  Loading research study intelligence...
                </div>
              ) : !selectedStudy ? (
                <div className="flex h-64 items-center justify-center text-stone-500 text-sm">
                  Select a research inquiry to inspect sources, evidence, and findings.
                </div>
              ) : (
                <div className="space-y-6 max-w-5xl mx-auto">
                  {/* Study Title Card */}
                  <div className="rounded-xl border border-amber-900/40 bg-stone-900/60 p-5 shadow-lg backdrop-blur">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-bold text-amber-200">
                            {selectedStudy.title || 'Research Inquiry'}
                          </h2>
                          <span className="rounded border border-stone-700 bg-stone-800 px-2 py-0.5 text-xs text-stone-300 font-mono">
                            {selectedStudy.depth}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-stone-300 italic">
                          "{selectedStudy.question}"
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        {selectedStudy.status === 'RESEARCHING' && (
                          <button
                            onClick={() => handlePauseStudy(selectedStudy.id)}
                            className="flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-800 px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-700"
                          >
                            <Pause className="h-3.5 w-3.5" /> Pause
                          </button>
                        )}
                        {(selectedStudy.status === 'PAUSED' || selectedStudy.status === 'PLANNING') && (
                          <button
                            onClick={() => handleExecuteStudy(selectedStudy.id)}
                            className="flex items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-600 px-3 py-1.5 text-xs font-semibold text-stone-950 hover:bg-amber-500"
                          >
                            <Play className="h-3.5 w-3.5" /> Execute
                          </button>
                        )}
                        {selectedStudy.status !== 'COMPLETED' && selectedStudy.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handleCancelStudy(selectedStudy.id)}
                            className="flex items-center gap-1.5 rounded-lg border border-red-900/40 bg-red-950/40 px-3 py-1.5 text-xs text-red-300 hover:bg-red-900/60"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Cancel
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Metrics Strip */}
                    <div className="mt-4 grid grid-cols-4 gap-3 border-t border-stone-800 pt-3">
                      <div className="rounded-lg bg-stone-950/60 p-2.5 border border-stone-800">
                        <div className="text-[11px] text-stone-400">Sources Acquired</div>
                        <div className="text-lg font-bold text-amber-300">{sources.length}</div>
                      </div>
                      <div className="rounded-lg bg-stone-950/60 p-2.5 border border-stone-800">
                        <div className="text-[11px] text-stone-400">Evidence Collected</div>
                        <div className="text-lg font-bold text-amber-300">{evidence.length}</div>
                      </div>
                      <div className="rounded-lg bg-stone-950/60 p-2.5 border border-stone-800">
                        <div className="text-[11px] text-stone-400">Verified Findings</div>
                        <div className="text-lg font-bold text-emerald-400">{findings.length}</div>
                      </div>
                      <div className="rounded-lg bg-stone-950/60 p-2.5 border border-stone-800">
                        <div className="text-[11px] text-stone-400">Conflicts Detected</div>
                        <div className="text-lg font-bold text-red-400">
                          {selectedStudy.completionState?.conflictsDetected || 0}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3D Research Constellation Preview */}
                  <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-5 backdrop-blur">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
                        <Layers className="h-4 w-4" />
                        Research Constellation Graph
                      </div>
                      <span className="text-[11px] text-stone-500">Live Traceability Nodes</span>
                    </div>

                    <div className="relative flex h-32 items-center justify-around rounded-lg border border-amber-900/30 bg-gradient-to-r from-amber-950/20 via-stone-950 to-amber-950/20 p-4">
                      <div className="flex flex-col items-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-500/60 bg-amber-950/80 text-amber-300 shadow-md overflow-hidden">
                          <IndianEmblem size={24} showText={false} variant="feather" />
                        </div>
                        <span className="mt-1 text-[10px] font-semibold text-amber-200">Objective</span>
                      </div>

                      <div className="h-0.5 flex-1 bg-gradient-to-r from-amber-500/50 to-blue-500/50" />

                      <div className="flex flex-col items-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-500 bg-blue-950 text-blue-300 shadow-md">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <span className="mt-1 text-[10px] font-semibold text-blue-200">{sources.length} Sources</span>
                      </div>

                      <div className="h-0.5 flex-1 bg-gradient-to-r from-blue-500/50 to-emerald-500/50" />

                      <div className="flex flex-col items-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500 bg-emerald-950 text-emerald-300 shadow-md">
                          <Award className="h-5 w-5" />
                        </div>
                        <span className="mt-1 text-[10px] font-semibold text-emerald-200">{findings.length} Findings</span>
                      </div>
                    </div>
                  </div>

                  {/* Synthesized Key Findings */}
                  <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-5 shadow-lg">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-amber-300">
                        Synthesized Key Findings & Citations
                      </h3>
                      <span className="text-xs text-stone-400">{findings.length} items</span>
                    </div>

                    {findings.length === 0 ? (
                      <div className="py-6 text-center text-xs text-stone-500">
                        No synthesized findings yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {findings.map((f, idx) => (
                          <div
                            key={f.id || idx}
                            className="rounded-lg border border-stone-800 bg-stone-950/80 p-4 transition hover:border-amber-500/40"
                          >
                            <div className="flex items-start justify-between">
                              <div className="font-semibold text-stone-100 text-sm">
                                {idx + 1}. {f.title}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="rounded bg-amber-950/60 border border-amber-800 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                                  {f.findingType}
                                </span>
                                <span
                                  className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                    f.status === 'CONFIRMED'
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                      : f.status === 'CORROBORATED'
                                      ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                      : f.status === 'CONFLICTING'
                                      ? 'bg-red-950 text-red-300 border border-red-800'
                                      : 'bg-stone-800 text-stone-400'
                                  }`}
                                >
                                  {f.status}
                                </span>
                              </div>
                            </div>

                            <p className="mt-2 text-xs text-stone-300 leading-relaxed">
                              {f.statement}
                            </p>

                            {f.contradictionNotes && (
                              <div className="mt-2 flex items-center gap-2 rounded border border-red-900/40 bg-red-950/30 p-2 text-xs text-red-300">
                                <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                                <span>{f.contradictionNotes}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Sources Matrix */}
                  <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-5 shadow-lg">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-amber-300">
                        Consulted Sources & Provenance
                      </h3>
                      <span className="text-xs text-stone-400">{sources.length} sources</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-stone-300">
                        <thead className="border-b border-stone-800 bg-stone-950/60 text-stone-400">
                          <tr>
                            <th className="p-2.5">Source Title</th>
                            <th className="p-2.5">Domain</th>
                            <th className="p-2.5">Tier</th>
                            <th className="p-2.5">Freshness</th>
                            <th className="p-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-800/60">
                          {sources.map((src) => (
                            <tr key={src.id} className="hover:bg-stone-800/40">
                              <td className="p-2.5 font-medium text-stone-200">
                                <a
                                  href={src.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 text-amber-300 hover:underline"
                                >
                                  <span className="line-clamp-1">{src.title || src.url}</span>
                                  <ExternalLink className="h-3 w-3 shrink-0" />
                                </a>
                              </td>
                              <td className="p-2.5 font-mono text-stone-400">{src.domain}</td>
                              <td className="p-2.5">
                                <span className="rounded bg-stone-800 px-1.5 py-0.5 text-[10px] text-amber-200">
                                  {src.credibilityTier}
                                </span>
                              </td>
                              <td className="p-2.5">
                                <span className="text-[11px] text-stone-400">{src.freshness}</span>
                              </td>
                              <td className="p-2.5">
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                    src.status === 'ACQUIRED'
                                      ? 'text-emerald-400'
                                      : src.status === 'DUPLICATE'
                                      ? 'text-yellow-400'
                                      : 'text-stone-400'
                                  }`}
                                >
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
          </>
        )}
      </div>
    </div>
  );
};
