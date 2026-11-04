import json

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
        self.next_id = 1

    async def request(self, method, params=None):
        meta = {
            "io.modelcontextprotocol/protocolVersion": PROTOCOL_VERSION,
            "io.modelcontextprotocol/clientCapabilities": {},
            "io.modelcontextprotocol/clientInfo": self.client_info,
        }
        request_id = self.next_id
        self.next_id += 1
        reply = await self.server.handle(to_json({"jsonrpc": "2.0", "id": request_id, "method": method, "params": {**(params or {}), "_meta": meta}}))
        if reply is None:
            raise McpError(-32603, f"No response to {method}")
        response = json.loads(reply)
        if "error" in response:
            error = response["error"]
            raise McpError(error["code"], error["message"], error.get("data"))
        return response["result"]


def create_mcp_client(server, client_info=None):
    return McpClient(server, client_info)


class ToolIndex:
    """Every tool of every server under a unique `server__tool` name, searchable and callable."""

    def __init__(self, tools, failures, clients):
        self.tools = tools
        self.failures = failures
        self.clients = clients
        self.by_name = {tool["qualifiedName"]: tool for tool in tools}
        self.vectors = {tool["qualifiedName"]: embed(f"{tool['toolName'].replace('_', ' ')} {tool['description']}") for tool in tools}

    def search(self, query, limit):
        target = embed(query)
        scores = {tool["qualifiedName"]: cosine_similarity(target, self.vectors[tool["qualifiedName"]]) for tool in self.tools}
        return sorted(self.tools, key=lambda tool: -scores[tool["qualifiedName"]])[:limit]

    def definitions_for(self, qualified_names, budget_tokens):
        definitions = []
        used = 0
        for name in qualified_names:
            tool = self.by_name.get(name)
            if tool is None:
                continue
            definition = {"name": tool["qualifiedName"], "description": tool["description"], "parameters": tool["inputSchema"]}
            cost = definition_tokens(definition)
            if used + cost <= budget_tokens:
                definitions.append(definition)
                used += cost
        return definitions

    async def call(self, qualified_name, arguments):
        tool = self.by_name.get(qualified_name)
        if tool is None:
            return {"text": f'Unknown tool "{qualified_name}". Use search_tools to find the right one.', "isError": True}
        try:
            result = await self.clients[tool["serverId"]].request("tools/call", {"name": tool["toolName"], "arguments": arguments})
        except Exception as error:
            return {"text": f"{qualified_name} failed: {error}", "isError": True}
        text = "\n".join(block["text"] for block in result["content"] if block["type"] == "text")
        return {"text": text, "isError": result.get("isError") is True}


async def build_tool_index(connections):
    tools = []
    failures = []
    clients = {}
    for connection in connections:
        server_id = connection["id"]
        client = create_mcp_client(connection["server"])
        try:
            found = []
            cursor = None
            while True:
                page = await client.request("tools/list", {} if cursor is None else {"cursor": cursor})
                for tool in page["tools"]:
                    found.append({
                        "qualifiedName": f"{server_id}{SEPARATOR}{tool['name']}",
                        "serverId": server_id,
                        "toolName": tool["name"],
                        "description": tool.get("description") or "",
                        "inputSchema": tool["inputSchema"],
                    })
                cursor = page.get("nextCursor")
                if cursor is None:
                    break
        except Exception as error:
            failures.append({"serverId": server_id, "message": str(error)})
            continue
        tools.extend(found)
        clients[server_id] = client
    return ToolIndex(tools, failures, clients)


def parse_arguments(raw):
    try:
        value = json.loads(raw)
    except ValueError:
        return None
    return value if isinstance(value, dict) else None


async def answer_with_tools(model, index, question, budget_tokens=1500, search_limit=3, max_rounds=6):
    messages = [{"role": "user", "content": question}]
    loaded = []
    for round_number in range(1, max_rounds + 1):
        response = await model.generate({"messages": list(messages), "tools": [SEARCH_TOOLS, *loaded]})
        if not response["toolCalls"]:
            return {"text": response["text"], "loadedTools": [definition["name"] for definition in loaded], "rounds": round_number}
        if round_number == max_rounds:
            raise ToolLoopLimitError(round_number)
        messages.append({"role": "assistant", "content": response["text"], "toolCalls": response["toolCalls"]})
        for call in response["toolCalls"]:
            arguments = parse_arguments(call["arguments"])
            loaded_names = {definition["name"] for definition in loaded}
            if arguments is None:
                content = json.dumps({"error": f"Arguments for {call['name']} must be a JSON object."})
            elif call["name"] == SEARCH_TOOLS["name"]:
                candidates = [tool["qualifiedName"] for tool in index.search(str(arguments.get("query", "")), search_limit) if tool["qualifiedName"] not in loaded_names]
                used = sum(definition_tokens(definition) for definition in loaded)
                added = index.definitions_for(candidates, budget_tokens - used)
                loaded.extend(added)
                content = json.dumps({"loaded": [definition["name"] for definition in added]})
            elif call["name"] in loaded_names:
                result = await index.call(call["name"], arguments)
                content = json.dumps({"error": result["text"]}) if result["isError"] else result["text"]
            else:
                content = json.dumps({"error": f'Tool "{call["name"]}" is not loaded. Call search_tools first.'})
            messages.append({"role": "tool", "toolCallId": call["id"], "content": content})
    raise ToolLoopLimitError(max_rounds)
