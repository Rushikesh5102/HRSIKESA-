/**
 * HṚṢĪKEŚA (हृषीकेश) — Sovereign Personal AI Operating System
 * Phase 7: Desktop Coordinate, Input & Safety Validator
 */

import { ScreenBounds } from '../interfaces/computer.types.js';

export class ComputerSecurityValidator {
  private static readonly MAX_TYPING_LENGTH = 500;

  /**
   * Validate mouse coordinates against screen bounds.
   */
  public static validateCoordinates(
    x: number,
    y: number,
    screen: ScreenBounds
  ): { valid: boolean; reason?: string } {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return { valid: false, reason: `Coordinates must be finite numbers: received (${x}, ${y})` };
    }

    if (x < 0 || y < 0) {
      return { valid: false, reason: `Coordinates cannot be negative: received (${x}, ${y})` };
    }

    if (x > screen.width || y > screen.height) {
      return {
        valid: false,
        reason: `Coordinates (${x}, ${y}) exceed screen resolution (${screen.width}x${screen.height})`
      };
    }

    return { valid: true };
  }

  /**
   * Validate and bound keyboard typing text payload.
   */
  public static validateTypingPayload(text: string): { valid: boolean; sanitized: string; reason?: string } {
    if (typeof text !== 'string') {
      return { valid: false, sanitized: '', reason: 'Typing payload must be a string' };
    }

    if (text.length === 0) {
      return { valid: false, sanitized: '', reason: 'Typing payload cannot be empty' };
    }

    if (text.length > this.MAX_TYPING_LENGTH) {
      return {
        valid: false,
        sanitized: '',
        reason: `Typing payload length (${text.length}) exceeds safety cap of ${this.MAX_TYPING_LENGTH} characters`
      };
    }

    return { valid: true, sanitized: text };
  }
}
