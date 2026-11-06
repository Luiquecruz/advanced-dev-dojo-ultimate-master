import { useId, useState, type CSSProperties } from 'react';
import type { Track } from '@/content';
import { TRACK_GLYPHS } from './trackGlyphs';

const GRID_STEP = 6;
const REGISTRATION_MARKS = 'M24 2.5V6M24 42V45.5M2.5 24H6M42 24H45.5';

interface TrackLogoProps {
  track: Pick<Track, 'id' | 'monogram'>;
  size?: number;
  animate?: boolean;
  delayMs?: number;
  replayDelayMs?: number;
}

function traceStyle(delay: string, count: number): CSSProperties {
  return { ['--trace-delay' as string]: delay, ['--trace-count' as string]: count };
}

/**
 * Logo of a track, tinted with the track accent: its concept constellation drawn on a blueprint (grid paper, dashed
 * construction circle and registration marks). Falls back to the monogram for a track without a glyph.
 * Each time `animate` turns on, a beam of light traces the constellation lines and the key star pulses, starting and ending
 * on the static logo. `delayMs` holds back the trace that plays on mount and `replayDelayMs` every later one, so each trace
 * starts once the entrance or the carousel slide that activated the logo has finished.
 */
export function TrackLogo({ track, size = 36, animate = false, delayMs = 0, replayDelayMs = 0 }: TrackLogoProps) {
  const gridId = `track-grid${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const glyph = TRACK_GLYPHS[track.id];
  const [tracedOnMount] = useState(animate);
  const [traces, setTraces] = useState(animate ? 1 : 0);
  const [previousAnimate, setPreviousAnimate] = useState(animate);

  if (animate !== previousAnimate) {
    setPreviousAnimate(animate);
    if (animate) {
      setTraces(traces + 1);
    }
  }

  const traceDelay = `${tracedOnMount && traces === 1 ? delayMs : replayDelayMs}ms`;

  return (
    <span
      data-trail={track.id}
      className="inline-grid flex-none place-items-center overflow-hidden rounded-xl bg-accent/10 font-extrabold text-accent ring-1 ring-accent/30 ring-inset"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      {glyph ? (
        <svg viewBox="0 0 48 48" width={size} height={size} focusable="false">
          <defs>
            <pattern id={gridId} width={GRID_STEP} height={GRID_STEP} patternUnits="userSpaceOnUse">
              <path d={`M${GRID_STEP} 0H0V${GRID_STEP}`} fill="none" stroke="currentColor" strokeWidth="0.4" strokeOpacity="0.14" />
            </pattern>
          </defs>
          <rect width="48" height="48" fill={`url(#${gridId})`} />
          <circle cx="24" cy="24" r="17.5" fill="none" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.28" strokeDasharray="1.5 2.5" />
          <path d={REGISTRATION_MARKS} stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.45" />
          <g fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.9">
            {glyph.lines.map((line) => (
              <path key={line} d={line} />
            ))}
          </g>
          <g key={`stars-${traces}`} fill="currentColor" style={traceStyle(traceDelay, glyph.stars.length)}>
            {glyph.stars.map(([x, y], index) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" className={traces > 0 ? 'logo-twinkle' : undefined} style={{ ['--trace-index' as string]: index }} />
            ))}
          </g>
          {traces > 0 && (
            <g key={traces} fill="none" strokeLinecap="round" strokeLinejoin="round" className="stroke-ink" style={traceStyle(traceDelay, glyph.lines.length)}>
              {glyph.lines.map((line, index) => (
                <g key={line} style={{ ['--trace-index' as string]: index }}>
                  <path d={line} pathLength={1} strokeWidth="4" strokeOpacity="0.3" className="logo-trace" />
                  <path d={line} pathLength={1} strokeWidth="1.8" className="logo-trace" />
                </g>
              ))}
            </g>
          )}
          <circle key={`halo-${traces}`} cx={glyph.key[0]} cy={glyph.key[1]} r="4.2" fill="currentColor" fillOpacity="0.2" className={traces > 0 ? 'logo-pulse' : undefined} style={traceStyle(traceDelay, 1)} />
          <circle cx={glyph.key[0]} cy={glyph.key[1]} r="2.2" className="fill-ink" />
        </svg>
      ) : (
        track.monogram
      )}
    </span>
  );
}
