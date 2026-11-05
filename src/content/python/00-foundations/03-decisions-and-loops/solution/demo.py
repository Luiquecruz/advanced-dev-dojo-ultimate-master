from main import first_index, fizzbuzz, pair_up, running_max, shipping_cost

for total in [1500, 2000, 4999, 7500, 10000]:
    print(f"order of {total} cents ships for {shipping_cost(total)} cents")

print("fizzbuzz(15):", fizzbuzz(15))
print("position of 'pen':", first_index(["mug", "pen", "pen"], "pen"))
print("position of 'lamp':", first_index(["mug", "pen"], "lamp"))
print("daily record:", running_max([12, 9, 15, 15, 11, 20]))
print("scores:", pair_up(["ana", "bo", "cy"], [7, 9]))
