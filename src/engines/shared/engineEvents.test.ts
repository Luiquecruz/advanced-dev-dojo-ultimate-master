import { describe, expect, it, vi } from 'vitest';
import { emitEngineEvent, onEngineEvent, type EngineEvent } from './engineEvents';

describe('engine events', () => {
  it('delivers the event in order even when a subscriber throws', () => {
    const event: EngineEvent = { type: 'boot', engine: 'python', startedAt: 1, endedAt: 2 };
    const delivered: string[] = [];
    const first = vi.fn(() => { delivered.push('first'); });
    const throwing = vi.fn(() => {
      delivered.push('throwing');
      throw new Error('Subscriber failed');
    });
    const last = vi.fn(() => { delivered.push('last'); });
    const unsubscribe = [first, throwing, last].map(onEngineEvent);

    try {
      expect(() => emitEngineEvent(event)).not.toThrow();
      expect(delivered).toEqual(['first', 'throwing', 'last']);
      for (const listener of [first, throwing, last]) {
        expect(listener).toHaveBeenCalledExactlyOnceWith(event);
      }
    } finally {
      unsubscribe.forEach((stop) => stop());
    }

    emitEngineEvent(event);
    expect(delivered).toEqual(['first', 'throwing', 'last']);
  });
});
