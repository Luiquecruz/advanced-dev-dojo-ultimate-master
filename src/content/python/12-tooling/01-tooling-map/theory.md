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

| Step | Python | What it protects against |
| --- | --- | --- |
| Describe the project | `pyproject.toml` `[project]` | metadata scattered over files that tools read differently |
| Isolate dependencies | a virtual environment (`.venv`) | projects sharing one set of packages |
| Resolve and lock | `uv lock` (or pip-tools, Poetry) | a deploy that installs versions nobody tested |
| Run a command | `uv run pytest` | a tool from the wrong environment |
| Lint and format | Ruff (`ruff check`, `ruff format`) | style debates; `eval` with `--select S` |
| Type-check | mypy, pyright, ty | type errors that the interpreter never reports |
| Test | `unittest`, pytest | regressions users would find first |
| Build | a backend writes an sdist and a wheel | installs that differ between machines |
| Publish | PyPI, ideally with trusted publishing | a leaked long-lived upload token |

## Prerequisites

Modules 03 (modules and imports) and 11 (the import system): an environment is mostly a question of which `site-packages` directory the interpreter searches.

## Three facts behind the steps

- **The interpreter finds packages, not the folder.** Each environment has its own `python`; running it (or `uv run`) selects the packages.
- **One linter-formatter replaces three tools.** Ruff does the jobs of Black, isort and Flake8, and its `S` rules (from flake8-bandit) flag `eval`, `pickle.loads` and `shell=True`. `pre-commit` runs it before each commit; CI runs it again.
- **Types are never checked at runtime.** A checker is a separate CI step.

## The path

1. This map: who owns which step.
2. `pyproject.toml`, environments, lockfiles, wheels and safe publishing (quiz).
3. Virtual environments: `PATH`, `sys.prefix` and `pyvenv.cfg`.
4. Testing with `unittest` and `unittest.mock`, proven against broken copies of the code.
5. The capstone: an async rules engine plus the ADR that sizes its deployment.

Ruff lints and formats; its formatter is a drop-in replacement for Black and does not sort imports (the `I` rules do). Black, isort and pre-commit remain common alternatives. Type checkers include mypy, pyright and Astral's ty. This dojo runs Python 3.14. Sources: pypi.org and docs.astral.sh/ruff.

## When to choose it

Read this module before you start a repository others will install, deploy or review. It ends with one decision per project: one `pyproject.toml`, a committed lockfile, one linter-formatter and one checker in CI, tests that fail on real bugs, and a deployment sized from measurements.
