# Continuous Integration

Continuous integration means every change is built and tested automatically, on a clean machine, before it joins the main branch. It turns "it works on my laptop" into a shared, repeatable answer. This lesson designs a pipeline for the course platform, a Maven build for the Spring Boot API and an npm build for the Angular client, using GitHub Actions as the example. The stages, caches and gates apply to any CI system; the syntax is GitHub's.

You need: The Test Pyramid for Both Ends (which tests run where), Docker for Java Applications (building an image), Docker Compose for Local Development (the project layout with `api` and `client` folders).

## What a pipeline does

A good pipeline answers four questions in order, and stops at the first failure:

1. Does it compile and do the fast tests pass? (unit and slice tests)
2. Do the slower tests pass? (integration tests with a real database)
3. Does the quality bar hold? (coverage, dependency and secret checks)
4. Can it be packaged? (a jar, a client bundle, an image)

Keep the first answer under a few minutes, because developers wait for it. Run independent work in parallel jobs: the API and the client do not need each other until the end-to-end stage.

## A workflow for both ends

A workflow is a YAML file in `.github/workflows/`. This one runs on every pull request and on pushes to `main`:

```yaml
name: ci
on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  api:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    defaults:
      run:
        working-directory: api
    steps:
      - uses: actions/checkout@<full-commit-sha>
      - uses: actions/setup-java@<full-commit-sha>
        with:
          distribution: temurin
          java-version: "25"
          cache: maven
      - run: ./mvnw -B verify
      - uses: actions/upload-artifact@<full-commit-sha>
        with:
          name: api-jar
          path: api/target/*.jar

  client:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    defaults:
      run:
        working-directory: client
    steps:
      - uses: actions/checkout@<full-commit-sha>
      - uses: actions/setup-node@<full-commit-sha>
        with:
          node-version: "24"
          cache: npm
          cache-dependency-path: client/package-lock.json
      - run: npm ci
      - run: npm test -- --no-watch --no-progress
      - run: npm run build
```

`./mvnw -B verify` runs the build in batch mode through the test and verification phases, including integration tests bound to them. `npm ci` installs exactly what `package-lock.json` lists and fails if the lock file and `package.json` disagree, which is what a pipeline wants. `ng test` runs once when the `CI` environment variable is set, and `--no-watch --no-progress` makes that explicit. The default Angular test runner is Vitest with jsdom, so the job needs no browser.

## Caching and artifacts

`cache: maven` in `setup-java` saves the local Maven repository, keyed on a hash of the `pom.xml` files, and `cache: npm` does the same for npm's download cache using the lock file. A cache makes the job faster, but it must never change the result: the build still resolves from the lock or pom files. An artifact is a file the job keeps for later jobs or for people, such as the jar that `upload-artifact` stores. Build once and reuse the artifact instead of rebuilding for each later step.

## Quality gates

A gate is a rule that blocks a merge. The pipeline fails on a failing test, but you can add more:

- A minimum coverage, enforced by a build plugin such as JaCoCo's `check` goal. Treat the number as a floor that catches a big drop, not a goal to chase.
- Dependency checks in CI. Dependabot can open update PRs and report vulnerabilities, but its alerts alone do not block a merge.
- Secret scanning alerts identify committed credentials; alerts alone do not block merging. A required secret-scan status check or a separate push-protection policy provides an enforcement gate.
- Required status checks in the branch protection rules, which stop a pull request from merging until the named jobs succeed.

A gate that people routinely bypass teaches them to ignore the pipeline, so keep gates few and make them reliable.

## Securing the pipeline

A workflow runs code, so it deserves the same care as production code:

- **Pin actions to a full commit SHA.** A tag such as `v7` can be moved; a full-length SHA cannot. The `<full-commit-sha>` placeholders above stand for the SHA of a release you reviewed, with the version in a trailing comment. Take the SHA from the action's own repository, and let Dependabot propose updates.
- **Least privilege for the token.** The top-level `permissions: contents: read` gives `GITHUB_TOKEN` read access to the repository only. Raise permissions in the single job that needs them, for example to publish a package.
- **Never print or hard-code secrets.** Store them as encrypted secrets, give each its own entry, and use them only in the steps that need them. Rotate any secret that appears in a log.
- **Treat pull requests from forks as untrusted.** Do not run their code in a workflow that has secrets or write permissions.

## Common mistakes

- Skipping the tests in CI to get a green build, such as `-DskipTests`. Skip them only in the image build that follows a test job.
- Using a mutable tag for an action. A moved tag runs new code in your pipeline without a review.
- Giving the whole workflow write permissions because one step needed them.
- Caching `node_modules` or `target` instead of the download caches, which can carry stale build output into a clean run.

## In practice

Start with one workflow that builds and tests both ends, make it required on `main`, and add a gate only when a real problem justifies it. Keep the pipeline definition in the repository next to the code, so changing the build is a reviewed change like any other.

## Check yourself

1. Why does the pipeline use `npm ci` instead of `npm install`?
2. What is the difference between a cache and an artifact?
3. Why is a full commit SHA safer than a version tag for an action?
