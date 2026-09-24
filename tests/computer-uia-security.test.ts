/**
 * HṚṢĪKEŚA (हृषीकेश) — Semantic UI Security Test Suite (Phase 9)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UiaSecurity } from '../src/tools/computer/uia/security/uia.security.js';
import { UIElement, UIElementSearchCriteria } from '../src/tools/computer/uia/interfaces/uia.types.js';

describe('Phase 9: Semantic UI Automation Security', () => {
  it('enforces bounds on filter options (maxDepth and maxElements)', () => {
    const defaultOpts = UiaSecurity.sanitizeFilterOptions();
    assert.equal(defaultOpts.maxDepth, 3);
    assert.equal(defaultOpts.maxElements, 60);
    assert.equal(defaultOpts.omitInvisible, true);

    const boundedOpts = UiaSecurity.sanitizeFilterOptions({
      maxDepth: 999,
      maxElements: 9999,
      omitInvisible: false
    });
    assert.equal(boundedOpts.maxDepth, UiaSecurity.MAX_DEPTH); // 5
    assert.equal(boundedOpts.maxElements, UiaSecurity.MAX_ELEMENTS); // 150
    assert.equal(boundedOpts.omitInvisible, false);

    const minBounded = UiaSecurity.sanitizeFilterOptions({
      maxDepth: -5,
      maxElements: 0
    });
    assert.equal(minBounded.maxDepth, 1);
    assert.equal(minBounded.maxElements, 1);
  });

  it('validates search criteria inputs against script injection and dangerous characters', () => {
    const validCrit: UIElementSearchCriteria = {
      name: 'File',
      controlType: 'menuItem',
      automationId: 'MenuBar_1',
      className: 'StandardButton'
    };
    assert.equal(UiaSecurity.validateSearchCriteria(validCrit).valid, true);

    const invalidCharCrit: UIElementSearchCriteria = {
      name: 'File"; Remove-Item -Recurse C:\\ ;'
    };
    const check1 = UiaSecurity.validateSearchCriteria(invalidCharCrit);
    assert.equal(check1.valid, false);
    assert.match(check1.error || '', /contains prohibited characters/);

    const emptyCrit: UIElementSearchCriteria = {};
    const check2 = UiaSecurity.validateSearchCriteria(emptyCrit);
    assert.equal(check2.valid, false);
    assert.match(check2.error || '', /At least one search criterion/);
  });

  it('redacts sensitive password and PIN fields from UI tree', () => {
    const elements: UIElement[] = [
      {
        id: 'elem_user',
        name: 'Username',
        role: 'edit',
        controlType: 'edit',
        automationId: 'user_input',
        value: 'rushikesh',
        enabled: true,
        visible: true
      },
      {
        id: 'elem_pass',
        name: 'Password',
        role: 'edit',
        controlType: 'edit',
        automationId: 'password_box',
        value: 'SuperSecret123!',
        enabled: true,
        visible: true
      },
      {
        id: 'elem_pin',
        name: 'Security PIN Code',
        role: 'edit',
        controlType: 'edit',
        value: '9988',
        enabled: true,
        visible: true
      }
    ];

    const sanitized = UiaSecurity.sanitizeElements(elements, 10);
    assert.equal(sanitized.length, 3);

    const user = sanitized.find((e) => e.id === 'elem_user');
    assert.equal(user?.value, 'rushikesh');

    const pass = sanitized.find((e) => e.id === 'elem_pass');
    assert.equal(pass?.value, '[REDACTED]');

    const pin = sanitized.find((e) => e.id === 'elem_pin');
    assert.equal(pin?.value, '[REDACTED]');
  });

  it('truncates excessively long text content in UI elements', () => {
    const longText = 'A'.repeat(1000);
    const elements: UIElement[] = [
      {
        id: 'elem_doc',
        name: 'Document Preview',
        role: 'document',
        controlType: 'document',
        value: longText,
        enabled: true,
        visible: true
      }
    ];

    const sanitized = UiaSecurity.sanitizeElements(elements, 10);
    assert.equal(sanitized[0].value?.length, UiaSecurity.MAX_TEXT_LENGTH); // 500
  });

  it('enforces maximum element cap on sanitized elements array', () => {
    const elements: UIElement[] = Array.from({ length: 200 }, (_, i) => ({
      id: `elem_${i}`,
      name: `Button ${i}`,
      role: 'button',
      controlType: 'button',
      enabled: true,
      visible: true
    }));

    const capped = UiaSecurity.sanitizeElements(elements, 50);
    assert.equal(capped.length, 50);
  });
});
