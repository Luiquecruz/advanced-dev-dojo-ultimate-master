// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { trackById } from '../content/allContent';
import type { Lesson } from '../content/types';
import { defineChallengeSuite } from './challengeSuite';
import { CSHARP_PENDING_HEADERS, CSHARP_PENDING_REWRITE } from './csharpPendingRewrite';
import { csharpGrader } from './graders';

/**
 * Verification of the C# track: the content standards of its theory and quiz lessons (.claude/docs/csharp-track/06-content-standards.md,
 * merged from the content branch's standards suite without its "no challenge" rule) and, through the C# engine, every challenge's
 * solution passing and starter failing.
 */

const STATUS_TAGS = ['recommended', 'established', 'legacy', 'context'];
const TIER_TAGS = ['core', 'deepening', 'legacy'];
const KIND_TAGS = ['theory', 'project'];
const COMMON_MISTAKES = '## Common mistakes';
const THEORY_HEADINGS = [COMMON_MISTAKES, '## In practice', '## Check yourself'];
const PROJECT_HEADINGS = ['## Goal', '## Features', '## Acceptance criteria', '## Suggested steps', '## Stretch goals', '## Where to get help', '## Check yourself'];
/** Official and vendor documentation hosts (06-content-standards.md "Resources"); course platforms are not linked. */
const DOCUMENTATION_HOSTS = new Set([
  'learn.microsoft.com', 'dotnet.microsoft.com', 'devblogs.microsoft.com', 'aspire.dev', 'github.com', 'dotnet.github.io', 'www.nuget.org',
  'xunit.net', 'dotnet.testcontainers.org', 'www.npgsql.org', 'www.rabbitmq.com', 'docs.confluent.io', 'docs.hangfire.io', 'www.quartz-scheduler.net',
  'www.jimmybogard.com', 'xceed.com', 'docs.docker.com', 'kubernetes.io', 'docs.aws.amazon.com', 'docs.github.com', 'www.rfc-editor.org',
  'datatracker.ietf.org', 'openid.net', 'api-security.owasp.org',
]);
/**
 * A comparison with PHP or Magento, or a name from their ecosystem (06-content-standards.md "No bridges"). Scoped to them on purpose:
 * the track legitimately names JavaScript (the SignalR client) and Python (Aspire's polyglot hosting).
 */
const PHP_BRIDGE =
  /\bPHP|\bphp\b|\.php\b|\.phtml\b|php\.ini|PSR-\d+|[Mm]agento|Adminhtml|routes\.xml|\bFPM\b|Composer|composer\.(json|lock)|composer install|di\.xml|crontab\.xml|db_schema\.xml|Warden|DDEV|ObjectManager|Guzzle|Monolog|Packagist|Zend|Laminas|\bPsalm\b|\bRector\b|Laravel|Symfony|Doctrine|Eloquent|[Oo][Pp]cache|Xdebug|phpunit|\$\w+->\w+|::get\b|(webapi|events|system|acl|module)\.xml|<preference\b|<virtualType\b|shared="false"|\bEAV\b|sales_order_\w+|Update by Schedule|[Aa]round plugin|[Pp]lugins and observers|[Nn]o plugins\b|without plugins|like a plugin|a plugin intercepts|[Pp]lugins that intercept|setup:[\w:-]+|getSize\(\)|count\(\$\w+\)/;
/** An `Assert.ThrowsAsync` that is not awaited returns a task nobody observes, so the test passes even when nothing throws. */
const UNAWAITED_THROWS_ASYNC = /(?<!\bawait\s+)Assert\.ThrowsAsync\b/;

interface Violation {
  rule: string;
  detail: string;
}

/** The `##` headings of a lesson, in order. */
function headingsOf(theory: string): string[] {
  return theory.split('\n').filter((line) => line.startsWith('## '));
}

/** The text of a `##` section up to the next `##` heading, or undefined when the section is missing. */
function sectionOf(theory: string, heading: string): string | undefined {
  const parts = theory.split(`\n${heading}\n`);
  return parts.length < 2 ? undefined : parts[1].split('\n## ')[0];
}

/** Number of list items in a section. */
function listItems(section: string): number {
  return section.split('\n').filter((line) => /^(\d+\.|-|\*) /.test(line.trim())).length;
}

const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;

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

const pending = (lesson: Lesson, rule: string) => CSHARP_PENDING_REWRITE[lesson.key]?.includes(rule) ?? false;

function templateViolations(lesson: Lesson): Violation[] {
  const violations: Violation[] = [];
  const kind = kindOf(lesson);
  const theory = lesson.theory;
  if (!theory.startsWith('# ')) {
    violations.push({ rule: 'theory-title', detail: 'theory.md must start with a "# " title' });
  }
  const intro = theory.split('\n## ')[0];
  if (!/^You need: \S/m.test(intro)) {
    violations.push({ rule: 'theory-you-need', detail: 'a "You need: <earlier lessons>" line follows the opening paragraph, before the first "##" section' });
  }
  const words = wordCount(theory);
  const minimum = kind === 'project' ? 400 : 500;
  if (words < minimum || words > 1300) {
    violations.push({ rule: 'theory-length', detail: `theory has ${words} words, expected ${minimum}-1300` });
  }
  const actual = headingsOf(theory);
  const bridges = actual.filter((heading) => heading.startsWith('## Coming from'));
  if (bridges.length > 0) {
    violations.push({ rule: 'theory-no-coming-from', detail: `remove the bridge section ${bridges.join(', ')}` });
  }
  const headings = kind === 'project' ? PROJECT_HEADINGS : THEORY_HEADINGS;
  const positions = headings.map((heading) => theory.indexOf(`\n${heading}\n`)).filter((position) => position !== -1);
  const missing = headings.filter((heading) => heading !== COMMON_MISTAKES && !theory.includes(`\n${heading}\n`));
  const kept = actual.filter((heading) => !heading.startsWith('## Status as of') && !heading.startsWith('## Coming from'));
  if (missing.length > 0 || [...positions].sort((a, b) => a - b).some((position, index) => position !== positions[index])) {
    violations.push({ rule: 'theory-headings', detail: `needs ${headings.join(', ')} in this order; missing: ${missing.join(', ') || 'none'}` });
  } else if (kind === 'project' && kept.join('|') !== PROJECT_HEADINGS.join('|')) {
    violations.push({ rule: 'theory-headings', detail: `project headings must be exactly ${PROJECT_HEADINGS.join(', ')}, got ${kept.join(', ')}` });
  }
  if (kind === 'theory' && actual[0] === COMMON_MISTAKES) {
    violations.push({ rule: 'theory-first-heading', detail: `a concept section comes before "${COMMON_MISTAKES}"` });
  }
  const mistakes = kind === 'theory' ? sectionOf(theory, COMMON_MISTAKES) : undefined;
  if (kind === 'theory' && mistakes === undefined) {
    violations.push({ rule: 'common-mistakes', detail: `a theory lesson needs a "${COMMON_MISTAKES}" section after its concept sections` });
  }
  if (mistakes !== undefined) {
    const count = wordCount(mistakes);
    const bullets = listItems(mistakes);
    if (count < 60 || count > 180 || bullets < 2 || bullets > 4) {
      violations.push({ rule: 'common-mistakes', detail: `"${COMMON_MISTAKES}" has ${count} words and ${bullets} bullets, expected 60-180 words in 2-4 bullets` });
    }
  }
  const status = actual.filter((heading) => heading.startsWith('## Status as of'));
  if (status.length > 1 || (status.length === 1 && actual.indexOf(status[0]) !== actual.indexOf('## Check yourself') - 1)) {
    violations.push({ rule: 'theory-status', detail: 'at most one "## Status as of" section, right before "## Check yourself"' });
  }
  for (const heading of status.filter((line) => !/^## Status as of \d{4}-\d{2}-\d{2}$/.test(line))) {
    violations.push({ rule: 'theory-status', detail: `"${heading}" must read "## Status as of YYYY-MM-DD"` });
  }
  const questions = listItems(sectionOf(theory, '## Check yourself') ?? '');
  if (questions < 2 || questions > 4) {
    violations.push({ rule: 'check-yourself', detail: `"## Check yourself" has ${questions} questions, expected 2-4` });
  }
  if (kind === 'theory' && !theory.includes('```csharp')) {
    violations.push({ rule: 'theory-csharp', detail: 'a theory lesson shows C# in a ```csharp fence' });
  }
  return violations;
}

function resourceViolations(lesson: Lesson): Violation[] {
  const violations: Violation[] = [];
  if (lesson.resources.length < 2 || lesson.resources.length > 6) {
    violations.push({ rule: 'resources-count', detail: `${lesson.resources.length} resources, expected 2-6` });
  }
  if (!lesson.resources.some((resource) => resource.url.startsWith('https://learn.microsoft.com/'))) {
    violations.push({ rule: 'resources-learn', detail: 'at least one resource is a learn.microsoft.com page' });
  }
  for (const { url } of lesson.resources) {
    if (!url.startsWith('https://') || !DOCUMENTATION_HOSTS.has(new URL(url).hostname)) {
      violations.push({ rule: 'resources-host', detail: `${url} is not on an official or vendor documentation host` });
    }
  }
  return violations;
}

/** Every text a learner reads or edits in a lesson, labelled by file. */
function learnerTexts(lesson: Lesson): Array<[string, string]> {
  const texts: Array<[string, string]> = [
    ['theory.md', lesson.theory],
    ['quiz.json', lesson.quiz.map(({ question, options, explanation }) => [question, ...options, explanation].join('\n')).join('\n')],
    ['concepts.json', lesson.concepts.map(({ term, description }) => `${term} ${description}`).join('\n')],
    ['meta.json', [lesson.title, lesson.summary, ...lesson.resources.map(({ label, url }) => `${label} ${url}`)].join('\n')],
  ];
  const challenge = lesson.challenge;
  if (challenge) {
    texts.push(['challenge.md', challenge.instructions], ['hints.md', challenge.hints.join('\n')], ['approach.md', challenge.approach], ['tests.cs', challenge.tests]);
    for (const [side, files] of [['starter', challenge.starter], ['solution', challenge.solution]] as const) {
      Object.entries(files).forEach(([name, text]) => texts.push([`${side}/${name}`, text]));
    }
  }
  return texts;
}

function bridgeViolations(lesson: Lesson): Violation[] {
  return learnerTexts(lesson).flatMap(([file, text]) => {
    const match = PHP_BRIDGE.exec(text);
    return match ? [{ rule: 'no-php-bridge', detail: `${file} names "${match[0]}"` }] : [];
  });
}

function testViolations(lesson: Lesson): Violation[] {
  const tests = lesson.challenge?.tests ?? '';
  return UNAWAITED_THROWS_ASYNC.test(tests) ? [{ rule: 'tests-await-throws-async', detail: 'tests.cs calls Assert.ThrowsAsync without await' }] : [];
}

function violationsOf(lesson: Lesson): Violation[] {
  return [...templateViolations(lesson), ...resourceViolations(lesson), ...bridgeViolations(lesson), ...testViolations(lesson)];
}

/** The track and module titles and descriptions the carousel and the module headers show, keyed like CSHARP_PENDING_HEADERS. */
const headerTexts: Array<[string, string]> = track
  ? [
      [`track:${track.id}`, `${track.title}\n${track.description}`],
      ...track.modules.map((module): [string, string] => [`module:${track.id}/${module.id}`, `${module.title}\n${module.description}`]),
    ]
  : [];
const headerBridges = new Map(headerTexts.flatMap(([key, text]) => {
  const match = PHP_BRIDGE.exec(text);
  return match ? [[key, match[0]] as const] : [];
}));

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

  it.each(eachLesson)('%s follows the theory template, names no PHP/Magento bridge and links official documentation', (_, lesson) => {
    expect(violationsOf(lesson).filter((violation) => !pending(lesson, violation.rule)).map(({ rule, detail }) => `${rule}: ${detail}`)).toEqual([]);
  });

  it('keeps the pending rewrite list honest', () => {
    const stale = Object.entries(CSHARP_PENDING_REWRITE).flatMap(([lessonKey, rules]) => {
      const lesson = lessons.find((candidate) => candidate.key === lessonKey);
      const broken = new Set(lesson ? violationsOf(lesson).map((violation) => violation.rule) : []);
      return rules.filter((rule) => !broken.has(rule)).map((rule) => `${lessonKey}#${rule}`);
    });
    expect(stale).toEqual([]);
  });

  it('names no PHP/Magento bridge in the track and module titles and descriptions', () => {
    const unexpected = [...headerBridges].filter(([key]) => !CSHARP_PENDING_HEADERS[key]?.includes('no-php-bridge')).map(([key, name]) => `${key} names "${name}"`);
    const stale = Object.entries(CSHARP_PENDING_HEADERS).flatMap(([key, rules]) => rules.filter((rule) => rule !== 'no-php-bridge' || !headerBridges.has(key)).map((rule) => `${key}#${rule}`));
    expect({ unexpected, stale }).toEqual({ unexpected: [], stale: [] });
  });

  it('matches PHP ecosystem names and leaves .NET facts alone', () => {
    const caught = ['used to PSR-3', "PHPUnit's setUp()", 'php -S 127.0.0.1:8081 legacy.php', 'Controller/Adminhtml/Product/Save.php', 'bin/magento cron:run', 'Monolog channels',
      '`vendor/bin/phpunit`', '`$this->assertSame()`', '`webapi.xml` REST routes', 'pointing at `ProductRepositoryInterface::get`',
      'There is no `$request->getParam()`', '`<preference for="I" type="C"/>`', '`shared="false"` or the default', '`<virtualType>`',
      'before/after/around plugins', 'rebuilt from the EAV write tables', 'The `sales_order_place_after` observer', '"Update by Schedule" makes',
      'declared in events.xml', 'a field in system.xml', 'Around plugins wrap the call', '| Plugins and observers | Middleware, endpoint filters, decorators |',
      'the .NET version of `count($collection)` versus `getSize()`', 'Like `setup:upgrade`, it connects', 'Nothing runs `setup:upgrade` for you',
      '## No plugins: decorators instead', 'every call of `ICartService` without plugins', 'intercepts each public method, like a plugin',
      'the way a plugin intercepts any public method', 'Plugins that intercept any public method of another module'];
    const allowed = ['the SignalR JavaScript client', "Aspire's polyglot hosting runs Python apps", 'ILogger<T> categories', 'dotnet test --logger trx',
      'creates a second `AppDomain` to isolate plugins', '.WithManagementPlugin()', '// ... builder setup:', 'items.Count()'];
    expect(caught.filter((text) => !PHP_BRIDGE.test(text))).toEqual([]);
    expect(allowed.filter((text) => PHP_BRIDGE.test(text))).toEqual([]);
    expect(['await Assert.ThrowsAsync<E>(() => run())', 'public static void X() => Assert.ThrowsAsync<E>(() => run());'].map((text) => UNAWAITED_THROWS_ASYNC.test(text))).toEqual([false, true]);
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
});

defineChallengeSuite('csharp', csharpGrader());
