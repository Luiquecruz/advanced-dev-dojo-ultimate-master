import type { PerformanceTier } from '@/shared/capabilities/capabilities';

export type SceneState = 'intro' | 'explorer' | 'curriculum' | 'activity';

export type RenderMode = 'running' | 'idle' | 'paused';

export interface SceneTarget {
  state: SceneState;
  trail?: string;
  focus: number;
  renderMode: RenderMode;
}

export interface SceneStats {
  fps: number;
  frameMs: number;
  tier: PerformanceTier;
  particles: number;
  pixelRatio: number;
  renderMode: RenderMode;
  renderers: number;
  geometries: number;
  textures: number;
  programs: number;
  drawCalls: number;
}

export interface SceneAPI {
  setAccent(hex: string, durationMs?: number): void;
  setSceneState(state: SceneState): void;
  setFocus(amount: number): void;
  setPointer(x: number, y: number): void;
  setRenderMode(mode: RenderMode): void;
  resize(): void;
  stats(): SceneStats;
  destroy(): void;
}
