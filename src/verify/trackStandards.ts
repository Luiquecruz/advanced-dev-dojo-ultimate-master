import { trackById } from '../content/allContent';
import type { Challenge, Lesson } from '../content/types';
import { markedTests, TEST_FILES } from '../engines/testFiles';
import { unawaitedThrowsAsync } from './csharpChecks';
import { datedTextsOf, proseOf } from './noDates';

/**
 * The standards every track built on the System Design model shares: the theory template, quizzes, concepts, official resources, tags,
 * no dates, no language bridges, `You need:` lines that name only earlier lessons, and the checks of one challenge variant. A track suite
 * creates its checks with `createTrackStandards` and adds what is specific to it.
 */
const COMMON_MISTAKES = '## Common mistakes';
const CLOSING_HEADINGS = [COMMON_MISTAKES, '## In practice', '## Check yourself'];
export interface Violation {
  rule: string;
  detail: string;
}

const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;
const headingsOf = (theory: string) => theory.split('\n').filter((line) => line.startsWith('## '));
const listItems = (section: string) => section.split('\n').filter((line) => /^(\d+\.|-|\*) /.test(line.trim())).length;

/** The text of a `##` section up to the next `##` heading, or undefined when the section is missing. */
function sectionOf(theory: string, heading: string): string | undefined {
  const parts = theory.split(`\n${heading}\n`);
  return parts.length < 2 ? undefined : parts[1].split('\n## ')[0];
}


/** What a track passes in: its id, the hosts its resources may use, the tags beyond `practice` and `theory`, its bridge pattern and its word limits. */
export interface TrackStandardsConfig {
  trackId: string;
  resourceHosts: ReadonlySet<string>;
  extraTags: readonly string[];
  bridge: RegExp;
  theoryWordLimits(moduleNumber: number): readonly [number, number];
}

export function createTrackStandards(config: TrackStandardsConfig) {
  const { trackId, resourceHosts: RESOURCE_HOSTS, extraTags: EXTRA_TAGS, bridge: BRIDGE } = config;
  const track = trackById.get(trackId);
  const modules = track?.modules ?? [];
  const lessons: Lesson[] = modules.flatMap((module) => module.lessons);
  const moduleOf = (lesson: Lesson) => modules.find((module) => module.id === lesson.moduleId)!;
  const eachLesson = lessons.map((lesson) => [lesson.key, lesson] as const);
  const FIRST_LESSON_NEEDS = 'nothing. This is the first lesson of the track.';
  /** Lesson titles, longest first, so a title that contains another one is removed before it. */
  const titlesByLength = [...new Set(lessons.map((lesson) => lesson.title))].sort((first, second) => second.length - first.length);

  /**
   * The "You need:" line names earlier lessons by their exact titles, each optionally followed by a note in parentheses, joined by commas
   * and "and" (system-design-track.md "Chronological order"). The first lesson needs nothing.
   */
  function youNeedViolations(lesson: Lesson): Violation[] {
    const line = /^You need: (.*)$/m.exec(lesson.theory)?.[1];
    const position = lessons.indexOf(lesson);
    if (line === undefined) {
      return [];
    }
    if (position === 0) {
      return line === FIRST_LESSON_NEEDS ? [] : [{ rule: 'you-need', detail: `the first lesson reads "You need: ${FIRST_LESSON_NEEDS}"` }];
    }
    let rest = line.replace(/\s*\([^()]*\)/g, '');
    const named: string[] = [];
    for (const title of titlesByLength) {
      if (rest.includes(title)) {
        named.push(title);
        rest = rest.split(title).join(' ');
      }
    }
    const violations: Violation[] = [];
    const leftover = rest.replace(/\band\b|[\s,.;]/g, '');
    if (named.length === 0 || leftover !== '') {
      violations.push({ rule: 'you-need', detail: `names only exact titles of earlier lessons, with notes in parentheses; left over: "${leftover}"` });
    }
    const later = named.filter((title) => lessons.findIndex((candidate) => candidate.title === title) >= position);
    if (later.length > 0) {
      violations.push({ rule: 'you-need-order', detail: `names ${later.join(', ')}, which is not an earlier lesson` });
    }
    return violations;
  }

  function templateViolations(lesson: Lesson): Violation[] {
    const violations: Violation[] = [];
    const theory = lesson.theory;
    if (!theory.startsWith('# ')) {
      violations.push({ rule: 'theory-title', detail: 'theory.md must start with a "# " title' });
    }
    const intro = theory.split('\n## ')[0];
    const paragraphs = intro.split('\n').slice(1).join('\n').split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
    if (paragraphs.length !== 2 || !paragraphs[1].startsWith('You need: ') || paragraphs[0].startsWith('You need:')) {
      violations.push({ rule: 'theory-intro', detail: 'the title is followed by one introduction paragraph and then a "You need: ..." line, before the first "##" section' });
    }
    const words = wordCount(theory);
    const [minimum, maximum] = config.theoryWordLimits(moduleOf(lesson).number);
    if (words < minimum || words > maximum) {
      violations.push({ rule: 'theory-length', detail: `theory has ${words} words, expected ${minimum}-${maximum}` });
    }
    const headings = headingsOf(theory);
    if (headings.length < CLOSING_HEADINGS.length + 1 || headings.slice(-CLOSING_HEADINGS.length).join('|') !== CLOSING_HEADINGS.join('|')) {
      violations.push({ rule: 'theory-headings', detail: `at least one concept section, then ${CLOSING_HEADINGS.join(', ')} as the last sections; got ${headings.join(', ')}` });
    }
    const mistakes = sectionOf(theory, COMMON_MISTAKES) ?? '';
    const mistakeWords = wordCount(mistakes);
    const bullets = listItems(mistakes);
    if (mistakeWords < 60 || mistakeWords > 180 || bullets < 2 || bullets > 4) {
      violations.push({ rule: 'common-mistakes', detail: `"${COMMON_MISTAKES}" has ${mistakeWords} words and ${bullets} bullets, expected 60-180 words in 2-4 bullets` });
    }
    const questions = (sectionOf(theory, '## Check yourself') ?? '').split('\n').filter((line) => /^\d+\. /.test(line.trim())).length;
    if (questions < 2 || questions > 4) {
      violations.push({ rule: 'check-yourself', detail: `"## Check yourself" has ${questions} numbered questions, expected 2-4` });
    }
    return violations;
  }

  function quizViolations(lesson: Lesson): Violation[] {
    const violations: Violation[] = [];
    const quiz = lesson.quiz;
    if (quiz.length < 5 || quiz.length > 6) {
      violations.push({ rule: 'quiz-length', detail: `${quiz.length} questions, expected 5-6` });
    }
    quiz.forEach((question, index) => {
      if (question.options.length !== 4 || new Set(question.options).size !== 4) {
        violations.push({ rule: 'quiz-options', detail: `question ${index + 1} needs 4 distinct options` });
      }
      if (question.explanation.trim().length <= 40) {
        violations.push({ rule: 'quiz-explanation', detail: `question ${index + 1} explanation is 40 characters or shorter` });
      }
    });
    const counts = new Map<number, number>();
    quiz.forEach(({ answer }) => counts.set(answer, (counts.get(answer) ?? 0) + 1));
    if (counts.size < 2 || Math.max(...counts.values()) > quiz.length / 2) {
      violations.push({ rule: 'quiz-answer-spread', detail: `answer indexes ${quiz.map(({ answer }) => answer).join(', ')}: use at least 2 and none for more than half` });
    }
    return violations;
  }

  function metaViolations(lesson: Lesson): Violation[] {
    const violations: Violation[] = [];
    if (lesson.resources.length < 2 || lesson.resources.length > 6) {
      violations.push({ rule: 'resources-count', detail: `${lesson.resources.length} resources, expected 2-6` });
    }
    for (const { url } of lesson.resources) {
      if (!URL.canParse(url) || !url.startsWith('https://') || !RESOURCE_HOSTS.has(new URL(url).hostname)) {
        violations.push({ rule: 'resources-host', detail: `${url} is not on an official documentation, standards, paper or first-party engineering host` });
      }
    }
    const kind = lesson.hasChallenge ? 'practice' : 'theory';
    if (!lesson.tags.includes(kind) || lesson.tags.some((tag) => !(tag === kind || EXTRA_TAGS.includes(tag)))) {
      violations.push({ rule: 'tags', detail: `tags ${lesson.tags.join(', ')}: "${kind}" plus any of ${EXTRA_TAGS.join(', ')}` });
    }
    if (lesson.concepts.length < 4 || lesson.concepts.length > 8 || lesson.concepts.some(({ description }) => !description.trim().endsWith('.'))) {
      violations.push({ rule: 'concepts', detail: `${lesson.concepts.length} concepts, expected 4-8, each description ending with a period` });
    }
    return violations;
  }

  function datedViolations(lesson: Lesson): Violation[] {
    return datedTextsOf(lesson).map((detail) => ({ rule: 'no-dates', detail }));
  }

  function bridgeViolations(lesson: Lesson): Violation[] {
    return proseOf(lesson).flatMap(([file, text]) => {
      const match = BRIDGE.exec(text)?.[0];
      return match === undefined ? [] : [{ rule: 'no-bridge', detail: `${file} reads "${match}"` }];
    });
  }


  const violationsOf = (lesson: Lesson): Violation[] => [
    ...templateViolations(lesson),
    ...quizViolations(lesson),
    ...metaViolations(lesson),
    ...datedViolations(lesson),
    ...bridgeViolations(lesson),
    ...youNeedViolations(lesson),
  ];

  return { track, modules, lessons, eachLesson, moduleOf, violationsOf };
}

export const languageOf = (challenge: Challenge) => challenge.language ?? 'node';

export const testNamesOf = (challenge: Challenge) => TEST_FILES[challenge.engine].listTestNames(challenge.tests);

export function variantViolations(challenge: Challenge): Violation[] {
  const language = languageOf(challenge);
  const testFile = TEST_FILES[challenge.engine];
  const violations: Violation[] = [];
  const count = testNamesOf(challenge).length;
  if (count < 3 || count > 6) {
    violations.push({ rule: 'tests-count', detail: `[${language}] ${testFile.file} has ${count} tests, expected 3-6` });
  }
  const marked = markedTests(challenge.tests, testFile).filter(({ text, declaresTest }) => text !== '' && declaresTest).length;
  if (!testFile.marker || marked !== 1) {
    violations.push({ rule: 'tests-beginner-mistake', detail: `[${language}] ${testFile.file} marks ${marked} tests as the beginner mistake on the line above the test, expected 1` });
  }
  if (challenge.engine === 'csharp' && unawaitedThrowsAsync(challenge.tests)) {
    violations.push({ rule: 'tests-await-throws-async', detail: `[${language}] ${testFile.file} calls Assert.ThrowsAsync without await` });
  }
  if (challenge.instructions.trimStart().startsWith('#')) {
    violations.push({ rule: 'challenge-no-heading', detail: `[${language}] challenge.md starts with prose (the Challenge tab supplies the title)` });
  }
  if (challenge.hints.length < 2 || challenge.hints.length > 4) {
    violations.push({ rule: 'hints-count', detail: `[${language}] ${challenge.hints.length} hints, expected 2-4` });
  }
  return violations;
}
