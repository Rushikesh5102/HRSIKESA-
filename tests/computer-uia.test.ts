/**
 * HṚṢĪKEŚA (हृषीकेश) — Semantic UI Automation Adapter Test Suite (Phase 9)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MockUiaAdapter } from '../src/tools/computer/uia/mock/mock.uia.adapter.js';

describe('Phase 9: Semantic UI Automation Adapter (Mock)', () => {
  it('observes active window UI tree with default mock elements', async () => {
    const adapter = new MockUiaAdapter();
    const windowTree = await adapter.observeActiveWindow({ maxDepth: 3, maxElements: 60 });
    assert.ok(windowTree);
    assert.equal(windowTree.title, 'Untitled - Notepad');
    assert.equal(windowTree.processName, 'Notepad');
    assert.equal(windowTree.processId, 1234);
    assert.ok(windowTree.elements.length > 0);

    const editElem = windowTree.elements.find((e) => e.controlType.toLowerCase() === 'edit');
    assert.ok(editElem);
    assert.equal(editElem?.name, 'Text Editor');
  });

  it('finds UI elements by controlType', async () => {
    const adapter = new MockUiaAdapter();
    const edits = await adapter.findElements({ controlType: 'Edit' });
    assert.equal(edits.length, 1);
    assert.equal(edits[0].name, 'Text Editor');
    assert.equal(edits[0].className, 'Edit');
  });

  it('finds UI elements by accessible name', async () => {
    const adapter = new MockUiaAdapter();
    const buttons = await adapter.findElements({ name: 'Close' });
    assert.equal(buttons.length, 1);
    assert.equal(buttons[0].controlType, 'Button');
  });

  it('finds UI elements by automationId', async () => {
    const adapter = new MockUiaAdapter();
    const elems = await adapter.findElements({ automationId: '15' });
    assert.equal(elems.length, 1);
    assert.equal(elems[0].name, 'Text Editor');
  });

  it('focuses and clicks an element by ID', async () => {
    const adapter = new MockUiaAdapter();
    const focusRes = await adapter.focusElement('elem_3');
    assert.equal(focusRes.success, true);
    assert.equal(focusRes.elementId, 'elem_3');

    const clickRes = await adapter.clickElement('elem_4');
    assert.equal(clickRes.success, true);
    assert.equal(clickRes.elementId, 'elem_4');
  });

  it('types text into an editable element and returns verification state', async () => {
    const adapter = new MockUiaAdapter();
    const typeRes = await adapter.typeText('elem_3', 'Hello HṚṢĪKEŚA');
    assert.equal(typeRes.success, true);
    assert.equal(typeRes.previousValue, '');
    assert.equal(typeRes.updatedValue, 'Hello HṚṢĪKEŚA');

    // Re-observing should show the updated text
    const observed = await adapter.observeActiveWindow();
    const editElem = observed.elements.find((e) => e.id === 'elem_3');
    assert.equal(editElem?.value, 'Hello HṚṢĪKEŚA');
  });

  it('sends keypress to focused element', async () => {
    const adapter = new MockUiaAdapter();
    const keyRes = await adapter.sendKeypress('elem_3', 'ENTER');
    assert.equal(keyRes.success, true);
    assert.equal(keyRes.elementId, 'elem_3');
  });

  it('rejects stale or non-existent element IDs', async () => {
    const adapter = new MockUiaAdapter();
    await assert.rejects(
      async () => {
        await adapter.focusElement('elem_non_existent_999');
      },
      /Stale element reference/
    );
  });
});
