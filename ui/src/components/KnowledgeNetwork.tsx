import React from 'react';
import { Share2 } from 'lucide-react';

interface KnowledgeNode {
  id: string;
  label?: string;
  name?: string;
  type?: string;
  x?: number;
  y?: number;
}

interface KnowledgeEdge {
  source: string;
  target: string;
  label?: string;
}

interface KnowledgeNetworkProps {
  nodes?: KnowledgeNode[];
  edges?: KnowledgeEdge[];
  height?: number;
  selectedNodeId?: string;
  activeCategory?: string;
  onSelectNode?: (id: string) => void;
}

export const KnowledgeNetwork: React.FC<KnowledgeNetworkProps> = ({
  nodes = [],
  edges = [],
  height = 280,
  activeCategory,
  selectedNodeId,
  onSelectNode,
}) => {
  // If empty, generate a clean placeholder ring of core semantic concepts
  const displayNodes = nodes.length > 0 ? nodes : [
    { id: 'rushikesh', label: 'Rushikesh (Creator)', type: 'CREATOR' },
    { id: 'hrisekesa', label: 'HṚṢĪKEŚA (OS)', type: 'SYSTEM' },
    { id: 'workforce', label: 'Agent Workforce', type: 'AGENT' },
    { id: 'memory', label: 'Sovereign Memory', type: 'MEMORY' },
    { id: 'tools', label: 'Governed Tools', type: 'TOOL' },
    { id: 'mcp', label: 'MCP Protocol', type: 'INTEGRATION' },
  ];

  const width = 800;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.35;

  // Calculate circular layout positions
  const positionedNodes = displayNodes.map((node, i) => {
    const angle = (i / displayNodes.length) * 2 * Math.PI - Math.PI / 2;
    return {
      ...node,
      cx: centerX + radius * Math.cos(angle),
      cy: centerY + radius * Math.sin(angle),
    };
  });

  return (
    <div
      style={{
        width: '100%',
        height: `${height}px`,
        position: 'relative',
        background: 'radial-gradient(ellipse at center, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.8) 100%)',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
      }}
    >
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        {/* Draw interconnecting edges */}
        {positionedNodes.map((n1, i) =>
          positionedNodes.slice(i + 1).map((n2, j) => (
            <line
              key={`${n1.id}-${n2.id}`}
              x1={n1.cx}
              y1={n1.cy}
              x2={n2.cx}
              y2={n2.cy}
              stroke="var(--accent-gold, #f59e0b)"
              strokeOpacity="0.25"
              strokeWidth="1.2"
              strokeDasharray="4,4"
            />
          ))
        )}

        {/* Center Node */}
        <circle cx={centerX} cy={centerY} r={22} fill="rgba(245, 158, 11, 0.15)" stroke="var(--accent-gold, #f59e0b)" strokeWidth={2} />
        <text x={centerX} y={centerY + 4} textAnchor="middle" fill="var(--accent-gold, #f59e0b)" fontSize="10" fontWeight="700">
          CORE
        </text>

        {/* Nodes */}
        {positionedNodes.map((node) => {
          const isSelected = selectedNodeId === node.id;
          return (
            <g
              key={node.id}
              onClick={() => onSelectNode && onSelectNode(node.id)}
              style={{ cursor: 'pointer' }}
            >
              <circle
                cx={node.cx}
                cy={node.cy}
                r={isSelected ? 18 : 14}
                fill={isSelected ? 'var(--accent-gold, #f59e0b)' : 'var(--bg-elevated, #1e293b)'}
                stroke={isSelected ? '#ffffff' : 'var(--accent-gold, #f59e0b)'}
                strokeWidth={isSelected ? 2.5 : 1.5}
              />
              <text
                x={node.cx}
                y={node.cy + 26}
                textAnchor="middle"
                fill={isSelected ? '#ffffff' : 'var(--text-primary, #e2e8f0)'}
                fontSize="11"
                fontWeight={isSelected ? '700' : '500'}
              >
                {node.label || node.name || node.id}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
