import { PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { profileFor, tierForFrameTime, type Capabilities, type PerformanceTier } from '@/shared/capabilities/capabilities';
import { createGrid } from './grid';
import { createParticles } from './particles';
import type { RenderMode, SceneAPI, SceneState } from './types';

interface StateTarget {
  speed: number;
  brightness: number;
  distance: number;
}

const STATE_TARGETS: Record<SceneState, StateTarget> = {
  intro: { speed: 1, brightness: 1, distance: 8 },
  explorer: { speed: 0.75, brightness: 0.85, distance: 8 },
  curriculum: { speed: 0.45, brightness: 0.7, distance: 8 },
  activity: { speed: 0.2, brightness: 0.55, distance: 8 * 0.94 },
};

const CAMERA_FIELD_OF_VIEW = 60;
const CAMERA_HEIGHT = 0.6;
const CAMERA_TARGET = new Vector3(0, -0.4, -20);
const PARALLAX_X = 0.35;
const PARALLAX_Y = 0.2;
const STATE_RATE = 3;
const FOCUS_RATE = 5;
const POINTER_RATE = 4;
const ACCENT_SETTLE = 4.6;
const DEFAULT_ACCENT_MS = 600;
const IDLE_FRAME_SECONDS = 1 / 15;
const IDLE_SPEED_FACTOR = 0.5;
const REDUCED_MOTION_SPEED_FACTOR = 0.04;
const MAX_DELTA_SECONDS = 0.1;
const WARMUP_FRAMES = 10;
const SAMPLE_FRAMES = 90;
const DEGRADED_FRAME_MS = 24;
const DEGRADED_WINDOW_MS = 2000;
const FRAME_AVERAGE_WEIGHT = 0.05;
const STATS_AVERAGE_WEIGHT = 0.1;

let createdRenderers = 0;

function damp(current: number, target: number, rate: number, delta: number): number {
  return current + (target - current) * (1 - Math.exp(-delta * rate));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hexToVector(hex: string): Vector3 {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return new Vector3(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255);
}

/**
 * Creates the persistent ambient scene (particles and grid) on a canvas. Meant to be created once per session.
 */
export async function createScene(canvas: HTMLCanvasElement, capabilities: Capabilities): Promise<SceneAPI> {
  let tier: PerformanceTier = capabilities.tier;
  let profile = profileFor(tier, capabilities.coarsePointer);

  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
  createdRenderers++;
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  const camera = new PerspectiveCamera(CAMERA_FIELD_OF_VIEW, 1, 0.1, 120);

  const uniforms = {
    uTime: { value: 0 },
    uSpeed: { value: STATE_TARGETS.intro.speed },
    uFocus: { value: 0 },
    uBrightness: { value: STATE_TARGETS.intro.brightness },
    uPixelRatio: { value: 1 },
    uAccent: { value: new Vector3(1, 1, 1) },
  };

  const particles = createParticles(profile.particles, uniforms);
  const grid = createGrid(uniforms);
  scene.add(grid, particles);

  let state: SceneState = 'intro';
  let requestedMode: RenderMode = 'running';
  let hidden = document.hidden;
  let contextLost = false;
  let loopActive = false;
  let rendered = false;

  let speed = STATE_TARGETS.intro.speed;
  let brightness = STATE_TARGETS.intro.brightness;
  let distance = STATE_TARGETS.intro.distance;
  let focusTarget = 0;
  let pointerX = 0;
  let pointerY = 0;
  let pointerTargetX = 0;
  let pointerTargetY = 0;
  const accentTarget = new Vector3(1, 1, 1);
  let accentRate = 0;

  let lastTime: number | undefined;
  let pendingDelta = 0;
  let sampledFrames = 0;
  let sampledMs = 0;
  let averageFrameMs: number | undefined;
  let degradedSince: number | undefined;
  let statsFrameMs = 0;

  function effectiveMode(): RenderMode {
    return hidden || contextLost ? 'paused' : requestedMode;
  }

  function render(): void {
    renderer.render(scene, camera);
    rendered = true;
    canvas.dataset.ready = 'true';
  }

  function resize(): void {
    const width = canvas.clientWidth;
    const height = Math.max(canvas.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (effectiveMode() === 'paused' && !contextLost) {
      render();
    }
  }

  function applyProfile(): void {
    profile = profileFor(tier, capabilities.coarsePointer);
    const pixelRatio = Math.min(devicePixelRatio, profile.maxPixelRatio);
    renderer.setPixelRatio(pixelRatio);
    uniforms.uPixelRatio.value = pixelRatio;
    particles.geometry.setDrawRange(0, profile.particles);
    grid.visible = profile.grid === 'webgl';
    canvas.dataset.grid = profile.grid;
    canvas.dataset.tier = tier;
    resize();
  }

  function downgradeTo(next: PerformanceTier): void {
    if (next === tier) {
      return;
    }
    tier = next;
    applyProfile();
  }

  function measure(time: number, frameMs: number): void {
    if (requestedMode !== 'running') {
      return;
    }
    if (sampledFrames < WARMUP_FRAMES + SAMPLE_FRAMES) {
      sampledFrames++;
      if (sampledFrames > WARMUP_FRAMES) {
        sampledMs += frameMs;
      }
      if (sampledFrames === WARMUP_FRAMES + SAMPLE_FRAMES) {
        downgradeTo(tierForFrameTime(tier, sampledMs / SAMPLE_FRAMES));
      }
      return;
    }
    averageFrameMs = averageFrameMs === undefined ? frameMs : averageFrameMs + (frameMs - averageFrameMs) * FRAME_AVERAGE_WEIGHT;
    if (averageFrameMs <= DEGRADED_FRAME_MS) {
      degradedSince = undefined;
      return;
    }
    degradedSince ??= time;
    if (time - degradedSince > DEGRADED_WINDOW_MS) {
      downgradeTo(tierForFrameTime(tier, averageFrameMs));
      degradedSince = undefined;
      averageFrameMs = undefined;
    }
  }

  function step(delta: number): void {
    const target = STATE_TARGETS[state];
    speed = damp(speed, target.speed, STATE_RATE, delta);
    brightness = damp(brightness, target.brightness, STATE_RATE, delta);
    distance = damp(distance, target.distance, STATE_RATE, delta);
    uniforms.uFocus.value = damp(uniforms.uFocus.value, focusTarget, FOCUS_RATE, delta);
    pointerX = damp(pointerX, pointerTargetX, POINTER_RATE, delta);
    pointerY = damp(pointerY, pointerTargetY, POINTER_RATE, delta);
    if (accentRate > 0) {
      uniforms.uAccent.value.lerp(accentTarget, 1 - Math.exp(-delta * accentRate));
    }
    const motionFactor = (capabilities.reducedMotion ? REDUCED_MOTION_SPEED_FACTOR : 1) * (requestedMode === 'idle' ? IDLE_SPEED_FACTOR : 1);
    uniforms.uSpeed.value = speed * motionFactor;
    uniforms.uTime.value += delta * uniforms.uSpeed.value;
    uniforms.uBrightness.value = brightness;
    camera.position.set(pointerX * PARALLAX_X, CAMERA_HEIGHT + pointerY * PARALLAX_Y, distance);
    camera.lookAt(CAMERA_TARGET);
  }

  function tick(time: number): void {
    if (lastTime !== undefined) {
      statsFrameMs = statsFrameMs === 0 ? time - lastTime : statsFrameMs + (time - lastTime - statsFrameMs) * STATS_AVERAGE_WEIGHT;
      measure(time, time - lastTime);
      pendingDelta += Math.min((time - lastTime) / 1000, MAX_DELTA_SECONDS);
    }
    lastTime = time;
    if (requestedMode === 'idle' && pendingDelta < IDLE_FRAME_SECONDS) {
      return;
    }
    step(pendingDelta);
    pendingDelta = 0;
    render();
  }

  function applyMode(): void {
    const active = effectiveMode() !== 'paused';
    if (active === loopActive) {
      return;
    }
    loopActive = active;
    lastTime = undefined;
    pendingDelta = 0;
    renderer.setAnimationLoop(active ? tick : null);
  }

  function onVisibilityChange(): void {
    hidden = document.hidden;
    applyMode();
  }

  function onContextLost(event: Event): void {
    event.preventDefault();
    contextLost = true;
    delete canvas.dataset.ready;
    applyMode();
  }

  function onContextRestored(): void {
    contextLost = false;
    applyMode();
  }

  document.addEventListener('visibilitychange', onVisibilityChange);
  canvas.addEventListener('webglcontextlost', onContextLost);
  canvas.addEventListener('webglcontextrestored', onContextRestored);

  applyProfile();
  step(0);
  await renderer.compileAsync(scene, camera);
  applyMode();

  return {
    setAccent(hex, durationMs = DEFAULT_ACCENT_MS) {
      accentTarget.copy(hexToVector(hex));
      if (durationMs <= 0) {
        uniforms.uAccent.value.copy(accentTarget);
        accentRate = 0;
        return;
      }
      accentRate = ACCENT_SETTLE / (durationMs / 1000);
    },
    setSceneState(next) {
      state = next;
      if (!rendered) {
        ({ speed, brightness, distance } = STATE_TARGETS[next]);
        step(0);
      }
    },
    setFocus(amount) {
      focusTarget = clamp(amount, 0, 1);
      if (!rendered) {
        uniforms.uFocus.value = focusTarget;
      }
    },
    setPointer(x, y) {
      if (capabilities.reducedMotion) {
        return;
      }
      pointerTargetX = clamp(x, -1, 1);
      pointerTargetY = clamp(y, -1, 1);
    },
    setRenderMode(mode) {
      requestedMode = mode;
      applyMode();
    },
    resize,
    stats() {
      return {
        fps: statsFrameMs > 0 && loopActive ? 1000 / statsFrameMs : 0,
        frameMs: loopActive ? statsFrameMs : 0,
        tier,
        particles: profile.particles,
        pixelRatio: renderer.getPixelRatio(),
        renderMode: effectiveMode(),
        renderers: createdRenderers,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        programs: renderer.info.programs?.length ?? 0,
        drawCalls: renderer.info.render.calls,
      };
    },
    destroy() {
      renderer.setAnimationLoop(null);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      particles.geometry.dispose();
      particles.material.dispose();
      grid.geometry.dispose();
      grid.material.dispose();
      renderer.dispose();
    },
  };
}
