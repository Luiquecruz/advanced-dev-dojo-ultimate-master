1. Write down what `import a.b` does: check `sys.modules`, import the parent `a` first, ask each finder on `sys.meta_path` for a spec, create the module, store it in `sys.modules`, execute it, bind `b` on `a`. Your code only has to answer the finder and loader steps.
2. Decide which names the dict serves: every key, plus every prefix of a dotted key, which is a package. Return `None` for the rest so imports you do not serve keep working.
3. Build the spec with the finder as loader and the right `is_package` flag; the machinery derives `__path__`, the parent and the module attributes from it.
4. Execute the source at load time, from the current mapping, so that `importlib.reload` (which finds a new spec and calls `exec_module` again on the same module object) sees changes.
5. Make installation reversible: insert at the front of `sys.meta_path`, and on uninstall remove the finder and only the modules whose spec points at it.
6. Check the failure modes from the tests: a missing name gives `ModuleNotFoundError`, a stdlib import still works while the finder is installed, and nothing is left in `sys.modules` after uninstall.
