import { describe, expect, it } from 'vitest';
import { angularAdapter } from '../engines/angular/adapter';
import { defineChallengeSuite } from './challengeSuite';
import { frameworkGrader } from './graders';
import { createTrackStandards, variantViolations, type Violation } from './trackStandards';

/**
 * Verification of the Java, Spring Boot and Angular track: the shared content standards (system-design-track.md) and, on the Angular
 * engine, every challenge's solution passing and starter failing. Java and Spring lessons are theory and quizzes plus local projects, since
 * there is no Java engine in the browser (java-spring-angular-track.md "Engine decision").
 */

const TRACK_ID = 'java-spring-angular';
/** Official documentation, standards bodies and the projects the track teaches. */
const RESOURCE_HOSTS = new Set([
  'docs.oracle.com', 'openjdk.org', 'dev.java', 'jdk.java.net', 'docs.spring.io', 'spring.io', 'docs.gradle.org', 'maven.apache.org',
  'junit.org', 'site.mockito.org', 'testcontainers.com', 'java.testcontainers.org', 'hibernate.org', 'jakarta.ee', 'eclipse.org',
  'angular.dev', 'rxjs.dev', 'owasp.org', 'cheatsheetseries.owasp.org', 'www.rfc-editor.org', 'datatracker.ietf.org', 'developer.mozilla.org',
  'docs.docker.com', 'micrometer.io', 'springdoc.org', 'flywaydb.org', 'documentation.red-gate.com', 'docs.liquibase.com', 'www.postgresql.org',
  'dev.mysql.com', 'docs.github.com', 'github.com', 'kubernetes.io', 'opentelemetry.io', 'jwt.io', 'oauth.net', 'openid.net', 'www.jetbrains.com',
]);
/** A comparison with another language (the track teaches Java; naming Java itself is the subject). */
const BRIDGE =
  /^## Coming from\b|\b(?:[Ii]f|[Ww]hen) you (?:know|come from|are used to|have used) (?:PHP|Python|C#|Ruby|Go|JavaScript|TypeScript|Node|Kotlin|Scala)(?![\w#])|\b(?:just )?like (?:in|with) (?:PHP|Python|C#|Ruby|Go|Kotlin|Scala)(?![\w#])|\bPHP\b|[Mm]agento|\bLaravel\b|\bSymfony\b/m;

const standards = createTrackStandards({
  trackId: TRACK_ID,
  resourceHosts: RESOURCE_HOSTS,
  extraTags: ['core', 'project', 'security', 'testing', 'performance', 'angular'],
  bridge: BRIDGE,
  theoryWordLimits: (moduleNumber) => (moduleNumber === 1 ? [300, 1000] : [500, 1300]),
});
const { track, modules, eachLesson } = standards;

const violationsOf = (lesson: (typeof eachLesson)[number][1]): Violation[] => [...standards.violationsOf(lesson), ...lesson.variants.flatMap(variantViolations)];

describe('java-spring-angular track', () => {
  it('runs on the Angular engine and numbers its modules from 01 without an optional module', () => {
    expect(track!.engine).toBe('angular');
    expect(modules.map((module) => module.number)).toEqual(modules.map((_, index) => index + 1));
    expect(modules.filter((module) => module.optional)).toEqual([]);
  });

  it.each(eachLesson)('%s follows the content standards', (_, lesson) => {
    expect(violationsOf(lesson).map(({ rule, detail }) => `${rule}: ${detail}`)).toEqual([]);
  });
});

defineChallengeSuite(TRACK_ID, frameworkGrader(angularAdapter));
