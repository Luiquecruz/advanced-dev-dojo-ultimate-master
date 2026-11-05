PUNCTUATION = ".,!?;:"


def initials(full_name):
    return "".join([word[0].upper() + "." for word in full_name.split()])


def last_items(items, n):
    start = max(len(items) - n, 0)
    return items[start:]


def clean_words(text):
    stripped = [word.strip(PUNCTUATION) for word in text.lower().split()]
    return [word for word in stripped if word]


def highest(scores, n):
    return sorted(scores, reverse=True)[:n]
