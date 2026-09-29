/**
 * HṚṢĪKEŚA (हृषीकेश) — Typed Event Bus
 */

import { EventEmitter } from 'node:events';
import { EventKey, EventMap, EventListener } from './event.types.js';

export class EventBus {
  private readonly emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(50);
  }

  public on<K extends EventKey>(event: K, listener: EventListener<K>): () => void {
    const wrappedListener = (payload: EventMap[K]) => {
      try {
        const result = listener(payload);
        if (result instanceof Promise) {
          result.catch((err) => {
            console.error(`Async error in EventBus listener for '${String(event)}':`, err);
          });
        }
      } catch (err) {
        console.error(`Sync error in EventBus listener for '${String(event)}':`, err);
      }
    };

    this.emitter.on(event, wrappedListener as (...args: unknown[]) => void);

    // Return unbind function
    return () => {
      this.emitter.off(event, wrappedListener as (...args: unknown[]) => void);
    };
  }

  public subscribe<K extends EventKey>(event: K, listener: EventListener<K>): () => void {
    return this.on(event, listener);
  }

  public once<K extends EventKey>(event: K, listener: EventListener<K>): void {
    this.emitter.once(event, listener as (...args: unknown[]) => void);
  }

  public emit<K extends EventKey>(event: K, payload: EventMap[K]): boolean {
    return this.emitter.emit(event, payload);
  }

  public removeAllListeners(event?: EventKey): void {
    if (event) {
      this.emitter.removeAllListeners(event);
    } else {
      this.emitter.removeAllListeners();
    }
  }

  public listenerCount(event: EventKey): number {
    return this.emitter.listenerCount(event);
  }
}
