/**
 * HṚṢĪKEŚA (हृषीकेश) — Semantic UI Security & Validation Guardrails
 */

import { UIElement, UIElementFilterOptions, UIElementSearchCriteria } from '../interfaces/uia.types.js';

export class UiaSecurityValidator {
  public static readonly MAX_TREE_DEPTH = 5;
  public static readonly MAX_ELEMENTS_COUNT = 150;
  public static readonly MAX_TEXT_LENGTH = 500;

  /**
   * Sanitizes and bounds filter options to prevent unbounded tree explosions in LLM context.
   */
  public static normalizeFilterOptions(options?: UIElementFilterOptions): Required<UIElementFilterOptions> {
    const rawDepth = options?.maxDepth ?? 3;
    const maxDepth = Math.max(1, Math.min(rawDepth, this.MAX_TREE_DEPTH));

    const rawElements = options?.maxElements ?? 60;
    const maxElements = Math.max(1, Math.min(rawElements, this.MAX_ELEMENTS_COUNT));

    const rawTextLen = options?.maxTextLength ?? 120;
    const maxTextLength = Math.max(20, Math.min(rawTextLen, this.MAX_TEXT_LENGTH));

    return {
      maxDepth,
      maxElements,
      maxTextLength,
      omitInvisible: options?.omitInvisible !== false,
      omitSystemNodes: options?.omitSystemNodes !== false
    };
  }

  /**
   * Validates search criteria, ensuring at least one valid criterion is provided and contains no command injection characters.
   */
  public static validateSearchCriteria(criteria: UIElementSearchCriteria): { valid: boolean; error?: string } {
    if (!criteria || typeof criteria !== 'object') {
      return { valid: false, error: 'Search criteria must be a non-null object.' };
    }

    const { name, controlType, automationId, className, role } = criteria;
    if (!name && !controlType && !automationId && !className && !role) {
      return { valid: false, error: 'At least one search criterion (name, controlType, automationId, className, role) must be provided.' };
    }

    const dangerousPattern = /[;`$\r\n|&<>]/;

    const fields: [string | undefined, string][] = [
      [name, 'name'],
      [controlType, 'controlType'],
      [automationId, 'automationId'],
      [className, 'className'],
      [role, 'role']
    ];

    for (const [val, fieldName] of fields) {
      if (val !== undefined) {
        if (typeof val !== 'string') {
          return { valid: false, error: `Field '${fieldName}' must be a string.` };
        }
        if (val.length > 200) {
          return { valid: false, error: `Field '${fieldName}' exceeds maximum length of 200 characters.` };
        }
        if (dangerousPattern.test(val)) {
          return { valid: false, error: `Field '${fieldName}' contains prohibited characters.` };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Sanitizes sensitive element attributes such as passwords or PIN fields.
   */
  public static sanitizeElement(element: UIElement): UIElement {
    const nameLower = (element.name || '').toLowerCase();
    const autoIdLower = (element.automationId || '').toLowerCase();
    const classLower = (element.className || '').toLowerCase();

    const isSensitive =
      nameLower.includes('password') ||
      nameLower.includes('pin') ||
      nameLower.includes('secret') ||
      nameLower.includes('token') ||
      autoIdLower.includes('password') ||
      autoIdLower.includes('pin') ||
      classLower.includes('password');

    let sanitizedValue = element.value;
    if (isSensitive && sanitizedValue !== undefined) {
      sanitizedValue = '[REDACTED]';
    } else if (sanitizedValue && sanitizedValue.length > this.MAX_TEXT_LENGTH) {
      sanitizedValue = sanitizedValue.slice(0, this.MAX_TEXT_LENGTH);
    }

    return {
      ...element,
      value: sanitizedValue,
      children: element.children ? element.children.map((c) => this.sanitizeElement(c)) : undefined
    };
  }

  /**
   * Sanitizes and caps a list of elements.
   */
  public static sanitizeElements(elements: readonly UIElement[], maxElements = 60): UIElement[] {
    const capped = elements.slice(0, Math.min(elements.length, maxElements));
    return capped.map((el) => this.sanitizeElement(el));
  }
}

/**
 * Convenient alias for UiaSecurityValidator with functional parity
 */
export const UiaSecurity = {
  MAX_DEPTH: UiaSecurityValidator.MAX_TREE_DEPTH,
  MAX_ELEMENTS: UiaSecurityValidator.MAX_ELEMENTS_COUNT,
  MAX_TEXT_LENGTH: UiaSecurityValidator.MAX_TEXT_LENGTH,
  sanitizeFilterOptions: (options?: UIElementFilterOptions) => UiaSecurityValidator.normalizeFilterOptions(options),
  validateSearchCriteria: (criteria: UIElementSearchCriteria) => UiaSecurityValidator.validateSearchCriteria(criteria),
  sanitizeElement: (el: UIElement) => UiaSecurityValidator.sanitizeElement(el),
  sanitizeElements: (els: readonly UIElement[], max = 60) => UiaSecurityValidator.sanitizeElements(els, max)
};
