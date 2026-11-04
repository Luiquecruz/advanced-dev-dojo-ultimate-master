from main import Basket, Quota, coalesce, first_truthy

for basket in (Basket(), Basket(["book"])):
    print("basket with", len(basket), "items is", "truthy" if basket else "falsy")

for quota in (Quota(3, 2), Quota(3, 3)):
    print(f"quota {quota.used}/{quota.limit}:", "has capacity" if quota else "exhausted")

settings = {"retries": 0, "label": "", "timeout": None}
print("retries:", coalesce(settings["timeout"], settings["retries"], 3))
print("label:", repr(coalesce(settings["timeout"], settings["label"], "none")))
print("first truthy:", first_truthy(0, "", [], "ready"))
print("fallback:", first_truthy(0, "", default="empty"))
