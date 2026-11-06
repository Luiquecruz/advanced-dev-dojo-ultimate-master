# Arrays, Lists and Dictionaries

Programs rarely work on one value at a time: an order has several lines, a warehouse has many stock levels, a price list maps codes to prices. After this lesson you can keep many values in an array or a `List<T>`, look values up by a key in a `Dictionary<TKey,TValue>`, and group a few values together with a tuple. You will also know the three exceptions these containers throw most often and how to avoid each one.

You need: 00/01 (values and variables), 00/02 (methods), 00/03 (loops and a first `int[]`) and 00/04 (strings and `out`).

## Arrays: a fixed row of values

An array holds a fixed number of values of one type. You met `int[]` in 00/03; any type works, such as `string[]` or `decimal[]`. Positions, called **indexes**, start at 0, so the last index is `Length - 1`.

```csharp
int[] levels = [5, 0, 12, 3];  // four ints
string[] names = new string[3]; // three slots, each starting as null
decimal[] prices = new decimal[2]; // two slots, each starting as 0

levels[1] = 7;                 // write the second value
int last = levels[levels.Length - 1]; // 3
// int oops = levels[4];       // throws IndexOutOfRangeException
```

An array never grows or shrinks. Reading or writing outside `0` to `Length - 1` stops the program with an `IndexOutOfRangeException`.

## `List<T>`: a row that grows

When you do not know in advance how many values there will be, use `List<T>`. Read `List<string>` as "a list of strings": the type inside the angle brackets is the type of every item. The `T` in `List<T>` is a placeholder that you fill in; 02/04 explains how such generic types work.

```csharp
List<string> skus = ["MUG", "PEN"];
skus.Add("CAP");              // ["MUG", "PEN", "CAP"]
skus.Insert(0, "BAG");        // ["BAG", "MUG", "PEN", "CAP"]
skus.Remove("PEN");           // removes the first "PEN"
int count = skus.Count;       // 3: a list has Count, an array has Length
bool hasMug = skus.Contains("MUG"); // true
string first = skus[0];       // "BAG"; the same index rules as an array

foreach (string sku in skus)
{
    Console.WriteLine(sku);
}
```

`new List<string>()` creates an empty list too. Indexes outside `0` to `Count - 1` throw an `ArgumentOutOfRangeException`.

## Collection expressions

The square brackets `[ ... ]` are a **collection expression** (C# 12 and later). The same syntax fills an array or a list, because the type on the left decides what is built. `[]` is an empty collection, and `..` copies the items of another collection into the new one.

```csharp
int[] small = [1, 2];
List<int> more = [..small, 3, 4]; // [1, 2, 3, 4]
List<string> none = [];
```

## `Dictionary<TKey,TValue>`: find a value by its key

A dictionary stores **key and value pairs**. `Dictionary<string, decimal>` maps a `string` key to a `decimal` value, such as a SKU to its price. Each key appears once, and finding a value by key stays fast however many pairs there are.

```csharp
var prices = new Dictionary<string, decimal>
{
    ["MUG"] = 9.50m,
    ["PEN"] = 1.25m,
};

prices["CAP"] = 12m;          // adds a new pair
prices["MUG"] = 8.75m;        // replaces the value of an existing key
decimal pen = prices["PEN"];  // 1.25m
// decimal x = prices["BAG"]; // throws KeyNotFoundException
// prices.Add("MUG", 1m);     // throws ArgumentException: the key exists

if (prices.TryGetValue("BAG", out decimal bag))
{
    Console.WriteLine(bag);
}
else
{
    Console.WriteLine("no price for BAG");
}
```

`ContainsKey(key)` answers "is this key there?". `TryGetValue` answers it and hands you the value in the same call, through `out`, the same "second result" as `int.TryParse` in 00/04. When it returns `false`, the `out` variable holds the type's default value (`0` for numbers).

Looping over a dictionary gives you each pair. You can read `pair.Key` and `pair.Value`, or split the pair into two variables directly:

```csharp
foreach (var (sku, price) in prices)
{
    Console.WriteLine($"{sku}: {price}");
}
```

Do not rely on the order of that loop; 03/01 explains why.

## Tuples: a few values together

Sometimes you want to pass or return two or three values that belong together, without writing a class for them (classes are next, in 00/06). A **tuple** groups them, and you can name each element.

```csharp
(string Sku, int Quantity) line = ("MUG", 2);
Console.WriteLine(line.Sku);  // MUG

(string Sku, int Quantity)[] order = [("MUG", 2), ("PEN", 10)];

foreach (var (sku, quantity) in order) // deconstruction
{
    Console.WriteLine($"{quantity} x {sku}");
}

static (int Smallest, int Largest) Range(int[] values)
{
    int smallest = values[0];
    int largest = values[0];
    foreach (int value in values)
    {
        if (value < smallest) smallest = value;
        if (value > largest) largest = value;
    }
    return (smallest, largest);
}

var (low, high) = Range([4, 9, 1]); // low is 1, high is 9
```

Splitting a tuple into separate variables, as in `var (low, high) = ...`, is called **deconstruction**.

## Common mistakes

- **Looping with `i <= values.Length`.** The last pass reads `values[values.Length]`, one past the end, and throws `IndexOutOfRangeException`. Loop while `i < values.Length`, or use `foreach` when you do not need the index.
- **Reading a key that may be missing with the indexer.** `prices[sku]` and `counts[word]++` throw `KeyNotFoundException` the first time a key is not in the dictionary. Use `TryGetValue`, and write back with `counts[word] = seen + 1`.
- **Removing items from a list inside `foreach` over that same list.** The next step of the loop throws `InvalidOperationException` ("Collection was modified"). Collect what to remove in a second list first, or loop over a copy.

## In practice

- Use an array when the size is fixed and known, and when a method hands you one: `string.Split` returns a `string[]`.
- Use `List<T>` as the default container for "some items in order" that may grow.
- Use `Dictionary<TKey,TValue>` whenever you would otherwise search a list again and again for one item by a name, code or id.
- Use a tuple for a small, short-lived group of values, such as a method that returns two results. When the group has a meaning of its own and travels through the program, give it a class (00/06) or a record (02/03).

## Check yourself

1. An array has `Length` 5. Which indexes are valid, and what happens when code reads index 5?
2. Why does `counts[word]++` crash on the first word, and how do you write it with `TryGetValue`?
3. When would you return a tuple from a method instead of a `List<T>`?
