import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { EventBus } from '../src/core/events/event-bus.js';

describe('Event Bus Subsystem', () => {
  test('should subscribe and emit typed events', () => {
    const bus = new EventBus();
    const received: string[] = [];

    bus.on('system.started', (payload) => {
      received.push(payload.version);
    });

    bus.emit('system.started', {
      timestamp: new Date().toISOString(),
      version: '0.2.0',
      host: '127.0.0.1',
      port: 4200
    });

    assert.equal(received.length, 1);
    assert.equal(received[0], '0.2.0');
  });

  test('should support unregistering listener via returned function', () => {
    const bus = new EventBus();
    let count = 0;

    const unbind = bus.on('model.registered', () => {
      count++;
    });

    bus.emit('model.registered', {
      providerId: 'test',
      modelId: 'm1',
      displayName: 'Model 1',
      isLocal: true
    });

    assert.equal(count, 1);

    unbind();

    bus.emit('model.registered', {
      providerId: 'test',
      modelId: 'm2',
      displayName: 'Model 2',
      isLocal: true
    });

    assert.equal(count, 1);
  });

  test('should support once listener', () => {
    const bus = new EventBus();
    let count = 0;

    bus.once('system.ready', () => {
      count++;
    });

    bus.emit('system.ready', {
      timestamp: new Date().toISOString(),
      activeProvidersCount: 1,
      activeModelsCount: 2
    });

    bus.emit('system.ready', {
      timestamp: new Date().toISOString(),
      activeProvidersCount: 1,
      activeModelsCount: 2
    });

    assert.equal(count, 1);
  });
});
