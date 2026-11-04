DEFAULT_SEPARATORS = ["\n\n", "\n", ". ", " "]


def chunk_fixed(document, *, size, overlap):
    # TODO: reject invalid options, then cut windows of size characters that step by size - overlap
    raise NotImplementedError


def chunk_recursive(document, *, size, overlap, separators=None):
    # TODO: split on the coarsest separator first, recurse into pieces that are still too big, merge pieces back up to the size with overlap, trim whitespace
    raise NotImplementedError


def chunk_markdown(document, *, size, overlap):
    # TODO: split the text into heading sections, track the heading path with a stack, and chunk each section recursively
    raise NotImplementedError
