export type SceneState = 'intro' | 'explorer' | 'curriculum' | 'activity';

export type RenderMode = 'running' | 'idle' | 'paused';

export interface SceneAPI {
  setAccent(hex: string, durationMs?: number): void;
  setSceneState(state: SceneState): void;
  setFocus(amount: number): void;
  setPointer(x: number, y: number): void;
  setRenderMode(mode: RenderMode): void;
  resize(): void;
  destroy(): void;
}
