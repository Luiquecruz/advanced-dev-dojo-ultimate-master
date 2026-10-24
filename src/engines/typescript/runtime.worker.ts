import { runRuntimeTests } from './runtime';
import type { RuntimeTest } from './types';

self.onmessage = async (event: MessageEvent<{ javascript: string; tests: RuntimeTest[] }>) => {
  const { javascript, tests } = event.data;
  self.postMessage(await runRuntimeTests(javascript, tests));
};
