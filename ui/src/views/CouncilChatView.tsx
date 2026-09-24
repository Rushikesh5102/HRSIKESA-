import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Send,
  Sparkles,
  Bot,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Shield,
  Layers,
  Cpu,
  RefreshCw,
  MessageSquare,
  Zap,
  Award,
  ChevronRight,
  Target,
  FileCode,
  Flame
} from 'lucide-react';
import { AgentInfo } from '../types/api.types';
import { api } from '../services/api';
import { IndianFrame } from '../components/IndianFrame';
import { AgentAvatar } from '../components/AgentAvatar';

interface CouncilTurn {
  agentId: string;
  agentName: string;
  role: string;
  content: string;
  timestamp: string;
  suggestions: string[];
}

interface CouncilDiscussionResult {
  topic: string;
  mode: string;
  turns: CouncilTurn[];
  consensusSummary: string;
  recommendedMission?: {
    objective: string;
    tasks: Array<{ id: string; agentId: string; agentName: string; title: string; objective: string }>;
  };
}

interface CouncilChatViewProps {
  agents: AgentInfo[];
  onOpenWork?: () => void;
}

const AVAILABLE_SPECIALISTS = [
  { id: 'aja', name: 'Aja', role: 'Strategy & Milestones', avatar: 'aja', defaultSelected: true },
  { id: 'spoota', name: 'Spoota', role: 'Product & UI Design', avatar: 'spoota', defaultSelected: true },
  { id: 'gandiva', name: 'Gāṇḍīva', role: 'Software & Code Architecture', avatar: 'gandiva', defaultSelected: true },
  { id: 'vighna', name: 'Vighna', role: 'Testing & Quality Assurance', avatar: 'vighna', defaultSelected: true },
  { id: 'rutam', name: 'Rutam', role: 'Security & Governance', avatar: 'rutam', defaultSelected: true },
  { id: 'rahu', name: 'Rahu', role: 'Research & Intelligence', avatar: 'rahu', defaultSelected: false },
  { id: 'kaala', name: 'KĀLA', role: 'Scheduling & Timing', avatar: 'kaala', defaultSelected: false },
  { id: 'garuda', name: 'Garuḍa', role: 'Infrastructure & DevOps', avatar: 'garuda', defaultSelected: false },
  { id: 'kali', name: 'Kali', role: 'Optimization & Scaling', avatar: 'kali', defaultSelected: false },
];

export const CouncilChatView: React.FC<CouncilChatViewProps> = ({ agents, onOpenWork }) => {
  const [topicInput, setTopicInput] = useState('');
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>(['aja', 'spoota', 'gandiva', 'vighna', 'rutam']);
  const [discussionMode, setDiscussionMode] = useState<'plan' | 'debate' | 'consensus'>('plan');
  const [isDiscussing, setIsDiscussing] = useState(false);
  const [currentDiscussion, setCurrentDiscussion] = useState<CouncilDiscussionResult | null>(null);
  const [convertingMission, setConvertingMission] = useState(false);
  const [missionCreatedId, setMissionCreatedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const toggleAgent = (id: string) => {
    setSelectedAgentIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const handleStartDiscussion = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = topicInput.trim();
    if (!trimmed || selectedAgentIds.length === 0 || isDiscussing) return;

    setIsDiscussing(true);
    setMissionCreatedId(null);
    try {
      const res = await api.startCouncilDiscussion(trimmed, selectedAgentIds, discussionMode);
      if (res && res.success) {
        setCurrentDiscussion(res);
      }
    } catch (err) {
      console.error('Council discussion failed', err);
    } finally {
      setIsDiscussing(false);
    }
  };

  const handleConvertToMission = async () => {
    if (!currentDiscussion) return;
    setConvertingMission(true);
    try {
      const res = await api.convertCouncilToMission(
        currentDiscussion.topic,
        currentDiscussion.recommendedMission?.tasks
      );
      if (res && res.success) {
        setMissionCreatedId(res.missionId);
      }
    } catch (err) {
      console.error('Convert to mission failed', err);
    } finally {
      setConvertingMission(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentDiscussion, isDiscussing]);

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* View Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              Specialist Council War Room
            </h1>
            <span style={{ fontSize: '12px', color: 'var(--text-gold)', fontFamily: 'var(--font-devanagari)', fontWeight: 600 }}>
              सभा
            </span>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Bring your tasks and architectural ideas to the sovereign multi-agent council. Multiple specialists debate, critique, and synthesize an optimal execution DAG.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-gold">{selectedAgentIds.length} Specialists Selected</span>
          <span className="badge badge-online">Council Active</span>
        </div>
      </div>

      {/* Council Setup Strip: Select Participating Specialists */}
      <IndianFrame
        variant="stone"
        title="Council Participants & Discussion Mode"
        subtitle="Select the autonomous specialists who will evaluate and refine your proposal"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Agent Selection Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {AVAILABLE_SPECIALISTS.map((spec) => {
              const isSelected = selectedAgentIds.includes(spec.id);
              return (
                <button
                  key={spec.id}
                  onClick={() => toggleAgent(spec.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    background: isSelected ? 'rgba(212, 175, 55, 0.15)' : 'var(--bg-card)',
                    border: `1px solid ${isSelected ? 'var(--accent-gold)' : 'var(--border-color)'}`,
                    color: isSelected ? 'var(--text-gold)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontSize: '12.5px',
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  <AgentAvatar agentId={spec.id} name={spec.name} size={22} />
                  <span>{spec.name}</span>
                  <span style={{ fontSize: '10px', opacity: 0.8 }}>({spec.role.split('&')[0].trim()})</span>
                </button>
              );
            })}
          </div>

          {/* Mode Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Protocol Mode:
            </span>

            {[
              { id: 'plan', label: 'Collaborative Planning (Aja → Spoota → Gāṇḍīva → Vighna → Rutam)' },
              { id: 'debate', label: 'Architecture Debate & Tradeoff Critique' },
              { id: 'consensus', label: 'Fast Action Consensus' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setDiscussionMode(m.id as any)}
                style={{
                  background: discussionMode === m.id ? 'var(--bg-elevated)' : 'transparent',
                  border: `1px solid ${discussionMode === m.id ? 'var(--accent-gold)' : 'transparent'}`,
                  color: discussionMode === m.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: discussionMode === m.id ? 600 : 400,
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </IndianFrame>

      {/* Main Discussion Input Box */}
      <IndianFrame variant="accent" style={{ padding: '16px 20px' }}>
        <form onSubmit={handleStartDiscussion} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-saffron))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0f131a',
              flexShrink: 0,
            }}
          >
            <Users size={18} />
          </div>

          <input
            type="text"
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            placeholder="Propose a task, software project, or architectural challenge for the council to discuss..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '15px',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)',
            }}
          />

          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: '8px 18px', fontSize: '13.5px' }}
            disabled={!topicInput.trim() || isDiscussing}
          >
            {isDiscussing ? (
              <>
                <RefreshCw size={15} className="spin" />
                <span>Council Deliberating...</span>
              </>
            ) : (
              <>
                <span>Convene Sabha</span>
                <Send size={15} />
              </>
            )}
          </button>
        </form>
      </IndianFrame>

      {/* Discussion Transcript Stream */}
      {currentDiscussion && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Topic Banner */}
          <div
            style={{
              padding: '14px 20px',
              background: 'linear-gradient(90deg, rgba(212, 175, 55, 0.15) 0%, rgba(15, 13, 10, 0.9) 100%)',
              border: '1px solid var(--accent-gold)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-gold)', fontWeight: 600, textTransform: 'uppercase' }}>
                Deliberation Topic
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                "{currentDiscussion.topic}"
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                className="btn btn-primary"
                onClick={handleConvertToMission}
                disabled={convertingMission || !!missionCreatedId}
                style={{ fontSize: '13px', padding: '8px 16px' }}
              >
                {convertingMission ? (
                  <>
                    <RefreshCw size={14} className="spin" />
                    <span>Planning Mission...</span>
                  </>
                ) : missionCreatedId ? (
                  <>
                    <CheckCircle2 size={14} color="#10b981" />
                    <span>Mission Dispatched!</span>
                  </>
                ) : (
                  <>
                    <Zap size={14} />
                    <span>⚡ Convert into Executable Mission</span>
                  </>
                )}
              </button>

              {missionCreatedId && onOpenWork && (
                <button className="btn btn-secondary" onClick={onOpenWork} style={{ fontSize: '12.5px' }}>
                  Open Living Workspace →
                </button>
              )}
            </div>
          </div>

          {/* Turn-by-Turn Specialist Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {currentDiscussion.turns.map((turn, index) => (
              <div
                key={index}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '18px 22px',
                  display: 'flex',
                  gap: '16px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ flexShrink: 0, marginTop: '2px' }}>
                  <AgentAvatar agentId={turn.agentId} name={turn.agentName} size={48} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-gold)', fontFamily: 'var(--font-cinzel)' }}>
                        {turn.agentName}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'var(--bg-card)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                        {turn.role}
                      </span>
                    </div>

                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Turn #{index + 1}
                    </span>
                  </div>

                  <div style={{ fontSize: '13.5px', color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {turn.content}
                  </div>

                  {/* Key Suggestions */}
                  {turn.suggestions.length > 0 && (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '10px 14px',
                        background: 'var(--bg-card)',
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-gold)', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Key Actionable Deliverables:
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                        {turn.suggestions.map((s, sIdx) => (
                          <li key={sIdx} style={{ marginTop: '2px' }}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Consensus Synthesis Card */}
          <IndianFrame
            variant="glow"
            title="Consensus Synthesis & Execution Roadmap"
            subtitle="Synthesized agreement across all participating specialist council domains"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                {currentDiscussion.consensusSummary}
              </p>

              {currentDiscussion.recommendedMission && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-gold)', textTransform: 'uppercase' }}>
                    Recommended DAG Task Sequence:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                    {currentDiscussion.recommendedMission.tasks.map((t, idx) => (
                      <div
                        key={t.id}
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          padding: '10px 12px',
                          fontSize: '12px',
                        }}
                      >
                        <div style={{ color: 'var(--text-gold)', fontWeight: 600, marginBottom: '2px' }}>
                          Step {idx + 1}: {t.agentName}
                        </div>
                        <div style={{ color: 'var(--text-secondary)' }}>
                          {t.title}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </IndianFrame>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};
