class Queue:
    def __init__(self, *, visibility_timeout_ms, max_receives, now):
        self._visibility_timeout_ms = visibility_timeout_ms
        self._max_receives = max_receives
        self._now = now
        self._messages = []
        self._dead = []
        self._next_id = 1

    def send(self, body):
        message_id = f"m{self._next_id}"
        self._next_id += 1
        self._messages.append({"id": message_id, "body": body, "receive_count": 0, "visible_at": self._now()})
        return message_id

    def receive(self):
        time = self._now()
        for message in list(self._messages):
            if message["visible_at"] > time:
                continue
            if message["receive_count"] >= self._max_receives:
                self._messages.remove(message)
                self._dead.append(public_view(message))
                continue
            message["receive_count"] += 1
            message["visible_at"] = time + self._visibility_timeout_ms
            return public_view(message)
        return None

    def ack(self, message_id):
        for index, message in enumerate(self._messages):
            if message["id"] == message_id:
                del self._messages[index]
                return True
        return False

    def dead_letters(self):
        return list(self._dead)


def public_view(message):
    return {"id": message["id"], "body": message["body"], "receive_count": message["receive_count"]}


class IdempotentConsumer:
    def __init__(self, handler):
        self._handler = handler
        self._processed = set()

    def handle(self, message):
        if message["id"] in self._processed:
            return False
        self._handler(message["body"])
        self._processed.add(message["id"])
        return True


if __name__ == "__main__":
    current_ms = 0
    queue = Queue(visibility_timeout_ms=30_000, max_receives=3, now=lambda: current_ms)
    charges = []
    consumer = IdempotentConsumer(charges.append)
    queue.send({"order_id": 42})
    first = queue.receive()
    consumer.handle(first)
    current_ms += 30_000
    again = queue.receive()
    print("redelivered:", again["id"], "receive_count:", again["receive_count"], "applied again:", consumer.handle(again))
    print("acked:", queue.ack(again["id"]), "charged:", len(charges))
