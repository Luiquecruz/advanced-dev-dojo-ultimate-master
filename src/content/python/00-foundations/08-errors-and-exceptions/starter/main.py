def parse_quantity(text):
    # TODO: raise ValueError for negative numbers too, with the original text in every message.
    return int(text)


def safe_ratio(part, whole):
    # TODO: handle only the zero divisor; other errors must reach the caller.
    try:
        return part / whole
    except Exception:
        return None


def read_port(settings):
    # TODO: return settings["port"] as an int, 8080 when the key is missing, ValueError mentioning port for a bad value.
    return 8080


def parse_all(texts):
    # TODO: parse every text with parse_quantity; collect the numbers and the rejected texts.
    return [], []


def run_with_log(action, log):
    # TODO: log "end" even when action raises, and let that exception reach the caller.
    log.append("start")
    result = action()
    log.append("end")
    return result
