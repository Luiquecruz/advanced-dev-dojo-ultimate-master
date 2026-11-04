A deploy script keeps running the wrong `pytest`, and nobody can say which environment a server process uses. Write the four lookups behind a virtual environment as **pure functions** in `main.py`, following the real rules of the shell, the interpreter and the `site` module. The functions receive paths and file contents as arguments: they never read the real file system or `os.environ`.

## `is_virtualenv(prefix, base_prefix)`

Return `True` when an interpreter whose `sys.prefix` is `prefix` and whose `sys.base_prefix` is `base_prefix` runs from a virtual environment, `False` otherwise. An environment can live in any folder (`/home/dev/envs/api`), and a base installation may have `venv` in its path.

## `resolve_command(name, path_dirs, files)`

Model how a POSIX shell finds a command.

- `path_dirs` is the `PATH` as a list of directories, in order (`["/srv/api/.venv/bin", "/usr/local/bin", "/usr/bin"]`).
- `files` is a `set` of the absolute paths of every executable file on the machine, including ones in directories that are not on `PATH`.
- A `name` without `/` is searched in `path_dirs` from left to right: return `directory + "/" + name` for the first directory where that path is in `files`.
- A `name` containing `/` is a path: return it unchanged if it is in `files`, without searching `PATH`.
- Return `None` when nothing is found.

## `parse_pyvenv_cfg(text)`

Parse the text of a `pyvenv.cfg` file into a `dict`, the way `site` reads it:

- Skip blank lines, lines whose first non-space character is `#`, and lines without `=`.
- Split every other line at the **first** `=`. Keys are stripped and lowercased; values are stripped and otherwise kept as written (a value may contain `=`).
- The value of `include-system-site-packages` becomes a `bool`: `True` only when it is `true` in any letter case, `False` for anything else. Every other value stays a `str`.

A file written by `python3 -m venv --prompt api /srv/api/.venv` looks like this:

```text
home = /usr/bin
include-system-site-packages = false
version = 3.14.7
prompt = 'api'
executable = /usr/bin/python3.14
command = /usr/bin/python3 -m venv --prompt="api" /srv/api/.venv
```

## `site_packages_dir(prefix, version, platform)`

Return the site-packages directory of the environment at `prefix`. `version` is a version string as written in `pyvenv.cfg` (`"3.14.7"`, or `"3.14"`), and `platform` is a `sys.platform` value.

- `"win32"`: `prefix\Lib\site-packages`, joined with backslashes.
- Any other platform: `prefix/lib/pythonX.Y/site-packages`, where `X.Y` is the major and minor version only.

## Run

`demo.py` replays the deploy script's problem on a fake machine and then prints what the interpreter running the demo reports about itself.
