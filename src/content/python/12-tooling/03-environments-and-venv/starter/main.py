"""The lookups behind a virtual environment, as pure functions."""

from pathlib import PureWindowsPath

SYSTEM_SITE_KEY = "include-system-site-packages"


def is_virtualenv(prefix: str, base_prefix: str) -> bool:
    """Tell whether an interpreter with these prefixes runs from a virtual environment."""
    # TODO: decide from the two prefixes, not from folder names
    return False


def resolve_command(name: str, path_dirs: list[str], files: set[str]) -> str | None:
    """Find the executable a POSIX shell runs for `name`."""
    # TODO: a name containing "/" is a path; any other name is searched in PATH order
    return None


def parse_pyvenv_cfg(text: str) -> dict[str, str | bool]:
    """Read a pyvenv.cfg file with the rules of the site module."""
    config: dict[str, str | bool] = {}
    # TODO: read only lines that contain "=", split at the first "=", strip and lowercase keys, strip values
    # TODO: turn include-system-site-packages into a bool
    return config


def site_packages_dir(prefix: str, version: str, platform: str) -> str:
    """Return the site-packages directory of the environment at `prefix`."""
    # TODO: Lib\site-packages on win32 (PureWindowsPath joins with backslashes), lib/pythonX.Y/site-packages elsewhere
    return ""
