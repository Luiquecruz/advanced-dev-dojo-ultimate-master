# Interfaces and Generics

An interface describes what a type can do without saying how, so code can depend on the contract instead of one implementation. Generics let a class or method work with many types while the compiler still checks them. This lesson covers interfaces, default and static methods, inheritance with `extends`, a first look at lambdas, generic classes and methods, bounds, wildcards and what type erasure means in practice.

You need: Methods, Classes and Objects (constructors, `static`), Records, Enums and Sealed Types (record syntax).

## Interfaces and polymorphism

An interface lists method signatures. A class that `implements` it must provide every one:

```java
interface Discount {
    int apply(int priceCents);

    default String describe() {
        return "discount";
    }

    static Discount none() {
        return price -> price;
    }
}

record PercentOff(int percent) implements Discount {
    public int apply(int priceCents) {
        return priceCents - priceCents * percent / 100;
    }

    @Override
    public String describe() {
        return percent + "% off";
    }
}

record FixedOff(int cents) implements Discount {
    public int apply(int priceCents) {
        return Math.max(0, priceCents - cents);
    }
}
```

Interface methods are `public` automatically, so implementations must be declared `public`. A `default` method has a body that implementers inherit and may override with `@Override`. A `static` method belongs to the interface and is called as `Discount.none()`.

Code can now accept the interface and work with any implementation. This is polymorphism: the method that runs is chosen by the actual object at run time.

```java
static int checkout(int priceCents, Discount discount) {
    return discount.apply(priceCents);
}
```

`checkout(2000, new PercentOff(10))` returns 1800 and `checkout(2000, new FixedOff(500))` returns 1500. `checkout` never changes when a new discount type is added.

## extends and implements

A class can implement many interfaces but extend only one class. An interface can extend other interfaces. Use `extends` on a class when it is a true specialization and shares code, and an interface when you only need a contract:

```java
abstract class Animal {
    abstract String sound();

    String speak() {
        return "says " + sound();
    }
}

class Dog extends Animal {
    String sound() {
        return "woof";
    }
}
```

An `abstract` class cannot be instantiated and may leave methods without a body for subclasses to fill in. Prefer interfaces and composition first; a class hierarchy ties subclasses to the parent's internals.

## Lambdas for single-method interfaces

An interface with exactly one abstract method is a functional interface. A lambda expression is a compact way to create one:

```java
Discount half = price -> price / 2;
```

The compiler reads the target type, `Discount`, and treats the lambda as its `apply` method. `Discount.none()` above returns `price -> price`. Later lessons use lambdas with collections and streams.

## Generic classes and methods

A type parameter in angle brackets stands for a type chosen by the caller:

```java
class Box<T> {
    private final T value;

    Box(T value) {
        this.value = value;
    }

    T get() {
        return value;
    }
}

Box<String> name = new Box<>("Ada");
String text = name.get();
```

The compiler knows `name.get()` is a `String`, so no cast is needed, and `new Box<>(...)` infers the argument. Type arguments must be reference types: write `Box<Integer>`, not `Box<int>`. Java converts between `int` and `Integer` automatically (boxing).

A method can declare its own parameter before the return type:

```java
static <T> T firstNonNull(T first, T second) {
    return first != null ? first : second;
}
```

## Bounds and wildcards

A bound restricts what a type parameter can be, which lets the method use the bound's methods:

```java
static <T extends Comparable<T>> T larger(T first, T second) {
    return first.compareTo(second) >= 0 ? first : second;
}
```

`larger("pear", "apple")` returns `pear` and `larger(3, 7)` returns `7`, because `String` and `Integer` implement `Comparable`.

`Box<Integer>` is not a `Box<Number>`, even though `Integer` is a `Number`. A wildcard says "some type that extends `Number`":

```java
static double doubled(Box<? extends Number> box) {
    return box.get().doubleValue() * 2;
}
```

Use `? extends T` when you only read values out, and `? super T` when you only put values in.

## Type erasure

Generic types exist only at compile time. At run time `Box<String>` and `Box<Integer>` are both plain `Box`, so `name.getClass() == count.getClass()` is `true`. The consequences are compile errors you will meet: `new T()` and `o instanceof Box<String>` are rejected, and two overloads that differ only in the type argument, such as `f(Box<String>)` and `f(Box<Integer>)`, fail with a "same erasure" error.

## Common mistakes

- Expecting `Box<Integer>` to be accepted where `Box<Number>` is required. Generic types are not covariant; use `Box<? extends Number>`.
- Forgetting `public` on an implementing method. Interface methods are public, and a weaker access level is a compile error.
- Using `Box<int>`. Type arguments cannot be primitives; use the wrapper type.
- Reaching for `extends` to reuse a few lines of code. Prefer an interface plus a helper object, so the types are not welded together.

## In practice

Declare variables and parameters with the interface type and construct the concrete class in one place. Keep interfaces small, and lean on generic methods and bounds instead of casts. When the compiler reports a generics error, read the type arguments on both sides before changing anything.

## Check yourself

1. What does it mean that the method called through an interface variable is chosen at run time?
2. Why is `Box<Integer>` not a `Box<Number>`, and what does `Box<? extends Number>` allow instead?
3. What does type erasure make impossible at run time?
