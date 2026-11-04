from main import handle, only, validate_all


def positive_amount(request: dict) -> None:
    if request.get("amount", 0) <= 0:
        raise ValueError("amount must be positive")


def iso_currency(request: dict) -> None:
    currency = request.get("currency", "")
    if not (len(currency) == 3 and currency.isupper()):
        raise ValueError("currency must be an ISO 4217 code")


def card_token(request: dict) -> None:
    if not isinstance(request.get("card_token"), str):
        raise TypeError("card_token must be a string")


def order_id(request: dict) -> None:
    request["order_id"]


rules = [positive_amount, iso_currency, card_token, order_id]
request = {"amount": -10, "currency": "eur", "card_token": 4242}

try:
    validate_all(request, rules)
except ExceptionGroup as group:
    print(f"{group.message}: {len(group.exceptions)} problems")
    for error in group.exceptions:
        print(" -", type(error).__name__, error)
    print("value problems only:", [str(error) for error in only(group, ValueError).exceptions])
    try:
        print("handled:", handle(group))
    except ExceptionGroup as rest:
        print("not handled:", [type(error).__name__ for error in rest.exceptions])

validate_all({"amount": 10, "currency": "EUR", "card_token": "tok_1", "order_id": 7}, rules)
print("a valid request raises nothing")
