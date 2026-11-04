import unicodedata


def decode_lenient(data, encodings=("utf-8", "latin-1")):
    for encoding in encodings:
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise ValueError("no encoding could decode the data")


def truncate_utf8(text, max_bytes):
    return text.encode("utf-8")[:max_bytes].decode("utf-8", errors="ignore")


def normalize_key(text):
    return unicodedata.normalize("NFC", text).casefold()


def money_row(label, cents):
    return f"{label:<10}{cents / 100:>8.2f}"
