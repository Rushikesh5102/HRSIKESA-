/**
 * HṚṢĪKEŚA (हृषीकेश) — Computer Target Resolver
 *
 * Phase 22: Resolves high-level UI target descriptions to concrete, bounded UI elements
 * with multi-stage resolution, confidence ratings, and ambiguity handling.
 */

import { ILogger } from '../../../core/logging/logger.types.js';
import { IUiaAdapter, UIElementSearchCriteria } from '../../../tools/computer/uia/interfaces/uia.types.js';
import {
  TargetDescription,
  ResolvedTarget,
  ResolutionMethod,
  DesktopObservation,
  ControlObservation,
} from '../interfaces/operator.types.js';
import { ComputerOperatorRepository } from '../repositories/computer-operator.repository.js';

export class ComputerTargetResolver {
  private readonly uiaAdapter?: IUiaAdapter;
  private readonly repo?: ComputerOperatorRepository;
  private readonly logger?: ILogger;

  constructor(uiaAdapter?: IUiaAdapter, repo?: ComputerOperatorRepository, logger?: ILogger) {
    this.uiaAdapter = uiaAdapter;
    this.repo = repo;
    this.logger = logger?.child('ComputerTargetResolver');
  }

  /**
   * Resolves a target description against the current desktop observation.
   */
  public async resolveTarget(target: TargetDescription | ResolvedTarget, observation: DesktopObservation): Promise<ResolvedTarget> {
    // If target is already resolved, return it
    if ('targetId' in target && 'confidence' in target && 'bounds' in target) {
      return target;
    }

    const desc = target as TargetDescription;

    if (desc.coordinates) {
      return {
        targetId: `coords_${desc.coordinates.x}_${desc.coordinates.y}`,
        name: `Coordinates (${desc.coordinates.x}, ${desc.coordinates.y})`,
        controlType: 'CoordinateTarget',
        bounds: { x: desc.coordinates.x, y: desc.coordinates.y, width: 1, height: 1 },
        confidence: 0.35,
        method: 'COORDINATES',
        evidence: `Direct coordinate targeting (${desc.coordinates.x}, ${desc.coordinates.y})`,
        timestamp: new Date().toISOString()
      };
    }

    const query = (desc.query || '').trim();
    const queryNorm = query.toLowerCase();
    const appName = observation.activeWindow?.processName || 'unknown';

    this.logger?.info(`Resolving target: '${query}' (ExpectedType: ${desc.expectedControlType || 'any'})`);

    // 0. Check Learned UI Patterns in SQLite
    if (this.repo && appName) {
      const learned = this.repo.findPattern(appName, query);
      if (learned && learned.confidence >= 0.8) {
        // Try matching with learned automationId or accessible name
        const match = this.findInControls(observation.activeWindow?.controls || [], (c) => {
          if (learned.automationId && c.automationId === learned.automationId) return true;
          if (learned.accessibleName && c.name === learned.accessibleName) return true;
          return false;
        });

        if (match) {
          this.logger?.info(`Resolved target '${query}' via learned UI pattern (Confidence: ${learned.confidence})`);
          return this.buildResolvedTarget(match, 'AUTOMATION_ID', Math.min(0.99, learned.confidence), `Learned pattern for ${appName}`, observation.activeWindow?.hwnd);
        }
      }
    }

    const controls = observation.activeWindow?.controls || [];

    // 1. Stage 1: Exact Automation ID Match
    if (desc.automationId) {
      const match = this.findInControls(controls, (c) => c.automationId === desc.automationId);
      if (match) {
        return this.buildResolvedTarget(match, 'AUTOMATION_ID', 0.99, `Exact automationId match: ${desc.automationId}`, observation.activeWindow?.hwnd);
      }
    }

    // 2. Stage 2: Exact Name & Control Type Match (UIA Semantic)
    const exactMatches = this.findAllInControls(controls, (c) => {
      const nameMatch = c.name.toLowerCase() === queryNorm || (c.value && c.value.toLowerCase() === queryNorm);
      if (desc.expectedControlType) {
        return Boolean(nameMatch && c.controlType.toLowerCase().includes(desc.expectedControlType.toLowerCase()));
      }
      return Boolean(nameMatch);
    });

    if (exactMatches.length === 1) {
      return this.buildResolvedTarget(exactMatches[0], 'UIA_SEMANTIC', 0.95, `Exact semantic accessible name match: '${exactMatches[0].name}'`, observation.activeWindow?.hwnd);
    } else if (exactMatches.length > 1) {
      // Ambiguity handling
      const selected = desc.index !== undefined ? exactMatches[desc.index] || exactMatches[0] : exactMatches[0];
      return {
        ...this.buildResolvedTarget(selected, 'UIA_SEMANTIC', 0.85, `Disambiguated from ${exactMatches.length} matching controls.`, observation.activeWindow?.hwnd),
        isAmbiguous: true,
        alternativeMatches: exactMatches.length,
      };
    }

    // 3. Stage 3: Substring / Normalized Text Match
    const partialMatches = this.findAllInControls(controls, (c) => {
      const nameContains = c.name.toLowerCase().includes(queryNorm);
      const valContains = c.value?.toLowerCase().includes(queryNorm);
      return Boolean(nameContains || valContains);
    });

    if (partialMatches.length === 1) {
      return this.buildResolvedTarget(partialMatches[0], 'NORMALIZED_TEXT', 0.88, `Normalized text match: '${partialMatches[0].name}' contains '${query}'`, observation.activeWindow?.hwnd);
    } else if (partialMatches.length > 1) {
      const selected = desc.index !== undefined ? partialMatches[desc.index] || partialMatches[0] : partialMatches[0];
      return {
        ...this.buildResolvedTarget(selected, 'NORMALIZED_TEXT', 0.75, `Partial match disambiguated from ${partialMatches.length} candidates.`, observation.activeWindow?.hwnd),
        isAmbiguous: true,
        alternativeMatches: partialMatches.length,
      };
    }

    // 4. Stage 4: Live UIA Direct Search Fallback (if adapter present)
    if (this.uiaAdapter) {
      try {
        const criteria: UIElementSearchCriteria = {
          name: query,
          controlType: desc.expectedControlType,
        };
        const el = await this.uiaAdapter.findElement(criteria);
        if (el && el.bounds) {
          return {
            targetId: el.id,
            name: el.name,
            controlType: el.controlType,
            method: 'UIA_SEMANTIC',
            confidence: 0.90,
            bounds: el.bounds,
            windowHandle: observation.activeWindow?.hwnd,
            evidence: `Live UIA query resolved element: ${el.name} (${el.controlType})`,
            timestamp: new Date().toISOString(),
          };
        }
      } catch (err: any) {
        this.logger?.debug(`Live UIA query error: ${err.message}`);
      }
    }

    // 5. Stage 5: Relative Structure / Position Hint
    if (desc.positionHint === 'first' && controls.length > 0) {
      return this.buildResolvedTarget(controls[0], 'RELATIVE_STRUCTURE', 0.65, `Position hint 'first' selected first control`, observation.activeWindow?.hwnd);
    }

    // 6. Stage 6: Bounded Center Coordinate Fallback
    const winBounds = observation.activeWindow?.bounds || {
      x: 100,
      y: 100,
      width: observation.screenMetrics.width - 200,
      height: observation.screenMetrics.height - 200,
    };

    this.logger?.warn(`Target '${query}' could not be matched semantically. Falling back to active window center.`);
    return {
      targetId: 'coord_fallback_' + Date.now(),
      name: query,
      controlType: 'CoordinateRegion',
      method: 'COORDINATES',
      confidence: 0.35, // Low confidence coordinate guess
      bounds: {
        x: winBounds.x + winBounds.width / 2,
        y: winBounds.y + winBounds.height / 2,
        width: 10,
        height: 10,
      },
      windowHandle: observation.activeWindow?.hwnd,
      evidence: `Coordinate fallback to active window center: (${winBounds.x + winBounds.width / 2}, ${winBounds.y + winBounds.height / 2})`,
      timestamp: new Date().toISOString(),
    };
  }

  private buildResolvedTarget(c: ControlObservation, method: ResolutionMethod, confidence: number, evidence: string, hwnd?: number | string): ResolvedTarget {
    const bounds = c.bounds || { x: 0, y: 0, width: 0, height: 0 };
    return {
      targetId: c.id,
      name: c.name,
      controlType: c.controlType,
      method,
      confidence,
      bounds,
      windowHandle: hwnd,
      evidence,
      timestamp: new Date().toISOString(),
    };
  }

  private findInControls(controls: readonly ControlObservation[], predicate: (c: ControlObservation) => boolean): ControlObservation | null {
    for (const c of controls) {
      if (predicate(c)) return c;
      if (c.children && c.children.length > 0) {
        const found = this.findInControls(c.children, predicate);
        if (found) return found;
      }
    }
    return null;
  }

  private findAllInControls(controls: readonly ControlObservation[], predicate: (c: ControlObservation) => boolean): ControlObservation[] {
    const results: ControlObservation[] = [];
    for (const c of controls) {
      if (predicate(c)) results.push(c);
      if (c.children && c.children.length > 0) {
        results.push(...this.findAllInControls(c.children, predicate));
      }
    }
    return results;
  }
}
