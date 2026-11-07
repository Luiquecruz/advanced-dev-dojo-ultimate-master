import { describe, expect, it } from 'vitest';
import { environmentForHost, routeTransactionName } from './context';

describe('environmentForHost', () => {
  it('names local servers development', () => {
    expect(environmentForHost('localhost')).toBe('development');
    expect(environmentForHost('127.0.0.1')).toBe('development');
  });

  it('names Cloudflare Workers Preview and Deployment URLs preview', () => {
    expect(environmentForHost('feat-x-constela-mission.constela.workers.dev')).toBe('preview');
    expect(environmentForHost('2f4a9c1e-constela-mission.constela.workers.dev')).toBe('preview');
  });

  it('names the production host production', () => {
    expect(environmentForHost('constela-mission.constela.workers.dev')).toBe('production');
  });
});

describe('routeTransactionName', () => {
  it('replaces track and lesson ids with the route pattern', () => {
    expect(routeTransactionName('/', '/')).toBe('/');
    expect(routeTransactionName('/react', '/')).toBe('/:trackId');
    expect(routeTransactionName('/react/use-effect', '/')).toBe('/:trackId/:lessonId');
  });

  it('strips the router basename first', () => {
    expect(routeTransactionName('/app/', '/app/')).toBe('/');
    expect(routeTransactionName('/app/python/variables', '/app/')).toBe('/:trackId/:lessonId');
  });
});
