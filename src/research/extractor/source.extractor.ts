/**
 * HṚṢĪKEŚA (हृषीकेश) — Source Extraction & Quality Pipeline
 *
 * Phase 17: Structured Extraction, Freshness & Credibility Evaluation
 */

import { createHash } from 'node:crypto';
import { URL } from 'node:url';
import {
  SourceType,
  SourceFreshness,
  SourceCredibilityTier,
  ClaimType,
} from '../interfaces/research.types.js';
import { PromptInjectionDefense } from '../security/prompt.injection.defense.js';
import { classifySourceType } from '../providers/search.provider.js';

export interface ExtractedSourceResult {
  title: string;
  cleanText: string;
  sanitizedText: string;
  headings: string[];
  paragraphs: string[];
  contentHash: string;
  canonicalUrl?: string;
  publishedAt?: string;
  freshness: SourceFreshness;
  credibilityTier: SourceCredibilityTier;
  credibilityReason: string;
  domain: string;
  sourceType: SourceType;
  license?: string;
  promptInjectionDetected: boolean;
}

export interface ExtractedClaimItem {
  claim: string;
  supportingText?: string;
  claimType: ClaimType;
  confidence: number;
  location?: string;
}

export class SourceExtractor {
  /**
   * Extract structured research data from raw page HTML or plain text (instance method).
   */
  public extractFromHtml(rawContent: string, urlStr: string, titleFallback?: string): ExtractedSourceResult {
    return SourceExtractor.extract(rawContent, urlStr, { titleFallback });
  }

  /**
   * Extract structured research data from raw page HTML or plain text (static method).
   */
  public static extract(rawContent: string, urlStr: string, options: { titleFallback?: string; publishedAt?: string } = {}): ExtractedSourceResult {
    let domain = 'unknown';
    try {
      domain = new URL(urlStr).hostname.toLowerCase();
    } catch {}

    const sourceType = classifySourceType(urlStr);

    // 1. Scan for prompt injection
    const injectionScan = PromptInjectionDefense.scan(rawContent);

    // 2. Clean and structure HTML/Text
    const { title, cleanText, headings, paragraphs, canonicalUrl, detectedPublishedAt, license } = this.parseContent(rawContent, urlStr, options.titleFallback);

    const publishedAt = options.publishedAt || detectedPublishedAt;

    // 3. Compute deterministic content hash (SHA-256 of normalized text)
    const normalizedForHash = cleanText.toLowerCase().replace(/\s+/g, ' ').trim();
    const contentHash = createHash('sha256').update(normalizedForHash).digest('hex');

    // 4. Derive Freshness
    const freshness = this.evaluateFreshness(publishedAt);

    // 5. Derive Credibility Tier
    const { tier: credibilityTier, reason: credibilityReason } = this.evaluateCredibility(sourceType, domain, publishedAt);

    return {
      title,
      cleanText,
      sanitizedText: injectionScan.sanitizedText,
      headings,
      paragraphs,
      contentHash,
      canonicalUrl,
      publishedAt,
      freshness,
      credibilityTier,
      credibilityReason,
      domain,
      sourceType,
      license,
      promptInjectionDetected: injectionScan.isSuspicious,
    };
  }

  /**
   * Extract distinct claims and classify their type (FACT, CLAIM, INFERENCE, OPINION).
   */
  public extractClaims(text: string): ExtractedClaimItem[] {
    const sentences = text
      .split(/(?<=[.!?\n])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 25 && s.length <= 300);

    const claims: ExtractedClaimItem[] = [];

    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();

      // Check for prompt injection artifacts / boilerplate to skip
      if (lower.includes('cookie') || lower.includes('privacy policy') || lower.includes('all rights reserved')) {
        continue;
      }

      let claimType: ClaimType = 'CLAIM';
      let confidence = 0.7;

      if (lower.includes('best') || lower.includes('great') || lower.includes('prefer') || lower.includes('elegant') || lower.includes('feel') || lower.includes('opinion') || lower.includes('in my opinion')) {
        claimType = 'OPINION';
        confidence = 0.5;
      } else if (lower.includes('might') || lower.includes('could') || lower.includes('suggests') || lower.includes('indicates') || lower.includes('likely') || lower.includes('possibly')) {
        claimType = 'INFERENCE';
        confidence = 0.6;
      } else if (/\b(\d+(?:\.\d+)?%?|\$?\d+(?:,\d+)?|\bv?\d+\.\d+(?:\.\d+)?|github|mit|apache)\b/i.test(sentence)) {
        claimType = 'FACT';
        confidence = 0.9;
      }

      claims.push({
        claim: sentence,
        supportingText: sentence,
        claimType,
        confidence,
        location: 'body',
      });

      if (claims.length >= 10) break; // Limit claims per single source
    }

    return claims;
  }

  /**
   * Parse HTML/Text into headings, clean paragraphs, and metadata.
   */
  private static parseContent(raw: string, url: string, titleFallback?: string) {
    let title = titleFallback || url;
    let canonicalUrl: string | undefined;
    let detectedPublishedAt: string | undefined;
    let license: string | undefined;

    // Extract title from <title> tag
    const titleMatch = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch && titleMatch[1].trim()) {
      title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
    }

    // Extract canonical URL
    const canonicalMatch = raw.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
    if (canonicalMatch) {
      canonicalUrl = canonicalMatch[1];
    }

    // Extract published date from meta tags
    const dateMatch = raw.match(/<meta[^>]+(?:property|name)=["'](?:article:published_time|date|pubdate|og:published_time)["'][^>]+content=["']([^"']+)["']/i);
    if (dateMatch) {
      detectedPublishedAt = dateMatch[1];
    }

    // Check for license mention
    const licenseMatch = raw.match(/\b(MIT|Apache-2\.0|Apache 2\.0|BSD-3-Clause|GPLv3|AGPL|MPL-2\.0)\b/i);
    if (licenseMatch) {
      license = licenseMatch[1];
    }

    // Extract headings (h1, h2, h3)
    const headings: string[] = [];
    const headingRegex = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
    let hMatch;
    while ((hMatch = headingRegex.exec(raw)) !== null) {
      const hText = hMatch[1].replace(/<[^>]+>/g, '').trim();
      if (hText.length > 2 && hText.length < 150) {
        headings.push(hText);
      }
    }

    // Strip scripts, styles, noscript, svg, nav, footer
    const stripped = raw
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '');

    // Extract paragraph text
    const paragraphs: string[] = [];
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let pMatch;
    while ((pMatch = pRegex.exec(stripped)) !== null) {
      const pText = pMatch[1].replace(/<[^>]+>/g, '').trim();
      if (pText.length > 20) {
        paragraphs.push(pText);
      }
    }

    // If no paragraphs found (e.g. raw text / markdown), split by newlines
    if (paragraphs.length === 0) {
      const cleanPlain = stripped.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const chunks = cleanPlain.split(/(?<=[.?!])\s+/).filter((c) => c.length > 20);
      paragraphs.push(...chunks);
    }

    const cleanText = paragraphs.join('\n\n');

    return {
      title,
      cleanText: cleanText || stripped.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      headings,
      paragraphs,
      canonicalUrl,
      detectedPublishedAt,
      license,
    };
  }

  /**
   * Derive freshness category based on publication timestamp.
   */
  public static evaluateFreshness(publishedAt?: string): SourceFreshness {
    if (!publishedAt) return 'UNKNOWN';

    try {
      const pubDate = new Date(publishedAt);
      if (isNaN(pubDate.getTime())) return 'UNKNOWN';

      const now = Date.now();
      const diffDays = (now - pubDate.getTime()) / (1000 * 60 * 60 * 24);

      if (diffDays < 0) return 'CURRENT'; // future/current release date
      if (diffDays <= 30) return 'CURRENT';
      if (diffDays <= 180) return 'RECENT';
      if (diffDays <= 730) return 'DATED';
      return 'HISTORICAL';
    } catch {
      return 'UNKNOWN';
    }
  }

  /**
   * Derive credibility tier and explanation from source type and domain.
   */
  public static evaluateCredibility(
    sourceType: SourceType,
    domain: string,
    _publishedAt?: string
  ): { tier: SourceCredibilityTier; reason: string } {
    if (sourceType === 'OFFICIAL_DOCUMENTATION') {
      return { tier: 'AUTHORITATIVE', reason: `Primary authoritative documentation hosted on ${domain}.` };
    }
    if (sourceType === 'OFFICIAL_REPOSITORY') {
      return { tier: 'AUTHORITATIVE', reason: `Official open-source repository codebase and release tags on ${domain}.` };
    }
    if (sourceType === 'ACADEMIC_PAPER' || domain.includes('.edu') || domain.includes('arxiv.org')) {
      return { tier: 'AUTHORITATIVE', reason: `Peer-reviewed or academic pre-print institution on ${domain}.` };
    }
    if (sourceType === 'GOVERNMENT' || domain.endsWith('.gov')) {
      return { tier: 'AUTHORITATIVE', reason: `Governmental regulatory or standards body on ${domain}.` };
    }
    if (sourceType === 'COMPANY') {
      return { tier: 'PRIMARY', reason: `Primary vendor / corporate organization domain on ${domain}.` };
    }
    if (sourceType === 'NEWS' || sourceType === 'BLOG') {
      return { tier: 'SECONDARY', reason: `Secondary commentary, news publication, or technical writeup on ${domain}.` };
    }
    if (sourceType === 'FORUM') {
      return { tier: 'COMMUNITY', reason: `Community discussion, subjective opinions, or uncurated forum threads on ${domain}.` };
    }

    return { tier: 'UNVERIFIED', reason: `Unverified third-party web domain on ${domain}.` };
  }
}
