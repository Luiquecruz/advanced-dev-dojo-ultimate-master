import clsx from 'clsx';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { LANGUAGES, type LanguageId, type Lesson, type ProjectFiles, type Track } from '@/content';
import { canRunProgram, CodeEditor, configureLanguageService, type ConsoleEntry, gradeChallenge, LanguageSwitch, LessonPanel, type LessonTab, PreviewFrame, type Report, runProgram, TestName, testNamesFor } from '@/features/lesson';
import { CurriculumDrawer } from '@/features/curriculum';
import { Markdown } from '@/shared/ui/Markdown';
import { codeKeyFor, isLessonComplete, progress, useProgress } from '@/entities/progress';
import { hrefTo } from '@/shared/routing/route';
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, CrossIcon, MenuIcon, PlayIcon, RefreshIcon, ResetIcon, TerminalIcon } from '@/shared/ui/icons';
import { useMediaQuery } from '@/shared/lib/useMediaQuery';
import { BrandMark } from '@/shared/ui/BrandMark';
import { COMPILE_ERROR_CLASS, SUCCESS_BADGE_CLASS, TEST_MESSAGE_CLASS, buttonClass, iconButtonClass } from '@/shared/ui/classNames';

type BottomTab = 'preview' | 'tests' | 'console';

const MAX_CONSOLE_ENTRIES = 200;

/**
 * Split view lesson: theory and challenge on the left, editor, preview, tests and console on the right.
 */
export function LessonPage({ track, lesson }: { track: Track; lesson: Lesson }) {
  const state = useProgress();
  const [language, setLanguage] = useState(() => initialLanguage(lesson, state.language[track.id]));
  const challenge = lesson.variants.find((variant) => variant.language === language) ?? lesson.challenge;
  const engine = challenge?.engine ?? track.engine;
  const codeKey = codeKeyFor(lesson.key, challenge?.language);
  const narrow = useMediaQuery('(width < 56.25rem)');
  const index = track.lessons.indexOf(lesson);
  const previous = track.lessons[index - 1];
  const next = track.lessons[index + 1];

  const [tab, setTab] = useState<LessonTab>(state.visited[lesson.key] && challenge ? 'challenge' : 'learn');
  const [files, setFiles] = useState<ProjectFiles>(() => state.code[codeKey] ?? challenge?.starter ?? {});
  const [activeFile, setActiveFile] = useState(challenge?.entry ?? '');
  const [report, setReport] = useState<Report | null>(null);
  const [running, setRunning] = useState(false);
  const [programRunning, setProgramRunning] = useState(false);
  const [bottomTab, setBottomTab] = useState<BottomTab>(challenge?.preview ? 'preview' : 'tests');
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [solutionOpen, setSolutionOpen] = useState(false);

  const testNames = useMemo(() => (challenge ? testNamesFor(engine, challenge) : []), [engine, challenge]);
  const fileNames = Object.keys(files).sort((a, b) => (a === challenge?.entry ? -1 : b === challenge?.entry ? 1 : a.localeCompare(b)));

  useEffect(() => {
    configureLanguageService(engine);
  }, [engine]);

  useEffect(() => {
    progress.visit(track.id, lesson.key);
  }, [track.id, lesson.key]);

  const updateFile = useCallback(
    (name: string, value: string) => {
      setFiles((current) => {
        const nextFiles = { ...current, [name]: value };
        progress.saveCode(codeKey, nextFiles);
        return nextFiles;
      });
    },
    [codeKey],
  );

  const appendConsole = useCallback((entry: ConsoleEntry) => {
    setConsoleEntries((current) => [...current.slice(-MAX_CONSOLE_ENTRIES + 1), entry]);
  }, []);

  const runTests = useCallback(async () => {
    if (!challenge || running) {
      return;
    }
    setRunning(true);
    setTab('challenge');
    if (!challenge.preview) {
      setBottomTab('tests');
    }
    try {
      const result = await gradeChallenge(engine, challenge, files);
      setReport(result);
      if (result.logs.length > 0) {
        setConsoleEntries(result.logs.map((text) => ({ level: text.startsWith('✖') ? 'error' : text.startsWith('⚠') ? 'warn' : 'log', text })));
      }
      if (result.passed) {
        progress.markChallenge(lesson.key, challenge.language);
      }
    } finally {
      setRunning(false);
    }
  }, [challenge, running, engine, files, lesson.key]);

  const runCode = useCallback(async () => {
    if (!canRunProgram(engine) || !challenge || programRunning) {
      return;
    }
    setBottomTab('console');
    setProgramRunning(true);
    const entries: ConsoleEntry[] = [];
    setConsoleEntries([]);
    try {
      await runProgram(engine, files, challenge.entry, (entry) => {
        entries.push(entry);
        appendConsole(entry);
      });
    } finally {
      setProgramRunning(false);
    }
    if (entries.length === 0) {
      setConsoleEntries([{ level: 'info', text: 'No output. Use console.log() to print values.' }]);
    }
  }, [engine, challenge, programRunning, files, appendConsole]);

  const resetCode = () => {
    if (!challenge || !confirm('Reset the editor to the starter code? Your changes for this lesson will be lost.')) {
      return;
    }
    progress.clearCode(codeKey);
    setFiles(challenge.starter);
    setReport(null);
    setReloadKey((key) => key + 1);
  };

  const loadSolution = () => {
    if (!challenge) {
      return;
    }
    setFiles(challenge.solution);
    progress.saveCode(codeKey, challenge.solution);
    setSolutionOpen(false);
  };

  const switchLanguage = (next: LanguageId) => {
    const variant = lesson.variants.find((entry) => entry.language === next);
    if (!variant || next === language) {
      return;
    }
    setLanguage(next);
    progress.chooseLanguage(track.id, next);
    setFiles(state.code[codeKeyFor(lesson.key, next)] ?? variant.starter);
    setActiveFile(variant.entry);
    setReport(null);
    setConsoleEntries([]);
    setReloadKey((key) => key + 1);
  };

  const languageOptions = lesson.variants.flatMap((variant) =>
    variant.language ? [{ id: variant.language, label: LANGUAGES[variant.language].label, passed: Boolean(state.challengeLanguages[lesson.key]?.[variant.language]) }] : [],
  );


  const workspace = challenge ? (
    <Group orientation="vertical" className="h-full">
      <Panel defaultSize="60" minSize="20">
        <div className="flex h-full flex-col bg-code">
          <div className="flex h-11.5 flex-none items-center justify-between gap-2 border-b border-line bg-elevated pr-2">
            <div className="flex h-full min-w-0 overflow-x-auto">
              {fileNames.map((name) => (
                <button
                  key={name}
                  className={clsx(
                    'cursor-pointer border-r border-line bg-transparent px-4 font-mono text-[13px] whitespace-nowrap',
                    name === activeFile ? 'bg-code text-ink shadow-[inset_0_2px_0_var(--accent)]' : 'text-ink-muted',
                  )}
                  onClick={() => setActiveFile(name)}
                >
                  {name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              {languageOptions.length > 1 && language && <LanguageSwitch options={languageOptions} value={language} onChange={switchLanguage} />}
              <button className={iconButtonClass()} title="Reset to starter code" onClick={resetCode}>
                <ResetIcon />
              </button>
              {canRunProgram(engine) && (
                <button className={buttonClass('ghost', 'regular', 'max-wide:hidden')} onClick={runCode} disabled={programRunning}>
                  <TerminalIcon /> {programRunning ? 'Running…' : 'Run'}
                </button>
              )}
              <button className={buttonClass('primary')} onClick={runTests} disabled={running}>
                <PlayIcon /> {running ? 'Running…' : 'Run tests'}
              </button>
            </div>
          </div>
          <CodeEditor
            modelPath={codeKey}
            fileName={activeFile}
            value={files[activeFile] ?? ''}
            onChange={(value) => updateFile(activeFile, value)}
            onRun={runTests}
          />
        </div>
      </Panel>
      <Separator className={SEPARATOR_CLASS.horizontal} />
      <Panel defaultSize="40" minSize="12">
        <div className="flex h-full flex-col bg-code">
          <div className="flex h-9.5 flex-none items-center gap-0.5 border-b border-line bg-elevated px-2">
            {challenge.preview && (
              <button className={bottomTabClass(bottomTab === 'preview')} onClick={() => setBottomTab('preview')}>
                Preview
              </button>
            )}
            <button className={bottomTabClass(bottomTab === 'tests')} onClick={() => setBottomTab('tests')}>
              Tests
              {report && (
                <span className={clsx(COUNT_CLASS, report.passed ? 'bg-success/12 text-success' : 'bg-danger/10 text-danger')}>
                  {report.tests.filter((test) => test.passed).length}/{testNames.length}
                </span>
              )}
            </button>
            <button className={bottomTabClass(bottomTab === 'console')} onClick={() => setBottomTab('console')}>
              Console {consoleEntries.length > 0 && <span className={clsx(COUNT_CLASS, 'bg-line')}>{consoleEntries.length}</span>}
            </button>
            <div className="ml-auto flex items-center">
              {bottomTab === 'preview' && (
                <button className={iconButtonClass()} title="Reload preview" onClick={() => setReloadKey((key) => key + 1)}>
                  <RefreshIcon />
                </button>
              )}
              {bottomTab === 'console' && consoleEntries.length > 0 && (
                <button className={buttonClass('ghost', 'small')} onClick={() => setConsoleEntries([])}>
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className="relative min-h-0 flex-1 overflow-auto">
            {challenge.preview && (
              <div className={clsx('absolute inset-0', bottomTab !== 'preview' && 'invisible pointer-events-none')} aria-hidden={bottomTab !== 'preview'}>
                <PreviewFrame engine={engine} files={files} entry={challenge.entry} reloadKey={reloadKey} onConsole={appendConsole} />
              </div>
            )}
            {bottomTab === 'tests' && <TestOutput report={report} running={running} testNames={testNames} />}
            {bottomTab === 'console' && (
              <div className="py-2 font-mono text-[12.5px]/[1.6]">
                {consoleEntries.length === 0 && <div className="px-3.5 py-2 text-ink-faint">Console output appears here.</div>}
                {consoleEntries.map((entry, entryIndex) => (
                  <div key={entryIndex} className={clsx('border-b border-line/60 px-3.5 py-0.5 whitespace-pre-wrap wrap-anywhere', CONSOLE_LEVEL_CLASS[entry.level])}>
                    {entry.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Panel>
    </Group>
  ) : (
    <div className="grid h-full place-items-center bg-void p-6 text-center text-ink-muted">
      <div>
        <h2 className="mb-1.5 text-2xl font-bold text-ink">Theory lesson</h2>
        <p>This lesson has no coding challenge. Read the theory and answer the quiz to complete it.</p>
      </div>
    </div>
  );

  return (
    <div data-trail={track.id} className="flex h-screen flex-col overflow-hidden bg-void">
      <header className="flex h-13 flex-none items-center gap-2.5 border-b border-line bg-elevated px-2.5">
        <button className={iconButtonClass()} title="Curriculum" onClick={() => setDrawerOpen(true)}>
          <MenuIcon />
        </button>
        <nav className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-sm whitespace-nowrap text-ink-muted">
          <a href={hrefTo({ page: 'home' })} className="flex items-center gap-2 font-semibold tracking-[-0.02em] text-ink max-wide:hidden">
            <BrandMark size={24} />
            Dev Dojo
          </a>
          <span className="max-wide:hidden">/</span>
          <a href={hrefTo({ page: 'track', trackId: track.id })} className="hover:text-ink">
            {track.title}
          </a>
          <span>/</span>
          <span className="truncate text-ink">{lesson.title}</span>
        </nav>
        <div className="flex items-center gap-1">
          {isLessonComplete(state, lesson) && (
            <span className={SUCCESS_BADGE_CLASS}>
              <CheckIcon /> Done
            </span>
          )}
          <span className="mx-1.5 font-mono text-xs text-ink-faint max-wide:hidden">
            {index + 1} / {track.lessons.length}
          </span>
          <a className={iconButtonClass(!previous)} title="Previous lesson" href={previous ? hrefTo({ page: 'lesson', trackId: track.id, lessonId: previous.id }) : undefined}>
            <ChevronLeftIcon />
          </a>
          <a className={iconButtonClass(!next)} title="Next lesson" href={next ? hrefTo({ page: 'lesson', trackId: track.id, lessonId: next.id }) : undefined}>
            <ChevronRightIcon />
          </a>
        </div>
      </header>

      <main className="min-h-0 flex-1">
        <Group orientation={narrow ? 'vertical' : 'horizontal'} className="h-full">
          <Panel defaultSize={narrow ? '50' : '40'} minSize="20">
            <LessonPanel
              key={lesson.key}
              track={track}
              lesson={lesson}
              challenge={challenge}
              tab={tab}
              onTabChange={setTab}
              testNames={testNames}
              report={report}
              running={running}
              onRevealSolution={() => setSolutionOpen(true)}
              nextLesson={next}
            />
          </Panel>
          <Separator className={narrow ? SEPARATOR_CLASS.horizontal : SEPARATOR_CLASS.vertical} />
          <Panel defaultSize={narrow ? '50' : '60'} minSize="25">
            {workspace}
          </Panel>
        </Group>
      </main>

      {drawerOpen && <CurriculumDrawer track={track} currentKey={lesson.key} onClose={() => setDrawerOpen(false)} />}
      {solutionOpen && challenge && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[rgb(3_6_12/0.6)] p-6 backdrop-blur-[2px]" onClick={() => setSolutionOpen(false)}>
          <div
            className="flex max-h-[88vh] w-[min(820px,100%)] flex-col rounded-[14px] border border-line-strong bg-panel shadow-float"
            role="dialog"
            aria-modal="true"
            aria-label="Solution"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-center justify-between gap-2.5 px-4.5 py-3.5">
              <h2 className="m-0 text-lg font-semibold">Reference solution</h2>
              <button className={iconButtonClass()} onClick={() => setSolutionOpen(false)} title="Close">
                <CrossIcon />
              </button>
            </header>
            <p className="m-0 px-4.5 pb-3 text-sm text-ink-muted">Try the hints and the solution path first: you learn more by getting there yourself.</p>
            <div className="overflow-y-auto px-4.5">
              {Object.entries(challenge.solution).map(([name, code]) => (
                <div key={name}>
                  <div className="my-1.5 font-mono text-xs text-ink-muted">{name}</div>
                  <Markdown source={`\`\`\`${name.split('.').pop()}\n${code}\n\`\`\``} />
                </div>
              ))}
            </div>
            <footer className="flex items-center justify-end gap-2.5 border-t border-line px-4.5 py-3.5">
              <button className={buttonClass('ghost')} onClick={() => setSolutionOpen(false)}>
                Close
              </button>
              <button className={buttonClass('primary')} onClick={loadSolution}>
                Load into editor
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

function initialLanguage(lesson: Lesson, preferred: LanguageId | undefined): LanguageId | undefined {
  return lesson.variants.some((variant) => variant.language === preferred) ? preferred : lesson.challenge?.language;
}

const SEPARATOR_CLASS = {
  vertical: 'w-px bg-line transition-colors duration-(--dur-fast) hover:bg-accent data-[separator=active]:bg-accent',
  horizontal: 'h-px bg-line transition-colors duration-(--dur-fast) hover:bg-accent data-[separator=active]:bg-accent',
};

const COUNT_CLASS = 'rounded-full px-1.5 font-mono text-[11px]';

const CONSOLE_LEVEL_CLASS: Record<ConsoleEntry['level'], string> = {
  log: '',
  info: 'text-ink-muted',
  warn: 'bg-warning/6 text-warning',
  error: 'bg-danger/6 text-danger',
};

function bottomTabClass(active: boolean): string {
  return clsx('inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-transparent px-2.5 py-1.5 text-[13px] font-semibold', active ? 'bg-hover text-ink' : 'text-ink-muted');
}

function TestOutput({ report, running, testNames }: { report: Report | null; running: boolean; testNames: string[] }) {
  if (running) {
    return <div className="flex flex-col gap-1.5 p-3 text-sm text-ink-muted">Running {testNames.length} tests…</div>;
  }
  if (!report) {
    return <div className="flex flex-col gap-1.5 p-3 text-sm text-ink-muted">Run the tests to validate your code.</div>;
  }
  const passedCount = report.tests.filter((test) => test.passed).length;
  return (
    <div className="flex flex-col gap-1.5 p-3 text-sm">
      <div className={clsx('mb-1 font-bold', report.passed ? 'text-success' : 'text-danger')}>
        {report.passed ? 'All tests passed. Nice work!' : `${passedCount} of ${testNames.length} tests passed.`}
        {report.durationMs !== undefined && <span className="font-normal text-ink-muted"> · {report.durationMs} ms</span>}
      </div>
      {report.compileError && <pre className={COMPILE_ERROR_CLASS}>{report.compileError}</pre>}
      {report.tests.map((test, testIndex) => (
        <div key={testIndex} className={clsx('flex items-start gap-2.5 rounded-lg border bg-elevated px-3 py-2.25 text-sm', test.passed ? 'border-success/35' : 'border-danger/35')}>
          <span className={clsx('grid pt-0.75', test.passed ? 'text-success' : 'text-danger')}>
            {test.passed ? <CheckIcon role="img" aria-label="Passed" /> : <CrossIcon role="img" aria-label="Failed" />}
          </span>
          <div className="min-w-0 flex-1">
            <div>
              <TestName name={test.name} />
            </div>
            {!test.passed && test.message && <pre className={TEST_MESSAGE_CLASS}>{test.message}</pre>}
          </div>
        </div>
      ))}
    </div>
  );
}
