1. Read what each function must give back: a number, three values, or text.
2. `apply_discount`: set the default in the parameter list, then write the discount as one expression that stays in whole cents.
3. Check `apply_discount` by hand with 999 cents: 10 per cent of it, rounded down, is 99 cents.
4. `stats`: handle the empty list first with an early `return`, then compute the mean and return the three values in the order lowest, mean, highest.
5. `bounds`: reuse `stats` instead of computing the minimum and maximum again, handle the empty list before unpacking, and build the text from the unpacked values.
6. Run the demo: it prints what your functions return, so a `None` on the screen points to a missing `return`.
