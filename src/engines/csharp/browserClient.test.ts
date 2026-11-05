import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { disposeCsharp, mayPrefetchCsharp, warmUpCsharp } from './browserClient';

class FakeWorker {
  static created: FakeWorker[] = [];
  terminated = false;
  constructor() {
    FakeWorker.created.push(this);
  }
  addEventListener() {}
  removeEventListener() {}
  postMessage() {}
  terminate() {
    this.terminated = true;
  }
}

describe('mayPrefetchCsharp', () => {
  it('prefetches without connection hints and on fast connections', () => {
    expect(mayPrefetchCsharp(undefined)).toBe(true);
    expect(mayPrefetchCsharp({ effectiveType: '4g' })).toBe(true);
  });

  it('never prefetches with Save-Data or on a slow connection', () => {
    expect(mayPrefetchCsharp({ saveData: true, effectiveType: '4g' })).toBe(false);
    for (const effectiveType of ['slow-2g', '2g', '3g']) {
      expect(mayPrefetchCsharp({ effectiveType }), effectiveType).toBe(false);
    }
  });
});

describe('warmUpCsharp', () => {
  let idle: (() => void)[];
  let connection: { saveData?: boolean; effectiveType?: string } | undefined;

  beforeEach(() => {
    idle = [];
    connection = undefined;
    FakeWorker.created = [];
    vi.stubGlobal('Worker', FakeWorker);
    vi.stubGlobal('requestIdleCallback', (task: () => void) => idle.push(task));
    vi.stubGlobal('cancelIdleCallback', (handle: number) => {
      idle[handle - 1] = () => undefined;
    });
    Object.defineProperty(navigator, 'connection', { configurable: true, get: () => connection });
  });

  afterEach(() => {
    disposeCsharp();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, 'connection');
  });

  it('starts the runtime only once the page is idle, and only one', () => {
    warmUpCsharp();
    warmUpCsharp();
    expect(FakeWorker.created).toHaveLength(0);
    expect(idle).toHaveLength(1);
    idle[0]();
    expect(FakeWorker.created).toHaveLength(1);
    warmUpCsharp();
    expect(FakeWorker.created).toHaveLength(1);
  });

  it('starts nothing when the learner leaves before the page is idle', () => {
    warmUpCsharp();
    disposeCsharp();
    idle[0]();
    expect(FakeWorker.created).toHaveLength(0);
  });

  it('starts nothing on a Save-Data connection', () => {
    connection = { saveData: true };
    warmUpCsharp();
    expect(idle).toHaveLength(0);
    expect(FakeWorker.created).toHaveLength(0);
  });

  it('terminates the prefetched runtime when the learner leaves C# challenges', () => {
    warmUpCsharp();
    idle[0]();
    disposeCsharp();
    expect(FakeWorker.created[0].terminated).toBe(true);
  });
});
