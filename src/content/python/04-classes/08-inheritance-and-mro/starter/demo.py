from main import AuditMixin, Order, TimestampMixin, linearize

print("Order MRO:", " -> ".join(linearize(Order)))
print("Order.save:", Order().save([]))

Invoice = type("Invoice", (TimestampMixin, AuditMixin), {})
print("Invoice MRO:", " -> ".join(linearize(Invoice)))
print("Invoice.save:", Invoice().save([]))
