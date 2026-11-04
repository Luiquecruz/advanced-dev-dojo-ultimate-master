import type { GenerateRequest, GenerateResponse, Message } from '@dojo/ai';

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

const REQUIREMENT_LINE = /^\s*[-*]\s+(REQ-\d+):\s*(.*)$/;
const TASK_LINE = /^\s*[-*]\s+\[([ xX])\]\s+(TASK-\d+):\s*(.*)$/;

export const PLANNER_SYSTEM_PROMPT = [
  'You break a specification into implementation tasks.',
  'Answer with JSON only: {"tasks":[{"id":"TASK-1","text":"...","requirements":["REQ-1"]}]}.',
  'Every task id is TASK- followed by a number. Every task lists the requirement ids it implements.',
].join('\n');

function uniqueMatches(text: string, pattern: RegExp): string[] {
  return [...new Set(text.match(pattern) ?? [])];
}

export function findReferences(text: string): References {
  return {
    requirements: uniqueMatches(text, /(?<![\w-])REQ-\d+(?![\w-])/g),
    tasks: uniqueMatches(text, /(?<![\w-])TASK-\d+(?![\w-])/g),
  };
}

export function parseRequirements(markdown: string): Requirement[] {
  const requirements: Requirement[] = [];
  for (const line of markdown.split('\n')) {
    const match = REQUIREMENT_LINE.exec(line);
    if (!match) {
      continue;
    }
    if (requirements.some((requirement) => requirement.id === match[1])) {
      throw new SpecError(`Duplicate requirement id ${match[1]}`);
    }
    requirements.push({ id: match[1], text: match[2].trim() });
  }
  return requirements;
}

export function parseTasks(markdown: string): Task[] {
  const tasks: Task[] = [];
  for (const line of markdown.split('\n')) {
    const match = TASK_LINE.exec(line);
    if (!match) {
      continue;
    }
    if (tasks.some((task) => task.id === match[2])) {
      throw new SpecError(`Duplicate task id ${match[2]}`);
    }
    tasks.push({ id: match[2], text: match[3].trim(), done: match[1] !== ' ', requirements: findReferences(match[3]).requirements });
  }
  return tasks;
}

export function buildTraceability({ spec, tasks, tests }: TraceabilityInput): TraceabilityReport {
  const requirements = parseRequirements(spec);
  const taskList = typeof tasks === 'string' ? parseTasks(tasks) : tasks;
  const requirementIds = new Set(requirements.map((requirement) => requirement.id));
  const taskById = new Map(taskList.map((task) => [task.id, task]));
  const unknownReferences: UnknownReference[] = [];

  for (const task of taskList) {
    task.requirements.filter((id) => !requirementIds.has(id)).forEach((id) => unknownReferences.push({ from: task.id, id }));
  }

  const verifiedByTest = new Map<string, Set<string>>();
  for (const test of tests) {
    const references = findReferences(test);
    const verified = new Set(references.requirements.filter((id) => requirementIds.has(id)));
    references.requirements.filter((id) => !requirementIds.has(id)).forEach((id) => unknownReferences.push({ from: test, id }));
    for (const taskId of references.tasks) {
      const task = taskById.get(taskId);
      if (!task) {
        unknownReferences.push({ from: test, id: taskId });
        continue;
      }
      task.requirements.filter((id) => requirementIds.has(id)).forEach((id) => verified.add(id));
    }
    verifiedByTest.set(test, verified);
  }

  const rows = requirements.map(({ id }): TraceabilityRow => {
    const implementing = taskList.filter((task) => task.requirements.includes(id)).map((task) => task.id);
    const verifying = tests.filter((test) => verifiedByTest.get(test)?.has(id));
    const status: RequirementStatus = verifying.length > 0 ? 'covered' : implementing.length > 0 ? 'untested' : 'unplanned';
    return { requirement: id, tasks: implementing, tests: verifying, status };
  });

  const covered = rows.filter((row) => row.status === 'covered').length;
  return {
    rows,
    uncoveredRequirements: rows.filter((row) => row.status !== 'covered').map((row) => row.requirement),
    orphanTasks: taskList.filter((task) => !task.requirements.some((id) => requirementIds.has(id))).map((task) => task.id),
    testsWithoutRequirement: tests.filter((test) => verifiedByTest.get(test)?.size === 0),
    unknownReferences,
    coverage: requirements.length === 0 ? 0 : covered / requirements.length,
  };
}

function readPlan(text: string): Task[] | string {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return 'the reply is not valid JSON';
  }
  const tasks = (value as { tasks?: unknown } | null)?.tasks;
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return 'expected an object with a non-empty "tasks" array';
  }
  const plan: Task[] = [];
  for (const [index, task] of tasks.entries()) {
    const candidate = task as { id?: unknown; text?: unknown; requirements?: unknown } | null;
    if (typeof candidate?.id !== 'string' || !/^TASK-\d+$/.test(candidate.id)) {
      return `tasks[${index}].id must look like TASK-1`;
    }
    if (typeof candidate.text !== 'string' || candidate.text.trim() === '') {
      return `tasks[${index}].text must be a non-empty string`;
    }
    if (!Array.isArray(candidate.requirements) || candidate.requirements.some((id) => typeof id !== 'string')) {
      return `tasks[${index}].requirements must be an array of requirement ids`;
    }
    plan.push({ id: candidate.id, text: candidate.text.trim(), done: false, requirements: [...new Set(candidate.requirements as string[])] });
  }
  return plan;
}

export async function planTasks(model: ChatModel, spec: string, { maxAttempts = 2 }: { maxAttempts?: number } = {}): Promise<Task[]> {
  const messages: Message[] = [
    { role: 'system', content: PLANNER_SYSTEM_PROMPT },
    { role: 'user', content: spec },
  ];
  let problem = '';
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await model.generate({ messages: [...messages], responseFormat: { type: 'json' } });
    const plan = readPlan(response.text);
    if (typeof plan !== 'string') {
      return plan;
    }
    problem = plan;
    messages.push({ role: 'assistant', content: response.text }, { role: 'user', content: `Invalid plan: ${problem}. Answer again with JSON only.` });
  }
  throw new SpecError(`No valid plan after ${maxAttempts} attempts: ${problem}`);
}
