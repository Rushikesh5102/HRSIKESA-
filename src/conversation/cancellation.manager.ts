/**
 * HṚṢĪKEŚA (हृषीकेश) — Foundation Performance & Execution (FP-01)
 * Cancellation & Interrupt Token Manager
 *
 * Provides real cancellation tokens across:
 * - Conversation pipeline
 * - Model generation
 * - Tool execution
 * - Voice TTS playback
 */

import { CancellationToken } from '../inference/backend.types.js';

class StandardCancellationToken implements CancellationToken {
  public isCancelled = false;
  public reason?: string;
  private readonly callbacks: Array<() => void> = [];

  public onCancel(callback: () => void): void {
    if (this.isCancelled) {
      callback();
    } else {
      this.callbacks.push(callback);
    }
  }

  public cancel(reason = 'Operation cancelled by operator.'): void {
    if (this.isCancelled) return;
    this.isCancelled = true;
    this.reason = reason;
    for (const cb of this.callbacks) {
      try {
        cb();
      } catch {
        // Safe callback execution
      }
    }
  }
}

export class CancellationManager {
  private static instance: CancellationManager | null = null;
  private readonly sessionTokens: Map<string, StandardCancellationToken> = new Map();

  public static getInstance(): CancellationManager {
    if (!this.instance) {
      this.instance = new CancellationManager();
    }
    return this.instance;
  }

  /**
   * Checks if an incoming user prompt is an urgent interrupt / stop command.
   */
  public static isInterruptCommand(message: string): boolean {
    const trimmed = message.trim().toUpperCase();
    const interruptWords = ['STOP', 'CANCEL', 'ABORT', 'PAUSE', 'HALT', 'STOP NOW', 'PLEASE STOP'];
    return interruptWords.includes(trimmed);
  }

  /**
   * Creates and registers a new CancellationToken for a session.
   */
  public createTokenForSession(sessionId: string): CancellationToken {
    // If an existing token was active, cancel it before creating a new one
    const existing = this.sessionTokens.get(sessionId);
    if (existing && !existing.isCancelled) {
      existing.cancel('Superseded by new turn.');
    }

    const token = new StandardCancellationToken();
    this.sessionTokens.set(sessionId, token);
    return token;
  }

  /**
   * Immediately aborts active operations in the session.
   */
  public cancelSession(sessionId: string, reason = 'Operator interrupt.'): boolean {
    const token = this.sessionTokens.get(sessionId);
    if (token && !token.isCancelled) {
      token.cancel(reason);
      return true;
    }
    return false;
  }

  public getToken(sessionId: string): CancellationToken | undefined {
    return this.sessionTokens.get(sessionId);
  }

  public clearSession(sessionId: string): void {
    this.sessionTokens.delete(sessionId);
  }
}
