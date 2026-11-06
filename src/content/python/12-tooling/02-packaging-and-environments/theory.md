# Packaging and environments

One file describes a modern Python project. Each table has its own standard and its own audience:

```toml
[project]                          # PEP 621: metadata every tool and PyPI read
name = "fraud-rules"
version = "1.4.0"
requires-python = ">=3.12"
dependencies = ["httpx>=0.27,<1", "orjson>=3.10"]

[project.optional-dependencies]    # extras users opt into: fraud-rules[cli]
cli = ["rich>=13"]

[dependency-groups]                # PEP 735: for developers only, never published
test = ["pytest>=9"]
lint = ["ruff"]

[build-system]                     # PEP 517/518: who turns the source into a wheel
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.ruff]                        # settings owned by each tool
line-length = 100
```

`setup.py` (code that runs to describe a package) and `requirements.txt` (a list for `pip install -r`) still exist, but new projects keep metadata in `[project]` and exact versions in a lockfile.

## Ranges and locks

The mistake that breaks deploys: **ranges everywhere, and no lockfile**. `pip install` resolves the ranges again on every fresh install and writes no lockfile, so an application deployed from `requirements.txt` with `httpx>=0.27` can ship a version nobody tested. The rule is: **libraries declare ranges, applications lock**. Two related distinctions: `[dependency-groups]` hold developer tools such as test runners and linters, while `optional-dependencies` are extras that users opt into; and each project gets one environment for its interpreter, never a shared system-wide install.

## How it works

**Environments.** `python -m venv .venv` creates a directory with `pyvenv.cfg` (its `home` key names the base interpreter), a `bin/python` entry point and its own `site-packages`. Inside it `sys.prefix` points at `.venv` while `sys.base_prefix` still points at the base install; `sys.prefix != sys.base_prefix` is the documented test. Activation only puts `.venv/bin` first on `PATH`; running `.venv/bin/python` directly works without it. Scripts contain absolute paths, so an environment is recreated, never copied or committed.

**Resolvers and lockfiles.** `uv lock` resolves once for every platform into `uv.lock` (committed); `uv sync` makes `.venv` match it exactly; `uv run` locks and syncs before running a command; `uv sync --locked` in CI fails if the lockfile is stale. uv also installs Python versions itself (`uv python install`, `.python-version`). pip-tools (`pip-compile --generate-hashes`) and Poetry solve the same problem. PEP 751 standardised a tool-neutral lock format, `pylock.toml`.

**Hashes and indexes.** Hash-checking mode (`pip install --require-hashes -r requirements.txt`) fails closed: every requirement must be pinned with `==` and carry a hash, including transitive ones. It proves the downloaded file is the one you locked, not that its code is benign. `--extra-index-url` merges a private index with PyPI and pip picks the best match across both, so a public package named like your internal one can win (dependency confusion). Prefer one index (a proxy), or uv's default `first-index` strategy with internal packages pinned through `[tool.uv.sources]` to an `explicit = true` index. Typosquats (`reqeusts`) are caught only by reviewing what enters the lockfile; `pip-audit` in CI checks locked versions against known vulnerabilities.

**Distribution.** An **sdist** is source plus metadata; installing it runs the `[build-system]` backend (setuptools, hatchling, flit-core, uv_build), which is arbitrary code. A **wheel** is a pre-built zip that the installer only unpacks, so prefer wheels (`--only-binary :all:`). Publish from CI with **trusted publishing**: PyPI trusts the CI's OpenID Connect identity and mints a token that expires after about 15 minutes, so no long-lived API token sits in CI secrets. PEP 740 attestations add a signed record of which workflow built each file.

> **Status as of November 2026:** PEPs 621, 517, 518, 735, 740 and 751 are Final. pip 26.3 installs groups with `pip install --group`, and both `pip lock` and installing from `pylock.toml` with `-r` are marked experimental. uv 0.13.7 writes `uv.lock` and exports `pylock.toml` with `uv export --format pylock.toml`; its `uv_build` backend supports pure Python only. Sources: peps.python.org, pip.pypa.io, docs.astral.sh/uv, docs.pypi.org/trusted-publishers.

## When to choose it

- **Library:** `[project]` with honest ranges, a standard backend, wheels on PyPI through trusted publishing.
- **Application or service:** the same `pyproject.toml` plus a committed lockfile with hashes, installed with `--locked` (or `--require-hashes`) from a single index.
- **Avoid** `setup.py` for new projects, `--extra-index-url` with internal names, sdist-only installs in production and API tokens in CI.
