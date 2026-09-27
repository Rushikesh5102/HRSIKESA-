/**
 * HṚṢĪKEŚA — Phase 17 Research Intelligence
 * Cross-Source Analyzer & Contradiction Detection
 *
 * Evaluates evidence across multiple sources:
 * - Detects corroboration (supporting claims across distinct domains/publishers)
 * - Detects contradictions and discrepancies (versions, dates, compatibility, facts)
 * - Classifies findings (CONFIRMED, CORROBORATED, CONFLICTING, UNVERIFIED, INSUFFICIENT_EVIDENCE)
 * - Generates structured citations with full provenance tracing
 */

import {
  IResearchEvidence,
  IResearchFinding,
  IResearchSource,
  FindingType,
  FindingStatus,
  ResearchCitation,
  SourceCredibilityTier,
} from '../interfaces/research.types.js';

export interface ContradictionReport {
  findingTitle: string;
  discrepancyType: 'VERSION_MISMATCH' | 'DATE_MISMATCH' | 'COMPATIBILITY_CONFLICT' | 'FACTUAL_DISAGREEMENT' | 'NUMERICAL_DISCREPANCY';
  description: string;
  sourceA: { sourceId: string; sourceTitle: string; url: string; claim: string };
  sourceB: { sourceId: string; sourceTitle: string; url: string; claim: string };
}

export class CrossSourceAnalyzer {
  /**
   * Evaluate whether a piece of evidence supports, contradicts, mentions, or does not support a claim.
   */
  public evaluateSupportType(claim: string, evidenceText: string): 'SUPPORTS' | 'CONTRADICTS' | 'MENTIONS' | 'DOES_NOT_SUPPORT' {
    const cLower = claim.toLowerCase();
    const eLower = evidenceText.toLowerCase();

    // Check negation
    const notSupports = eLower.includes('not ') || eLower.includes('does not') || eLower.includes('incompatible') || eLower.includes('never');
    if (notSupports && cLower.includes('support')) {
      return 'CONTRADICTS';
    }

    if (eLower.includes(cLower) || (eLower.includes('confirm') && this.calculateJaccardSimilarity(this.tokenize(cLower), this.tokenize(eLower)) > 0.3)) {
      return 'SUPPORTS';
    }

    if (this.calculateJaccardSimilarity(this.tokenize(cLower), this.tokenize(eLower)) > 0.1) {
      return 'MENTIONS';
    }

    return 'DOES_NOT_SUPPORT';
  }

  /**
   * Directly detect contradictions across an evidence list.
   */
  public detectContradictions(
    evidences: IResearchEvidence[],
    sources?: IResearchSource[]
  ): Array<ContradictionReport & { type: string }> {
    const sourceMap = new Map<string, IResearchSource>();
    if (sources) {
      for (const s of sources) {
        sourceMap.set(s.id, s);
      }
    }
    // Create fallback entries for any missing sources in sourceMap so detection can run seamlessly
    for (const ev of evidences) {
      if (!sourceMap.has(ev.sourceId)) {
        sourceMap.set(ev.sourceId, {
          id: ev.sourceId,
          researchId: ev.researchId || 'study',
          url: `https://${ev.sourceId}.org`,
          domain: `${ev.sourceId}.org`,
          title: `Source ${ev.sourceId}`,
          sourceType: 'NEWS',
          credibilityTier: 'SECONDARY',
          freshness: 'CURRENT',
          contentHash: 'mock-hash',
          retrievedAt: new Date().toISOString(),
          isDuplicate: false,
          status: 'EXTRACTED',
          createdAt: new Date().toISOString(),
        });
      }
    }

    const reports = this.detectDiscrepancies(evidences, sourceMap);
    return reports.map((r) => ({
      ...r,
      type: r.discrepancyType,
    }));
  }

  /**
   * Analyze all collected evidence across sources and generate verified findings.
   */
  public analyze(
    studyIdOrSources: string | IResearchSource[],
    sourcesOrEvidences: IResearchSource[] | IResearchEvidence[],
    evidencesParam?: IResearchEvidence[]
  ): {
    findings: Array<Omit<IResearchFinding, 'id' | 'createdAt' | 'updatedAt'>>;
    citations: ResearchCitation[];
    contradictions: ContradictionReport[];
  } {
    const sources: IResearchSource[] = Array.isArray(studyIdOrSources)
      ? (studyIdOrSources as IResearchSource[])
      : (sourcesOrEvidences as IResearchSource[]);

    const evidences: IResearchEvidence[] = Array.isArray(studyIdOrSources)
      ? ((sourcesOrEvidences || []) as IResearchEvidence[])
      : (evidencesParam || []);

    const studyId = typeof studyIdOrSources === 'string'
      ? studyIdOrSources
      : (sources[0]?.researchId || 'study');

    const sourceMap = new Map<string, IResearchSource>();
    for (const src of sources) {
      sourceMap.set(src.id, src);
    }

    const citations: ResearchCitation[] = [];
    const sourceCitationMap = new Map<string, number>();

    // Build 1-indexed citation list
    let citeIndex = 1;
    for (const src of sources) {
      if (!sourceCitationMap.has(src.id)) {
        sourceCitationMap.set(src.id, citeIndex);
        citations.push({
          index: citeIndex,
          sourceId: src.id,
          sourceTitle: src.title || src.url,
          publisher: src.publisher || src.domain,
          url: src.url,
          sourceUrl: src.url,
          retrievedAt: src.retrievedAt,
          credibilityTier: src.credibilityTier,
          freshness: src.freshness,
        });
        citeIndex++;
      }
    }

    // Group evidence by similarity/topic
    const claimClusters = this.clusterEvidence(evidences);
    const findings: Array<Omit<IResearchFinding, 'id' | 'createdAt' | 'updatedAt'>> = [];
    const contradictions: ContradictionReport[] = [];

    for (const cluster of claimClusters) {
      const clusterSourceIds = Array.from(new Set(cluster.map((e) => e.sourceId)));
      const clusterSources = clusterSourceIds.map((id) => sourceMap.get(id)).filter(Boolean) as IResearchSource[];
      const distinctDomains = new Set(clusterSources.map((s) => s.domain));

      // Check for contradictions within cluster
      const clusterContradictions = this.detectDiscrepancies(cluster, sourceMap);
      if (clusterContradictions.length > 0) {
        contradictions.push(...clusterContradictions);
      }

      // Determine finding status and confidence
      let status: FindingStatus = FindingStatus.UNVERIFIED;
      let confidence = 0.5;

      const hasAuthoritative = clusterSources.some(
        (s) => s.credibilityTier === SourceCredibilityTier.AUTHORITATIVE || s.credibilityTier === SourceCredibilityTier.PRIMARY
      );

      if (clusterContradictions.length > 0) {
        status = FindingStatus.CONFLICTING;
        confidence = 0.4;
      } else if (distinctDomains.size >= 2 && hasAuthoritative) {
        status = FindingStatus.CONFIRMED;
        confidence = 0.95;
      } else if (distinctDomains.size >= 2) {
        status = FindingStatus.CORROBORATED;
        confidence = 0.8;
      } else if (hasAuthoritative) {
        status = FindingStatus.CORROBORATED;
        confidence = 0.75;
      } else if (cluster.length >= 1) {
        status = FindingStatus.UNVERIFIED;
        confidence = 0.5;
      } else {
        status = FindingStatus.INSUFFICIENT_EVIDENCE;
        confidence = 0.2;
      }

      // Map citation indices
      const findingCitationIndices = clusterSourceIds
        .map((id) => sourceCitationMap.get(id))
        .filter((n): n is number => typeof n === 'number')
        .sort((a, b) => a - b);

      const representativeEvidence = cluster[0];
      const claimText = representativeEvidence.claimText || representativeEvidence.claim || 'Observation';
      const findingTitle = this.deriveFindingTitle(claimText);

      // Determine finding type based on evidence
      let findingType: FindingType = FindingType.FACT;
      if (cluster.some((e) => e.claimType === 'OPINION')) {
        findingType = FindingType.OPINION;
      } else if (cluster.some((e) => e.claimType === 'INFERENCE')) {
        findingType = FindingType.INFERENCE;
      } else if (cluster.some((e) => e.claimType === 'CLAIM')) {
        findingType = FindingType.CLAIM;
      }

      const descText = representativeEvidence.supportingText || representativeEvidence.quoteText || claimText;

      findings.push({
        researchId: studyId,
        title: findingTitle,
        statement: descText,
        description: descText,
        findingType,
        status,
        confidence,
        sourceIds: clusterSourceIds,
        evidenceIds: cluster.map((e) => e.id),
        citationIndices: findingCitationIndices,
        contradictionNotes: clusterContradictions.length > 0
          ? clusterContradictions.map((c) => c.description).join('; ')
          : undefined,
      });
    }

    return { findings, citations, contradictions };
  }

  /**
   * Group related evidence items by keyword overlap or subject.
   */
  private clusterEvidence(evidences: IResearchEvidence[]): IResearchEvidence[][] {
    const clusters: IResearchEvidence[][] = [];
    const visited = new Set<string>();

    for (let i = 0; i < evidences.length; i++) {
      const evA = evidences[i];
      if (visited.has(evA.id)) continue;

      const currentCluster: IResearchEvidence[] = [evA];
      visited.add(evA.id);

      const claimA = evA.claimText || evA.claim || '';
      const tokensA = this.tokenize(claimA);

      for (let j = i + 1; j < evidences.length; j++) {
        const evB = evidences[j];
        if (visited.has(evB.id)) continue;

        const claimB = evB.claimText || evB.claim || '';
        const tokensB = this.tokenize(claimB);
        const overlap = this.calculateJaccardSimilarity(tokensA, tokensB);

        // If evidence shares substantive terms or is directly related
        if (overlap >= 0.25 || (evA.location && evA.location === evB.location)) {
          currentCluster.push(evB);
          visited.add(evB.id);
        }
      }

      clusters.push(currentCluster);
    }

    return clusters;
  }

  /**
   * Detect conflicting statements in an evidence cluster.
   */
  private detectDiscrepancies(
    cluster: IResearchEvidence[],
    sourceMap: Map<string, IResearchSource>
  ): ContradictionReport[] {
    const reports: ContradictionReport[] = [];

    for (let i = 0; i < cluster.length; i++) {
      for (let j = i + 1; j < cluster.length; j++) {
        const evA = cluster[i];
        const evB = cluster[j];

        if (evA.sourceId === evB.sourceId) continue;

        const srcA = sourceMap.get(evA.sourceId);
        const srcB = sourceMap.get(evB.sourceId);
        if (!srcA || !srcB) continue;

        const claimA = evA.claimText || evA.claim || '';
        const claimB = evB.claimText || evB.claim || '';

        // Check for version discrepancy
        const verA = this.extractVersionNumber(claimA + ' ' + (evA.supportingText || evA.quoteText || ''));
        const verB = this.extractVersionNumber(claimB + ' ' + (evB.supportingText || evB.quoteText || ''));
        if (verA && verB && verA !== verB) {
          reports.push({
            findingTitle: claimA,
            discrepancyType: 'VERSION_MISMATCH',
            description: `Source "${srcA.title}" reports version ${verA} while "${srcB.title}" reports version ${verB}`,
            sourceA: { sourceId: srcA.id, sourceTitle: srcA.title, url: srcA.url, claim: claimA },
            sourceB: { sourceId: srcB.id, sourceTitle: srcB.title, url: srcB.url, claim: claimB },
          });
        }

        // Check for negation / compatibility conflicts
        const textA = (claimA + ' ' + (evA.supportingText || evA.quoteText || '')).toLowerCase();
        const textB = (claimB + ' ' + (evB.supportingText || evB.quoteText || '')).toLowerCase();

        const notSupportsA = textA.includes('does not support') || textA.includes('incompatible') || textA.includes('no support') || textA.includes('unsupported') || textA.includes('not supported') || textA.includes('experimental');
        const supportsA = !notSupportsA && (textA.includes('support') || textA.includes('compatible') || textA.includes('works on'));

        const notSupportsB = textB.includes('does not support') || textB.includes('incompatible') || textB.includes('no support') || textB.includes('unsupported') || textB.includes('not supported') || textB.includes('experimental');
        const supportsB = !notSupportsB && (textB.includes('support') || textB.includes('compatible') || textB.includes('works on'));

        if ((supportsA && notSupportsB) || (notSupportsA && supportsB)) {
          reports.push({
            findingTitle: claimA,
            discrepancyType: 'COMPATIBILITY_CONFLICT',
            description: `Disagreement on platform support/compatibility: "${srcA.title}" vs "${srcB.title}"`,
            sourceA: { sourceId: srcA.id, sourceTitle: srcA.title, url: srcA.url, claim: claimA },
            sourceB: { sourceId: srcB.id, sourceTitle: srcB.title, url: srcB.url, claim: claimB },
          });
        }

        // Check for date discrepancy
        const dateA = this.extractDateString(claimA + ' ' + (evA.supportingText || evA.quoteText || ''));
        const dateB = this.extractDateString(claimB + ' ' + (evB.supportingText || evB.quoteText || ''));
        if (dateA && dateB && dateA.toLowerCase() !== dateB.toLowerCase()) {
          reports.push({
            findingTitle: claimA,
            discrepancyType: 'DATE_MISMATCH',
            description: `Conflicting dates: "${srcA.title}" claims ${dateA} while "${srcB.title}" claims ${dateB}`,
            sourceA: { sourceId: srcA.id, sourceTitle: srcA.title, url: srcA.url, claim: claimA },
            sourceB: { sourceId: srcB.id, sourceTitle: srcB.title, url: srcB.url, claim: claimB },
          });
        }

        // Check for numerical discrepancy
        const numA = this.extractNumberWithUnit(claimA + ' ' + (evA.supportingText || evA.quoteText || ''));
        const numB = this.extractNumberWithUnit(claimB + ' ' + (evB.supportingText || evB.quoteText || ''));
        if (numA && numB && numA.unit === numB.unit && numA.value !== numB.value) {
          reports.push({
            findingTitle: claimA,
            discrepancyType: 'NUMERICAL_DISCREPANCY',
            description: `Numerical discrepancy: "${srcA.title}" claims ${numA.raw} while "${srcB.title}" claims ${numB.raw}`,
            sourceA: { sourceId: srcA.id, sourceTitle: srcA.title, url: srcA.url, claim: claimA },
            sourceB: { sourceId: srcB.id, sourceTitle: srcB.title, url: srcB.url, claim: claimB },
          });
        }

        // Check for factual disagreement
        const isFreeA = textA.includes('open source') || textA.includes('free') || textA.includes('permissive');
        const isProprietaryA = textA.includes('closed source') || textA.includes('proprietary') || textA.includes('commercial only');
        const isFreeB = textB.includes('open source') || textB.includes('free') || textB.includes('permissive');
        const isProprietaryB = textB.includes('closed source') || textB.includes('proprietary') || textB.includes('commercial only');

        if ((isFreeA && isProprietaryB) || (isProprietaryA && isFreeB)) {
          reports.push({
            findingTitle: claimA,
            discrepancyType: 'FACTUAL_DISAGREEMENT',
            description: `Direct factual disagreement on license/nature: "${srcA.title}" vs "${srcB.title}"`,
            sourceA: { sourceId: srcA.id, sourceTitle: srcA.title, url: srcA.url, claim: claimA },
            sourceB: { sourceId: srcB.id, sourceTitle: srcB.title, url: srcB.url, claim: claimB },
          });
        }
      }
    }

    return reports;
  }

  private extractDateString(text: string): string | null {
    const monthNames = 'january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec';
    const regex1 = new RegExp(`\\b(?:${monthNames})(?:\\s+\\d{1,2}(?:st|nd|rd|th)?)?(?:,?\\s+\\d{4})?\\b`, 'i');
    const regex2 = /\b\d{4}-\d{2}-\d{2}\b/;
    const regex3 = /\bQ[1-4]\s+\d{4}\b/i;
    const match1 = text.match(regex1);
    if (match1) return match1[0].trim();
    const match2 = text.match(regex2);
    if (match2) return match2[0].trim();
    const match3 = text.match(regex3);
    if (match3) return match3[0].trim();
    return null;
  }

  private extractNumberWithUnit(text: string): { value: number; unit: string; raw: string } | null {
    const match = text.match(/\b(\d+(?:\.\d+)?)\s*(million|billion|trillion|gb|mb|tb|%|users|parameters|agents|tiers|nodes|stars|forks)?\b/i);
    if (!match) return null;
    const value = parseFloat(match[1]);
    const unit = (match[2] || '').toLowerCase();
    if (isNaN(value)) return null;
    return { value, unit, raw: match[0] };
  }

  private extractVersionNumber(text: string): string | null {
    const match = text.match(/\bv?(\d+\.\d+(?:\.\d+)?)\b/i);
    return match ? match[1] : null;
  }

  private deriveFindingTitle(claim: string): string {
    const trimmed = (claim || '').trim();
    if (trimmed.length <= 80) return trimmed;
    const firstSentence = trimmed.split(/[.!?\n]/)[0];
    return firstSentence.length <= 90 ? firstSentence : firstSentence.substring(0, 87) + '...';
  }

  private tokenize(text: string): Set<string> {
    const words = (text || '')
      .toLowerCase()
      .replace(/[^a-z0-9_\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 2)
      .map((w) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w)); // light singularization
    const stopWords = new Set(['the', 'and', 'for', 'that', 'this', 'with', 'from', 'are', 'was', 'were', 'which', 'about', 'some']);
    return new Set(words.filter((w) => !stopWords.has(w)));
  }

  private calculateJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 || setB.size === 0) return 0;
    let intersection = 0;
    for (const item of setA) {
      if (setB.has(item)) intersection++;
    }
    const union = new Set([...setA, ...setB]).size;
    return union > 0 ? intersection / union : 0;
  }
}
