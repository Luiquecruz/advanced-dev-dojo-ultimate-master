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
  if (countTokens(text) <= maxTokens) {
    return text;
  }
  const sentences = text.split(/(?<=[.!?])\s+/);
  let kept = '';
  for (const sentence of sentences) {
    const next = kept === '' ? sentence : `${kept} ${sentence}`;
    if (countTokens(next) > maxTokens) {
      break;
    }
    kept = next;
  }
  return kept === '' ? text.slice(0, maxTokens * 4) : kept;
}

export function renderDocuments(documents: RetrievedDocument[]): string {
  return documents.map((document) => `<document id="${document.id}">\n${document.text}\n</document>`).join('\n');
}

function finalMessage(question: string, documents: RetrievedDocument[]): Message {
  return { role: 'user', content: documents.length === 0 ? question : `${renderDocuments(documents)}\n\n${question}` };
}

function toTurns(history: Message[]): Message[][] {
  const turns: Message[][] = [];
  for (let index = 0; index < history.length; index += 2) {
    turns.push(history.slice(index, index + 2));
  }
  return turns;
}

export function buildContext({ system, history, question, documents, budget, minScore = 0, maxDocumentTokens = Infinity }: BudgetedContextInput): BuiltContext {
  const systemMessage: Message = { role: 'system', content: system };
  const assemble = (turns: Message[][], chosen: RetrievedDocument[]) => [systemMessage, ...turns.flat(), finalMessage(question, [...chosen].reverse())];
  const required = countTokens(assemble([], []));
  if (required > budget) {
    throw new ContextBudgetError(required, budget);
  }
  const droppedDocumentIds: string[] = [];
  const compressedDocumentIds: string[] = [];
  const ranked = documents
    .filter((document) => {
      if (document.score < minScore) {
        droppedDocumentIds.push(document.id);
        return false;
      }
      return true;
    })
    .map((document, index) => ({ document, index }))
    .sort((left, right) => right.document.score - left.document.score || left.index - right.index)
    .map(({ document }) => {
      const text = compressText(document.text, maxDocumentTokens);
      if (text !== document.text) {
        compressedDocumentIds.push(document.id);
      }
      return { ...document, text };
    });
  const chosen: RetrievedDocument[] = [];
  for (const document of ranked) {
    if (countTokens(assemble([], [...chosen, document])) <= budget) {
      chosen.push(document);
    } else {
      droppedDocumentIds.push(document.id);
    }
  }
  const turns = toTurns(history);
  const keptTurns: Message[][] = [];
  for (const turn of [...turns].reverse()) {
    if (countTokens(assemble([turn, ...keptTurns], chosen)) > budget) {
      break;
    }
    keptTurns.unshift(turn);
  }
  const messages = assemble(keptTurns, chosen);
  return {
    messages,
    tokens: countTokens(messages),
    includedDocumentIds: [...chosen].reverse().map((document) => document.id),
    droppedDocumentIds,
    compressedDocumentIds,
    keptTurns: keptTurns.length,
    droppedTurns: turns.length - keptTurns.length,
  };
}

export async function answerWithContext(model: ChatModel, input: ContextInput, maxOutputTokens: number): Promise<{ text: string; context: BuiltContext }> {
  const context = buildContext({ ...input, budget: model.contextWindow - maxOutputTokens });
  const response = await model.generate({ messages: context.messages, maxTokens: maxOutputTokens });
  return { text: response.text, context };
}
