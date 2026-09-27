/**
 * FP-13 Target Resolver
 *
 * Resolves user/agent target descriptions into actionable UI elements using strict
 * observation priority: Semantic UIA → Accessibility → DOM → OCR → Vision → Coordinates.
 * Enforces ambiguity detection: never silently selects between ambiguous matches.
 */

import {
  TargetResolutionRequest,
  TargetResolutionResult,
  OperatorActionTarget,
} from '../types/action.types.js';
import { WorkspaceObservation, UIElementNode } from '../types/observation.types.js';
import { LearnedPatternStore } from '../learning/learned.pattern.store.js';
import { ILogger } from '../../core/logging/logger.types.js';

export class TargetResolver {
  constructor(
    private readonly patternStore?: LearnedPatternStore,
    _logger?: ILogger
  ) {}

  public async resolve(
    request: TargetResolutionRequest,
    observation: WorkspaceObservation,
    appName?: string
  ): Promise<TargetResolutionResult> {
    const query = (request.semanticSelector || request.textLabel || request.visualDescription || '').trim().toLowerCase();

    // 0. Check Learned Patterns Store if appName is available
    if (appName && query && this.patternStore) {
      const learned = this.patternStore.findPattern(appName, query);
      if (learned && learned.confidence >= 0.8) {
        // Verify against current UI elements
        const matched = observation.uiTree.find(
          (el) => el.elementId === learned.successfulSelector || el.name.toLowerCase() === learned.successfulSelector.toLowerCase()
        );
        if (matched) {
          return {
            target: this.nodeToTarget(matched, 'LEARNED_PATTERN'),
            confidence: 'HIGH',
            resolutionMethod: 'LEARNED_PATTERN',
            isAmbiguous: false,
            candidateCount: 1,
            evidence: { patternId: learned.patternId, selector: learned.successfulSelector },
          };
        }
      }
    }

    // 1. Semantic Selector exact match
    if (request.semanticSelector) {
      const directMatches = observation.uiTree.filter(
        (node) =>
          node.elementId === request.semanticSelector ||
          node.name.toLowerCase() === request.semanticSelector?.toLowerCase()
      );
      if (directMatches.length === 1) {
        return {
          target: this.nodeToTarget(directMatches[0], 'SEMANTIC_SELECTOR'),
          confidence: 'HIGH',
          resolutionMethod: 'SEMANTIC_SELECTOR',
          isAmbiguous: false,
          candidateCount: 1,
          evidence: { matchedId: directMatches[0].elementId, name: directMatches[0].name },
        };
      } else if (directMatches.length > 1) {
        return {
          target: this.nodeToTarget(directMatches[0], 'SEMANTIC_SELECTOR'),
          confidence: 'AMBIGUOUS',
          resolutionMethod: 'SEMANTIC_SELECTOR',
          isAmbiguous: true,
          candidateCount: directMatches.length,
          evidence: { matchNames: directMatches.map((m) => m.name), reason: 'Multiple elements share identical selector' },
        };
      }
    }

    // 2. Accessibility Tree / Text Label & Role Match
    if (request.textLabel || query) {
      const textMatches = observation.uiTree.filter((node) => {
        const nameMatch = node.name.toLowerCase().includes(query);
        const roleMatch = request.role ? node.role?.toLowerCase() === request.role.toLowerCase() : true;
        return nameMatch && roleMatch;
      });

      if (textMatches.length === 1) {
        return {
          target: this.nodeToTarget(textMatches[0], 'ACCESSIBILITY_PROPERTIES'),
          confidence: 'HIGH',
          resolutionMethod: 'ACCESSIBILITY_PROPERTIES',
          isAmbiguous: false,
          candidateCount: 1,
          evidence: { matchedNode: textMatches[0].name, role: textMatches[0].role },
        };
      } else if (textMatches.length > 1) {
        return {
          target: this.nodeToTarget(textMatches[0], 'ACCESSIBILITY_PROPERTIES'),
          confidence: 'AMBIGUOUS',
          resolutionMethod: 'ACCESSIBILITY_PROPERTIES',
          isAmbiguous: true,
          candidateCount: textMatches.length,
          evidence: { candidateIds: textMatches.map((n) => n.elementId), count: textMatches.length },
        };
      }
    }

    // 3. OCR Text Match fallback
    if (observation.ocrText && query && observation.ocrText.toLowerCase().includes(query)) {
      return {
        target: {
          textLabel: query,
          confidence: 0.75,
        },
        confidence: 'MEDIUM',
        resolutionMethod: 'OCR_TEXT',
        isAmbiguous: false,
        candidateCount: 1,
        evidence: { ocrSnippet: observation.ocrText.slice(0, 100) },
      };
    }

    // 4. Coordinates Fallback (Last resort)
    if (request.coordinates) {
      return {
        target: {
          coordinates: request.coordinates,
          confidence: 0.5,
        },
        confidence: 'LOW',
        resolutionMethod: 'BOUNDED_COORDINATES',
        isAmbiguous: false,
        candidateCount: 1,
        evidence: { coordinates: request.coordinates, warning: 'Coordinate interaction used as fallback' },
      };
    }

    // Not found
    return {
      target: {
        textLabel: query || 'Unknown Target',
        confidence: 0.0,
      },
      confidence: 'LOW',
      resolutionMethod: 'NONE',
      isAmbiguous: false,
      candidateCount: 0,
      evidence: { error: 'Target could not be resolved from active observation layers' },
    };
  }

  private nodeToTarget(node: UIElementNode, method: string): OperatorActionTarget {
    return {
      elementId: node.elementId,
      semanticSelector: node.elementId,
      textLabel: node.name,
      role: node.role,
      coordinates: node.bounds
        ? {
            x: Math.round(node.bounds.x + node.bounds.width / 2),
            y: Math.round(node.bounds.y + node.bounds.height / 2),
          }
        : undefined,
      bounds: node.bounds,
      confidence: method === 'SEMANTIC_SELECTOR' ? 1.0 : method === 'LEARNED_PATTERN' ? 0.95 : 0.85,
    };
  }
}
