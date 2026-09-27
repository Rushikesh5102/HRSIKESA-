/**
 * HṚṢĪKEŚA (हृषीकेश) — Workflow Compiler
 *
 * FP-11: Compiles validated workflow definitions into high-performance,
 * deterministic execution representations with topological sorting, condition branch indexing,
 * and dependency tracking.
 */

import {
  WorkflowVersion,
  WorkflowNode,
  CompiledWorkflow,
  WorkflowValidationResult,
} from '../types/workflow.types.js';
import { WorkflowGraphValidator } from './graph.validator.js';

export class WorkflowCompiler {
  private readonly validator: WorkflowGraphValidator;

  constructor(validator?: WorkflowGraphValidator) {
    this.validator = validator || new WorkflowGraphValidator();
  }

  public compile(version: WorkflowVersion): CompiledWorkflow {
    const validation: WorkflowValidationResult = this.validator.validate(version);
    if (!validation.valid) {
      throw new Error(`Workflow validation failed: ${validation.errors.join('; ')}`);
    }

    const { nodes, edges } = version.graph;
    const nodeMap = new Map<string, WorkflowNode>();
    const adjacencyList = new Map<string, Array<{ toNodeId: string; condition?: string; isDefault?: boolean }>>();
    const reverseAdjacencyList = new Map<string, string[]>();

    for (const node of nodes) {
      nodeMap.set(node.id, node);
      adjacencyList.set(node.id, []);
      reverseAdjacencyList.set(node.id, []);
    }

    for (const edge of edges || []) {
      if (adjacencyList.has(edge.fromNodeId) && adjacencyList.has(edge.toNodeId)) {
        adjacencyList.get(edge.fromNodeId)!.push({
          toNodeId: edge.toNodeId,
          condition: edge.condition,
          isDefault: edge.isDefault,
        });
        reverseAdjacencyList.get(edge.toNodeId)!.push(edge.fromNodeId);
      }
    }

    // Determine Entry Nodes:
    // Nodes of type 'TRIGGER', or nodes with 0 incoming edges
    const entryNodeIds = nodes
      .filter(n => n.type === 'TRIGGER' || (reverseAdjacencyList.get(n.id)?.length || 0) === 0)
      .map(n => n.id);

    // Determine Terminal Nodes:
    // Nodes of type 'END', or nodes with isTerminal = true, or nodes with 0 outgoing edges
    const terminalNodeIds = nodes
      .filter(n => n.type === 'END' || n.isTerminal || (adjacencyList.get(n.id)?.length || 0) === 0)
      .map(n => n.id);

    return {
      version,
      adjacencyList,
      reverseAdjacencyList,
      nodeMap,
      entryNodeIds,
      terminalNodeIds,
      validation,
    };
  }
}
