import type { GenerateRequest, GenerateResponse, Message } from '@dojo/ai';

export interface ChatModel {
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}

export interface Passage {
  id: string;
  source: string;
  text: string;
  score: number;
}

export interface NumberedSource {
  number: number;
  id: string;
  source: string;
  text: string;
}

export interface ContextOptions {
  minScore?: number;
  maxPassages?: number;
}

export interface Citation {
  number: number;
  id: string;
  source: string;
}

export interface GroundedAnswer {
  status: 'answered' | 'no_evidence' | 'ungrounded';
  answer: string | null;
  citations: Citation[];
  attempts: number;
}

export function buildContext(passages: Passage[], { minScore = 0.3, maxPassages = 4 }: ContextOptions = {}) {
  // TODO: keep passages with score >= minScore, best first, at most maxPassages, numbered from 1; render "[n] (source) text" blocks
  const sources: NumberedSource[] = [];
  return { sources, context: '' };
}

export function extractCitations(text: string): number[] {
  // TODO: the unique numbers of every [n] marker, in order of first appearance
  throw new Error('Not implemented');
}

export async function answerWithCitations(model: ChatModel, question: string, passages: Passage[], options: ContextOptions = {}): Promise<GroundedAnswer> {
  // TODO: refuse without evidence, ask with numbered sources, validate citations, ask again once with feedback, withhold ungrounded answers
  const response = await model.generate({ messages: [{ role: 'user', content: question } satisfies Message] });
  return { status: 'answered', answer: response.text, citations: [], attempts: 1 };
}
