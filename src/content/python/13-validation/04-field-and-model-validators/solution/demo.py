import json

from main import Signup, signup_errors

payloads = {
    "valid": {"username": "ada_l", "email": " Ada@Example.COM", "age": 36, "password": "correct horse battery", "password_confirm": "correct horse battery"},
    "legacy app": {"username": "grace", "e_mail": "Grace@Navy.MIL", "age": 85, "password": "a very long secret", "password_confirm": "a very long secret"},
    "weak": {"username": "Al", "email": "nobody", "age": 12, "password": "hunter2", "password_confirm": "hunter2"},
    "mismatch": {"username": "linus", "email": "linus@example.org", "age": 30, "password": "correct horse battery", "password_confirm": "correct horse batterz"},
}

for label, payload in payloads.items():
    errors = signup_errors(payload)
    if errors:
        print(f"{label}: 422", json.dumps([{"loc": list(item["loc"]), "type": item["type"]} for item in errors]))
    else:
        print(f"{label}: 201", Signup.model_validate(payload).email)
