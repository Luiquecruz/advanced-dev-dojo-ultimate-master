import { describe, expect, it } from 'vitest';
import { profileFor, tierForFrameTime } from './capabilities';

describe('tierForFrameTime', () => {
  it('keeps the tier while frames stay under 24 ms', () => {
    expect(tierForFrameTime('high', 16)).toBe('high');
  });

  it('drops one tier between 24 and 33 ms', () => {
    expect(tierForFrameTime('high', 28)).toBe('mid');
    expect(tierForFrameTime('mid', 28)).toBe('low');
  });

  it('goes straight to low above 33 ms', () => {
    expect(tierForFrameTime('high', 40)).toBe('low');
  });
});

describe('profileFor', () => {
  it('gives coarse pointers a smaller particle budget', () => {
    expect(profileFor('high', true).particles).toBeLessThan(profileFor('high', false).particles);
  });

  it('caps the pixel ratio and uses the CSS grid on the low tier', () => {
    expect(profileFor('low', false)).toEqual({ particles: 600, maxPixelRatio: 1, grid: 'css' });
  });
});
