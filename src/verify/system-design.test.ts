import { describe, expect, it } from 'vitest';
import { LANGUAGES } from '../content/languages';
import type { Lesson } from '../content/types';
import { TEST_FILES } from '../engines/testFiles';
import { nodeAdapter } from '../engines/node/adapter';
import { defineChallengeSuite } from './challengeSuite';
import { DATED, datedIn } from './noDates';
import { createTrackStandards, languageOf, testNamesOf, variantViolations, type Violation } from './trackStandards';
import { csharpGrader, frameworkGrader, pythonGrader } from './graders';

/**
 * Verification of the System Design track: the content standards of .claude/docs/system-design-track.md and, through the engine of each
 * language the learner can choose, every challenge's solution passing and starter failing.
 */

const TRACK_ID = 'system-design';
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

const standards = createTrackStandards({
  trackId: TRACK_ID,
  resourceHosts: RESOURCE_HOSTS,
  extraTags: EXTRA_TAGS,
  bridge: BRIDGE,
  theoryWordLimits: (moduleNumber) => (moduleNumber === 0 ? [300, 1000] : [500, 1300]),
});
const { track, modules, eachLesson } = standards;

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


const violationsOf = (lesson: Lesson): Violation[] => [...standards.violationsOf(lesson), ...challengeViolations(lesson)];

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
