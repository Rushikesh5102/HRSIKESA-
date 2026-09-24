/**
 * HṚṢĪKEŚA — Anime.js UI Animation & Flow Orchestrator
 * Provides smooth, production-grade micro-animations, staggered card entrances,
 * tactile feedback, animated counters, and view transitions.
 */

import { animate, createTimeline, stagger } from 'animejs';

export class AnimationService {
  /**
   * Smoothly animates view entry on tab navigation
   */
  static animateViewEnter(element: HTMLElement | null, onComplete?: () => void) {
    if (!element) return;

    try {
      (animate as any)(element, {
        opacity: [0, 1],
        translateY: [18, 0],
        scale: [0.985, 1],
        duration: 450,
        ease: 'out(3)',
        onComplete,
      });
    } catch {
      // Graceful fallback
    }
  }

  /**
   * Cascading stagger animation for a list of child elements (cards, table rows, agent nodes)
   */
  static animateStagger(parentOrElements: HTMLElement | HTMLElement[] | string, delayOffset: number = 40) {
    if (!parentOrElements) return;

    try {
      (animate as any)(parentOrElements, {
        opacity: [0, 1],
        translateY: [24, 0],
        scale: [0.96, 1],
        delay: stagger(delayOffset),
        duration: 500,
        ease: 'out(3)',
      });
    } catch {
      // Graceful fallback
    }
  }

  /**
   * Smooth numeric count-up animation for stats, metrics, and KPI scorecards
   */
  static animateCountUp(
    element: HTMLElement | null,
    targetValue: number,
    durationMs: number = 900,
    prefix: string = '',
    suffix: string = ''
  ) {
    if (!element) return;

    const counterObj = { value: 0 };
    try {
      (animate as any)(counterObj, {
        value: targetValue,
        duration: durationMs,
        ease: 'out(2)',
        onUpdate: () => {
          if (element) {
            const formatted = Math.round(counterObj.value).toLocaleString();
            element.textContent = `${prefix}${formatted}${suffix}`;
          }
        },
      });
    } catch {
      element.textContent = `${prefix}${targetValue}${suffix}`;
    }
  }

  /**
   * Interactive tactile click/press spring animation on buttons
   */
  static animateButtonClick(element: HTMLElement | null) {
    if (!element) return;

    try {
      (animate as any)(element, {
        scale: [1, 0.94, 1.02, 1],
        duration: 350,
        ease: 'out(4)',
      });
    } catch {
      // Graceful fallback
    }
  }

  /**
   * Subtle rhythmic pulse animation for alerts, security approval badges, and online beacons
   */
  static animatePulse(element: HTMLElement | null, iterations: number = 3) {
    if (!element) return;

    try {
      (animate as any)(element, {
        scale: [1, 1.08, 1],
        opacity: [1, 0.85, 1],
        duration: 700,
        alternate: true,
        loop: iterations * 2,
        ease: 'inOut(2)',
      });
    } catch {
      // Graceful fallback
    }
  }

  /**
   * Smooth entrance animation for modal popups and overlays
   */
  static animateModalEnter(modalElement: HTMLElement | null, backdropElement?: HTMLElement | null) {
    if (backdropElement) {
      try {
        (animate as any)(backdropElement, {
          opacity: [0, 1],
          duration: 250,
          ease: 'out(2)',
        });
      } catch {}
    }

    if (modalElement) {
      try {
        (animate as any)(modalElement, {
          opacity: [0, 1],
          scale: [0.92, 1],
          translateY: [20, 0],
          duration: 380,
          ease: 'out(3)',
        });
      } catch {}
    }
  }

  /**
   * Smooth upward slide and fade-in for new incoming chat messages
   */
  static animateMessageIn(element: HTMLElement | null) {
    if (!element) return;

    try {
      (animate as any)(element, {
        opacity: [0, 1],
        translateY: [16, 0],
        scale: [0.97, 1],
        duration: 360,
        ease: 'out(3)',
      });
    } catch {
      // Graceful fallback
    }
  }
}
