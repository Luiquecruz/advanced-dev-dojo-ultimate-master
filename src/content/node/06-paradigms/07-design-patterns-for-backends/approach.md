1. Read `LegacyPayClient` to list every mismatch with `PaymentGateway`: callbacks instead of promises, decimal strings instead of cents, uppercase currency, `approved` instead of a status.
2. Resolve each mismatch inside `LegacyPayAdapter.charge`, so nothing about the SDK leaks out. Reject with the SDK error as is.
3. Write each decorator as a function returning a new object with the same interface. Delegate to the wrapped gateway and add exactly one behavior.
4. In `withLogging`, keep the outcome intact: return the same result, rethrow the same error. A decorator must never change the contract.
5. In the factory, choose the base implementation and throw on unknown providers, then stack decorators from the inside out. The last wrapper applied is the first to run, so logging goes last to observe limit rejections.
