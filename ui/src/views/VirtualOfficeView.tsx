import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Users,
  CheckCircle2,
  Clock,
  Zap,
  ArrowRight,
  Plus,
  Play,
  FileCode,
  FileText,
  Check,
  AlertCircle,
  RefreshCw,
  Eye,
  Radio,
  Share2,
  Sparkles,
  Terminal,
  Shield,
  Activity,
  Layers,
  ChevronRight,
  Maximize2,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { IndianFrame } from '../components/IndianFrame';

export type OfficeStage =
  | 'BACKLOG'
  | 'PLANNING'
  | 'IN_PROGRESS'
  | 'CODE_REVIEW'
  | 'QA_TESTING'
  | 'COMPLETED'
  | 'BLOCKED';

export interface DeskState {
  agentId: string;
  displayName: string;
  role: string;
  avatar: string;
  deskNumber: number;
  activity: string;
  currentTicketId?: string;
  activeModel: string;
  thoughtBubble?: string;
  tokensProcessed: number;
  tasksCompleted: number;
  lastActiveIso: string;
}

export interface TicketItem {
  id: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  stage: OfficeStage;
  currentAgentId: string;
  assignedRole: string;
  progressPercent: number;
  liveThought?: string;
  activeTool?: string;
  artifacts: Array<{ id: string; type: string; title: string; content: string; path?: string; createdAt: string; createdByAgentId: string }>;
  handoffHistory: Array<{ fromAgentId: string; toAgentId: string; summary: string; timestamp: string; artifactsProduced: string[] }>;
  logs: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

const STAGE_COLUMNS: { stage: OfficeStage; label: string; color: string }[] = [
  { stage: 'BACKLOG', label: 'Backlog', color: 'var(--text-muted)' },
  { stage: 'PLANNING', label: 'Architecture & Planning', color: '#38bdf8' },
  { stage: 'IN_PROGRESS', label: 'Development', color: '#f59e0b' },
  { stage: 'CODE_REVIEW', label: 'Security & Review', color: '#8b5cf6' },
  { stage: 'QA_TESTING', label: 'Automated QA', color: '#ec4899' },
  { stage: 'COMPLETED', label: 'Deployed to Production', color: '#10b981' }
];

export const VirtualOfficeView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'floor' | 'kanban'>('floor');
  const [desks, setDesks] = useState<DeskState[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [selectedDesk, setSelectedDesk] = useState<DeskState | null>(null);
  const [isSseConnected, setIsSseConnected] = useState(false);
  const [advancingTicketId, setAdvancingTicketId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const loadOfficeState = useCallback(async () => {
    try {
      const res = await api.getOfficeState();
      if (res && res.success && res.floor) {
        setDesks(res.floor.desks || []);
        setTickets(res.floor.tickets || []);
      }
    } catch (err) {
      console.error('Failed to load virtual office floor', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOfficeState();

    // Connect Server-Sent Events (SSE) stream for real-time live office updates
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('http://127.0.0.1:4200/office/stream');
      eventSource.onopen = () => {
        setIsSseConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'STAGE_TRANSITION' || parsed.type === 'HANDOFF' || parsed.type === 'TICKET_UPDATED') {
            loadOfficeState();
          } else if (parsed.type === 'DESK_STATUS' && parsed.data) {
            setDesks((prev) =>
              prev.map((d) => (d.agentId === parsed.agentId ? { ...d, ...parsed.data } : d))
            );
          }
        } catch { /* ignore parse error */ }
      };

      eventSource.onerror = () => {
        setIsSseConnected(false);
      };
    } catch (err) {
      console.warn('SSE stream init warning:', err);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [loadOfficeState]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await api.createOfficeTicket({
        title: newTitle,
        description: newDesc,
        priority: newPriority,
        initialAgentId: 'rahu',
        initialRole: 'Product Manager & Strategist',
        autoAdvance
      });

      if (res && res.success) {
        setNotification({ msg: `Ticket "${newTitle}" dispatched to Office Floor!`, type: 'success' });
        setShowCreateModal(false);
        setNewTitle('');
        setNewDesc('');
        loadOfficeState();
      }
    } catch (err) {
      setNotification({ msg: String(err), type: 'error' });
    } finally {
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleAdvanceTicket = async (ticketId: string) => {
    setAdvancingTicketId(ticketId);
    try {
      const res = await api.advanceOfficeTicket(ticketId);
      if (res && res.success) {
        setNotification({ msg: `Ticket advanced to next handoff stage!`, type: 'success' });
        loadOfficeState();
        if (selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket(res.ticket);
        }
      }
    } catch (err) {
      setNotification({ msg: String(err), type: 'error' });
    } finally {
      setAdvancingTicketId(null);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const getActivityColor = (activity: string) => {
    switch (activity) {
      case 'WRITING_CODE': return '#10b981';
      case 'PLANNING': return '#38bdf8';
      case 'REVIEWING': return '#8b5cf6';
      case 'RUNNING_TESTS': return '#ec4899';
      case 'HANDING_OFF': return '#f59e0b';
      default: return 'var(--text-muted)';
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'badge-coral';
      case 'HIGH': return 'badge-gold';
      default: return 'badge-cyan';
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* View Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              Virtual Agent Office & Headless Workspace
            </h1>
            <span style={{ fontSize: '12px', color: 'var(--text-gold)', fontFamily: 'var(--font-devanagari)', fontWeight: 600 }}>
              कार्यालय
            </span>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Real-time multi-agent office floor with autonomous ticket pipelines, token-streaming desks, and zero-delay handoffs.
          </p>
        </div>

        {/* Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              background: isSseConnected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              border: `1px solid ${isSseConnected ? '#10b981' : '#ef4444'}`,
              fontSize: '11.5px',
              color: isSseConnected ? '#34d399' : '#f87171',
              fontWeight: 600
            }}
          >
            <Radio size={12} className={isSseConnected ? 'pulse' : ''} />
            <span>{isSseConnected ? 'SSE Stream Live' : 'Polling Sync'}</span>
          </div>

          <button
            className="btn btn-primary"
            style={{ padding: '8px 16px', fontSize: '13px' }}
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={15} />
            <span>New Office Ticket</span>
          </button>
        </div>
      </div>

      {/* Top Metrics Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div style={{ background: 'var(--bg-card)', padding: '14px 18px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Active Workstations</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-gold)', marginTop: '4px' }}>
            17 Desks Online
          </div>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '14px 18px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>In-Flight Tickets</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#38bdf8', marginTop: '4px' }}>
            {tickets.filter(t => t.stage !== 'COMPLETED').length} Active
          </div>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '14px 18px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Completed Releases</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>
            {tickets.filter(t => t.stage === 'COMPLETED').length} Deployed
          </div>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '14px 18px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Inference Engine</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#f59e0b', marginTop: '4px' }}>
            ~800 tok/s (Groq LPU)
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-elevated)', padding: '4px', borderRadius: '8px', width: 'fit-content', border: '1px solid var(--border-subtle)' }}>
        <button
          className={`btn ${activeTab === 'floor' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '13px', padding: '6px 14px' }}
          onClick={() => setActiveTab('floor')}
        >
          <Building2 size={14} />
          Office Floor & Desks
        </button>
        <button
          className={`btn ${activeTab === 'kanban' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '13px', padding: '6px 14px' }}
          onClick={() => setActiveTab('kanban')}
        >
          <Layers size={14} />
          Kanban Ticket Pipeline
        </button>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: notification.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${notification.type === 'success' ? '#10b981' : '#ef4444'}`,
            color: notification.type === 'success' ? '#34d399' : '#f87171',
          }}
        >
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* TAB 1: OFFICE FLOOR & WORKSTATION GRID */}
      {activeTab === 'floor' && (
        <IndianFrame
          title="Virtual Office Workstation Floor"
          subtitle="Click any desk to inspect real-time thought streams, tool executions, and ticket handoffs"
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
            {desks.map((desk) => {
              const isWorking = desk.activity !== 'IDLE';
              const assignedTicket = tickets.find(t => t.id === desk.currentTicketId);

              return (
                <div
                  key={desk.agentId}
                  onClick={() => {
                    setSelectedDesk(desk);
                    if (assignedTicket) setSelectedTicket(assignedTicket);
                  }}
                  style={{
                    background: 'var(--bg-card)',
                    border: `1px solid ${isWorking ? 'rgba(245, 158, 11, 0.4)' : 'var(--border-subtle)'}`,
                    borderRadius: '10px',
                    padding: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px',
                    transition: 'all 0.2s ease',
                    boxShadow: isWorking ? '0 0 16px rgba(245, 158, 11, 0.08)' : 'none',
                    position: 'relative'
                  }}
                >
                  <div>
                    {/* Top Desk Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        DESK #{desk.deskNumber.toString().padStart(2, '0')}
                      </span>
                      <span
                        style={{
                          fontSize: '10.5px',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: `${getActivityColor(desk.activity)}15`,
                          color: getActivityColor(desk.activity),
                          fontWeight: 700,
                          border: `1px solid ${getActivityColor(desk.activity)}40`
                        }}
                      >
                        {desk.activity.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Agent Avatar & Identity */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '8px',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-color)',
                          fontSize: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {desk.avatar}
                      </div>
                      <div>
                        <h4 style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {desk.displayName}
                        </h4>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {desk.role}
                        </span>
                      </div>
                    </div>

                    {/* Speech / Thought Bubble */}
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: 'rgba(0,0,0,0.25)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '11px',
                        color: isWorking ? '#38bdf8' : 'var(--text-muted)',
                        lineHeight: 1.35,
                        fontStyle: 'italic',
                        maxHeight: '44px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      💬 "{desk.thoughtBubble || 'Awaiting ticket assignment...'}"
                    </div>
                  </div>

                  {/* Desk Bottom Details */}
                  <div style={{ paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10.5px', color: 'var(--text-muted)' }}>
                    <span>Model: {desk.activeModel.split(':')[0].split('/')[0]}</span>
                    <span>Done: {desk.tasksCompleted}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </IndianFrame>
      )}

      {/* TAB 2: KANBAN PIPELINE */}
      {activeTab === 'kanban' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', alignItems: 'flex-start' }}>
          {STAGE_COLUMNS.map((col) => {
            const columnTickets = tickets.filter((t) => t.stage === col.stage);

            return (
              <div
                key={col.stage}
                style={{
                  background: 'var(--bg-elevated)',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  minHeight: '480px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: col.color }} />
                    <h3 style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {col.label}
                    </h3>
                  </div>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 700 }}>
                    {columnTickets.length}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {columnTickets.map((t) => {
                    const isAdvancing = advancingTicketId === t.id;

                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTicket(t)}
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          transition: 'transform 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span className={`badge ${getPriorityBadgeClass(t.priority)}`} style={{ fontSize: '9.5px', padding: '1px 6px' }}>
                            {t.priority}
                          </span>
                          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            {t.id}
                          </span>
                        </div>

                        <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                          {t.title}
                        </h4>

                        <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.3, maxHeight: '32px', overflow: 'hidden' }}>
                          {t.description}
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px dashed var(--border-subtle)', fontSize: '11px' }}>
                          <span style={{ color: 'var(--text-gold)', fontWeight: 600 }}>
                            @{t.currentAgentId}
                          </span>

                          {t.stage !== 'COMPLETED' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAdvanceTicket(t.id);
                              }}
                              disabled={isAdvancing}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#38bdf8',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '11px',
                                fontWeight: 600
                              }}
                            >
                              {isAdvancing ? <RefreshCw size={11} className="spin" /> : <Play size={11} />}
                              <span>Advance</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {columnTickets.length === 0 && (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>
                      No tickets in {col.label.toLowerCase()}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DRAWER: LIVE TICKET / DESK INSPECTOR */}
      {selectedTicket && (
        <div
          style={{
            position: 'fixed',
            right: 0,
            top: 0,
            bottom: 0,
            width: '480px',
            maxWidth: '100vw',
            background: 'var(--bg-elevated)',
            borderLeft: '1px solid var(--border-color)',
            boxShadow: '-8px 0 30px rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            padding: '24px',
            gap: '18px',
            overflowY: 'auto'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className={`badge ${getPriorityBadgeClass(selectedTicket.priority)}`} style={{ fontSize: '10px' }}>
                {selectedTicket.priority} PRIORITY
              </span>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '6px' }}>
                {selectedTicket.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setSelectedTicket(null)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '12px' }}>
            <span style={{ padding: '4px 10px', borderRadius: '4px', background: 'var(--bg-card)', color: '#38bdf8', fontWeight: 600 }}>
              Stage: {selectedTicket.stage}
            </span>
            <span style={{ padding: '4px 10px', borderRadius: '4px', background: 'var(--bg-card)', color: 'var(--text-gold)', fontWeight: 600 }}>
              Assigned: @{selectedTicket.currentAgentId} ({selectedTicket.assignedRole})
            </span>
          </div>

          {/* Description */}
          <div>
            <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Objective & Description
            </h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, background: 'var(--bg-card)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              {selectedTicket.description}
            </p>
          </div>

          {/* Handoff History Pipeline */}
          <div>
            <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Inter-Agent Handoff Chain
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {selectedTicket.handoffHistory.map((h, i) => (
                <div
                  key={i}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '11.5px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontWeight: 600 }}>
                    <span style={{ color: 'var(--text-gold)' }}>@{h.fromAgentId}</span>
                    <ArrowRight size={12} color="var(--text-muted)" />
                    <span style={{ color: '#38bdf8' }}>@{h.toAgentId}</span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>{h.summary}</div>
                </div>
              ))}
              {selectedTicket.handoffHistory.length === 0 && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Initial ticket assignment in backlog.
                </div>
              )}
            </div>
          </div>

          {/* Generated Artifacts */}
          <div>
            <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Generated Artifacts ({selectedTicket.artifacts.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {selectedTicket.artifacts.map((art) => (
                <div
                  key={art.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '11.5px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#10b981', marginBottom: '4px' }}>
                    <FileCode size={13} />
                    <span>{art.title}</span>
                  </div>
                  <pre style={{ margin: 0, padding: '8px', background: 'var(--bg-card)', borderRadius: '4px', fontSize: '10.5px', color: 'var(--text-primary)', overflowX: 'auto' }}>
                    {art.content}
                  </pre>
                </div>
              ))}
            </div>
          </div>

          {/* Advance Action Button */}
          {selectedTicket.stage !== 'COMPLETED' && (
            <button
              className="btn btn-primary"
              style={{ marginTop: 'auto', padding: '10px', justifyContent: 'center' }}
              onClick={() => handleAdvanceTicket(selectedTicket.id)}
              disabled={advancingTicketId === selectedTicket.id}
            >
              {advancingTicketId === selectedTicket.id ? (
                <RefreshCw size={15} className="spin" />
              ) : (
                <Play size={15} />
              )}
              <span>Advance to Next Stage Autonomous</span>
            </button>
          )}
        </div>
      )}

      {/* CREATE TICKET MODAL */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '16px'
          }}
        >
          <div
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '24px',
              width: '100%',
              maxWidth: '520px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Create New Office Ticket
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Ticket Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Build User Authentication Module or Run Security Audit"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    marginTop: '4px',
                    fontSize: '13px'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Description & Constraints
                </label>
                <textarea
                  rows={4}
                  placeholder="Detail requirements, components, architectural boundaries, and target criteria..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    marginTop: '4px',
                    fontSize: '13px',
                    resize: 'vertical'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e: any) => setNewPriority(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      marginTop: '4px',
                      fontSize: '13px'
                    }}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '20px' }}>
                  <input
                    type="checkbox"
                    id="autoAdvanceCheck"
                    checked={autoAdvance}
                    onChange={(e) => setAutoAdvance(e.target.checked)}
                  />
                  <label htmlFor="autoAdvanceCheck" style={{ fontSize: '12px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                    Auto-Start Execution
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Launch Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
