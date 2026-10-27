import type { TrackId } from '../content';
import type { RenderMode, SceneState } from '../scene/types';
import type { Route } from './route';

export interface SceneTarget {
  state: SceneState;
  trail?: TrackId;
  focus: number;
  renderMode: RenderMode;
}

const CURRICULUM_FOCUS = 0.35;

/**
 * Ambient scene target for a route. The home page is the intro until the track grid is explored.
 */
export function sceneTargetFor(route: Route, exploring: boolean): SceneTarget {
  if (route.page === 'home') {
    return { state: exploring ? 'explorer' : 'intro', focus: 0, renderMode: 'running' };
  }
  if (route.page === 'track') {
    return { state: 'curriculum', trail: route.trackId, focus: CURRICULUM_FOCUS, renderMode: 'running' };
  }
  return { state: 'activity', trail: route.trackId, focus: 1, renderMode: 'paused' };
}
