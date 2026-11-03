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
  // TODO: score by cosine similarity of embeddings, skip weak matches, near-duplicates and examples over the token budget, return most similar last
  return pool.slice(0, k).map((example) => ({ ...example, score: 0 }));
}

export function buildFewShotMessages(system: string, query: string, examples: Example[]): Message[] {
  // TODO: system message, one user/assistant pair per example, then the query
  return [
    { role: 'system', content: system },
    { role: 'user', content: query },
  ];
}

export function normalizeLabel(text: string, labels: string[]): string | null {
  // TODO: trim, lowercase and drop one trailing period; return null for anything outside labels
  return text;
}

export async function classifyWithExamples(model: ChatModel, { system, query, pool, labels, ...selection }: ClassifyRequest): Promise<Classification> {
  // TODO: select examples, build the messages, call the model and normalize the label
  const response = await model.generate({ messages: buildFewShotMessages(system, query, []) });
  return { label: normalizeLabel(response.text, labels), exampleIds: [] };
}
