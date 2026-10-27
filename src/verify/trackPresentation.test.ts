// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { tracks } from '../content';

const TOKENS = readFileSync(resolve(import.meta.dirname, '../shared/design/tokens.css'), 'utf8');
const SURFACES = { void: '#0a0f18', panel: '#121c2a', elevated: '#1b293a' };
const ON_ACCENT = '#0a0f18';
const MIN_CONTRAST = 4.5;
const MIN_HUE_DISTANCE = 30;

type Rgb = [number, number, number];

function parseHex(hex: string): Rgb {
  return [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16)) as Rgb;
}

function luminance(rgb: Rgb): number {
  const [red, green, blue] = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(first: Rgb, second: Rgb): number {
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

function hue([red, green, blue]: Rgb): number {
  const [r, g, b] = [red / 255, green / 255, blue / 255];
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  if (delta === 0) {
    return 0;
  }
  const sector = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return (sector * 60 + 360) % 360;
}

const accents = new Map(
  [...TOKENS.matchAll(/\[data-trail='([a-z0-9-]+)'\]\s*\{\s*--accent:\s*(#[0-9a-f]{6});\s*--accent-rgb:\s*([\d ]+);/gi)].map(([, id, hex, triplet]) => [id, { hex, triplet: triplet.trim() }]),
);

describe('track presentation', () => {
  it.each(tracks.map((track) => [track.id] as const))('%s has an accent rule in tokens.css', (id) => {
    expect(accents.has(id)).toBe(true);
  });

  it.each([...accents].map(([id, accent]) => [id, accent] as const))('%s keeps --accent-rgb in sync with --accent', (_, accent) => {
    expect(accent.triplet).toBe(parseHex(accent.hex).join(' '));
  });

  it.each([...accents].map(([id, accent]) => [id, accent] as const))('%s reaches AA on every surface and under dark text', (_, accent) => {
    const color = parseHex(accent.hex);
    for (const surface of Object.values(SURFACES)) {
      expect(contrast(color, parseHex(surface))).toBeGreaterThanOrEqual(MIN_CONTRAST);
    }
    expect(contrast(parseHex(ON_ACCENT), color)).toBeGreaterThanOrEqual(MIN_CONTRAST);
  });

  it('keeps accents apart in hue', () => {
    const entries = [...accents];
    const crowded = entries.flatMap(([id, accent], index) =>
      entries.slice(index + 1).flatMap(([otherId, other]) => {
        const distance = Math.abs(hue(parseHex(accent.hex)) - hue(parseHex(other.hex)));
        return Math.min(distance, 360 - distance) < MIN_HUE_DISTANCE ? [`${id}/${otherId}`] : [];
      }),
    );
    expect(crowded).toEqual([]);
  });
});
