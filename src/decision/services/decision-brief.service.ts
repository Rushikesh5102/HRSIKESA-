/**
 * HṚṢĪKEŚA (हृषीकेश) — Decision Brief Service
 *
 * FP-18: Constructs standardized 16-section DecisionBrief packages,
 * strictly separating EVIDENCE from ANALYSIS from RECOMMENDATION.
 * Formats markdown reports and delegates to FP-17 Creation Studio for exports.
 */

import {
  ResearchCase,
  DecisionBrief,
  CandidateComparison,
} from '../interfaces/decision.types.js';

export class DecisionBriefService {
  /**
   * Compiles a comprehensive 16-section Decision Brief from a research case.
   */
  public generateBrief(
    c: ResearchCase,
    comparison?: CandidateComparison,
    includeRecommendation: boolean = false
  ): DecisionBrief {
    const comp = comparison || c.comparison;

    const options = (c.candidates || []).map((cand) => ({
      id: cand.id,
      name: cand.name,
      description: cand.description || `${cand.name} (${cand.license})`,
      pros: cand.capabilities,
      cons: cand.limitations,
    }));

    const keyFindings = (c.claims || []).slice(0, 5).map((cl) => `[${cl.claimType}] ${cl.subject} ${cl.predicate} ${cl.object}`);
    if (keyFindings.length === 0) {
      keyFindings.push(`Research completed for objective: ${c.objective}`);
    }

    const evidenceSummary = (c.claims || []).slice(0, 5).map((cl) => `"${cl.quote}" — ${cl.sourceTitle} (${cl.sourceTier})`);

    const tradeoffs = comp?.tradeoffSummary ? [comp.tradeoffSummary] : ['Tradeoffs assessed across identified candidates.'];

    const risks = [
      ...((c.contradictions || []).map((ct) => `Conflict detected: ${ct.natureOfConflict}`)),
      ...((c.candidates || []).filter((cd) => cd.compatibilityStatus === 'INCOMPATIBLE').map((cd) => `Hardware incompatibility: ${cd.name} cannot run on local host hardware`)),
    ];
    if (risks.length === 0) {
      risks.push('Standard technical and operational risks within bounded baseline.');
    }

    const unknowns = comp?.unknowns?.length ? comp.unknowns : (c.unknowns || ['No critical unverified unknowns remaining.']);

    const constraints = c.constraints?.length ? c.constraints : [
      'Host envelope: Intel Core Ultra 5 125H, 15.7 GB RAM, Intel Arc GPU, Windows 11',
      'No silent changes to host software or unauthorized spend',
    ];

    const dependencies = (c.candidates || []).map((cd) => `${cd.name}: requires ~${cd.compatibilityDetails.minRamGb}GB RAM, ${cd.compatibilityDetails.gpuVulkanSupported ? 'Vulkan' : 'CPU'}`);

    const costConsiderations = (c.candidates || []).map((cd) => `${cd.name}: ${cd.costSummary || 'Zero-cost open-source license'}`);

    const implementationImplications = [
      'Environment must be verified prior to downloading or installing dependencies.',
      'Model checkpoints and runtime weights require dedicated local disk allocation.',
    ];

    const openQuestions = (c.unknowns || []).slice(0, 3);
    if (openQuestions.length === 0) {
      openQuestions.push('Does the operator wish to proceed with configuration or benchmark evaluation?');
    }

    const decisionRequired = `Select preferred option for: "${c.question}" from the evaluated candidates.`;

    const proposedNextSteps = [
      'Review evidence and candidate tradeoffs in this brief.',
      'Confirm preferred candidate or request additional subquestion research.',
      'Authorize proposed implementation plan when ready.',
    ];

    const sources = (c.sources || []).map((s) => ({
      title: s.title,
      url: s.url,
      tier: s.tier,
      retrievedAt: s.retrievedAt,
    }));

    let recommendation: DecisionBrief['recommendation'] | undefined;
    if (includeRecommendation) {
      const recCand = (c.candidates || []).find((cd) => cd.id === comp?.recommendedCandidateId) || c.candidates?.[0];
      if (recCand) {
        recommendation = {
          optionId: recCand.id,
          optionName: recCand.name,
          rationale: comp?.recommendationRationale || `Recommended based on host compatibility and license transparency.`,
          assumptions: [
            'Operator prioritizes local-first zero-cost execution over cloud dependency.',
            'Host retains at least 8 GB available RAM during execution.',
          ],
        };
      }
    }

    return {
      id: `brief_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      caseId: c.id,
      title: `Decision Brief: ${c.question}`,
      objective: c.objective,
      scope: c.scope || 'Standard technical evaluation',
      keyFindings,
      evidenceSummary,
      options,
      tradeoffs,
      risks,
      unknowns,
      constraints,
      dependencies,
      costConsiderations,
      implementationImplications,
      openQuestions,
      decisionRequired,
      proposedNextSteps,
      sources,
      recommendation,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Renders a DecisionBrief into clean Markdown format.
   */
  public toMarkdown(brief: DecisionBrief): string {
    const lines: string[] = [];
    lines.push(`# ${brief.title}`);
    lines.push(`*Generated by HṚṢĪKEŚA Decision Intelligence Fabric — ${brief.createdAt}*\n`);

    lines.push(`## 1. Objective`);
    lines.push(brief.objective + '\n');

    lines.push(`## 2. Scope`);
    lines.push(brief.scope + '\n');

    lines.push(`## 3. Key Findings`);
    brief.keyFindings.forEach((kf) => lines.push(`- ${kf}`));
    lines.push('');

    lines.push(`## 4. Evidence Summary`);
    brief.evidenceSummary.forEach((ev) => lines.push(`- ${ev}`));
    lines.push('');

    lines.push(`## 5. Evaluated Options`);
    for (const opt of brief.options) {
      lines.push(`### ${opt.name}`);
      lines.push(`${opt.description}`);
      if (opt.pros.length > 0) lines.push(`- **Pros:** ${opt.pros.join(', ')}`);
      if (opt.cons.length > 0) lines.push(`- **Cons:** ${opt.cons.join(', ')}`);
      lines.push('');
    }

    lines.push(`## 6. Tradeoff Analysis`);
    brief.tradeoffs.forEach((t) => lines.push(t));
    lines.push('');

    lines.push(`## 7. Risks & Mitigations`);
    brief.risks.forEach((r) => lines.push(`- ⚠️ ${r}`));
    lines.push('');

    lines.push(`## 8. Explicit Unknowns & Uncertainty`);
    brief.unknowns.forEach((u) => lines.push(`- ❓ ${u}`));
    lines.push('');

    lines.push(`## 9. Constraints`);
    brief.constraints.forEach((c) => lines.push(`- ${c}`));
    lines.push('');

    lines.push(`## 10. Technical Dependencies`);
    brief.dependencies.forEach((d) => lines.push(`- ${d}`));
    lines.push('');

    lines.push(`## 11. Cost Considerations`);
    brief.costConsiderations.forEach((cc) => lines.push(`- ${cc}`));
    lines.push('');

    lines.push(`## 12. Implementation Implications`);
    brief.implementationImplications.forEach((ii) => lines.push(`- ${ii}`));
    lines.push('');

    lines.push(`## 13. Open Questions`);
    brief.openQuestions.forEach((oq) => lines.push(`- ${oq}`));
    lines.push('');

    lines.push(`## 14. Decision Required`);
    lines.push(brief.decisionRequired + '\n');

    lines.push(`## 15. Recommendation (Requested Evaluation)`);
    if (brief.recommendation) {
      lines.push(`> **Recommended Candidate:** ${brief.recommendation.optionName}`);
      lines.push(`> **Rationale:** ${brief.recommendation.rationale}\n`);
      lines.push(`**Underlying Assumptions:**`);
      brief.recommendation.assumptions.forEach((as) => lines.push(`- ${as}`));
      lines.push('');
    } else {
      lines.push(`*No specific recommendation requested by user. Tradeoffs presented above for autonomous decision support.*\n`);
    }

    lines.push(`## 16. Proposed Next Steps & Sources`);
    lines.push(`### Next Steps:`);
    brief.proposedNextSteps.forEach((ns) => lines.push(`1. ${ns}`));
    lines.push(`\n### Sources:`);
    brief.sources.forEach((s) => lines.push(`- [${s.tier}] [${s.title}](${s.url}) (retrieved ${s.retrievedAt})`));

    return lines.join('\n');
  }
}
