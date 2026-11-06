# Collections

Arrays have a fixed size, so real programs mostly use the collections framework in `java.util`: lists that grow, sets without duplicates and maps from keys to values. This lesson covers `List`, `Set` and `Map` with their usual implementations, immutable collections, the `Map` methods that remove common loops, the `equals` and `hashCode` contract, sorting with `Comparator`, and the difference between a copy and an unmodifiable view.

You need: Strings and Arrays, Classes and Objects (`equals` and `hashCode`), Interfaces and Generics (interfaces, generics, lambdas).

## List

A `List` keeps elements in order and allows duplicates. Declare variables with the interface and create the implementation with `new`; `ArrayList` is the default choice:

```java
List<String> names = new ArrayList<>();
names.add("Grace");
names.add("Ada");
names.add(1, "Alan");               // [Grace, Alan, Ada]
String first = names.get(0);        // Grace
boolean found = names.contains("Ada");
names.remove("Ada");

for (String name : names) {
    System.out.print(name + ";");   // Grace;Alan;
}
```

`size()` gives the count. `LinkedList` exists, but `ArrayList` is faster for almost everything you will write.

## Immutable collections

`List.of`, `Set.of` and `Map.of` create collections that cannot change. Adding, removing or replacing throws `UnsupportedOperationException`, and `null` elements are rejected with a `NullPointerException`:

```java
List<String> fixed = List.of("a", "b");
fixed.add("c");          // UnsupportedOperationException
```

Use them for constants and for values you return that callers must not modify.

## Set

A `Set` holds no duplicates. `add` returns `false` when the element is already there:

```java
Set<String> tags = new HashSet<>();
tags.add("java");        // true
tags.add("java");        // false, size stays 1
```

`HashSet` is fastest and has no defined order. `LinkedHashSet` keeps insertion order, so `new LinkedHashSet<>(List.of("b", "a", "b"))` gives `[b, a]`. `TreeSet` keeps elements sorted: `[a, b, c]`.

## Map

A `Map` stores key-value pairs with unique keys. `get` returns `null` for a missing key, which is a common source of `NullPointerException`; the other methods avoid it:

```java
Map<String, Integer> stock = new HashMap<>();
stock.put("pen", 4);
stock.getOrDefault("ink", 0);                  // 0, nothing stored
stock.merge("pen", 1, Integer::sum);           // pen becomes 5
stock.merge("ink", 1, Integer::sum);           // ink is created with 1

Map<String, List<String>> byInitial = new TreeMap<>();
for (String word : List.of("apple", "avocado", "banana")) {
    byInitial.computeIfAbsent(word.substring(0, 1), key -> new ArrayList<>()).add(word);
}
// {a=[apple, avocado], b=[banana]}
```

`merge` combines the old and new value, and `computeIfAbsent` creates a value only when the key is missing. `Integer::sum` is a method reference, a short form of the lambda `(a, b) -> a + b`. To walk a map, iterate `entrySet()` and read `getKey()` and `getValue()`. `HashMap` has no guaranteed order; `TreeMap` sorts by key and `LinkedHashMap` keeps insertion order.

## equals and hashCode

Hash-based collections find an element by `hashCode()` first, then confirm with `equals`. If two objects are equal they must have the same hash code. A class `Bad` that overrides only `equals` breaks this:

```java
Set<Bad> set = new HashSet<>();
set.add(new Bad("x"));
set.contains(new Bad("x"));    // false, although equals returns true
```

The two objects land in different buckets, so `equals` is never asked. A record generates both methods from its components, so `Set<Book>` with `record Book(String title, int year)` behaves correctly. Also never mutate a field that feeds `hashCode` while the object sits in a hash collection.

## Sorting with Comparator

`list.sort` takes a `Comparator`, which you build from key extractors and chain with `thenComparing`:

```java
shelf.sort(Comparator.comparingInt(Book::year)
        .thenComparing(Book::title, Comparator.reverseOrder()));
```

Books sort by year, and equal years are ordered by title in reverse. `Collections.sort(list)` and `Collections.max(list)` use the natural order of types that implement `Comparable`, such as `String`.

## Copies versus views

```java
List<String> source = new ArrayList<>(List.of("x", "y"));
List<String> view = Collections.unmodifiableList(source);
List<String> copy = List.copyOf(source);
source.add("z");     // view is now [x, y, z], copy is still [x, y]
```

An unmodifiable view blocks changes through the view, but it reflects changes made to the source. `List.copyOf` takes a snapshot that nobody can change. Return a copy when callers must not see later changes.

## Common mistakes

- Removing elements from a list inside a `for-each` loop. The loop usually throws `ConcurrentModificationException`; use `list.removeIf(...)` or an explicit iterator.
- Calling `map.get(key)` and using the result directly. A missing key gives `null`; use `getOrDefault` or check first.
- Overriding `equals` without `hashCode`, so a `HashSet` or `HashMap` cannot find equal objects.
- Treating `Collections.unmodifiableList` as a snapshot. Later changes to the source show through.

## In practice

Declare variables as `List`, `Set` or `Map`, pick `ArrayList`, `HashSet` and `HashMap` unless you need order, and return immutable copies from methods that expose internal state. Prefer `merge` and `computeIfAbsent` over get-then-put code.

## Check yourself

1. Which `Set` implementation keeps insertion order, and which keeps sorted order?
2. Why can a `HashSet` fail to find an object that `equals` says is present?
3. How does `List.copyOf` differ from `Collections.unmodifiableList`?
