@test("send returns m1, m2, ... and receive delivers visible messages in send order, hiding each one it delivers")
def _():
    time = 0
    queue = mod.Queue(visibility_timeout_ms=1_000, max_receives=5, now=lambda: time)
    first_id = queue.send("a")
    second_id = queue.send("b")
    assert first_id == "m1"
    assert second_id == "m2"
    first = queue.receive()
    second = queue.receive()
    hidden = queue.receive()
    assert first == {"id": "m1", "body": "a", "receive_count": 1}
    assert second == {"id": "m2", "body": "b", "receive_count": 1}
    assert hidden is None
    time = 1_000
    first_again = queue.receive()
    second_again = queue.receive()
    assert first_again == {"id": "m1", "body": "a", "receive_count": 2}
    assert second_again == {"id": "m2", "body": "b", "receive_count": 2}


# beginner mistake: assuming exactly-once delivery, so a crash before ack applies the effect twice (or the message is deleted on receive and lost)
@test("an un-acked message is delivered again after the visibility timeout and the idempotent consumer applies it once")
def _():
    time = 0
    queue = mod.Queue(visibility_timeout_ms=30_000, max_receives=5, now=lambda: time)
    charges = []
    consumer = mod.IdempotentConsumer(charges.append)
    queue.send({"order_id": 42})
    first = queue.receive()
    applied = consumer.handle(first)
    assert applied is True
    time = 29_999
    still_hidden = queue.receive()
    assert still_hidden is None
    time = 30_000
    again = queue.receive()
    assert again == {"id": first["id"], "body": {"order_id": 42}, "receive_count": 2}
    applied_again = consumer.handle(again)
    assert applied_again is False
    assert charges == [{"order_id": 42}]


@test("ack deletes a message for good and returns false when it is no longer in the queue")
def _():
    time = 0
    queue = mod.Queue(visibility_timeout_ms=100, max_receives=1, now=lambda: time)
    message_id = queue.send("job")
    queue.receive()
    acked = queue.ack(message_id)
    acked_twice = queue.ack(message_id)
    unknown = queue.ack("m99")
    assert acked is True
    assert acked_twice is False
    assert unknown is False
    time = 1_000
    after_timeout = queue.receive()
    dead = queue.dead_letters()
    assert after_timeout is None
    assert dead == []


@test("a message received the maximum number of times without an ack moves to the dead letters and the next message is delivered")
def _():
    time = 0
    queue = mod.Queue(visibility_timeout_ms=100, max_receives=2, now=lambda: time)
    queue.send("poison")
    first = queue.receive()
    assert first["receive_count"] == 1
    time = 100
    second = queue.receive()
    assert second["receive_count"] == 2
    queue.send("healthy")
    time = 200
    delivered = queue.receive()
    assert delivered == {"id": "m2", "body": "healthy", "receive_count": 1}
    dead = queue.dead_letters()
    assert dead == [{"id": "m1", "body": "poison", "receive_count": 2}]
    late_ack = queue.ack("m1")
    assert late_ack is False


@test("the idempotent consumer records an id only after the handler succeeds")
async def _():
    seen = []
    fail = True

    def handler(body):
        if fail:
            raise ConnectionError("database unavailable")
        seen.append(body)

    consumer = mod.IdempotentConsumer(handler)
    error = await capture_error(lambda: consumer.handle({"id": "m1", "body": "a"}))
    assert str(error) == "database unavailable"
    fail = False
    retried = consumer.handle({"id": "m1", "body": "a"})
    other = consumer.handle({"id": "m2", "body": "b"})
    duplicate = consumer.handle({"id": "m1", "body": "a"})
    assert retried is True
    assert other is True
    assert duplicate is False
    assert seen == ["a", "b"]
