// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { trackById } from '../content/allContent';
import type { Lesson } from '../content/types';

/**
 * Definition of Done for the Python track (.claude/docs/python-track/02-content-standards.md and
 * 11-working-agreement.md). Structure checks only: grading lives in python.test.ts.
 */

type Kind = 'map' | 'quiz' | 'practice' | 'adr' | 'capstone';

interface Violation {
  rule: string;
  detail: string;
}

const CONTENT = resolve(import.meta.dirname, '../content');
const MATURITY = ['established', 'emerging', 'hype-watch'];
const META_KEYS = new Set(['title', 'summary', 'level', 'tags', 'entry', 'run', 'resources']);
const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December';
const STATUS = new RegExp(`^> \\*\\*Status as of (${MONTHS}) \\d{4}:\\*\\*`);
const JS_CONTRAST = '## Coming from TypeScript and JavaScript';
const CLOSING = '## When to choose it';

/**
 * Existing content that breaks a rule, reported to the author instead of being edited here.
 * Keys are `<lesson key>#<rule>`; remove an entry as soon as the lesson is fixed (a stale entry fails the suite).
 */
const KNOWN_EXCEPTIONS: Record<string, string> = {};

const track = trackById.get('python');
const filter = process.env.LESSON;
const lessons = (track?.lessons ?? []) as Lesson[];
const selected = lessons.filter((lesson) => !filter || (filter.includes('/') ? lesson.key === filter : lesson.id.includes(filter)));

function kindOf(lesson: Lesson): Kind {
  if (lesson.id.endsWith('-adr')) {
    return 'adr';
  }
  if (lesson.id.includes('capstone')) {
    return 'capstone';
  }
  if (lesson.id.endsWith('-map')) {
    return 'map';
  }
  return lesson.challenge ? 'practice' : 'quiz';
}

function rawMeta(lesson: Lesson): Record<string, unknown> {
  return JSON.parse(readFileSync(resolve(CONTENT, lesson.folder, 'meta.json'), 'utf8')) as Record<string, unknown>;
}

function words(markdown: string): number {
  return markdown.split(/\s+/).filter(Boolean).length;
}

function secondLevelHeadings(markdown: string): string[] {
  const headings: string[] = [];
  let fenced = false;
  for (const line of markdown.split('\n')) {
    if (line.trimStart().startsWith('```')) {
      fenced = !fenced;
      continue;
    }
    if (!fenced && /^## /.test(line)) {
      headings.push(line.trim());
    }
  }
  return headings;
}

function testNames(tests: string): { names: string[]; dynamic: number } {
  const decorators = [...tests.matchAll(/^@test\((.*)\)\s*$/gm)].map((match) => match[1].trim());
  const literal = /^(["'])(.*)\1$/;
  const names = decorators.map((argument) => literal.exec(argument)?.[2]).filter((name): name is string => name !== undefined);
  return { names, dynamic: decorators.length - names.length };
}

function checkMeta(lesson: Lesson, kind: Kind): Violation[] {
  const violations: Violation[] = [];
  const meta = rawMeta(lesson);
  const unknown = Object.keys(meta).filter((key) => !META_KEYS.has(key));
  if (unknown.length > 0) {
    violations.push({ rule: 'meta-keys', detail: `unknown meta.json keys: ${unknown.join(', ')}` });
  }
  const tags = lesson.tags;
  if (!MATURITY.includes(tags[0])) {
    violations.push({ rule: 'tags-maturity', detail: `first tag must be one of ${MATURITY.join('/')}, got "${tags[0]}"` });
  }
  if (!tags.includes('core')) {
    violations.push({ rule: 'tags-core', detail: 'tags must include "core"' });
  }
  const expectedPurpose = lesson.challenge ? 'practice' : 'theory';
  const purposes = tags.filter((tag) => tag === 'practice' || tag === 'theory');
  if (purposes.length !== 1 || purposes[0] !== expectedPurpose) {
    violations.push({ rule: 'tags-purpose', detail: `tags must include exactly "${expectedPurpose}", got [${tags.join(', ')}]` });
  }
  if (kind === 'adr' && tags.join(',') !== 'established,core,practice') {
    violations.push({ rule: 'adr-tags', detail: `ADR tags must be [established, core, practice], got [${tags.join(', ')}]` });
  }
  if (kind === 'adr' && !['intermediate', 'advanced'].includes(lesson.level)) {
    violations.push({ rule: 'adr-level', detail: `ADR level must be intermediate or advanced, got ${lesson.level}` });
  }
  if (lesson.challenge) {
    const expectedEntry = kind === 'adr' ? 'adr.py' : 'main.py';
    if (meta.entry !== expectedEntry) {
      violations.push({ rule: 'meta-entry', detail: `meta.json entry must be "${expectedEntry}", got ${JSON.stringify(meta.entry)}` });
    }
  }
  return violations;
}

function checkResources(lesson: Lesson, kind: Kind): Violation[] {
  const violations: Violation[] = [];
  if (lesson.resources.length === 0) {
    violations.push({ rule: 'resources-present', detail: 'meta.json lists no resources' });
  }
  const seen = new Set<string>();
  for (const { label, url } of lesson.resources) {
    if (!label?.trim()) {
      violations.push({ rule: 'resources-label', detail: `resource ${url} has no label` });
    }
    let parsed: URL | undefined;
    try {
      parsed = new URL(url);
    } catch {
      violations.push({ rule: 'resources-url', detail: `malformed URL "${url}"` });
      continue;
    }
    if (parsed.protocol !== 'https:' || !parsed.hostname.includes('.') || /\s/.test(url)) {
      violations.push({ rule: 'resources-url', detail: `URL must be https with a real host: "${url}"` });
    }
    if (seen.has(url)) {
      violations.push({ rule: 'resources-unique', detail: `duplicate URL ${url}` });
    }
    seen.add(url);
  }
  if (kind === 'adr') {
    const urls = lesson.resources.map((resource) => resource.url).join(' ');
    if (!urls.includes('cognitect.com') || !urls.includes('adr.github.io/madr')) {
      violations.push({ rule: 'adr-resources', detail: 'ADR resources must cite Nygard (cognitect.com) and MADR (adr.github.io/madr)' });
    }
  }
  return violations;
}

function checkTheory(lesson: Lesson, kind: Kind): Violation[] {
  const violations: Violation[] = [];
  const theory = lesson.theory;
  const count = words(theory);
  const [min, max] = kind === 'map' ? [200, 500] : [250, 1000];
  if (count < min || count > max) {
    violations.push({ rule: 'theory-length', detail: `theory has ${count} words, expected ${min}-${max}` });
  }
  const fences = [...theory.matchAll(/^```(\S*)/gm)].map((match) => match[1]).filter(Boolean);
  const wrong = fences.filter((language) => !['py', 'ts', 'text', 'bash', 'toml', 'json'].includes(language));
  if (wrong.length > 0) {
    violations.push({ rule: 'theory-fences', detail: `use py/ts fences, found ${[...new Set(wrong)].join(', ')}` });
  }
  theory
    .split('\n')
    .filter((line) => /^\s*>.*\*\*Status as of/.test(line))
    .filter((line) => !STATUS.test(line.trim()))
    .forEach((line) => violations.push({ rule: 'theory-status', detail: `status line must read "> **Status as of <Month YYYY>:**": ${line.trim().slice(0, 60)}` }));
  if (/\bTODO\b/.test(theory)) {
    violations.push({ rule: 'no-todo', detail: 'theory.md still holds TODO text' });
  }
  if (kind !== 'practice') {
    return violations;
  }
  const headings = secondLevelHeadings(theory);
  if (!headings.includes(JS_CONTRAST)) {
    violations.push({ rule: 'theory-js-contrast', detail: `practice theory needs a "${JS_CONTRAST}" section` });
  }
  if (headings.at(-1) !== CLOSING) {
    violations.push({ rule: 'theory-closing', detail: `practice theory must end with "${CLOSING}", last section is "${headings.at(-1) ?? 'none'}"` });
  }
  return violations;
}

function checkQuiz(lesson: Lesson, kind: Kind): Violation[] {
  const violations: Violation[] = [];
  const quiz = lesson.quiz;
  const required = kind === 'map' || kind === 'quiz';
  if (quiz.length === 0) {
    return required ? [{ rule: 'quiz-size', detail: 'quiz lessons need 4-6 questions, found none' }] : [];
  }
  if (kind === 'map' && quiz.length !== 4) {
    violations.push({ rule: 'quiz-size', detail: `map quizzes have 4 questions, found ${quiz.length}` });
  }
  if (kind !== 'map' && (quiz.length < 4 || quiz.length > 6)) {
    violations.push({ rule: 'quiz-size', detail: `quiz needs 4-6 questions, found ${quiz.length}` });
  }
  if (new Set(quiz.map((question) => question.answer)).size === 1) {
    violations.push({ rule: 'quiz-answer-variety', detail: `every answer is index ${quiz[0].answer}` });
  }
  quiz.forEach((question, index) => {
    if (new Set(question.options).size !== question.options.length) {
      violations.push({ rule: 'quiz-options', detail: `question ${index + 1} repeats an option` });
    }
    if (/\bTODO\b/.test(`${question.question} ${question.options.join(' ')} ${question.explanation}`)) {
      violations.push({ rule: 'no-todo', detail: `question ${index + 1} still holds TODO text` });
    }
  });
  return violations;
}

function checkChallenge(lesson: Lesson, kind: Kind): Violation[] {
  const challenge = lesson.challenge;
  if (!challenge) {
    return kind === 'practice' || kind === 'adr' || kind === 'capstone'
      ? [{ rule: 'challenge-present', detail: `${kind} lessons need challenge.md, starter/, solution/ and tests.py` }]
      : [];
  }
  const violations: Violation[] = [];
  const directory = resolve(CONTENT, lesson.folder);
  if (!existsSync(resolve(directory, 'challenge.md')) || challenge.instructions.trim().length < 40) {
    violations.push({ rule: 'challenge-md', detail: 'challenge.md is missing or empty' });
  }
  for (const [side, files] of [['starter', challenge.starter], ['solution', challenge.solution]] as const) {
    if (!(challenge.entry in files)) {
      violations.push({ rule: 'challenge-entry', detail: `${side}/ has no ${challenge.entry}` });
    }
    if (challenge.run && !(challenge.run in files)) {
      violations.push({ rule: 'challenge-run', detail: `${side}/ has no ${challenge.run} (meta.json run)` });
    }
  }
  if (challenge.run === challenge.entry) {
    violations.push({ rule: 'challenge-run', detail: 'run must name a demo, not the entry' });
  }
  if (!/#\s*TODO/.test(challenge.starter[challenge.entry] ?? '')) {
    violations.push({ rule: 'starter-todo', detail: `starter/${challenge.entry} must mark the work with # TODO comments` });
  }
  for (const [name, text] of Object.entries(challenge.solution)) {
    if (/\bTODO\b/.test(text)) {
      violations.push({ rule: 'solution-todo', detail: `solution/${name} still holds TODO text` });
    }
    if (/^\s*global\s+\w/m.test(text)) {
      violations.push({ rule: 'solution-global', detail: `solution/${name} uses a global statement` });
    }
  }
  if (kind === 'adr') {
    for (const [side, files] of [['starter', challenge.starter], ['solution', challenge.solution]] as const) {
      const source = files['adr.py'] ?? '';
      if (!/^ADR\s*(:[^=]+)?=/m.test(source) || !/^PLAN\s*(:[^=]+)?=/m.test(source)) {
        violations.push({ rule: 'adr-constants', detail: `${side}/adr.py must define module-level ADR and PLAN` });
      }
    }
  }
  if (challenge.hints.length < 2 || challenge.hints.length > 4) {
    violations.push({ rule: 'hints-count', detail: `hints.md needs 2-4 hints separated by ---, found ${challenge.hints.length}` });
  }
  if (!/^\s*1\.\s/m.test(challenge.approach)) {
    violations.push({ rule: 'approach-steps', detail: 'approach.md must hold numbered steps' });
  }
  const { names, dynamic } = testNames(challenge.tests);
  if (dynamic > 0) {
    violations.push({ rule: 'tests-names', detail: `${dynamic} @test names are not string literals` });
  }
  const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
  if (duplicates.length > 0) {
    violations.push({ rule: 'tests-names', detail: `duplicate test names: ${[...new Set(duplicates)].join(' | ')}` });
  }
  const total = names.length + dynamic;
  if (total < 3 || total > 6) {
    violations.push({ rule: 'tests-count', detail: `tests.py needs 3-6 tests, found ${total}` });
  }
  for (const file of ['challenge.md', 'hints.md', 'approach.md', 'tests.py']) {
    const path = resolve(directory, file);
    if (existsSync(path) && /\bTODO\b/.test(readFileSync(path, 'utf8'))) {
      violations.push({ rule: 'no-todo', detail: `${file} still holds TODO text` });
    }
  }
  return violations;
}

function violationsOf(lesson: Lesson): Violation[] {
  const kind = kindOf(lesson);
  return [
    ...checkMeta(lesson, kind),
    ...checkResources(lesson, kind),
    ...checkTheory(lesson, kind),
    ...checkQuiz(lesson, kind),
    ...checkChallenge(lesson, kind),
  ];
}

function unexpected(lesson: Lesson): string[] {
  return violationsOf(lesson)
    .filter((violation) => !(`${lesson.key}#${violation.rule}` in KNOWN_EXCEPTIONS))
    .map((violation) => `${violation.rule}: ${violation.detail}`);
}

describe('python track conventions', () => {
  it('loads the python track', () => {
    expect(track).toBeDefined();
  });

  it('opens every module with a map and gives it a module.json', () => {
    const root = resolve(CONTENT, 'python');
    const problems = readdirSync(root)
      .filter((name) => /^\d\d-/.test(name))
      .flatMap((name) => {
        const issues: string[] = [];
        const modulePath = resolve(root, name, 'module.json');
        if (!existsSync(modulePath)) {
          return [`${name}: module.json missing`];
        }
        const meta = JSON.parse(readFileSync(modulePath, 'utf8')) as { title?: string; description?: string };
        if (!meta.title?.trim() || !meta.description?.trim()) {
          issues.push(`${name}: module.json needs title and description`);
        }
        const written = lessons.filter((lesson) => lesson.folder.startsWith(`python/${name}/`));
        if (written.length > 0 && !/^python\/[^/]+\/01-[a-z0-9-]+-map$/.test(written[0].folder)) {
          issues.push(`${name}: first lesson must be 01-<module>-map, got ${written[0].folder}`);
        }
        return issues;
      });
    expect(problems).toEqual([]);
  });

  it('keeps the known exceptions list honest', () => {
    const stale = Object.keys(KNOWN_EXCEPTIONS).filter((key) => {
      const [lessonKey, rule] = key.split('#');
      const lesson = lessons.find((candidate) => candidate.key === lessonKey);
      return !lesson || !violationsOf(lesson).some((violation) => violation.rule === rule);
    });
    expect(stale).toEqual([]);
  });

  it.each(selected.map((lesson) => [lesson.key, lesson] as const))('%s meets the Definition of Done', (_, lesson) => {
    expect(unexpected(lesson)).toEqual([]);
  });
});
