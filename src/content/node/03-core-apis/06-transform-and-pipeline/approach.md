1. Give each transform one responsibility and the right mode: text to lines (`readableObjectMode`), lines to records (`objectMode`), records to text (`writableObjectMode`).
2. Every `transform` call must end with exactly one `callback`, in every branch, or the stream stalls.
3. Buffering logic lives in closure variables (`rest`, `header`, `lineNumber`) created per stream instance, so two pipelines never share state.
4. `flush` handles what is still buffered when the input ends; without it the last line is lost when the file has no trailing newline.
5. Fail with `callback(error)` instead of throwing: `pipeline` destroys every stream and rejects with that error.
6. Treat partial output as a failure mode: on rejection remove the destination (or write to a temp file and rename on success), then rethrow so the caller still sees the cause.
