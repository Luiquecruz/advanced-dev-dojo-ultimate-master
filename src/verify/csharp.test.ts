// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { trackById } from '../content/allContent';
import type { Lesson } from '../content/types';
import { defineChallengeSuite } from './challengeSuite';
import { csharpGrader } from './graders';

/**
 * Verification of the C# track: the content standards of its theory and quiz lessons (.claude/docs/csharp-track/06-content-standards.md,
 * merged from the content branch's standards suite without its "no challenge" rule) and, through the C# engine, every challenge's
 * solution passing and starter failing.
 */

const STATUS_TAGS = ['recommended', 'established', 'legacy', 'context'];
const TIER_TAGS = ['core', 'deepening', 'legacy'];
const KIND_TAGS = ['theory', 'project'];
const THEORY_HEADINGS = ['## Coming from PHP/Magento', '## In practice', '## Check yourself'];
const PROJECT_HEADINGS = ['## Coming from PHP/Magento', '## Goal', '## Features', '## Acceptance criteria', '## Suggested steps', '## Stretch goals', '## Where to get help', '## Check yourself'];
/** Official and vendor documentation hosts (06-content-standards.md "Resources"); course platforms are not linked. */
const DOCUMENTATION_HOSTS = new Set([
  'learn.microsoft.com', 'dotnet.microsoft.com', 'devblogs.microsoft.com', 'aspire.dev', 'github.com', 'dotnet.github.io', 'www.nuget.org',
  'xunit.net', 'dotnet.testcontainers.org', 'www.npgsql.org', 'www.rabbitmq.com', 'docs.confluent.io', 'docs.hangfire.io', 'www.quartz-scheduler.net',
  'www.jimmybogard.com', 'xceed.com', 'docs.docker.com', 'kubernetes.io', 'docs.aws.amazon.com', 'docs.github.com', 'www.rfc-editor.org',
  'datatracker.ietf.org', 'openid.net', 'api-security.owasp.org', 'www.php.net',
]);

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
const kindOf = (lesson: Lesson) => (lesson.tags.includes('project') ? 'project' : 'theory');
const eachLesson = lessons.map((lesson) => [lesson.key, lesson] as const);
/** Modules outside the core tier, by module id (05-curriculum.md); every other module is core. */
const MODULE_TIERS: Record<string, string> = { architecture: 'deepening', legacy: 'legacy', 'integration-quality': 'deepening' };
const tierOfModule = (moduleId: string) => MODULE_TIERS[moduleId] ?? 'core';
const eachLessonTier = (track ? track.modules : []).flatMap((module) =>
  module.lessons.map((lesson) => [lesson.key, lesson, tierOfModule(module.id)] as const),
);

describe('csharp track', () => {
  it('runs on the C# engine', () => {
    expect(track!.engine).toBe('csharp');
    expect(track!.modules.length).toBeGreaterThan(0);
  });

  it.each(eachLesson)('%s grades its challenge, if any, with the C# engine', (_, lesson) => {
    expect(lesson.variants.map((challenge) => [challenge.language, challenge.engine])).toEqual(lesson.hasChallenge ? [[undefined, 'csharp']] : []);
  });

  it.each(eachLesson)('%s has status, tier and kind tags', (_, lesson) => {
    expect(lesson.tags).toHaveLength(3);
    expect(STATUS_TAGS).toContain(lesson.tags[0]);
    expect(TIER_TAGS).toContain(lesson.tags[1]);
    expect(KIND_TAGS).toContain(lesson.tags[2]);
  });

  it.each(eachLessonTier)('%s has the tier tag of its module', (_, lesson, tier) => {
    expect(lesson.tags[1]).toBe(tier);
  });

  it.each(eachLesson)('%s follows the theory template', (_, lesson) => {
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
    for (const heading of lesson.theory.match(/^## Status as of.*$/gm) ?? []) {
      expect(heading).toMatch(/^## Status as of \d{4}-\d{2}-\d{2}$/);
    }
  });

  it.each(eachLesson)('%s has 4 to 8 concepts', (_, lesson) => {
    expect(lesson.concepts.length).toBeGreaterThanOrEqual(4);
    expect(lesson.concepts.length).toBeLessThanOrEqual(8);
    lesson.concepts.forEach((concept) => expect(concept.description.trim().endsWith('.')).toBe(true));
  });

  it.each(eachLesson)('%s has a 5 to 6 question quiz with explained answers', (_, lesson) => {
    expect(lesson.quiz.length).toBeGreaterThanOrEqual(5);
    expect(lesson.quiz.length).toBeLessThanOrEqual(6);
    lesson.quiz.forEach((question) => {
      expect(question.options).toHaveLength(4);
      expect(new Set(question.options).size).toBe(4);
      expect(question.explanation.trim().length).toBeGreaterThan(40);
    });
    expect(new Set(lesson.quiz.map((question) => question.answer)).size).toBeGreaterThanOrEqual(2);
  });

  it.each(eachLesson)('%s links official and vendor documentation only', (_, lesson) => {
    expect(lesson.resources.length).toBeGreaterThanOrEqual(2);
    expect(lesson.resources.length).toBeLessThanOrEqual(6);
    expect(lesson.resources.some((resource) => resource.url.startsWith('https://learn.microsoft.com/'))).toBe(true);
    for (const resource of lesson.resources) {
      expect(resource.url.startsWith('https://')).toBe(true);
      expect(DOCUMENTATION_HOSTS.has(new URL(resource.url).hostname), `${resource.url} is not on an official or vendor documentation host`).toBe(true);
    }
  });
});

defineChallengeSuite('csharp', csharpGrader());
