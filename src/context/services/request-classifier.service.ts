/**
 * HṚṢĪKEŚA (हृषीकेश) — Request Classifier Service
 *
 * Track A / INT-007: Cognitive Context Engine
 * Deterministically classifies user requests into intent, task complexity,
 * temporal scope, and retrieval depth.
 */

import {
  ContextRequest,
  ContextIntent,
  TaskComplexity,
  TemporalIntent,
} from '../interfaces/context.types.js';

export interface ClassificationResult {
  readonly intent: ContextIntent;
  readonly complexity: TaskComplexity;
  readonly temporalScope: TemporalIntent;
  readonly requestedDepth: 'SHALLOW' | 'STANDARD' | 'DEEP' | 'EXHAUSTIVE';
  readonly isFastPathCandidate: boolean;
  readonly extractedEntities: string[];
}

export class RequestClassifierService {
  /**
   * Classifies an incoming context request.
   */
  public classify(request: ContextRequest): ClassificationResult {
    const raw = (request.userMessage || request.query || '').trim();
    const lower = raw.toLowerCase();
    const explicitTemporal = request.temporalIntent || request.temporalScope;
    const temporalScope = explicitTemporal || this.detectTemporalIntent(lower);

    // 1. Explicit request override
    if (request.intent) {
      return {
        intent: request.intent,
        complexity: this.inferComplexity(request.intent, lower),
        temporalScope,
        requestedDepth: request.requestedDepth || 'STANDARD',
        isFastPathCandidate: false,
        extractedEntities: this.extractCandidateEntities(raw),
      };
    }

    // 2. Fast-Path Candidate Detection (Greetings, Clock, Simple Math)
    const isFastPath = this.checkFastPathCandidate(lower);
    if (isFastPath) {
      return {
        intent: 'CASUAL_CONVERSATION',
        complexity: 'SIMPLE',
        temporalScope: 'CURRENT',
        requestedDepth: 'SHALLOW',
        isFastPathCandidate: true,
        extractedEntities: [],
      };
    }

    // 3. Identity Queries
    if (
      lower.includes('who created you') ||
      lower.includes('who is your creator') ||
      lower.includes('who made you') ||
      lower.includes('what is hṛṣīkeśa') ||
      lower.includes('what is hrisekesa') ||
      lower.includes('what are you')
    ) {
      return {
        intent: 'IDENTITY',
        complexity: 'SIMPLE',
        temporalScope: 'CURRENT',
        requestedDepth: 'SHALLOW',
        isFastPathCandidate: false,
        extractedEntities: ['Rushikesh', 'HṚṢĪKEŚA'],
      };
    }

    // 4. Decision Queries (ADR / PDR / Architectural Choices)
    if (
      lower.includes('why did we choose') ||
      lower.includes('why did we select') ||
      lower.includes('why did we reject') ||
      lower.includes('what decision') ||
      lower.includes('architectural decision') ||
      lower.includes('adr') ||
      lower.includes('pdr') ||
      lower.includes('why not use') ||
      lower.includes('rationale for')
    ) {
      return {
        intent: 'DECISION_QUERY',
        complexity: 'COMPLEX',
        temporalScope: this.detectTemporalIntent(lower),
        requestedDepth: 'DEEP',
        isFastPathCandidate: false,
        extractedEntities: this.extractCandidateEntities(raw),
      };
    }

    // 5. Research & Evidence Queries
    if (
      lower.startsWith('research ') ||
      lower.includes('research evidence') ||
      lower.includes('research study') ||
      lower.includes('research findings') ||
      lower.includes('investigate ') ||
      lower.includes('what does the evidence say') ||
      lower.includes('citations for') ||
      lower.includes('verified claims') ||
      lower.includes('literature study') ||
      lower.includes('benchmark comparison') ||
      lower.includes('benchmarks do we have') ||
      lower.includes('benchmarks on')
    ) {
      return {
        intent: 'RESEARCH_QUERY',
        complexity: 'RESEARCH_DEEP',
        temporalScope: this.detectTemporalIntent(lower),
        requestedDepth: 'DEEP',
        isFastPathCandidate: false,
        extractedEntities: this.extractCandidateEntities(raw),
      };
    }

    // 6. Company & Commercial OS Queries
    if (
      lower.includes('company') ||
      lower.includes('customer') ||
      lower.includes('kpi') ||
      lower.includes('product catalog') ||
      lower.includes('department') ||
      lower.includes('pragnya') ||
      lower.includes('aumtrix') ||
      lower.includes('svara') ||
      lower.includes('commercial operations')
    ) {
      return {
        intent: 'COMPANY_QUERY',
        complexity: 'STANDARD',
        temporalScope: this.detectTemporalIntent(lower),
        requestedDepth: 'STANDARD',
        isFastPathCandidate: false,
        extractedEntities: this.extractCandidateEntities(raw),
      };
    }

    // 7. Project Queries
    if (
      request.projectId ||
      lower.includes('project') ||
      lower.includes('sahikara') ||
      lower.includes('dex') ||
      lower.includes('int-00') ||
      lower.includes('phase 1') ||
      lower.includes('phase 2') ||
      lower.includes('repository') ||
      lower.includes('codebase')
    ) {
      return {
        intent: 'PROJECT_QUERY',
        complexity: 'STANDARD',
        temporalScope: this.detectTemporalIntent(lower),
        requestedDepth: 'STANDARD',
        isFastPathCandidate: false,
        extractedEntities: this.extractCandidateEntities(raw),
      };
    }

    // 8. Goal & Mission Execution Queries
    if (
      request.goalId ||
      request.missionId ||
      lower.includes('goal ') ||
      lower.includes('mission ') ||
      lower.includes('milestone') ||
      lower.includes('workforce task')
    ) {
      return {
        intent: 'GOAL_MISSION',
        complexity: 'COMPLEX',
        temporalScope: 'CURRENT',
        requestedDepth: 'STANDARD',
        isFastPathCandidate: false,
        extractedEntities: this.extractCandidateEntities(raw),
      };
    }

    // 9. Technical & Architecture Queries
    if (
      lower.includes('how does') ||
      lower.includes('architecture') ||
      lower.includes('sqlite') ||
      lower.includes('ollama') ||
      lower.includes('model router') ||
      lower.includes('typescript') ||
      lower.includes('implementation') ||
      lower.includes('service')
    ) {
      return {
        intent: 'TECHNICAL_QUERY',
        complexity: 'STANDARD',
        temporalScope: this.detectTemporalIntent(lower),
        requestedDepth: 'STANDARD',
        isFastPathCandidate: false,
        extractedEntities: this.extractCandidateEntities(raw),
      };
    }

    // 10. Default General Knowledge / Conversation Turn
    return {
      intent: 'GENERAL_KNOWLEDGE',
      complexity: 'STANDARD',
      temporalScope: this.detectTemporalIntent(lower),
      requestedDepth: request.requestedDepth || 'STANDARD',
      isFastPathCandidate: false,
      extractedEntities: this.extractCandidateEntities(raw),
    };
  }

  private checkFastPathCandidate(lower: string): boolean {
    const trimmed = lower.trim().replace(/[?!.,]+$/, '');
    if (
      trimmed === 'hello' ||
      trimmed.startsWith('hello ') ||
      trimmed.startsWith('hello,') ||
      trimmed === 'hi' ||
      trimmed.startsWith('hi ') ||
      trimmed.startsWith('hi,') ||
      trimmed === 'hey' ||
      trimmed.startsWith('hey ') ||
      trimmed === 'good morning' ||
      trimmed === 'good evening' ||
      trimmed === 'namaste' ||
      trimmed.startsWith('namaste') ||
      trimmed === 'how are you' ||
      trimmed === 'what time is it' ||
      trimmed === 'time' ||
      trimmed === "what's the time" ||
      trimmed === "what is today's date" ||
      trimmed === 'date' ||
      trimmed === 'who created you' ||
      trimmed === 'what is 2 + 2' ||
      trimmed === '2 + 2'
    ) {
      return true;
    }
    return false;
  }

  private detectTemporalIntent(lower: string): TemporalIntent {
    if (
      lower.includes('vs') ||
      lower.includes('versus') ||
      lower.includes('compare') ||
      (lower.includes('historical') && (lower.includes('active') || lower.includes('current'))) ||
      lower.includes('over time')
    ) {
      return 'ALL';
    }
    if (lower.includes('currently') || lower.includes('right now') || lower.includes('active') || lower.includes('latest')) {
      return 'CURRENT';
    }
    if (lower.includes('previously') || lower.includes('historical') || lower.includes('history') || lower.includes('past') || lower.includes('originally')) {
      return 'HISTORICAL';
    }
    if (lower.includes('before ') || lower.includes('prior to')) {
      return 'BEFORE';
    }
    if (lower.includes('after ') || lower.includes('since ')) {
      return 'AFTER';
    }
    if (lower.includes('at the time of') || lower.includes('in 2024') || lower.includes('in 2025') || lower.includes('in 2026')) {
      return 'AT_TIME';
    }
    if (lower.includes('recently') || lower.includes('recent')) {
      return 'RECENT';
    }
    return 'CURRENT';
  }

  private inferComplexity(intent: ContextIntent, lower: string): TaskComplexity {
    if (intent === 'CASUAL_CONVERSATION' || intent === 'IDENTITY') return 'SIMPLE';
    if (intent === 'RESEARCH_QUERY' || lower.includes('comprehensive') || lower.includes('exhaustive')) return 'RESEARCH_DEEP';
    if (intent === 'GOAL_MISSION' || lower.includes('complex') || lower.includes('multi-step')) return 'COMPLEX';
    return 'STANDARD';
  }

  private extractCandidateEntities(text: string): string[] {
    const candidates: string[] = [];
    // Extract capitalized words or known proper nouns
    const matches = text.match(/\b[A-Z][a-zA-Z0-9_.:\-]{2,}\b/g);
    if (matches) {
      for (const m of matches) {
        if (!['What', 'When', 'Where', 'Why', 'How', 'Who', 'Which', 'Can', 'Could', 'Will', 'Would', 'The', 'This', 'That'].includes(m)) {
          candidates.push(m);
        }
      }
    }

    if (text.toLowerCase().includes('hṛṣīkeśa') || text.toLowerCase().includes('hrisekesa')) {
      candidates.push('HṚṢĪKEŚA');
    }
    if (text.toLowerCase().includes('rushikesh')) {
      candidates.push('Rushikesh');
    }
    if (text.toLowerCase().includes('ollama')) {
      candidates.push('Ollama');
    }
    if (text.toLowerCase().includes('sqlite')) {
      candidates.push('SQLite');
    }
    if (text.toLowerCase().includes('typescript')) {
      candidates.push('TypeScript');
    }

    return Array.from(new Set(candidates));
  }
}
