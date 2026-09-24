import React, { useState } from 'react';
import { CheckSquare, Clock, AlertTriangle, CheckCircle, Bot, Wrench, Shield } from 'lucide-react';
import { TaskInfo } from '../types/api.types';

interface TasksViewProps {
  tasks: TaskInfo[];
}

export const TasksView: React.FC<TasksViewProps> = ({ tasks }) => {
  const [filter, setFilter] = useState<'ALL' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PENDING'>('ALL');

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'ALL') return true;
    return t.status === filter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return <span className="badge badge-emerald">RUNNING</span>;
      case 'COMPLETED':
        return <span className="badge badge-cyan">COMPLETED</span>;
      case 'FAILED':
      case 'BLOCKED':
        return <span className="badge badge-rose">{status}</span>;
      case 'PENDING':
      default:
        return <span className="badge badge-indigo">PENDING</span>;
    }
  };

  return (
    <div>
      <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="view-title">Autonomous Tasks</h1>
          <p className="view-subtitle">
            Atomic execution units dispatched across the HṚṢĪKEŚA multi-agent runtime and tool bus.
          </p>
        </div>

        {/* Filter Buttons */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['ALL', 'RUNNING', 'PENDING', 'COMPLETED', 'FAILED'] as const).map((st) => (
            <button
              key={st}
              className={`btn ${filter === st ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '4px 10px', fontSize: '12px' }}
              onClick={() => setFilter(st)}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
          <CheckSquare size={36} color="var(--accent-indigo)" style={{ marginBottom: '12px' }} />
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>No Tasks Matching Filter</div>
          <p style={{ fontSize: '13px', marginTop: '6px' }}>
            Autonomous tasks will appear as missions and conversational instructions are executed.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredTasks.map((task) => (
            <div key={task.id} className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {task.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {task.description}
                  </div>
                </div>
                {getStatusBadge(task.status)}
              </div>

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px' }}>
                <div>
                  ID: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{task.id}</span>
                </div>
                <div>
                  Agent: <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{task.assignedAgent || 'Unassigned'}</span>
                </div>
                {task.dangerTier !== undefined && (
                  <div>
                    Danger Tier: <span className="badge badge-amber" style={{ padding: '1px 5px', fontSize: '10px' }}>Tier {task.dangerTier}</span>
                  </div>
                )}
                <div>
                  Created: <span>{new Date(task.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>

              {task.result && (
                <div
                  style={{
                    marginTop: '10px',
                    padding: '8px 12px',
                    background: 'rgba(6, 182, 212, 0.05)',
                    borderRadius: '6px',
                    border: '1px solid rgba(6, 182, 212, 0.2)',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {task.result}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
