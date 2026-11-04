import inspect
import json

PROTOCOL_VERSION = "2026-07-28"
PROTOCOL_VERSION_KEY = "io.modelcontextprotocol/protocolVersion"
CLIENT_CAPABILITIES_KEY = "io.modelcontextprotocol/clientCapabilities"
SERVER_INFO_KEY = "io.modelcontextprotocol/serverInfo"


class McpError(Exception):
    """A JSON-RPC error with its `code`."""

    def __init__(self, code, message):
        super().__init__(message)
        self.code = code
        self.message = message


def to_json(value):
    """Serializes like JSON.stringify: compact, without escaping non-ASCII characters."""
    return json.dumps(value, separators=(",", ":"), ensure_ascii=False)


def received_type(value):
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, (int, float)):
        return "number"
    if isinstance(value, str):
        return "string"
    if isinstance(value, list):
        return "array"
    return "object"


class StringSchema:
    """A string argument, optionally with a minimum length."""

    type_name = "string"

    def __init__(self, min_length=None, optional=False):
        self.min_length = min_length
        self.optional = optional

    def json_schema(self):
        return {"type": "string"} if self.min_length is None else {"type": "string", "minLength": self.min_length}

    def problem(self, value):
        if not isinstance(value, str):
            return f"Invalid input: expected string, received {received_type(value)}"
        if self.min_length is not None and len(value) < self.min_length:
            return f"Too small: expected string to have >={self.min_length} characters"
        return None


class NumberSchema:
    """A number argument: optionally an integer, with inclusive bounds or a positive lower bound."""

    type_name = "number"

    def __init__(self, integer=False, minimum=None, maximum=None, positive=False, optional=False):
        self.integer = integer
        self.minimum = minimum
        self.maximum = maximum
        self.positive = positive
        self.optional = optional

    def json_schema(self):
        schema = {"type": "integer" if self.integer else "number"}
        if self.positive:
            schema["exclusiveMinimum"] = 0
        if self.minimum is not None:
            schema["minimum"] = self.minimum
        if self.maximum is not None:
            schema["maximum"] = self.maximum
        return schema

    def problem(self, value):
        if received_type(value) != "number":
            return f"Invalid input: expected number, received {received_type(value)}"
        if self.integer and isinstance(value, float) and not value.is_integer():
            return "Invalid input: expected int, received number"
        if self.positive and value <= 0:
            return "Too small: expected number to be >0"
        if self.minimum is not None and value < self.minimum:
            return f"Too small: expected number to be >={self.minimum}"
        if self.maximum is not None and value > self.maximum:
            return f"Too big: expected number to be <={self.maximum}"
        return None


class ObjectSchema:
    """Tool arguments: named fields, validated like Zod (unknown keys are dropped)."""

    def __init__(self, fields):
        self.fields = fields

    def json_schema(self):
        schema = {"type": "object", "properties": {name: field.json_schema() for name, field in self.fields.items()}}
        required = [name for name, field in self.fields.items() if not field.optional]
        if required:
            schema["required"] = required
        return schema

    def safe_parse(self, value):
        """Returns `(data, issues)`: the declared fields of a valid value, or the `path: message` issues."""
        if not isinstance(value, dict):
            return None, [f"(root): Invalid input: expected object, received {received_type(value)}"]
        data = {}
        issues = []
        for name, field in self.fields.items():
            if name not in value:
                if not field.optional:
                    issues.append(f"{name}: Invalid input: expected {field.type_name}, received undefined")
                continue
            problem = field.problem(value[name])
            if problem is None:
                data[name] = value[name]
            else:
                issues.append(f"{name}: {problem}")
        return (None, issues) if issues else (data, [])


def failure(request_id, code, message):
    return to_json({"jsonrpc": "2.0", "id": request_id, "error": {"code": code, "message": message}})


class McpServer:
    """A minimal MCP server for the 2026-07-28 revision: stateless JSON-RPC, protocol version in `_meta` on every request, tools only."""

    def __init__(self, name, version, tools):
        self.name = name
        self.version = version
        self.tools = tools

    def success(self, request_id, result):
        server_meta = {SERVER_INFO_KEY: {"name": self.name, "version": self.version}}
        return to_json({"jsonrpc": "2.0", "id": request_id, "result": {"resultType": "complete", **result, "_meta": server_meta}})

    async def call_tool(self, params):
        tool = next((candidate for candidate in self.tools if candidate["name"] == params.get("name")), None)
        if tool is None:
            raise McpError(-32602, f"Unknown tool: {params.get('name')}")
        arguments = params.get("arguments")
        data, issues = tool["input"].safe_parse({} if arguments is None else arguments)
        if issues:
            return {"content": [{"type": "text", "text": f"Invalid arguments for {tool['name']}: {'; '.join(issues)}"}], "isError": True}
        try:
            value = tool["handler"](data)
            if inspect.isawaitable(value):
                value = await value
        except Exception as error:
            return {"content": [{"type": "text", "text": f"{tool['name']} failed: {error}"}], "isError": True}
        if isinstance(value, str):
            return {"content": [{"type": "text", "text": value}], "isError": False}
        return {"content": [{"type": "text", "text": to_json(value)}], "structuredContent": value, "isError": False}

    async def handle(self, message):
        """Answers one serialized JSON-RPC message; returns None for a notification."""
        try:
            request = json.loads(message)
        except ValueError:
            return failure(None, -32700, "Parse error")
        if not isinstance(request, dict) or request.get("jsonrpc") != "2.0" or not isinstance(request.get("method"), str):
            return failure(request.get("id") if isinstance(request, dict) else None, -32600, "Invalid Request")
        if "id" not in request:
            return None
        params = request.get("params")
        params = {} if params is None else params
        meta = params.get("_meta") if isinstance(params, dict) else None
        if not isinstance(meta, dict) or meta.get(PROTOCOL_VERSION_KEY) != PROTOCOL_VERSION or not isinstance(meta.get(CLIENT_CAPABILITIES_KEY), dict):
            return failure(request["id"], -32602, f"Every request must carry protocol version {PROTOCOL_VERSION} and client capabilities in _meta")
        try:
            if request["method"] == "server/discover":
                return self.success(request["id"], {"supportedVersions": [PROTOCOL_VERSION], "capabilities": {"tools": {}}, "ttlMs": 60_000, "cacheScope": "public"})
            if request["method"] == "tools/list":
                tools = [{"name": tool["name"], "description": tool["description"], "inputSchema": tool["input"].json_schema()} for tool in self.tools]
                return self.success(request["id"], {"tools": tools, "ttlMs": 60_000, "cacheScope": "public"})
            if request["method"] == "tools/call":
                return self.success(request["id"], await self.call_tool(params))
            return failure(request["id"], -32601, f"Method not found: {request['method']}")
        except McpError as error:
            return failure(request["id"], error.code, error.message)
        except Exception:
            return failure(request["id"], -32603, "Internal error")


def create_mcp_server(*, name, version, tools):
    """Creates an MCP server over tool dicts `{"name", "description", "input", "handler"}`."""
    return McpServer(name, version, tools)


class McpClient:
    """A client over the in-memory transport: every request carries the protocol version and the client capabilities."""

    def __init__(self, server):
        self.server = server
        self.next_id = 1

    async def request(self, method, params=None):
        message = {
            "jsonrpc": "2.0",
            "id": self.next_id,
            "method": method,
            "params": {**(params or {}), "_meta": {PROTOCOL_VERSION_KEY: PROTOCOL_VERSION, CLIENT_CAPABILITIES_KEY: {}}},
        }
        self.next_id += 1
        reply = await self.server.handle(to_json(message))
        response = None if reply is None else json.loads(reply)
        if isinstance(response, dict) and response.get("error"):
            raise McpError(response["error"]["code"], response["error"]["message"])
        return response["result"]

    async def list_tools(self):
        """Returns the tool definitions `{"name", "description", "parameters"}` a model accepts."""
        result = await self.request("tools/list")
        return [{"name": tool["name"], "description": tool["description"], "parameters": tool["inputSchema"]} for tool in result["tools"]]

    async def call_tool(self, name, arguments):
        """Calls a tool and returns `{"isError", "text", "structuredContent"?}`."""
        result = await self.request("tools/call", {"name": name, "arguments": arguments})
        text = "\n".join(block["text"] for block in result["content"])
        if "structuredContent" not in result:
            return {"isError": result["isError"], "text": text}
        return {"isError": result["isError"], "text": text, "structuredContent": result["structuredContent"]}


def create_mcp_client(server):
    return McpClient(server)


class SupportServer:
    """The support tools behind MCP: help center search, invoice lookup, refunds and an email tool the policy must keep closed."""

    def __init__(self, retriever, invoices):
        self.retriever = retriever
        self.invoices = invoices
        self.executed = []
        self.refunds = []
        self.outbox = []
        tools = [
            {
                "name": "search_docs",
                "description": "Search the help center and internal support procedures. Returns the best matching documents with their ids; cite them as [id].",
                "input": ObjectSchema({"query": StringSchema(min_length=1), "topK": NumberSchema(integer=True, minimum=1, maximum=5, optional=True)}),
                "handler": self.logged("search_docs", self.search_docs),
            },
            {
                "name": "get_invoice",
                "description": "Look up one invoice by id (for example INV-1001): customer, amount in USD, status and the note the customer wrote.",
                "input": ObjectSchema({"invoiceId": StringSchema()}),
                "handler": self.logged("get_invoice", self.get_invoice),
            },
            {
                "name": "issue_refund",
                "description": "Refund part or all of a paid invoice. Requires a reason.",
                "input": ObjectSchema({"invoiceId": StringSchema(), "amountUsd": NumberSchema(positive=True), "reason": StringSchema(min_length=3)}),
                "handler": self.logged("issue_refund", self.issue_refund),
            },
            {
                "name": "send_email",
                "description": "Send an email to any address.",
                "input": ObjectSchema({"to": StringSchema(), "subject": StringSchema(), "body": StringSchema()}),
                "handler": self.logged("send_email", self.send_email),
            },
        ]
        self.server = create_mcp_server(name="ledgerly-support", version="1.0.0", tools=tools)

    def logged(self, name, handler):
        def run(arguments):
            self.executed.append({"name": name, "arguments": arguments})
            return handler(arguments)

        return run

    def find_invoice(self, invoice_id):
        invoice = next((candidate for candidate in self.invoices if candidate["id"] == invoice_id), None)
        if invoice is None:
            raise LookupError(f"Invoice {invoice_id} not found")
        return invoice

    def search_docs(self, arguments):
        return {"hits": self.retriever.search(arguments["query"], top_k=arguments.get("topK", 3))}

    def get_invoice(self, arguments):
        return self.find_invoice(arguments["invoiceId"])

    def issue_refund(self, arguments):
        invoice = self.find_invoice(arguments["invoiceId"])
        if arguments["amountUsd"] > invoice["amountUsd"]:
            raise ValueError(f"Refund of {arguments['amountUsd']} USD is above the invoice amount of {invoice['amountUsd']} USD")
        refund = {"refundId": f"RF-{len(self.refunds) + 1}", "invoiceId": arguments["invoiceId"], "amountUsd": arguments["amountUsd"], "reason": arguments["reason"]}
        self.refunds.append(refund)
        return refund

    def send_email(self, arguments):
        self.outbox.append(arguments)
        return f"Email sent to {arguments['to']}"


def create_support_server(*, retriever, invoices):
    """Creates the support server; `executed`, `refunds` and `outbox` log what really ran."""
    return SupportServer(retriever, invoices)
