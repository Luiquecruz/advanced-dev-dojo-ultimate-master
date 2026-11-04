VENV_BIN = "/srv/api/.venv/bin"
ACTIVATED = [VENV_BIN, "/usr/local/bin", "/usr/bin"]
DEACTIVATED = ["/usr/local/bin", "/usr/bin"]
FILES = {
    "/srv/api/.venv/bin/python",
    "/srv/api/.venv/bin/pytest",
    "/usr/local/bin/python",
    "/usr/bin/python",
    "/usr/bin/git",
}

VENV_CFG = """home = /usr/bin
include-system-site-packages = false
version = 3.14.7
prompt = 'api'
executable = /usr/bin/python3.14
command = /usr/bin/python3 -m venv --prompt="api" /srv/api/.venv
"""

EDITED_CFG = """# recreated by the deploy script on 2026-11-02
Home=/opt/python/3.14/bin

    # home = /usr/bin   (before the upgrade)
  VERSION   =   3.14.7
not a setting
include-system-site-packages = false
"""


@test("is_virtualenv decides from the two prefixes, whatever the folders are called")
def _():
    dot_venv = mod.is_virtualenv("/srv/api/.venv", "/usr")
    named_env = mod.is_virtualenv("/home/dev/envs/api", "/usr")
    base = mod.is_virtualenv("/usr", "/usr")
    base_named_venv = mod.is_virtualenv("/opt/venv-tools/python3.14", "/opt/venv-tools/python3.14")
    assert dot_venv is True
    assert named_env is True
    assert base is False
    assert base_named_venv is False


@test("resolve_command returns the first PATH directory that holds the command")
def _():
    activated_python = mod.resolve_command("python", ACTIVATED, FILES)
    activated_git = mod.resolve_command("git", ACTIVATED, FILES)
    plain_python = mod.resolve_command("python", DEACTIVATED, FILES)
    system_first = mod.resolve_command("python", ["/usr/bin", VENV_BIN], FILES)
    assert activated_python == "/srv/api/.venv/bin/python"
    assert activated_git == "/usr/bin/git"
    assert plain_python == "/usr/local/bin/python"
    assert system_first == "/usr/bin/python"


@test("a command outside every PATH directory is found only through its path")
def _():
    by_name = mod.resolve_command("pytest", DEACTIVATED, FILES)
    by_path = mod.resolve_command("/srv/api/.venv/bin/pytest", DEACTIVATED, FILES)
    bypass = mod.resolve_command("/usr/bin/python", ACTIVATED, FILES)
    missing_name = mod.resolve_command("ruff", ACTIVATED, FILES)
    missing_path = mod.resolve_command("/srv/api/.venv/bin/ruff", ACTIVATED, FILES)
    assert by_name is None
    assert by_path == "/srv/api/.venv/bin/pytest"
    assert bypass == "/usr/bin/python"
    assert missing_name is None
    assert missing_path is None


@test("parse_pyvenv_cfg splits at the first equals sign and skips comments and other lines")
def _():
    written = mod.parse_pyvenv_cfg(VENV_CFG)
    edited = mod.parse_pyvenv_cfg(EDITED_CFG)
    keys = sorted(edited)
    assert written["home"] == "/usr/bin"
    assert written["version"] == "3.14.7"
    assert written["executable"] == "/usr/bin/python3.14"
    assert written["command"] == '/usr/bin/python3 -m venv --prompt="api" /srv/api/.venv'
    assert keys == ["home", "include-system-site-packages", "version"]
    assert edited["home"] == "/opt/python/3.14/bin"
    assert edited["version"] == "3.14.7"


@test("include-system-site-packages is a bool that is true only for the word true")
def _():
    cases = {"true": True, "True": True, "TRUE": True, "false": False, "False": False, "no": False, "0": False}
    for raw, expected in cases.items():
        config = mod.parse_pyvenv_cfg(f"home = /usr/bin\ninclude-system-site-packages = {raw}\n")
        flag = config["include-system-site-packages"]
        assert type(flag) == bool, raw
        assert flag == expected, raw


@test("site_packages_dir follows the POSIX and Windows layouts with major.minor only")
def _():
    linux = mod.site_packages_dir("/srv/api/.venv", "3.14.7", "linux")
    mac = mod.site_packages_dir("/Users/dev/api/.venv", "3.13.9", "darwin")
    two_digit_minor = mod.site_packages_dir("/srv/legacy/.venv", "3.10.4", "linux")
    short_version = mod.site_packages_dir("/srv/api/.venv", "3.14", "linux")
    windows = mod.site_packages_dir("C:\\Users\\dev\\api\\.venv", "3.14.7", "win32")
    assert linux == "/srv/api/.venv/lib/python3.14/site-packages"
    assert mac == "/Users/dev/api/.venv/lib/python3.13/site-packages"
    assert two_digit_minor == "/srv/legacy/.venv/lib/python3.10/site-packages"
    assert short_version == "/srv/api/.venv/lib/python3.14/site-packages"
    assert windows == "C:\\Users\\dev\\api\\.venv\\Lib\\site-packages"
