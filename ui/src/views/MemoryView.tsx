import React, { useState, useEffect, useCallback } from 'react';
import { Database, Search, Sparkles, ChevronDown, ChevronRight, Bookmark, User, Compass, Lightbulb, CheckSquare } from 'lucide-react';
import { MemoryTierItem, MemoryIndexStatus, SemanticSearchResult } from '../types/api.types';
import { KnowledgeNetwork } from '../components/KnowledgeNetwork';
import { IndianFrame } from '../components/IndianFrame';

interface MemoryViewProps {
  memoryItems: MemoryTierItem[];
}

type MemoryCategory = 'ALL' | 'ABOUT_YOU' | 'PREFERENCES' | 'PROJECTS' | 'DECISIONS' | 'LEARNED';

const BASE_URL = '';

export const MemoryView: React.FC<MemoryViewProps> = ({ memoryItems }) => {
  const [category, setCategory] = useState<MemoryCategory>('ALL');
  const [search, setSearch] = useState('');
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});
  const [indexStatus, setIndexStatus] = useState<MemoryIndexStatus | null>(null);
  const [searchResults, setSearchResults] = useState<SemanticSearchResult[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BASE_URL}/memory/index/status`);
        if (res.ok) {
          const data = (await res.json()) as MemoryIndexStatus;
          setIndexStatus(data);
        } else {
          setIndexStatus({ available: false } as MemoryIndexStatus);
        }
      } catch {
        setIndexStatus({ available: false } as MemoryIndexStatus);
      }
    })();
  }, []);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults(null);
      return;
    }
    setSearchLoading(true);
    try {
      const url = `${BASE_URL}/memory/search?q=${encodeURIComponent(q)}&mode=hybrid&topK=10`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { results: SemanticSearchResult[] };
      setSearchResults(data.results || []);
    } catch {
      setSearchResults(null);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      runSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, runSearch]);

  const toggleDetails = (id: string) => {
    setExpandedDetails((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getCategoryForTier = (tier: number): MemoryCategory => {
    if (tier === 1 || tier === 2) return 'ABOUT_YOU';
    if (tier === 3 || tier === 4) return 'PREFERENCES';
    if (tier === 6 || tier === 13) return 'PROJECTS';
    if (tier === 8) return 'DECISIONS';
    return 'LEARNED';
  };

  const getCategoryLabel = (tier: number) => {
    switch (getCategoryForTier(tier)) {
      case 'ABOUT_YOU':
        return 'About You';
      case 'PREFERENCES':
        return 'Your Preferences';
      case 'PROJECTS':
        return 'Your Projects';
      case 'DECISIONS':
        return 'Important Decisions';
      case 'LEARNED':
      default:
        return 'Learned Wisdom';
    }
  };

  const filteredItems = memoryItems.filter((item) => {
    const matchesCategory = category === 'ALL' || getCategoryForTier(item.tier) === category;
    const matchesSearch =
      !search.trim() ||
      item.content.toLowerCase().includes(search.toLowerCase()) ||
      (item.key && item.key.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const renderMemoryContent = (content: string) => {
    try {
      const trimmed = content.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === 'object' && parsed !== null) {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              {Object.entries(parsed).map(([k, v]) => {
                const displayKey = k.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
                let valNode: React.ReactNode = '';
                if (Array.isArray(v)) {
                  valNode = (
                    <ul style={{ margin: '4px 0 0 16px', padding: 0, listStyle: 'disc' }}>
                      {v.map((arrItem, i) => (
                        <li key={i} style={{ marginBottom: '2px', color: 'var(--text-secondary)' }}>
                          {typeof arrItem === 'object' ? JSON.stringify(arrItem) : String(arrItem)}
                        </li>
                      ))}
                    </ul>
                  );
                } else if (typeof v === 'object' && v !== null) {
                  valNode = (
                    <div style={{ paddingLeft: '8px', borderLeft: '2px solid var(--border-subtle)', margin: '4px 0' }}>
                      {Object.entries(v).map(([subK, subV]) => (
                        <div key={subK} style={{ fontSize: '12.5px', marginBottom: '2px' }}>
                          <strong style={{ color: 'var(--text-gold)', fontWeight: 600 }}>{subK}: </strong>
                          <span style={{ color: 'var(--text-secondary)' }}>{String(subV)}</span>
                        </div>
                      ))}
                    </div>
                  );
                } else {
                  valNode = <span style={{ color: 'var(--text-secondary)' }}>{String(v)}</span>;
                }

                return (
                  <div key={k} style={{ fontSize: '13px', lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', marginRight: '6px' }}>
                      {displayKey}:
                    </span>
                    {valNode}
                  </div>
                );
              })}
            </div>
          );
        }
      }
    } catch {
      // fallback
    }
    return <div style={{ fontSize: '14px', lineHeight: 1.5, color: 'var(--text-primary)' }}>{content}</div>;
  };

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              Memory & Wisdom Matrix
            </h1>
            <span style={{ fontSize: '12px', color: 'var(--text-gold)', fontFamily: 'var(--font-devanagari)', fontWeight: 600 }}>
              स्मृति
            </span>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            What HṚṢĪKEŚA remembers about you, your preferences, decisions, and long-term project knowledge.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-gold">{memoryItems.length} Memories Synced</span>
          {indexStatus?.available && <span className="badge badge-online">Vector Search Ready</span>}
        </div>
      </div>

      {/* 2D Knowledge Network Constellation */}
      <IndianFrame style={{ padding: '12px' }}>
        <KnowledgeNetwork activeCategory={category.toLowerCase()} height={180} />
      </IndianFrame>

      {/* Search Bar */}
      <IndianFrame variant="stone" style={{ padding: '12px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search through remembered facts, decisions, and preferences..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '14.5px',
              color: 'var(--text-primary)',
            }}
          />
          {searchLoading && <span className="badge badge-running">Searching...</span>}
        </div>
      </IndianFrame>

      {/* Category Pills */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {[
          { id: 'ALL', label: 'All Knowledge' },
          { id: 'ABOUT_YOU', label: 'About You' },
          { id: 'PREFERENCES', label: 'Preferences' },
          { id: 'PROJECTS', label: 'Projects' },
          { id: 'DECISIONS', label: 'Decisions' },
          { id: 'LEARNED', label: 'Learned Wisdom' },
        ].map((c) => (
          <button
            key={c.id}
            className={`btn ${category === c.id ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '13px', padding: '6px 16px', borderRadius: '20px' }}
            onClick={() => setCategory(c.id as MemoryCategory)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Memory Cards */}
      {filteredItems.length === 0 ? (
        <IndianFrame style={{ padding: '40px', textAlign: 'center' }}>
          <Database size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px auto' }} />
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
            No memory entries found
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            As you chat and work with HṚṢĪKEŚA, important context is automatically crystallized here.
          </div>
        </IndianFrame>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredItems.map((item) => (
            <IndianFrame key={item.id} style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span className="badge badge-gold">{getCategoryLabel(item.tier)}</span>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      Tier {item.tier} • {item.key || 'Contextual Fact'}
                    </span>
                  </div>

                  {renderMemoryContent(item.content)}
                </div>

                <button
                  onClick={() => toggleDetails(item.id || `${item.tier}-${item.key}`)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                  title="Technical details"
                >
                  {expandedDetails[item.id || `${item.tier}-${item.key}`] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              </div>

              {expandedDetails[item.id || `${item.tier}-${item.key}`] && (
                <div
                  style={{
                    marginTop: '12px',
                    paddingTop: '10px',
                    borderTop: '1px solid var(--border-subtle)',
                    fontSize: '11.5px',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <div>Key: {item.key}</div>
                  <div>Tier: {item.tier} ({item.tierName})</div>
                  <div>Updated: {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : 'System Active'}</div>
                  <div>Source: Autonomous Session Memory Engine</div>
                </div>
              )}
            </IndianFrame>
          ))}
        </div>
      )}
    </div>
  );
};
