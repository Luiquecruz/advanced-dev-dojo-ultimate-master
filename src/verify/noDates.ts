import { Marked, type Token, type Tokens } from 'marked';
import type { Lesson } from '../content/types';

/**
 * A changelog or a date that ages a lesson: "Status as of", release notes, a year after "in" or "since", an ISO date, a month and a
 * year, "this year", "latest version". Numbers are written with separators in lessons, so `2,000` never matches.
 */
export const DATED =
  /\b[Ss]tatus as of\b|\bchangelog\b|\brelease notes\b|\b(?:as of|in|since|until|by|from|during|early|late|mid-?)\s+(?:19|20)\d{2}\b|\b(?:19|20)\d{2}-\d{2}(?:-\d{2})?\b|\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+(?:19|20)\d{2}\b|\b(?:this|last|next) year\b|\bnewly released\b|\blatest (?:version|release)\b/i;

const markdown = new Marked();

/**
 * The text a learner reads, with every code token dropped: Markdown is tokenized (a fence, an indented block, an inline span, an escaped
 * backtick and a fence inside a block quote are all handled by the parser, not by a pattern), and a date in code, such as a program's input,
 * is data, not a claim.
 */
function proseTextOf(tokens: Token[], separator: string): string {
  return tokens
    .map((token): string => {
      if (token.type === 'code' || token.type === 'codespan') {
        return ' ';
      }
      if (token.type === 'list') {
        return (token as Tokens.List).items.map((item) => proseTextOf(item.tokens, '\n')).join('\n');
      }
      if (token.type === 'table') {
        const { header, rows } = token as Tokens.Table;
        return [header, ...rows].map((row) => row.map((cell) => proseTextOf(cell.tokens, '')).join(' ')).join('\n');
      }
      if (token.type === 'blockquote') {
        return proseTextOf((token as Tokens.Blockquote).tokens, '\n');
      }
      if ('tokens' in token && Array.isArray(token.tokens)) {
        return proseTextOf(token.tokens, '');
      }
      return 'text' in token && typeof token.text === 'string' ? token.text : token.raw;
    })
    .join(separator);
}

/** The first dated or changelog text in a lesson text outside code, or undefined. */
export function datedIn(text: string): string | undefined {
  return DATED.exec(proseTextOf(markdown.lexer(text), '\n'))?.[0];
}

/** Every prose text a learner reads in a lesson, labelled by file, in every language the lesson ships. */
export function proseOf(lesson: Lesson): Array<[string, string]> {
  const texts: Array<[string, string]> = [
    ['theory.md', lesson.theory],
    ['quiz.json', lesson.quiz.map(({ question, options, explanation }) => [question, ...options, explanation].join('\n')).join('\n')],
    ['concepts.json', lesson.concepts.map(({ term, description }) => `${term} ${description}`).join('\n')],
    ['meta.json', `${lesson.title}\n${lesson.summary}`],
  ];
  for (const challenge of lesson.variants) {
    const language = challenge.language ?? challenge.engine;
    texts.push(
      [`challenge.md [${language}]`, challenge.instructions],
      [`hints.md [${language}]`, challenge.hints.join('\n')],
      [`approach.md [${language}]`, challenge.approach],
    );
  }
  return texts;
}

/** The dated texts of a lesson as `file reads "text"` lines. */
export function datedTextsOf(lesson: Lesson): string[] {
  return proseOf(lesson).flatMap(([file, text]) => {
    const match = datedIn(text);
    return match === undefined ? [] : [`${file} reads "${match}"`];
  });
}
