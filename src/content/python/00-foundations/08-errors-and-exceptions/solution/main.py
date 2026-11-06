def parse_quantity(text):
    try:
        quantity = int(text)
    except ValueError as error:
        raise ValueError(f"not a whole quantity: {text!r}") from error
    if quantity < 0:
        raise ValueError(f"quantity cannot be negative: {text!r}")
    return quantity


def safe_ratio(part, whole):
    try:
        return part / whole
    except ZeroDivisionError:
        return None


def read_port(settings):
    try:
        value = settings["port"]
    except KeyError:
        return 8080
    try:
        return int(value)
    except (ValueError, TypeError) as error:
        raise ValueError(f"port must be a number, got {value!r}") from error


def parse_all(texts):
    values = []
    rejected = []
    for text in texts:
        try:
            quantity = parse_quantity(text)
        except ValueError:
            rejected.append(text)
        else:
            values.append(quantity)
    return values, rejected


def run_with_log(action, log):
    log.append("start")
    try:
        return action()
    finally:
        log.append("end")
