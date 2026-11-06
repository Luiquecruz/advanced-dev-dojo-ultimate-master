def matches(prefix, path):
    return prefix == "/" or path == prefix or path.startswith(prefix + "/")


class Router:
    def __init__(self, routes):
        self._routes = list(routes)

    def route(self, path):
        best = None
        for candidate in self._routes:
            if matches(candidate["prefix"], path) and (best is None or len(candidate["prefix"]) > len(best["prefix"])):
                best = candidate
        return best["pool"] if best is not None else None


class P2CBalancer:
    def __init__(self, backends, random):
        self._backends = list(backends)
        self._random = random
        self._counts = dict.fromkeys(self._backends, 0)

    def in_flight(self, name):
        return self._counts.get(name, 0)

    def pick(self):
        chosen = self._choose()
        self._counts[chosen] += 1
        return chosen

    def release(self, name):
        if self._counts.get(name, 0) > 0:
            self._counts[name] -= 1

    def _choose(self):
        n = len(self._backends)
        if n == 0:
            raise RuntimeError("no backends")
        if n == 1:
            return self._backends[0]
        first = int(self._random() * n)
        second = int(self._random() * (n - 1))
        if second >= first:
            second += 1
        if self.in_flight(self._backends[second]) < self.in_flight(self._backends[first]):
            return self._backends[second]
        return self._backends[first]


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
