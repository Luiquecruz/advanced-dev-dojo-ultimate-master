import io
import sys


class DeployFailed(Exception):
    pass


@test("temporary_env yields the new value and restores the mapping after the block")
def _():
    settings = {"MODE": "prod"}
    with mod.temporary_env(settings, "MODE", "test") as yielded:
        inside = settings["MODE"]
    restored = dict(settings)
    with mod.temporary_env(settings, "REGION", "eu"):
        added = settings.get("REGION")
    after_absent = dict(settings)
    assert yielded == "test"
    assert inside == "test"
    assert restored == {"MODE": "prod"}
    assert added == "eu"
    assert after_absent == {"MODE": "prod"}


@test("temporary_env restores the mapping when the block raises, and the exception propagates")
def _():
    settings = {"MODE": "prod"}
    error = None
    try:
        with mod.temporary_env(settings, "MODE", "test"):
            with mod.temporary_env(settings, "DEBUG", "1"):
                raise DeployFailed("migration failed")
    except DeployFailed as caught:
        error = caught
    assert isinstance(error, DeployFailed)
    assert settings == {"MODE": "prod"}


@test("captured_output yields a StringIO that receives prints and puts sys.stdout back, also after an exception")
def _():
    before = sys.stdout
    with mod.captured_output() as buffer:
        print("report ready")
    text = buffer.getvalue()
    after_success = sys.stdout
    error = None
    try:
        with mod.captured_output():
            raise DeployFailed("printer jammed")
    except DeployFailed as caught:
        error = caught
    after_error = sys.stdout
    assert isinstance(buffer, io.StringIO)
    assert text == "report ready\n"
    assert after_success is before
    assert isinstance(error, DeployFailed)
    assert after_error is before


@test("nested sections log enter and exit in stack order, also when the inner block raises")
def _():
    log = []
    with mod.section(log, "deploy"):
        with mod.section(log, "migrate"):
            log.append("work")
    error = None
    try:
        with mod.section(log, "outer"):
            with mod.section(log, "inner"):
                raise DeployFailed("disk full")
    except DeployFailed as caught:
        error = caught
    assert isinstance(error, DeployFailed)
    assert log == [
        "enter:deploy", "enter:migrate", "work", "exit:migrate", "exit:deploy",
        "enter:outer", "enter:inner", "exit:inner", "exit:outer",
    ]


@test("a section also works as a decorator and wraps every call")
def _():
    log = []

    @mod.section(log, "job")
    def job(number):
        log.append(f"run {number}")
        return number * 2

    first = job(1)
    second = job(2)
    assert first == 2
    assert second == 4
    assert log == ["enter:job", "run 1", "exit:job", "enter:job", "run 2", "exit:job"]
