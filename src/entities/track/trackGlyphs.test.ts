import { describe, expect, it } from 'vitest';
import { tracks } from '@/content';
import { TRACK_GLYPHS } from './trackGlyphs';

const COORDINATE = /-?\d+(?:\.\d+)?/g;
const CANVAS = 48;

describe('track glyphs', () => {
  it.each(tracks.map((track) => [track.id] as const))('%s has a concept glyph', (id) => {
    expect(TRACK_GLYPHS[id]).toBeDefined();
  });

  it.each(Object.entries(TRACK_GLYPHS))('%s stays inside the blueprint', (_, glyph) => {
    const points = [...glyph.stars, glyph.key].flat();
    const pathNumbers = glyph.lines.join(' ').replace(/A[\d.]+ [\d.]+ [\d.]+ [01] [01] /g, 'A ').match(COORDINATE)!.map(Number);
    for (const value of [...points, ...pathNumbers]) {
      expect(value).toBeGreaterThanOrEqual(6);
      expect(value).toBeLessThanOrEqual(CANVAS - 6);
    }
  });
});
