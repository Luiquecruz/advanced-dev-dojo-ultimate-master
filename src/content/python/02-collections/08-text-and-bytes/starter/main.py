import unicodedata


def decode_lenient(data, encodings=("utf-8", "latin-1")):
    # TODO: try each encoding in order; raise ValueError when none decodes the data.
    return data.decode("utf-8")


def truncate_utf8(text, max_bytes):
    # TODO: cut by BYTES without splitting a character, and return a str.
    return text[:max_bytes]


def normalize_key(text):
    # TODO: NFC-normalize and case-fold.
    return text.lower()


def money_row(label, cents):
    # TODO: label left-aligned in 10 columns, euros right-aligned in 8 columns with two decimals.
    return f"{label} {cents / 100}"
