import json
import math

from dojo_ai import cosine_similarity, count_tokens, embed

PROTOCOL_VERSION = "2026-07-28"
SEPARATOR = "__"
DEFAULT_CLIENT_INFO = {"name": "dojo-agent", "version": "1.0.0"}

SEARCH_TOOLS = {
    "name": "search_tools",
    "description": "Find and load the tools you need for a task. Describe the task in a few words; the matching tools become available on your next turn.",
    "parameters": {"type": "object", "properties": {"query": {"type": "string", "description": 'What you need to do, such as "refund an invoice"'}}, "required": ["query"]},
}


class McpError(Exception):
    """An MCP error response: `code`, `message` and optional `data`."""

    def __init__(self, code, message, data=None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.data = data


class ToolLoopLimitError(Exception):
    """Raised when the model still requests tools after the last allowed round."""

    def __init__(self, rounds):
        super().__init__(f"The model still requested tools after {rounds} rounds")


def to_json(value):
    """Serializes like JSON.stringify: compact, without escaping non-ASCII characters."""
    return json.dumps(value, separators=(",", ":"), ensure_ascii=False)


def definition_tokens(definition):
    return count_tokens(to_json(definition))


class McpClient:
    """Talks to one MCP server: `await request(method, params)` returns the result or raises McpError."""

    def __init__(self, server, client_info=None):
        self.server = server
        self.client_info = DEFAULT_CLIENT_INFO if client_info is None else client_info

    async def request(self, method, params=None):
        # TODO: unique ids, _meta with protocol version, client capabilities and clientInfo; raise McpError for error responses
        reply = await self.server.handle(to_json({"jsonrpc": "2.0", "id": 1, "method": method, "params": params or {}}))
        return json.loads(reply).get("result")


def create_mcp_client(server, client_info=None):
    return McpClient(server, client_info)


class ToolIndex:
    """Every tool of every server under a unique `server__tool` name, searchable and callable."""

    def __init__(self, tools, failures, clients):
        self.tools = tools
        self.failures = failures
        self.clients = clients

    def search(self, query, limit):
        # TODO: rank by cosine_similarity(embed(query), embed(name + description)), highest first
        return self.tools[:limit]

    def definitions_for(self, qualified_names, budget_tokens):
        # TODO: {"name": qualifiedName, "description": ..., "parameters": inputSchema} in order, skipping what does not fit the budget
        return []

    async def call(self, qualified_name, arguments):
        # TODO: route to the owning server with the original tool name; never raise
        return {"text": f'Unknown tool "{qualified_name}"', "isError": True}


async def build_tool_index(connections):
    # TODO: list every server's tools (follow nextCursor), namespace them as server__tool, record failing servers
    return ToolIndex([], [], {})


async def answer_with_tools(model, index, question, budget_tokens=1500, search_limit=3, max_rounds=6):
    # TODO: offer search_tools plus the tools loaded so far; load search results within the budget; call loaded tools through the index; refuse the rest
    everything = index.definitions_for([tool["qualifiedName"] for tool in index.tools], math.inf)
    response = await model.generate({"messages": [{"role": "user", "content": question}], "tools": [SEARCH_TOOLS, *everything]})
    return {"text": response["text"], "loadedTools": [], "rounds": 1}
