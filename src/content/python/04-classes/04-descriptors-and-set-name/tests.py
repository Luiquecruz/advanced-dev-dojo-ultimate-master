def make_product_class():
    class Product:
        price = mod.Positive()
        weight = mod.Positive()

        def __init__(self, price, weight):
            self.price = price
            self.weight = weight

    return Product


@test("Positive keeps a separate value per instance and returns itself on class access")
async def _():
    Product = make_product_class()
    cheap = Product(3, 1)
    dear = Product(50, 2)
    assert cheap.price == 3
    assert dear.price == 50
    assert cheap.weight == 1
    descriptor = Product.price
    assert isinstance(descriptor, mod.Positive)
    error = await capture_error(lambda: Product(0, 1))
    assert isinstance(error, ValueError)


@test("LazyAttribute computes once per instance and assignment replaces the cached value")
def _():
    calls = []

    class Report:
        def __init__(self, rows):
            self.rows = rows

        @mod.LazyAttribute
        def total(self):
            calls.append(1)
            return sum(self.rows)

    first = Report([1, 2, 3])
    assert first.total == 6
    assert first.total == 6
    assert len(calls) == 1
    assert "total" in vars(first)
    first.total = 99
    assert first.total == 99
    second = Report([10])
    assert second.total == 10
    assert len(calls) == 2
    assert isinstance(Report.total, mod.LazyAttribute)


@test("Field error messages name the attribute that failed")
async def _():
    class Order(mod.Model):
        quantity = mod.Field(1, 100)
        discount = mod.Field(0, 50)

    on_create = await capture_error(lambda: Order(quantity=0, discount=10))
    assert isinstance(on_create, ValueError)
    assert "quantity" in str(on_create)
    order = Order(quantity=100, discount=0)
    on_write = await capture_error(lambda: setattr(order, "discount", 70))
    assert isinstance(on_write, ValueError)
    assert "discount" in str(on_write)
    assert order.discount == 0


@test("fields lists names in definition order and every model keeps its own list")
def _():
    class Customer(mod.Model):
        name_length = mod.Field(1, 80)
        age = mod.Field(18, 130)

    class Invoice(mod.Model):
        total = mod.Field(0)
        lines = mod.Field(1, 500)
        currency_digits = mod.Field(0, 4)

    class TaxedInvoice(Invoice):
        tax_rate = mod.Field(0, 30)

    customer_fields = Customer.fields()
    invoice_fields = Invoice.fields()
    taxed_fields = TaxedInvoice.fields()
    base_fields = mod.Model.fields()
    assert customer_fields == ["name_length", "age"]
    assert invoice_fields == ["total", "lines", "currency_digits"]
    assert taxed_fields == ["total", "lines", "currency_digits", "tax_rate"]
    assert base_fields == []


@test("two Model instances keep independent field values")
def _():
    class Order(mod.Model):
        quantity = mod.Field(1, 100)

    small = Order(quantity=2)
    large = Order(quantity=90)
    assert small.quantity == 2
    assert large.quantity == 90
    assert vars(small) == {"quantity": 2}
