import clsx from 'clsx';
import { useId } from 'react';

const STROKES = ['M13 17.5Q32 23.5 51 17.5', 'M18 28.5H46', 'M22.5 21V49', 'M41.5 21V49'];

/**
 * Dev Dojo mark: a torii gate drawn in code strokes over a glass tile, with a terminal cursor under the beam.
 * With `animated`, the strokes draw themselves in on mount.
 */
export function BrandMark({ size = 36, animated = false, className }: { size?: number; animated?: boolean; className?: string }) {
  const id = `brand${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const stroke = `${id}-stroke`;
  const tile = `${id}-tile`;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" focusable="false" className={clsx('flex-none', className)}>
      <defs>
        <linearGradient id={stroke} x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4dd9ff" />
          <stop offset="0.55" stopColor="#8c8cff" />
          <stop offset="1" stopColor="#d29cff" />
        </linearGradient>
        <linearGradient id={tile} x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1b293a" />
          <stop offset="1" stopColor="#0a0f18" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="62" height="62" rx="18" fill={`url(#${tile})`} stroke={`url(#${stroke})`} strokeOpacity="0.45" strokeWidth="1.5" />
      <g fill="none" stroke={`url(#${stroke})`} strokeWidth="4.5" strokeLinecap="round">
        {STROKES.map((path, index) => (
          <path key={path} d={path} pathLength={1} className={animated ? 'draw-stroke' : undefined} style={animated ? { ['--enter-delay' as string]: `${index * 140}ms` } : undefined} />
        ))}
      </g>
      <path d="M28.5 45.5H35.5" stroke="#eaf2fc" strokeWidth="3" strokeLinecap="round" className={animated ? 'animate-pulse-soft motion-reduce:animate-none' : undefined} />
    </svg>
  );
}
