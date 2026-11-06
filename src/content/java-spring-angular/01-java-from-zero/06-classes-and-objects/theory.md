# Classes and Objects

A class is a blueprint that groups data with the operations on that data, and an object is one instance built from it. This lesson covers fields, constructors, `this`, encapsulation with `private`, instance versus `static` members, `toString`, `equals` and `hashCode` at a high level, and records as the short form for plain data.

You need: Values, Types and Variables (primitive versus reference), Methods (parameters and return values), Strings and Arrays (`String.format` and `equals`).

## Fields, constructors and this

Fields hold the state of each object. A constructor has the class name, no return type, and runs when you write `new`. Inside it, `this` refers to the object being built, which separates a field from a parameter with the same name:

```java
public class Account {
    private final String owner;
    private int balance;

    public Account(String owner, int balance) {
        if (balance < 0) {
            throw new IllegalArgumentException("balance must not be negative");
        }
        this.owner = owner;
        this.balance = balance;
    }
}
```

Fields that you do not set start as `0`, `false` or `null`. A `final` field must be assigned in every constructor.

## Encapsulation

Marking fields `private` means only the class itself can touch them. Other code goes through methods, which can enforce rules:

```java
public void deposit(int amount) {
    if (amount <= 0) {
        throw new IllegalArgumentException("amount must be positive");
    }
    balance += amount;
}

public int getBalance() {
    return balance;
}
```

Because the constructor validates the starting balance and `deposit` is the only other way to change it, no code outside the class can put the object into an invalid state. This is the main reason to hide fields.

## Instance versus static

Instance members belong to one object; `static` members belong to the class and exist once:

```java
private static int created = 0;

public static int createdCount() {
    return created;
}
```

A static method has no `this`, so it cannot read instance fields directly. `main` is static for exactly that reason: it runs before any object exists.

## toString, equals and hashCode

Every class inherits methods from `Object`. The default `toString` prints a hard-to-read identity, and the default `equals` is the same as `==`. Override them when objects have meaningful content:

```java
@Override
public String toString() {
    return owner + ": " + balance;
}
```

If you override `equals`, you must override `hashCode` so that equal objects produce equal hash codes; collections such as hash-based sets depend on that rule. Writing both correctly by hand is repetitive, which is one reason records exist.

## Records

A record declares a class of plain data in one line. The compiler generates the constructor, accessor methods named after the components, `toString`, `equals` and `hashCode`:

```java
public record Point(int x, int y) { }

Point first = new Point(1, 2);
System.out.println(first.x());                       // 1
System.out.println(first.equals(new Point(1, 2)));   // true
System.out.println(first);                           // Point[x=1, y=2]
```

A record's fields are final and cannot be reassigned. Module 02 goes deeper.

## Common mistakes

- Declaring a constructor parameter with the same name as a field but forgetting `this.`, as in `owner = owner;`. This assigns the parameter to itself. A non-final field stays `null`, and a `final` field makes the compiler report it as not initialized.
- Making every field `public`. Any code can then set an invalid value and the class cannot protect itself.
- Overriding `equals` without `hashCode`, which breaks hash-based collections.
- Reading an instance field from a `static` method; there is no object to read it from.

## In practice

Keep fields private, expose behavior rather than raw data, and give objects a readable `toString` for logs. Use a record for plain data whose fields do not change and a class when an object has behavior or changing state.

## Check yourself

1. What does `this.owner = owner;` do, and what happens without `this`?
2. Why can `main` not read an instance field directly?
3. Which methods does a record generate for you?
