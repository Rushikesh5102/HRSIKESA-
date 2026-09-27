import React, { useState, useEffect, useCallback } from 'react';
import {
  Palette,
  Image as ImageIcon,
  Video,
  Music,
  Mic,
  Box,
  FileText,
  Presentation,
  Package,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  Play,
  Pause,
  RotateCcw,
  XCircle,
  ThumbsUp,
  Sparkles,
  RefreshCw,
  Search,
  ExternalLink,
  Shield,
  Eye,
} from 'lucide-react';
import { IndianFrame } from '../components/IndianFrame';

export interface CreationArtifactUI {
  id: string;
  jobId: string;
  name: string;
  type: string;
  format: string;
  location: string;
  sizeBytes: number;
  hash: string;
  verified: boolean;
  version: number;
  previewUrl?: string;
}

export interface CreationJobUI {
  id: string;
  owner: string;
  type: string;
  objective: string;
  prompt: string;
  status: string;
  progressPercentage: number;
  modelProvider?: string;
  costClassification?: string;
  estimatedCostUsd?: number;
  currentIteration: number;
  maxIterations: number;
  outputArtifacts: CreationArtifactUI[];
  verification?: {
    verified: boolean;
    score: number;
    details: string;
  };
  approvalStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export const CreationStudioView: React.FC = () => {
  const [jobs, setJobs] = useState<CreationJobUI[]>([]);
  const [selectedJob, setSelectedJob] = useState<CreationJobUI | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Create Job Modal State
  const [isCreating, setIsCreating] = useState(false);
  const [newType, setNewType] = useState('IMAGE');
  const [newObjective, setNewObjective] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [newLocalOnly, setNewLocalOnly] = useState(false);
  const [newRequireApproval, setNewRequireApproval] = useState(false);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/creation/jobs');
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
        if (selectedJob) {
          const updated = (data.jobs || []).find((j: CreationJobUI) => j.id === selectedJob.id);
          if (updated) setSelectedJob(updated);
        }
      }
    } catch {
      // offline / mock fallback
    } finally {
      setLoading(false);
    }
  }, [selectedJob]);

  useEffect(() => {
    loadJobs();
    const interval = setInterval(loadJobs, 4000);
    return () => clearInterval(interval);
  }, [loadJobs]);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newObjective.trim()) return;

    try {
      const res = await fetch('/api/creation/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: newType,
          objective: newObjective,
          prompt: newPrompt || newObjective,
          constraints: {
            localOnly: newLocalOnly,
            requireApprovalForPurchase: newRequireApproval,
          },
          autoStart: true,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setIsCreating(false);
        setNewObjective('');
        setNewPrompt('');
        loadJobs();
        setSelectedJob(created);
      }
    } catch (err) {
      console.error('Failed to create job', err);
    }
  };

  const handleAction = async (jobId: string, action: string, body: Record<string, unknown> = {}) => {
    try {
      const res = await fetch(`/api/creation/jobs/${jobId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        loadJobs();
      }
    } catch (err) {
      console.error(`Action ${action} failed:`, err);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    if (filterType !== 'ALL' && job.type !== filterType) return false;
    if (filterStatus !== 'ALL' && job.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        job.objective.toLowerCase().includes(q) ||
        job.prompt.toLowerCase().includes(q) ||
        job.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'IMAGE': return <ImageIcon size={16} className="text-amber-400" />;
      case 'VIDEO': return <Video size={16} className="text-blue-400" />;
      case 'AUDIO': return <Music size={16} className="text-indigo-400" />;
      case 'MUSIC': return <Music size={16} className="text-purple-400" />;
      case 'VOICE': return <Mic size={16} className="text-rose-400" />;
      case 'THREE_D': return <Box size={16} className="text-teal-400" />;
      case 'DOCUMENT': return <FileText size={16} className="text-emerald-400" />;
      case 'PRESENTATION': return <Presentation size={16} className="text-yellow-400" />;
      case 'MEDIA_PACKAGE': return <Package size={16} className="text-cyan-400" />;
      default: return <Palette size={16} className="text-orange-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-emerald-950 text-emerald-300 border border-emerald-800"><CheckCircle2 size={12} /> Completed</span>;
      case 'RUNNING':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-blue-950 text-blue-300 border border-blue-800 animate-pulse"><RefreshCw size={12} className="animate-spin" /> Running</span>;
      case 'QUEUED':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-amber-950 text-amber-300 border border-amber-800"><Clock size={12} /> Queued</span>;
      case 'AWAITING_APPROVAL':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-purple-950 text-purple-300 border border-purple-800"><Shield size={12} /> Approval Required</span>;
      case 'PAUSED':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-zinc-800 text-zinc-300 border border-zinc-700"><Pause size={12} /> Paused</span>;
      case 'FAILED':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-rose-950 text-rose-300 border border-rose-800"><AlertCircle size={12} /> Failed</span>;
      case 'CANCELLED':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-zinc-900 text-zinc-400 border border-zinc-800"><XCircle size={12} /> Cancelled</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-zinc-800 text-zinc-300">{status}</span>;
    }
  };

  return (
    <IndianFrame title="Creation Studio & Media Studio (FP-17)" subtitle="Local-first universal multi-modal production and orchestration engine">
      <div className="flex flex-col h-full gap-4 p-4 text-zinc-100">
        {/* Header Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-lg text-sm font-medium shadow-md transition-all"
            >
              <Sparkles size={16} /> New Creation
            </button>
            <button
              onClick={loadJobs}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm transition-all"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 bg-zinc-950/80 border border-zinc-700/60 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-amber-500 w-44"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-2.5 py-1 bg-zinc-950/80 border border-zinc-700/60 rounded-lg text-sm text-zinc-200 focus:outline-none"
            >
              <option value="ALL">All Types</option>
              <option value="IMAGE">Image</option>
              <option value="VIDEO">Video</option>
              <option value="AUDIO">Audio</option>
              <option value="MUSIC">Music</option>
              <option value="VOICE">Voice</option>
              <option value="THREE_D">3D Model</option>
              <option value="DOCUMENT">Document</option>
              <option value="PRESENTATION">Presentation</option>
              <option value="MEDIA_PACKAGE">Package</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1 bg-zinc-950/80 border border-zinc-700/60 rounded-lg text-sm text-zinc-200 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="RUNNING">Running</option>
              <option value="QUEUED">Queued</option>
              <option value="AWAITING_APPROVAL">Awaiting Approval</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 overflow-hidden min-h-0">
          {/* Jobs List Panel */}
          <div className="lg:col-span-5 bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3 flex flex-col min-h-0 overflow-y-auto">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Creation Pipeline ({filteredJobs.length})</span>
            </div>

            {filteredJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-500">
                <Palette size={32} className="mb-2 opacity-40" />
                <p className="text-sm">No creation jobs found</p>
                <button onClick={() => setIsCreating(true)} className="mt-2 text-xs text-amber-400 hover:underline">
                  Start your first creation
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredJobs.map((job) => {
                  const isSelected = selectedJob?.id === job.id;
                  return (
                    <div
                      key={job.id}
                      onClick={() => setSelectedJob(job)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-amber-950/20 border-amber-600/60 shadow-sm'
                          : 'bg-zinc-950/60 border-zinc-800/60 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 truncate">
                          {getTypeIcon(job.type)}
                          <span className="text-sm font-medium text-zinc-200 truncate">{job.objective}</span>
                        </div>
                        {getStatusBadge(job.status)}
                      </div>

                      <div className="text-xs text-zinc-400 line-clamp-1 mb-2 font-mono">
                        {job.prompt}
                      </div>

                      {job.status === 'RUNNING' && (
                        <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mb-2">
                          <div
                            className="bg-amber-500 h-full transition-all duration-300"
                            style={{ width: `${job.progressPercentage || 10}%` }}
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-zinc-500">
                        <span>Iter #{job.currentIteration} • {job.outputArtifacts?.length || 0} artifacts</span>
                        <span>{job.modelProvider || 'Auto Provider'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Job Details & Studio Workspace */}
          <div className="lg:col-span-7 bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 flex flex-col min-h-0 overflow-y-auto">
            {selectedJob ? (
              <div className="flex flex-col gap-4">
                {/* Job Header */}
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-zinc-800">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {getTypeIcon(selectedJob.type)}
                      <h2 className="text-lg font-semibold text-zinc-100">{selectedJob.objective}</h2>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <span>Job ID: <code className="text-zinc-300">{selectedJob.id}</code></span>
                      <span>•</span>
                      <span>Owner: {selectedJob.owner}</span>
                      <span>•</span>
                      <span>Created: {new Date(selectedJob.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                  <div>{getStatusBadge(selectedJob.status)}</div>
                </div>

                {/* Studio Action Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  {selectedJob.status === 'DRAFT' && (
                    <button
                      onClick={() => handleAction(selectedJob.id, 'start')}
                      className="flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-medium"
                    >
                      <Play size={12} /> Start Pipeline
                    </button>
                  )}

                  {selectedJob.status === 'RUNNING' && (
                    <button
                      onClick={() => handleAction(selectedJob.id, 'pause')}
                      className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs font-medium"
                    >
                      <Pause size={12} /> Pause
                    </button>
                  )}

                  {selectedJob.status === 'PAUSED' && (
                    <button
                      onClick={() => handleAction(selectedJob.id, 'resume')}
                      className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium"
                    >
                      <Play size={12} /> Resume
                    </button>
                  )}

                  {selectedJob.status === 'AWAITING_APPROVAL' && (
                    <button
                      onClick={() => handleAction(selectedJob.id, 'approve', { approvedBy: 'Sovereign' })}
                      className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium"
                    >
                      <ThumbsUp size={12} /> Sovereign Approve
                    </button>
                  )}

                  {['COMPLETED', 'FAILED'].includes(selectedJob.status) && (
                    <button
                      onClick={() => handleAction(selectedJob.id, 'iterate', { promptModifications: 'Refine composition' })}
                      className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs font-medium"
                    >
                      <RotateCcw size={12} /> Iterate
                    </button>
                  )}

                  {['RUNNING', 'QUEUED', 'DRAFT', 'PAUSED'].includes(selectedJob.status) && (
                    <button
                      onClick={() => handleAction(selectedJob.id, 'cancel')}
                      className="flex items-center gap-1.5 px-3 py-1 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 rounded text-xs font-medium"
                    >
                      <XCircle size={12} /> Cancel
                    </button>
                  )}
                </div>

                {/* Specs & Metadata */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className="bg-zinc-950/60 p-2.5 rounded border border-zinc-800">
                    <span className="text-zinc-500 block mb-1">Provider / Model</span>
                    <span className="font-mono text-zinc-200">{selectedJob.modelProvider || 'Auto-Resolved'}</span>
                  </div>
                  <div className="bg-zinc-950/60 p-2.5 rounded border border-zinc-800">
                    <span className="text-zinc-500 block mb-1">Cost / Classification</span>
                    <span className="text-emerald-400 font-mono">{selectedJob.costClassification || 'FREE_LOCAL'}</span>
                  </div>
                  <div className="bg-zinc-950/60 p-2.5 rounded border border-zinc-800">
                    <span className="text-zinc-500 block mb-1">Iterations</span>
                    <span className="text-zinc-200">{selectedJob.currentIteration} / {selectedJob.maxIterations}</span>
                  </div>
                  <div className="bg-zinc-950/60 p-2.5 rounded border border-zinc-800">
                    <span className="text-zinc-500 block mb-1">Verification Score</span>
                    <span className="text-zinc-200">{selectedJob.verification ? `${(selectedJob.verification.score * 100).toFixed(0)}%` : 'Pending'}</span>
                  </div>
                </div>

                {/* Prompt & Instructions */}
                <div className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-800">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide block mb-1">Instructions & Prompt</span>
                  <p className="text-sm text-zinc-200 whitespace-pre-wrap font-sans">{selectedJob.prompt}</p>
                </div>

                {/* Artifacts Produced */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                      Production Artifacts ({selectedJob.outputArtifacts?.length || 0})
                    </span>
                  </div>

                  {(!selectedJob.outputArtifacts || selectedJob.outputArtifacts.length === 0) ? (
                    <div className="p-4 rounded border border-dashed border-zinc-800 text-center text-xs text-zinc-500">
                      No artifacts generated yet. Execute job to build deliverables.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedJob.outputArtifacts.map((art) => (
                        <div key={art.id} className="bg-zinc-950/80 border border-zinc-800 rounded-lg p-3 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-amber-300 truncate">{art.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase">{art.format}</span>
                          </div>

                          <div className="text-[11px] text-zinc-400 font-mono truncate">
                            {art.location}
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-1">
                            <span>{(art.sizeBytes / 1024).toFixed(1)} KB • v{art.version}</span>
                            <span className={art.verified ? 'text-emerald-400' : 'text-amber-400'}>
                              {art.verified ? 'Verified ✓' : 'Unverified'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-zinc-500 p-8">
                <Palette size={40} className="mb-2 opacity-30 text-amber-500" />
                <h3 className="text-sm font-medium text-zinc-300">Select a creation job</h3>
                <p className="text-xs text-zinc-500 mt-1">Select an existing job from the list or create a new one to begin</p>
              </div>
            )}
          </div>
        </div>

        {/* Create Job Modal */}
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 w-full max-w-lg shadow-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-400" />
                  <h3 className="text-base font-semibold text-zinc-100">New Creation Request</h3>
                </div>
                <button onClick={() => setIsCreating(false)} className="text-zinc-500 hover:text-zinc-300">
                  <XCircle size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateJob} className="flex flex-col gap-3 text-xs">
                <div>
                  <label className="block text-zinc-400 mb-1">Creation Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="IMAGE">Image / Vector / Logo</option>
                    <option value="VIDEO">Video / Motion Graphic</option>
                    <option value="AUDIO">Audio Track</option>
                    <option value="MUSIC">Music Composition</option>
                    <option value="VOICE">Voice Synthesis</option>
                    <option value="THREE_D">3D Model / Asset</option>
                    <option value="DOCUMENT">Document / Report (PDF, DOCX)</option>
                    <option value="PRESENTATION">Presentation Deck</option>
                    <option value="MEDIA_PACKAGE">Complete Media Launch Package</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Objective</label>
                  <input
                    type="text"
                    placeholder="e.g., Create a logo for HṚṢĪKEŚA with astronomical geometry"
                    value={newObjective}
                    onChange={(e) => setNewObjective(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Prompt / Detailed Instructions</label>
                  <textarea
                    rows={4}
                    placeholder="Provide specific aesthetic, style, dimension, or content requirements..."
                    value={newPrompt}
                    onChange={(e) => setNewPrompt(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-500 font-sans"
                  />
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
                  <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newLocalOnly}
                      onChange={(e) => setNewLocalOnly(e.target.checked)}
                      className="rounded bg-zinc-950 border-zinc-800 text-amber-500 focus:ring-0"
                    />
                    <span>Local-Only Execution (Enforce no cloud models)</span>
                  </label>

                  <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRequireApproval}
                      onChange={(e) => setNewRequireApproval(e.target.checked)}
                      className="rounded bg-zinc-950 border-zinc-800 text-amber-500 focus:ring-0"
                    />
                    <span>Require Sovereign Approval Before Final Delivery</span>
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded text-xs font-medium shadow-md"
                  >
                    Create & Execute
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </IndianFrame>
  );
};
