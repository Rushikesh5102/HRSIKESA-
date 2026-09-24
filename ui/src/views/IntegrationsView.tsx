import React, { useState, useEffect, useCallback } from 'react';
import {
  Key,
  Cpu,
  Zap,
  Sparkles,
  Compass,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink,
  Shield,
  Layers,
  FolderGit2,
  MessageSquare,
  Share2,
  Database,
  Webhook,
  Lock,
  Plus,
  Server,
  Globe,
  Check
} from 'lucide-react';
import { api } from '../services/api';
import { IndianFrame } from '../components/IndianFrame';

interface AIProviderItem {
  id: string;
  name: string;
  category: string;
  description: string;
  status: string;
  isConfigured: boolean;
  modelsCount: number;
  icon: string;
}

interface AppServiceItem {
  id: string;
  name: string;
  category: string;
  description: string;
  status: string;
  capabilities: string[];
}

export const IntegrationsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ai' | 'apps'>('ai');
  const [aiProviders, setAiProviders] = useState<AIProviderItem[]>([]);
  const [appServices, setAppServices] = useState<AppServiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [keysInput, setKeysInput] = useState<Record<string, string>>({});
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [savingKey, setSavingKey] = useState<Record<string, boolean>>({});
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const loadIntegrations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getIntegrations();
      if (res && res.success) {
        setAiProviders(res.aiProviders || []);
        setAppServices(res.appServices || []);
      }
    } catch (err) {
      console.error('Failed to load integrations', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);

  const handleSaveKey = async (providerId: string) => {
    const key = keysInput[providerId] || '';
    setSavingKey((prev) => ({ ...prev, [providerId]: true }));
    try {
      const res = await api.saveApiKey(providerId, key);
      if (res && res.success) {
        setNotification({ msg: res.message || 'API key updated successfully!', type: 'success' });
        loadIntegrations();
      } else {
        setNotification({ msg: 'Failed to update API key', type: 'error' });
      }
    } catch (err) {
      setNotification({ msg: String(err), type: 'error' });
    } finally {
      setSavingKey((prev) => ({ ...prev, [providerId]: false }));
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleSaveAppService = async (serviceId: string) => {
    const token = keysInput[serviceId] || '';
    setSavingKey((prev) => ({ ...prev, [serviceId]: true }));
    try {
      const res = await api.saveAppService(serviceId, token);
      if (res && res.success) {
        setNotification({ msg: res.message || 'App service updated successfully!', type: 'success' });
        loadIntegrations();
      }
    } catch (err) {
      setNotification({ msg: String(err), type: 'error' });
    } finally {
      setSavingKey((prev) => ({ ...prev, [serviceId]: false }));
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const getProviderIcon = (id: string) => {
    switch (id) {
      case 'ollama': return <Cpu size={22} color="#06b6d4" />;
      case 'openai': return <Zap size={22} color="#10b981" />;
      case 'anthropic': return <Sparkles size={22} color="#d4af37" />;
      case 'gemini': return <Compass size={22} color="#38bdf8" />;
      case 'groq': return <Zap size={22} color="#f59e0b" />;
      case 'deepseek': return <Cpu size={22} color="#8b5cf6" />;
      default: return <Key size={22} color="var(--text-gold)" />;
    }
  };

  const getAppIcon = (id: string) => {
    switch (id) {
      case 'github': return <FolderGit2 size={22} color="#f8fafc" />;
      case 'slack': return <MessageSquare size={22} color="#e11d48" />;
      case 'discord': return <MessageSquare size={22} color="#818cf8" />;
      case 'google_workspace': return <Globe size={22} color="#38bdf8" />;
      case 'notion': return <Layers size={22} color="#d4af37" />;
      case 'postgres': return <Database size={22} color="#06b6d4" />;
      default: return <Webhook size={22} color="var(--text-gold)" />;
    }
  };

  return (
    <div style={{ maxWidth: '1020px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* View Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              Plugins & Integrations Hub
            </h1>
            <span style={{ fontSize: '12px', color: 'var(--text-gold)', fontFamily: 'var(--font-devanagari)', fontWeight: 600 }}>
              संयोजन
            </span>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Connect external AI API keys, developer repositories, cloud databases, and team messaging channels to empower all 17 agents.
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-elevated)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <button
            className={`btn ${activeTab === 'ai' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '13px', padding: '6px 14px' }}
            onClick={() => setActiveTab('ai')}
          >
            <Key size={14} />
            AI Providers & Keys
          </button>
          <button
            className={`btn ${activeTab === 'apps' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '13px', padding: '6px 14px' }}
            onClick={() => setActiveTab('apps')}
          >
            <Globe size={14} />
            Apps & External Services
          </button>
        </div>
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

      {/* 1. AI PROVIDERS TAB */}
      {activeTab === 'ai' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <IndianFrame
            title="Sovereign AI Provider Fleet"
            subtitle="Configure commercial and open-weights API keys with instant multi-agent routing"
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '16px' }}>
              {aiProviders.map((p) => {
                const isHealthy = p.status === 'healthy';
                const isVisible = !!visibleKeys[p.id];
                const isSaving = !!savingKey[p.id];

                return (
                  <div
                    key={p.id}
                    style={{
                      background: 'var(--bg-elevated)',
                      border: `1px solid ${isHealthy ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)'}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '14px',
                      boxShadow: isHealthy ? '0 0 14px rgba(16, 185, 129, 0.08)' : 'none',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '8px',
                              background: 'var(--bg-card)',
                              border: '1px solid var(--border-color)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {getProviderIcon(p.id)}
                          </div>
                          <div>
                            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {p.name}
                            </h3>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                              {p.category.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        <span className={`badge ${isHealthy ? 'badge-online' : 'badge-gold'}`}>
                          {isHealthy ? 'Active' : 'Unconfigured'}
                        </span>
                      </div>

                      <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {p.description}
                      </p>
                    </div>

                    {p.id !== 'ollama' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          API Key Token
                        </label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <div style={{ position: 'relative', flex: 1 }}>
                            <input
                              type={isVisible ? 'text' : 'password'}
                              placeholder={isHealthy ? '••••••••••••••••••••' : 'sk-... or API Token'}
                              value={keysInput[p.id] || ''}
                              onChange={(e) => setKeysInput({ ...keysInput, [p.id]: e.target.value })}
                              style={{
                                width: '100%',
                                padding: '7px 32px 7px 10px',
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                fontSize: '12px',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                fontFamily: isVisible ? 'monospace' : 'inherit',
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => setVisibleKeys({ ...visibleKeys, [p.id]: !isVisible })}
                              style={{
                                position: 'absolute',
                                right: '8px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                              }}
                            >
                              {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>

                          <button
                            className="btn btn-primary"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => handleSaveKey(p.id)}
                            disabled={isSaving}
                          >
                            {isSaving ? <RefreshCw size={13} className="spin" /> : <Check size={13} />}
                            <span>Save</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          background: 'rgba(6, 182, 212, 0.08)',
                          border: '1px solid rgba(6, 182, 212, 0.25)',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          fontSize: '11.5px',
                          color: '#38bdf8',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <CheckCircle2 size={14} />
                        <span>Connected locally at 127.0.0.1:11434 (0 cloud cost)</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </IndianFrame>
        </div>
      )}

      {/* 2. APP & SERVICE INTEGRATIONS TAB */}
      {activeTab === 'apps' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <IndianFrame
            title="Developer, Database & Service Ecosystem"
            subtitle="Grant your autonomous agents sovereign access to cloud repositories, databases, and communication bots"
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '16px' }}>
              {appServices.map((app) => {
                const isConnected = app.status === 'connected';
                const isSaving = !!savingKey[app.id];

                return (
                  <div
                    key={app.id}
                    style={{
                      background: 'var(--bg-elevated)',
                      border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)'}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '14px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '8px',
                              background: 'var(--bg-card)',
                              border: '1px solid var(--border-color)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {getAppIcon(app.id)}
                          </div>
                          <div>
                            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {app.name}
                            </h3>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                              {app.category}
                            </span>
                          </div>
                        </div>

                        <span className={`badge ${isConnected ? 'badge-online' : 'badge-gold'}`}>
                          {isConnected ? 'Connected' : 'Setup'}
                        </span>
                      </div>

                      <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '10px' }}>
                        {app.description}
                      </p>

                      {/* Governed Capabilities */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {app.capabilities.map((cap) => (
                          <span
                            key={cap}
                            style={{
                              fontSize: '10.5px',
                              background: 'var(--bg-card)',
                              border: '1px solid var(--border-color)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              color: 'var(--text-gold)',
                              fontFamily: 'monospace',
                            }}
                          >
                            {cap}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Access Token / Connection URI
                      </label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          type="password"
                          placeholder={isConnected ? '••••••••••••••••••••' : 'Token or Connection String'}
                          value={keysInput[app.id] || ''}
                          onChange={(e) => setKeysInput({ ...keysInput, [app.id]: e.target.value })}
                          style={{
                            flex: 1,
                            padding: '7px 10px',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            fontSize: '12px',
                            color: 'var(--text-primary)',
                            outline: 'none',
                          }}
                        />
                        <button
                          className="btn btn-primary"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => handleSaveAppService(app.id)}
                          disabled={isSaving}
                        >
                          {isSaving ? <RefreshCw size={13} className="spin" /> : <Check size={13} />}
                          <span>Connect</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </IndianFrame>
        </div>
      )}
    </div>
  );
};
