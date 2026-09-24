/**
 * HṚṢĪKEŚA (हृषीकेश) — ChatGPT Export Format Types
 *
 * Types representing the standard exported structure of `conversations.json`
 * from an authorized ChatGPT data dump.
 */

export interface ChatGptExportMessage {
  readonly id: string;
  readonly author: {
    readonly role: 'user' | 'assistant' | 'system' | 'tool';
    readonly name?: string | null;
  };
  readonly create_time?: number | null;
  readonly update_time?: number | null;
  readonly content?: {
    readonly content_type: string;
    readonly parts: Array<string | Record<string, unknown>>;
  };
  readonly status?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface ChatGptMappingNode {
  readonly id: string;
  readonly message?: ChatGptExportMessage | null;
  readonly parent?: string | null;
  readonly children: string[];
}

export interface ChatGptExportConversation {
  readonly id: string;
  readonly title: string;
  readonly create_time: number;
  readonly update_time: number;
  readonly mapping: Record<string, ChatGptMappingNode>;
  readonly current_node?: string | null;
}

export interface ImportResult {
  readonly totalConversationsParsed: number;
  readonly totalMessagesExtracted: number;
  readonly sessionsCreated: number;
  readonly messagesStored: number;
  readonly memoriesCreated: number;
  readonly durationMs: number;
  readonly errors: string[];
}
