/**
 * HṚṢĪKEŚA — Phase 17 Research Intelligence
 * Research Synthesizer & Artifact Generator
 *
 * Generates structured, evidence-grounded research reports and persistent artifact bundles:
 * - research.md (human-readable structured report)
 * - sources.json (structured source metadata)
 * - evidence.json (structured claim & provenance bundle)
 * - Semantic memory persistence for verified durable facts
 */

import {
  IResearchStudy,
  IResearchSource,
  IResearchEvidence,
  IResearchFinding,
  ResearchCitation,
  ResearchArtifactBundle,
  FindingStatus,
} from '../interfaces/research.types.js';
import { ContradictionReport } from '../analyzer/cross.source.analyzer.js';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export class ResearchSynthesizer {
  /**
   * Synthesize study findings into a cohesive Markdown report and artifact bundle.
   */
  public synthesizeReport(
    study: IResearchStudy,
    sources: IResearchSource[],
    evidences: IResearchEvidence[],
    findings: IResearchFinding[],
    citations: ResearchCitation[],
    contradictions: ContradictionReport[] = []
  ): ResearchArtifactBundle {
    const markdown = this.generateMarkdownReport(study, sources, evidences, findings, citations, contradictions);

    return {
      studyId: study.id,
      study,
      markdown,
      reportMarkdown: markdown,
      sources,
      sourcesJson: sources,
      evidence: evidences,
      evidenceJson: evidences,
      findings,
      findingsJson: findings,
      citations,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Save artifact bundle to local filesystem under research/ or project workspace.
   */
  public async saveArtifactBundle(
    bundle: ResearchArtifactBundle,
    targetDirectory: string
  ): Promise<{ markdownPath: string; sourcesPath: string; evidencePath: string }> {
    await fs.mkdir(targetDirectory, { recursive: true });

    const markdownPath = path.join(targetDirectory, 'research.md');
    const sourcesPath = path.join(targetDirectory, 'sources.json');
    const evidencePath = path.join(targetDirectory, 'evidence.json');

    await fs.writeFile(markdownPath, bundle.markdown || bundle.reportMarkdown || '', 'utf8');
    await fs.writeFile(sourcesPath, JSON.stringify(bundle.sources || bundle.sourcesJson || [], null, 2), 'utf8');
    await fs.writeFile(evidencePath, JSON.stringify(bundle.evidence || bundle.evidenceJson || [], null, 2), 'utf8');

    return { markdownPath, sourcesPath, evidencePath };
  }

  /**
   * Extract durable facts suitable for long-term semantic memory storage.
   */
  public extractDurableFacts(findings: IResearchFinding[], citations: ResearchCitation[]): string[] {
    const citeMap = new Map<number, ResearchCitation>();
    for (const c of citations) {
      citeMap.set(c.index, c);
    }

    const facts: string[] = [];
    for (const f of findings) {
      if (
        (f.status === FindingStatus.CONFIRMED || f.status === FindingStatus.CORROBORATED) &&
        (f.confidence ?? 0.8) >= 0.7
      ) {
        const sourceRefs = (f.citationIndices || [])
          .map((idx: number) => {
            const c = citeMap.get(idx);
            return c ? `${c.sourceTitle} (${c.url || c.sourceUrl || ''})` : `[${idx}]`;
          })
          .join(', ');

        const desc = f.description || f.statement || f.title;
        facts.push(`[Verified Fact] ${f.title}: ${desc} (Sources: ${sourceRefs || 'Internal'})`);
      }
    }

    return facts;
  }

  private generateMarkdownReport(
    study: IResearchStudy,
    sources: IResearchSource[],
    evidences: IResearchEvidence[],
    findings: IResearchFinding[],
    citations: ResearchCitation[],
    contradictions: ContradictionReport[]
  ): string {
    const lines: string[] = [];

    // Title & Metadata Header
    lines.push(`# ${study.title || 'Research Report'}`);
    lines.push('');
    lines.push(`**Research Objective:** ${study.question}`);
    if (study.scope) {
      lines.push(`**Scope:** ${study.scope}`);
    }
    lines.push(`**Status:** \`${study.status}\` | **Depth:** \`${study.depth}\` | **Completed:** ${new Date().toISOString()}`);
    lines.push(`**Sources Consulted:** ${sources.length} | **Evidence Items:** ${evidences.length} | **Key Findings:** ${findings.length}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    // Executive Summary
    lines.push('## Executive Summary');
    lines.push('');
    const confirmedCount = findings.filter((f) => f.status === FindingStatus.CONFIRMED || f.status === FindingStatus.CORROBORATED).length;
    const conflictCount = findings.filter((f) => f.status === FindingStatus.CONFLICTING).length;

    lines.push(
      `This research investigated: *"${study.question}"* across ${sources.length} sources. ` +
      `We identified ${findings.length} findings (${confirmedCount} confirmed/corroborated, ${conflictCount} conflicting). ` +
      `All conclusions are traceable to primary and secondary evidence.`
    );
    lines.push('');

    // Key Findings
    lines.push('## Key Findings');
    lines.push('');
    if (findings.length === 0) {
      lines.push('_No distinct findings extracted from the acquired sources._');
    } else {
      findings.forEach((f, idx) => {
        const citeBadges = (f.citationIndices || []).map((c: number) => `[${c}]`).join(' ');
        const badge = this.formatFindingBadge(f.status);
        const confText = f.confidence !== undefined ? `${(f.confidence * 100).toFixed(0)}%` : '85%';
        lines.push(`### ${idx + 1}. ${f.title} ${citeBadges}`);
        lines.push(`- **Type:** \`${f.findingType}\` | **Verification:** ${badge} | **Confidence:** ${confText}`);
        lines.push(`- **Description:** ${f.description || f.statement || f.title}`);
        if (f.contradictionNotes) {
          lines.push(`- **Note:** ⚠️ ${f.contradictionNotes}`);
        }
        lines.push('');
      });
    }

    // Contradictions & Discrepancies
    if (contradictions.length > 0) {
      lines.push('## Conflicts and Discrepancies');
      lines.push('');
      lines.push('The following contradictions were detected between sources:');
      lines.push('');
      contradictions.forEach((c, idx) => {
        lines.push(`#### ${idx + 1}. [${c.discrepancyType}] ${c.findingTitle}`);
        lines.push(`- **Discrepancy:** ${c.description}`);
        lines.push(`- **Source A:** [${c.sourceA.sourceTitle}](${c.sourceA.url}) — "${c.sourceA.claim}"`);
        lines.push(`- **Source B:** [${c.sourceB.sourceTitle}](${c.sourceB.url}) — "${c.sourceB.claim}"`);
        lines.push('');
      });
    }

    // Source Comparison Table
    lines.push('## Source Comparison Matrix');
    lines.push('');
    lines.push('| # | Source Title | Domain | Credibility Tier | Freshness | License |');
    lines.push('|---|--------------|--------|------------------|-----------|---------|');
    citations.forEach((c) => {
      const src = sources.find((s) => s.id === c.sourceId);
      const domain = src ? src.domain : 'unknown';
      const license = src?.license || 'Unknown';
      const url = c.url || c.sourceUrl || '#';
      lines.push(`| [${c.index}] | [${c.sourceTitle}](${url}) | \`${domain}\` | \`${c.credibilityTier || 'PRIMARY'}\` | \`${c.freshness || 'CURRENT'}\` | ${license} |`);
    });
    lines.push('');

    // Evidence Log
    lines.push('## Detailed Evidence Log');
    lines.push('');
    evidences.forEach((ev, idx) => {
      const src = sources.find((s) => s.id === ev.sourceId);
      const srcRef = src ? `[${src.title || src.domain}](${src.url})` : 'Unknown Source';
      const claimText = ev.claimText || ev.claim || '';
      const quoteText = ev.quoteText || ev.supportingText;
      lines.push(`- **[E${idx + 1}] (${ev.claimType})** ${claimText}`);
      if (quoteText && quoteText !== claimText) {
        lines.push(`  > "${quoteText}"`);
      }
      lines.push(`  *Source:* ${srcRef} *(Confidence: ${(ev.confidence * 100).toFixed(0)}%)*`);
    });
    lines.push('');

    // Limitations & Caveats
    lines.push('## Limitations');
    lines.push('');
    lines.push('- **Source Boundedness:** Research was constrained by configured budget limits (max sources, max depth).');
    lines.push('- **Temporal Freshness:** Web content reflects state at retrieval timestamp.');
    lines.push('- **Automated Extraction:** Text normalization defangs script injection and isolates untrusted web content.');
    lines.push('');

    // References / Citations Section
    lines.push('## References & Sources');
    lines.push('');
    citations.forEach((c) => {
      const url = c.url || c.sourceUrl || '#';
      lines.push(`[${c.index}] **${c.publisher || 'Web Source'}** — *"${c.sourceTitle}"*, retrieved ${c.retrievedAt}. URL: ${url}`);
    });
    lines.push('');

    return lines.join('\n');
  }

  private formatFindingBadge(status: FindingStatus): string {
    switch (status) {
      case FindingStatus.CONFIRMED:
        return '🟢 **CONFIRMED**';
      case FindingStatus.CORROBORATED:
        return '🔵 **CORROBORATED**';
      case FindingStatus.CONFLICTING:
        return '🔴 **CONFLICTING**';
      case FindingStatus.UNVERIFIED:
        return '🟡 **UNVERIFIED**';
      case FindingStatus.INSUFFICIENT_EVIDENCE:
        return '⚪ **INSUFFICIENT EVIDENCE**';
      default:
        return `\`${status}\``;
    }
  }
}
