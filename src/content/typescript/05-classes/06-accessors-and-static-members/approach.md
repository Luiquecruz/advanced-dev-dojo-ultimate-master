1. Declare the static constant and a private static counter.
2. Make the constructor `private`; inside, assign through the `celsius` setter and increment the counter.
3. Add the two static factories, converting Fahrenheit before calling `new Temperature(...)`.
4. Implement the `celsius` getter/setter pair with the absolute zero check in the setter.
5. Add the read-only `fahrenheit` getter and the `static get created()` accessor.
