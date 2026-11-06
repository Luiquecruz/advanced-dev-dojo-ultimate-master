# Project: Command-Line To-Do List

This closing project combines everything in the module into one small program: a to-do list you drive from the terminal, which remembers its tasks in a text file between runs. You build it locally with the JDK alone (use JDK 25, as pinned in the first lesson; no Maven or Gradle is needed), one feature at a time, and run it with `java Todo.java`.

You need: Your First Java Program, Values, Types and Variables, Decisions and Loops, Methods, Strings and Arrays, Classes and Objects, Exceptions and Your First Test.

## Goal

Build a single-file program, `Todo.java`, that reads a command and its arguments from the command line, changes a list of tasks and saves the list to `tasks.txt` so the next run sees it. Work in a new empty folder so the data file is easy to inspect and delete.

## Features

- `add "Buy milk"` appends a new, not-yet-done task.
- `list` prints every task with its number, a done marker and its title.
- `done 2` marks task number 2 as completed.
- Tasks persist in `tasks.txt`, one per line, in the form `[ ] title` or `[x] title`.
- No command, an unknown command or a bad task number prints a short usage message instead of a stack trace.

## Acceptance criteria

1. After `add "Buy milk"` and `add "Write tests"`, `list` shows `1. [ ] Buy milk` and `2. [ ] Write tests`.
2. After `done 1`, `list` shows `1. [x] Buy milk`, and the change survives a new run of the program.
3. `done 9` with only two tasks, and `done 0`, report that the task does not exist and leave the file unchanged.
4. `done abc` reports that the number is not valid.
5. Running with no file present behaves like an empty list.
6. A title that contains spaces is stored and shown intact.

## Suggested steps

1. Model a task as a record so equality and printing come for free: `record Task(String title, boolean done) { }`. Declare it nested inside the `Todo` class, because the launcher runs the first top-level class in the file. A record's fields cannot be reassigned, so completing a task means creating a replacement `Task` with `done` set to `true`.
2. Keep tasks in an array with a separate count, or copy into a larger array with `Arrays.copyOf` when it is full. Wrap this in a small method such as `add`.
3. Write `main` as a `switch` expression or statement on `args[0]`, after a guard clause that handles `args.length == 0`.
4. Write `load` and `save` methods that use `java.nio.file.Files`. `Files.exists`, `Files.readAllLines` and `Files.write` cover the file work; both reading and writing throw `IOException`.
5. Parse a stored line with `startsWith("[x] ")` and `substring(4)`, and format a line with `String.format` or concatenation.
6. Convert the task number with `Integer.parseInt` inside `try`/`catch (NumberFormatException)`, then check that it is between 1 and the count before using it as an index (remember the list shows numbers from 1 while arrays start at 0).
7. Catch `IOException` once in `main`, print a clear message and stop.

```java
static Task[] load(Path file) throws IOException {
    if (!Files.exists(file)) {
        return new Task[0];
    }
    List<String> lines = Files.readAllLines(file);
    Task[] tasks = new Task[lines.size()];
    for (int index = 0; index < tasks.length; index++) {
        String line = lines.get(index);
        tasks[index] = new Task(line.substring(4), line.startsWith("[x] "));
    }
    return tasks;
}
```

`List` is the type `readAllLines` returns; here you only call `size()` and `get(index)` on it.

## Stretch goals

- Add `remove 2` and keep the numbering consistent afterward.
- Add `list open` to show only unfinished tasks.
- Write a JUnit test for the parsing method, as in the previous lesson, by moving the logic into a class of its own.
- Reject empty titles with an `IllegalArgumentException`.

## Common mistakes

- Using the displayed number directly as an array index. The list starts at 1 and arrays start at 0, so `done 1` must change index 0.
- Comparing the command with `==` instead of `equals`, or with a `switch` that lacks a `default` for unknown commands.
- Forgetting to call `save` after a change, so the next run starts from the old file.
- Assuming the arguments array has elements. `args[0]` throws `ArrayIndexOutOfBoundsException` when no command is given.

## In practice

Real command-line tools follow the same shape: parse arguments, load state, apply one change, save state, report the result. Keeping those steps in separate small methods is what later lets you test the logic without touching the file system.

## Check yourself

1. Why does completing a task create a new `Task` instead of changing the old one?
2. What does a guard clause on `args.length` protect against?
3. Where should `IOException` be handled, and why not in every method?
