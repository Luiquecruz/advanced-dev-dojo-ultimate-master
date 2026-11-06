class RoundRobin:
    def __init__(self, servers):
        self._pool = list(servers)
        self._down = set()
        self._last = -1

    def next(self):
        # TODO: skip servers marked down, and raise RuntimeError("no healthy servers") when none is left
        self._last = (self._last + 1) % len(self._pool)
        return self._pool[self._last]

    def mark_down(self, name):
        # TODO: take the server out of the rotation
        pass

    def mark_up(self, name):
        # TODO: put the server back into the rotation
        pass

    def healthy(self):
        # TODO: only the servers that are not marked down
        return list(self._pool)


if __name__ == "__main__":
    balancer = RoundRobin(["a", "b", "c"])
    print(balancer.next(), balancer.next(), balancer.next(), balancer.next())
    balancer.mark_down("c")
    print(balancer.next(), balancer.next(), balancer.next(), balancer.healthy())
