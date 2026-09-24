# HṚṢĪKEŚA Knowledge Graph Architecture

## 1. Overview
The HṚṢĪKEŚA Knowledge Graph represents entities and their typed, directional relationships. Designed for local execution on Windows without external daemon dependencies, it employs SQLite relational tables indexed for BFS and recursive graph traversals.

## 2. Graph Schema
- `knowledge_entities`: Canonical entity nodes with types (`PERSON`, `ORGANIZATION`, `COMPANY`, `PROJECT`, `AGENT`, `PROVIDER`, `TOOL`, etc.), scopes, and lifecycle status.
- `knowledge_entity_aliases`: Pre-indexed alternative names, abbreviations, and Vedic transliteration variants.
- `knowledge_relationships`: Directed, typed edges (`OWNS`, `CREATED`, `USES`, `DEPENDS_ON`, `PRODUCES`, `ASSIGNED_TO`, etc.) with temporal bounds (`validFrom`, `validUntil`), confidence scores, and scopes.

## 3. Traversal Capabilities
`KnowledgeGraphService` provides:
- **1-Hop Neighbor Lookup**: Immediate neighbors filtered by relationship type, confidence threshold, and scope.
- **Bounded N-Hop Traversal**: BFS expansion strictly capped at depth 5 (default 2) and maximum 150 nodes to protect laptop resources.
- **Cycle Protection**: In-memory `Set<string>` visited tracking guarantees termination on cyclical graphs.
- **Path Finding**: BFS shortest-path detection between any source and target entities.
- **Subgraph Extraction**: Compact JSON graph structures (`nodes`, `edges`, `depthReached`) formatted for both REST APIs and 3D visualization.

## 4. 3D Visualization
`ui/src/components/3d/KnowledgeNetwork3D.tsx` renders real persistent graph nodes using Three.js:
- Visual clustering around the central system node (`HṚṢĪKEŚA`).
- Type-based color coding (e.g., Gold for Creator, Cyan for System, Indigo for Agent, Emerald for Goal).
- Interactive raycasting: clicking any node selects it in the entity inspector and expands its immediate neighbors.
