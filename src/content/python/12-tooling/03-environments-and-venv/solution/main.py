"""The lookups behind a virtual environment, as pure functions."""

from pathlib import PureWindowsPath

SYSTEM_SITE_KEY = "include-system-site-packages"


def is_virtualenv(prefix: str, base_prefix: str) -> bool:
    """Tell whether an interpreter with these prefixes runs from a virtual environment."""
    return prefix != base_prefix


def resolve_command(name: str, path_dirs: list[str], files: set[str]) -> str | None:
    """Find the executable a POSIX shell runs for `name`."""
    if "/" in name:
        return name if name in files else None
    for directory in path_dirs:
        candidate = f"{directory}/{name}"
        if candidate in files:
            return candidate
    return None


def parse_pyvenv_cfg(text: str) -> dict[str, str | bool]:
    """Read a pyvenv.cfg file with the rules of the site module."""
    config: dict[str, str | bool] = {}
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, _, value = stripped.partition("=")
        key = key.strip().lower()
        value = value.strip()
        config[key] = value.lower() == "true" if key == SYSTEM_SITE_KEY else value
    return config


def site_packages_dir(prefix: str, version: str, platform: str) -> str:
    """Return the site-packages directory of the environment at `prefix`."""
    if platform == "win32":
        return str(PureWindowsPath(prefix, "Lib", "site-packages"))
    major, minor = version.split(".")[:2]
    return f"{prefix.rstrip('/')}/lib/python{major}.{minor}/site-packages"
