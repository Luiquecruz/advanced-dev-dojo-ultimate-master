import { describe, expect, it } from 'vitest';
import { trackById } from '../content/allContent';
import { LANGUAGES } from '../content/languages';
import type { Challenge, Lesson } from '../content/types';
import { nodeAdapter } from '../engines/node/adapter';
import { markedTests, TEST_FILES } from '../engines/testFiles';
import { defineChallengeSuite } from './challengeSuite';
import { unawaitedThrowsAsync } from './csharpChecks';
import { DATED, datedIn, datedTextsOf, proseOf } from './noDates';
import { csharpGrader, frameworkGrader, pythonGrader } from './graders';

/**
 * Verification of the System Design track: the content standards of .claude/docs/system-design-track.md and, through the engine of each
 * language the learner can choose, every challenge's solution passing and starter failing.
 */

const TRACK_ID = 'system-design';
const COMMON_MISTAKES = '## Common mistakes';
const CLOSING_HEADINGS = [COMMON_MISTAKES, '## In practice', '## Check yourself'];
const EXTRA_TAGS = ['core', 'case-study', 'performance', 'ai'];
const SKIP_SENTENCE = 'If you can solve the challenge of its last lesson, start at module 01.';
/** Official documentation, standards bodies, primary papers and first-party engineering blogs (system-design-track.md "Resources"). */
const RESOURCE_HOSTS = new Set([
  'developer.mozilla.org', 'www.rfc-editor.org', 'datatracker.ietf.org', 'httpwg.org', 'html.spec.whatwg.org', 'grpc.io', 'protobuf.dev',
  'redis.io', 'www.postgresql.org', 'dev.mysql.com', 'www.mongodb.com', 'cassandra.apache.org', 'kafka.apache.org', 'rocksdb.org',
  'docs.aws.amazon.com', 'aws.amazon.com', 'cloud.google.com', 'learn.microsoft.com', 'developers.cloudflare.com', 'nginx.org', 'docs.nginx.com',
  'www.envoyproxy.io', 'docs.haproxy.org', 'kubernetes.io', 'sre.google', 'research.google', 'raft.github.io', 'microservices.io', 'debezium.io',
  'h3geo.org', 'www.uber.com', 'discord.com', 'www.scylladb.com', 'opensource.docs.scylladb.com', 'www.erlang.org', 'www.rust-lang.org',
  'github.com', 'arxiv.org', 'proceedings.neurips.cc', 'www.usenix.org', 'dl.acm.org', 'docs.pinecone.io', 'qdrant.tech', 'weaviate.io',
  'docs.pingcap.com', 'www.elastic.co', 'jepsen.io', 'opentelemetry.io', 'prometheus.io', 'docs.cloud.google.com', 'martinfowler.com', 'builder.aws.com',
]);
/**
 * A bridge from another programming language or ecosystem (system-design-track.md "No bridges"): the track teaches architecture, not a
 * translation. Naming a language as part of a system (Rust services, the JVM garbage collector) is content, not a bridge.
 */
const BRIDGE =
  /^## Coming from\b|\b(?:[Ii]f|[Ww]hen) you (?:know|come from|are used to|have used) (?:PHP|Java|Python|C#|Ruby|Go|JavaScript|TypeScript|Node)(?![\w#])|\b(?:just )?like (?:in|with) (?:PHP|Java|Python|C#|Ruby|Go|JavaScript)(?![\w#])|\bPHP\b|[Mm]agento|\bLaravel\b|\bSymfony\b/m;

interface Violation {
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

const track = trackById.get(TRACK_ID);
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
  const [minimum, maximum] = moduleOf(lesson).number === 0 ? [300, 1000] : [500, 1300];
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
    if (!url.startsWith('https://') || !RESOURCE_HOSTS.has(new URL(url).hostname)) {
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

const languageOf = (challenge: Challenge) => challenge.language ?? 'node';

const testNamesOf = (challenge: Challenge) => TEST_FILES[challenge.engine].listTestNames(challenge.tests);

function variantViolations(challenge: Challenge): Violation[] {
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

/** A word that belongs to one language: a camelCase or snake_case identifier, or the verb one language uses for errors. */
const LANGUAGE_SPECIFIC_WORD = /\b[a-z][a-z0-9]*[A-Z][A-Za-z0-9]*\b|\b[a-z0-9]+_[a-z0-9_]+\b|\b(?:throws|raises)\b/;

/** A learner who switches language meets the same lesson: every variant declares the same test names, in the same order. */
function sameTestsViolations(lesson: Lesson): Violation[] {
  const [first, ...others] = lesson.variants;
  if (!first) {
    return [];
  }
  const expected = testNamesOf(first).join('\n');
  return others
    .filter((challenge) => testNamesOf(challenge).join('\n') !== expected)
    .map((challenge) => ({ rule: 'same-tests', detail: `[${languageOf(challenge)}] declares different test names or order than [${languageOf(first)}]` }));
}

/** Test names describe behavior in plain words, so the same name reads naturally in every language. */
function neutralNameViolations(lesson: Lesson): Violation[] {
  return lesson.variants.flatMap((challenge) =>
    testNamesOf(challenge)
      .filter((name) => LANGUAGE_SPECIFIC_WORD.test(name))
      .map((name) => ({ rule: 'test-name-neutral', detail: `[${languageOf(challenge)}] "${name}" names "${LANGUAGE_SPECIFIC_WORD.exec(name)?.[0]}"` })),
  );
}

const challengeViolations = (lesson: Lesson): Violation[] => [
  ...lesson.variants.flatMap(variantViolations),
  ...sameTestsViolations(lesson),
  ...neutralNameViolations(lesson),
];

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
  ...challengeViolations(lesson),
  ...datedViolations(lesson),
  ...bridgeViolations(lesson),
  ...youNeedViolations(lesson),
];

describe('system-design track', () => {
  it('offers Node.js first, only languages whose test file has a beginner-mistake marker, and opens with an optional module 00 that can be skipped', () => {
    expect(track!.languages[0]).toBe('node');
    expect(track!.languages.filter((language) => !TEST_FILES[LANGUAGES[language].engine].marker)).toEqual([]);
    expect(modules[0].number).toBe(0);
    expect(modules[0].optional).toBe(true);
    expect(modules[0].description.endsWith(SKIP_SENTENCE)).toBe(true);
  });

  it('carries no dates and no language bridges in the track and module texts', () => {
    const texts = [`${track!.title}\n${track!.description}\n${track!.version}`, ...modules.map((module) => `${module.title}\n${module.description}`)];
    expect(texts.filter((text) => datedIn(text) !== undefined || BRIDGE.test(text))).toEqual([]);
  });

  it('recognises changelog wording and leaves numbers alone', () => {
    const dated = ['## Status as of 2026-05-01', 'released in 2024', 'as of 2025', 'since 2017', 'March 2026', 'see the changelog', 'the latest version adds', 'on 2026-01-15'];
    const timeless = ['2,000 requests per second', '86,400 seconds in a day', 'least recently used', 'port 2049', 'a 2048-dimension vector', 'in 20 ms', 'version 4 of the protocol'];
    expect(dated.filter((text) => !DATED.test(text))).toEqual([]);
    expect(timeless.filter((text) => DATED.test(text))).toEqual([]);
  });

  it('recognises identifiers in test names and leaves plain words alone', () => {
    const specific = ['formatEvent writes data lines', 'who_am_i answers 401', 'the constructor throws', 'raises a ValueError', 'ttlMs passes'];
    const neutral = ['a token bucket refills lazily', 'lookup misses for another tenant', 'next skips a server marked down', 'answers 429 with Retry-After', 'p99 latency'];
    expect(specific.filter((name) => !LANGUAGE_SPECIFIC_WORD.test(name))).toEqual([]);
    expect(neutral.filter((name) => LANGUAGE_SPECIFIC_WORD.test(name))).toEqual([]);
  });

  it('recognises language bridges and leaves systems that use a language alone', () => {
    const bridges = ['## Coming from PHP', 'If you know Java, a saga is', 'just like in Python', 'a Magento cron', 'when you come from C#'];
    const content = ['Rust services in front of the database', 'JVM garbage-collection pauses', 'Elixir on the BEAM', 'written in C++', 'like a queue'];
    expect(bridges.filter((text) => !BRIDGE.test(text))).toEqual([]);
    expect(content.filter((text) => BRIDGE.test(text))).toEqual([]);
  });

  it.each(eachLesson)('%s ships its challenge, if any, in every language of the track, each graded by its own engine', (_, lesson) => {
    const expected = lesson.hasChallenge ? track!.languages.map((language) => [language, LANGUAGES[language].engine]) : [];
    expect(lesson.variants.map((challenge) => [challenge.language, challenge.engine])).toEqual(expected);
  });

  it.each(eachLesson)('%s follows the content standards', (_, lesson) => {
    expect(violationsOf(lesson).map(({ rule, detail }) => `${rule}: ${detail}`)).toEqual([]);
  });
});

defineChallengeSuite(TRACK_ID, frameworkGrader(nodeAdapter), 'node');
defineChallengeSuite(TRACK_ID, pythonGrader(), 'python');
defineChallengeSuite(TRACK_ID, csharpGrader(), 'csharp');
