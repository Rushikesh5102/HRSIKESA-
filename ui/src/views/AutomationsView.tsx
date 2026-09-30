import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Clock,
  Play,
  Pause,
  Plus,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Users,
  Shield,
  Activity,
  Calendar,
} from 'lucide-react';
import { NavTab } from '../components/Sidebar';
import { api } from '../services/api';

interface AutomationsViewProps {
  onNavigate: (tab: NavTab) => void;
}

export const AutomationsView: React.FC<AutomationsViewProps> = ({ onNavigate }) => {
  const [nlInput, setNlInput] = useState('');
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await api.getExecutionJobs();
      if (res && res.jobs) {
        setJobs(res.jobs);
      } else {
        setJobs([]);
      }
    } catch (err) {
      console.error('Failed to load execution jobs', err);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 8000);
    return () => clearInterval(interval);
  }, []);

  const toggleJob = async (jobId: string, currentState: string) => {
    try {
      if (currentState === 'RUNNING' || currentState === 'IN_PROGRESS' || currentState === 'QUEUED') {
        await api.pauseExecutionJob(jobId);
        setStatusMessage(`Paused job ${jobId.slice(0, 8)}`);
      } else {
        await api.resumeExecutionJob(jobId);
        setStatusMessage(`Resumed job ${jobId.slice(0, 8)}`);
      }
      fetchJobs();
    } catch (err: any) {
      setStatusMessage(`Error: ${err?.message || err}`);
    }
  };

  const handleCreateAutomation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlInput.trim()) return;
    setLoading(true);
    try {
      const res = await api.submitMissionObjective(nlInput.trim(), { owner: 'Rushikesh', autoStart: true });
      if (res.success) {
        setStatusMessage(`Successfully created and queued autonomous process: "${nlInput.slice(0, 40)}..."`);
        setNlInput('');
        fetchJobs();
      }
    } catch (err: any) {
      setStatusMessage(`Failed to create process: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        padding: '24px 28px 80px 28px',
        maxWidth: '1440px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* Header */}
      <div
        className="glass-panel"
        style={{
          padding: '24px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '11px', color: 'var(--accent-gold)', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              Autonomous Processes & Automations
            </span>
            <span
              style={{
                fontSize: '11px',
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                padding: '2px 8px',
                borderRadius: '12px',
                fontFamily: 'monospace',
              }}
            >
              24/7 Execution Daemon
            </span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '6px 0 0 0', color: 'var(--text-primary)', fontFamily: 'var(--font-cinzel)' }}>
            Autonomous Scheduled Workflows
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Continuous recurring routines operated by the 33-agent workforce (Market monitoring, CI/CD audits, telemetry flushes).
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={fetchJobs}
            disabled={loading}
            className="btn btn-secondary"
            style={{ fontSize: '12.5px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => onNavigate('persistent-ops')}
            className="btn btn-primary"
            style={{ fontSize: '12.5px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Clock size={14} />
            Persistent Ops Deck
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          style={{
            padding: '10px 16px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--accent-gold)',
            color: 'var(--text-gold)',
            fontSize: '12.5px',
          }}
        >
          {statusMessage}
        </div>
      )}

      {/* Natural Language Creator Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '20px 24px',
          border: '1px solid var(--accent-teal)',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(0, 196, 168, 0.08) 0%, var(--bg-surface) 75%)',
        }}
      >
        <form onSubmit={handleCreateAutomation} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} color="var(--accent-gold)" />
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Create New Autonomous Process via Natural Language
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="e.g. 'Monitor competitor pricing every Monday at 09:00 and generate an executive summary...'"
              value={nlInput}
              onChange={(e) => setNlInput(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '13.5px',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !nlInput.trim()}
              style={{ padding: '10px 20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={15} />
              <span>Compile & Schedule</span>
            </button>
          </div>
        </form>
      </div>

      {/* Automations List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {jobs.length === 0 ? (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Clock size={32} style={{ margin: '0 auto 12px', color: 'var(--accent-teal)', opacity: 0.8 }} />
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>No active automated jobs running</p>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>
              Create a recurring automation above or schedule a background task to activate the continuous 24/7 daemon.
            </p>
          </div>
        ) : (
          jobs.map((job) => {
            const isRunning = job.state === 'RUNNING' || job.state === 'IN_PROGRESS' || job.state === 'QUEUED';
            return (
              <div
                key={job.jobId}
                className="glass-panel"
                style={{
                  padding: '20px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  border: isRunning ? '1px solid var(--border-subtle)' : '1px solid rgba(255, 255, 255, 0.05)',
                  opacity: isRunning ? 1 : 0.75,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: isRunning ? 'rgba(0, 196, 168, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        border: `1px solid ${isRunning ? 'var(--accent-teal)' : 'var(--border-subtle)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isRunning ? 'var(--accent-teal)' : 'var(--text-muted)',
                      }}
                    >
                      <RefreshCw size={18} className={isRunning ? 'spin-slow' : ''} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ fontSize: '15.5px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                          {job.title}
                        </h3>
                        <span style={{ fontSize: '10.5px', color: 'var(--accent-gold)', fontFamily: 'monospace' }}>
                          [{job.runtimeType || 'DAEMON'}]
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Priority: {job.priority} • Scope: {job.scope || 'GLOBAL'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        background: isRunning ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: isRunning ? '#10b981' : '#ef4444',
                        fontWeight: 700,
                        border: `1px solid ${isRunning ? '#10b981' : '#ef4444'}`,
                      }}
                    >
                      {job.state || 'IDLE'}
                    </span>

                    <button
                      onClick={() => toggleJob(job.jobId, job.state)}
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      {isRunning ? <Pause size={13} /> : <Play size={13} />}
                      <span>{isRunning ? 'Pause' : 'Resume'}</span>
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '11.5px', color: 'var(--text-muted)', flexWrap: 'wrap', gap: '8px' }}>
                  <span>Created: <strong style={{ color: 'var(--text-secondary)' }}>{new Date(job.createdAt).toLocaleDateString()}</strong></span>
                  <span>Progress: <strong style={{ color: 'var(--accent-teal)' }}>{job.progressPercent || 0}%</strong></span>
                  <span>Assigned: <strong style={{ color: 'var(--accent-gold)' }}>{job.assignedWorkerId || 'Local Governor'}</strong></span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
