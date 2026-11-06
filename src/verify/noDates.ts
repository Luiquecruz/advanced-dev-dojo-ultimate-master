import type { Lesson } from '../content/types';

/**
 * A changelog or a date that ages a lesson: "Status as of", release notes, a year after "in" or "since", an ISO date, a month and a
 * year, "this year", "latest version". Numbers are written with separators in lessons, so `2,000` never matches.
 */
export const DATED =
  /\b[Ss]tatus as of\b|\bchangelog\b|\brelease notes\b|\b(?:as of|in|since|until|by|from|during|early|late|mid-?)\s+(?:19|20)\d{2}\b|\b(?:19|20)\d{2}-\d{2}(?:-\d{2})?\b|\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+(?:19|20)\d{2}\b|\b(?:this|last|next) year\b|\bnewly released\b|\blatest (?:version|release)\b/i;

/** Fenced and inline code, removed before the check: a date in an example (a parser's input, a log line) is data, not a claim. */
const CODE = /```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`/g;

/** The first dated or changelog text in a lesson text outside code, or undefined. */
export function datedIn(text: string): string | undefined {
  return DATED.exec(text.replace(CODE, ' '))?.[0];
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
