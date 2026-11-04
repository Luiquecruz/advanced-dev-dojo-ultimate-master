from main import call_path, caller_name, exception_chain, raised_in


class GatewayError(Exception):
    pass


class RefundError(Exception):
    pass


def audit(action):
    print(f"audit: {action!r} requested by {caller_name()} via {' -> '.join(call_path(3))}")


def refund(order_id):
    audit(f"refund {order_id}")
    return charge_back(order_id)


def charge_back(order_id):
    try:
        return {"ord-1": 120}[order_id]
    except KeyError:
        raise GatewayError(f"no payment found for {order_id}")


def handle_refund(order_id):
    try:
        return refund(order_id)
    except GatewayError as error:
        raise RefundError("refund could not be issued") from error


def support_desk():
    for order_id in ("ord-1", "ord-9"):
        try:
            print(f"refunded {order_id}:", handle_refund(order_id))
        except RefundError as error:
            print(f"failed {order_id}: chain {exception_chain(error)}, direct cause raised in {raised_in(error.__cause__)}")


support_desk()
