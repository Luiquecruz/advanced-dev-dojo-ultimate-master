import { describe, expect, it } from 'vitest';
import { hrefTo, legacyHashRedirect, parseRoute, type Route } from './route';

describe('parseRoute', () => {
  it('reads home, track and lesson paths', () => {
    expect(parseRoute('/')).toEqual({ page: 'home' });
    expect(parseRoute('/react')).toEqual({ page: 'track', trackId: 'react' });
    expect(parseRoute('/react/')).toEqual({ page: 'track', trackId: 'react' });
    expect(parseRoute('/react/use-effect')).toEqual({ page: 'lesson', trackId: 'react', lessonId: 'use-effect' });
  });

  it('ignores segments after the lesson', () => {
    expect(parseRoute('/react/use-effect/extra')).toEqual({ page: 'lesson', trackId: 'react', lessonId: 'use-effect' });
  });

  it('round-trips with hrefTo', () => {
    const routes: Route[] = [{ page: 'home' }, { page: 'track', trackId: 'node' }, { page: 'lesson', trackId: 'ai-engineering', lessonId: 'calling-a-model' }];
    for (const route of routes) {
      expect(parseRoute(hrefTo(route))).toEqual(route);
    }
  });
});

describe('legacyHashRedirect', () => {
  it('turns a hash route into a path, keeping the query', () => {
    expect(legacyHashRedirect({ hash: '#/react/use-effect', search: '?debug=perf' }, '/')).toBe('/react/use-effect?debug=perf');
    expect(legacyHashRedirect({ hash: '#/', search: '' }, '/')).toBe('/');
    expect(legacyHashRedirect({ hash: '#/typescript', search: '' }, '/dojo/')).toBe('/dojo/typescript');
  });

  it('leaves URLs without a hash route alone', () => {
    expect(legacyHashRedirect({ hash: '', search: '' }, '/')).toBeNull();
    expect(legacyHashRedirect({ hash: '#section', search: '' }, '/')).toBeNull();
  });
});
