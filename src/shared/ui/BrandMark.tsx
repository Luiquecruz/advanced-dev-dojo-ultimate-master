import clsx from 'clsx';
import { useId } from 'react';

const TARGET_STAR = 'M32 18L33.19 29.14L36.24 27.76L34.86 30.81L41.5 32L34.86 33.19L36.24 36.24L33.19 34.86L32 46L30.81 34.86L27.76 36.24L29.14 33.19L22.5 32L29.14 30.81L27.76 27.76L30.81 29.14Z';
const DISTANT_STARS: Array<[number, number, number]> = [
  [14.5, 16, 1.6],
  [49, 49.5, 1.3],
];
const HALO_STOPS: Array<[number, string, number]> = [
  [0, '#121c2a', 0.92],
  [0.45, '#0a0f18', 0.68],
  [0.75, '#0a0f18', 0.18],
  [1, '#0a0f18', 0],
];

/**
 * Constela Mission mark: an eight-point guiding star inside a tilted orbit, a probe on the orbit and two distant stars, over a
 * radial halo that fades to transparent, so it blends into any background like a soft drop shadow.
 * With `animated`, the orbit draws itself in on mount and the probe pulses.
 */
export function BrandMark({ size = 36, animated = false, className }: { size?: number; animated?: boolean; className?: string }) {
  const id = `brand${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const stroke = `${id}-stroke`;
  const halo = `${id}-halo`;
  const glow = `${id}-glow`;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" focusable="false" className={clsx('flex-none', className)}>
      <defs>
        <linearGradient id={stroke} x1="8" y1="56" x2="56" y2="8" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4dd9ff" />
          <stop offset="0.55" stopColor="#8c8cff" />
          <stop offset="1" stopColor="#d29cff" />
        </linearGradient>
        <radialGradient id={halo} cx="32" cy="32" r="32" gradientUnits="userSpaceOnUse">
          {HALO_STOPS.map(([offset, color, opacity]) => (
            <stop key={offset} offset={offset} stopColor={color} stopOpacity={opacity} />
          ))}
        </radialGradient>
        <radialGradient id={glow} cx="32" cy="32" r="16" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#8c8cff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#8c8cff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="32" fill={`url(#${halo})`} />
      <g transform="translate(32 32) scale(1.12) translate(-32 -32)">
        <circle cx="32" cy="32" r="16" fill={`url(#${glow})`} />
        <ellipse cx="32" cy="32" rx="23" ry="9.5" transform="rotate(-28 32 32)" pathLength={1} fill="none" stroke={`url(#${stroke})`} strokeWidth="3" className={animated ? 'draw-stroke' : undefined} />
        <circle cx="51.8" cy="26.9" r="4" fill="#d29cff" className={animated ? 'animate-pulse-soft motion-reduce:animate-none' : undefined} />
        {DISTANT_STARS.map(([x, y, radius]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={radius} fill="#93a3ba" />
        ))}
        <path d={TARGET_STAR} fill="#eaf2fc" />
      </g>
    </svg>
  );
}
