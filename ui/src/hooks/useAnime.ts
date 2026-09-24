/**
 * HṚṢĪKEŚA — React Hooks for Anime.js UI Animations
 */

import { useEffect, useRef } from 'react';
import { AnimationService } from '../services/animation.service';

/**
 * Hook to automatically animate view entrance when navigating between tabs
 */
export function useViewTransition(dependency: any) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      AnimationService.animateViewEnter(containerRef.current);
    }
  }, [dependency]);

  return containerRef;
}

/**
 * Hook to smoothly stagger child elements (e.g. cards, list items)
 */
export function useStaggerAnimation(selector: string, dependencies: any[] = [], delayOffset: number = 40) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const elements = containerRef.current.querySelectorAll(selector);
      if (elements && elements.length > 0) {
        AnimationService.animateStagger(elements as any, delayOffset);
      }
    }
  }, dependencies);

  return containerRef;
}

/**
 * Hook to animate numeric values (stats, KPI scorecards)
 */
export function useCountUp(targetValue: number, prefix: string = '', suffix: string = '') {
  const textRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (textRef.current && typeof targetValue === 'number') {
      AnimationService.animateCountUp(textRef.current, targetValue, 800, prefix, suffix);
    }
  }, [targetValue, prefix, suffix]);

  return textRef;
}
