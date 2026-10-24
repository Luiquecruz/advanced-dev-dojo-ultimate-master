1. Create a token for the configurable part (the user id).
2. Write the root service: a `user` signal plus an async `load()` that reads the token and fetches the user.
3. Package the configuration in `provideSession(userId)`: a value provider for the token and an app initializer that returns the `load()` Promise.
4. Wrap both in `makeEnvironmentProviders()` so the bundle can only be used at the environment level.
5. Add `provideSession(3)` to `appConfig.providers` and render the name in `Welcome`.
