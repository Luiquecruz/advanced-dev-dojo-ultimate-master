import type { GenerateRequest, GenerateResponse } from '@dojo/ai';

export interface ChatModel {
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}

export interface Entry {
  key: string;
  value: unknown;
  version: number;
  writer: string | null;
}

export type RejectReason = 'not_owner' | 'version_conflict';

export type WriteResult = { ok: true; version: number } | { ok: false; reason: RejectReason; currentVersion: number };

export interface LogEntry {
  sequence: number;
  agent: string;
  key: string;
  value: unknown;
  expectedVersion: number;
  accepted: boolean;
  reason: RejectReason | null;
  version: number;
}

export interface Blackboard {
  read(key: string): Entry;
  write(agent: string, key: string, value: unknown, expectedVersion: number): WriteResult;
  log(): LogEntry[];
  snapshot(): Record<string, unknown>;
}

export interface ContributeOptions {
  board: Blackboard;
  model: ChatModel;
  readKeys: string[];
  maxAttempts: number;
}

export type ContributeResult = { ok: true; version: number; attempts: number } | { ok: false; reason: RejectReason; attempts: number };

export const CONTRIBUTOR_SYSTEM = 'You contribute to a shared blackboard. Use the current values you are given and reply with the new value for your key only.';

function copy<Value>(value: Value): Value {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

export function ownerOf(owners: Record<string, string>, key: string): string | null {
  if (owners[key] !== undefined) {
    return owners[key];
  }
  const prefixes = Object.keys(owners)
    .filter((pattern) => pattern.endsWith('*') && key.startsWith(pattern.slice(0, -1)))
    .sort((left, right) => right.length - left.length);
  return prefixes.length === 0 ? null : owners[prefixes[0]];
}

export function createBlackboard(owners: Record<string, string>): Blackboard {
  const entries = new Map<string, Entry>();
  const history: LogEntry[] = [];

  const read = (key: string): Entry => {
    const entry = entries.get(key);
    return entry === undefined ? { key, value: null, version: 0, writer: null } : copy(entry);
  };

  const append = (entry: Omit<LogEntry, 'sequence'>) => {
    history.push({ sequence: history.length + 1, ...copy(entry) });
  };

  return {
    read,
    write(agent, key, value, expectedVersion) {
      const current = read(key);
      const base = { agent, key, value, expectedVersion };
      if (ownerOf(owners, key) !== agent) {
        append({ ...base, accepted: false, reason: 'not_owner', version: current.version });
        return { ok: false, reason: 'not_owner', currentVersion: current.version };
      }
      if (expectedVersion !== current.version) {
        append({ ...base, accepted: false, reason: 'version_conflict', version: current.version });
        return { ok: false, reason: 'version_conflict', currentVersion: current.version };
      }
      const version = current.version + 1;
      entries.set(key, { key, value: copy(value), version, writer: agent });
      append({ ...base, accepted: true, reason: null, version });
      return { ok: true, version };
    },
    log() {
      return copy(history);
    },
    snapshot() {
      return Object.fromEntries([...entries.values()].map((entry) => [entry.key, copy(entry.value)]));
    },
  };
}

export function rebuild(log: LogEntry[]): Record<string, unknown> {
  const state: Record<string, unknown> = {};
  [...log]
    .sort((left, right) => left.sequence - right.sequence)
    .filter((entry) => entry.accepted)
    .forEach((entry) => {
      state[entry.key] = copy(entry.value);
    });
  return state;
}

export async function contributeWithModel(agent: string, key: string, task: string, { board, model, readKeys, maxAttempts }: ContributeOptions): Promise<ContributeResult> {
  let reason: RejectReason = 'version_conflict';
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const current = board.read(key);
    const context = Object.fromEntries([...readKeys, key].map((name) => [name, board.read(name).value]));
    const response = await model.generate({
      messages: [
        { role: 'system', content: CONTRIBUTOR_SYSTEM },
        { role: 'user', content: `${task}\n\nCurrent blackboard values:\n${JSON.stringify(context, null, 2)}` },
      ],
    });
    const result = board.write(agent, key, response.text, current.version);
    if (result.ok) {
      return { ok: true, version: result.version, attempts: attempt };
    }
    reason = result.reason;
    if (result.reason === 'not_owner') {
      return { ok: false, reason, attempts: attempt };
    }
  }
  return { ok: false, reason, attempts: maxAttempts };
}
