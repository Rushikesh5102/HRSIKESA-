/**
 * HṚṢĪKEŚA (हृषीकेश) — Playwright Browser Adapter (Phase 6)
 *
 * Implements IBrowserAdapter using playwright-core with native Windows Chrome/Edge discovery,
 * ephemeral incognito context sandboxing, and distilled DOM observation extraction.
 */

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  IBrowserAdapter,
  BrowserSession,
  BrowserPageObservation,
  BrowserLaunchOptions,
  ScreenshotResult,
} from '../interfaces/browser.types.js';
import { BrowserUrlValidator } from '../security/url.validator.js';

interface SessionHolder {
  session: BrowserSession;
  context: BrowserContext;
  page: Page;
}

export class PlaywrightBrowserAdapter implements IBrowserAdapter {
  private browser: Browser | null = null;
  private readonly sessions = new Map<string, SessionHolder>();
  private readonly screenshotDir: string;
  private activeBrowserType: 'chrome' | 'msedge' | 'chromium' = 'chrome';

  constructor(screenshotDir = path.resolve(process.cwd(), 'data', 'screenshots')) {
    this.screenshotDir = screenshotDir;
  }

  /**
   * Initializes or retrieves the shared Browser process.
   */
  private async ensureBrowser(options?: BrowserLaunchOptions): Promise<Browser> {
    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }

    const headless = options?.headless ?? true;
    const requestedType = options?.browserType || 'chrome';

    // Channel fallback chain for Windows
    const channelsToTry: Array<'chrome' | 'msedge' | undefined> =
      requestedType === 'msedge'
        ? ['msedge', 'chrome', undefined]
        : ['chrome', 'msedge', undefined];

    let lastError: Error | null = null;

    for (const channel of channelsToTry) {
      try {
        if (channel) {
          this.browser = await chromium.launch({
            channel,
            headless,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
          });
          this.activeBrowserType = channel;
          return this.browser;
        } else {
          this.browser = await chromium.launch({
            headless,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
          });
          this.activeBrowserType = 'chromium';
          return this.browser;
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    throw new Error(
      `Failed to launch browser (tried chrome, msedge, chromium): ${lastError?.message || 'Unknown launch error'}`
    );
  }

  /**
   * Creates a new ephemeral incognito browser session.
   */
  public async createSession(options?: BrowserLaunchOptions): Promise<BrowserSession> {
    const browser = await this.ensureBrowser(options);

    const sessionId = `bws_${crypto.randomBytes(8).toString('hex')}`;
    const now = new Date().toISOString();

    const context = await browser.newContext({
      viewport: {
        width: options?.viewportWidth ?? 1280,
        height: options?.viewportHeight ?? 800,
      },
      userAgent:
        options?.userAgent ??
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 HRISEKESA/0.2.0',
    });

    const page = await context.newPage();
    page.setDefaultTimeout(options?.timeoutMs ?? 30000);

    const session: BrowserSession = {
      id: sessionId,
      browserType: this.activeBrowserType,
      createdAt: now,
      lastActivity: now,
      currentUrl: 'about:blank',
      status: 'idle',
      pageCount: 1,
      metadata: {
        headless: options?.headless ?? true,
      },
    };

    this.sessions.set(sessionId, { session, context, page });
    return { ...session };
  }

  /**
   * Retrieves active session by ID.
   */
  public getSession(sessionId: string): BrowserSession | undefined {
    const holder = this.sessions.get(sessionId);
    return holder ? { ...holder.session } : undefined;
  }

  /**
   * Lists all tracked sessions.
   */
  public listSessions(): BrowserSession[] {
    return Array.from(this.sessions.values()).map((h) => ({ ...h.session }));
  }

  /**
   * Navigates the session's active page to a validated URL.
   */
  public async navigate(
    sessionId: string,
    rawUrl: string,
    timeoutMs = 30000
  ): Promise<BrowserPageObservation> {
    const holder = this.getRequiredSession(sessionId);

    // Validate URL safety
    const validation = BrowserUrlValidator.validate(rawUrl);
    if (!validation.isValid || !validation.normalizedUrl) {
      throw new Error(`Navigation safety violation: ${validation.error}`);
    }

    holder.session.status = 'busy';
    holder.session.lastActivity = new Date().toISOString();

    try {
      await holder.page.goto(validation.normalizedUrl, {
        timeout: timeoutMs,
        waitUntil: 'domcontentloaded',
      });

      holder.session.currentUrl = holder.page.url();
      return await this.extractObservation(holder);
    } finally {
      holder.session.status = 'idle';
    }
  }

  /**
   * Reads and distills the visible contents of the active page.
   */
  public async readPage(sessionId: string, maxTextLength = 8000): Promise<BrowserPageObservation> {
    const holder = this.getRequiredSession(sessionId);
    holder.session.lastActivity = new Date().toISOString();
    return this.extractObservation(holder, maxTextLength);
  }

  /**
   * Clicks an interactive element by CSS selector or text matcher.
   */
  public async click(
    sessionId: string,
    selector: string,
    timeoutMs = 10000
  ): Promise<BrowserPageObservation> {
    const holder = this.getRequiredSession(sessionId);
    holder.session.status = 'busy';
    holder.session.lastActivity = new Date().toISOString();

    try {
      await holder.page.click(selector, { timeout: timeoutMs });
      // Wait for any immediate navigation or DOM mutation
      await holder.page.waitForLoadState('domcontentloaded', { timeout: 3000 }).catch(() => {});
      holder.session.currentUrl = holder.page.url();
      return await this.extractObservation(holder);
    } finally {
      holder.session.status = 'idle';
    }
  }

  /**
   * Fills text into an input or textarea element.
   */
  public async type(
    sessionId: string,
    selector: string,
    text: string,
    timeoutMs = 10000
  ): Promise<BrowserPageObservation> {
    const holder = this.getRequiredSession(sessionId);
    holder.session.status = 'busy';
    holder.session.lastActivity = new Date().toISOString();

    try {
      await holder.page.fill(selector, text, { timeout: timeoutMs });
      return await this.extractObservation(holder);
    } finally {
      holder.session.status = 'idle';
    }
  }

  /**
   * Presses a keyboard key.
   */
  public async keypress(
    sessionId: string,
    key: string,
    timeoutMs = 5000
  ): Promise<BrowserPageObservation> {
    const holder = this.getRequiredSession(sessionId);
    holder.session.status = 'busy';
    holder.session.lastActivity = new Date().toISOString();

    try {
      await holder.page.keyboard.press(key, { delay: 50 });
      await holder.page.waitForLoadState('domcontentloaded', { timeout: timeoutMs }).catch(() => {});
      holder.session.currentUrl = holder.page.url();
      return await this.extractObservation(holder);
    } finally {
      holder.session.status = 'idle';
    }
  }

  /**
   * Captures a screenshot of the active page.
   */
  public async screenshot(
    sessionId: string,
    options?: { fullPage?: boolean; filename?: string }
  ): Promise<ScreenshotResult> {
    const holder = this.getRequiredSession(sessionId);
    holder.session.lastActivity = new Date().toISOString();

    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }

    const filename =
      options?.filename ?? `${sessionId}_${Date.now()}.png`;
    const targetPath = path.resolve(this.screenshotDir, filename);

    const buffer = await holder.page.screenshot({
      path: targetPath,
      fullPage: options?.fullPage ?? false,
    });

    const viewport = holder.page.viewportSize();

    return {
      path: targetPath,
      mimeType: 'image/png',
      sizeBytes: buffer.length,
      width: viewport?.width,
      height: viewport?.height,
      base64: buffer.toString('base64'),
    };
  }

  /**
   * Waits for the page load state.
   */
  public async waitForPage(sessionId: string, timeoutMs = 15000): Promise<BrowserPageObservation> {
    const holder = this.getRequiredSession(sessionId);
    await holder.page.waitForLoadState('load', { timeout: timeoutMs }).catch(() => {});
    return this.extractObservation(holder);
  }

  /**
   * Closes an individual session and its isolated context.
   */
  public async closeSession(sessionId: string): Promise<void> {
    const holder = this.sessions.get(sessionId);
    if (!holder) return;

    holder.session.status = 'closed';
    try {
      await holder.page.close().catch(() => {});
      await holder.context.close().catch(() => {});
    } finally {
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Closes all active sessions and terminates the browser process.
   */
  public async closeAll(): Promise<void> {
    for (const sessionId of Array.from(this.sessions.keys())) {
      await this.closeSession(sessionId);
    }

    if (this.browser) {
      try {
        await this.browser.close().catch(() => {});
      } finally {
        this.browser = null;
      }
    }
  }

  /**
   * Helper to retrieve a valid, open session holder.
   */
  private getRequiredSession(sessionId: string): SessionHolder {
    const holder = this.sessions.get(sessionId);
    if (!holder || holder.session.status === 'closed') {
      throw new Error(`Browser session '${sessionId}' is not active or does not exist.`);
    }
    return holder;
  }

  /**
   * Extracts a structured, token-efficient observation from the page.
   */
  private async extractObservation(
    holder: SessionHolder,
    maxTextLength = 8000
  ): Promise<BrowserPageObservation> {
    const page = holder.page;
    const url = page.url();
    const title = await page.title().catch(() => '');

    // Extract headings
    const headings = await page
      .$$eval('h1, h2, h3', (elements) =>
        elements
          .map((el) => (el.textContent || '').trim().replace(/\s+/g, ' '))
          .filter((t) => t.length > 0)
          .slice(0, 15)
      )
      .catch(() => [] as string[]);

    // Extract element counts
    const linksCount = await page.$$eval('a[href]', (els) => els.length).catch(() => 0);
    const inputsCount = await page.$$eval('input, textarea, select', (els) => els.length).catch(() => 0);
    const buttonsCount = await page.$$eval('button, [role="button"], input[type="submit"]', (els) => els.length).catch(() => 0);

    // Extract distilled visible text from body
    let visibleText = await page
      .evaluate(() => {
        const body = document.body;
        if (!body) return '';
        // Clone body to strip non-visual / script tags
        const clone = body.cloneNode(true) as HTMLElement;
        const removeTags = clone.querySelectorAll('script, style, noscript, svg, canvas');
        removeTags.forEach((el) => el.remove());
        return (clone.innerText || clone.textContent || '')
          .replace(/[ \t]+/g, ' ')
          .replace(/\n\s*\n+/g, '\n\n')
          .trim();
      })
      .catch(() => '');

    if (visibleText.length > maxTextLength) {
      visibleText = `${visibleText.slice(0, maxTextLength)}\n... [Truncated at ${maxTextLength} characters]`;
    }

    // Check for CAPTCHA or Cloudflare challenge markers
    const challengeCheck = await page
      .evaluate(() => {
        const text = (document.body?.innerText || '').toLowerCase();
        const hasChallengeText =
          text.includes('verify you are human') ||
          text.includes('checking your browser') ||
          text.includes('recaptcha') ||
          text.includes('cloudflare ray id');
        const hasCaptchaElement = !!document.querySelector(
          '.g-recaptcha, .h-captcha, #challenge-running, iframe[src*="captcha"], iframe[src*="turnstile"]'
        );
        return hasChallengeText || hasCaptchaElement;
      })
      .catch(() => false);

    return {
      sessionId: holder.session.id,
      url,
      title,
      visibleText,
      headings,
      linksCount,
      inputsCount,
      buttonsCount,
      humanInterventionRequired: challengeCheck,
      interventionReason: challengeCheck
        ? 'Website presented a CAPTCHA, bot challenge, or human verification gate.'
        : undefined,
    };
  }
}
