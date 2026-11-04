from main import CaseInsensitiveDict

headers = CaseInsensitiveDict({"Content-Type": "text/html"})
headers["ACCEPT"] = "*/*"
print("lookup any case:", headers["content-type"], headers["accept"])
print("keys as written:", list(headers))

headers["content-type"] = "application/json"
print("replaced, size:", len(headers), "| key now:", list(headers)[0])
print("get / in / pop:", headers.get("ACCEPT"), "Accept" in headers, headers.pop("accept"))
print("copy independent:", headers.copy() == headers, headers.copy() is headers)
