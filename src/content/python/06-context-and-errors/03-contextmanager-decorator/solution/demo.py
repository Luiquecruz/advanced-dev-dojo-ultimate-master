from main import captured_output, section, temporary_env

settings = {"MODE": "prod"}
log: list[str] = []


@section(log, "deploy")
def deploy(version: str) -> str:
    with temporary_env(settings, "MODE", "maintenance"), temporary_env(settings, "VERSION", version):
        print("deploying", version, "with", settings)
    return f"deployed {version}"


with captured_output() as buffer:
    result = deploy("2.4.0")
print("captured:", buffer.getvalue().strip())
print("result:", result, "| settings after:", settings)

try:
    with section(log, "rollback"), temporary_env(settings, "MODE", "rollback"):
        raise RuntimeError("health check failed")
except RuntimeError as error:
    print("propagated:", error, "| settings after:", settings)
print("log:", log)
