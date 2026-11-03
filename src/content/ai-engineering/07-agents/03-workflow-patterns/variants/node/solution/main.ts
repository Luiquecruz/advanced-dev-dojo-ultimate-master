import type { GenerateRequest, GenerateResponse, Message } from '@dojo/ai';

export interface ChatModel {
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}

export interface ChainStep {
  name: string;
  prompt: (previous: string) => string;
  gate?: (output: string) => boolean;
}

export interface RouteDefinition {
  description: string;
  system: string;
}

export interface Section {
  name: string;
  instruction: string;
}

export interface VoteResult {
  verdict: string | null;
  votes: Record<string, number>;
  abstentions: number;
}

export interface OptimizedDraft {
  text: string;
  rounds: number;
  accepted: boolean;
  feedback: string[];
}

export class GateError extends Error {
  constructor(
    readonly step: string,
    readonly output: string,
  ) {
    super(`Step "${step}" did not pass its gate`);
    this.name = 'GateError';
  }
}

const UNPARSABLE_EVALUATION = 'The evaluation could not be parsed.';

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function field(value: unknown, key: string): unknown {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>)[key] : undefined;
}

export async function promptChain(model: ChatModel, input: string, steps: ChainStep[]): Promise<{ output: string; outputs: string[] }> {
  const outputs: string[] = [];
  let previous = input;
  for (const step of steps) {
    const response = await model.generate({ messages: [{ role: 'user', content: step.prompt(previous) }] });
    if (response.finishReason !== 'stop' || (step.gate && !step.gate(response.text))) {
      throw new GateError(step.name, response.text);
    }
    outputs.push(response.text);
    previous = response.text;
  }
  return { output: previous, outputs };
}

export async function route(model: ChatModel, input: string, routes: Record<string, RouteDefinition>, fallback: string): Promise<{ route: string; text: string }> {
  const catalog = Object.entries(routes)
    .map(([name, definition]) => `- ${name}: ${definition.description}`)
    .join('\n');
  const classification = await model.generate({
    messages: [
      { role: 'system', content: `Choose the route for the user's message. Reply with JSON {"route": "<name>"} using one of these names:\n${catalog}` },
      { role: 'user', content: input },
    ],
    responseFormat: { type: 'json' },
  });
  const chosen = field(parseJson(classification.text), 'route');
  const name = typeof chosen === 'string' && Object.keys(routes).includes(chosen) ? chosen : fallback;
  const response = await model.generate({
    messages: [
      { role: 'system', content: routes[name].system },
      { role: 'user', content: input },
    ],
  });
  return { route: name, text: response.text };
}

export async function parallelSections(model: ChatModel, input: string, sections: Section[]): Promise<Record<string, string>> {
  const responses = await Promise.all(
    sections.map((section) =>
      model.generate({
        messages: [
          { role: 'system', content: section.instruction },
          { role: 'user', content: input },
        ],
      }),
    ),
  );
  return Object.fromEntries(sections.map((section, index) => [section.name, responses[index].text]));
}

function labelOf(response: GenerateResponse): string | undefined {
  const label = field(parseJson(response.text), 'label');
  return typeof label === 'string' && label.trim() !== '' ? label.trim().toLowerCase() : undefined;
}

export async function vote(model: ChatModel, prompt: string, voters: number): Promise<VoteResult> {
  const ballots = await Promise.allSettled(
    Array.from({ length: voters }, () => model.generate({ messages: [{ role: 'user', content: prompt }], responseFormat: { type: 'json' } })),
  );
  const votes: Record<string, number> = {};
  let abstentions = 0;
  for (const ballot of ballots) {
    const label = ballot.status === 'fulfilled' ? labelOf(ballot.value) : undefined;
    if (label === undefined) {
      abstentions += 1;
    } else {
      votes[label] = (votes[label] ?? 0) + 1;
    }
  }
  const ranking = Object.entries(votes).sort((left, right) => right[1] - left[1]);
  const isClearWinner = ranking.length > 0 && (ranking.length === 1 || ranking[0][1] > ranking[1][1]);
  return { verdict: isClearWinner ? ranking[0][0] : null, votes, abstentions };
}

function evaluationOf(response: GenerateResponse): { pass: boolean; feedback: string } {
  const evaluation = parseJson(response.text);
  const pass = field(evaluation, 'pass');
  const feedback = field(evaluation, 'feedback');
  if (typeof pass !== 'boolean') {
    return { pass: false, feedback: UNPARSABLE_EVALUATION };
  }
  return { pass, feedback: typeof feedback === 'string' ? feedback : '' };
}

export async function evaluatorOptimizer(model: ChatModel, task: string, maxRounds: number): Promise<OptimizedDraft> {
  const feedback: string[] = [];
  let draft = '';
  for (let round = 1; round <= maxRounds; round++) {
    const messages: Message[] =
      round === 1
        ? [{ role: 'user', content: task }]
        : [
            { role: 'user', content: task },
            { role: 'assistant', content: draft },
            { role: 'user', content: `Revise the draft. Feedback: ${feedback[feedback.length - 1]}` },
          ];
    draft = (await model.generate({ messages })).text;
    const evaluation = evaluationOf(
      await model.generate({
        messages: [
          { role: 'system', content: 'Evaluate the draft against the task. Reply with JSON {"pass": boolean, "feedback": string}.' },
          { role: 'user', content: `Task: ${task}\n\nDraft:\n${draft}` },
        ],
        responseFormat: { type: 'json' },
      }),
    );
    if (evaluation.pass) {
      return { text: draft, rounds: round, accepted: true, feedback };
    }
    feedback.push(evaluation.feedback);
  }
  return { text: draft, rounds: maxRounds, accepted: false, feedback };
}
