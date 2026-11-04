import io

from main import find_first, parse_pairs, read_chunks

upload = io.BytesIO(b"PNG header, then pixels, then the end")
chunks = read_chunks(upload.read, 16)
print("chunks:", chunks)

config = """
# service settings
host = db.internal
port = 5432
timeout
= missing key
port = 6432
"""
settings = parse_pairs(config.splitlines())
print("settings:", settings)

ports = [80, 443, 5432, 6432]
print("first port above 1024:", find_first(ports, lambda port: port > 1024))
print("first port above 9000:", find_first(ports, lambda port: port > 9000))
