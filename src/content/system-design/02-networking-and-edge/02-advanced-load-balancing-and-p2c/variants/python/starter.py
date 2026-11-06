class Router:
    def __init__(self, routes):
        self._routes = list(routes)

    def route(self, path):
        # TODO: match on segment boundaries and let the longest matching prefix win
        match = next((candidate for candidate in self._routes if path.startswith(candidate["prefix"])), None)
        return match["pool"] if match is not None else None


class P2CBalancer:
    def __init__(self, backends, random):
        self._backends = list(backends)
        self._random = random
        self._counts = dict.fromkeys(self._backends, 0)

    def in_flight(self, name):
        return self._counts.get(name, 0)

    def pick(self):
        # TODO: raise on an empty pool, sample two distinct backends and keep the less loaded one
        chosen = self._backends[int(self._random() * len(self._backends))]
        self._counts[chosen] = self.in_flight(chosen) + 1
        return chosen

    def release(self, name):
        # TODO: lower the count of a known backend, never below zero
        pass


if __name__ == "__main__":
    import random

    router = Router([
        {"prefix": "/", "pool": "web"},
        {"prefix": "/api", "pool": "api"},
        {"prefix": "/api/v2", "pool": "api-v2"},
    ])
    print(router.route("/api/v2/orders"), router.route("/apiary"))

    balancer = P2CBalancer(["a", "b", "c"], random.random)
    print(balancer.pick(), balancer.pick(), balancer.pick())
