import type { Track } from '../content';

const LABELS: Record<string, string> = { typescript: 'TS', react: '⚛', vue: 'V', angular: 'A', 'react-state': 'S' };

/**
 * Simple monogram logo for each track.
 */
export function TrackLogo({ track, size = 36 }: { track: Pick<Track, 'id' | 'engine'>; size?: number }) {
  return (
    <span className={`track-logo track-logo-${track.id}`} style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden="true">
      {LABELS[track.id] ?? LABELS[track.engine]}
    </span>
  );
}
