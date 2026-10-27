import type { Track } from '../content';

const LABELS: Record<string, string> = { typescript: 'TS', react: '⚛', vue: 'V', angular: 'A', 'react-state': 'S' };

/**
 * Monogram logo of a track, tinted with the track accent.
 */
export function TrackLogo({ track, size = 36 }: { track: Pick<Track, 'id' | 'engine'>; size?: number }) {
  return (
    <span
      data-trail={track.id}
      className="inline-grid flex-none place-items-center rounded-xl bg-accent/12 font-extrabold text-accent ring-1 ring-accent/30 ring-inset"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      {LABELS[track.id] ?? LABELS[track.engine]}
    </span>
  );
}
