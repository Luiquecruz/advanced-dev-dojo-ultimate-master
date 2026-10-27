import { useEffect, useRef, useState } from 'react';
import { detectCapabilities } from '../capabilities/capabilities';
import type { SceneAPI } from '../scene/types';
import { PerfOverlay } from './PerfOverlay';
import type { SceneTarget } from './router-adapter';

const IDLE_TIMEOUT_MS = 1500;
const PERF_DEBUG = new URLSearchParams(location.search).get('debug') === 'perf';

function whenIdle(callback: () => void): () => void {
  if ('requestIdleCallback' in window) {
    const handle = requestIdleCallback(callback, { timeout: IDLE_TIMEOUT_MS });
    return () => cancelIdleCallback(handle);
  }
  const handle = setTimeout(callback, 1);
  return () => clearTimeout(handle);
}

function rgbTripletToHex(triplet: string): string {
  return `#${triplet
    .trim()
    .split(/\s+/)
    .map((channel) => Number(channel).toString(16).padStart(2, '0'))
    .join('')}`;
}

/**
 * Persistent ambient background: a static CSS layer plus the WebGL scene, loaded after the first paint.
 */
export function AmbientScene({ state, trail, focus, renderMode }: SceneTarget) {
  const layerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const accentApplied = useRef(false);
  const [capabilities] = useState(detectCapabilities);
  const [scene, setScene] = useState<SceneAPI | null>(null);

  useEffect(() => {
    if (!capabilities.webgl2) {
      return;
    }
    let disposed = false;
    let created: SceneAPI | undefined;
    const cancel = whenIdle(() => {
      import('../scene/scene')
        .then(({ createScene }) => createScene(canvasRef.current!, capabilities))
        .then((api) => {
          if (disposed) {
            api.destroy();
            return;
          }
          created = api;
          setScene(api);
        })
        .catch(() => undefined);
    });
    return () => {
      disposed = true;
      cancel();
      created?.destroy();
    };
  }, [capabilities]);

  useEffect(() => {
    scene?.setSceneState(state);
  }, [scene, state]);

  useEffect(() => {
    scene?.setFocus(focus);
  }, [scene, focus]);

  useEffect(() => {
    scene?.setRenderMode(renderMode);
  }, [scene, renderMode]);

  useEffect(() => {
    if (!scene) {
      return;
    }
    const accent = rgbTripletToHex(getComputedStyle(layerRef.current!).getPropertyValue('--accent-rgb'));
    scene.setAccent(accent, accentApplied.current ? undefined : 0);
    accentApplied.current = true;
  }, [scene, trail]);

  useEffect(() => {
    if (!scene) {
      return;
    }
    const onResize = () => scene.resize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [scene]);

  useEffect(() => {
    if (!scene || !capabilities.fineHover) {
      return;
    }
    const onPointerMove = (event: PointerEvent) => scene.setPointer((event.clientX / innerWidth) * 2 - 1, 1 - (event.clientY / innerHeight) * 2);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, [scene, capabilities]);

  return (
    <>
      {PERF_DEBUG && <PerfOverlay scene={scene} />}
      <div ref={layerRef} data-trail={trail} aria-hidden="true" className="group pointer-events-none fixed inset-0 -z-10 bg-ambient transition-[--accent] duration-600 ease-out">
        <div className="absolute inset-0 bg-ambient-grid transition-opacity duration-(--dur-expand) group-has-[canvas[data-ready][data-grid=webgl]]:opacity-0" />
        <canvas ref={canvasRef} className="absolute inset-0 size-full opacity-0 transition-opacity duration-700 ease-out data-ready:opacity-100" />
      </div>
    </>
  );
}
