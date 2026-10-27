import { useEffect, useState } from 'react';
import type { SceneAPI, SceneStats } from '../scene/types';
import { useMotionState } from '../ui/useMotionState';

const REFRESH_MS = 500;

/**
 * Debug panel shown with `?debug=perf`: scene frame time, tier, particle budget, GPU resources and motion state.
 */
export function PerfOverlay({ scene }: { scene: SceneAPI | null }) {
  const motionState = useMotionState();
  const [stats, setStats] = useState<SceneStats | null>(null);

  useEffect(() => {
    if (!scene) {
      return;
    }
    const timer = setInterval(() => setStats(scene.stats()), REFRESH_MS);
    return () => clearInterval(timer);
  }, [scene]);

  const rows: Array<[string, string]> = stats
    ? [
        ['fps', stats.fps.toFixed(0)],
        ['frame', `${stats.frameMs.toFixed(1)} ms`],
        ['tier', stats.tier],
        ['particles', String(stats.particles)],
        ['dpr', stats.pixelRatio.toFixed(2)],
        ['render', stats.renderMode],
        ['renderers', String(stats.renderers)],
        ['geometries', String(stats.geometries)],
        ['textures', String(stats.textures)],
        ['programs', String(stats.programs)],
        ['draw calls', String(stats.drawCalls)],
      ]
    : [['scene', 'css fallback']];

  return (
    <dl
      aria-hidden="true"
      data-perf-overlay
      className="pointer-events-none fixed bottom-3 left-3 z-[60] grid grid-cols-[auto_auto] gap-x-3 rounded-lg border border-line bg-void/90 px-3 py-2 font-mono text-[11px]/[1.5] text-ink-muted"
    >
      {[...rows, ['motion', motionState] as [string, string]].map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-ink-faint">{label}</dt>
          <dd data-stat={label} className="text-right text-ink">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
