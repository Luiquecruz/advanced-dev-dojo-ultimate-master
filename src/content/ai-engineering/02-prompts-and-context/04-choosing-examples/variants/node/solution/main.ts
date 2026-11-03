import { cosineSimilarity, countTokens, embed } from '@dojo/ai';
import type { GenerateRequest, GenerateResponse, Message } from '@dojo/ai';

export interface Example {
  id: string;
  input: string;
  output: string;
}

export interface SelectedExample extends Example {
  score: number;
}

export interface SelectionOptions {
  k: number;
  maxTokens: number;
  minSimilarity?: number;
  duplicateThreshold?: number;
}

export interface ClassifyRequest extends SelectionOptions {
  system: string;
  query: string;
  pool: Example[];
  labels: string[];
}

export interface Classification {
  label: string | null;
  exampleIds: string[];
}

export interface ChatModel {
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}

export const exampleTokens = (example: Example) => countTokens(example.input) + countTokens(example.output);

export function selectExamples(query: string, pool: Example[], { k, maxTokens, minSimilarity = 0, duplicateThreshold = 0.9 }: SelectionOptions): SelectedExample[] {
  const queryVector = embed(query);
  const candidates = pool
    .map((example, index) => {
      const vector = embed(example.input);
      return { example, index, vector, score: cosineSimilarity(queryVector, vector) };
    })
    .sort((left, right) => right.score - left.score || left.index - right.index);
  const selected: typeof candidates = [];
  let usedTokens = 0;
  for (const candidate of candidates) {
    if (selected.length >= k) {
      break;
    }
    const isDuplicate = selected.some((chosen) => cosineSimilarity(chosen.vector, candidate.vector) >= duplicateThreshold);
    const tokens = exampleTokens(candidate.example);
    if (candidate.score < minSimilarity || isDuplicate || usedTokens + tokens > maxTokens) {
      continue;
    }
    usedTokens += tokens;
    selected.push(candidate);
  }
  return selected.reverse().map(({ example, score }) => ({ ...example, score }));
}

export function buildFewShotMessages(system: string, query: string, examples: Example[]): Message[] {
  return [
    { role: 'system', content: system },
    ...examples.flatMap((example): Message[] => [
      { role: 'user', content: example.input },
      { role: 'assistant', content: example.output },
    ]),
    { role: 'user', content: query },
  ];
}

export function normalizeLabel(text: string, labels: string[]): string | null {
  const candidate = text.trim().toLowerCase().replace(/\.$/, '');
  return labels.includes(candidate) ? candidate : null;
}

export async function classifyWithExamples(model: ChatModel, { system, query, pool, labels, ...selection }: ClassifyRequest): Promise<Classification> {
  const examples = selectExamples(query, pool, selection);
  const response = await model.generate({ messages: buildFewShotMessages(system, query, examples) });
  return { label: normalizeLabel(response.text, labels), exampleIds: examples.map((example) => example.id) };
}
