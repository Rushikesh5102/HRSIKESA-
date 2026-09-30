/**
 * HṚṢĪKEŚA (हृषीकेश) — Global Fast Chat Gate
 *
 * Centralized low-latency chat response gateway.
 * Enforces the core system invariant:
 * "CONVERSATIONAL RESPONSIVENESS IS INDEPENDENT OF TASK COMPLETION TIME."
 *
 * Deterministically routes messages to avoid heavyweight LLM or orchestration
 * overhead for trivial queries, and delivers instant acknowledgements for long tasks.
 */

import { ChatNormalizer } from './chat.normalizer.js';

export type FastGateIntent =
  | 'CASUAL_GREETING'
  | 'CASUAL_COURTESY'
  | 'IDENTITY_QUERY'
  | 'TIME_QUERY'
  | 'DATE_QUERY'
  | 'STATUS_QUERY'
  | 'APPROVAL_RESPONSE'
  | 'MEMORY_QUERY'
  | 'ACTION_TASK'
  | 'RESEARCH_TASK'
  | 'COMPUTER_TASK'
  | 'GOAL_COMPANY_TASK'
  | 'GENERAL_CONVERSATION';

export type ContextTier = 0 | 1 | 2 | 3 | 4 | 5;

export interface FastGateDecision {
  readonly intent: FastGateIntent;
  readonly contextTier: ContextTier;
  readonly isDeterministicInstant: boolean;
  readonly instantResponse?: string;
  readonly requiresImmediateAck: boolean;
  readonly ackResponse?: string;
  readonly skipMemoryRecall: boolean;
  readonly skipToolAttachment: boolean;
  readonly suggestedAgentId?: string;
  readonly reason: string;
}

export class FastChatGate {
  private readonly casualGreetings = new Set([
    'hi', 'hello', 'hey', 'namaste', 'pranam', 'pranaam', 'vanakkam',
    'good morning', 'good afternoon', 'good evening', 'good night',
    'hey there', 'hello there', 'greetings', 'sup', "what's up", 'whats up', 'yo',
    'radhe radhe', 'jai shri krishna', 'jai shree krishna', 'om namah shivaya', 'hari om',
    'namaskar', 'namaskaram'
  ]);

  private readonly casualCourtesies = new Set([
    'how are you', 'how r u', 'how are you doing', 'how are things', 'how is everything',
    'thanks', 'thank you', 'thank you so much', 'thanks a lot', 'thx',
    'ok', 'okay', 'great', 'awesome', 'cool', 'got it', 'understood',
    'fine', 'nice', 'perfect', 'sounds good'
  ]);

  private readonly identityPhrases = new Set([
    'who are you', 'what are you', 'what is your name',
    'who made you', 'who created you', 'who is your creator', 'who is your master',
    'what can you do', 'tell me about yourself', 'introduce yourself',
    'who are you and what do you do', 'what is hrishikesha', 'what is hrisekesa',
    'what is hṛṣīkeśa', 'what is hrshikesha', 'what does hrishikesha mean',
    'what does hṛṣīkeśa mean', 'what is the meaning of hrishikesha',
    'what is the meaning of hṛṣīkeśa', 'who is hrishikesha', 'who is hṛṣīkeśa',
    'what is your purpose'
  ]);

  private readonly timePhrases = new Set([
    'what time is it', 'what is the time', 'current time', 'tell me the time',
    'time now', 'system time', 'what is current time', 'time', 'what is the current time',
    'whats the time', 'what s the time'
  ]);

  private readonly datePhrases = new Set([
    'what is the date', 'current date', 'what is today s date', 'what is todays date',
    'today s date', 'todays date', 'what day is today', 'what date is today',
    'date today', 'date', 'what is the current date'
  ]);

  /**
   * Deterministically classifies incoming user message and provides instant routing decision.
   */
  public evaluate(userMessage: string, creatorName = 'Rushikesh Pattiwar'): FastGateDecision {
    const norm = ChatNormalizer.normalize(userMessage);
    const classification = norm.classificationText;
    const cleanedPrompt = norm.cleanedPrompt;
    const rawLower = cleanedPrompt.toLowerCase();

    // 0. High-Priority Interrupt / Cancellation Check
    if (rawLower === 'stop' || rawLower === 'cancel' || rawLower === 'abort' || rawLower === 'pause' || rawLower === 'halt') {
      return {
        intent: 'STATUS_QUERY',
        contextTier: 0,
        isDeterministicInstant: true,
        instantResponse: '🛑 **Operation Stopped:** Any active generation or background task has been safely interrupted.',
        requiresImmediateAck: false,
        skipMemoryRecall: true,
        skipToolAttachment: true,
        reason: 'Immediate high-priority cancellation command.'
      };
    }

    // 1. Casual Greetings -> Deterministic instant response (< 5ms)
    if (this.isGreeting(classification, rawLower)) {
      const greetings = [
        `Namaste, Master ${creatorName.split(' ')[0]}. I’m Rishi (HṚṢĪKEŚA) — online, alert, and ready for your command.`,
        `Greetings! Sovereign OS HṚṢĪKEŚA is fully operational. I’m Rishi — how may I assist you today?`,
        `Hello ${creatorName.split(' ')[0]}! I’m Rishi. All subsystems and specialized agent workforce are at your service.`
      ];
      const selected = greetings[Math.floor(Math.random() * greetings.length)];

      return {
        intent: 'CASUAL_GREETING',
        contextTier: 0,
        isDeterministicInstant: true,
        instantResponse: selected,
        requiresImmediateAck: false,
        skipMemoryRecall: true,
        skipToolAttachment: true,
        reason: 'Deterministic fast-path for casual greeting.'
      };
    }

    // 2. Casual Courtesies -> Deterministic instant response (< 5ms)
    if (this.casualCourtesies.has(classification)) {
      let resp = `I am operating at peak efficiency with all nominal parameters verified. How can I assist you?`;
      if (classification.startsWith('thank') || classification === 'thx') {
        resp = `You are most welcome, Master ${creatorName.split(' ')[0]}. Always honored to serve.`;
      } else if (classification === 'ok' || classification === 'okay' || classification === 'got it' || classification === 'cool' || classification === 'great' || classification === 'perfect') {
        resp = `Acknowledged. Standing by for your next directive.`;
      }

      return {
        intent: 'CASUAL_COURTESY',
        contextTier: 0,
        isDeterministicInstant: true,
        instantResponse: resp,
        requiresImmediateAck: false,
        skipMemoryRecall: true,
        skipToolAttachment: true,
        reason: 'Deterministic fast-path for conversational courtesy.'
      };
    }

    // 3. System Identity Queries -> Deterministic instant response (< 5ms) with English self-name "Rishi"
    if (this.isIdentityQuery(classification, rawLower)) {
      const isCreatorQuery = rawLower.includes('who created') || rawLower.includes('who made') || rawLower.includes('creator') || rawLower.includes('master');
      const identityText = isCreatorQuery
        ? `I was conceived and engineered by **${creatorName}** (Creator & Sole Master). Canonical System Identity: **HṚṢĪKEŚA** (हृषीकेश / HRISHIKESHA). In English, I’m **Rishi**.`
        : `I am **HṚṢĪKEŚA** (हृषीकेश), a sovereign personal AI operating system and autonomous workforce control plane created exclusively for ${creatorName}. In English, I’m **Rishi**. I orchestrate a 33-agent specialized workforce, persistent sovereign memory, local neural models, computer automation, and enterprise governance.`;

      return {
        intent: 'IDENTITY_QUERY',
        contextTier: 1,
        isDeterministicInstant: true,
        instantResponse: identityText,
        requiresImmediateAck: false,
        skipMemoryRecall: true,
        skipToolAttachment: true,
        reason: 'Deterministic identity explanation with English self-name Rishi.'
      };
    }

    // 3b. Simple Deterministic Arithmetic (e.g. 2+2, 2 + 2, what is 2+2) -> TTFB < 2ms
    const mathResult = this.evaluateSimpleArithmetic(rawLower);
    if (mathResult !== null) {
      return {
        intent: 'CASUAL_COURTESY',
        contextTier: 0,
        isDeterministicInstant: true,
        instantResponse: mathResult,
        requiresImmediateAck: false,
        skipMemoryRecall: true,
        skipToolAttachment: true,
        reason: 'Deterministic fast-path arithmetic evaluation.'
      };
    }

    // 4. Deterministic Dynamic Live Time Query (< 2ms)
    if (this.isTimeQuery(classification, rawLower)) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      const isoStr = now.toISOString();

      return {
        intent: 'TIME_QUERY',
        contextTier: 0,
        isDeterministicInstant: true,
        instantResponse: `The current system time is **${timeStr} IST** (ISO: \`${isoStr}\`).`,
        requiresImmediateAck: false,
        skipMemoryRecall: true,
        skipToolAttachment: true,
        reason: 'Deterministic live system clock query.'
      };
    }

    // 5. Deterministic Dynamic Live Date Query (< 2ms)
    if (this.isDateQuery(classification, rawLower)) {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      return {
        intent: 'DATE_QUERY',
        contextTier: 0,
        isDeterministicInstant: true,
        instantResponse: `Today is **${dateStr}**.`,
        requiresImmediateAck: false,
        skipMemoryRecall: true,
        skipToolAttachment: true,
        reason: 'Deterministic live system date query.'
      };
    }

    // 6. Status Queries
    if (
      rawLower.includes('system status') ||
      rawLower.includes('workforce status') ||
      rawLower.includes('show goal progress') ||
      rawLower === 'status' ||
      rawLower === 'runtime status'
    ) {
      return {
        intent: 'STATUS_QUERY',
        contextTier: 2,
        isDeterministicInstant: false,
        requiresImmediateAck: false,
        skipMemoryRecall: true,
        skipToolAttachment: true,
        reason: 'System or workforce status query.'
      };
    }

    // 7. Approvals / Human-in-the-loop
    if (
      rawLower === 'approve' ||
      rawLower === 'approved' ||
      rawLower === 'proceed' ||
      rawLower === 'reject' ||
      rawLower === 'deny'
    ) {
      return {
        intent: 'APPROVAL_RESPONSE',
        contextTier: 1,
        isDeterministicInstant: false,
        requiresImmediateAck: false,
        skipMemoryRecall: true,
        skipToolAttachment: true,
        reason: 'Human approval or rejection response.'
      };
    }

    // 8. Computer / GUI Automation Tasks -> Immediate Acknowledgement
    if (
      (rawLower.includes('open notepad') ||
        rawLower.includes('launch app') ||
        rawLower.includes('click on') ||
        rawLower.includes('type into') ||
        rawLower.includes('take a screenshot')) &&
      !rawLower.startsWith('how') &&
      !rawLower.startsWith('what')
    ) {
      return {
        intent: 'COMPUTER_TASK',
        contextTier: 3,
        isDeterministicInstant: false,
        requiresImmediateAck: true,
        ackResponse: `⚡ **Action Accepted:** Initiating computer automation task "${cleanedPrompt}". Computer Operator agent is engaging.`,
        skipMemoryRecall: true,
        skipToolAttachment: false,
        suggestedAgentId: 'garuda',
        reason: 'Computer GUI automation request requires immediate acknowledgement and async execution.'
      };
    }

    // 9. Research Tasks -> Immediate Acknowledgement
    const hasResearchIntent =
      rawLower.startsWith('research ') ||
      rawLower.startsWith('investigate ') ||
      rawLower.startsWith('find information about ') ||
      rawLower.startsWith('look up the latest information about ') ||
      rawLower.startsWith('what are the latest developments in ') ||
      rawLower.startsWith('deep dive into ') ||
      rawLower.startsWith('analyze ') ||
      rawLower.startsWith('verify whether ') ||
      rawLower.startsWith('find reliable sources about ') ||
      rawLower.startsWith('find out about ') ||
      rawLower.includes('market research') ||
      rawLower.includes('literature review') ||
      (rawLower.startsWith('compare ') && (rawLower.includes(' and ') || rawLower.includes(' vs ') || rawLower.includes(' with '))) ||
      rawLower.includes('using multiple sources');

    if (hasResearchIntent && cleanedPrompt.length > 10) {
      return {
        intent: 'RESEARCH_TASK',
        contextTier: 4,
        isDeterministicInstant: false,
        requiresImmediateAck: true,
        ackResponse: `🔍 **Research Initiated:** Rahu (Research & Intelligence) is gathering sources and synthesizing analysis for: *"${cleanedPrompt}"*.`,
        skipMemoryRecall: false,
        skipToolAttachment: false,
        suggestedAgentId: 'rahu',
        reason: 'Deep research task delegated to Rahu with immediate non-blocking acknowledgement.'
      };
    }

    // 10. Goal & Company Operations -> Immediate Acknowledgement
    if (
      rawLower.startsWith('goal:') ||
      rawLower.includes('create a goal') ||
      rawLower.includes('create a company') ||
      rawLower.includes('create an autonomous company') ||
      rawLower.includes('build a complete') ||
      rawLower.includes('launch a project') ||
      rawLower.includes('full company goal')
    ) {
      return {
        intent: 'GOAL_COMPANY_TASK',
        contextTier: 5,
        isDeterministicInstant: false,
        requiresImmediateAck: true,
        ackResponse: `🏛️ **Operation Accepted:** Creating structured goal / company architecture for: *"${cleanedPrompt}"*. Workforce orchestration started in background.`,
        skipMemoryRecall: false,
        skipToolAttachment: false,
        suggestedAgentId: 'aja',
        reason: 'Autonomous company / multi-step goal creation with immediate non-blocking acknowledgement.'
      };
    }

    // 11. Check if query genuinely requests tool actions
    const hasExplicitToolIntent =
      rawLower.includes('browse') ||
      rawLower.includes('open url') ||
      rawLower.includes('web search') ||
      rawLower.includes('read file') ||
      rawLower.includes('write file') ||
      rawLower.includes('list directory') ||
      rawLower.includes('run command') ||
      rawLower.includes('terminal') ||
      rawLower.includes('execute script');

    if (hasExplicitToolIntent) {
      return {
        intent: 'ACTION_TASK',
        contextTier: 2,
        isDeterministicInstant: false,
        requiresImmediateAck: false,
        skipMemoryRecall: true,
        skipToolAttachment: false,
        reason: 'Actionable query requiring external tools.'
      };
    }

    // 12. Standard / Reasoning Conversational Turn (Simple chat — zero tools attached)
    const isMemoryRelated = rawLower.includes('remember') || rawLower.includes('memory') || rawLower.includes('preference');

    return {
      intent: 'GENERAL_CONVERSATION',
      contextTier: isMemoryRelated ? 3 : 1,
      isDeterministicInstant: false,
      requiresImmediateAck: false,
      skipMemoryRecall: !isMemoryRelated,
      skipToolAttachment: true, // Simple chat does NOT attach tool schemas!
      reason: isMemoryRelated
        ? 'Memory query requiring preference context.'
        : 'Simple conversational/reasoning turn — minimal Tier 1 context, zero tool schemas.'
    };
  }

  private isGreeting(classification: string, rawLower: string): boolean {
    if (this.casualGreetings.has(classification)) return true;
    const words = classification.split(' ');
    if (words.length > 0 && this.casualGreetings.has(words[0])) {
      if (words.length <= 4 && !rawLower.includes('?') && !rawLower.includes('what') && !rawLower.includes('how')) {
        return true;
      }
    }
    return false;
  }

  private isIdentityQuery(classification: string, rawLower: string): boolean {
    if (this.identityPhrases.has(classification)) return true;
    if (
      rawLower.includes('who created you') ||
      rawLower.includes('who made you') ||
      rawLower.includes('who is your creator') ||
      rawLower.includes('who is your master') ||
      rawLower.includes('who are you') ||
      rawLower.includes('what is hrishikesha') ||
      rawLower.includes('what is hrisekesa') ||
      rawLower.includes('what is hṛṣīkeśa') ||
      rawLower.includes('what are you') ||
      rawLower.includes('tell me about yourself') ||
      rawLower.includes('introduce yourself')
    ) {
      if (!rawLower.includes('explain') && !rawLower.includes('compare')) {
        return true;
      }
    }
    return false;
  }

  private isTimeQuery(classification: string, rawLower: string): boolean {
    if (this.timePhrases.has(classification)) return true;
    if (
      classification === 'time' ||
      rawLower.includes('what time') ||
      rawLower.includes('tell me the time') ||
      rawLower.includes('tell me time') ||
      rawLower.includes('current time') ||
      rawLower.includes('exact time') ||
      rawLower.includes('system time') ||
      rawLower.includes('time on the system') ||
      rawLower.includes('time right now') ||
      rawLower.includes('time is it') ||
      rawLower.includes('whats the time') ||
      rawLower.includes('what s the time') ||
      rawLower.includes('what is the time')
    ) {
      if (
        !rawLower.includes('last time') &&
        !rawLower.includes('how much time') &&
        !rawLower.includes('how many times') &&
        !rawLower.includes('time taken') &&
        !rawLower.includes('time complexity') &&
        !rawLower.includes('time machine')
      ) {
        return true;
      }
    }
    return false;
  }

  private isDateQuery(classification: string, rawLower: string): boolean {
    if (this.datePhrases.has(classification)) return true;
    if (
      classification === 'date' ||
      rawLower.includes('what date') ||
      rawLower.includes('todays date') ||
      rawLower.includes("today's date") ||
      rawLower.includes('current date') ||
      rawLower.includes('what is the date') ||
      rawLower.includes('what day is today') ||
      rawLower.includes('day of the week') ||
      rawLower.includes('date today') ||
      rawLower.includes('date is it')
    ) {
      if (
        !rawLower.includes('update') &&
        !rawLower.includes('candidate') &&
        !rawLower.includes('expiry') &&
        !rawLower.includes('due date')
      ) {
        return true;
      }
    }
    return false;
  }

  private evaluateSimpleArithmetic(rawLower: string): string | null {
    let clean = rawLower.trim();
    clean = clean.replace(/[?!.]+$/, '').trim();

    // Match direct binary arithmetic: e.g. "2+2", "2 + 2", "15 * 4", "100 / 5", "50 - 12"
    const match = clean.match(/^(\d+(?:\.\d+)?)\s*([\+\-\*\/])\s*(\d+(?:\.\d+)?)$/);
    if (!match) return null;

    const num1 = parseFloat(match[1]);
    const op = match[2];
    const num2 = parseFloat(match[3]);

    let res: number;
    switch (op) {
      case '+': res = num1 + num2; break;
      case '-': res = num1 - num2; break;
      case '*': res = num1 * num2; break;
      case '/':
        if (num2 === 0) return 'Cannot divide by zero.';
        res = num1 / num2;
        break;
      default:
        return null;
    }

    return `${clean} = **${res}**`;
  }
}
