import { countTokens } from '@dojo/ai';
import type { GenerateRequest, GenerateResponse, Message } from '@dojo/ai';

export interface RetrievedDocument {
  id: string;
  text: string;
  score: number;
}

export interface ContextInput {
  system: string;
  history: Message[];
  question: string;
  documents: RetrievedDocument[];
  minScore?: number;
  maxDocumentTokens?: number;
}

export interface BudgetedContextInput extends ContextInput {
  budget: number;
}

export interface BuiltContext {
  messages: Message[];
  tokens: number;
  includedDocumentIds: string[];
  droppedDocumentIds: string[];
  compressedDocumentIds: string[];
  keptTurns: number;
  droppedTurns: number;
}

export interface ChatModel {
  readonly contextWindow: number;
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}

export class ContextBudgetError extends Error {
  constructor(
    readonly required: number,
    readonly budget: number,
  ) {
    super(`The system prompt and the question need ${required} tokens, above the ${budget}-token budget`);
    this.name = 'ContextBudgetError';
  }
}

export function compressText(text: string, maxTokens: number): string {
  // TODO: keep the longest prefix of whole sentences within maxTokens; cut characters only when no sentence fits
  return text;
}

export function renderDocuments(documents: RetrievedDocument[]): string {
  return documents.map((document) => `<document id="${document.id}">\n${document.text}\n</document>`).join('\n');
}

export function buildContext({ system, history, question, documents, budget, minScore = 0, maxDocumentTokens = Infinity }: BudgetedContextInput): BuiltContext {
  // TODO: check the mandatory part, select and compress documents, add them by relevance while they fit, then add recent turns while they fit
  const messages: Message[] = [{ role: 'system', content: system }, ...history, { role: 'user', content: `${renderDocuments(documents)}\n\n${question}` }];
  return {
    messages,
    tokens: countTokens(messages),
    includedDocumentIds: documents.map((document) => document.id),
    droppedDocumentIds: [],
    compressedDocumentIds: [],
    keptTurns: history.length / 2,
    droppedTurns: 0,
  };
}

export async function answerWithContext(model: ChatModel, input: ContextInput, maxOutputTokens: number): Promise<{ text: string; context: BuiltContext }> {
  // TODO: budget the context as the model context window minus the output reserve, and pass maxTokens
  const context = buildContext({ ...input, budget: model.contextWindow });
  const response = await model.generate({ messages: context.messages });
  return { text: response.text, context };
}
