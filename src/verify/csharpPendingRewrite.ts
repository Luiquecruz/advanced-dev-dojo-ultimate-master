/**
 * C# lessons not yet rewritten to the no-bridge template (.claude/docs/csharp-track/06-content-standards.md), with the rules each one
 * still breaks. The rewrite of a lesson removes its entry in the same change; an entry whose lesson no longer breaks a listed rule
 * fails csharp.test.ts, so the list only shrinks and must be empty when the last rewrite lands.
 */
export const CSHARP_PENDING_REWRITE: Record<string, readonly string[]> = {
  'csharp/csharp-map': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/host-and-program': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/dependency-injection': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/configuration-and-options': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/logging': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/middleware-pipeline': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/minimal-apis-and-controllers': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/routing-binding-and-validation': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/http-semantics-and-problem-details': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/openapi-and-versioning': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/project-catalog-api': ['theory-you-need', 'theory-no-coming-from', 'no-php-bridge'],
  'csharp/relational-sql-for-dotnet': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/ef-core-basics': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/ef-core-migrations': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/tracking-and-performance': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/dapper-and-ado-net': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/transactions-and-concurrency': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/caching-redis-and-nosql': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/project-catalog-persistence': ['theory-you-need', 'theory-no-coming-from', 'no-php-bridge'],
  'csharp/authentication-concepts': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/jwt-bearer': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/authorization-policies': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/aspnet-core-identity': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/api-hardening': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/unit-testing-with-xunit': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/test-doubles': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/integration-tests-with-webapplicationfactory': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/database-tests-with-testcontainers': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/project-secure-and-test-the-api': ['theory-you-need', 'theory-no-coming-from', 'no-php-bridge'],
  'csharp/hosted-services': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/scheduling-with-hangfire-and-quartz': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/message-brokers': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/reliable-messaging': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/http-clients-and-resilience': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/project-order-worker': ['theory-you-need', 'theory-no-coming-from', 'no-php-bridge'],
  'csharp/docker-for-dotnet': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/ci-cd-pipelines': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/cloud-hosting': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/observability': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/aspire': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/project-ship-it': ['theory-you-need', 'theory-no-coming-from', 'no-php-bridge'],
  'csharp/layered-and-clean-architecture': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/vertical-slices-and-modular-monoliths': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/domain-driven-design-essentials': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/cqrs-mediator-and-licensing': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/microservices-trade-offs': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/net-framework-landscape': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/aspnet-mvc5-and-web-api-2': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/web-forms-and-wcf': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/migration-strategies': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/project-legacy-migration': ['theory-you-need', 'theory-no-coming-from', 'no-php-bridge'],
  'csharp/grpc-and-signalr': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/performance-and-memory': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/diagnostics-in-production': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/code-quality-and-analyzers': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
  'csharp/ai-in-dotnet-apps': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
};

/**
 * Track and module texts (`track.json` and `module.json` titles and descriptions) that still name PHP or Magento, keyed
 * `track:<track id>` or `module:<track id>/<module id>`. The same rules as above: fix the text, remove the entry, and a stale entry fails.
 */
export const CSHARP_PENDING_HEADERS: Record<string, readonly string[]> = {
  'track:csharp': ['no-php-bridge'],
  'module:csharp/platform': ['no-php-bridge'],
  'module:csharp/aspnet-core': ['no-php-bridge'],
};
