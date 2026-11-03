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


// TODO: exact key first, then the longest matching "prefix*" pattern, otherwise null
export function ownerOf(owners: Record<string, string>, key: string): string | null {
  return owners[key] ?? null;
}

// TODO: reject non-owners and stale versions, store and return copies, log every attempt with a sequence number
export function createBlackboard(owners: Record<string, string>): Blackboard {
  const entries = new Map<string, Entry>();
  const history: LogEntry[] = [];
  return {
    read(key) {
      return entries.get(key) ?? { key, value: null, version: 0, writer: null };
    },
    write(agent, key, value, expectedVersion) {
      const version = (entries.get(key)?.version ?? 0) + 1;
      entries.set(key, { key, value, version, writer: agent });
      history.push({ sequence: history.length + 1, agent, key, value, expectedVersion, accepted: true, reason: null, version });
      return { ok: true, version };
    },
    log() {
      return history;
    },
    snapshot() {
      return Object.fromEntries([...entries.values()].map((entry) => [entry.key, entry.value]));
    },
  };
}

// TODO: replay accepted entries in sequence order
export function rebuild(log: LogEntry[]): Record<string, unknown> {
  return Object.fromEntries(log.map((entry) => [entry.key, entry.value]));
}

// TODO: read the version, call the model with the current values, write with that version; retry conflicts up to maxAttempts, stop at once on not_owner
export async function contributeWithModel(agent: string, key: string, task: string, { board, model }: ContributeOptions): Promise<ContributeResult> {
  const response = await model.generate({
    messages: [
      { role: 'system', content: CONTRIBUTOR_SYSTEM },
      { role: 'user', content: task },
    ],
  });
  const result = board.write(agent, key, response.text, board.read(key).version);
  return result.ok ? { ok: true, version: result.version, attempts: 1 } : { ok: false, reason: result.reason, attempts: 1 };
}
