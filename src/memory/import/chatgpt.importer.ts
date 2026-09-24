/**
 * HṚṢĪKEŚA (हृषीकेश) — ChatGPT History Ingestion Parser
 *
 * Ingestion subsystem capable of parsing, normalizing, segmenting,
 * and importing authorized ChatGPT `conversations.json` data dumps
 * into persistent sessions and 14-tier memory with strict provenance tracking.
 */

import { randomUUID } from 'node:crypto';
import {
  ChatGptExportConversation,
  ChatGptMappingNode,
  ImportResult
} from './chatgpt.types.js';
import { SessionRepository } from '../../persistence/repositories/session.repository.js';
import { MessageRepository } from '../../persistence/repositories/message.repository.js';
import { MemoryRepository } from '../../persistence/repositories/memory.repository.js';
import { ChatRole } from '../../models/interfaces/model.types.js';
import { ILogger } from '../../core/logging/logger.types.js';

export interface NormalizedTurn {
  readonly id: string;
  readonly role: ChatRole;
  readonly content: string;
  readonly timestamp: string;
}

export interface NormalizedConversation {
  readonly id: string;
  readonly title: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly turns: NormalizedTurn[];
}

export class ChatGptImporter {
  private readonly sessionRepo?: SessionRepository;
  private readonly messageRepo?: MessageRepository;
  private readonly memoryRepo?: MemoryRepository;
  private readonly logger?: ILogger;

  constructor(
    sessionRepo?: SessionRepository,
    messageRepo?: MessageRepository,
    memoryRepo?: MemoryRepository,
    logger?: ILogger
  ) {
    this.sessionRepo = sessionRepo;
    this.messageRepo = messageRepo;
    this.memoryRepo = memoryRepo;
    this.logger = logger?.child('ChatGptImporter');
  }

  /**
   * Parses raw JSON string (content of conversations.json) into strongly typed records.
   */
  public parseExportJson(rawJson: string): ChatGptExportConversation[] {
    const data = JSON.parse(rawJson);
    if (!Array.isArray(data)) {
      throw new Error('Invalid ChatGPT export format: Root element must be an array of conversations.');
    }
    return data as ChatGptExportConversation[];
  }

  /**
   * Normalizes a ChatGPT conversation graph into a linear chronological thread.
   */
  public normalizeConversation(convo: ChatGptExportConversation): NormalizedConversation {
    const createdAt = convo.create_time
      ? new Date(convo.create_time * 1000).toISOString()
      : new Date().toISOString();
    const updatedAt = convo.update_time
      ? new Date(convo.update_time * 1000).toISOString()
      : createdAt;

    const turns: NormalizedTurn[] = [];

    // Linearize the mapping tree by finding leaf or using current_node and traversing parents
    const mapping = convo.mapping || {};
    let activeNodeId = convo.current_node;

    if (!activeNodeId || !mapping[activeNodeId]) {
      // Find the deepest leaf node
      const nodes = Object.values(mapping);
      const leaves = nodes.filter((n) => !n.children || n.children.length === 0);
      activeNodeId = leaves[leaves.length - 1]?.id;
    }

    if (activeNodeId && mapping[activeNodeId]) {
      const nodePath: ChatGptMappingNode[] = [];
      let current: ChatGptMappingNode | undefined = mapping[activeNodeId];

      while (current) {
        nodePath.unshift(current);
        current = current.parent ? mapping[current.parent] : undefined;
      }

      for (const node of nodePath) {
        const msg = node.message;
        if (!msg || !msg.content || !msg.content.parts) {
          continue;
        }

        const roleStr = msg.author?.role;
        let role: ChatRole = 'user';
        if (roleStr === 'assistant') role = 'assistant';
        else if (roleStr === 'system') role = 'system';
        else role = 'user';

        // Extract and combine parts
        const textParts: string[] = [];
        for (const part of msg.content.parts) {
          if (typeof part === 'string' && part.trim().length > 0) {
            textParts.push(part.trim());
          }
        }

        const content = textParts.join('\n\n').trim();
        if (content.length === 0) {
          continue;
        }

        const timestamp = msg.create_time
          ? new Date(msg.create_time * 1000).toISOString()
          : createdAt;

        turns.push({
          id: msg.id || randomUUID(),
          role,
          content,
          timestamp
        });
      }
    }

    return {
      id: convo.id || randomUUID(),
      title: convo.title || 'Imported Conversation',
      createdAt,
      updatedAt,
      turns
    };
  }

  /**
   * Imports normalized conversations into persistent SQLite repositories with provenance tags.
   */
  public importConversations(
    conversations: ChatGptExportConversation[],
    options: { dryRun?: boolean; createEpisodicMemories?: boolean } = {}
  ): ImportResult {
    const start = Date.now();
    let totalMessagesExtracted = 0;
    let sessionsCreated = 0;
    let messagesStored = 0;
    let memoriesCreated = 0;
    const errors: string[] = [];

    this.logger?.info(`Starting ChatGPT ingestion for ${conversations.length} conversation(s) (dryRun: ${!!options.dryRun})`);

    for (const raw of conversations) {
      try {
        const normalized = this.normalizeConversation(raw);
        totalMessagesExtracted += normalized.turns.length;

        if (options.dryRun || !this.sessionRepo || !this.messageRepo) {
          continue;
        }

        // Store Session
        const sessionId = `chatgpt-${normalized.id}`;
        this.sessionRepo.create({
          id: sessionId,
          title: normalized.title,
          status: 'archived',
          createdAt: normalized.createdAt,
          updatedAt: normalized.updatedAt,
          metadata: {
            source: 'chatgpt_export',
            originalId: normalized.id,
            importedAt: new Date().toISOString()
          }
        });
        sessionsCreated++;

        // Store Messages with strict ordinal sequencing
        let ordinal = 0;
        for (const turn of normalized.turns) {
          this.messageRepo.create({
            id: randomUUID(),
            sessionId,
            role: turn.role,
            content: turn.content,
            timestamp: turn.timestamp,
            model: 'chatgpt-imported',
            provider: 'openai-export',
            ordinal: ordinal++,
            metadata: {
              imported: true,
              source: 'chatgpt_export'
            }
          });
          messagesStored++;
        }

        // Segment & extract episodic memory if enabled
        if (options.createEpisodicMemories && this.memoryRepo && normalized.turns.length > 0) {
          const userTurns = normalized.turns.filter((t) => t.role === 'user');
          const summarySnippet = userTurns.slice(0, 3).map((t) => t.content.slice(0, 100)).join(' | ');

          this.memoryRepo.store({
            id: randomUUID(),
            tier: 'conversational_episodic',
            key: `episode_${sessionId}`,
            content: JSON.stringify({
              title: normalized.title,
              sessionId,
              messageCount: normalized.turns.length,
              preview: summarySnippet,
              importedAt: new Date().toISOString()
            }),
            source: 'chatgpt_export',
            provenance: 'imported',
            confidence: 0.9,
            metadata: { originalId: normalized.id }
          });
          memoriesCreated++;
        }
      } catch (err) {
        const errStr = err instanceof Error ? err.message : String(err);
        errors.push(`Failed to import conversation [${raw.id}]: ${errStr}`);
        this.logger?.warn(`Import error: ${errStr}`);
      }
    }

    const durationMs = Date.now() - start;
    this.logger?.info(
      `ChatGPT import completed in ${durationMs}ms: ${sessionsCreated} sessions, ${messagesStored} messages, ${memoriesCreated} memories.`
    );

    return {
      totalConversationsParsed: conversations.length,
      totalMessagesExtracted,
      sessionsCreated,
      messagesStored,
      memoriesCreated,
      durationMs,
      errors
    };
  }
}
