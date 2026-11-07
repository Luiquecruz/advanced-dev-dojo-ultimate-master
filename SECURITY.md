# Security policy

## Supported versions

Only the current `main` branch and the site deployed from it are supported. There are no releases or older versions to patch.

## Reporting a vulnerability

Report it privately. Do not open a public issue.

Use **Security → Report a vulnerability** on this repository (GitHub private vulnerability reporting). If that button is not available, open an issue titled "Security contact request" that says nothing about the problem: a maintainer replies there to agree on a private channel. Include in the private report:

- what an attacker can do, and against whom: another learner, the site, the repository or its CI;
- the steps or a proof of concept, and the browser or Node.js version you used.

You get a first answer within 7 days. A fix is published on `main` once it is ready, and the report is disclosed after that, with credit if you want it.

## What is in scope

Constela Mission runs learners' code in the browser, so the isolation of that code matters most:

- escaping the sandbox iframe or the Python worker (`src/sandbox/`, `src/engines/python/lockdown.ts`), or bypassing the worker Content-Security-Policy;
- making one learner's code or progress reach another learner;
- the build and deploy pipeline: getting untested code onto the live site, or reaching a credential from a pull request.

Running your own code in your own browser is the product, not a vulnerability. The same goes for the fake credentials in lessons: the hooks lesson redacts secrets and the JWT lesson uses the jwt.io sample token, so both need realistic-looking keys.

How the pipeline is protected is described in [`.claude/docs/CI_SECURITY.md`](.claude/docs/CI_SECURITY.md).
