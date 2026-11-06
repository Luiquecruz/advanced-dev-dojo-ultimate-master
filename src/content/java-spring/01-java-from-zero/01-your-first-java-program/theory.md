# Your First Java Program

Java programs are written as text files, translated by a compiler into a compact intermediate form, and then run by the Java Virtual Machine (JVM). This lesson teaches only the vocabulary: what the JDK contains, what `javac` and `java` each do, and how to run a small program in three different ways.

You need: nothing. This is the first lesson of the track.

## The JDK and its two main tools

The Java Development Kit (JDK) is the download that contains everything needed to write and run Java: the compiler `javac`, the launcher `java`, the interactive tool `jshell` and the standard library. The track pins Java 25, so check your installation with:

```bash
java -version
javac -version
```

Both commands should report the same major version. If `javac` is missing, you have a runtime without the compiler, and you need the full JDK.

## A class with a main method

Every Java program lives inside a class, and the program starts at a method named `main`. Save this as `Greeter.java`:

```java
public class Greeter {
    public static void main(String[] args) {
        System.out.println("Hello, Java!");
    }
}
```

The pieces, one by one:

- `public class Greeter` declares a class. A public class must live in a file with the same name plus `.java`.
- `public static void main(String[] args)` is the entry point the JVM looks for. `static` means it belongs to the class itself, so no object is needed to start. `void` means it returns nothing. `args` holds the command-line arguments.
- `System.out.println` prints a line of text. Statements end with a semicolon and blocks use braces.

Java 25 also allows a shorter form of `main` for small programs, but the classic form above works everywhere and is what you will see in real projects.

## Compile, then run

Compiling and running are two separate steps:

```bash
javac Greeter.java
java Greeter
```

`javac` reads the source and writes `Greeter.class`, which contains bytecode. It also reports syntax and type errors before anything runs. `java Greeter` starts a JVM, loads the class named `Greeter` (note: no `.class` and no `.java`) and calls its `main`.

For a single file you can skip the visible compile step. Source-file mode compiles the named file and runs it immediately:

```bash
java Greeter.java
```

This is ideal for small programs and experiments. Larger projects use a build tool, covered later in the track.

## jshell for quick experiments

`jshell` is a read-evaluate-print loop. You type an expression and see its value at once, with no class and no `main`:

```text
jshell> 6 * 7
$1 ==> 42
jshell> "java".toUpperCase()
$2 ==> "JAVA"
```

Use it to check a small idea. Type `/exit` to leave.

## Common mistakes

- Running `java Greeter.class` or `java Greeter` before compiling. `java` needs either a compiled class name or a `.java` file; without `javac` first, `Greeter` is not found.
- Naming the file differently from the public class. A `public class Greeter` inside `greeter.java` fails to compile, and capitalization counts.
- Misspelling `main`, for example as `Main`. The class compiles, but the launcher finds no entry point. Without `static` the method is not the classic form either, although Java 25 can still start an instance `main`.
- Expecting `javac` to run the program. It only translates.

## In practice

Professional projects almost never call `javac` by hand; a build tool does it. You still need to know the two steps, because every error message you read says which step failed: a compiler error means the source is wrong, while an exception at startup means the compiled program ran and then failed.

## Check yourself

1. What does `javac` produce, and which tool consumes it?
2. Why can `java Greeter.java` run a file without a separate compile command, and what is it meant for?
3. Why does the classic form of `main` need `static`?
