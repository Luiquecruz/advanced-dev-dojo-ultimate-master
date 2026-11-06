# Packages and Modules

Once a program has more than a handful of classes, you need a way to group them, hide the ones that are internal and say where the compiler and the JVM should look for them. Packages group classes, access modifiers decide who can see what, the classpath tells Java where compiled code lives, and the module system adds a stronger boundary on top. This lesson covers all four and how a real project lays them out.

You need: Classes and Objects (`private`, `static`), Records, Enums and Sealed Types, Interfaces and Generics (interfaces and public API).

## Packages and imports

A package is a namespace. The first line of a source file names it, and the file lives in a folder with the same path. By convention, package names are lower case and start with a reversed domain name you control:

```java
package com.example.library.catalog;

public record Book(String title, int year) { }
```

This file is `com/example/library/catalog/Book.java`. The full name of the class is `com.example.library.catalog.Book`. To use it from another package, import it or write the full name:

```java
package com.example.library.app;

import com.example.library.catalog.Book;
import com.example.library.catalog.Shelf;
```

Classes in `java.lang`, such as `String` and `Math`, are imported automatically. `import com.example.library.catalog.*;` imports every public type of the package, but explicit imports show what a file depends on and avoid clashes between two types with the same simple name. An import is only a naming shortcut; it does not load anything.

## Access modifiers across packages

Java has four access levels:

| Modifier | Same class | Same package | Subclass elsewhere | Everywhere |
| --- | --- | --- | --- | --- |
| `private` | yes | no | no | no |
| none (package-private) | yes | yes | no | no |
| `protected` | yes | yes | yes | no |
| `public` | yes | yes | yes | yes |

A class without a modifier is visible only inside its own package, which makes it an implementation detail:

```java
public class Shelf {
    private final Book[] books = new Book[1];
    int version = 1;                  // package-private
    protected String label = "main";  // package and subclasses

    public void put(Book book) { books[0] = book; }
    public Book first() { return books[0]; }
}
```

From `com.example.library.app`, `shelf.version` fails with `version is not public in Shelf; cannot be accessed from outside package`, and `shelf.label` fails with `label has protected access in Shelf`. Only the `public` methods are the supported surface. Keep the public surface small: everything public becomes a commitment that other code can depend on.

## The classpath

The compiler and the JVM find classes through the classpath: a list of folders and `.jar` files. With the layout above you compile and run like this:

```bash
javac --release 25 -d out $(find src -name '*.java')
java -cp out com.example.library.app.Main
```

`-d out` puts the compiled classes in package folders under `out`, `-cp out` tells the JVM to look there, and the last argument is the fully qualified name of the class with `main`. A runnable `.jar` is a zip of the same folder structure. Build tools such as Maven manage the classpath for you by resolving dependencies and adding their jars. Two jars that contain the same class name can shadow each other, and the first on the classpath wins, which is a common source of confusing errors.

## Modules and module-info.java

The Java Platform Module System (JPMS) groups packages into a named module and states what it exposes. A `module-info.java` file at the root of the source folder declares it:

```java
module com.example.library {
    exports com.example.library.catalog;
}
```

Only the exported packages are visible to other modules; a `public` class in a package that is not exported stays hidden. A module lists the modules it needs with `requires`, such as `requires java.sql;`; `java.base`, which holds `java.lang` and `java.util`, is always available. The same code runs on the module path:

```bash
javac --release 25 -d out $(find src -name '*.java')
java --module-path out --module com.example.library/com.example.library.app.Main
```

The JDK itself is split into modules, and `java --list-modules` prints them. Most applications, including most Spring Boot applications, still run on the classpath without a `module-info.java`; their jars are treated as one unnamed module and everything public is reachable. Add a `module-info.java` when you publish a library that must hide internals strongly, or when a tool requires it.

## A project's package layout

Two common layouts are by layer (`controller`, `service`, `repository`) and by feature (`catalog`, `loans`, `members`). Grouping by feature keeps related code together and lets you make most classes package-private. Whatever you choose, put the entry point in a package that sits above the others, keep tests in a parallel folder with the same package names, and avoid cycles where package A imports B and B imports A.

## Common mistakes

- Making every class and method `public`. Other packages then depend on details you wanted to change, and the compiler cannot help you keep them private.
- Assuming a `protected` member is visible to every class in other packages. Outside the package it is available only to subclasses.
- Running `java Main` from the wrong folder, or forgetting `-cp`, and getting `ClassNotFoundException` or `Could not find or load main class`. Give the fully qualified name and a correct classpath.
- Adding a `module-info.java` to an application that depends on libraries that are not modules, then fighting access errors without a need for strong encapsulation.

## In practice

Start with one package per feature, keep classes package-private until another package needs them, and let the build tool own the classpath. Reach for modules only when you ship a library that must hide its internals.

## Check yourself

1. Which classes can see a package-private field, and which can see a `protected` one?
2. What does `-cp out` tell the JVM, and what does a fully qualified class name give `java`?
3. Why can a `public` class still be invisible to another module?
