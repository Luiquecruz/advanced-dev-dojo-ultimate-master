import sys

import config
import main

print("handlers:", main.handlers())
print("level before:", main.current_level())
config.LEVEL = "debug"
print("level after config.LEVEL = 'debug':", main.current_level())
print("script block ran on import:", main.RAN_AS_SCRIPT)
print("registry cached:", "registry" in sys.modules)
