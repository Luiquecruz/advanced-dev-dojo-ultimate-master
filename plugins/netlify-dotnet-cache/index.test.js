import { describe, expect, it, vi } from 'vitest';
import { CACHED_PATHS } from './cachedPaths.js';
import * as plugin from './index.js';

const { onPostBuild, onPreBuild } = plugin;

function fakeUtils(found) {
  return { cache: { restore: vi.fn(async (path) => found.includes(path)), save: vi.fn(async () => true) } };
}

describe('netlify-dotnet-cache', () => {
  it('exports only Netlify build events, which Netlify requires of a plugin entry module', () => {
    const events = ['onPreBuild', 'onBuild', 'onPostBuild', 'onSuccess', 'onError', 'onEnd'];
    expect(Object.keys(plugin).filter((name) => !events.includes(name))).toEqual([]);
  });

  it('keeps the downloads, not the served files or the manifest', () => {
    expect(CACHED_PATHS).toEqual(['vendor/dotnet/.cache/nuget', 'vendor/dotnet/.cache/toolchain']);
    for (const path of CACHED_PATHS) {
      expect(path.startsWith('vendor/dotnet/.cache/')).toBe(true);
    }
  });

  it('restores every cached folder before the build and tolerates a cold cache', async () => {
    const utils = fakeUtils(['vendor/dotnet/.cache/nuget']);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await onPreBuild({ utils });
    expect(utils.cache.restore.mock.calls.map(([path]) => path)).toEqual(CACHED_PATHS);
    expect(utils.cache.save).not.toHaveBeenCalled();
  });

  it('saves every cached folder after the build', async () => {
    const utils = fakeUtils([]);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await onPostBuild({ utils });
    expect(utils.cache.save.mock.calls.map(([path]) => path)).toEqual(CACHED_PATHS);
  });
});
