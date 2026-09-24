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

export type FastGateIntent =
  | 'CASUAL_GREETING'
  | 'CASUAL_COURTESY'
  | 'IDENTITY_QUERY'
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
    'hey there', 'hello there', 'greetings', 'sup', "what's up", 'yo'
  ]);

  private readonly casualCourtesies = new Set([
    'how are you', 'how are you?', 'how r u', 'how are you doing',
    'how are you doing?', 'how are things', 'how is everything',
    'thanks', 'thank you', 'thank you so much', 'thanks a lot', 'thx',
    'ok', 'okay', 'great', 'awesome', 'cool', 'got it', 'understood',
    'fine', 'nice', 'perfect', 'sounds good'
  ]);

  private readonly identityPhrases = new Set([
    'who are you', 'who are you?', 'what is your name', 'what is your name?',
    'who made you', 'who created you', 'what are you', 'what can you do'
  ]);

  /**
   * Deterministically classifies incoming user message and provides instant routing decision.
   */
  public evaluate(userMessage: string, creatorName = 'Rushikesh Pattiwar'): FastGateDecision {
    const trimmed = userMessage.trim();
    const lower = trimmed.toLowerCase().replace(/[,.!?:;]/g, '').trim();

    // 1. Casual Greetings -> Deterministic instant response (< 5ms)
    if (this.casualGreetings.has(lower)) {
      const greetings = [
        `Namaste, Master ${creatorName.split(' ')[0]}. HṚṢĪKEŚA is online, alert, and ready for your command.`,
        `Greetings! Sovereign OS HṚṢĪKEŚA is fully operational. How may I assist you today?`,
        `Hello ${creatorName.split(' ')[0]}. All subsystems and specialized agent workforce are at your service.`
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
    if (this.casualCourtesies.has(lower)) {
      let resp = `I am operating at peak efficiency with all nominal parameters verified. How can I assist you?`;
      if (lower.startsWith('thank') || lower === 'thx') {
        resp = `You are most welcome, Master ${creatorName.split(' ')[0]}. Always honored to serve.`;
      } else if (lower === 'ok' || lower === 'okay' || lower === 'got it' || lower === 'cool' || lower === 'great' || lower === 'perfect') {
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

    // 3. System Identity Queries -> Deterministic instant response (< 5ms)
    if (this.identityPhrases.has(lower)) {
      return {
        intent: 'IDENTITY_QUERY',
        contextTier: 1,
        isDeterministicInstant: true,
        instantResponse: `I am **HṚṢĪKEŚA** (हृषीकेश), a sovereign personal AI operating system and autonomous workforce control plane created exclusively for ${creatorName}. I orchestrate a 17-agent specialized workforce, persistent sovereign memory, local neural models, computer automation, and enterprise governance.`,
        requiresImmediateAck: false,
        skipMemoryRecall: true,
        skipToolAttachment: true,
        reason: 'Deterministic identity explanation.'
      };
    }

    const rawLower = trimmed.toLowerCase();

    // 4. Status Queries
    if (
      rawLower.includes('system status') ||
      rawLower.includes('workforce status') ||
      rawLower.includes('show goal progress') ||
      rawLower === 'status'
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

    // 5. Approvals / Human-in-the-loop
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

    // 6. Computer / GUI Automation Tasks -> Immediate Acknowledgement
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
        ackResponse: `⚡ **Action Accepted:** Initiating computer automation task "${trimmed}". Computer Operator agent is engaging.`,
        skipMemoryRecall: true,
        skipToolAttachment: false,
        suggestedAgentId: 'garuda',
        reason: 'Computer GUI automation request requires immediate acknowledgement and async execution.'
      };
    }

    // 7. Research Tasks -> Immediate Acknowledgement
    if (
      (rawLower.startsWith('research ') ||
        rawLower.startsWith('investigate ') ||
        rawLower.startsWith('find out about ') ||
        rawLower.includes('market research') ||
        rawLower.includes('literature review')) &&
      trimmed.length > 25
    ) {
      return {
        intent: 'RESEARCH_TASK',
        contextTier: 4,
        isDeterministicInstant: false,
        requiresImmediateAck: true,
        ackResponse: `🔍 **Research Initiated:** Rahu (Research & Intelligence) is gathering sources and synthesizing analysis for: *"${trimmed}"*.`,
        skipMemoryRecall: false,
        skipToolAttachment: false,
        suggestedAgentId: 'rahu',
        reason: 'Deep research task delegated to Rahu with immediate non-blocking acknowledgement.'
      };
    }

    // 8. Goal & Company Operations -> Immediate Acknowledgement
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
        ackResponse: `🏛️ **Operation Accepted:** Creating structured goal / company architecture for: *"${trimmed}"*. Workforce orchestration started in background.`,
        skipMemoryRecall: false,
        skipToolAttachment: false,
        suggestedAgentId: 'aja',
        reason: 'Autonomous company / multi-step goal creation with immediate non-blocking acknowledgement.'
      };
    }

    // 9. Short general informational query (< 50 chars)
    if (trimmed.length < 50 && !rawLower.includes('remember') && !rawLower.includes('memory')) {
      return {
        intent: 'GENERAL_CONVERSATION',
        contextTier: 1,
        isDeterministicInstant: false,
        requiresImmediateAck: false,
        skipMemoryRecall: true,
        skipToolAttachment: true,
        reason: 'Short casual conversational query — Tier 1 minimal context.'
      };
    }

    // 10. Default General Conversation with Context
    return {
      intent: 'GENERAL_CONVERSATION',
      contextTier: 2,
      isDeterministicInstant: false,
      requiresImmediateAck: false,
      skipMemoryRecall: false,
      skipToolAttachment: false,
      reason: 'Standard conversational or reasoning turn.'
    };
  }
}
