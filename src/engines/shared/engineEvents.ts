/** Engines whose runtime boots in a worker of the app window. */
export type BootingEngine = 'python' | 'csharp';

/**
 * Platform signals of an engine, never caused by a learner mistake: a runtime that booted (with its wall-clock span) or a step of the
 * platform that failed (`boot`: the runtime did not start, `snapshot`: the Python boot snapshot was not made and every interpreter
 * boots cold, `protocol`: a worker report did not match the tests the host discovered).
 */
export type EngineEvent =
  | { type: 'boot'; engine: BootingEngine; startedAt: number; endedAt: number }
  | { type: 'failure'; engine: BootingEngine; stage: 'boot' | 'snapshot' | 'protocol'; message: string };

type EngineEventListener = (event: EngineEvent) => void;

const listeners = new Set<EngineEventListener>();

/**
 * Subscribes to engine events; returns the unsubscribe function.
 */
export function onEngineEvent(listener: EngineEventListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Sends an engine event to every subscriber.
 */
export function emitEngineEvent(event: EngineEvent): void {
  listeners.forEach((listener) => listener(event));
}
