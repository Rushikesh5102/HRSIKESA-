/**
 * HṚṢĪKEŚA (हृषीकेश) — Browser URL Safety Validator (Phase 6)
 *
 * Enforces strict URL protocol whitelist, blocks dangerous schemes (file://, javascript:, data:),
 * and prevents browser sandbox escapes or local file discovery.
 */

export interface UrlValidationResult {
  readonly isValid: boolean;
  readonly normalizedUrl?: string;
  readonly protocol?: string;
  readonly hostname?: string;
  readonly error?: string;
}

export class BrowserUrlValidator {
  private static readonly ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
  private static readonly BLOCKED_PROTOCOLS = new Set([
    'file:',
    'javascript:',
    'data:',
    'vbscript:',
    'blob:',
    'about:',
    'chrome:',
    'edge:',
    'ws:',
    'wss:',
    'gopher:',
    'ftp:',
    'tftp:',
  ]);

  /**
   * Validates and normalizes a candidate navigation URL.
   */
  public static validate(rawUrl: string): UrlValidationResult {
    if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim().length === 0) {
      return {
        isValid: false,
        error: 'URL cannot be empty or non-string.',
      };
    }

    const trimmed = rawUrl.trim();

    // Check for inline protocol bypasses (e.g. "javascript:alert(1)", "file:///C:/")
    const lower = trimmed.toLowerCase();
    for (const blocked of this.BLOCKED_PROTOCOLS) {
      if (lower.startsWith(blocked)) {
        return {
          isValid: false,
          error: `Navigation to protocol '${blocked}' is strictly prohibited for security reasons.`,
        };
      }
    }

    // Parse URL with standard URL parser
    let parsed: URL;
    try {
      // Auto-prefix http if user typed a bare domain without protocol (e.g. "example.com")
      if (!lower.startsWith('http://') && !lower.startsWith('https://')) {
        parsed = new URL(`https://${trimmed}`);
      } else {
        parsed = new URL(trimmed);
      }
    } catch {
      return {
        isValid: false,
        error: `Invalid URL format: '${rawUrl}'.`,
      };
    }

    // Protocol check
    if (!this.ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return {
        isValid: false,
        protocol: parsed.protocol,
        error: `Protocol '${parsed.protocol}' is not authorized. Only 'http:' and 'https:' are permitted.`,
      };
    }

    // Hostname check
    if (!parsed.hostname || parsed.hostname.length === 0) {
      return {
        isValid: false,
        error: 'URL must include a valid hostname.',
      };
    }

    return {
      isValid: true,
      normalizedUrl: parsed.toString(),
      protocol: parsed.protocol,
      hostname: parsed.hostname,
    };
  }
}
