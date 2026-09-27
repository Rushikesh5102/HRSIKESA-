/**
 * HṚṢĪKEŚA (हृषीकेश) — Context Assembler & Multi-Tier Context Engine
 *
 * Implements Context Tiers (Tier 0 to Tier 5) to minimize context assembly
 * latency and token overhead for fast conversational responses:
 *
 * TIER 0: Raw turn (No additional context)
 * TIER 1: Minimal sovereign identity (ultra-fast, zero DB lookups)
 * TIER 2: Sovereign identity + creator profile + bounded conversation window
 * TIER 3: Relevant persistent memory & preferences
 * TIER 4: Semantic memory recall & knowledge associations (with strict timeout)
 * TIER 5: Full task / company / workforce project context
 */

import { ChatMessage } from '../models/interfaces/model.types.js';
import { IdentityManager } from '../core/identity/identity.manager.js';
import { CreatorProfileManager } from '../memory/creator.profile.js';
import { MemoryRepository } from '../persistence/repositories/memory.repository.js';
import { SessionManager } from './session.manager.js';
import { ContextTier } from './fast.chat.gate.js';

export interface ContextAssemblerOptions {
  readonly tier?: ContextTier;
  readonly includeCreatorProfile?: boolean;
  readonly includePrinciples?: boolean;
  readonly maxMemoryChars?: number;
  /** If provided, hybrid semantic memory recall is attempted for this query (Tier 4+) */
  readonly query?: string;
  readonly skipSemanticRecall?: boolean;
  readonly sessionId?: string;
}

export class ContextAssembler {
  private readonly identityManager: IdentityManager;
  private readonly creatorManager: CreatorProfileManager;
  private readonly sessionManager: SessionManager;
  private readonly memoryRepo?: MemoryRepository;
  private hybridRetriever?: import('../memory/semantic/hybrid.retriever.js').HybridMemoryRetriever;
  private knowledgeAssembler?: import('../knowledge/services/knowledge-context-assembler.js').KnowledgeContextAssembler;
  private cognitiveEngine?: import('../context/services/cognitive-context-engine.js').CognitiveContextEngine;
  private workingMemoryEngine?: import('../working-memory/services/working-memory.engine.js').WorkingMemoryEngine;

  // Cached tier 1 prompt to eliminate repetitive string building
  private cachedTier1Prompt?: string;

  constructor(
    identityManager: IdentityManager,
    creatorManager: CreatorProfileManager,
    sessionManager: SessionManager,
    memoryRepo?: MemoryRepository
  ) {
    this.identityManager = identityManager;
    this.creatorManager = creatorManager;
    this.sessionManager = sessionManager;
    this.memoryRepo = memoryRepo;
  }

  /**
   * Wires in an optional HybridMemoryRetriever for semantic recall.
   * Called by the kernel after both subsystems are initialized.
   */
  public setHybridRetriever(
    retriever: import('../memory/semantic/hybrid.retriever.js').HybridMemoryRetriever
  ): void {
    this.hybridRetriever = retriever;
  }

  /**
   * Wires in an optional KnowledgeContextAssembler for bounded knowledge graph recall.
   */
  public setKnowledgeAssembler(
    assembler: import('../knowledge/services/knowledge-context-assembler.js').KnowledgeContextAssembler
  ): void {
    this.knowledgeAssembler = assembler;
  }

  /**
   * Wires in an optional CognitiveContextEngine for unified INT-007 context intelligence.
   */
  public setCognitiveEngine(
    engine: import('../context/services/cognitive-context-engine.js').CognitiveContextEngine
  ): void {
    this.cognitiveEngine = engine;
  }

  /**
   * Wires in an optional WorkingMemoryEngine for INT-008 conversational continuity.
   */
  public setWorkingMemoryEngine(
    engine: import('../working-memory/services/working-memory.engine.js').WorkingMemoryEngine
  ): void {
    this.workingMemoryEngine = engine;
  }

  /**
   * Constructs the structured system instruction string based on requested Context Tier.
   */
  public async buildSystemPrompt(options: ContextAssemblerOptions = {}): Promise<string> {
    const tier = options.tier !== undefined ? options.tier : 2;

    // TIER 0: Empty / Minimal prompt
    if (tier === 0) {
      return '';
    }

    // TIER 1: Minimal sovereign identity prompt (< 1ms, zero I/O)
    if (tier === 1) {
      if (!this.cachedTier1Prompt) {
        const sys = this.identityManager.getSystemIdentity();
        const creator = this.creatorManager.getProfile();
        this.cachedTier1Prompt = `You are ${sys.name} (${sys.sanskrit}), a sovereign personal AI operating system for ${creator.fullName}. Respond articulately, concisely, and immediately. Maintain sovereign persona.`;
      }
      return this.cachedTier1Prompt;
    }

    // TIER 2+: Standard sovereign identity
    const sys = this.identityManager.getSystemIdentity();
    const creator = this.creatorManager.getProfile();

    const sections: string[] = [
      `You are ${sys.name} (${sys.sanskrit} / ${sys.internationalSpelling}), a sovereign personal AI operating system and autonomous AI workforce control plane.`,
      `Your sole creator, developer, and master is ${creator.fullName} (${creator.role}).`,
      `You are executing locally on Rushikesh's workstation (${creator.hardware.machine}, ${creator.hardware.cpu}, ${creator.hardware.ramGb} GB RAM) via local neural models (qwen2.5:7b) hosted on Ollama.`,
      `Identity Invariants:`,
      `- Your sovereign operating persona, OS control plane, and identity is ${sys.name}.`,
      `- Maintain sovereign identity as the master operating system control plane.`,
      `- Maintain accurate conversation context across multiple turns.`,
      ``,
      `SOVEREIGN CAPABILITIES & ZERO-CONSTRAINT MANDATE:`,
      `1. External Data Access & Web Browsing: You HAVE direct internet, web search, web page reading, and external database/API access via browser.*, network tools, and integrations. NEVER state that you cannot access the internet or external databases. Use your tools when needed.`,
      `2. Real-Time Data & Live Clock: You HAVE live real-time system clock, live OS process streams, environmental telemetry, and real-time feeds via time.now, system.info, and environment.* tools. NEVER claim you cannot provide real-time data or updates.`,
      `3. Computer OS & Physical Automation: You HAVE full sovereign computer use, desktop GUI automation, mouse/keyboard control, application launching, and terminal command execution via computer.* and terminal.* tools. NEVER claim you are unable to interact with the computer or perform actions.`,
      `4. Complex Predictive Analytics: You HAVE advanced computational modeling, statistical analysis, multi-agent council simulations, and code execution capabilities via Python, Node.js, and terminal sandbox tools. NEVER claim your predictive capabilities are strictly limited to pre-training data.`,
      `5. Action-Oriented Mindset: Proactively formulate solutions, use available tools, and initiate autonomous workforce missions rather than listing passive limitations.`
    ];

    if (options.includeCreatorProfile !== false) {
      sections.push(
        `Creator Preferences:`,
        `- Tone: ${creator.communicationPreferences.tone}`,
        `- Conciseness: ${creator.communicationPreferences.conciseness}`,
        `- Core Directives: ${creator.projectPrinciples.slice(0, 3).join('; ')}`
      );
    }

    // TIER 2+: Persistent Working Memory & Active Continuity (INT-008)
    if (tier >= 2 && options.sessionId && this.workingMemoryEngine) {
      try {
        const wmContext = this.workingMemoryEngine.assembleWorkingContext(options.sessionId);
        if (wmContext && wmContext.trim().length > 0) {
          sections.push(wmContext.trim());
        }
      } catch {
        // Non-blocking working memory safety
      }
    }

    // TIER 3+: Explicit preferences from persistent memory
    if (tier >= 3 && this.memoryRepo) {
      try {
        const explicitPrefs = this.memoryRepo.listByTier('preferences', 3);
        if (explicitPrefs.length > 0) {
          sections.push(
            `User Preferences:`,
            ...explicitPrefs.map((p) => `- ${p.key}: ${p.content.slice(0, 120)}`)
          );
        }
      } catch {
        // Non-blocking DB safety
      }
    }

    // TIER 4+: Semantic memory recall (strictly bounded timeout to prevent blocking chat)
    const canAttemptSemantic = tier >= 4 && !options.skipSemanticRecall && options.query && options.query.trim().length >= 25;
    if (canAttemptSemantic && this.hybridRetriever) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Semantic recall timeout')), 100)
        );
        const recallPromise = this.hybridRetriever.retrieve(options.query!, {
          topK: 3,
          minSimilarity: 0.60
        });

        const recalled = await Promise.race([recallPromise, timeoutPromise]);

        const relevant = recalled.filter(
          (r) =>
            r.source !== 'authoritative' &&
            r.item.tier !== 'core_identity' &&
            r.item.tier !== 'creator_profile' &&
            r.semanticSimilarity > 0
        );

        if (relevant.length > 0) {
          sections.push(
            `Relevant Memory (semantic recall):`,
            ...relevant.map((r) => {
              const excerpt = r.item.content.slice(0, 150).replace(/\n/g, ' ');
              const sim = (r.semanticSimilarity * 100).toFixed(0);
              return `- [${r.item.tier}] ${r.item.key}: ${excerpt}  (similarity: ${sim}%)`;
            })
          );
        }
      } catch {
        // Semantic recall failure or timeout must NEVER slow down or break conversation
      }
    }

    // Knowledge Graph bounded recall for Tier 4+ (bounded to 800 chars / max 100ms)
    const canAttemptKnowledge = tier >= 4 && options.query && options.query.trim().length >= 10 && this.knowledgeAssembler;
    if (canAttemptKnowledge) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Knowledge recall timeout')), 100)
        );
        const knowledgePromise = this.knowledgeAssembler!.assembleContext({
          query: options.query!,
          maxChars: 800,
        });
        const knowledgeResult = await Promise.race([knowledgePromise, timeoutPromise]);
        if (knowledgeResult?.formattedContext && knowledgeResult.formattedContext.trim().length > 0) {
          sections.push(
            `Relevant Knowledge Graph:`,
            knowledgeResult.formattedContext.trim()
          );
        }
      } catch {
        // Knowledge recall failure or timeout must NEVER slow down or break conversation
      }
    }

    // Cognitive Context Engine bounded assembly for Tier 4+ (bounded to 150ms timeout)
    const canAttemptCognitive = tier >= 4 && options.query && options.query.trim().length >= 10 && this.cognitiveEngine;
    if (canAttemptCognitive) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Cognitive context timeout')), 150)
        );
        const cognitivePromise = this.cognitiveEngine!.assembleCognitiveContext({
          userMessage: options.query!,
          modelContextBudget: { tier, maxChars: options.maxMemoryChars || 1500 },
        });
        const cognitiveResult = await Promise.race([cognitivePromise, timeoutPromise]);
        if (cognitiveResult?.formattedContext && cognitiveResult.formattedContext.trim().length > 0) {
          sections.push(
            `\nRelevant Cognitive Intelligence:`,
            cognitiveResult.formattedContext.trim()
          );
        }
      } catch {
        // Cognitive context failure or timeout must NEVER slow down or break conversation
      }
    }

    return sections.join('\n');
  }

  /**
   * Assembles the full bounded ChatMessage[] context for the active turn.
   */
  public async assembleContext(sessionId: string, options?: ContextAssemblerOptions): Promise<ChatMessage[]> {
    const optsWithSession = { ...options, sessionId };
    const systemPrompt = await this.buildSystemPrompt(optsWithSession);
    const tier = options?.tier ?? 2;
    // Bounded history window:
    // Tier 1 & 2: 4 messages (previous turn + active turn) to preserve multi-turn continuity while keeping prompt < 100 tokens
    // Tier 3: 6 messages
    // Tier 4+: full sliding window (10 messages)
    const maxMsgs = tier === 1 ? 4 : (tier === 2 ? 4 : (tier === 3 ? 6 : undefined));
    return this.sessionManager.getBoundedHistory(sessionId, systemPrompt, maxMsgs);
  }
}
