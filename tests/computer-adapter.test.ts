/**
 * HṚṢĪKEŚA (हृषीकेश) — Computer Adapter Lifecycle & Operations Test Suite
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MockComputerAdapter } from '../src/tools/computer/adapter/mock.computer.adapter.js';

describe('Computer Adapter Subsystem', () => {
  it('should initialize and report correct screen resolution', async () => {
    const adapter = new MockComputerAdapter();
    await adapter.initialize();
    assert.equal(adapter.isInitialized, true);

    const size = await adapter.getScreenSize();
    assert.equal(size.width, 1920);
    assert.equal(size.height, 1080);
  });

  it('should produce desktop screenshot artifact with metadata', async () => {
    const adapter = new MockComputerAdapter();
    const screenshot = await adapter.screenshot('unit_test_screen');

    assert.equal(screenshot.format, 'png');
    assert.equal(screenshot.width, 1920);
    assert.equal(screenshot.height, 1080);
    assert.match(screenshot.artifactPath, /unit_test_screen\.png/);
    assert.ok(screenshot.bytes > 0);
  });

  it('should track mouse move, click, and double-click actions accurately', async () => {
    const adapter = new MockComputerAdapter();

    const moved = await adapter.mouseMove(450, 620);
    assert.deepEqual(moved, { x: 450, y: 620 });
    assert.deepEqual(adapter.cursorPosition, { x: 450, y: 620 });

    const clickRes = await adapter.mouseClick('right', false);
    assert.deepEqual(clickRes, { button: 'right', doubleClick: false });

    const dblClickRes = await adapter.mouseClick('left', true);
    assert.deepEqual(dblClickRes, { button: 'left', doubleClick: true });

    assert.equal(adapter.mouseClicks.length, 2);
  });

  it('should track keyboard typing and special keypress actions', async () => {
    const adapter = new MockComputerAdapter();

    const sampleText = 'HṚṢĪKEŚA automated desktop typing test';
    const typeRes = await adapter.keyboardType(sampleText);
    assert.equal(typeRes.charactersTyped, sampleText.length);
    assert.equal(adapter.typedHistory.length, 1);
    assert.equal(adapter.typedHistory[0], sampleText);

    const keyRes = await adapter.keyPress('ENTER');
    assert.equal(keyRes.key, 'ENTER');
    assert.equal(adapter.pressedKeys.includes('ENTER'), true);
  });

  it('should launch allowlisted apps and manage process lifecycle', async () => {
    const adapter = new MockComputerAdapter();

    const launchRes = await adapter.launchApp('notepad');
    assert.equal(launchRes.appName, 'Notepad');
    assert.equal(launchRes.executable, 'notepad.exe');
    assert.equal(launchRes.status, 'launched');
    assert.ok(launchRes.pid > 0);

    const closeRes = await adapter.closeApp(launchRes.pid);
    assert.equal(closeRes.killed, true);
    assert.equal(adapter.closedPids.includes(launchRes.pid), true);

    await adapter.closeAll();
  });
});
