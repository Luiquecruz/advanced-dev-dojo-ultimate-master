Work in stages: clean the path (`path.split(/[?#]/)[0]`, then `decodeURIComponent`), check for traversal, resolve it to a file key, then build the response. Decoding must happen before the traversal check, or `%2e%2e` slips through.
---
`decodedPath.split('/').includes('..')` detects traversal. For resolution, strip the leading `/`: an empty string or a trailing `/` means "append `index.html`"; a key that is missing but has `<key>/index.html` in the files is a folder.
---
Extract the extension from the last segment (`lastIndexOf('.')`) and look it up in `CONTENT_TYPES` with `?? 'application/octet-stream'`. For caching, check HTML first, then a regex such as `/\.[0-9a-f]{6,}\.[a-z0-9]+$/i` for fingerprinted names.
