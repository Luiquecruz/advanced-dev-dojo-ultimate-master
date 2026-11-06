from main import format_cents, kind_of, line_total, print_receipt, split_evenly

print_receipt("mug", 1250, 3)
print_receipt("notebook", 399, 2)

share, remainder = split_evenly(1000, 3)
print("three friends share 10.00 EUR:", share, "cents each,", remainder, "left over")
print("line total of 4 pens at 0.85 EUR:", format_cents(line_total(85, 4)))
print("kinds:", kind_of(3), kind_of(2.5), kind_of("3"))
