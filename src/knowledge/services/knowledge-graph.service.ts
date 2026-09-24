/**
 * HṚṢĪKEŚA (हृषीकेश) — Knowledge Graph Service
 *
 * Phase 19: Bounded Graph Traversal, Subgraph Extraction, Path Finding & Cycle Defense
 */

import { KnowledgeEntityRepository } from '../repositories/knowledge-entity.repository.js';
import { KnowledgeRelationshipRepository } from '../repositories/knowledge-relationship.repository.js';
import { KnowledgeFactRepository } from '../repositories/knowledge-fact.repository.js';
import { KnowledgeEvidenceRepository } from '../repositories/knowledge-evidence.repository.js';
import {
  KnowledgeEntity,
  KnowledgeRelationship,
  KnowledgeFact,
  KnowledgeEvidence,
  GraphNode,
  GraphEdge,
  SubgraphResult,
  PathResult,
  TraversalOptions,
} from '../interfaces/knowledge.types.js';

export class KnowledgeGraphService {
  private readonly entityRepo: KnowledgeEntityRepository;
  private readonly relRepo: KnowledgeRelationshipRepository;
  private readonly factRepo: KnowledgeFactRepository;
  private readonly evidenceRepo: KnowledgeEvidenceRepository;

  constructor(
    entityRepo: KnowledgeEntityRepository,
    relRepo: KnowledgeRelationshipRepository,
    factRepo: KnowledgeFactRepository,
    evidenceRepo: KnowledgeEvidenceRepository
  ) {
    this.entityRepo = entityRepo;
    this.relRepo = relRepo;
    this.factRepo = factRepo;
    this.evidenceRepo = evidenceRepo;
  }

  public getEntity(id: string): KnowledgeEntity | null {
    return this.entityRepo.getEntity(id);
  }

  public getFactsForEntity(entityId: string, activeOnly = true): KnowledgeFact[] {
    return this.factRepo.findFacts({ subjectEntityId: entityId, activeOnly });
  }

  public getEvidenceForFact(factId: string): KnowledgeEvidence[] {
    return this.evidenceRepo.findEvidenceForFact(factId);
  }

  /**
   * Retrieves 1-hop or bounded neighbors for a given entity.
   */
  public findNeighbors(entityId: string, options?: TraversalOptions): Array<KnowledgeEntity & { node: KnowledgeEntity }> {
    const rawDepth = options?.maxDepth ?? 1;
    const maxDepth = Math.max(1, Math.min(rawDepth, 5));
    const limit = options?.limit ?? 50;

    const visited = new Set<string>([entityId]);
    let currentFrontier = [entityId];
    const collected: KnowledgeEntity[] = [];

    let depth = 0;
    while (currentFrontier.length > 0 && depth < maxDepth && collected.length < limit) {
      depth++;
      const nextFrontier: string[] = [];

      for (const currId of currentFrontier) {
        const rels = this.relRepo.findRelationships({
          entityId: currId,
          relationshipType: options?.allowedRelationshipTypes ? options.allowedRelationshipTypes[0] : undefined,
          activeOnly: !options?.includeHistorical,
          scope: options?.scope,
        });

        for (const rel of rels) {
          if (options?.minConfidence && rel.confidence < options.minConfidence) continue;
          if (options?.allowedRelationshipTypes && !options.allowedRelationshipTypes.includes(rel.relationshipType)) continue;

          const neighborId = rel.sourceEntityId === currId ? rel.targetEntityId : rel.sourceEntityId;
          if (!visited.has(neighborId)) {
            visited.add(neighborId);
            const ent = this.entityRepo.getEntity(neighborId);
            if (ent && (options?.includeHistorical || (ent.status !== 'SUPERSEDED' && ent.status !== 'EXPIRED' && ent.status !== 'REJECTED'))) {
              collected.push(ent);
              nextFrontier.push(neighborId);
              if (collected.length >= limit) break;
            }
          }
        }
        if (collected.length >= limit) break;
      }
      currentFrontier = nextFrontier;
    }

    return collected.map((ent) => {
      const copy = { ...ent } as any;
      copy.node = ent;
      return copy;
    });
  }

  /**
   * Alias / helper for finding a subgraph. If no center entity is provided, uses the first entity in the graph.
   */
  public getSubgraph(centerEntityId?: string, options?: TraversalOptions): SubgraphResult {
    let targetCenter = centerEntityId;
    if (!targetCenter) {
      const firstEntities = this.entityRepo.listEntities({ limit: 1 });
      if (firstEntities.length > 0) {
        targetCenter = firstEntities[0].id;
      } else {
        return { nodes: [], edges: [], centerEntityId: '', depthReached: 0 };
      }
    }
    return this.findSubgraph(targetCenter, options);
  }

  /**
   * Extracts a bounded subgraph centered around an entity.
   * Guaranteed bounded: maxDepth capped at 5 (default 2), maxNodes capped at 150.
   * Cycle-protected via visited Set.
   */
  public findSubgraph(centerEntityId: string, options?: TraversalOptions): SubgraphResult {
    const rawDepth = options?.maxDepth ?? 2;
    const maxDepth = Math.max(1, Math.min(rawDepth, 5)); // Bound between 1 and 5 hops
    const maxNodes = 150;

    const visitedNodes = new Set<string>();
    const nodeMap = new Map<string, GraphNode>();
    const edgeMap = new Map<string, GraphEdge>();

    const centerEntity = this.entityRepo.getEntity(centerEntityId);
    if (!centerEntity) {
      return { nodes: [], edges: [], centerEntityId, depthReached: 0 };
    }

    nodeMap.set(centerEntity.id, this.toGraphNode(centerEntity));
    visitedNodes.add(centerEntity.id);

    let currentFrontier = [centerEntity.id];
    let depth = 0;

    while (currentFrontier.length > 0 && depth < maxDepth && nodeMap.size < maxNodes) {
      const nextFrontier: string[] = [];
      depth++;

      for (const currentId of currentFrontier) {
        const rels = this.relRepo.findRelationships({
          entityId: currentId,
          activeOnly: !options?.includeHistorical,
          scope: options?.scope,
        });

        for (const rel of rels) {
          if (options?.minConfidence && rel.confidence < options.minConfidence) continue;
          if (options?.allowedRelationshipTypes && !options.allowedRelationshipTypes.includes(rel.relationshipType)) continue;

          // Add edge
          if (!edgeMap.has(rel.id)) {
            edgeMap.set(rel.id, {
              id: rel.id,
              source: rel.sourceEntityId,
              target: rel.targetEntityId,
              type: rel.relationshipType,
              direction: rel.direction,
              confidence: rel.confidence,
            });
          }

          const otherId = rel.sourceEntityId === currentId ? rel.targetEntityId : rel.sourceEntityId;

          if (!visitedNodes.has(otherId) && nodeMap.size < maxNodes) {
            visitedNodes.add(otherId);
            const otherEntity = this.entityRepo.getEntity(otherId);
            if (otherEntity) {
              nodeMap.set(otherEntity.id, this.toGraphNode(otherEntity));
              nextFrontier.push(otherId);
            }
          }
        }
      }

      currentFrontier = nextFrontier;
    }

    return {
      nodes: Array.from(nodeMap.values()),
      edges: Array.from(edgeMap.values()),
      centerEntityId,
      depthReached: depth,
    };
  }

  /**
   * Finds the shortest directed or undirected path between two entities using BFS.
   */
  public findPath(startEntityId: string, endEntityId: string, maxDepth = 4): PathResult {
    if (startEntityId === endEntityId) {
      const ent = this.entityRepo.getEntity(startEntityId);
      if (!ent) return { found: false, nodes: [], edges: [], length: 0 };
      return { found: true, nodes: [this.toGraphNode(ent)], edges: [], length: 0 };
    }

    const bound = Math.min(Math.max(1, maxDepth), 6);
    const queue: Array<{ currentId: string; pathNodes: string[]; pathEdges: KnowledgeRelationship[] }> = [
      { currentId: startEntityId, pathNodes: [startEntityId], pathEdges: [] },
    ];
    const visited = new Set<string>([startEntityId]);

    while (queue.length > 0) {
      const { currentId, pathNodes, pathEdges } = queue.shift()!;

      if (pathNodes.length - 1 >= bound) {
        continue;
      }

      const rels = this.relRepo.findRelationships({ entityId: currentId, activeOnly: true });

      for (const rel of rels) {
        const nextId = rel.sourceEntityId === currentId ? rel.targetEntityId : rel.sourceEntityId;

        if (nextId === endEntityId) {
          const allNodeIds = [...pathNodes, nextId];
          const allEdges = [...pathEdges, rel];
          const nodes: GraphNode[] = [];
          for (const nid of allNodeIds) {
            const e = this.entityRepo.getEntity(nid);
            if (e) nodes.push(this.toGraphNode(e));
          }

          return {
            found: true,
            nodes,
            edges: allEdges.map((e) => ({
              id: e.id,
              source: e.sourceEntityId,
              target: e.targetEntityId,
              type: e.relationshipType,
              direction: e.direction,
              confidence: e.confidence,
            })),
            length: allEdges.length,
          };
        }

        if (!visited.has(nextId)) {
          visited.add(nextId);
          queue.push({
            currentId: nextId,
            pathNodes: [...pathNodes, nextId],
            pathEdges: [...pathEdges, rel],
          });
        }
      }
    }

    return { found: false, nodes: [], edges: [], length: 0 };
  }

  /**
   * Retrieves an overview graph for 3D visualization or system overview.
   */
  public getGraphOverview(limit = 100): SubgraphResult {
    const entities = this.entityRepo.listEntities({ limit, status: 'ACTIVE' });
    const entityIds = new Set(entities.map((e) => e.id));

    const nodes: GraphNode[] = entities.map((e) => this.toGraphNode(e));
    const edges: GraphEdge[] = [];

    const allRels = this.relRepo.findRelationships({ activeOnly: true, limit: limit * 2 });
    for (const rel of allRels) {
      if (entityIds.has(rel.sourceEntityId) && entityIds.has(rel.targetEntityId)) {
        edges.push({
          id: rel.id,
          source: rel.sourceEntityId,
          target: rel.targetEntityId,
          type: rel.relationshipType,
          direction: rel.direction,
          confidence: rel.confidence,
        });
      }
    }

    return {
      nodes,
      edges,
      depthReached: 1,
    };
  }

  /**
   * Synchronizes core system entities, creator authority, workforce agents, and companies/projects into the knowledge graph.
   */
  public syncSystemGraph(data: {
    creatorName: string;
    systemName: string;
    agents?: Array<{ id: string; name: string; role: string }>;
    companies?: Array<{ id: string; name: string; domain?: string }>;
    projects?: Array<{ id: string; name: string; companyId?: string }>;
  }): { entitiesCreated: number; relationshipsCreated: number } {
    let entitiesCreated = 0;
    let relationshipsCreated = 0;

    // 1. Creator Entity
    let creator = this.entityRepo.findByCanonicalName(data.creatorName);
    if (!creator) {
      creator = this.entityRepo.createEntity({
        canonicalName: data.creatorName,
        displayName: data.creatorName,
        entityType: 'PERSON',
        scope: 'CREATOR',
        description: 'Sole creator, master, and root sovereign authority',
      });
      entitiesCreated++;
    }

    // 2. System Entity
    let system = this.entityRepo.findByCanonicalName(data.systemName);
    if (!system) {
      system = this.entityRepo.createEntity({
        canonicalName: data.systemName,
        displayName: data.systemName,
        entityType: 'SOFTWARE',
        scope: 'GLOBAL',
        description: 'Sovereign Autonomous Personal AI Operating System',
      });
      entitiesCreated++;
    }

    // Creator -> CREATED -> System
    const existingRel = this.relRepo.findRelationships({
      sourceEntityId: creator.id,
      targetEntityId: system.id,
      relationshipType: 'CREATED',
    });
    if (existingRel.length === 0) {
      this.relRepo.createRelationship({
        sourceEntityId: creator.id,
        relationshipType: 'CREATED',
        targetEntityId: system.id,
        scope: 'GLOBAL',
        confidence: 1.0,
      });
      relationshipsCreated++;
    }

    // 3. Workforce Agents
    if (data.agents) {
      for (const ag of data.agents) {
        let agentEnt = this.entityRepo.findByCanonicalName(ag.name);
        if (!agentEnt) {
          agentEnt = this.entityRepo.createEntity({
            canonicalName: ag.name,
            displayName: ag.name,
            entityType: 'AGENT',
            scope: 'GLOBAL',
            description: `${ag.name} - ${ag.role}`,
          });
          entitiesCreated++;
        }

        const agRel = this.relRepo.findRelationships({
          sourceEntityId: system.id,
          targetEntityId: agentEnt.id,
          relationshipType: 'MANAGES',
        });
        if (agRel.length === 0) {
          this.relRepo.createRelationship({
            sourceEntityId: system.id,
            relationshipType: 'MANAGES',
            targetEntityId: agentEnt.id,
            scope: 'GLOBAL',
            confidence: 1.0,
          });
          relationshipsCreated++;
        }
      }
    }

    // 4. Companies & Projects
    if (data.companies) {
      for (const comp of data.companies) {
        let compEnt = this.entityRepo.findByCanonicalName(comp.name);
        if (!compEnt) {
          compEnt = this.entityRepo.createEntity({
            canonicalName: comp.name,
            displayName: comp.name,
            entityType: 'COMPANY',
            scope: 'COMPANY',
            description: comp.domain || 'Registered Company OS entity',
          });
          entitiesCreated++;
        }

        const compRel = this.relRepo.findRelationships({
          sourceEntityId: creator.id,
          targetEntityId: compEnt.id,
          relationshipType: 'OWNS',
        });
        if (compRel.length === 0) {
          this.relRepo.createRelationship({
            sourceEntityId: creator.id,
            relationshipType: 'OWNS',
            targetEntityId: compEnt.id,
            scope: 'COMPANY',
            confidence: 1.0,
          });
          relationshipsCreated++;
        }
      }
    }

    if (data.projects) {
      for (const proj of data.projects) {
        let projEnt = this.entityRepo.findByCanonicalName(proj.name);
        if (!projEnt) {
          projEnt = this.entityRepo.createEntity({
            canonicalName: proj.name,
            displayName: proj.name,
            entityType: 'PROJECT',
            scope: 'PROJECT',
          });
          entitiesCreated++;
        }

        if (proj.companyId) {
          const compEnt = this.entityRepo.getEntity(proj.companyId);
          if (compEnt) {
            const hasProjRel = this.relRepo.findRelationships({
              sourceEntityId: compEnt.id,
              targetEntityId: projEnt.id,
              relationshipType: 'PART_OF',
            });
            if (hasProjRel.length === 0) {
              this.relRepo.createRelationship({
                sourceEntityId: projEnt.id,
                relationshipType: 'PART_OF',
                targetEntityId: compEnt.id,
                scope: 'PROJECT',
                confidence: 1.0,
              });
              relationshipsCreated++;
            }
          }
        }
      }
    }

    return { entitiesCreated, relationshipsCreated };
  }

  private toGraphNode(entity: KnowledgeEntity): GraphNode {
    return {
      id: entity.id,
      label: entity.displayName || entity.canonicalName,
      type: entity.entityType,
      scope: entity.scope,
      description: entity.description,
      status: entity.status,
    };
  }
}
