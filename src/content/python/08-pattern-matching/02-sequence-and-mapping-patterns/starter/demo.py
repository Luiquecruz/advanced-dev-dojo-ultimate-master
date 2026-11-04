from main import handle_event, parse_command

for line in ["move 3 -4", "say hello from Python", "quit", "quit now", "move 1"]:
    try:
        print(f"{line!r:26} -> {parse_command(line.split())}")
    except ValueError as error:
        print(f"{line!r:26} -> rejected: {error}")

events = [
    {"type": "click", "pos": [120, 48], "button": "left", "time": 12.5},
    {"type": "key", "key": "Escape"},
    {"type": "resize", "size": {"width": 1280, "height": 720, "dpr": 2}},
    {"type": "click"},
]
for event in events:
    try:
        print("event:", handle_event(event))
    except ValueError as error:
        print("event rejected:", error)
