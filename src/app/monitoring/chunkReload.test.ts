import { describe, expect, it } from 'vitest';
import { shouldReloadForChunk } from './chunkReload';

describe('shouldReloadForChunk', () => {
  it('reloads when the page never reloaded for a chunk', () => {
    expect(shouldReloadForChunk(undefined, 1000)).toBe(true);
  });

  it('does not reload again within a minute of the last reload', () => {
    expect(shouldReloadForChunk(1000, 1000 + 59000)).toBe(false);
  });

  it('reloads again after a minute', () => {
    expect(shouldReloadForChunk(1000, 1000 + 61000)).toBe(true);
  });
});
