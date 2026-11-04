import re

DEFAULT_SEPARATORS = ["\n\n", "\n", ". ", " "]

HEADING_PATTERN = re.compile(r"^(#{1,6})[ \t]+(.+?)[ \t]*$", re.MULTILINE)


def assert_options(size, overlap):
    if size <= 0 or overlap < 0 or overlap >= size:
        raise ValueError(f"Invalid chunk options: size {size}, overlap {overlap}. Overlap must be at least 0 and smaller than size.")


def to_chunks(document, ranges, heading_path, first_index=0):
    return [
        {
            "id": f"{document['source']}#{first_index + index}",
            "source": document["source"],
            "text": document["text"][start:end],
            "start": start,
            "end": end,
            "headingPath": heading_path,
        }
        for index, (start, end) in enumerate(ranges)
    ]


def chunk_fixed(document, *, size, overlap):
    assert_options(size, overlap)
    ranges = []
    length = len(document["text"])
    for start in range(0, length, size - overlap):
        end = min(start + size, length)
        ranges.append((start, end))
        if end == length:
            break
    return to_chunks(document, ranges, [])


def split_range(text, start, end, size, separators):
    if end - start <= size:
        return [(start, end)]
    if not separators:
        return [(piece_start, min(piece_start + size, end)) for piece_start in range(start, end, size)]
    separator, finer = separators[0], separators[1:]
    pieces = []
    piece_start = start
    found = text.find(separator, start)
    while found != -1 and found + len(separator) <= end:
        pieces.append((piece_start, found + len(separator)))
        piece_start = found + len(separator)
        found = text.find(separator, piece_start)
    if piece_start < end:
        pieces.append((piece_start, end))
    return [split for piece_from, piece_to in pieces for split in split_range(text, piece_from, piece_to, size, finer)]


def merge_pieces(pieces, size, overlap):
    merged = []
    current = []
    for piece in pieces:
        if current and piece[1] - current[0][0] > size:
            current_end = current[-1][1]
            merged.append((current[0][0], current_end))
            carried = []
            for candidate in reversed(current):
                if current_end - candidate[0] > overlap or piece[1] - candidate[0] > size:
                    break
                carried.insert(0, candidate)
            current = carried
        current.append(piece)
    if current:
        merged.append((current[0][0], current[-1][1]))
    return merged


def trim_range(text, start, end):
    while start < end and text[start].isspace():
        start += 1
    while end > start and text[end - 1].isspace():
        end -= 1
    return start, end


def recursive_ranges(text, start, end, size, overlap, separators=None):
    pieces = split_range(text, start, end, size, DEFAULT_SEPARATORS if separators is None else separators)
    trimmed = [trim_range(text, range_start, range_end) for range_start, range_end in merge_pieces(pieces, size, overlap)]
    return [(range_start, range_end) for range_start, range_end in trimmed if range_end > range_start]


def chunk_recursive(document, *, size, overlap, separators=None):
    assert_options(size, overlap)
    text = document["text"]
    return to_chunks(document, recursive_ranges(text, 0, len(text), size, overlap, separators), [])


def chunk_markdown(document, *, size, overlap):
    assert_options(size, overlap)
    text = document["text"]
    headings = [
        {"start": match.start(), "bodyStart": match.end(), "level": len(match.group(1)), "title": match.group(2)}
        for match in HEADING_PATTERN.finditer(text)
    ]
    first_heading_start = headings[0]["start"] if headings else len(text)
    sections = [{"start": 0, "end": first_heading_start, "headingPath": []}]
    stack = []
    for index, heading in enumerate(headings):
        while stack and stack[-1]["level"] >= heading["level"]:
            stack.pop()
        stack.append(heading)
        end = headings[index + 1]["start"] if index + 1 < len(headings) else len(text)
        if text[heading["bodyStart"]:end].strip() == "":
            continue
        sections.append({"start": heading["start"], "end": end, "headingPath": [entry["title"] for entry in stack]})
    chunks = []
    for section in sections:
        ranges = recursive_ranges(text, section["start"], section["end"], size, overlap)
        chunks.extend(to_chunks(document, ranges, section["headingPath"], len(chunks)))
    return chunks
