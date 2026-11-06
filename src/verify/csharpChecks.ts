/** An `Assert.ThrowsAsync` that is not awaited returns a task nobody observes, so the test passes even when nothing is thrown. */
const UNAWAITED_THROWS_ASYNC = /(?<!\bawait\s+)Assert\.ThrowsAsync\b/;

/** C# source with its line and block comments blanked out and string literals kept, so a commented `await` does not count. */
export const withoutComments = (code: string) => code.replace(/"(?:[^"\\\n]|\\.)*"|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (token) => (token.startsWith('"') ? token : ' '));

/** Whether a C# test file calls `Assert.ThrowsAsync` without `await` outside comments. */
export const unawaitedThrowsAsync = (tests: string) => UNAWAITED_THROWS_ASYNC.test(withoutComments(tests));
