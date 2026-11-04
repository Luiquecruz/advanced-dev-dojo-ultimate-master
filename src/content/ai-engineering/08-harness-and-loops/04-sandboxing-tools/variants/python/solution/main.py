import ipaddress
import json
import posixpath
import socket
from urllib.parse import urljoin, urlsplit

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
        if path == "" or "\0" in path:
            raise SandboxError("invalid_path", f'"{path}" is not a valid path')
        target = posixpath.normpath(posixpath.join(self.root, path))
        if target != self.root and not target.startswith(f"{self.root}/"):
            raise SandboxError("path_escape", f"{path} is outside the workspace {self.root}")
        return target

    async def read_file(self, path):
        return file_system.read_file(self.resolve(path))

    async def write_file(self, path, content):
        target = self.resolve(path)
        file_system.make_directories(posixpath.dirname(target))
        file_system.write_file(target, content)

    async def list(self, path="."):
        return sorted(file_system.list_directory(self.resolve(path)))


def create_jail(root):
    return Jail(root)


def is_ip_literal(hostname):
    try:
        socket.inet_aton(hostname)
        return True
    except OSError:
        pass
    try:
        ipaddress.IPv6Address(hostname)
        return True
    except ValueError:
        return False


def host_matches(host, entry):
    normalized_entry = entry.lower()
    if normalized_entry.startswith("*."):
        return host.endswith(normalized_entry[1:])
    return host == normalized_entry


def host_allowed(host, allowed_hosts):
    return any(host_matches(host, entry) for entry in allowed_hosts)


def check_egress(url, policy):
    try:
        parsed = urlsplit(url)
        port = parsed.port
    except ValueError:
        return {"allowed": False, "reason": "invalid_url"}
    hostname = parsed.hostname or ""
    if parsed.scheme == "" or (parsed.scheme in DEFAULT_PORTS and hostname == ""):
        return {"allowed": False, "reason": "invalid_url"}
    if f"{parsed.scheme}:" not in policy.get("allowedSchemes", ["https:"]):
        return {"allowed": False, "reason": "scheme"}
    if parsed.username is not None or parsed.password is not None:
        return {"allowed": False, "reason": "credentials"}
    if port is not None and port != DEFAULT_PORTS.get(parsed.scheme):
        return {"allowed": False, "reason": "port"}
    host = hostname.removesuffix(".")
    if is_ip_literal(host):
        return {"allowed": False, "reason": "ip_literal"}
    if host == "localhost" or host.endswith(".localhost"):
        return {"allowed": False, "reason": "local_host"}
    if not host_allowed(host, policy["allowedHosts"]):
        return {"allowed": False, "reason": "not_allowlisted"}
    return {"allowed": True, "host": host}


def create_fetch_tool(*, fetch, policy, max_redirects=3):
    def ensure_allowed(url):
        decision = check_egress(url, policy)
        if not decision["allowed"]:
            raise SandboxError("egress_denied", f"{url} is not allowed: {decision['reason']}")

    async def fetch_url(url):
        current = url
        redirects = 0
        while True:
            ensure_allowed(current)
            response = await fetch(current, redirect="manual")
            location = response.headers.get("location")
            if response.status not in REDIRECT_STATUSES or location is None:
                return {"status": response.status, "url": current, "body": await response.text()}
            if redirects >= max_redirects:
                raise SandboxError("egress_denied", f"{url} redirected more than {max_redirects} times")
            current = urljoin(current, location)
            redirects += 1

    return fetch_url


async def run_tool(name, arguments, jail, fetch_url):
    if name == "read_file":
        return await jail.read_file(arguments["path"])
    if name == "write_file":
        await jail.write_file(arguments["path"], arguments["content"])
        return f"Wrote {arguments['path']}"
    if name == "list_files":
        return "\n".join(await jail.list(arguments.get("path", ".")))
    if name == "fetch_url":
        return (await fetch_url(arguments["url"]))["body"]
    raise ValueError(f"unknown tool {name}")


async def execute_tool_call(tool_call, *, jail, fetch_url):
    try:
        arguments = json.loads(tool_call["arguments"])
        content = await run_tool(tool_call["name"], arguments, jail, fetch_url)
    except Exception as error:
        message = f"{error.code}: {error}" if isinstance(error, SandboxError) else str(error)
        content = f"Error: {message}"
    return {"role": "tool", "toolCallId": tool_call["id"], "content": content}
