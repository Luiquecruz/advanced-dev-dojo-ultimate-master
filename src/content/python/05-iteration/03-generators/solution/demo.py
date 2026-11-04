from main import id_sequence, read_blocks, take

config = """
[orders]
host=db-1
port=5432


[billing]
host=db-2
""".splitlines()

for block_id, block in zip(id_sequence("cfg"), read_blocks(config)):
    print(block_id, block)

print("next invoices:", list(take(3, id_sequence("INV"))))


def noisy_records():
    for number in range(1, 6):
        print("  reading record", number)
        yield {"id": number}


print("taken:", list(take(2, noisy_records())))
