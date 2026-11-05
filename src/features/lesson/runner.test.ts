import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Challenge, EngineId } from '@/content';

const created: string[] = [];
let terminated = 0;

class RecordingWorker {
  constructor(url: string | URL) {
    created.push(String(url));
  }
  postMessage(): void {}
  addEventListener(): void {}
  removeEventListener(): void {}
  terminate(): void {
    terminated += 1;
  }
}

const OTHER_ENGINES: EngineId[] = ['typescript', 'react', 'vue', 'angular', 'node', 'python'];
const csharpWorkers = () => created.filter((url) => url.includes('csharp.worker'));

let runner: typeof import('./runner');

beforeAll(async () => {
  vi.stubGlobal('Worker', RecordingWorker);
  runner = await import('./runner');
});
afterAll(() => vi.unstubAllGlobals());

describe('prepareEngine', () => {
  it('never starts the C# runtime for other engines', () => {
    for (const engine of OTHER_ENGINES) {
      runner.prepareEngine(engine);
    }
    const challenge = { tests: 'using Dojo;\npublic static class T { [Test("a")] public static void A() {} }' } as Challenge;
    expect(runner.testNamesFor('csharp', challenge)).toEqual(['a']);
    expect(created.some((url) => url.includes('python.worker'))).toBe(true);
    expect(csharpWorkers()).toEqual([]);
  });

  it('starts no C# worker for a lesson without a challenge', () => {
    runner.prepareEngine(undefined);
    expect(csharpWorkers()).toEqual([]);
  });

  it('starts one C# worker, which downloads the runtime, when a C# challenge opens', () => {
    runner.prepareEngine('csharp');
    runner.prepareEngine('csharp');
    expect(csharpWorkers()).toHaveLength(1);
  });

  it('terminates the warm C# worker when the learner leaves C# challenges', () => {
    const before = terminated;
    runner.prepareEngine(undefined);
    expect(terminated).toBe(before + 1);
    runner.prepareEngine('csharp');
    expect(csharpWorkers()).toHaveLength(2);
  });
});
