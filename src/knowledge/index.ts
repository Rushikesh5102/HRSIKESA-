/**
 * HṚṢĪKEŚA (हृषीकेश) — Knowledge Graph Subsystem Exports
 *
 * Phase 19: Structured, Temporal, Provenance-Aware Knowledge Graph System
 */

export * from './interfaces/knowledge.types.js';
export * from './repositories/knowledge-entity.repository.js';
export * from './repositories/knowledge-relationship.repository.js';
export * from './repositories/knowledge-fact.repository.js';
export * from './repositories/knowledge-evidence.repository.js';
export * from './repositories/knowledge-claim.repository.js';
export * from './repositories/knowledge-contradiction.repository.js';
export * from './services/entity-resolution.service.js';
export * from './services/knowledge-graph.service.js';
export * from './services/knowledge-validation.service.js';
export * from './services/knowledge-extraction.service.js';
export * from './services/knowledge-context-assembler.js';
export * from './services/knowledge-consolidation.service.js';
export * from './services/knowledge-timeline.service.js';
