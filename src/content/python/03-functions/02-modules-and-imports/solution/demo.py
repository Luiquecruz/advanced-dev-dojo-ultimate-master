import sys

import config
import main

print("handlers:", main.handlers())
print("level before:", main.current_level())
config.set_level("debug")
print("level after set_level:", main.current_level())
print("script block ran on import:", main.RAN_AS_SCRIPT)
print("registry cached:", "registry" in sys.modules)
