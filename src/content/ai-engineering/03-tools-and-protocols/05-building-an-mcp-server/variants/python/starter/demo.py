import asyncio
import itertools
import json

from main import PROTOCOL_VERSION, create_mcp_server
from schema import Object, String

server = create_mcp_server(
    name="helpdesk",
    version="1.0.0",
    instructions="Search articles before opening a ticket.",
    tools=[
        {
            "name": "search_articles",
            "description": "Search help articles by keyword. Returns id and title of each match.",
            "input": Object({"query": String(min_length=2, description="Keyword to look for in article titles")}),
            "handler": lambda arguments: [{"id": "kb-2", "title": f"Requesting a {arguments['query']}"}],
        },
        {
            "name": "create_ticket",
            "description": "Open a support ticket. Use only when no article answers the question.",
            "input": Object({"subject": String(min_length=5, description="One-line summary of the problem")}),
            "handler": lambda arguments: f"Created ticket T-42: {arguments['subject']}",
        },
    ],
    resources=[{"uri": "helpdesk://policies/refunds", "name": "Refund policy", "mimeType": "text/markdown", "read": lambda: "Refunds within 30 days of delivery."}],
)

META = {
    "io.modelcontextprotocol/protocolVersion": PROTOCOL_VERSION,
    "io.modelcontextprotocol/clientCapabilities": {},
    "io.modelcontextprotocol/clientInfo": {"name": "demo-client", "version": "1.0.0"},
}

REQUEST_IDS = itertools.count(1)


def without_metadata(value):
    if isinstance(value, dict):
        return {key: without_metadata(item) for key, item in value.items() if key not in ("_meta", "inputSchema")}
    if isinstance(value, list):
        return [without_metadata(item) for item in value]
    return value


async def exchange(label, message):
    line = json.dumps({"jsonrpc": "2.0", "id": next(REQUEST_IDS), **message}, separators=(",", ":"))
    reply = await server.handle(line)
    parsed = None if reply is None else json.loads(reply)
    if parsed is None:
        summary = "(no response)"
    elif "error" in parsed:
        summary = f"error {parsed['error']['code']}: {parsed['error']['message']}"
    else:
        summary = json.dumps(without_metadata(parsed["result"]), separators=(",", ":"))
    print(f"{label:<26} {summary}")


async def main():
    await exchange("server/discover", {"method": "server/discover", "params": {"_meta": META}})
    await exchange("tools/list", {"method": "tools/list", "params": {"_meta": META}})
    await exchange("tools/call search", {"method": "tools/call", "params": {"_meta": META, "name": "search_articles", "arguments": {"query": "refund"}}})
    await exchange("tools/call invalid args", {"method": "tools/call", "params": {"_meta": META, "name": "create_ticket", "arguments": {"subject": "Hi"}}})
    await exchange("tools/call unknown tool", {"method": "tools/call", "params": {"_meta": META, "name": "delete_everything", "arguments": {}}})
    await exchange("resources/read", {"method": "resources/read", "params": {"_meta": META, "uri": "helpdesk://policies/refunds"}})
    await exchange("legacy initialize", {"method": "initialize", "params": {"protocolVersion": "2025-11-25", "capabilities": {}}})
    await exchange("old protocol version", {"method": "tools/list", "params": {"_meta": {**META, "io.modelcontextprotocol/protocolVersion": "2025-06-18"}}})
    notification = await server.handle(json.dumps({"jsonrpc": "2.0", "method": "notifications/cancelled", "params": {"requestId": 3}}))
    print(f"{'notification':<26} {notification or '(no response)'}")


if __name__ == "__main__":
    asyncio.run(main())
