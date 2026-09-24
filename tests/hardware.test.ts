import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { HardwareDetector } from '../src/core/hardware/hardware.detector.js';

describe('Hardware Awareness Subsystem', () => {
  test('should detect current machine RAM and CPU architecture', () => {
    const detector = new HardwareDetector();
    const profile = detector.getProfile();

    assert.ok(profile.memory.totalGb > 0);
    assert.ok(profile.memory.freeBytes > 0);
    assert.ok(profile.memory.freeGb >= 0);
    assert.ok(profile.cpu.logicalProcessors > 0);
    assert.ok(profile.os.platform.length > 0);
    assert.equal(profile.constraints.maxConcurrentLocalInference, 1);
  });

  test('should enforce single local model execution lock (ADR-006)', () => {
    const detector = new HardwareDetector();

    assert.equal(detector.isLocalModelLocked(), false);
    assert.equal(detector.acquireLocalModelLock(), true);
    assert.equal(detector.isLocalModelLocked(), true);

    // Second acquisition should be rejected to prevent VRAM thrashing
    assert.equal(detector.acquireLocalModelLock(), false);

    detector.releaseLocalModelLock();
    assert.equal(detector.isLocalModelLocked(), false);
    assert.equal(detector.acquireLocalModelLock(), true);
  });
});
