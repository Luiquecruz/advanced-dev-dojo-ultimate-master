# Dev Dojo

A freeCodeCamp-style learning platform for front-end development: theory, hands-on challenges validated by automated tests, progressive hints, a solution path, reference solutions and quizzes. Everything runs in the browser, with no backend.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run test       # unit and architecture tests
npm run verify     # validates every lesson (solution passes, starter fails, structure, curriculum)
```

## Documentation

All project documentation lives in [`.claude/docs/`](.claude/docs):

| Document | Read it to |
| --- | --- |
| [ARCHITECTURE.md](.claude/docs/ARCHITECTURE.md) | understand the frontend layers, state, engines and sandbox, and add a track, an engine or a UI feature |
| [CONTENT_GUIDE.md](.claude/docs/CONTENT_GUIDE.md) | write a lesson: file format, test globals per engine, fake API, installed library versions |
| [CURRICULUM.md](.claude/docs/CURRICULUM.md) | see every track, its modules and which lessons are written |

Guidance for AI agents is in [`.claude/CLAUDE.md`](.claude/CLAUDE.md).
