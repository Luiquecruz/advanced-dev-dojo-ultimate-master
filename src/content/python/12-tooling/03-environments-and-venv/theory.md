# Environments and venv

A virtual environment is a **directory**, not a process, a container or a sandbox. `python3 -m venv .venv` writes this on Linux:

```text
.venv/
├── pyvenv.cfg                      home = /usr/bin, include-system-site-packages = false, version = 3.14.7
├── bin/python -> /usr/bin/python3  a link to the base interpreter (Scripts\python.exe on Windows)
├── bin/activate                    a shell script that edits PATH
└── lib/python3.14/site-packages/   where pip and uv install (Lib\site-packages on Windows)
```

Started through that link, the same interpreter reports different prefixes:

```py
import sys

print(sys.prefix)                     # /srv/api/.venv   started as .venv/bin/python
print(sys.base_prefix)                # /usr             the installation the environment was made from
print(sys.prefix != sys.base_prefix)  # True: the documented venv check
```

Three lookups make it work, and each one is plain logic you can model:

1. **The shell** finds `python` by searching the `PATH` directories in order. Activation puts `.venv/bin` first.
2. **The interpreter** looks for `pyvenv.cfg` next to its executable or one directory up. When it finds one, `sys.prefix` becomes that directory and `sys.base_prefix` stays the base install.
3. **The `site` module** adds `{sys.prefix}/lib/python3.14/site-packages` to `sys.path`, plus the base installation's site-packages only when `include-system-site-packages` is true.

## How it works

**`PATH` resolution.** A command name without a slash is looked up in each `PATH` directory from left to right. The first directory that holds an executable with that name wins and shadows every later one. A name containing a slash (`/srv/api/.venv/bin/pytest`) is used as a path and `PATH` is not searched at all. `source .venv/bin/activate` only prepends `.venv/bin` to `PATH`, sets `VIRTUAL_ENV` and changes the prompt; `deactivate` restores `PATH`. Since activation is optional, the venv documentation warns that `VIRTUAL_ENV` cannot tell whether a virtual environment is in use: compare the prefixes.

**`pyvenv.cfg`.** One `key = value` per line. `site` reads it with simple rules: a line counts only if it contains `=`, it is split at the **first** `=`, both sides are stripped, and keys are compared in lowercase. Values may contain `=` themselves: the `command` key records the creating command line, such as `--prompt="api"`. There is no comment syntax: `# home = /usr/bin` is read as the key `# home`, which nothing looks up. `include-system-site-packages` adds the base site-packages only when its value is `true` in any case; `false`, `no` or `0` exclude them and also turn off the user site directory. A file without that key counts as `true`.

**site-packages.** On POSIX the directory is `{prefix}/lib/python{major}.{minor}/site-packages` (`python3.14t` on a free-threaded build); on Windows it is `{prefix}\Lib\site-packages`. Only major and minor are in the path, so a patch upgrade of the base Python (3.14.6 to 3.14.7) keeps the same directory, while a move from 3.14 to 3.15 needs a new environment.

**Creating one.**

```bash
python3 -m venv .venv                  # stdlib; bin/ on POSIX, Scripts\ on Windows
.venv/bin/python -m pip install httpx  # no activation needed
uv venv                                # creates .venv; uv pip install, uv sync and uv run find it
```

Scripts installed in an environment start with a shebang holding its absolute path (`#!/srv/api/.venv/bin/python`), so they run in the right environment from anywhere, and the environment breaks if the folder is moved or copied.

`venv` has been in the standard library since Python 3.3 (PEP 405, Final). From 3.13 it writes a `.gitignore` holding `*` inside the environment, and from 3.14 the interpreter sets `sys.prefix` for an environment during path initialization instead of in `site`. PEP 668 (Final) lets Linux distributions mark their Python as externally managed, so `pip install` outside an environment fails with `externally-managed-environment`. uv creates `.venv` with `uv venv`, and `uv run` and `uv sync` create or update the project's `.venv` next to `pyproject.toml`. Sources: docs.python.org (venv, site), peps.python.org and docs.astral.sh/uv.

## Common mistakes

**Expecting the project's `.venv` to be used because it sits in the folder.** `cd /srv/api && python server.py` runs the first `python` on `PATH`. Without activation that is `/usr/bin/python3`, whose `sys.path` has never heard of `.venv`, so `import fastapi` fails with `ModuleNotFoundError` while the package is installed two directories away. An unactivated `.venv/bin/pytest` is not on `PATH` either, so the shell finds the global one or nothing, and a bare `pip install` installs into whichever interpreter owns the first `pip` on `PATH`. In code, the mistake is looking a command up among every executable that exists instead of along `PATH`. `shutil.which` performs the lookup the shell does:

```py
import shutil

# wrong: any executable with that name counts, so an unactivated .venv/bin/pytest is "found"
def find_command(name, executables):
    return next((path for path in executables if path.endswith("/" + name)), None)

# right: only the PATH directories count, left to right; activation puts .venv/bin first
shutil.which("pytest", path="/usr/local/bin:/usr/bin")                      # '/usr/bin/pytest' or None
shutil.which("pytest", path="/srv/api/.venv/bin:/usr/local/bin:/usr/bin")   # '/srv/api/.venv/bin/pytest'
```

Run `.venv/bin/python server.py` and `.venv/bin/python -m pip install ...`, activate first, or use `uv run`.

## When to choose it

- **One environment per project**, named `.venv`, created from the lockfile and never committed, copied or moved: recreate it instead.
- **Call the environment's interpreter explicitly** in scripts, CI and cron (`.venv/bin/python -m pytest`, `uv run pytest`); activation is a convenience for interactive shells.
- **Check `sys.prefix != sys.base_prefix`** when code must know whether it runs in an environment; never `VIRTUAL_ENV` or the folder name.
- **`include-system-site-packages = true`** only for packages that only the system provides, knowing that every base package then becomes importable too.
- **Avoid** installing into the system Python, and avoid `sudo pip`.
