from functools import partial
from operator import itemgetter

from main import LOOKUPS, Pipeline, Report, exchange_rate, render

clean = Pipeline(str.strip, partial(str.split, sep=","))
first_name = clean.then(itemgetter(0)).then(str.title)
print("clean:", clean("  ada,linus \n"), "| first name:", first_name(" ada,linus "))

print("render:", render([1, True, [2, "x"], 3.5]))

for currency in ["USD", "EUR", "USD", "GBP", "EUR"]:
    exchange_rate(currency)
print("lookups:", LOOKUPS, "|", exchange_rate.cache_info())

report = Report([120.0, 80.5, 99.5])
print("total:", report.total, report.total, "| computed", report.computations, "time(s)")
