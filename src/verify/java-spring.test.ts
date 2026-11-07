import { describe, expect, it } from 'vitest';
import { createTrackStandards } from './trackStandards';

/**
 * Shared content standards for the Java and Spring Boot track, plus the owner decision:
 * every lesson uses theory, a quiz and local practice, with no graded browser challenges.
 * The Angular engine identifier remains catalog metadata; no Java engine is introduced.
 */

const TRACK_ID = 'java-spring';
/** Official documentation, standards bodies and the projects the track teaches. */
const RESOURCE_HOSTS = new Set([
  'docs.oracle.com', 'openjdk.org', 'dev.java', 'jdk.java.net', 'docs.spring.io', 'spring.io', 'docs.gradle.org', 'maven.apache.org',
  'junit.org', 'site.mockito.org', 'testcontainers.com', 'java.testcontainers.org', 'hibernate.org', 'jakarta.ee', 'eclipse.org',
  'owasp.org', 'cheatsheetseries.owasp.org', 'www.rfc-editor.org', 'datatracker.ietf.org', 'developer.mozilla.org',
  'docs.docker.com', 'micrometer.io', 'springdoc.org', 'flywaydb.org', 'documentation.red-gate.com', 'docs.liquibase.com', 'www.postgresql.org',
  'dev.mysql.com', 'docs.github.com', 'github.com', 'kubernetes.io', 'opentelemetry.io', 'jwt.io', 'oauth.net', 'openid.net', 'www.jetbrains.com',
  'redis.io', 'kafka.apache.org', 'www.rabbitmq.com', 'resilience4j.readme.io', 'www.archunit.org',
]);
/** A comparison with another language (the track teaches Java; naming Java itself is the subject). */
const BRIDGE =
  /^## Coming from\b|\b(?:[Ii]f|[Ww]hen) you (?:know|come from|are used to|have used) (?:PHP|Python|C#|Ruby|Go|JavaScript|TypeScript|Node|Kotlin|Scala)(?![\w#])|\b(?:just )?like (?:in|with) (?:PHP|Python|C#|Ruby|Go|Kotlin|Scala)(?![\w#])|\bPHP\b|[Mm]agento|\bLaravel\b|\bSymfony\b/m;

const standards = createTrackStandards({
  trackId: TRACK_ID,
  resourceHosts: RESOURCE_HOSTS,
  extraTags: ['core', 'project', 'security', 'testing', 'performance'],
  bridge: BRIDGE,
  theoryWordLimits: (moduleNumber) => (moduleNumber === 1 ? [300, 1000] : [500, 1300]),
});
const { track, modules, eachLesson } = standards;

describe('java-spring track', () => {
  it('keeps its catalog engine metadata and numbers required modules consecutively from 01', () => {
    expect(track!.engine).toBe('angular');
    expect(modules.map((module) => module.number)).toEqual(modules.map((_, index) => index + 1));
    expect(modules.filter((module) => module.optional)).toEqual([]);
  });

  it.each(eachLesson)('%s follows the content standards', (_, lesson) => {
    expect(lesson.challenge).toBeUndefined();
    expect(lesson.variants).toEqual([]);
    expect(lesson.hasChallenge).toBe(false);
    expect(standards.violationsOf(lesson).map(({ rule, detail }) => `${rule}: ${detail}`)).toEqual([]);
  });
});
