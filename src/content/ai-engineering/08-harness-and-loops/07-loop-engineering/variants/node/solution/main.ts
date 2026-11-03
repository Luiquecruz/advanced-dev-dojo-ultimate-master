import { ModelError } from '@dojo/ai';
import type { GenerateRequest, GenerateResponse } from '@dojo/ai';

export interface ChatModel {
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}

export interface LoopEvent {
  key: string;
  task: string;
}

export type LoopStatus = 'running' | 'done' | 'escalated';
export type StopReason = 'done' | 'stuck' | 'failures' | 'budget';

export interface LoopState {
  key: string;
  status: LoopStatus;
  iterations: number;
  failures: number;
  spentUsd: number;
  lastOutput: string | null;
  lastFeedback: string | null;
  escalationReason: StopReason | null;
}

export interface LoopLimits {
  maxFailures: number;
  budgetUsd: number;
}

export interface StateStore {
  load(key: string): Promise<LoopState | undefined>;
  save(key: string, state: LoopState): Promise<void>;
}

export interface Escalation {
  key: string;
  reason: StopReason;
  state: LoopState;
}

export interface LoopDependencies {
  model: ChatModel;
  store: StateStore;
  verify(output: string, event: LoopEvent): { passed: boolean; feedback: string } | Promise<{ passed: boolean; feedback: string }>;
  escalate(escalation: Escalation): void | Promise<void>;
  limits: LoopLimits;
}

export const LOOP_SYSTEM = 'You are a maintenance agent. Produce the complete fix for the task. When feedback from a previous attempt is given, address it.';

export function createMemoryStore(): StateStore {
  const states = new Map<string, string>();
  return {
    async load(key) {
      const saved = states.get(key);
      return saved === undefined ? undefined : JSON.parse(saved);
    },
    async save(key, state) {
      states.set(key, JSON.stringify(state));
    },
  };
}

export function stopReason(check: { passed: boolean; stuck: boolean; failures: number; spentUsd: number }, limits: LoopLimits): StopReason | null {
  if (check.passed) {
    return 'done';
  }
  if (check.stuck) {
    return 'stuck';
  }
  if (check.failures >= limits.maxFailures) {
    return 'failures';
  }
  if (check.spentUsd >= limits.budgetUsd) {
    return 'budget';
  }
  return null;
}

function newState(key: string): LoopState {
  return { key, status: 'running', iterations: 0, failures: 0, spentUsd: 0, lastOutput: null, lastFeedback: null, escalationReason: null };
}

function userMessage(event: LoopEvent, lastFeedback: string | null): string {
  return lastFeedback === null ? event.task : `${event.task}\n\nThe previous attempt failed verification:\n${lastFeedback}`;
}

async function act(model: ChatModel, event: LoopEvent, state: LoopState): Promise<{ text: string; cost: number } | { error: ModelError }> {
  try {
    const response = await model.generate({
      messages: [
        { role: 'system', content: LOOP_SYSTEM },
        { role: 'user', content: userMessage(event, state.lastFeedback) },
      ],
    });
    return { text: response.text, cost: response.usage.cost };
  } catch (error) {
    if (error instanceof ModelError) {
      return { error };
    }
    throw error;
  }
}

export async function handleTrigger(event: LoopEvent, { model, store, verify, escalate, limits }: LoopDependencies): Promise<LoopState> {
  const state = (await store.load(event.key)) ?? newState(event.key);
  while (state.status === 'running') {
    const action = await act(model, event, state);
    state.iterations += 1;
    let passed = false;
    let stuck = false;
    if ('error' in action) {
      state.failures += 1;
      state.lastFeedback = `model error: ${action.error.code}`;
    } else {
      state.spentUsd += action.cost;
      const verdict = await verify(action.text, event);
      passed = verdict.passed;
      if (!passed) {
        state.failures += 1;
        state.lastFeedback = verdict.feedback;
        stuck = action.text === state.lastOutput;
      }
      state.lastOutput = action.text;
    }
    const reason = stopReason({ passed, stuck, failures: state.failures, spentUsd: state.spentUsd }, limits);
    if (reason === 'done') {
      state.status = 'done';
    } else if (reason !== null) {
      state.status = 'escalated';
      state.escalationReason = reason;
    }
    await store.save(event.key, { ...state });
    if (reason !== null && reason !== 'done') {
      await escalate({ key: event.key, reason, state: { ...state } });
    }
  }
  return state;
}
