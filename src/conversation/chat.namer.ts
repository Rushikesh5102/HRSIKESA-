/**
 * HṚṢĪKEŚA (हृषीकेश) — Foundation Performance & Execution (FP-01)
 * Asynchronous Automatic Chat Namer (ChatGPT-Style)
 *
 * Rules:
 * - 2 to 6 words
 * - Descriptive
 * - No "New Chat" or generic titles
 * - Non-blocking (runs in background)
 * - Editable & persisted
 * - Uses deterministic extraction or tiny model
 */

import { SessionManager } from './session.manager.js';

export class ChatNamer {
  /**
   * Generates a concise title from the user's first prompt and updates the session title asynchronously.
   */
  public static async nameSessionAsync(
    sessionId: string,
    firstUserPrompt: string,
    sessionManager: SessionManager
  ): Promise<string> {
    const session = sessionManager.getSession(sessionId);
    // If already has a non-default title, do not overwrite
    if (session?.title && session.title !== 'New Chat' && session.title !== 'Untitled Conversation') {
      return session.title;
    }

    const title = this.extractDeterministicTitle(firstUserPrompt);
    sessionManager.updateTitle(sessionId, title);
    return title;
  }

  public static extractDeterministicTitle(prompt: string): string {
    let cleaned = prompt.trim();

    // Strip leading question markers, greetings, commands
    cleaned = cleaned.replace(/^(please|can you|could you|help me|tell me|explain|what is|what are|what's|how to|write a|create a|build me a|generate a|give me a)\s+/i, '');
    cleaned = cleaned.replace(/^(hi|hello|hey|greetings|namaste)\b[,!\s]*/i, '');
    cleaned = cleaned.replace(/[?!.]+$/, '');

    // Handle well-known queries
    const lower = prompt.toLowerCase().trim();
    if (lower === 'hello' || lower === 'hi' || lower === 'hey') {
      return 'General Greeting';
    }
    if (lower.includes('who are you') || lower.includes('who created you')) {
      return 'Identity & Origins';
    }
    if (lower.includes('time') && lower.includes('what')) {
      return 'System Time Query';
    }
    if (lower.includes('date') && lower.includes('what')) {
      return 'System Date Query';
    }
    if (lower.includes('2+2') || lower.includes('2 + 2')) {
      return 'Basic Arithmetic (2+2)';
    }

    // Split words
    const words = cleaned.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) {
      return 'Quick Conversation';
    }

    // Pick 2 to 6 meaningful words
    const selectedWords = words.slice(0, 5);
    const capitalized = selectedWords.map(w => {
      // Keep acronyms uppercase, capitalize first letter of normal words
      if (w.toUpperCase() === w && w.length > 1) return w;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    });

    let result = capitalized.join(' ');
    if (result.length > 40) {
      result = result.slice(0, 37) + '...';
    }

    return result || 'Interactive Session';
  }
}
