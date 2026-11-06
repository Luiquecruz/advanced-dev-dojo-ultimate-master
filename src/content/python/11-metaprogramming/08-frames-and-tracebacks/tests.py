class ConfigError(Exception):
    pass


class StartupError(Exception):
    pass


class ChargeError(Exception):
    pass


@test("caller_name names the function that called the current one, and skip walks further out")
def _():
    def audit():
        return mod.caller_name()

    def checkout():
        return audit()

    class Cart:
        def total(self):
            return audit()

    def log_event():
        return mod.caller_name(skip=1)

    def record():
        return log_event()

    def handle_request():
        return record()

    direct = checkout()
    from_method = Cart().total()
    from_lambda = (lambda: audit())()
    skipped = handle_request()
    assert direct == "checkout"
    assert from_method == "total"
    assert from_lambda == "<lambda>"
    assert skipped == "handle_request"


@test("caller_name raises ValueError for a negative skip and for a stack that is not deep enough")
def _():
    def probe(skip):
        return mod.caller_name(skip=skip)

    raised = []
    for skip in (-1, 100_000):
        try:
            probe(skip)
        except ValueError:
            raised.append(skip)
    assert raised == [-1, 100_000]


@test("call_path lists the most recent calls outermost first, ending with the caller of call_path")
def _():
    def outer():
        return middle()

    def middle():
        return inner()

    def inner():
        return mod.call_path(3)

    def single():
        return mod.call_path(1)

    path = outer()
    last = single()
    assert path == ["outer", "middle", "inner"]
    assert last == ["single"]


@test("raised_in names the function that raised the error, not the one that caught it")
def _():
    def parse(text):
        return int(text)

    def load_settings():
        return parse("not a number")

    def lookup():
        raise LookupError("sku-42")

    def find_price():
        try:
            lookup()
        except LookupError:
            raise

    try:
        load_settings()
    except ValueError as error:
        parsed = mod.raised_in(error)
    try:
        find_price()
    except LookupError as error:
        reraised = mod.raised_in(error)
    never_raised = mod.raised_in(KeyError("never raised"))
    assert parsed == "parse"
    assert reraised == "lookup"
    assert never_raised is None


# beginner mistake: following only __cause__, which loses every exception linked implicitly through __context__
@test("exception_chain follows implicit contexts as well as explicit causes, root cause first")
def _():
    def read_config():
        try:
            {}["database_url"]
        except KeyError:
            raise ConfigError("database_url is missing")

    def start():
        try:
            read_config()
        except ConfigError as error:
            raise StartupError("cannot start the service") from error

    try:
        start()
    except StartupError as error:
        chain = mod.exception_chain(error)
    assert chain == ["KeyError", "tests.ConfigError", "tests.StartupError"]


@test("exception_chain stops at a suppressed context, prefers the cause and survives a cycle")
def _():
    try:
        try:
            int("not a card number")
        except ValueError:
            raise ChargeError("card declined") from None
    except ChargeError as error:
        suppressed = mod.exception_chain(error)
    try:
        try:
            [][0]
        except IndexError:
            raise ChargeError("retry failed") from TimeoutError("gateway")
    except ChargeError as error:
        preferred = mod.exception_chain(error)
    first, second = ConfigError("first"), StartupError("second")
    first.__cause__ = second
    second.__cause__ = first
    looped = mod.exception_chain(first)
    assert suppressed == ["tests.ChargeError"]
    assert preferred == ["TimeoutError", "tests.ChargeError"]
    assert looped == ["tests.StartupError", "tests.ConfigError"]
