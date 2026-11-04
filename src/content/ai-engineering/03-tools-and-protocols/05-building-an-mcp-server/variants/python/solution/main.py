import inspect
import json

from schema import to_json_schema

PROTOCOL_VERSION = "2026-07-28"
PROTOCOL_VERSION_KEY = "io.modelcontextprotocol/protocolVersion"
CLIENT_CAPABILITIES_KEY = "io.modelcontextprotocol/clientCapabilities"
SERVER_INFO_KEY = "io.modelcontextprotocol/serverInfo"
CACHE = {"ttlMs": 60_000, "cacheScope": "public"}


class ErrorCode:
    PARSE_ERROR = -32700
    INVALID_REQUEST = -32600
    METHOD_NOT_FOUND = -32601
    INVALID_PARAMS = -32602
    INTERNAL_ERROR = -32603
    UNSUPPORTED_PROTOCOL_VERSION = -32022


class ProtocolError(Exception):
    """A JSON-RPC error with its `code` and optional `data`."""

    def __init__(self, code, message, data=None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.data = data


def to_json(value):
    """Serializes like JSON.stringify: compact, without escaping non-ASCII characters."""
    return json.dumps(value, separators=(",", ":"), ensure_ascii=False)


def is_request_id(value):
    return isinstance(value, (str, int, float)) and not isinstance(value, bool)


def failure(request_id, code, message, data=None):
    error = {"code": code, "message": message} if data is None else {"code": code, "message": message, "data": data}
    return to_json({"jsonrpc": "2.0", "id": request_id, "error": error})


async def resolve(value):
    return await value if inspect.isawaitable(value) else value


def input_schema_of(input):
    schema = to_json_schema(input)
    del schema["$schema"]
    return schema


def text_result(text, is_error, structured_content=None):
    result = {"content": [{"type": "text", "text": text}]}
    if structured_content is not None:
        result["structuredContent"] = structured_content
    result["isError"] = is_error
    return result


def check_meta(params):
    meta = params.get("_meta")
    if not isinstance(meta, dict) or not isinstance(meta.get(PROTOCOL_VERSION_KEY), str) or not isinstance(meta.get(CLIENT_CAPABILITIES_KEY), dict):
        raise ProtocolError(ErrorCode.INVALID_PARAMS, f'Every request must carry _meta["{PROTOCOL_VERSION_KEY}"] and _meta["{CLIENT_CAPABILITIES_KEY}"]')
    requested = meta[PROTOCOL_VERSION_KEY]
    if requested != PROTOCOL_VERSION:
        raise ProtocolError(ErrorCode.UNSUPPORTED_PROTOCOL_VERSION, "Unsupported protocol version", {"supported": [PROTOCOL_VERSION], "requested": requested})


class McpServer:
    """A stateless MCP server: `await handle(message)` answers one serialized JSON-RPC message."""

    def __init__(self, name, version, tools, resources, instructions=None):
        self.name = name
        self.version = version
        self.tools = tools
        self.resources = resources
        self.instructions = instructions

    async def call_tool(self, params):
        if not isinstance(params.get("name"), str):
            raise ProtocolError(ErrorCode.INVALID_PARAMS, 'tools/call requires a string "name"')
        tool = next((candidate for candidate in self.tools if candidate["name"] == params["name"]), None)
        if tool is None:
            raise ProtocolError(ErrorCode.INVALID_PARAMS, f"Unknown tool: {params['name']}")
        arguments = params.get("arguments")
        arguments = {} if arguments is None else arguments
        if not isinstance(arguments, dict):
            raise ProtocolError(ErrorCode.INVALID_PARAMS, 'tools/call "arguments" must be an object')
        parsed = tool["input"].safe_parse(arguments)
        if not parsed.success:
            issues = "\n".join(f"- {'.'.join(str(key) for key in issue.path) or '(root)'}: {issue.message}" for issue in parsed.issues)
            return text_result(f"Invalid arguments for {tool['name']}:\n{issues}", True)
        try:
            value = await resolve(tool["handler"](parsed.data))
        except Exception as error:
            return text_result(f"{tool['name']} failed: {error}", True)
        return text_result(value, False) if isinstance(value, str) else text_result(to_json(value), False, value)

    async def read_resource(self, params):
        if not isinstance(params.get("uri"), str):
            raise ProtocolError(ErrorCode.INVALID_PARAMS, 'resources/read requires a string "uri"')
        resource = next((candidate for candidate in self.resources if candidate["uri"] == params["uri"]), None)
        if resource is None:
            raise ProtocolError(ErrorCode.INVALID_PARAMS, "Resource not found", {"uri": params["uri"]})
        text = await resolve(resource["read"]())
        return {"contents": [{"uri": resource["uri"], "mimeType": resource["mimeType"], "text": text}], **CACHE}

    def list_resources(self):
        listed = []
        for resource in self.resources:
            entry = {"uri": resource["uri"], "name": resource["name"], "mimeType": resource["mimeType"]}
            if resource.get("description"):
                entry["description"] = resource["description"]
            listed.append(entry)
        return {"resources": listed, **CACHE}

    async def dispatch(self, method, params):
        if method == "server/discover":
            result = {"supportedVersions": [PROTOCOL_VERSION], "capabilities": {"tools": {}, "resources": {}}}
            if self.instructions:
                result["instructions"] = self.instructions
            return {**result, **CACHE}
        if method == "tools/list":
            tools = [{"name": tool["name"], "description": tool["description"], "inputSchema": input_schema_of(tool["input"])} for tool in self.tools]
            return {"tools": tools, **CACHE}
        if method == "tools/call":
            return await self.call_tool(params)
        if method == "resources/list":
            return self.list_resources()
        if method == "resources/read":
            return await self.read_resource(params)
        raise ProtocolError(ErrorCode.METHOD_NOT_FOUND, f"Method not found: {method}")

    async def handle(self, message):
        try:
            request = json.loads(message)
        except ValueError:
            return failure(None, ErrorCode.PARSE_ERROR, "Parse error")
        if not isinstance(request, dict) or request.get("jsonrpc") != "2.0" or not isinstance(request.get("method"), str):
            request_id = request.get("id") if isinstance(request, dict) and is_request_id(request.get("id")) else None
            return failure(request_id, ErrorCode.INVALID_REQUEST, "Invalid Request")
        if "id" not in request:
            return None
        if not is_request_id(request["id"]):
            return failure(None, ErrorCode.INVALID_REQUEST, "Request id must be a string or a number")
        request_id = request["id"]
        if request["method"] == "initialize":
            return failure(
                request_id,
                ErrorCode.METHOD_NOT_FOUND,
                f"initialize is not supported: this server speaks MCP {PROTOCOL_VERSION}, which has no handshake. Send the protocol version in _meta on every request.",
            )
        if "params" in request and not isinstance(request["params"], dict):
            return failure(request_id, ErrorCode.INVALID_PARAMS, "params must be an object")
        params = request.get("params", {})
        try:
            check_meta(params)
            result = await self.dispatch(request["method"], params)
        except ProtocolError as error:
            return failure(request_id, error.code, error.message, error.data)
        except Exception:
            return failure(request_id, ErrorCode.INTERNAL_ERROR, "Internal error")
        server_meta = {SERVER_INFO_KEY: {"name": self.name, "version": self.version}}
        return to_json({"jsonrpc": "2.0", "id": request_id, "result": {"resultType": "complete", **result, "_meta": server_meta}})


def create_mcp_server(name, version, tools, resources, instructions=None):
    return McpServer(name, version, tools, resources, instructions)
