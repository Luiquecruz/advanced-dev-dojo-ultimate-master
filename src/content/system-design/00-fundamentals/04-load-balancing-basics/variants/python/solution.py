class RoundRobin:
    def __init__(self, servers):
        self._pool = list(servers)
        self._down = set()
        self._last = -1

    def next(self):
        for step in range(1, len(self._pool) + 1):
            index = (self._last + step) % len(self._pool)
            if self._pool[index] not in self._down:
                self._last = index
                return self._pool[index]
        raise RuntimeError("no healthy servers")

    def mark_down(self, name):
        if name in self._pool:
            self._down.add(name)

    def mark_up(self, name):
        self._down.discard(name)

    def healthy(self):
        return [server for server in self._pool if server not in self._down]


if __name__ == "__main__":
    balancer = RoundRobin(["a", "b", "c"])
    print(balancer.next(), balancer.next(), balancer.next(), balancer.next())
    balancer.mark_down("c")
    print(balancer.next(), balancer.next(), balancer.next(), balancer.healthy())
