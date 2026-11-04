import json

from main import UserPayload, validate_payload

bodies = [
    '{"id": 7, "name": "ada", "role": "admin", "tags": ["ops"]}',
    '{"id": true, "name": "alan", "role": "owner"}',
    '{"name": "grace", "role": "viewer", "team": "compilers"}',
]

for body in bodies:
    payload = json.loads(body)
    errors = validate_payload(payload, UserPayload)
    print("valid" if not errors else f"rejected: {errors}")

print("required:", sorted(UserPayload.__required_keys__), "| read-only:", sorted(UserPayload.__readonly_keys__))
print("TypedDict call validates nothing:", UserPayload(id="seven", role="owner"))
