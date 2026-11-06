from main import depth, make_multiplier, sort_by_length, total

products = ["lamp", "mug", "notebook", "pen", "desk"]
print("shortest names first:", sort_by_length(products))
print("original order kept:", products)

double = make_multiplier(2)
triple = make_multiplier(3)
print("double 21:", double(21), "| triple 21:", triple(21))

print("basket:", total(250, 1000, 399))
print("one item in dollars:", total(199, currency="USD"))
print("empty basket:", total())

shelves = ["mug", ["pen", ["ink", "nib"]], "lamp"]
print("levels of nesting:", depth(shelves))
