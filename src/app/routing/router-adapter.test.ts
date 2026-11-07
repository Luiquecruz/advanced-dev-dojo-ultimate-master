import { describe, expect, it } from 'vitest';
import { trackMass } from '@/entities/track';
import { documentTitleFor, restingStateFor, sceneTargetFor } from './router-adapter';

describe('documentTitleFor', () => {
  it('names the home page, each shown mission and each waypoint', () => {
    expect(documentTitleFor({ page: 'home' })).toBe('Constela Mission');
    expect(documentTitleFor({ page: 'track', trackId: 'typescript' })).toBe('TypeScript · Constela Mission');
    expect(documentTitleFor({ page: 'lesson', trackId: 'typescript', lessonId: 'primitive-annotations' })).toBe(
      'Annotating primitive values · TypeScript · Constela Mission',
    );
  });

  it('marks unknown or hidden missions and unknown waypoints as not found', () => {
    expect(documentTitleFor({ page: 'track', trackId: 'unknown' })).toBe('Off course: page not found · Constela Mission');
    expect(documentTitleFor({ page: 'track', trackId: 'vue' })).toBe('Off course: page not found · Constela Mission');
    expect(documentTitleFor({ page: 'lesson', trackId: 'typescript', lessonId: 'unknown' })).toBe('Off course: page not found · Constela Mission');
  });
});

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

  it('sinks the grid well with the mass of the shown track', () => {
    const route = { page: 'lesson', trackId: 'react', lessonId: 'refs' } as const;
    expect(sceneTargetFor('ACTIVITY', route).mass).toBe(trackMass('react'));
    expect(sceneTargetFor('INTRO', { page: 'home' }).mass).toBe(trackMass(undefined));
  });

  it('uses the destination route while returning', () => {
    expect(sceneTargetFor('RETURN_TRANSITION', { page: 'track', trackId: 'vue' })).toMatchObject({ state: 'curriculum', trail: 'vue' });
  });
});
