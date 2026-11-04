**Question this module answers:** how do I make a Python project reproducible, installable and verifiable?

## The project lifecycle

```text
my-service/
├── pyproject.toml     metadata, dependencies, build backend, [tool.*] settings
├── uv.lock            exact versions and hashes for every platform (committed)
├── src/my_service/    the importable package (src layout)
├── tests/
└── .venv/             the environment: recreated, never committed
```

| Step | Python | Node equivalent |
| --- | --- | --- |
| Describe the project | `pyproject.toml` `[project]` | `package.json` |
| Isolate dependencies | a virtual environment (`.venv`) | `node_modules/` |
| Resolve and lock | `uv lock` (or pip-tools, Poetry) | `npm install` + `package-lock.json` |
| Run a command | `uv run pytest` | `npx vitest` |
| Lint and format | Ruff (`ruff check`, `ruff format`) | ESLint + Prettier |
| Type-check | mypy, pyright, ty | `tsc --noEmit` |
| Test | `unittest`, pytest | Vitest, Jest |
| Build | a backend writes an sdist and a wheel | `npm pack` |
| Publish | PyPI, ideally with trusted publishing | `npm publish` |

## Prerequisites

Modules 03 (modules and imports) and 11 (the import system): an environment is mostly a question of which `site-packages` directory the interpreter searches.

## Coming from TypeScript and JavaScript

- **Packages are found by the interpreter, not by walking up to `node_modules`.** Each environment has its own `python`; running it (or `uv run`) selects the packages. `pip install` into the system Python mixes every project together.
- **One tool per job used to be the norm.** Black formatted, isort sorted imports, Flake8 linted. Ruff does all three, like Biome replacing ESLint and Prettier, and its `S` rules (from flake8-bandit) flag `eval`, `pickle.loads` and `shell=True`. `pre-commit` runs it before each commit; CI runs it again.
- **Types are not checked at runtime or at install.** In Python a checker is a separate CI step; nothing fails until you run it.

## The path

1. This map: who owns which step.
2. `pyproject.toml`, environments, lockfiles, wheels and safe publishing (quiz).
3. Testing with `unittest` and `unittest.mock`, proven against broken copies of the code.
4. The capstone: an async rules engine plus the ADR that sizes its deployment.

> **Status as of November 2026:** Ruff 0.17 lints and formats (its formatter is a drop-in replacement for Black and does not sort imports; the `I` rules do). Black 26.10, isort 9.0 and pre-commit 4.7 are current. Type checkers: mypy 2.4, pyright 1.1.414, and Astral's ty 0.0.x, still marked Beta on PyPI. Python 3.15.0 was released on 9 October 2026 (PEP 790); this dojo runs 3.14. Sources: pypi.org, docs.astral.sh/ruff, peps.python.org/pep-0790.

## When to choose it

Read this module before you start a repository others will install, deploy or review. It ends with one decision per project: one `pyproject.toml`, a committed lockfile, one linter-formatter and one checker in CI, tests that fail on real bugs, and a deployment sized from measurements.
