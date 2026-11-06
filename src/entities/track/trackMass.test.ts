import { describe, expect, it } from 'vitest';
import { availableTracks } from '@/content';
import { DEFAULT_TRACK_MASS, trackContent, trackMass } from './trackMass';

describe('trackMass', () => {
  it('gives the track with the most content the full mass', () => {
    const heaviest = availableTracks.reduce((best, track) => (trackContent(track) > trackContent(best) ? track : best));
    expect(trackMass(heaviest.id)).toBe(1);
  });

  it('grows with the amount of content', () => {
    const sorted = [...availableTracks].sort((first, second) => trackContent(first) - trackContent(second));
    const lighter = sorted[0];
    const heavier = sorted[sorted.length - 1];
    expect(trackMass(lighter.id)).toBeLessThan(trackMass(heavier.id));
    expect(trackMass(lighter.id)).toBeGreaterThan(0);
  });

  it('falls back to the default without a known track', () => {
    expect(trackMass(undefined)).toBe(DEFAULT_TRACK_MASS);
    expect(trackMass('missing')).toBe(DEFAULT_TRACK_MASS);
  });
});
