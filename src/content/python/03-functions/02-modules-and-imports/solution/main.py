import config
import registry

RAN_AS_SCRIPT = False


def current_level() -> str:
    return config.LEVEL


def handlers() -> list[str]:
    return [function.__name__ for function in registry.HANDLERS]


def run_as_script() -> str:
    return f"{len(handlers())} handlers at level {current_level()}"


if __name__ == "__main__":
    RAN_AS_SCRIPT = True
    print(run_as_script())
