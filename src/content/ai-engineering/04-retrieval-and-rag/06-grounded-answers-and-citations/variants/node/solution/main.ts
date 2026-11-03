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

const MAX_ATTEMPTS = 2;

const SYSTEM_PROMPT = [
  'You answer questions about Brightdesk using only the numbered sources provided.',
  'Cite the source of every claim with its number in square brackets, like [1] or [2].',
  'Never cite a number that is not in the list. If the sources do not answer the question, say so without citing anything.',
].join(' ');

export function buildContext(passages: Passage[], { minScore = 0.3, maxPassages = 4 }: ContextOptions = {}) {
  const sources: NumberedSource[] = passages
    .filter((passage) => passage.score >= minScore)
    .sort((left, right) => right.score - left.score)
    .slice(0, maxPassages)
    .map((passage, index) => ({ number: index + 1, id: passage.id, source: passage.source, text: passage.text }));
  const context = sources.map((source) => `[${source.number}] (${source.source}) ${source.text}`).join('\n\n');
  return { sources, context };
}

export function extractCitations(text: string): number[] {
  const numbers = [...text.matchAll(/\[(\d+)\]/g)].map((match) => Number(match[1]));
  return [...new Set(numbers)];
}

export async function answerWithCitations(model: ChatModel, question: string, passages: Passage[], options: ContextOptions = {}): Promise<GroundedAnswer> {
  const { sources, context } = buildContext(passages, options);
  if (sources.length === 0) {
    return { status: 'no_evidence', answer: null, citations: [], attempts: 0 };
  }
  const validNumbers = sources.map((source) => source.number);
  const messages: Message[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Sources:\n\n${context}\n\nQuestion: ${question}` },
  ];
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const response = await model.generate({ messages });
    const cited = extractCitations(response.text);
    const invalid = cited.filter((number) => !validNumbers.includes(number));
    if (response.finishReason === 'stop' && cited.length > 0 && invalid.length === 0) {
      const citations = cited.map((number) => {
        const { id, source } = sources[number - 1];
        return { number, id, source };
      });
      return { status: 'answered', answer: response.text, citations, attempts: attempt };
    }
    const problem = invalid.length > 0 ? `You cited [${invalid.join('], [')}], which is not a provided source.` : 'Your answer did not cite any provided source.';
    messages.push(
      { role: 'assistant', content: response.text },
      { role: 'user', content: `${problem} Answer again using only sources ${validNumbers.map((number) => `[${number}]`).join(', ')}, citing one after every claim.` },
    );
  }
  return { status: 'ungrounded', answer: null, citations: [], attempts: MAX_ATTEMPTS };
}
