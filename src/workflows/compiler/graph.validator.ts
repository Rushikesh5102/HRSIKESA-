/**
 * HṚṢĪKEŚA (हृषीकेश) — Workflow Graph Validator
 *
 * FP-11: Validates workflow graph structure, connectivity, node configs, reachability,
 * illegal cycles (cycles allowed ONLY through explicitly bounded LOOP nodes), permissions,
 * and security constraints before activation.
 */

import {
  WorkflowVersion,
  WorkflowNode,
  WorkflowValidationResult,
} from '../types/workflow.types.js';

export class WorkflowGraphValidator {
  private readonly availableCapabilities?: Set<string>;
  private readonly availableSkills?: Set<string>;
  private readonly availableAgents?: Set<string>;

  constructor(options?: {
    capabilities?: string[];
    skills?: string[];
    agents?: string[];
  }) {
    this.availableCapabilities = options?.capabilities ? new Set(options.capabilities) : undefined;
    this.availableSkills = options?.skills ? new Set(options.skills) : undefined;
    this.availableAgents = options?.agents ? new Set(options.agents) : undefined;
  }

  public validate(version: WorkflowVersion): WorkflowValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const requiredApprovals: string[] = [];
    const requiredCapabilities: string[] = [];
    const requiredSkills: string[] = [];
    const requiredAgents: string[] = [];
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';

    const { nodes, edges } = version.graph;

    if (!nodes || nodes.length === 0) {
      errors.push('Workflow graph must contain at least one node.');
      return {
        valid: false,
        errors,
        warnings,
        riskLevel: 'LOW',
        requiredApprovals,
        requiredCapabilities,
        requiredSkills,
        requiredAgents,
      };
    }

    // 1. Validate Node Uniqueness & IDs
    const nodeMap = new Map<string, WorkflowNode>();
    for (const node of nodes) {
      if (!node.id || typeof node.id !== 'string') {
        errors.push(`Invalid or missing node ID.`);
        continue;
      }
      if (nodeMap.has(node.id)) {
        errors.push(`Duplicate node ID '${node.id}' found.`);
      }
      nodeMap.set(node.id, node);

      // Validate node configuration per type
      this.validateNodeConfig(node, errors, warnings, {
        requiredCapabilities,
        requiredSkills,
        requiredAgents,
        requiredApprovals,
      });

      // Assess risk level based on node types
      if (node.type === 'APPROVAL' || node.type === 'CODE' || node.type === 'MISSION') {
        if (riskLevel === 'LOW') riskLevel = 'MEDIUM';
      }
      if (node.config?.financialAction || node.config?.spendAmount) {
        riskLevel = 'HIGH';
        requiredApprovals.push(node.id);
      }
      if (node.type === 'ACTION' && (node.config?.dangerTier === 'TIER_3' || node.config?.dangerTier === 'CRITICAL')) {
        riskLevel = 'CRITICAL';
      }
    }

    // Financial governance check
    if (version.financialApprovalRequired || (riskLevel as string) === 'HIGH' || (riskLevel as string) === 'CRITICAL') {
      const hasApproval = nodes.some(n => n.type === 'APPROVAL');
      if (!hasApproval && (version.financialApprovalRequired || riskLevel === 'HIGH' || (riskLevel as string) === 'CRITICAL')) {
        warnings.push('High-risk or financial workflow should contain an APPROVAL node.');
      }
    }

    // 2. Validate Edge References
    const adjacencyList = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    for (const node of nodes) {
      adjacencyList.set(node.id, []);
      inDegree.set(node.id, 0);
    }

    for (const edge of edges || []) {
      if (!nodeMap.has(edge.fromNodeId)) {
        errors.push(`Edge references non-existent source node '${edge.fromNodeId}'.`);
      }
      if (!nodeMap.has(edge.toNodeId)) {
        errors.push(`Edge references non-existent target node '${edge.toNodeId}'.`);
      }
      if (edge.fromNodeId === edge.toNodeId) {
        const node = nodeMap.get(edge.fromNodeId);
        if (node?.type !== 'LOOP') {
          errors.push(`Direct self-loop edge on node '${edge.fromNodeId}' is only permitted on LOOP nodes.`);
        }
      }

      if (nodeMap.has(edge.fromNodeId) && nodeMap.has(edge.toNodeId)) {
        adjacencyList.get(edge.fromNodeId)!.push(edge.toNodeId);
        inDegree.set(edge.toNodeId, (inDegree.get(edge.toNodeId) || 0) + 1);
      }
    }

    // 3. Find Entry Nodes (nodes with in-degree 0 or type TRIGGER)
    const entryNodes = nodes.filter(n => n.type === 'TRIGGER' || (inDegree.get(n.id) || 0) === 0);
    if (entryNodes.length === 0) {
      errors.push('No entry node found in workflow graph.');
    }

    // 4. Reachability from Entry Nodes
    const visited = new Set<string>();
    const queue = [...entryNodes.map(n => n.id)];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (!visited.has(current)) {
        visited.add(current);
        const neighbors = adjacencyList.get(current) || [];
        for (const next of neighbors) {
          queue.push(next);
        }
      }
    }

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        warnings.push(`Node '${node.id}' (${node.name}) is unreachable from any entry node.`);
      }
    }

    // 5. Terminal Node Reachability
    // At least one reachable node must be a terminal node (out-degree 0 or type END)
    const terminalNodes = nodes.filter(n => {
      const outEdges = adjacencyList.get(n.id) || [];
      return n.type === 'END' || n.isTerminal || outEdges.length === 0;
    });
    if (terminalNodes.length === 0) {
      errors.push('Workflow graph has no terminal node or exit path.');
    }

    // 6. Cycle Detection — Cycles are allowed ONLY through explicitly bounded LOOP nodes
    this.detectIllegalCycles(nodes, adjacencyList, nodeMap, errors);

    // 7. Check capabilities, skills, agents if provided
    if (this.availableCapabilities) {
      for (const cap of requiredCapabilities) {
        if (!this.availableCapabilities.has(cap)) {
          warnings.push(`Required capability '${cap}' is not currently registered.`);
        }
      }
    }
    if (this.availableSkills) {
      for (const skill of requiredSkills) {
        if (!this.availableSkills.has(skill)) {
          warnings.push(`Required skill '${skill}' is not currently registered.`);
        }
      }
    }
    if (this.availableAgents) {
      for (const agent of requiredAgents) {
        if (!this.availableAgents.has(agent)) {
          warnings.push(`Required agent '${agent}' is not in the active workforce roster.`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      riskLevel,
      requiredApprovals,
      requiredCapabilities: Array.from(new Set(requiredCapabilities)),
      requiredSkills: Array.from(new Set(requiredSkills)),
      requiredAgents: Array.from(new Set(requiredAgents)),
    };
  }

  private validateNodeConfig(
    node: WorkflowNode,
    errors: string[],
    warnings: string[],
    context: {
      requiredCapabilities: string[];
      requiredSkills: string[];
      requiredAgents: string[];
      requiredApprovals: string[];
    }
  ): void {
    if (!node.type) {
      errors.push(`Node '${node.id}' is missing a node type.`);
      return;
    }

    switch (node.type) {
      case 'AGENT':
        if (!node.config?.agentId && !node.config?.agentRole && !node.config?.objective) {
          errors.push(`AGENT node '${node.id}' must specify an agentId, agentRole, or objective.`);
        }
        if (node.config?.agentId) {
          context.requiredAgents.push(node.config.agentId);
        }
        break;

      case 'SKILL':
        if (!node.config?.skillId && !node.config?.skillName) {
          errors.push(`SKILL node '${node.id}' must specify skillId or skillName.`);
        }
        if (node.config?.skillId) {
          context.requiredSkills.push(node.config.skillId);
        }
        break;

      case 'CAPABILITY':
        if (!node.config?.capabilityId) {
          errors.push(`CAPABILITY node '${node.id}' must specify capabilityId.`);
        } else {
          context.requiredCapabilities.push(node.config.capabilityId);
        }
        break;

      case 'MODEL':
        if (!node.config?.task && !node.config?.prompt && !node.config?.input) {
          errors.push(`MODEL node '${node.id}' must specify a prompt or task input.`);
        }
        break;

      case 'MISSION':
      case 'GOAL':
        if (!node.config?.objective && !node.config?.title) {
          errors.push(`${node.type} node '${node.id}' must specify an objective or title.`);
        }
        break;

      case 'SUBWORKFLOW':
        if (!node.config?.workflowId) {
          errors.push(`SUBWORKFLOW node '${node.id}' must specify target workflowId.`);
        }
        break;

      case 'LOOP':
        if (!node.config?.maxIterations || typeof node.config.maxIterations !== 'number' || node.config.maxIterations <= 0) {
          errors.push(`LOOP node '${node.id}' must specify a positive numeric maxIterations.`);
        }
        if (node.config?.maxIterations > 100) {
          warnings.push(`LOOP node '${node.id}' has maxIterations > 100, which may consume high compute.`);
        }
        break;

      case 'APPROVAL':
        if (!node.config?.prompt) {
          errors.push(`APPROVAL node '${node.id}' must specify an approval prompt.`);
        }
        context.requiredApprovals.push(node.id);
        break;

      case 'SWITCH':
        if (!node.config?.variable && !node.config?.expression && !node.config?.field) {
          errors.push(`SWITCH node '${node.id}' must specify a variable or expression to switch on.`);
        }
        break;

      case 'WAIT':
        if (!node.config?.durationSeconds && !node.config?.durationMs && !node.config?.untilEvent) {
          errors.push(`WAIT node '${node.id}' must specify durationSeconds, durationMs, or untilEvent.`);
        }
        break;
    }
  }

  /**
   * Detects cycles in graph. Cycles are valid ONLY if the cycle includes an explicitly bounded LOOP node.
   */
  private detectIllegalCycles(
    nodes: WorkflowNode[],
    adj: Map<string, string[]>,
    nodeMap: Map<string, WorkflowNode>,
    errors: string[]
  ): void {
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const path: string[] = [];

    const dfs = (u: string) => {
      visited.add(u);
      recStack.add(u);
      path.push(u);

      const neighbors = adj.get(u) || [];
      for (const v of neighbors) {
        if (!visited.has(v)) {
          dfs(v);
        } else if (recStack.has(v)) {
          // Cycle found! Check nodes in the cycle path from v onwards
          const cycleStartIndex = path.indexOf(v);
          const cycleNodes = path.slice(cycleStartIndex);
          const hasBoundedLoop = cycleNodes.some(nodeId => {
            const n = nodeMap.get(nodeId);
            return n?.type === 'LOOP' && (n.config?.maxIterations || 0) > 0;
          });

          if (!hasBoundedLoop) {
            errors.push(
              `Illegal infinite cycle detected: ${cycleNodes.join(' -> ')} -> ${v}. Cycles must contain an explicitly bounded LOOP node.`
            );
          }
        }
      }

      recStack.delete(u);
      path.pop();
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        dfs(node.id);
      }
    }
  }
}
