import platform
import sys

from main import is_virtualenv, parse_pyvenv_cfg, resolve_command, site_packages_dir

files = {
    "/srv/api/.venv/bin/python",
    "/srv/api/.venv/bin/pytest",
    "/usr/bin/python",
    "/usr/local/bin/pytest",
}
system_path = ["/usr/local/bin", "/usr/bin"]
activated_path = ["/srv/api/.venv/bin", *system_path]

print("deploy script, no activation: pytest ->", resolve_command("pytest", system_path, files))
print("after source .venv/bin/activate: pytest ->", resolve_command("pytest", activated_path, files))
print("explicit path, no activation:", resolve_command("/srv/api/.venv/bin/pytest", system_path, files))

config = parse_pyvenv_cfg(
    "home = /usr/bin\n"
    "include-system-site-packages = false\n"
    "version = 3.14.7\n"
    'command = /usr/bin/python3 -m venv --prompt="api" /srv/api/.venv\n'
)
print("pyvenv.cfg:", config)
print("packages land in:", site_packages_dir("/srv/api/.venv", str(config.get("version", "")), "linux"))
print("same project on Windows:", site_packages_dir("C:\\srv\\api\\.venv", str(config.get("version", "")), "win32"))

print("this interpreter:", sys.platform, platform.python_version())
print("  sys.prefix:", sys.prefix, "| sys.base_prefix:", sys.base_prefix)
print("  in a virtual environment:", is_virtualenv(sys.prefix, sys.base_prefix))
print("  computed site-packages:", site_packages_dir(sys.prefix, platform.python_version(), sys.platform))
print("  site-packages on sys.path:", [entry for entry in sys.path if entry.endswith("site-packages")])
