/**
 * HṚṢĪKEŚA (हृषीकेश) — Environment Discovery Subsystem Unit Tests
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { KnownAppCatalog } from '../src/environment/discovery/known.apps.js';
import { AppDiscovery } from '../src/environment/discovery/app.discovery.js';

describe('Environment Discovery Subsystem', () => {
  test('KnownAppCatalog should contain core desktop and developer applications', () => {
    const apps = KnownAppCatalog.getAllKnownApps();
    assert.ok(apps.length >= 10, 'Catalog should contain at least 10 core apps');

    const appIds = apps.map(a => a.id);
    assert.ok(appIds.includes('notepad'));
    assert.ok(appIds.includes('calculator'));
    assert.ok(appIds.includes('blender'));
    assert.ok(appIds.includes('vscode'));
    assert.ok(appIds.includes('git'));
    assert.ok(appIds.includes('nodejs'));
    assert.ok(appIds.includes('python'));
    assert.ok(appIds.includes('ollama'));
  });

  test('KnownAppCatalog should resolve aliases correctly', () => {
    const calc = KnownAppCatalog.findInCatalog('calc');
    assert.ok(calc);
    assert.equal(calc.id, 'calculator');

    const code = KnownAppCatalog.findInCatalog('code');
    assert.ok(code);
    assert.equal(code.id, 'vscode');

    const blender = KnownAppCatalog.findInCatalog('blender 3d');
    assert.ok(blender);
    assert.equal(blender.id, 'blender');
  });

  test('AppDiscovery should find installed Windows applications (e.g. notepad)', async () => {
    const discovery = new AppDiscovery();
    const notepad = await discovery.findApp('notepad');

    assert.ok(notepad, 'Notepad should be findable on Windows');
    assert.equal(notepad.id, 'notepad');
    assert.equal(notepad.installed, true);
    assert.ok(notepad.executablePath, 'Executable path must be present');
    assert.ok(notepad.executablePath.toLowerCase().includes('notepad.exe'));
  });

  test('AppDiscovery should return structured record for missing application', async () => {
    const discovery = new AppDiscovery();
    const missing = await discovery.findApp('nonexistent-app-xyz-12345');
    assert.equal(missing, null);
  });

  test('AppDiscovery should discover multiple installed applications', async () => {
    const discovery = new AppDiscovery();
    const installed = await discovery.discoverInstalledApps();

    assert.ok(Array.isArray(installed));
    assert.ok(installed.length > 0);

    const hasNotepad = installed.some(a => a.id === 'notepad');
    assert.ok(hasNotepad, 'Installed list should include Notepad');
  });
});
