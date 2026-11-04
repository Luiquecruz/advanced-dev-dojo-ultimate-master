import json
import posixpath
from urllib.parse import urlsplit

from memory_file_system import file_system

REDIRECT_STATUSES = {301, 302, 303, 307, 308}
DEFAULT_PORTS = {"http": 80, "https": 443}


class SandboxError(Exception):
    """A refused path or request; `code` is "invalid_path", "path_escape" or "egress_denied"."""

    def __init__(self, code, message):
        super().__init__(message)
        self.code = code


class Jail:
    """File tools confined to `root` on the in-memory file system."""

    def __init__(self, root):
        self.root = file_system.absolute(root)

    def resolve(self, path):
        # TODO: reject empty paths and NUL bytes, resolve against the root, refuse anything that is not the root or under root + "/"
        return posixpath.normpath(posixpath.join(self.root, path))

    async def read_file(self, path):
        return file_system.read_file(self.resolve(path))

    async def write_file(self, path, content):
        target = self.resolve(path)
        file_system.make_directories(posixpath.dirname(target))
        file_system.write_file(target, content)

    async def list(self, path="."):
        return file_system.list_directory(self.resolve(path))


def create_jail(root):
    return Jail(root)


def check_egress(url, policy):
    # TODO: parse, then check scheme, credentials, port, IP literals (socket.inet_aton, ipaddress), localhost and the allowlist, in that order
    host = urlsplit(url).hostname
    allowed = any(host.endswith(entry.replace("*.", "")) for entry in policy["allowedHosts"])
    return {"allowed": True, "host": host} if allowed else {"allowed": False, "reason": "not_allowlisted"}


def create_fetch_tool(*, fetch, policy, max_redirects=3):
    # TODO: check every URL before fetching it, follow redirects manually and check each hop, stop after max_redirects
    async def fetch_url(url):
        response = await fetch(url, redirect="manual")
        return {"status": response.status, "url": url, "body": await response.text()}

    return fetch_url


async def execute_tool_call(tool_call, *, jail, fetch_url):
    # TODO: dispatch read_file, write_file, list_files and fetch_url; turn every failure into a tool message starting with "Error:"
    arguments = json.loads(tool_call["arguments"])
    if tool_call["name"] == "read_file":
        return {"role": "tool", "toolCallId": tool_call["id"], "content": await jail.read_file(arguments["path"])}
    if tool_call["name"] == "write_file":
        await jail.write_file(arguments["path"], arguments["content"])
        return {"role": "tool", "toolCallId": tool_call["id"], "content": f"Wrote {arguments['path']}"}
    if tool_call["name"] == "list_files":
        return {"role": "tool", "toolCallId": tool_call["id"], "content": "\n".join(await jail.list(arguments.get("path", ".")))}
    return {"role": "tool", "toolCallId": tool_call["id"], "content": (await fetch_url(arguments["url"]))["body"]}
