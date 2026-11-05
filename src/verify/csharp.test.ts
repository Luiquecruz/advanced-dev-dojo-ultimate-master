// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { trackById } from '../content/allContent';
import type { Lesson } from '../content/types';

/**
 * Definition of Done for the C# track (.claude/docs/csharp-track/06-content-standards.md). The track has no C# engine,
 * so every lesson is theory + quiz; this suite is its verification and fails if a challenge appears.
 */

const CONTENT = resolve(import.meta.dirname, '../content');
const CATALOG = readFileSync(resolve(import.meta.dirname, '../../.claude/docs/csharp-track/03-balta-catalog.md'), 'utf8');
const CHALLENGE_FILES = /^(starter|solution|tests|challenge|hints|approach|variants)(\.|$)/;
const STATUS_TAGS = ['recommended', 'established', 'legacy', 'context'];
const TIER_TAGS = ['core', 'deepening', 'legacy'];
const KIND_TAGS = ['theory', 'project'];
const THEORY_HEADINGS = ['## Coming from PHP/Magento', '## In practice', '## Check yourself'];
const PROJECT_HEADINGS = ['## Coming from PHP/Magento', '## Goal', '## Features', '## Acceptance criteria', '## Suggested steps', '## Stretch goals', '## Where to get help', '## Check yourself'];
const BALTA_URL = /^https:\/\/balta\.io\/(courses|paths|formations)\/([a-z0-9-]+)$/;

/**
 * `<kind>/<slug>` pairs from the verified balta.io catalog tables: a bare slug cell is a course, and a `paths/` or
 * `formations/` cell keeps its own kind. Lessons can only link pages that exist, under the right URL prefix.
 */
function catalogPages(): Set<string> {
  const pages = new Set<string>();
  for (const line of CATALOG.split('\n')) {
    if (!line.startsWith('|')) continue;
    for (const cell of line.split('|').map((part) => part.trim())) {
      const match = /^(?:(courses|paths|formations)\/)?([a-z0-9]+(?:-[a-z0-9]+)+)(?: \(sic\))?$/.exec(cell);
      if (match) pages.add(`${match[1] ?? 'courses'}/${match[2]}`);
    }
  }
  return pages;
}

/** The `##` headings of a lesson, in order. */
function headingsOf(theory: string): string[] {
  return theory.split('\n').filter((line) => line.startsWith('## '));
}

/** Number of list items in the `## Check yourself` section. */
function checkYourselfQuestions(theory: string): number {
  const section = theory.split('\n## Check yourself\n')[1] ?? '';
  return section.split('\n## ')[0].split('\n').filter((line) => /^(\d+\.|-|\*) /.test(line.trim())).length;
}

const track = trackById.get('csharp');
const lessons: Lesson[] = track ? track.modules.flatMap((module) => module.lessons) : [];
const pages = catalogPages();
const kindOf = (lesson: Lesson) => (lesson.tags.includes('project') ? 'project' : 'theory');

describe('csharp track', () => {
  it('is registered with the placeholder engine and modules', () => {
    expect(track).toBeDefined();
    expect(track!.engine).toBe('typescript');
    expect(track!.modules.length).toBeGreaterThan(0);
    expect(pages.size).toBeGreaterThan(20);
  });

  it.each(lessons.map((lesson) => [lesson.key, lesson] as const))('%s ships no challenge (there is no C# engine)', (_, lesson) => {
    expect(lesson.hasChallenge).toBe(false);
    expect(lesson.variants).toEqual([]);
    expect(readdirSync(resolve(CONTENT, lesson.folder)).filter((name) => CHALLENGE_FILES.test(name))).toEqual([]);
  });

  it.each(lessons.map((lesson) => [lesson.key, lesson] as const))('%s has status, tier and kind tags', (_, lesson) => {
    expect(lesson.tags).toHaveLength(3);
    expect(STATUS_TAGS).toContain(lesson.tags[0]);
    expect(TIER_TAGS).toContain(lesson.tags[1]);
    expect(KIND_TAGS).toContain(lesson.tags[2]);
  });

  it.each(lessons.map((lesson) => [lesson.key, lesson] as const))('%s follows the theory template', (_, lesson) => {
    const kind = kindOf(lesson);
    expect(lesson.theory.startsWith('# ')).toBe(true);
    const words = lesson.theory.split(/\s+/).filter(Boolean).length;
    expect(words).toBeGreaterThanOrEqual(kind === 'project' ? 400 : 500);
    expect(words).toBeLessThanOrEqual(1300);
    const headings = kind === 'project' ? PROJECT_HEADINGS : THEORY_HEADINGS;
    const positions = headings.map((heading) => lesson.theory.indexOf(`\n${heading}\n`));
    expect(headings.filter((_, index) => positions[index] === -1)).toEqual([]);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    const actual = headingsOf(lesson.theory);
    expect(actual[0]).toBe('## Coming from PHP/Magento');
    const status = actual.filter((heading) => heading.startsWith('## Status as of'));
    expect(status.length).toBeLessThanOrEqual(1);
    if (status.length === 1) {
      expect(actual.indexOf(status[0])).toBe(actual.indexOf('## Check yourself') - 1);
    }
    if (kind === 'project') {
      expect(actual.filter((heading) => !heading.startsWith('## Status as of'))).toEqual(PROJECT_HEADINGS);
    }
    const questions = checkYourselfQuestions(lesson.theory);
    expect(questions).toBeGreaterThanOrEqual(2);
    expect(questions).toBeLessThanOrEqual(4);
    if (kind === 'theory') {
      expect(lesson.theory).toContain('```csharp');
    }
    for (const status of lesson.theory.match(/^## Status as of.*$/gm) ?? []) {
      expect(status).toMatch(/^## Status as of \d{4}-\d{2}-\d{2}$/);
    }
  });

  it.each(lessons.map((lesson) => [lesson.key, lesson] as const))('%s has 4 to 8 concepts', (_, lesson) => {
    expect(lesson.concepts.length).toBeGreaterThanOrEqual(4);
    expect(lesson.concepts.length).toBeLessThanOrEqual(8);
    lesson.concepts.forEach((concept) => expect(concept.description.trim().endsWith('.')).toBe(true));
  });

  it.each(lessons.map((lesson) => [lesson.key, lesson] as const))('%s has a 5 to 6 question quiz with explained answers', (_, lesson) => {
    expect(lesson.quiz.length).toBeGreaterThanOrEqual(5);
    expect(lesson.quiz.length).toBeLessThanOrEqual(6);
    lesson.quiz.forEach((question) => {
      expect(question.options).toHaveLength(4);
      expect(new Set(question.options).size).toBe(4);
      expect(question.explanation.trim().length).toBeGreaterThan(40);
    });
    expect(new Set(lesson.quiz.map((question) => question.answer)).size).toBeGreaterThanOrEqual(2);
  });

  it.each(lessons.map((lesson) => [lesson.key, lesson] as const))('%s links official docs and only catalogued balta.io courses', (_, lesson) => {
    expect(lesson.resources.length).toBeGreaterThanOrEqual(2);
    expect(lesson.resources.length).toBeLessThanOrEqual(6);
    expect(lesson.resources.some((resource) => resource.url.startsWith('https://learn.microsoft.com/'))).toBe(true);
    for (const resource of lesson.resources) {
      expect(resource.url.startsWith('https://')).toBe(true);
      if (resource.url.includes('balta.io')) {
        const match = BALTA_URL.exec(resource.url);
        expect(match, `${resource.url} is not a balta.io course, path or formation URL`).not.toBeNull();
        expect(pages.has(`${match![1]}/${match![2]}`), `${match![1]}/${match![2]} is not in 03-balta-catalog.md`).toBe(true);
      }
    }
  });
});
