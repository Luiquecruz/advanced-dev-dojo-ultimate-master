import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';

interface Geometry {
  width: number;
  height: number;
  radius: number;
}

interface LightLayer {
  width: number;
  opacity: number;
  length: number;
}

const TRACK_WIDTH = 1;
const INSET = 0.75;
const PATH_LENGTH = 100;
const MIN_LIGHTS = 2;
const LIGHT_SPACING_PX = 1400;
const MAX_LIGHT_UNITS = 7;
const MAX_LIGHT_PX = 140;
const MIN_DURATION_S = 11;
const LIGHT_SPEED_PX = 90;
const LIGHT_LAYERS: LightLayer[] = [
  { width: 8, opacity: 0.05, length: 1 },
  { width: 3.5, opacity: 0.09, length: 0.72 },
  { width: 1.2, opacity: 0.2, length: 0.45 },
];

function perimeterOf(width: number, height: number, radius: number): number {
  return 2 * (width + height - 4 * radius) + 2 * Math.PI * radius;
}

/**
 * Luminous perimeter of its positioned parent: a faint track plus soft points of light drifting along it, two per
 * card-sized perimeter. Each light is three stacked strokes (wide faint halo, mid layer, thin core) of decreasing length,
 * centred on each other, which fakes a diffuse glow without an SVG blur filter (a filter would re-rasterize the whole
 * border every frame). Deliberately dim and slow so it adds atmosphere without drawing the eye.
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
          <rect {...rect} fill="none" strokeWidth={TRACK_WIDTH} className="stroke-accent/10" />
          <g className="stroke-accent motion-reduce:opacity-50">
            {LIGHT_LAYERS.map((layer) => {
              const dash = lightUnits * layer.length;
              return (
                <rect
                  key={layer.width}
                  {...rect}
                  pathLength={PATH_LENGTH}
                  fill="none"
                  strokeWidth={layer.width}
                  strokeOpacity={layer.opacity}
                  strokeLinecap="round"
                  strokeDasharray={`${dash.toFixed(3)} ${(period - dash).toFixed(3)}`}
                  style={{
                    animationDuration: `${durationSeconds.toFixed(2)}s`,
                    ['--glow-period' as string]: period.toFixed(3),
                    ['--glow-shift' as string]: ((lightUnits - dash) / 2).toFixed(3),
                  }}
                  className={clsx('animate-glow-run motion-reduce:animate-none', (paused || !onScreen) && '[animation-play-state:paused]')}
                />
              );
            })}
          </g>
        </>
      )}
    </svg>
  );
}
