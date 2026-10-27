import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTilt } from './tilt';

const LIMITS = { x: 4, y: 6 };

describe('createTilt', () => {
  let frames: FrameRequestCallback[] = [];
  let now = 0;

  const runFrames = (count: number) => {
    for (let index = 0; index < count; index++) {
      now += 16;
      const pending = frames;
      frames = [];
      pending.forEach((callback) => callback(now));
    }
  };

  beforeEach(() => {
    frames = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback));
  });

  afterEach(() => vi.unstubAllGlobals());

  it('eases towards the target and never exceeds the limits', () => {
    const target = document.createElement('div');
    const tilt = createTilt(() => target, LIMITS);
    tilt.setTarget(5, -5);
    runFrames(120);
    expect(Number(target.style.getPropertyValue('--tilt-y'))).toBe(LIMITS.y);
    expect(Number(target.style.getPropertyValue('--tilt-x'))).toBe(-LIMITS.x);
    tilt.destroy();
  });

  it('moves the written properties when the target changes', () => {
    const first = document.createElement('div');
    const second = document.createElement('div');
    let current = first;
    const tilt = createTilt(() => current, LIMITS);
    tilt.setTarget(1, 0);
    runFrames(2);
    current = second;
    runFrames(2);
    expect(first.style.getPropertyValue('--tilt-y')).toBe('');
    expect(second.style.getPropertyValue('--tilt-y')).not.toBe('');
    tilt.destroy();
  });

  it('freezes in place on hold', () => {
    const target = document.createElement('div');
    const tilt = createTilt(() => target, LIMITS);
    tilt.setTarget(1, 0);
    runFrames(3);
    tilt.hold();
    const held = target.style.getPropertyValue('--tilt-y');
    runFrames(10);
    expect(target.style.getPropertyValue('--tilt-y')).toBe(held);
    tilt.destroy();
  });
});
