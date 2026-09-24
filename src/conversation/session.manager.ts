/**
 * HṚṢĪKEŚA (हृषीकेश) — Durable Conversation & Session Manager
 *
 * Backed by native SQLite repositories (SessionRepository & MessageRepository)
 * with an in-memory caching tier to accelerate active conversation turns.
 */

import { randomUUID } from 'node:crypto';
import { ChatRole, ChatMessage } from '../models/interfaces/model.types.js';
import {
  SessionMessage,
  ConversationSession,
  ContextWindowPolicy,
  DEFAULT_CONTEXT_POLICY
} from './session.types.js';
import { SessionRepository } from '../persistence/repositories/session.repository.js';
import { MessageRepository } from '../persistence/repositories/message.repository.js';

export class SessionManager {
  private readonly sessionRepo?: SessionRepository;
  private readonly messageRepo?: MessageRepository;
  private readonly policy: ContextWindowPolicy;
  private readonly memoryCache = new Map<string, ConversationSession>();

  constructor(
    sessionRepoOrPolicy?: SessionRepository | ContextWindowPolicy,
    messageRepo?: MessageRepository,
    policy?: ContextWindowPolicy
  ) {
    if (sessionRepoOrPolicy && ('maxHistoryMessages' in sessionRepoOrPolicy || !('create' in sessionRepoOrPolicy))) {
      this.policy = sessionRepoOrPolicy as ContextWindowPolicy;
      this.sessionRepo = undefined;
      this.messageRepo = undefined;
    } else {
      this.sessionRepo = sessionRepoOrPolicy as SessionRepository | undefined;
      this.messageRepo = messageRepo;
      this.policy = policy || DEFAULT_CONTEXT_POLICY;
    }
  }

  public createSession(
    customId?: string,
    metadata?: Record<string, unknown>,
    title?: string
  ): ConversationSession {
    const id = customId?.trim() || randomUUID();
    const now = new Date().toISOString();

    if (this.sessionRepo) {
      this.sessionRepo.create({
        id,
        title,
        status: 'active',
        createdAt: now,
        updatedAt: now,
        metadata
      });
    }

    const session: ConversationSession = {
      id,
      title: title || null,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      messages: [],
      metadata
    };

    this.memoryCache.set(id, session);
    return session;
  }

  public getSession(id: string): ConversationSession | undefined {
    if (!id) return undefined;

    // 1. Check active memory cache
    const cached = this.memoryCache.get(id);
    if (cached) {
      return cached;
    }

    // 2. Hydrate from persistent SQLite repository
    if (this.sessionRepo) {
      const record = this.sessionRepo.findById(id);
      if (record) {
        const rawMsgs = this.messageRepo ? this.messageRepo.findBySessionId(id) : [];
        const messages: SessionMessage[] = rawMsgs.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
          model: m.model,
          provider: m.provider,
          metadata: m.metadata
        }));

        const session: ConversationSession = {
          id: record.id,
          title: record.title,
          status: record.status,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
          messages,
          metadata: record.metadata
        };

        this.memoryCache.set(id, session);
        return session;
      }
    }

    return undefined;
  }

  public getOrCreateSession(id?: string): ConversationSession {
    if (id) {
      const existing = this.getSession(id);
      if (existing) {
        return existing;
      }
    }
    return this.createSession(id);
  }

  public addMessage(
    sessionId: string,
    role: ChatRole,
    content: string,
    extra?: {
      model?: string;
      provider?: string;
      metadata?: Record<string, unknown>;
    }
  ): SessionMessage {
    const session = this.getOrCreateSession(sessionId);
    const now = new Date().toISOString();
    const msgId = randomUUID();

    if (this.messageRepo) {
      this.messageRepo.create({
        id: msgId,
        sessionId: session.id,
        role,
        content: content.trim(),
        timestamp: now,
        model: extra?.model,
        provider: extra?.provider,
        metadata: extra?.metadata
      });
    }

    if (this.sessionRepo) {
      this.sessionRepo.touch(session.id);
    }

    const message: SessionMessage = {
      id: msgId,
      role,
      content: content.trim(),
      timestamp: now,
      model: extra?.model || null,
      provider: extra?.provider || null,
      metadata: extra?.metadata || null
    };

    session.messages.push(message);
    session.updatedAt = now;

    return message;
  }

  /**
   * Returns conversation history bounded by the context window policy.
   * If a systemPrompt is provided, it is always anchored at index 0.
   */
  public getBoundedHistory(sessionId: string, systemPrompt?: string): ChatMessage[] {
    const session = this.getSession(sessionId);
    const rawMessages = session ? [...session.messages] : [];

    // Filter out previous system messages so we can cleanly control the active system instruction
    const userAndAssistantMessages = rawMessages.filter((m) => m.role !== 'system');

    // Apply conservative sliding window: keep most recent N messages
    const boundedMessages = userAndAssistantMessages.slice(-this.policy.maxHistoryMessages);

    // Apply character ceiling safety: if total characters exceed maxHistoryChars, trim older messages
    let totalChars = boundedMessages.reduce((sum, m) => sum + m.content.length, 0);
    while (boundedMessages.length > 2 && totalChars > this.policy.maxHistoryChars) {
      const removed = boundedMessages.shift();
      if (removed) {
        totalChars -= removed.content.length;
      }
    }

    const result: ChatMessage[] = [];

    if (systemPrompt && systemPrompt.trim().length > 0) {
      result.push({
        role: 'system',
        content: systemPrompt.trim(),
        timestamp: new Date().toISOString()
      });
    }

    for (const m of boundedMessages) {
      result.push({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp
      });
    }

    return result;
  }

  /**
   * Lists persisted sessions (from repository or memory cache).
   */
  public listSessions(limit: number = 50, offset: number = 0): ConversationSession[] {
    if (this.sessionRepo) {
      const records = this.sessionRepo.findAll(limit, offset);
      return records.map((r) => this.getSession(r.id)!);
    }
    return Array.from(this.memoryCache.values()).slice(offset, offset + limit);
  }

  /**
   * Clears the in-memory cache, forcing next read to hit the database.
   */
  public clearMemoryCache(): void {
    this.memoryCache.clear();
  }

  public getPolicy(): ContextWindowPolicy {
    return this.policy;
  }
}
