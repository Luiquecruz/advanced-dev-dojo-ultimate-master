1. Start from what the real system compares. The interpreter knows it runs in an environment because it found `pyvenv.cfg` and moved `sys.prefix`, so the detection is a comparison of the two prefixes, never a guess from a path name.
2. Model the shell's search as a loop over `PATH` in order, with an early return on the first hit. Keep `files` as a membership test: the order of the answer comes from `PATH`, not from where files happen to be.
3. Handle the special case before the loop: a name containing `/` is already a path, which is how `.venv/bin/python` works without activation.
4. Write the config reader line by line: strip, skip what `site` would never treat as a setting, split once at the first `=`, normalise the key, and convert only the one boolean key with the case-insensitive `true` rule.
5. Build the site-packages path from the platform first (backslashes and `Lib` on Windows), then from major and minor only, and check it against a two-digit minor version such as 3.10.
6. Run the demo and compare the computed directory with the `site-packages` entry on the real `sys.path` of the interpreter running it.
