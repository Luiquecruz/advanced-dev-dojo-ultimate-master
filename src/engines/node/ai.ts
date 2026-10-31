import { createFakeModelProvider } from '../shared/fakeModel';
import * as Timers from './runtime/timers';

/**
 * Fake model provider of the Node.js engine: delays run on runtime timers, so a program waiting for a reply keeps the Run alive.
 */
export const nodeAi = createFakeModelProvider({ wait: (ms, signal) => Timers.promises.setTimeout(ms, undefined, { signal }) });
