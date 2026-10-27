import { describe, expect, it } from 'vitest';
import { restingStateFor, sceneTargetFor } from './router-adapter';

describe('restingStateFor', () => {
  it('maps the home page to intro until the paths are explored', () => {
    expect(restingStateFor({ page: 'home' }, false)).toBe('INTRO');
    expect(restingStateFor({ page: 'home' }, true)).toBe('PATH_EXPLORER');
  });

  it('maps track and lesson routes to curriculum and activity', () => {
    expect(restingStateFor({ page: 'track', trackId: 'vue' }, false)).toBe('CURRICULUM');
    expect(restingStateFor({ page: 'lesson', trackId: 'vue', lessonId: 'refs' }, false)).toBe('ACTIVITY');
  });
});

describe('sceneTargetFor', () => {
  it('follows the active home track on the home page', () => {
    expect(sceneTargetFor('PATH_EXPLORER', { page: 'home' }, 'react')).toMatchObject({ state: 'explorer', trail: 'react', renderMode: 'running' });
  });

  it('zooms during the activity transition and pauses once the activity is open', () => {
    const route = { page: 'lesson', trackId: 'vue', lessonId: 'refs' } as const;
    expect(sceneTargetFor('ACTIVITY_TRANSITION', route)).toMatchObject({ state: 'activity', renderMode: 'running', trail: 'vue' });
    expect(sceneTargetFor('ACTIVITY', route)).toMatchObject({ state: 'activity', renderMode: 'paused', focus: 1 });
  });

  it('uses the destination route while returning', () => {
    expect(sceneTargetFor('RETURN_TRANSITION', { page: 'track', trackId: 'vue' })).toMatchObject({ state: 'curriculum', trail: 'vue' });
  });
});
