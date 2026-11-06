1. Separate the two pieces of state: the order of the pool never changes, and health is a set of names on the side. Marking a server up then puts it back at its original place for free.
2. Anchor the rotation on the position of the last server returned in the full pool, which stays valid even after that server goes down. "The next healthy server after the one I just used" stays fair when servers go down or come back; a counter modulo the number of healthy servers does not.
3. Search forward from that anchor, wrapping around, and skip every down server in a row, not just one.
4. Bound the search to one full lap of the pool, so a pool with no healthy server ends in an error instead of an endless loop; the same bound covers an empty pool.
5. Update the anchor only when a server is actually returned.
