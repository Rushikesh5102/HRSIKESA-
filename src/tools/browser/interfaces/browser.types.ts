/**
 * HṚṢĪKEŚA (हृषीकेश) — Browser Subsystem Interfaces (Phase 6)
 *
 * Vendor-neutral browser contracts, session definitions, and observation models.
 * Governed strictly by HṚṢĪKEŚA's Tool Execution Bus and Permission Manager.
 */

export type BrowserSessionStatus = 'idle' | 'busy' | 'closed';

export interface BrowserSession {
  readonly id: string;
  readonly browserType: 'chromium' | 'chrome' | 'msedge' | 'firefox' | 'webkit';
  readonly createdAt: string;
  lastActivity: string;
  currentUrl: string;
  status: BrowserSessionStatus;
  pageCount: number;
  metadata?: Record<string, unknown>;
}

export interface BrowserPageObservation {
  readonly sessionId: string;
  readonly url: string;
  readonly title: string;
  readonly visibleText: string;
  readonly headings: string[];
  readonly linksCount: number;
  readonly inputsCount: number;
  readonly buttonsCount: number;
  readonly screenshotPath?: string;
  readonly humanInterventionRequired?: boolean;
  readonly interventionReason?: string;
}

export interface ScreenshotResult {
  readonly path: string;
  readonly mimeType: 'image/png' | 'image/jpeg';
  readonly sizeBytes: number;
  readonly width?: number;
  readonly height?: number;
  readonly base64?: string;
}

export interface BrowserLaunchOptions {
  readonly headless?: boolean;
  readonly browserType?: 'chrome' | 'msedge' | 'chromium';
  readonly viewportWidth?: number;
  readonly viewportHeight?: number;
  readonly userAgent?: string;
  readonly timeoutMs?: number;
}

export interface IBrowserAdapter {
  createSession(options?: BrowserLaunchOptions): Promise<BrowserSession>;
  getSession(sessionId: string): BrowserSession | undefined;
  listSessions(): BrowserSession[];
  navigate(sessionId: string, url: string, timeoutMs?: number): Promise<BrowserPageObservation>;
  readPage(sessionId: string, maxTextLength?: number): Promise<BrowserPageObservation>;
  click(sessionId: string, selector: string, timeoutMs?: number): Promise<BrowserPageObservation>;
  type(sessionId: string, selector: string, text: string, timeoutMs?: number): Promise<BrowserPageObservation>;
  keypress(sessionId: string, key: string, timeoutMs?: number): Promise<BrowserPageObservation>;
  screenshot(sessionId: string, options?: { fullPage?: boolean; filename?: string }): Promise<ScreenshotResult>;
  waitForPage(sessionId: string, timeoutMs?: number): Promise<BrowserPageObservation>;
  closeSession(sessionId: string): Promise<void>;
  closeAll(): Promise<void>;
}
