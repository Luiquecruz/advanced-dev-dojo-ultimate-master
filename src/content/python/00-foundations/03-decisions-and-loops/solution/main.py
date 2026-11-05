def shipping_cost(total_cents):
    if total_cents < 2000:
        return 595
    elif total_cents < 5000:
        return 395
    elif total_cents < 10000:
        return 195
    else:
        return 0


def fizzbuzz(n):
    results = []
    for number in range(1, n + 1):
        if number % 15 == 0:
            results.append("FizzBuzz")
        elif number % 3 == 0:
            results.append("Fizz")
        elif number % 5 == 0:
            results.append("Buzz")
        else:
            results.append(str(number))
    return results


def first_index(items, target):
    for index, item in enumerate(items):
        if item == target:
            return index
    return None


def running_max(numbers):
    results = []
    largest = 0
    for index, number in enumerate(numbers):
        if index == 0 or number > largest:
            largest = number
        results.append(largest)
    return results


def pair_up(names, scores):
    pairs = []
    for name, score in zip(names, scores):
        pairs.append(f"{name}: {score}")
    return pairs
