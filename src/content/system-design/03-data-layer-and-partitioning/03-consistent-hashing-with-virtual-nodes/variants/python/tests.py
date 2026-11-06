from collections import Counter

FOUR = ["node-1", "node-2", "node-3", "node-4"]


def keys(count, prefix="key-"):
    return [f"{prefix}{index}" for index in range(count)]


def ring_of(names, virtual_nodes):
    ring = mod.HashRing(virtual_nodes=virtual_nodes)
    for name in names:
        ring.add_node(name)
    return ring


class ReferenceRing:
    """A slow ring that is easy to check by eye: every virtual node in a sorted list, scanned from the start."""

    def __init__(self, names, virtual_nodes):
        placed = [(mod.hash32(f"{node}#{index}"), node) for node in names for index in range(virtual_nodes)]
        self.positions = sorted(placed, key=lambda virtual_node: virtual_node[0])

    def start_of(self, key):
        key_hash = mod.hash32(key)
        return next((index for index, (position, _) in enumerate(self.positions) if position >= key_hash), 0)

    def owner(self, key):
        return self.positions[self.start_of(key)][1]

    def replicas(self, key, count):
        found = []
        start = self.start_of(key)
        for step in range(len(self.positions)):
            if len(found) >= count:
                break
            node = self.positions[(start + step) % len(self.positions)][1]
            if node not in found:
                found.append(node)
        return found


@test("a key belongs to the first virtual node clockwise, and the ring wraps around")
def _():
    assert mod.HashRing(virtual_nodes=10).node_for("anything") is None
    ring = ring_of(FOUR, 10)
    reference = ReferenceRing(FOUR, 10)
    misplaced = [key for key in keys(300) if ring.node_for(key) != reference.owner(key)]
    assert misplaced == []
    ring.add_node("node-1")
    assert ring.node_for("key-7") == reference.owner("key-7")


# beginner mistake: hash(key) % N, which remaps almost every key when a node joins
@test("adding a fifth node moves well under half of the keys, and only to the new node")
def _():
    ring = ring_of(FOUR, 100)
    before = {key: ring.node_for(key) for key in keys(1000)}
    ring.add_node("node-5")
    moved = [key for key in keys(1000) if ring.node_for(key) != before[key]]
    assert len(moved) > 0
    assert len(moved) < 350
    moved_elsewhere = [key for key in moved if ring.node_for(key) != "node-5"]
    assert moved_elsewhere == []


@test("removing a node moves only its own keys, and they spread over the other nodes")
def _():
    ring = ring_of(FOUR, 100)
    ring.add_node("node-2")
    before = {key: ring.node_for(key) for key in keys(1000)}
    ring.remove_node("node-2")
    ring.remove_node("node-9")
    receivers = set()
    for key in keys(1000):
        owner = ring.node_for(key)
        assert owner != "node-2"
        if before[key] == "node-2":
            receivers.add(owner)
        else:
            assert owner == before[key]
    assert sorted(receivers) == ["node-1", "node-3", "node-4"]


@test("100 virtual nodes per node balance 10,000 keys far better than one position per node")
def _():
    def shares(virtual_nodes):
        ring = ring_of(FOUR, virtual_nodes)
        owners = Counter(ring.node_for(key) for key in keys(10_000, "user:"))
        return [owners[node] / 10_000 for node in FOUR]

    single = shares(1)
    many = shares(100)
    assert max(single) > 0.4
    assert min(many) > 0.18
    assert max(many) < 0.32


@test("replicas are distinct physical nodes met clockwise, starting with the owner")
def _():
    ring = ring_of(FOUR, 50)
    reference = ReferenceRing(FOUR, 50)
    for key in keys(200):
        replicas = ring.nodes_for(key, 3)
        expected = reference.replicas(key, 3)
        owner = ring.node_for(key)
        assert replicas == expected
        assert len(set(replicas)) == 3
        assert replicas[0] == owner
    assert sorted(ring.nodes_for("key-1", 10)) == FOUR
    assert mod.HashRing(virtual_nodes=5).nodes_for("key-1", 2) == []
