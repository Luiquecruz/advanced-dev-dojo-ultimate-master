import asyncio

from main import handle_failures


async def resize(image: str) -> str:
    if image.endswith(".gif"):
        raise ValueError(f"{image}: unsupported format")
    if image.startswith("remote/"):
        raise ConnectionError(f"{image}: storage unreachable")
    try:
        await asyncio.sleep(0.02)
        return f"{image} -> 256px"
    except asyncio.CancelledError:
        print(f"  cancelled {image}")
        raise


async def main() -> None:
    print("clean batch:", await handle_failures(["a.png", "b.jpg"], resize))
    print("failing batch:")
    print("  report:", await handle_failures(["a.png", "logo.gif", "remote/c.png", "d.png"], resize))


if __name__ == "__main__":
    asyncio.run(main())
