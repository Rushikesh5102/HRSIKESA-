/**
 * HṚṢĪKEŚA (हृषीकेश) — Browser Context Bridge Adapter
 *
 * Phase 22: Bridges desktop computer operator actions to Playwright browser context when operating web browsers.
 */

import { IBrowserAdapter } from '../../../tools/browser/interfaces/browser.types.js';

export class BrowserBridgeAdapter {
  private readonly browserAdapter?: IBrowserAdapter;

  constructor(browserAdapter?: IBrowserAdapter) {
    this.browserAdapter = browserAdapter;
  }

  public isBrowserContext(processName?: string, windowTitle?: string): boolean {
    const p = (processName || '').toLowerCase();
    const t = (windowTitle || '').toLowerCase();
    return p.includes('chrome') || p.includes('msedge') || p.includes('firefox') || t.includes('chrome') || t.includes('edge');
  }

  public isBrowserProcess(processName?: string): boolean {
    return this.isBrowserContext(processName);
  }

  public async navigate(url: string): Promise<boolean> {
    if (!this.browserAdapter) return false;
    try {
      const sessions = this.browserAdapter.listSessions();
      let session = sessions[0];
      if (!session) {
        session = await this.browserAdapter.createSession();
      }
      await this.browserAdapter.navigate(session.id, url);
      return true;
    } catch {
      return false;
    }
  }
}
