import ast


def entity_save_calls():
    tree = ast.parse(source)
    calls = []
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        function = node.func
        if isinstance(function, ast.Attribute) and isinstance(function.value, ast.Name) and function.value.id == "Entity":
            calls.append(function.attr)
    return calls


def super_calls_with_arguments():
    tree = ast.parse(source)
    found = 0
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == "super" and node.args:
            found += 1
    return found


@test("Order.save runs every mixin once, in the order of its bases, and the base last")
def _():
    log = mod.Order().save([])
    assert log == ["Validation", "Audit", "Timestamp", "Entity"]
    entity_runs = log.count("Entity")
    assert entity_runs == 1


@test("linearize lists the class names of the method resolution order")
def _():
    order_names = mod.linearize(mod.Order)
    assert order_names == ["Order", "ValidationMixin", "AuditMixin", "TimestampMixin", "Entity", "object"]

    class Top:
        pass

    class Left(Top):
        pass

    class Right(Top):
        pass

    class Bottom(Left, Right):
        pass

    diamond = mod.linearize(Bottom)
    assert diamond == ["Bottom", "Left", "Right", "Top", "object"]


@test("each mixin hands over to the next class with zero-argument super()")
def _():
    for mixin, label in [(mod.ValidationMixin, "Validation"), (mod.AuditMixin, "Audit"), (mod.TimestampMixin, "Timestamp")]:
        alone = type("Alone", (mixin,), {})
        log = alone().save([])
        assert log == [label, "Entity"]
    direct_calls = entity_save_calls()
    assert direct_calls == []
    explicit_super = super_calls_with_arguments()
    assert explicit_super == 0


@test("another base order gives another save order without changing the mixins")
def _():
    invoice = type("Invoice", (mod.TimestampMixin, mod.AuditMixin), {})
    log = invoice().save([])
    assert log == ["Timestamp", "Audit", "Entity"]
    names = mod.linearize(invoice)
    assert names == ["Invoice", "TimestampMixin", "AuditMixin", "Entity", "object"]


@test("a class whose bases contradict the MRO cannot be created")
async def _():
    error = await capture_error(lambda: type("Broken", (mod.Entity, mod.AuditMixin), {}))
    assert isinstance(error, TypeError)
    assert "MRO" in str(error)
