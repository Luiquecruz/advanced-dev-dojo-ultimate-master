import asyncio

from main import fetch_all, fetch_settled, first_done


def service(name: str, delay: float, error: Exception | None = None):
    async def call() -> str:
        await asyncio.sleep(delay)
        if error is not None:
            raise error
        return f"{name} ok"

    return call


async def replica(name: str, delay: float) -> str:
    try:
        await asyncio.sleep(delay)
        return name
    finally:
        print(f"  {name} stopped")


async def main() -> None:
    print("all:", await fetch_all([service("users", 0.03), service("prices", 0.01)]))
    values, errors = await fetch_settled([service("users", 0.01), service("stock", 0.02, TimeoutError("stock timed out"))])
    print("settled:", values, [repr(error) for error in errors])
    print("race:")
    winner = await first_done([replica("eu-west", 0.04), replica("us-east", 0.01), replica("ap-south", 0.05)])
    print("  winner:", winner)


if __name__ == "__main__":
    asyncio.run(main())
