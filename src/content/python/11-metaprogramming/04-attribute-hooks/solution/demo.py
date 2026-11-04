from main import Defaults, Frozen, Proxy


class Account:
    def __init__(self, owner):
        self.owner = owner
        self.balance = 0

    def deposit(self, amount):
        self.balance += amount
        return self.balance


account = Account("ada")
audited = Proxy(account)
audited.deposit(120)
audited.note = "first deposit"
print("balance:", audited.balance)
print("audit log:", audited.log)
print("dir has target names:", "deposit" in dir(audited))


class ServerConfig(Frozen):
    def __init__(self, host, port):
        self.host = host
        self.port = port
        self.freeze()


config = ServerConfig("localhost", 8080)
config.port = 9090
try:
    config.hots = "db.internal"
except AttributeError as error:
    print("rejected:", error)


class RetryPolicy(Defaults):
    pass


policy = RetryPolicy({"attempts": 3, "backoff_ms": 200}, attempts=5)
print("attempts:", policy.attempts, "backoff_ms:", policy.backoff_ms)
print("has jitter?", hasattr(policy, "jitter"))
