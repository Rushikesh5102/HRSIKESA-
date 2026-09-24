import React, { useState, useEffect } from 'react';
import {
  Monitor,
  AppWindow,
  Globe,
  Folder,
  MousePointer,
  Play,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Terminal,
  Activity,
  Cpu,
} from 'lucide-react';
import { EnvironmentStatusResponse, AppInfo, ProcessInfo } from '../types/api.types';
import { api } from '../services/api';

interface ComputerViewProps {
  envStatus?: EnvironmentStatusResponse;
}

export const ComputerView: React.FC<ComputerViewProps> = ({ envStatus }) => {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ACTIONS' | 'APPS' | 'PROCESSES'>('ACTIONS');
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isControlling, setIsControlling] = useState(false);
  const [liveActivities, setLiveActivities] = useState<string[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [appRes, procRes] = await Promise.all([
        api.getApplications().catch(() => ({ applications: [] })),
        api.getProcesses().catch(() => ({ processes: [] })),
      ]);
      setApps(appRes.applications || []);
      setProcesses(procRes.processes || []);
    } catch (err) {
      console.error('Failed to load computer details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLaunchApp = async (app: AppInfo) => {
    setActionNotice(`Launching ${app.name}...`);
    setIsControlling(true);
    setLiveActivities([`Starting ${app.name}`, 'Waiting for window to initialize']);

    try {
      await api.executeTool('environment.application.launch', {
        name: app.name,
      });
      setLiveActivities((prev) => [...prev, `${app.name} running`]);
    } catch (err: any) {
      setActionNotice(`Could not launch ${app.name}: ${err.message}`);
    } finally {
      setTimeout(() => {
        setIsControlling(false);
        setActionNotice(null);
      }, 4000);
    }
  };

  const handleBrowseWeb = async () => {
    const url = prompt('Enter a website URL to browse:', 'https://google.com');
    if (!url) return;

    setIsControlling(true);
    setActionNotice(`Browsing ${url}...`);
    setLiveActivities(['Opening browser engine', `Navigating to ${url}`, 'Reading page content', 'Ready for interaction']);

    try {
      await api.executeTool('browser.navigate', { url });
    } catch (err: any) {
      setActionNotice(`Browse error: ${err.message}`);
    } finally {
      setTimeout(() => {
        setIsControlling(false);
        setActionNotice(null);
      }, 4000);
    }
  };

  const handleTakeScreenshot = async () => {
    setActionNotice('Capturing screen...');
    try {
      await api.executeTool('computer.screenshot', {});
      setActionNotice('Screenshot captured successfully.');
    } catch (err: any) {
      setActionNotice(`Screenshot error: ${err.message}`);
    } finally {
      setTimeout(() => setActionNotice(null), 3000);
    }
  };

  const filteredApps = apps.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.publisher && a.publisher.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 className="view-title">Computer</h1>
            <span className="badge badge-emerald" style={{ padding: '3px 8px' }}>
              <span className="status-dot status-dot-online" />
              Connected
            </span>
          </div>
          <p className="view-subtitle">
            HṚṢĪKEŚA can safely launch applications, browse websites, inspect files, and automate desktop actions.
          </p>
        </div>

        <button className="btn btn-secondary" onClick={loadData} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'pulse-cyan' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Prominent Active Control Banner */}
      {isControlling && (
        <div
          className="card"
          style={{
            padding: '20px 24px',
            marginBottom: '24px',
            border: '2px solid var(--accent-cyan)',
            background: 'var(--accent-cyan-glow)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <span className="status-dot status-dot-busy pulse-cyan" />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Rishi, I'm controlling your computer.
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '16px' }}>
            {liveActivities.map((act, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <CheckCircle2 size={13} color="var(--accent-cyan)" />
                <span>{act}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {actionNotice && !isControlling && (
        <div className="badge badge-cyan" style={{ width: '100%', marginBottom: '16px', padding: '10px 14px', fontSize: '13px' }}>
          {actionNotice}
        </div>
      )}

      {/* Main Actions Cards */}
      <div className="card-grid" style={{ marginBottom: '24px' }}>
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('APPS')}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AppWindow size={18} color="var(--accent-cyan)" />
              <span className="card-title">Open an app</span>
            </div>
            <span className="badge badge-secondary">{apps.length} available</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Quickly launch your verified tools, IDEs, browsers, and desktop software.
          </p>
        </div>

        <div className="card" style={{ cursor: 'pointer' }} onClick={handleBrowseWeb}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={18} color="var(--accent-indigo)" />
              <span className="card-title">Browse the web</span>
            </div>
            <span className="badge badge-indigo">Playwright</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Navigate websites, research topics, and extract live web pages cleanly.
          </p>
        </div>

        <div className="card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('ACTIONS')}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Folder size={18} color="var(--accent-emerald)" />
              <span className="card-title">Work with files</span>
            </div>
            <span className="badge badge-emerald">Governed</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Inspect workspace directories, read and write code files with audit tracking.
          </p>
        </div>

        <div className="card" style={{ cursor: 'pointer' }} onClick={handleTakeScreenshot}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MousePointer size={18} color="var(--accent-cyan)" />
              <span className="card-title">Control computer</span>
            </div>
            <span className="badge badge-cyan">GUI & Screen</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Take screen captures, inspect windows, or perform semantic UI automation.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
        <button
          className={`btn ${activeTab === 'ACTIONS' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('ACTIONS')}
        >
          Computer Overview
        </button>
        <button
          className={`btn ${activeTab === 'APPS' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('APPS')}
        >
          Applications ({apps.length})
        </button>
        <button
          className={`btn ${activeTab === 'PROCESSES' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('PROCESSES')}
        >
          Running Processes ({processes.length})
        </button>
      </div>

      {/* Tab: Applications */}
      {activeTab === 'APPS' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Discovered Applications</h3>
            <div style={{ width: '240px' }}>
              <input
                type="text"
                placeholder="Search apps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
            {filteredApps.slice(0, 24).map((app, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ flex: 1, paddingRight: '10px', overflow: 'hidden' }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {app.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {app.publisher || 'Installed Application'}
                  </div>
                </div>

                <button
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                  onClick={() => handleLaunchApp(app)}
                >
                  Launch
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Overview / Host Info */}
      {activeTab === 'ACTIONS' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Host System Overview</span>
            <span className="badge badge-secondary">{envStatus?.platform || 'Windows'}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', fontSize: '13px' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Platform: </span>
              <strong>{envStatus?.platform || 'Windows'} (x64)</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Current Host User: </span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>{envStatus?.user || 'Rushi'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Browser Automation: </span>
              <strong style={{ color: 'var(--accent-emerald)' }}>Playwright Engine Active</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>UI Automation: </span>
              <strong style={{ color: 'var(--accent-cyan)' }}>.NET UIAutomationClient Supported</strong>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Processes (Progressive disclosure) */}
      {activeTab === 'PROCESSES' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Monitored System Processes</span>
            <span className="badge badge-indigo">{processes.length} Processes</span>
          </div>

          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>PID</th>
                  <th>Name</th>
                  <th>Memory</th>
                </tr>
              </thead>
              <tbody>
                {processes.slice(0, 15).map((p) => (
                  <tr key={p.pid}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{p.pid}</td>
                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {p.memoryMB ? `${p.memoryMB.toFixed(0)} MB` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
