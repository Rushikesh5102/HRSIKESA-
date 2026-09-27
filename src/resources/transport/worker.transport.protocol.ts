/**
 * HṚṢĪKEŚA (हृषीकेश) — FP-04 Worker Transport Protocol Framing
 *
 * Implements robust 4-byte Big-Endian length-prefixed protocol framing,
 * handling packet fragmentation, reassembly, payload boundaries,
 * and malicious oversized message rejection.
 */

import { TransportMessage } from './worker.transport.types.js';

export class TransportProtocolFraming {
  public static readonly DEFAULT_MAX_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
  public static readonly PROTOCOL_VERSION = '1.0.0';

  private buffer: Buffer = Buffer.alloc(0);
  private readonly maxPayloadBytes: number;

  constructor(maxPayloadBytes = TransportProtocolFraming.DEFAULT_MAX_PAYLOAD_BYTES) {
    this.maxPayloadBytes = maxPayloadBytes;
  }

  /**
   * Encodes a typed transport message into a framed buffer: [4-byte length][JSON bytes].
   */
  public static encode<T>(message: TransportMessage<T>): Buffer {
    const jsonStr = JSON.stringify(message);
    const jsonBytes = Buffer.from(jsonStr, 'utf8');
    const frame = Buffer.alloc(4 + jsonBytes.length);
    frame.writeUInt32BE(jsonBytes.length, 0);
    jsonBytes.copy(frame, 4);
    return frame;
  }

  /**
   * Feeds incoming socket chunks into the framing buffer and extracts complete messages.
   */
  public pushChunk(chunk: Buffer): TransportMessage[] {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    const messages: TransportMessage[] = [];

    while (this.buffer.length >= 4) {
      const messageLength = this.buffer.readUInt32BE(0);

      if (messageLength > this.maxPayloadBytes) {
        this.buffer = Buffer.alloc(0);
        throw new Error(
          `Transport framing violation: Message size ${messageLength} bytes exceeds maximum allowed limit ${this.maxPayloadBytes} bytes.`
        );
      }

      if (this.buffer.length < 4 + messageLength) {
        // Need more data from socket
        break;
      }

      const messageBytes = this.buffer.subarray(4, 4 + messageLength);
      this.buffer = this.buffer.subarray(4 + messageLength);

      try {
        const jsonStr = messageBytes.toString('utf8');
        const parsed = JSON.parse(jsonStr) as TransportMessage;
        if (!parsed.header || !parsed.header.type) {
          throw new Error('Malformed transport message: missing required header fields.');
        }
        messages.push(parsed);
      } catch (err: any) {
        throw new Error(`Failed to decode transport message: ${err.message}`);
      }
    }

    return messages;
  }

  public reset(): void {
    this.buffer = Buffer.alloc(0);
  }
}
