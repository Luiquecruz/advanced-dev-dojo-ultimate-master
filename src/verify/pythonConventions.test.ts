// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { trackById } from '../content/allContent';
import type { Lesson } from '../content/types';
import { PYTHON_PENDING_HEADERS, PYTHON_PENDING_REWRITE } from './pythonPendingRewrite';

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
const HOW_IT_WORKS = '## How it works';
const COMMON_MISTAKES = '## Common mistakes';
const CLOSING = '## When to choose it';
const FENCES = ['py', 'text', 'bash', 'toml', 'json'];
/**
 * Comparisons with another language and names from another ecosystem (02-content-standards.md "No bridges"): the track assumes no
 * prior programming language. `===` and `!==` count only between operands or alone in backticks, so a `=== Report ===` or `=====`
 * banner passes; `??` counts outside a string literal.
 * C is not listed: CPython and its extension modules are written in it, so "C extension" and "the C API" are Python terms.
 */
const BRIDGE =
  /\bJavaScript\b|\bTypeScript\b|\bJS\b|\bTS\b|Node\.js|Node developer|\bnpm\b|\bnpx\b|\bpnpm\b|\byarn\b|\bDeno\b|\bBun\b|package\.json|node_modules|\btsc\b|`[!=]==`|[\w)\]]\s*[!=]==\s*[\w([-]|[\w)\]]\s*[!=]==\s+["']|(?<!["'])\?\?=?(?!["'])|Object\.groupBy|Object\.seal|Object\.freeze|structuredClone|Symbol\.dispose|new Proxy|console\.log|TC39|ECMAScript|\bES20\d\d\b|ESLint|Prettier|\bBiome\b|\bZod\b|\blodash\b|Vitest|\bJest\b|\b[Pp]romises?\b|\bPHP|Magento|\bRust\b|\bJava\b|\bGolang\b|\bRuby\b|\bKotlin\b|\bSwift\b|C\+\+|C#|Node['’]s\b|\bNode (scripts?|returns|developers?)\b|\bES modules?\b|\bAxios\b|\bExpress\b|JSON\.(parse|stringify)|\binstanceof\b|\btypeof\b|AggregateError|\bprocess\.(argv|exit)\b|Object\.(assign|keys|entries|fromEntries)\b|`(var|let|const|undefined)`|\bArray (methods|chains)\b|Array\.from|extends Array|\bV8\b/;
/** Hosts of other languages' documentation; a Python lesson cites docs.python.org, the PEPs and the libraries it teaches. */
const BLOCKED_HOSTS = ['developer.mozilla.org', 'nodejs.org', 'zod.dev', 'typescriptlang.org', 'vitest.dev', 'axios-http.com', 'expressjs.com'];
const BEGINNER_MISTAKE = /^# beginner mistake: (.*)$/;

/**
 * Existing content that breaks a rule, reported to the author instead of being edited here.
 * Keys are `<lesson key>#<rule>`; remove an entry as soon as the lesson is fixed (a stale entry fails the suite).
 */
const KNOWN_EXCEPTIONS: Record<string, string> = {};

const pending = (lesson: Lesson, rule: string) => PYTHON_PENDING_REWRITE[lesson.key]?.includes(rule) ?? false;

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

/** The text of a `##` section up to the next `##` heading outside a code fence, or undefined when the section is missing. */
function sectionOf(markdown: string, heading: string): string | undefined {
  const lines = markdown.split('\n');
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start === -1) {
    return undefined;
  }
  const body: string[] = [];
  let fenced = false;
  for (const line of lines.slice(start + 1)) {
    if (line.trimStart().startsWith('```')) {
      fenced = !fenced;
    }
    if (!fenced && /^## /.test(line)) {
      break;
    }
    body.push(line);
  }
  return body.join('\n');
}

/** Every text a learner reads or edits in a lesson, labelled by where it comes from. */
function learnerTexts(lesson: Lesson): Array<[string, string]> {
  const meta = rawMeta(lesson);
  const texts: Array<[string, string]> = [
    ['theory.md', lesson.theory],
    ['meta.json', `${String(meta.title ?? '')}\n${lesson.summary}\n${lesson.resources.map(({ label, url }) => `${label} ${url}`).join('\n')}`],
    ['concepts.json', lesson.concepts.map(({ term, description }) => `${term} ${description}`).join('\n')],
    ['quiz.json', lesson.quiz.map(({ question, options, explanation }) => [question, ...options, explanation].join('\n')).join('\n')],
  ];
  const challenge = lesson.challenge;
  if (challenge) {
    texts.push(['challenge.md', challenge.instructions], ['hints.md', challenge.hints.join('\n')], ['approach.md', challenge.approach], ['tests.py', challenge.tests]);
    for (const [side, files] of [['starter', challenge.starter], ['solution', challenge.solution]] as const) {
      Object.entries(files).forEach(([name, text]) => texts.push([`${side}/${name}`, text]));
    }
  }
  return texts;
}

function checkBridges(lesson: Lesson): Violation[] {
  return learnerTexts(lesson).flatMap(([file, text]) => {
    const match = BRIDGE.exec(text);
    return match ? [{ rule: 'no-bridge', detail: `${file} compares with another language ("${match[0]}" in "${lineAround(text, match.index)}")` }] : [];
  });
}

function lineAround(text: string, index: number): string {
  const start = text.lastIndexOf('\n', index) + 1;
  const end = text.indexOf('\n', index);
  return text.slice(start, end === -1 ? undefined : end).trim().slice(0, 80);
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
    const blocked = BLOCKED_HOSTS.find((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`));
    if (blocked) {
      violations.push({ rule: 'resources-host', detail: `${url} documents another language; cite docs.python.org, a PEP or the library's own docs` });
    }
  }
  if (kind === 'adr') {
    const urls = lesson.resources.flatMap((resource) => (URL.canParse(resource.url) ? [new URL(resource.url)] : []));
    const citesNygard = urls.some((url) => url.hostname === 'cognitect.com' || url.hostname.endsWith('.cognitect.com'));
    const citesMadr = urls.some((url) => url.hostname === 'adr.github.io' && url.pathname.startsWith('/madr'));
    if (!citesNygard || !citesMadr) {
      violations.push({ rule: 'adr-resources', detail: 'ADR resources must cite Nygard (cognitect.com) and MADR (adr.github.io/madr)' });
    }
  }
  return violations;
}

function checkTheory(lesson: Lesson, kind: Kind): Violation[] {
  const violations: Violation[] = [];
  const theory = lesson.theory;
  const count = words(theory);
  const [min, max] = kind === 'map' ? [200, 500] : kind === 'practice' || kind === 'capstone' ? [300, 1000] : [250, 1000];
  if (count < min || count > max) {
    violations.push({ rule: 'theory-length', detail: `theory has ${count} words, expected ${min}-${max}` });
  }
  const fences = [...theory.matchAll(/^```(\S*)/gm)].map((match) => match[1]).filter(Boolean);
  const wrong = fences.filter((language) => !FENCES.includes(language));
  if (wrong.length > 0) {
    violations.push({ rule: 'theory-fences', detail: `use ${FENCES.join('/')} fences, found ${[...new Set(wrong)].join(', ')}` });
  }
  theory
    .split('\n')
    .filter((line) => /^\s*>.*\*\*Status as of/.test(line))
    .filter((line) => !STATUS.test(line.trim()))
    .forEach((line) => violations.push({ rule: 'theory-status', detail: `status line must read "> **Status as of <Month YYYY>:**": ${line.trim().slice(0, 60)}` }));
  if (/\bTODO\b/.test(theory)) {
    violations.push({ rule: 'no-todo', detail: 'theory.md still holds TODO text' });
  }
  const headings = secondLevelHeadings(theory);
  const bridges = headings.filter((heading) => heading.startsWith('## Coming from'));
  if (bridges.length > 0) {
    violations.push({ rule: 'theory-no-bridge', detail: `remove the bridge section ${bridges.join(', ')}` });
  }
  if (kind !== 'practice' && kind !== 'capstone') {
    return violations;
  }
  const mistakes = sectionOf(theory, COMMON_MISTAKES);
  if (mistakes === undefined) {
    violations.push({ rule: 'theory-common-mistakes', detail: `${kind} theory needs a "${COMMON_MISTAKES}" section` });
  } else {
    const count = words(mistakes);
    if (count < 40 || count > 250) {
      violations.push({ rule: 'theory-common-mistakes', detail: `"${COMMON_MISTAKES}" has ${count} words, expected 40-250` });
    }
    if (!/^```py\s*$/m.test(mistakes) || !/\*\*[^*\n]+\*\*/.test(mistakes)) {
      violations.push({ rule: 'theory-common-mistakes', detail: `"${COMMON_MISTAKES}" needs the wrong code and the fix in a py fence and the mistake in bold` });
    }
  }
  const mechanism = headings.indexOf(HOW_IT_WORKS);
  const mistakesAt = headings.indexOf(COMMON_MISTAKES);
  if (mechanism === -1 || (mistakesAt !== -1 && mistakesAt < mechanism)) {
    violations.push({ rule: 'theory-order', detail: `${kind} theory needs "${HOW_IT_WORKS}" before "${COMMON_MISTAKES}"` });
  }
  if (headings.at(-1) !== CLOSING) {
    violations.push({ rule: 'theory-closing', detail: `${kind} theory must end with "${CLOSING}", last section is "${headings.at(-1) ?? 'none'}"` });
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
  if (kind === 'practice' || kind === 'capstone') {
    violations.push(...checkBeginnerMistake(challenge.tests));
  }
  for (const file of ['challenge.md', 'hints.md', 'approach.md', 'tests.py']) {
    const path = resolve(directory, file);
    if (existsSync(path) && /\bTODO\b/.test(readFileSync(path, 'utf8'))) {
      violations.push({ rule: 'no-todo', detail: `${file} still holds TODO text` });
    }
  }
  return violations;
}

/** One test carries `# beginner mistake: <text>` on the line right above its `@test`. */
function checkBeginnerMistake(tests: string): Violation[] {
  const lines = tests.split('\n');
  const markers = lines.flatMap((line, index) => {
    const match = BEGINNER_MISTAKE.exec(line.trimEnd());
    return match ? [{ text: match[1].trim(), next: lines[index + 1] ?? '' }] : [];
  });
  if (markers.length !== 1) {
    return [{ rule: 'tests-beginner-mistake', detail: `tests.py needs exactly one "# beginner mistake: <text>" line above a @test, found ${markers.length}` }];
  }
  const [marker] = markers;
  if (!marker.next.startsWith('@test(') || marker.text.length < 10) {
    return [{ rule: 'tests-beginner-mistake', detail: 'the "# beginner mistake:" line names the mistake and sits right above its @test' }];
  }
  return [];
}

function violationsOf(lesson: Lesson): Violation[] {
  const kind = kindOf(lesson);
  return [
    ...checkMeta(lesson, kind),
    ...checkResources(lesson, kind),
    ...checkTheory(lesson, kind),
    ...checkQuiz(lesson, kind),
    ...checkChallenge(lesson, kind),
    ...checkBridges(lesson),
  ];
}

function unexpected(lesson: Lesson): string[] {
  return violationsOf(lesson)
    .filter((violation) => !(`${lesson.key}#${violation.rule}` in KNOWN_EXCEPTIONS) && !pending(lesson, violation.rule))
    .map((violation) => `${violation.rule}: ${violation.detail}`);
}

/** The track and module titles and descriptions the carousel and the module headers show, keyed like PYTHON_PENDING_HEADERS. */
const headerTexts: Array<[string, string]> = track
  ? [
      [`track:${track.id}`, `${track.title}\n${track.description}`],
      ...track.modules.map((module): [string, string] => [`module:${track.id}/${module.id}`, `${module.title}\n${module.description}`]),
    ]
  : [];
const headerBridges = new Map(headerTexts.flatMap(([key, text]) => {
  const match = BRIDGE.exec(text);
  return match ? [[key, match[0]] as const] : [];
}));

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

  it('keeps Python bytecode caches out of lesson folders', () => {
    const root = resolve(CONTENT, 'python');
    const caches = readdirSync(root, { recursive: true, encoding: 'utf8' }).filter((path) => /(^|\/)__pycache__(\/|$)|\.pyc$/.test(path));
    expect(caches).toEqual([]);
  });

  it('compares with no other language in the track and module titles and descriptions', () => {
    const unexpected = [...headerBridges].filter(([key]) => !PYTHON_PENDING_HEADERS[key]?.includes('no-bridge')).map(([key, name]) => `${key} names "${name}"`);
    const stale = Object.entries(PYTHON_PENDING_HEADERS).flatMap(([key, rules]) => rules.filter((rule) => rule !== 'no-bridge' || !headerBridges.has(key)).map((rule) => `${key}#${rule}`));
    expect({ unexpected, stale }).toEqual({ unexpected: [], stale: [] });
  });

  it('matches other-language names and leaves Python text alone', () => {
    const caught = ['ESLint + Prettier', '`??` replaces only `null`', 'opt-in since ES2022', 'if (a === b)', 'a !== b', 'written in Rust', 'z.object with Zod',
      "Node's `path.join` would concatenate", 'as Node returns', 'ES module bindings are live', 'behaves like `var`, not `let`', 'Axios interceptors and Express middleware',
      'Node scripts read `process.argv`', '`JSON.parse` and `JSON.stringify`', '`instanceof` checks', 'an `AggregateError`', 'Array methods', 'Array chains',
      '`Object.assign`', 'the `null` / `undefined` row', 'V8 optimizes', 'class Stack extends Array'];
    const allowed = ['print("=== Report ===")', '======================================================================', 'country == "??"', 'a C extension releases the GIL', 'undefined names raise NameError', 'the JSON Schema `null` type', 'isinstance(value, int)', 'subprocess.run([sys.executable])', 'sys.argv[1:]', 'express the rule as a function'];
    expect(caught.filter((text) => !BRIDGE.test(text))).toEqual([]);
    expect(allowed.filter((text) => BRIDGE.test(text))).toEqual([]);
  });

  it('keeps the known exceptions list honest', () => {
    const stale = Object.keys(KNOWN_EXCEPTIONS).filter((key) => {
      const [lessonKey, rule] = key.split('#');
      const lesson = lessons.find((candidate) => candidate.key === lessonKey);
      return !lesson || !violationsOf(lesson).some((violation) => violation.rule === rule);
    });
    expect(stale).toEqual([]);
  });

  it('keeps the pending rewrite list honest', () => {
    const stale = Object.entries(PYTHON_PENDING_REWRITE).flatMap(([lessonKey, rules]) => {
      const lesson = lessons.find((candidate) => candidate.key === lessonKey);
      const broken = new Set(lesson ? violationsOf(lesson).map((violation) => violation.rule) : []);
      return rules.filter((rule) => !broken.has(rule)).map((rule) => `${lessonKey}#${rule}`);
    });
    expect(stale).toEqual([]);
  });

  it.each(selected.map((lesson) => [lesson.key, lesson] as const))('%s meets the Definition of Done', (_, lesson) => {
    expect(unexpected(lesson)).toEqual([]);
  });
});
