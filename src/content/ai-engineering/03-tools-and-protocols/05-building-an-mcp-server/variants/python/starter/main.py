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


class McpServer:
    """A stateless MCP server: `await handle(message)` answers one serialized JSON-RPC message."""

    def __init__(self, name, version, tools, resources, instructions=None):
        self.name = name
        self.version = version
        self.tools = tools
        self.resources = resources
        self.instructions = instructions

    async def handle(self, message):
        try:
            request = json.loads(message)
        except ValueError:
            return failure(None, ErrorCode.PARSE_ERROR, "Parse error")
        # TODO: validate the JSON-RPC envelope (-32600), stay silent for notifications, reject the legacy initialize handshake
        # TODO: require _meta protocol version and client capabilities on every request (-32602, -32022 with {"supported", "requested"})
        # TODO: server/discover, tools/list, tools/call (content + isError), resources/list, resources/read, each result with resultType "complete" and _meta serverInfo
        request_id = request.get("id") if isinstance(request, dict) else None
        method = request.get("method") if isinstance(request, dict) else None
        return failure(request_id, ErrorCode.METHOD_NOT_FOUND, f"Method not found: {method}")


def create_mcp_server(name, version, tools, resources, instructions=None):
    return McpServer(name, version, tools, resources, instructions)
