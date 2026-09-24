/**
 * HṚṢĪKEŚA (हृषीकेश) — Conversation & Session Types
 */

import { ChatRole, ChatMessage } from '../models/interfaces/model.types.js';

export interface SessionMessage extends ChatMessage {
  readonly id: string;
  readonly role: ChatRole;
  readonly content: string;
  readonly timestamp: string;
  readonly model?: string | null;
  readonly provider?: string | null;
  readonly metadata?: Record<string, unknown> | null;
}

export interface ConversationSession {
  readonly id: string;
  readonly title?: string | null;
  readonly status?: string;
  readonly createdAt: string;
  updatedAt: string;
  readonly messages: SessionMessage[];
  metadata?: Record<string, unknown> | null;
}

export interface ContextWindowPolicy {
  /** Maximum number of history messages to retain in active prompt window */
  readonly maxHistoryMessages: number;
  /** Maximum approximate character count for history window (safe proxy for tokens) */
  readonly maxHistoryChars: number;
}

export const DEFAULT_CONTEXT_POLICY: ContextWindowPolicy = {
  maxHistoryMessages: 12, // Conservative ~6 user/assistant turns
  maxHistoryChars: 8000   // Approximately 2000 tokens, well below 4096 limit
};
