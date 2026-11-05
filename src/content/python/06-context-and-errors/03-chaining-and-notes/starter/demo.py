import traceback

from main import ConfigError, annotate, load_config, reraise_hidden


@reraise_hidden
def setting(config: dict, key: str):
    return config[key]


def describe(error: BaseException) -> None:
    last_lines = traceback.format_exception(error)[-1 - len(getattr(error, "__notes__", [])):]
    print("  error:", "".join(last_lines).strip().replace("\n", " | "))
    print("  cause:", type(error.__cause__).__name__ if error.__cause__ else None)
    print("  context hidden:", error.__suppress_context__)


config = load_config('{"region": "eu", "retries": 3}')
print("loaded:", config)

for label, action in [
    ("broken JSON", lambda: load_config('{"region": "eu",\n "retries": }')),
    ("missing setting", lambda: setting(config, "broker_url")),
]:
    print(label)
    try:
        action()
    except ConfigError as error:
        describe(annotate(error, order_id=7, attempt=2))
