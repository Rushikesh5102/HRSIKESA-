/**
 * HṚṢĪKEŚA (हृषीकेश) — Playwright Browser Adapter Tests (Phase 6)
 */

import { test, describe, after } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as http from 'node:http';
import { PlaywrightBrowserAdapter } from '../src/tools/browser/adapter/playwright.adapter.js';

describe('Playwright Browser Adapter Subsystem', () => {
  let server: http.Server;
  let serverUrl: string;
  const testScreenshotDir = path.resolve(process.cwd(), 'data', 'test-screenshots');
  const adapter = new PlaywrightBrowserAdapter(testScreenshotDir);

  // Spin up a tiny local HTTP server for deterministic offline testing
  test('setup local test HTTP server', async () => {
    await new Promise<void>((resolve) => {
      server = http.createServer((req, res) => {
        if (req.url === '/interactive') {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <!DOCTYPE html>
            <html>
              <head><title>HRISEKESA Interactive Test Page</title></head>
              <body>
                <h1>Main Heading</h1>
                <h2>Sub Section</h2>
                <p>Welcome to the sovereign browser runtime.</p>
                <input id="test-input" type="text" placeholder="Enter text..." />
                <button id="test-btn" onclick="document.getElementById('res').innerText = 'Clicked!'">Submit</button>
                <div id="res">Waiting...</div>
                <a href="/other">Link</a>
              </body>
            </html>
          `);
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<!DOCTYPE html><html><head><title>Simple Page</title></head><body><h1>Hello World</h1></body></html>');
        }
      });

      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as { port: number };
        serverUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await adapter.closeAll();
    if (server) {
      await new Promise<void>((res) => server.close(() => res()));
    }
    if (fs.existsSync(testScreenshotDir)) {
      fs.rmSync(testScreenshotDir, { recursive: true, force: true });
    }
  });

  test('should create, list, and retrieve browser sessions', async () => {
    const session = await adapter.createSession({ headless: true });
    assert.ok(session.id.startsWith('bws_'));
    assert.strictEqual(session.status, 'idle');
    assert.strictEqual(session.currentUrl, 'about:blank');

    const fetched = adapter.getSession(session.id);
    assert.ok(fetched);
    assert.strictEqual(fetched.id, session.id);

    const all = adapter.listSessions();
    assert.ok(all.length >= 1);
  });

  test('should navigate to URL and extract distilled page observation', async () => {
    const session = await adapter.createSession({ headless: true });
    const obs = await adapter.navigate(session.id, `${serverUrl}/interactive`);

    assert.strictEqual(obs.title, 'HRISEKESA Interactive Test Page');
    assert.strictEqual(obs.url, `${serverUrl}/interactive`);
    assert.ok(obs.visibleText.includes('Welcome to the sovereign browser runtime.'));
    assert.deepStrictEqual(obs.headings, ['Main Heading', 'Sub Section']);
    assert.strictEqual(obs.linksCount, 1);
    assert.strictEqual(obs.inputsCount, 1);
    assert.strictEqual(obs.buttonsCount, 1);
  });

  test('should interact with page elements via click, type, and keypress', async () => {
    const session = await adapter.createSession({ headless: true });
    await adapter.navigate(session.id, `${serverUrl}/interactive`);

    // Type into input
    const typeObs = await adapter.type(session.id, '#test-input', 'Autonomous input text');
    assert.ok(typeObs.url.includes('/interactive'));

    // Click button
    const clickObs = await adapter.click(session.id, '#test-btn');
    assert.ok(clickObs.visibleText.includes('Clicked!'));

    // Press key
    const keyObs = await adapter.keypress(session.id, 'Tab');
    assert.ok(keyObs);
  });

  test('should capture screenshot artifact to disk', async () => {
    const session = await adapter.createSession({ headless: true });
    await adapter.navigate(session.id, `${serverUrl}/interactive`);

    const shot = await adapter.screenshot(session.id, { filename: 'test_shot.png' });
    assert.ok(fs.existsSync(shot.path));
    assert.strictEqual(shot.mimeType, 'image/png');
    assert.ok(shot.sizeBytes > 0);
  });

  test('should cleanly close individual sessions and terminate browser', async () => {
    const session = await adapter.createSession({ headless: true });
    await adapter.closeSession(session.id);

    const check = adapter.getSession(session.id);
    assert.strictEqual(check, undefined);

    await adapter.closeAll();
    assert.strictEqual(adapter.listSessions().length, 0);
  });
});
