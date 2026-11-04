import json

from schema import Integer, Object, String

META = {
    "io.modelcontextprotocol/protocolVersion": "2026-07-28",
    "io.modelcontextprotocol/clientCapabilities": {},
    "io.modelcontextprotocol/clientInfo": {"name": "dojo-tests", "version": "1.0.0"},
}

ARTICLES = [
    {"id": "kb-1", "title": "Resetting your password", "body": 'Use the "Forgot password" link on the sign-in page.'},
    {"id": "kb-2", "title": "Requesting a refund", "body": "Refunds are accepted within 30 days of delivery."},
]


class Spy:
    """Records every call and delegates to the implementation."""

    def __init__(self, implementation):
        self.implementation = implementation
        self.calls = []

    def __call__(self, *arguments):
        self.calls.append(list(arguments))
        return self.implementation(*arguments)


def find_articles(arguments):
    matches = [article for article in ARTICLES if arguments["query"].lower() in article["title"].lower()]
    return [{"id": article["id"], "title": article["title"]} for article in matches[: arguments["limit"]]]


def open_ticket(arguments):
    if "outage" in arguments["subject"]:
        raise RuntimeError("The ticketing backend is in maintenance until 14:00 UTC")
    return f"Created ticket T-42: {arguments['subject']}"


def helpdesk_server():
    search_articles = Spy(find_articles)
    create_ticket = Spy(open_ticket)
    server = mod.create_mcp_server(
        name="helpdesk",
        version="1.4.0",
        instructions="Search articles before creating tickets.",
        tools=[
            {
                "name": "search_articles",
                "description": "Search help articles by title.",
                "input": Object({"query": String(min_length=2), "limit": Integer(minimum=1, maximum=10, default=5)}),
                "handler": search_articles,
            },
            {"name": "create_ticket", "description": "Open a support ticket.", "input": Object({"subject": String(min_length=5)}), "handler": create_ticket},
        ],
        resources=[{"uri": "helpdesk://policies/refunds", "name": "Refund policy", "mimeType": "text/markdown", "read": lambda: "# Refunds\nWithin 30 days of delivery."}],
    )
    return server, search_articles, create_ticket


async def send(server, message):
    reply = await server.handle(message if isinstance(message, str) else json.dumps(message))
    return None if reply is None else json.loads(reply)


async def rpc(server, method, params=None, request_id=1):
    return await send(server, {"jsonrpc": "2.0", "id": request_id, "method": method, "params": {**(params or {}), "_meta": META}})


def assert_complete_result(response, request_id):
    assert response["jsonrpc"] == "2.0"
    assert response["id"] == request_id
    assert "error" not in response, response.get("error")
    assert response["result"]["resultType"] == "complete"
    assert response["result"]["_meta"]["io.modelcontextprotocol/serverInfo"] == {"name": "helpdesk", "version": "1.4.0"}


def assert_cacheable(result):
    assert isinstance(result.get("ttlMs"), (int, float))
    assert result.get("cacheScope") in ("public", "private")


@test("server/discover advertises the supported version, capabilities, identity and instructions")
async def _():
    server, _, _ = helpdesk_server()
    response = await rpc(server, "server/discover", {}, "discover-1")
    assert_complete_result(response, "discover-1")
    assert response["result"]["supportedVersions"] == ["2026-07-28"]
    assert isinstance(response["result"]["capabilities"].get("tools"), dict)
    assert isinstance(response["result"]["capabilities"].get("resources"), dict)
    assert response["result"].get("instructions") == "Search articles before creating tickets."
    assert_cacheable(response["result"])


@test("every request must declare its protocol version and client capabilities in _meta; a legacy initialize is refused with the supported version")
async def _():
    server, _, _ = helpdesk_server()
    no_meta = await send(server, {"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}})
    assert no_meta["error"]["code"] == -32602
    assert no_meta["id"] == 1
    no_params = await send(server, {"jsonrpc": "2.0", "id": 2, "method": "tools/list"})
    assert no_params["error"]["code"] == -32602
    no_capabilities = await send(server, {"jsonrpc": "2.0", "id": 3, "method": "tools/list", "params": {"_meta": {"io.modelcontextprotocol/protocolVersion": "2026-07-28"}}})
    assert no_capabilities["error"]["code"] == -32602

    old = await send(server, {"jsonrpc": "2.0", "id": 4, "method": "tools/list", "params": {"_meta": {**META, "io.modelcontextprotocol/protocolVersion": "2025-06-18"}}})
    assert old["id"] == 4
    assert old["error"]["code"] == -32022
    assert old["error"].get("data") == {"supported": ["2026-07-28"], "requested": "2025-06-18"}

    legacy = await send(server, {"jsonrpc": "2.0", "id": 5, "method": "initialize", "params": {"protocolVersion": "2025-11-25", "capabilities": {}, "clientInfo": {"name": "old", "version": "1"}}})
    assert legacy["id"] == 5
    assert legacy["error"]["code"] == -32601
    assert "2026-07-28" in legacy["error"]["message"]


@test("speaks JSON-RPC 2.0: parse errors, invalid requests and unknown methods get the standard codes, notifications get no response")
async def _():
    server, _, _ = helpdesk_server()
    parse_error = await send(server, '{"jsonrpc": "2.0", "id": 1, "method": ')
    assert parse_error["jsonrpc"] == "2.0"
    assert parse_error["id"] is None
    assert parse_error["error"]["code"] == -32700
    wrong_version = await send(server, {"jsonrpc": "1.0", "id": 7, "method": "tools/list", "params": {"_meta": META}})
    assert wrong_version["error"]["code"] == -32600
    assert wrong_version["id"] == 7
    no_method = await send(server, {"jsonrpc": "2.0", "id": 8, "params": {}})
    assert no_method["error"]["code"] == -32600
    batch = await send(server, [1, 2])
    assert batch["error"]["code"] == -32600
    unknown = await rpc(server, "prompts/list", {}, 9)
    assert unknown["id"] == 9
    assert unknown["error"]["code"] == -32601
    cancelled = await send(server, {"jsonrpc": "2.0", "method": "notifications/cancelled", "params": {"requestId": 3}})
    assert cancelled is None
    whatever = await send(server, {"jsonrpc": "2.0", "method": "notifications/whatever"})
    assert whatever is None


@test("tools/list describes every tool with a JSON Schema derived from its input schema, in a stable order, without exposing handlers")
async def _():
    server, _, _ = helpdesk_server()
    first = await rpc(server, "tools/list", {}, "list-1")
    assert_complete_result(first, "list-1")
    assert_cacheable(first["result"])
    tools = first["result"]["tools"]
    assert [tool["name"] for tool in tools] == ["search_articles", "create_ticket"]
    assert sorted(tools[0]) == ["description", "inputSchema", "name"]
    assert tools[0]["description"] == "Search help articles by title."
    assert tools[0]["inputSchema"]["type"] == "object"
    assert tools[0]["inputSchema"].get("required") == ["query"]
    assert {"type": "integer", "default": 5}.items() <= tools[0]["inputSchema"]["properties"]["limit"].items()
    second = await rpc(server, "tools/list", {}, "list-2")
    assert second["result"]["tools"] == tools


@test("tools/call returns text content, with structuredContent for object results, and isError false")
async def _():
    server, search_articles, _ = helpdesk_server()
    search = await rpc(server, "tools/call", {"name": "search_articles", "arguments": {"query": "refund"}}, 10)
    assert_complete_result(search, 10)
    assert search_articles.calls == [[{"query": "refund", "limit": 5}]]
    assert search["result"]["isError"] is False
    assert search["result"].get("structuredContent") == [{"id": "kb-2", "title": "Requesting a refund"}]
    assert [block["type"] for block in search["result"]["content"]] == ["text"]
    assert json.loads(search["result"]["content"][0]["text"]) == [{"id": "kb-2", "title": "Requesting a refund"}]

    ticket = await rpc(server, "tools/call", {"name": "create_ticket", "arguments": {"subject": "Cannot log in"}}, 11)
    assert ticket["result"]["content"] == [{"type": "text", "text": "Created ticket T-42: Cannot log in"}]
    assert ticket["result"]["isError"] is False
    assert "structuredContent" not in ticket["result"]


@test("tools/call separates protocol errors (unknown tool, malformed params) from tool execution errors the model can fix (isError: true)")
async def _():
    server, _, create_ticket = helpdesk_server()
    unknown = await rpc(server, "tools/call", {"name": "delete_everything", "arguments": {}}, 20)
    assert unknown["error"]["code"] == -32602
    assert "delete_everything" in unknown["error"]["message"]
    no_name = await rpc(server, "tools/call", {"arguments": {}}, 21)
    assert no_name["error"]["code"] == -32602
    text_arguments = await rpc(server, "tools/call", {"name": "create_ticket", "arguments": "subject=help"}, 22)
    assert text_arguments["error"]["code"] == -32602

    invalid = await rpc(server, "tools/call", {"name": "create_ticket", "arguments": {"subject": "Hi"}}, 23)
    assert_complete_result(invalid, 23)
    assert invalid["result"]["isError"] is True
    assert invalid["result"]["content"][0]["type"] == "text"
    assert "subject" in invalid["result"]["content"][0]["text"]
    assert create_ticket.calls == []

    failing = await rpc(server, "tools/call", {"name": "create_ticket", "arguments": {"subject": "Report an outage"}}, 24)
    assert failing["result"]["isError"] is True
    assert "maintenance until 14:00 UTC" in failing["result"]["content"][0]["text"]


@test("resources/list and resources/read expose resources by URI, and an unknown URI is an invalid-params error carrying the URI")
async def _():
    server, _, _ = helpdesk_server()
    listed = await rpc(server, "resources/list", {}, 30)
    assert_complete_result(listed, 30)
    assert_cacheable(listed["result"])
    assert listed["result"]["resources"] == [{"uri": "helpdesk://policies/refunds", "name": "Refund policy", "mimeType": "text/markdown"}]

    read = await rpc(server, "resources/read", {"uri": "helpdesk://policies/refunds"}, 31)
    assert_complete_result(read, 31)
    assert_cacheable(read["result"])
    assert read["result"]["contents"] == [{"uri": "helpdesk://policies/refunds", "mimeType": "text/markdown", "text": "# Refunds\nWithin 30 days of delivery."}]

    missing = await rpc(server, "resources/read", {"uri": "helpdesk://policies/shipping"}, 32)
    assert missing["id"] == 32
    assert missing["error"]["code"] == -32602
    assert missing["error"].get("data") == {"uri": "helpdesk://policies/shipping"}
