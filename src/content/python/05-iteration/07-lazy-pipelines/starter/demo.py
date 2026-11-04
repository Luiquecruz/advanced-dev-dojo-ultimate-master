from main import Source, pipeline

log = [
    "INFO service started\n",
    "ERROR payment declined for order 17\n",
    "DEBUG cache warm\n",
    "ERROR timeout calling billing\n",
    "\n",
    "WARNING slow query on orders\n",
    "ERROR payment declined for order 23\n",
    "INFO 1200 requests served\n",
    "ERROR lost connection to db-2\n",
]

source = Source(log)
chunks = pipeline(source, size=2)
print("built the pipeline, lines read:", source.reads)
for chunk in chunks:
    print("paging:", [record["message"] for record in chunk])
    print("lines read so far:", source.reads, "| source closed:", source.closed)
    break
chunks.close()
print("after close(): source closed:", source.closed)

everything = Source(log)
print("all chunks:", [len(chunk) for chunk in pipeline(everything, size=3)], "| closed:", everything.closed)

broken = Source(["ERROR disk full\n", "oops\n", "ERROR never reached\n"])
try:
    for chunk in pipeline(broken, size=5):
        print("paging:", chunk)
except ValueError as error:
    print("stopped:", error, "| lines read:", broken.reads, "| closed:", broken.closed)
