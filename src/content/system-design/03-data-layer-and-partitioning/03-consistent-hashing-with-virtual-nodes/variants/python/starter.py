def hash32(text):
    """FNV-1a over the UTF-16 code units of text, then the MurmurHash3 final mix: an unsigned 32-bit integer."""
    value = 0x811C9DC5
    data = text.encode("utf-16-le", "surrogatepass")
    for index in range(0, len(data), 2):
        value ^= int.from_bytes(data[index:index + 2], "little")
        value = (value * 0x01000193) & 0xFFFFFFFF
    value ^= value >> 16
    value = (value * 0x85EBCA6B) & 0xFFFFFFFF
    value ^= value >> 13
    value = (value * 0xC2B2AE35) & 0xFFFFFFFF
    value ^= value >> 16
    return value


class HashRing:
    def __init__(self, *, virtual_nodes):
        self._virtual_nodes = virtual_nodes
        self._nodes = []

    def add_node(self, name):
        # TODO: place virtual_nodes positions at hash32(f"{name}#{index}"), kept sorted by position
        if name not in self._nodes:
            self._nodes.append(name)

    def remove_node(self, name):
        # TODO: remove every virtual node of this physical node
        if name in self._nodes:
            self._nodes.remove(name)

    def node_for(self, key):
        # TODO: replace the modulo with the first virtual node clockwise (binary search, wrapping)
        if not self._nodes:
            return None
        return self._nodes[hash32(key) % len(self._nodes)]

    def nodes_for(self, key, count):
        # TODO: walk clockwise and collect `count` distinct physical nodes
        first = self.node_for(key)
        return [] if first is None or count < 1 else [first]


if __name__ == "__main__":
    ring = HashRing(virtual_nodes=100)
    for name in ["cache-a", "cache-b", "cache-c"]:
        ring.add_node(name)
    print(ring.node_for("user:42"), ring.nodes_for("user:42", 2))
