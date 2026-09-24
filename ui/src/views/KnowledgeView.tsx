import React, { useState, useEffect, useCallback } from 'react';
import {
  Share2,
  Search,
  Sparkles,
  AlertTriangle,
  Clock,
  Layers,
  Link as LinkIcon,
  ShieldCheck,
  RefreshCw,
  Plus,
  ExternalLink,
  ChevronRight,
  Database,
  Tag,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import {
  KnowledgeEntityInfo,
  KnowledgeRelationshipInfo,
  KnowledgeFactInfo,
  KnowledgeContradictionInfo,
  KnowledgeTimelineItem,
  KnowledgeGraphData,
  KnowledgeSearchResult,
} from '../types/api.types';
import { api } from '../services/api';
import { KnowledgeNetwork } from '../components/KnowledgeNetwork';
import { IndianFrame } from '../components/IndianFrame';

export const KnowledgeView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'graph' | 'entities' | 'facts' | 'contradictions' | 'timeline'>('graph');
  const [entities, setEntities] = useState<KnowledgeEntityInfo[]>([]);
  const [facts, setFacts] = useState<KnowledgeFactInfo[]>([]);
  const [relationships, setRelationships] = useState<KnowledgeRelationshipInfo[]>([]);
  const [contradictions, setContradictions] = useState<KnowledgeContradictionInfo[]>([]);
  const [timeline, setTimeline] = useState<KnowledgeTimelineItem[]>([]);
  const [graphData, setGraphData] = useState<KnowledgeGraphData>({ nodes: [], edges: [] });
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<KnowledgeEntityInfo | null>(null);
  const [selectedEntityFacts, setSelectedEntityFacts] = useState<KnowledgeFactInfo[]>([]);
  const [selectedEntityRelationships, setSelectedEntityRelationships] = useState<KnowledgeRelationshipInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KnowledgeSearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [consolidating, setConsolidating] = useState(false);
  const [consolidationResult, setConsolidationResult] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');

  // Load core knowledge state
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [entitiesRes, factsRes, relsRes, contraRes] = await Promise.all([
        api.getKnowledgeEntities({ limit: 100 }).catch(() => null),
        api.getKnowledgeFacts({ limit: 100 }).catch(() => null),
        api.getKnowledgeRelationships({ limit: 100 }).catch(() => null),
        api.getKnowledgeContradictions().catch(() => null),
      ]);

      if (entitiesRes?.entities) {
        setEntities(entitiesRes.entities);
        const firstId = entitiesRes.entities[0]?.id;
        if (firstId) {
          const [timelineRes, graphRes] = await Promise.all([
            api.getKnowledgeTimeline({ entityId: firstId, limit: 50 }).catch(() => null),
            api.getKnowledgeGraph({ entityId: firstId, depth: 2, limit: 100 }).catch(() => null),
          ]);
          if (timelineRes?.timeline) setTimeline(timelineRes.timeline);
          if (graphRes?.graph) setGraphData(graphRes.graph);
        }
      }
      if (factsRes?.facts) setFacts(factsRes.facts);
      if (relsRes?.relationships) setRelationships(relsRes.relationships);
      if (contraRes?.contradictions) setContradictions(contraRes.contradictions);
    } catch (err) {
      console.error('Failed to load knowledge data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Subscribe to real-time knowledge events
  useEffect(() => {
    const unsubscribe = api.subscribeEvents((event) => {
      if (
        event?.type?.startsWith('entity.') ||
        event?.type?.startsWith('relationship.') ||
        event?.type?.startsWith('fact.') ||
        event?.type?.startsWith('contradiction.') ||
        event?.type?.startsWith('knowledge.')
      ) {
        loadData();
      }
    });
    return () => unsubscribe();
  }, [loadData]);

  // Select entity and fetch associated details
  const handleSelectEntity = async (id: string) => {
    setSelectedEntityId(id);
    try {
      const [entityRes, factsRes, relsRes] = await Promise.all([
        api.getKnowledgeEntity(id),
        api.getEntityFacts(id),
        api.getEntityRelationships(id),
      ]);
      if (entityRes?.entity) setSelectedEntity(entityRes.entity);
      if (factsRes?.facts) setSelectedEntityFacts(factsRes.facts);
      if (relsRes?.relationships) setSelectedEntityRelationships(relsRes.relationships);
    } catch (err) {
      console.error('Failed to fetch entity details', err);
    }
  };

  // Run knowledge search
  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults(null);
      return;
    }
    try {
      const res = await api.searchKnowledge({ q: q.trim(), limit: 20 });
      if (res?.searchResult) {
        setSearchResults(res.searchResult);
      }
    } catch (err) {
      console.error('Search failed', err);
    }
  };

  // Trigger consolidation
  const handleConsolidate = async () => {
    try {
      setConsolidating(true);
      setConsolidationResult(null);
      const res = await api.consolidateKnowledge();
      if (res?.success) {
        setConsolidationResult('Consolidation completed successfully.');
        await loadData();
      }
    } catch (err: any) {
      setConsolidationResult(`Consolidation failed: ${err.message || 'Unknown error'}`);
    } finally {
      setConsolidating(false);
    }
  };

  const entityTypes = Array.from(new Set(entities.map((e) => e.type).filter(Boolean)));

  const filteredEntities = entities.filter((e) => {
    const matchesFilter = filterType === 'ALL' || e.type === filterType;
    const matchesSearch =
      !searchQuery ||
      e.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.canonicalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.aliases.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  // Dynamically group categories by entityType
  const typeCounts = entities.reduce((acc: Record<string, number>, e) => {
    const t = (e as any).entityType || e.type || 'GENERAL';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  const palette = ['#00E5FF', '#38BDF8', '#F59E0B', '#10B981', '#A855F7', '#E11D48', '#D4AF37', '#64748B'];
  const categoriesList = Object.keys(typeCounts).length > 0
    ? Object.entries(typeCounts).map(([name, count], i) => ({
        name,
        count,
        color: palette[i % palette.length],
      }))
    : [
        { name: 'Concepts', count: 0, color: '#00E5FF' },
        { name: 'Capabilities', count: 0, color: '#38BDF8' },
        { name: 'Entities', count: 0, color: '#F59E0B' },
      ];

  // Dynamic live nodes and edges constructed from backend entities
  const liveNodes = entities.map((e, idx) => {
    const angle = (idx / Math.max(entities.length, 1)) * 2 * Math.PI;
    const radius = 125;
    return {
      id: e.id,
      label: e.displayName || e.canonicalName,
      type: (e as any).entityType || e.type || 'CONCEPT',
      x: Math.round(230 + Math.cos(angle) * radius),
      y: Math.round(180 + Math.sin(angle) * (radius * 0.72)),
    };
  });

  const liveEdges = relationships.map((r) => ({
    source: r.sourceEntityId,
    target: r.targetEntityId,
    label: (r as any).relationshipType || (r as any).type || 'REQUIRES',
  }));

  return (
    <div className="view-container knowledge-view" style={{ maxWidth: '1240px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header (Panel 7) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--accent-saffron), var(--accent-gold))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F0D0A', fontWeight: 800, fontSize: '18px' }}>
            🕸️
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-cinzel)' }}>
                Knowledge & Memory
              </h1>
              <span style={{ fontSize: '18px', color: 'var(--accent-gold-bright)', fontFamily: 'var(--font-devanagari)', fontWeight: 700 }}>
                ज्ञान एवं स्मृति
              </span>
            </div>
            <p style={{ margin: '2px 0 0', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
              Vedic knowledge graph with provenance tracking, entity resolution, and temporal reasoning.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleConsolidate}
            disabled={consolidating}
            className="btn btn-primary"
            style={{ fontSize: '12px', padding: '7px 16px' }}
          >
            <RefreshCw size={14} className={consolidating ? 'spin' : ''} />
            {consolidating ? 'Consolidating...' : 'Consolidate Graph'}
          </button>
        </div>
      </div>

      {/* 4 Metric Cards from Live Knowledge Store */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div style={{ background: 'var(--bg-card)', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            <Layers size={15} color="#00E5FF" />
            <span>KNOWLEDGE NODES</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#00E5FF', fontFamily: 'var(--font-cinzel)', marginTop: '6px' }}>
            {entities.length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Indexed entities in graph</div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            <FileText size={15} color="#38BDF8" />
            <span>VERIFIED FACTS</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#38BDF8', fontFamily: 'var(--font-cinzel)', marginTop: '6px' }}>
            {facts.length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Subject-predicate triples</div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            <Tag size={15} color="#D4AF37" />
            <span>RELATIONSHIPS</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--accent-gold-bright)', fontFamily: 'var(--font-cinzel)', marginTop: '6px' }}>
            {relationships.length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Semantic provenance edges</div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            <Sparkles size={15} color="#10B981" />
            <span>GRAPH STATUS</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#10B981', fontFamily: 'var(--font-cinzel)', marginTop: '8px' }}>
            {entities.length > 0 ? 'SYNCHRONIZED' : 'INITIALIZING'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{contradictions.length} contradictions detected</div>
        </div>
      </div>

      {/* Search Input (Panel 7) */}
      <div style={{ position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-gold)' }} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search Knowledge..."
          style={{
            width: '100%',
            padding: '11px 18px 11px 44px',
            borderRadius: '24px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            fontSize: '13.5px',
            outline: 'none',
            boxShadow: 'var(--shadow-sm)',
          }}
        />
      </div>

      {/* Main Grid: Interactive Constellation Graph on Left + Knowledge Categories on Right (Panel 7) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '20px' }}>
        {/* Left: Constellation Network with Lotus Center */}
        <div
          style={{
            background: 'radial-gradient(ellipse at center, #191008 0%, #0D0803 100%)',
            border: '1.5px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-card)',
            position: 'relative',
          }}
        >
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-gold)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              Topological Graph Network
            </span>
            <span style={{ fontSize: '11px', color: '#00E5FF' }}>● {entities.length} Nodes Indexed</span>
          </div>

          <KnowledgeNetwork
            height={380}
            nodes={graphData.nodes.length > 0 ? graphData.nodes : liveNodes}
            edges={graphData.edges.length > 0 ? graphData.edges.map(e => ({ source: e.source, target: e.target, label: (e as any).label || (e as any).type })) : liveEdges}
            selectedNodeId={selectedEntityId || undefined}
            onSelectNode={(id) => handleSelectEntity(id)}
          />
        </div>

        {/* Right: Knowledge Categories Breakdown (Panel 7) */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1.5px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-cinzel)' }}>
              Knowledge Categories
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Classified ontologies & nodes</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {categoriesList.map((cat) => (
              <div
                key={cat.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 14px',
                  borderRadius: '6px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cat.color, boxShadow: `0 0 8px ${cat.color}` }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {cat.name}
                  </span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: 800, color: cat.color, fontFamily: 'var(--font-cinzel)' }}>
                  {cat.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <Search size={18} style={{ position: 'absolute', left: '14px', top: '12px', color: 'var(--text-muted)' }} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search entities, canonical aliases, facts, or questions (e.g., 'Rushikesh', 'SAHIKARA', 'Ollama')..."
          style={{
            width: '100%',
            padding: '10px 14px 10px 42px',
            borderRadius: '6px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            fontSize: '14px',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
        {[
          { id: 'graph', label: 'Entities & Subgraph', icon: <Share2 size={15} /> },
          { id: 'facts', label: `Facts (${facts.length})`, icon: <FileText size={15} /> },
          { id: 'contradictions', label: `Contradictions (${contradictions.length})`, icon: <AlertTriangle size={15} /> },
          { id: 'timeline', label: 'Timeline', icon: <Clock size={15} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent-gold)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--accent-gold)' : 'var(--text-muted)',
              fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}

      {/* 1. Entities & Subgraph */}
      {activeTab === 'graph' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedEntity ? '1fr 1fr' : '1fr', gap: '20px' }}>
          {/* Entity List */}
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setFilterType('ALL')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  border: '1px solid var(--border-subtle)',
                  background: filterType === 'ALL' ? 'var(--accent-gold)' : 'var(--bg-secondary)',
                  color: filterType === 'ALL' ? '#000' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                ALL ({entities.length})
              </button>
              {entityTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    border: '1px solid var(--border-subtle)',
                    background: filterType === type ? 'var(--accent-gold)' : 'var(--bg-secondary)',
                    color: filterType === type ? '#000' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {type} ({entities.filter((e) => e.type === type).length})
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredEntities.map((entity) => {
                const isSelected = selectedEntityId === entity.id;
                return (
                  <div
                    key={entity.id}
                    onClick={() => handleSelectEntity(entity.id)}
                    style={{
                      padding: '14px',
                      borderRadius: '6px',
                      background: isSelected ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-secondary)',
                      border: isSelected ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>
                          {entity.displayName}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          canonical: <span style={{ color: 'var(--accent-gold)' }}>{entity.canonicalName}</span>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: 'rgba(245, 158, 11, 0.15)',
                          color: 'var(--accent-gold)',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                        }}
                      >
                        {entity.type}
                      </span>
                    </div>

                    {entity.description && (
                      <p style={{ margin: '8px 0 4px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {entity.description}
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Aliases:</span>
                      {entity.aliases.map((alias) => (
                        <span
                          key={alias}
                          style={{
                            fontSize: '10px',
                            background: 'var(--bg-primary)',
                            padding: '1px 6px',
                            borderRadius: '3px',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          {alias}
                        </span>
                      ))}
                      <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)' }}>
                        Scope: {entity.scope}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Entity Details Panel */}
          {selectedEntity && (
            <div
              style={{
                background: 'var(--bg-secondary)',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                padding: '20px',
                position: 'sticky',
                top: '20px',
                maxHeight: 'calc(100vh - 180px)',
                overflowY: 'auto',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {selectedEntity.displayName}
                  </h2>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Type: <strong style={{ color: 'var(--accent-gold)' }}>{selectedEntity.type}</strong> | Scope: {selectedEntity.scope}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedEntity(null);
                    setSelectedEntityId(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '16px',
                  }}
                >
                  ✕
                </button>
              </div>

              {selectedEntity.description && (
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
                  {selectedEntity.description}
                </div>
              )}

              {/* Entity Facts */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-gold)', marginBottom: '8px', textTransform: 'uppercase' }}>
                  Known Facts ({selectedEntityFacts.length})
                </div>
                {selectedEntityFacts.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No explicit facts recorded for this entity.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedEntityFacts.map((fact) => (
                      <div
                        key={fact.id}
                        style={{
                          padding: '10px',
                          background: 'var(--bg-primary)',
                          borderRadius: '4px',
                          border: '1px solid var(--border-subtle)',
                          fontSize: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, color: '#38bdf8' }}>{fact.predicate}</span>
                          <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 600 }}>
                            Confidence: {(fact.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div style={{ color: 'var(--text-primary)', marginTop: '4px' }}>
                          {fact.objectValue || `→ Entity [${fact.objectEntityId}]`}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '10px', color: 'var(--text-muted)' }}>
                          <span>Status: {fact.status}</span>
                          <span>Version: {fact.version}</span>
                          <span>Scope: {fact.scope}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Entity Relationships */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-gold)', marginBottom: '8px', textTransform: 'uppercase' }}>
                  Connected Relationships ({selectedEntityRelationships.length})
                </div>
                {selectedEntityRelationships.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No direct relationships recorded.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedEntityRelationships.map((rel) => {
                      const isSource = rel.sourceEntityId === selectedEntity.id;
                      const otherEntityId = isSource ? rel.targetEntityId : rel.sourceEntityId;
                      const otherEntity = entities.find((e) => e.id === otherEntityId);
                      return (
                        <div
                          key={rel.id}
                          style={{
                            padding: '10px',
                            background: 'var(--bg-primary)',
                            borderRadius: '4px',
                            border: '1px solid var(--border-subtle)',
                            fontSize: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>{rel.relationshipType}</span>
                            <span style={{ color: 'var(--text-muted)' }}>{isSource ? '→' : '←'}</span>
                            <span
                              style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline' }}
                              onClick={() => handleSelectEntity(otherEntityId)}
                            >
                              {otherEntity?.displayName || otherEntityId}
                            </span>
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Confidence: {(rel.confidence * 100).toFixed(0)}% • Scope: {rel.scope}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Facts View */}
      {activeTab === 'facts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {facts.map((fact) => {
            const subject = entities.find((e) => e.id === fact.subjectEntityId);
            const objectEntity = fact.objectEntityId ? entities.find((e) => e.id === fact.objectEntityId) : null;
            return (
              <div
                key={fact.id}
                style={{
                  padding: '14px',
                  borderRadius: '6px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, color: 'var(--accent-gold)' }}>
                      {subject?.displayName || fact.subjectEntityId}
                    </span>
                    <span
                      style={{
                        padding: '1px 6px',
                        background: 'rgba(56, 189, 248, 0.15)',
                        color: '#38bdf8',
                        borderRadius: '3px',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      {fact.predicate}
                    </span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {fact.objectValue || objectEntity?.displayName || fact.objectEntityId}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: fact.status === 'CONFIRMED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: fact.status === 'CONFIRMED' ? '#10b981' : 'var(--accent-gold)',
                      fontWeight: 600,
                    }}
                  >
                    {fact.status}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '14px', marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <span>Confidence: {(fact.confidence * 100).toFixed(0)}%</span>
                  <span>Scope: {fact.scope}</span>
                  <span>Version: {fact.version}</span>
                  <span>Observed: {new Date(fact.observedAt).toLocaleString()}</span>
                  {fact.validUntil && <span style={{ color: '#ef4444' }}>Valid Until: {fact.validUntil}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Contradictions View */}
      {activeTab === 'contradictions' && (
        <div>
          {contradictions.length === 0 ? (
            <div
              style={{
                padding: '30px',
                textAlign: 'center',
                background: 'var(--bg-secondary)',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 10px auto' }} />
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>No Open Contradictions</h3>
              <p style={{ margin: '6px 0 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                All facts and knowledge claims are coherent and reconciled across temporal scopes.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {contradictions.map((contra) => {
                const subject = entities.find((e) => e.id === contra.subjectEntityId);
                return (
                  <div
                    key={contra.id}
                    style={{
                      padding: '16px',
                      borderRadius: '6px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={18} color="#ef4444" />
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          Subject: {subject?.displayName || contra.subjectEntityId}
                        </span>
                        <span style={{ color: '#ef4444', fontWeight: 600 }}>[{contra.predicate}]</span>
                      </div>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: contra.status === 'DETECTED' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                          color: contra.status === 'DETECTED' ? '#ef4444' : '#10b981',
                          fontWeight: 600,
                        }}
                      >
                        {contra.status}
                      </span>
                    </div>

                    <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {contra.explanation}
                    </div>

                    <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <span>Detected: {new Date(contra.detectedAt).toLocaleString()}</span>
                      {contra.resolutionStrategy && <span>Strategy: {contra.resolutionStrategy}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. Timeline View */}
      {activeTab === 'timeline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {timeline.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                gap: '14px',
                padding: '12px 16px',
                background: 'var(--bg-secondary)',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                alignItems: 'center',
              }}
            >
              <div style={{ minWidth: '140px', fontSize: '11px', color: 'var(--text-muted)' }}>
                {new Date(item.timestamp).toLocaleString()}
              </div>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: '3px',
                  background:
                    item.type === 'FACT'
                      ? 'rgba(56, 189, 248, 0.15)'
                      : item.type === 'CONTRADICTION'
                      ? 'rgba(239, 68, 68, 0.15)'
                      : 'rgba(245, 158, 11, 0.15)',
                  color: item.type === 'FACT' ? '#38bdf8' : item.type === 'CONTRADICTION' ? '#ef4444' : 'var(--accent-gold)',
                }}
              >
                {item.type}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{item.description}</div>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Scope: {item.scope}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
