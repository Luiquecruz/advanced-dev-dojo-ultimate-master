from bisect import bisect_left
from operator import attrgetter
from typing import NamedTuple


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


class VirtualNode(NamedTuple):
    position: int
    node: str


_by_position = attrgetter("position")


class HashRing:
    def __init__(self, *, virtual_nodes):
        self._virtual_nodes = virtual_nodes
        self._members = set()
        self._ring = []

    def add_node(self, name):
        if name in self._members:
            return
        self._members.add(name)
        self._ring.extend(VirtualNode(hash32(f"{name}#{index}"), name) for index in range(self._virtual_nodes))
        self._ring.sort(key=_by_position)

    def remove_node(self, name):
        if name not in self._members:
            return
        self._members.remove(name)
        self._ring = [virtual_node for virtual_node in self._ring if virtual_node.node != name]

    def node_for(self, key):
        if not self._ring:
            return None
        return self._ring[self._first_index_at_or_after(hash32(key))].node

    def nodes_for(self, key, count):
        replicas = []
        if not self._ring:
            return replicas
        wanted = min(count, len(self._members))
        start = self._first_index_at_or_after(hash32(key))
        for step in range(len(self._ring)):
            if len(replicas) >= wanted:
                break
            node = self._ring[(start + step) % len(self._ring)].node
            if node not in replicas:
                replicas.append(node)
        return replicas

    def _first_index_at_or_after(self, position):
        index = bisect_left(self._ring, position, key=_by_position)
        return 0 if index == len(self._ring) else index


if __name__ == "__main__":
    ring = HashRing(virtual_nodes=100)
    for name in ["cache-a", "cache-b", "cache-c"]:
        ring.add_node(name)
    print(ring.node_for("user:42"), ring.nodes_for("user:42", 2))
