1. Name the daily totals first: requests per day, then writes per day as a fraction of them. Every other number is derived from these two, which keeps the conversion from "per day" to "per second" in one place.
2. Convert with 86,400 seconds per day. On a whiteboard you may round it to 100,000 to divide in your head; in code, use the exact constant so the result is reproducible.
3. Apply the peak factor before rounding: rounding is the last step of each value, so errors never compound across steps.
4. Storage grows with every multiplier that keeps a copy: bytes per write, days kept and replicas. Write the product as a chain so a missing factor is visible.
5. For the formatter, divide by 1,000 per unit step and stop at the last unit, then round once for display.
