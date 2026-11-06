class Queue:
    def __init__(self, *, visibility_timeout_ms, max_receives, now):
        self._visibility_timeout_ms = visibility_timeout_ms
        self._max_receives = max_receives
        self._now = now
        self._messages = []
        self._next_id = 1

    def send(self, body):
        message_id = f"m{self._next_id}"
        self._next_id += 1
        self._messages.append({"id": message_id, "body": body, "receive_count": 0})
        return message_id

    def receive(self):
        # TODO: keep the message in the queue, hide it until now() + visibility_timeout_ms and count the receive
        # TODO: move a message already received max_receives times to the dead letters instead of delivering it
        if not self._messages:
            return None
        message = self._messages.pop(0)
        return {**message, "receive_count": 1}

    def ack(self, message_id):
        # TODO: delete the message for good and report whether it was still in the queue
        return any(message["id"] == message_id for message in self._messages)

    def dead_letters(self):
        # TODO: return the messages moved to the dead letters, in the order they were moved
        return []


class IdempotentConsumer:
    def __init__(self, handler):
        self._handler = handler

    def handle(self, message):
        # TODO: run the handler only once per message id, and only record the id when the handler succeeds
        self._handler(message["body"])
        return True


if __name__ == "__main__":
    current_ms = 0
    queue = Queue(visibility_timeout_ms=30_000, max_receives=3, now=lambda: current_ms)
    charges = []
    consumer = IdempotentConsumer(charges.append)
    queue.send({"order_id": 42})
    first = queue.receive()
    if first is not None:
        consumer.handle(first)
    current_ms += 30_000
    again = queue.receive()
    if again is None:
        print("redelivered: nothing", "charged:", len(charges))
    else:
        print("redelivered:", again["id"], "receive_count:", again["receive_count"], "applied again:", consumer.handle(again))
        print("acked:", queue.ack(again["id"]), "charged:", len(charges))
