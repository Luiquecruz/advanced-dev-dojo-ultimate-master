import json

from pydantic import ValidationError

from main import parse_user, to_public

bodies = [
    '{"id": "42", "email": "ada@example.com", "tags": ["ops"]}',
    '{"id": "forty-two", "tags": ["ops", 3]}',
    '{"id": 7, "email": "eve@example.com", "is_admin": true}',
]

for body in bodies:
    try:
        user = parse_user(json.loads(body))
    except ValidationError as error:
        problems = [(".".join(str(part) for part in item["loc"]), item["type"]) for item in error.errors()]
        print(f"rejected ({error.error_count()} errors):", problems)
        continue
    print("accepted:", repr(user), "| public:", to_public(user))
