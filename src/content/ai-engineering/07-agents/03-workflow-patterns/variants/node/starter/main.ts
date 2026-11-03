import type { GenerateRequest, GenerateResponse } from '@dojo/ai';

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

export async function promptChain(model: ChatModel, input: string, steps: ChainStep[]): Promise<{ output: string; outputs: string[] }> {
  // TODO: run the steps in order, feeding each output into the next prompt; throw a GateError when a reply did not finish with 'stop' or its gate rejects it
  const outputs: string[] = [];
  let previous = input;
  for (const step of steps) {
    const response = await model.generate({ messages: [{ role: 'user', content: step.prompt(previous) }] });
    outputs.push(response.text);
    previous = response.text;
  }
  return { output: previous, outputs };
}

export async function route(model: ChatModel, input: string, routes: Record<string, RouteDefinition>, fallback: string): Promise<{ route: string; text: string }> {
  // TODO: classify with a JSON request that lists every route, fall back on any unusable answer, then answer with the chosen route's system prompt
  const response = await model.generate({
    messages: [
      { role: 'system', content: routes[fallback].system },
      { role: 'user', content: input },
    ],
  });
  return { route: fallback, text: response.text };
}

export async function parallelSections(model: ChatModel, input: string, sections: Section[]): Promise<Record<string, string>> {
  // TODO: send every section at the same time instead of one after another
  const result: Record<string, string> = {};
  for (const section of sections) {
    const response = await model.generate({
      messages: [
        { role: 'system', content: section.instruction },
        { role: 'user', content: input },
      ],
    });
    result[section.name] = response.text;
  }
  return result;
}

export async function vote(model: ChatModel, prompt: string, voters: number): Promise<VoteResult> {
  // TODO: ask every voter in parallel for JSON {"label"}, normalize labels, count abstentions, and return null on a tie
  const response = await model.generate({ messages: [{ role: 'user', content: prompt }], responseFormat: { type: 'json' } });
  const label = String(JSON.parse(response.text).label);
  return { verdict: label, votes: { [label]: 1 }, abstentions: 0 };
}

export async function evaluatorOptimizer(model: ChatModel, task: string, maxRounds: number): Promise<OptimizedDraft> {
  // TODO: alternate draft and JSON evaluation for at most maxRounds rounds, sending the previous draft and the feedback back to the writer
  const draft = await model.generate({ messages: [{ role: 'user', content: task }] });
  return { text: draft.text, rounds: 1, accepted: true, feedback: [] };
}
