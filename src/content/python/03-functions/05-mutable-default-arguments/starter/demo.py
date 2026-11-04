from main import DEFAULT_HEADERS, Registry, Settings, add_tag, request

print("two calls:", add_tag("python"), add_tag("rust"))

plugins = Registry()
plugins.register("cache", "redis")
print("fresh registry:", Registry().items, "| first registry:", plugins.items)

blue, green = Settings(), Settings(name="green")
blue.tags.append("blue")
print("settings:", blue, green)

response = request("/orders")
response["headers"]["Authorization"] = "token"
print("omitted headers:", response["headers"])
print("None headers:", request("/health", None)["headers"])
print("defaults untouched:", "Authorization" not in DEFAULT_HEADERS)
