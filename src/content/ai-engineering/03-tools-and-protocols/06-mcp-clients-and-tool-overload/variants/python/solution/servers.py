import json

VERSION = "2026-07-28"


def to_json(value):
    """Serializes like JSON.stringify: compact, without escaping non-ASCII characters."""
    return json.dumps(value, separators=(",", ":"), ensure_ascii=False)


def string_parameter(name, description):
    return {"type": "object", "properties": {name: {"type": "string", "description": description}}, "required": [name], "additionalProperties": False}


def reply(request_id, body):
    return to_json({"jsonrpc": "2.0", "id": request_id, **body})


class FixtureServer:
    """A small MCP 2026-07-28 server for the challenge: server/discover, paginated tools/list and tools/call."""

    def __init__(self, name, tools, page_size=2):
        self.name = name
        self.tools = tools
        self.page_size = page_size

    def complete(self, request_id, result):
        return reply(request_id, {"result": {"resultType": "complete", **result, "_meta": {"io.modelcontextprotocol/serverInfo": {"name": self.name, "version": "1.0.0"}}}})

    async def handle(self, message):
        request = json.loads(message)
        if "id" not in request:
            return None
        request_id = request["id"]
        params = request.get("params") or {}
        meta = params.get("_meta") or {}
        if not isinstance(meta.get("io.modelcontextprotocol/protocolVersion"), str) or not isinstance(meta.get("io.modelcontextprotocol/clientCapabilities"), dict):
            return reply(request_id, {"error": {"code": -32602, "message": "Missing required _meta fields"}})
        if meta["io.modelcontextprotocol/protocolVersion"] != VERSION:
            data = {"supported": [VERSION], "requested": meta["io.modelcontextprotocol/protocolVersion"]}
            return reply(request_id, {"error": {"code": -32022, "message": "Unsupported protocol version", "data": data}})
        method = request.get("method")
        if method == "server/discover":
            return self.complete(request_id, {"supportedVersions": [VERSION], "capabilities": {"tools": {}}, "ttlMs": 60000, "cacheScope": "public"})
        if method == "tools/list":
            start = int(params["cursor"]) if "cursor" in params else 0
            page = [{"name": tool["name"], "description": tool["description"], "inputSchema": tool["inputSchema"]} for tool in self.tools[start : start + self.page_size]]
            following = {"nextCursor": str(start + self.page_size)} if start + self.page_size < len(self.tools) else {}
            return self.complete(request_id, {"tools": page, **following, "ttlMs": 60000, "cacheScope": "public"})
        if method == "tools/call":
            tool = next((candidate for candidate in self.tools if candidate["name"] == params.get("name")), None)
            if tool is None:
                return reply(request_id, {"error": {"code": -32602, "message": f"Unknown tool: {params.get('name')}"}})
            try:
                text = tool["run"](params.get("arguments") or {})
            except Exception as error:
                return self.complete(request_id, {"content": [{"type": "text", "text": str(error)}], "isError": True})
            return self.complete(request_id, {"content": [{"type": "text", "text": text}], "isError": False})
        return reply(request_id, {"error": {"code": -32601, "message": f"Method not found: {method}"}})


class BrokenServer:
    """A server that fails every request with an internal error, like a crashed or misconfigured process."""

    async def handle(self, message):
        request = json.loads(message)
        if "id" not in request:
            return None
        return reply(request["id"], {"error": {"code": -32603, "message": "Internal error: database unavailable"}})


def create_fixture_server(name, tools, page_size=2):
    return FixtureServer(name, tools, page_size)


def create_broken_server():
    return BrokenServer()


CUSTOMERS = [{"id": "C-7", "name": "Ada Lovelace", "email": "ada@example.com"}]
INVOICES = [{"invoice": "INV-1001", "customerId": "C-7", "amount": 49, "status": "paid"}]


def search_customers(arguments):
    query = str(arguments.get("query")).lower()
    return to_json([customer for customer in CUSTOMERS if query in f"{customer['name']} {customer['email']}".lower()])


def find_customer(arguments):
    if arguments.get("customerId") != "C-7":
        raise LookupError(f"No customer {arguments.get('customerId')}. Use search to find the id.")
    return to_json({"id": "C-7", "name": "Ada Lovelace", "email": "ada@example.com", "plan": "pro", "since": "2024-02-01"})


def search_invoices(arguments):
    query = str(arguments.get("query"))
    return to_json([invoice for invoice in INVOICES if query in f"{invoice['invoice']} {invoice['customerId']}"])


def refund_invoice(arguments):
    if arguments.get("invoice") != "INV-1001":
        raise LookupError(f"Invoice {arguments.get('invoice')} does not exist or is not paid.")
    return "Refund of INV-1001 (49 USD) issued"


CRM_TOOLS = [
    {
        "name": "search",
        "description": "Search customers by name or email address. Returns matching customer ids and names.",
        "inputSchema": string_parameter("query", "Part of a customer name or email"),
        "run": search_customers,
    },
    {
        "name": "find_customer",
        "description": "Fetch one customer profile by customer id (format C-123): name, email, plan and signup date.",
        "inputSchema": string_parameter("customerId", "Customer id such as C-7"),
        "run": find_customer,
    },
    {
        "name": "update_customer_email",
        "description": "Change a customer's contact email address after the customer confirmed the new address.",
        "inputSchema": {"type": "object", "properties": {"customerId": {"type": "string"}, "email": {"type": "string"}}, "required": ["customerId", "email"]},
        "run": lambda arguments: f"Email of {arguments.get('customerId')} changed to {arguments.get('email')}",
    },
    {
        "name": "list_customer_notes",
        "description": "List the notes support agents wrote about a customer, newest first.",
        "inputSchema": string_parameter("customerId", "Customer id such as C-7"),
        "run": lambda arguments: to_json(["2026-10-01: asked about annual billing"]),
    },
]

BILLING_TOOLS = [
    {
        "name": "search",
        "description": "Search invoices by invoice number or customer id. Returns invoice numbers, amounts and status.",
        "inputSchema": string_parameter("query", "Invoice number such as INV-1001, or a customer id"),
        "run": search_invoices,
    },
    {
        "name": "list_invoices",
        "description": "List all invoices of a customer with amount, due date and payment status.",
        "inputSchema": string_parameter("customerId", "Customer id such as C-7"),
        "run": lambda arguments: to_json([{"invoice": "INV-1001", "amount": 49, "status": "paid"}]),
    },
    {
        "name": "refund_invoice",
        "description": "Refund a paid invoice to the original payment method. Requires the invoice number and a reason.",
        "inputSchema": {"type": "object", "properties": {"invoice": {"type": "string", "description": "Invoice number such as INV-1001"}, "reason": {"type": "string"}}, "required": ["invoice", "reason"]},
        "run": refund_invoice,
    },
    {
        "name": "apply_credit",
        "description": "Add account credit to a customer's balance, used for goodwill gestures.",
        "inputSchema": {"type": "object", "properties": {"customerId": {"type": "string"}, "amount": {"type": "number"}}, "required": ["customerId", "amount"]},
        "run": lambda arguments: f"Credit of {arguments.get('amount')} USD added to {arguments.get('customerId')}",
    },
]

DOCS_TOOLS = [
    {
        "name": "search",
        "description": "Search the internal knowledge base articles about policies and procedures by keyword.",
        "inputSchema": string_parameter("query", 'Keywords, such as "refund policy"'),
        "run": lambda arguments: to_json([{"id": "KB-12", "title": "Refund policy: 30 days after delivery"}]),
    },
    {
        "name": "get_article",
        "description": "Read the full text of one knowledge base article by id (format KB-12).",
        "inputSchema": string_parameter("articleId", "Article id such as KB-12"),
        "run": lambda arguments: "Refunds are accepted within 30 days of delivery, to the original payment method.",
    },
]


def create_company_servers():
    return [
        {"id": "crm", "server": create_fixture_server("crm", CRM_TOOLS)},
        {"id": "billing", "server": create_fixture_server("billing", BILLING_TOOLS)},
        {"id": "docs", "server": create_fixture_server("docs", DOCS_TOOLS)},
    ]
