import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';

interface Geometry {
  width: number;
  height: number;
  radius: number;
}

const TRACK_WIDTH = 1;
const LIGHT_WIDTH = 1.5;
const INSET = LIGHT_WIDTH / 2;
const PATH_LENGTH = 100;
const MIN_LIGHTS = 2;
const LIGHT_SPACING_PX = 1400;
const MAX_LIGHT_UNITS = 4;
const MAX_LIGHT_PX = 80;
const MIN_DURATION_S = 6;
const LIGHT_SPEED_PX = 160;

function perimeterOf(width: number, height: number, radius: number): number {
  return 2 * (width + height - 4 * radius) + 2 * Math.PI * radius;
}

/**
 * Luminous perimeter of its positioned parent: a faint track plus points of light running along it, two per card-sized perimeter.
 * Purely decorative: ignores the pointer, sizes itself to the parent and pauses while off screen or when `paused`.
 */
export function GlowBorder({ paused = false }: { paused?: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [geometry, setGeometry] = useState<Geometry>({ width: 0, height: 0, radius: 0 });
  const [onScreen, setOnScreen] = useState(true);

  useEffect(() => {
    const container = svgRef.current!.parentElement!;
    const resizeObserver = new ResizeObserver(() => {
      setGeometry({
        width: container.clientWidth,
        height: container.clientHeight,
        radius: Number.parseFloat(getComputedStyle(container).borderTopLeftRadius),
      });
    });
    const intersectionObserver = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    resizeObserver.observe(container);
    intersectionObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, []);

  const { width, height, radius } = geometry;
  const rect = { x: INSET, y: INSET, width: Math.max(width - INSET * 2, 0), height: Math.max(height - INSET * 2, 0), rx: Math.max(radius - INSET, 0) };
  const perimeter = perimeterOf(rect.width, rect.height, rect.rx);
  const lights = Math.max(MIN_LIGHTS, Math.round(perimeter / LIGHT_SPACING_PX));
  const period = PATH_LENGTH / lights;
  const lightUnits = Math.min(MAX_LIGHT_UNITS, (MAX_LIGHT_PX / perimeter) * PATH_LENGTH);
  const durationSeconds = Math.max(MIN_DURATION_S, perimeter / lights / LIGHT_SPEED_PX);

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute inset-0 size-full overflow-visible"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      {width > 0 && (
        <>
          <rect {...rect} fill="none" strokeWidth={TRACK_WIDTH} className="stroke-accent/18" />
          <rect
            {...rect}
            pathLength={PATH_LENGTH}
            fill="none"
            strokeWidth={LIGHT_WIDTH}
            strokeLinecap="round"
            strokeDasharray={`${lightUnits.toFixed(3)} ${(period - lightUnits).toFixed(3)}`}
            style={{ animationDuration: `${durationSeconds.toFixed(2)}s`, ['--glow-period' as string]: period.toFixed(3) }}
            className={clsx('animate-glow-run stroke-accent motion-reduce:animate-none motion-reduce:opacity-40', (paused || !onScreen) && '[animation-play-state:paused]')}
          />
        </>
      )}
    </svg>
  );
}
