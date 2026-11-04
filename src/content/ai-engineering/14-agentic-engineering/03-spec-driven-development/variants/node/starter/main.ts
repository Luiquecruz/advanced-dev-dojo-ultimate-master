import type { GenerateRequest, GenerateResponse } from '@dojo/ai';

export interface ChatModel {
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}

export interface Requirement {
  id: string;
  text: string;
}

export interface Task {
  id: string;
  text: string;
  done: boolean;
  requirements: string[];
}

export interface References {
  requirements: string[];
  tasks: string[];
}

export type RequirementStatus = 'covered' | 'untested' | 'unplanned';

export interface TraceabilityRow {
  requirement: string;
  tasks: string[];
  tests: string[];
  status: RequirementStatus;
}

export interface UnknownReference {
  from: string;
  id: string;
}

export interface TraceabilityReport {
  rows: TraceabilityRow[];
  uncoveredRequirements: string[];
  orphanTasks: string[];
  testsWithoutRequirement: string[];
  unknownReferences: UnknownReference[];
  coverage: number;
}

export interface TraceabilityInput {
  spec: string;
  tasks: string | Task[];
  tests: string[];
}

export class SpecError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpecError';
  }
}

export const PLANNER_SYSTEM_PROMPT = [
  'You break a specification into implementation tasks.',
  'Answer with JSON only: {"tasks":[{"id":"TASK-1","text":"...","requirements":["REQ-1"]}]}.',
  'Every task id is TASK- followed by a number. Every task lists the requirement ids it implements.',
].join('\n');

export function findReferences(text: string): References {
  // TODO: every whole REQ-<digits> and TASK-<digits> id, unique, in order of first appearance
  return { requirements: text.match(/REQ-\d+/g) ?? [], tasks: text.match(/TASK-\d+/g) ?? [] };
}

export function parseRequirements(markdown: string): Requirement[] {
  // TODO: read "- REQ-<n>: text" list items (also "*" and indented), ignore everything else, throw SpecError on a duplicate id
  throw new Error('Not implemented');
}

export function parseTasks(markdown: string): Task[] {
  // TODO: read "- [ ] TASK-<n>: text" and "- [x] ..." lines with their unique requirement references, throw SpecError on a duplicate id
  throw new Error('Not implemented');
}

export function buildTraceability({ spec, tasks, tests }: TraceabilityInput): TraceabilityReport {
  // TODO: rows per requirement, uncovered requirements, orphan tasks, tests without a requirement, unknown references and coverage
  throw new Error('Not implemented');
}

export async function planTasks(model: ChatModel, spec: string, { maxAttempts = 2 }: { maxAttempts?: number } = {}): Promise<Task[]> {
  // TODO: ask for a JSON plan, validate its shape, retry with "Invalid plan" feedback, throw SpecError after maxAttempts
  const response = await model.generate({ messages: [{ role: 'system', content: PLANNER_SYSTEM_PROMPT }, { role: 'user', content: spec }], responseFormat: { type: 'json' } });
  return JSON.parse(response.text).tasks;
}
