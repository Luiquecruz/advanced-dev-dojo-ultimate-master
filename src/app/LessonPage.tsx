import { useCallback, useEffect, useMemo, useState } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import type { Lesson, ProjectFiles, Track } from '../content';
import { CodeEditor } from './CodeEditor';
import { CurriculumDrawer } from './CurriculumDrawer';
import { LessonPanel, type LessonTab } from './LessonPanel';
import { Markdown } from './Markdown';
import { TestName } from './TestName';
import { PreviewFrame, type ConsoleEntry } from './PreviewFrame';
import { configureLanguageService } from './monacoSetup';
import { isLessonComplete, progress, useProgress } from './progress';
import { gradeChallenge, runTypeScript, testNamesFor, type Report } from './runner';
import { hrefTo } from './route';
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, CrossIcon, MenuIcon, PlayIcon, RefreshIcon, ResetIcon, TerminalIcon } from './icons';
import { useMediaQuery } from './useMediaQuery';

type BottomTab = 'preview' | 'tests' | 'console';

const MAX_CONSOLE_ENTRIES = 200;

/**
 * Split view lesson: theory and challenge on the left, editor, preview, tests and console on the right.
 */
export function LessonPage({ track, lesson }: { track: Track; lesson: Lesson }) {
  const state = useProgress();
  const challenge = lesson.challenge;
  const narrow = useMediaQuery('(max-width: 900px)');
  const index = track.lessons.indexOf(lesson);
  const previous = track.lessons[index - 1];
  const next = track.lessons[index + 1];

  const [tab, setTab] = useState<LessonTab>(state.visited[lesson.key] && challenge ? 'challenge' : 'learn');
  const [files, setFiles] = useState<ProjectFiles>(() => state.code[lesson.key] ?? challenge?.starter ?? {});
  const [activeFile, setActiveFile] = useState(challenge?.entry ?? '');
  const [report, setReport] = useState<Report | null>(null);
  const [running, setRunning] = useState(false);
  const [bottomTab, setBottomTab] = useState<BottomTab>(challenge?.preview ? 'preview' : 'tests');
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [solutionOpen, setSolutionOpen] = useState(false);

  const testNames = useMemo(() => (challenge ? testNamesFor(track.engine, challenge) : []), [track.engine, challenge]);
  const fileNames = Object.keys(files).sort((a, b) => (a === challenge?.entry ? -1 : b === challenge?.entry ? 1 : a.localeCompare(b)));

  useEffect(() => {
    configureLanguageService(track.engine);
    progress.visit(track.id, lesson.key);
  }, [track.id, track.engine, lesson.key]);

  const updateFile = useCallback(
    (name: string, value: string) => {
      setFiles((current) => {
        const nextFiles = { ...current, [name]: value };
        progress.saveCode(lesson.key, nextFiles);
        return nextFiles;
      });
    },
    [lesson.key],
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
      const result = await gradeChallenge(track.engine, challenge, files);
      setReport(result);
      if (result.logs.length > 0) {
        setConsoleEntries(result.logs.map((text) => ({ level: text.startsWith('✖') ? 'error' : text.startsWith('⚠') ? 'warn' : 'log', text })));
      }
      if (result.passed) {
        progress.markChallenge(lesson.key);
      }
    } finally {
      setRunning(false);
    }
  }, [challenge, running, track.engine, files, lesson.key]);

  const runCode = useCallback(async () => {
    if (track.engine !== 'typescript' || !challenge) {
      return;
    }
    setBottomTab('console');
    const logs = await runTypeScript(files[challenge.entry]);
    setConsoleEntries(
      logs.length > 0
        ? logs.map((text) => ({ level: text.startsWith('✖') ? 'error' : text.startsWith('⚠') ? 'warn' : 'log', text }))
        : [{ level: 'info', text: 'No output. Use console.log() to print values.' }],
    );
  }, [track.engine, challenge, files]);

  const resetCode = () => {
    if (!challenge || !confirm('Reset the editor to the starter code? Your changes for this lesson will be lost.')) {
      return;
    }
    progress.clearCode(lesson.key);
    setFiles(challenge.starter);
    setReport(null);
    setReloadKey((key) => key + 1);
  };

  const loadSolution = () => {
    if (!challenge) {
      return;
    }
    setFiles(challenge.solution);
    progress.saveCode(lesson.key, challenge.solution);
    setSolutionOpen(false);
  };

  const workspace = challenge ? (
    <Group orientation="vertical" className="workspace">
      <Panel defaultSize="60" minSize="20">
        <div className="editor-pane">
          <div className="editor-toolbar">
            <div className="file-tabs">
              {fileNames.map((name) => (
                <button key={name} className={`file-tab ${name === activeFile ? 'active' : ''}`} onClick={() => setActiveFile(name)}>
                  {name}
                </button>
              ))}
            </div>
            <div className="toolbar-actions">
              <button className="icon-button" title="Reset to starter code" onClick={resetCode}>
                <ResetIcon />
              </button>
              {track.engine === 'typescript' && (
                <button className="button button-ghost" onClick={runCode}>
                  <TerminalIcon /> Run
                </button>
              )}
              <button className="button button-primary" onClick={runTests} disabled={running}>
                <PlayIcon /> {running ? 'Running…' : 'Run tests'}
              </button>
            </div>
          </div>
          <CodeEditor
            modelPath={lesson.key}
            fileName={activeFile}
            value={files[activeFile] ?? ''}
            onChange={(value) => updateFile(activeFile, value)}
            onRun={runTests}
          />
        </div>
      </Panel>
      <Separator className="separator separator-horizontal" />
      <Panel defaultSize="40" minSize="12">
        <div className="bottom-pane">
          <div className="bottom-tabs">
            {challenge.preview && (
              <button className={`bottom-tab ${bottomTab === 'preview' ? 'active' : ''}`} onClick={() => setBottomTab('preview')}>
                Preview
              </button>
            )}
            <button className={`bottom-tab ${bottomTab === 'tests' ? 'active' : ''}`} onClick={() => setBottomTab('tests')}>
              Tests
              {report && <span className={`count ${report.passed ? 'ok' : 'ko'}`}>{report.tests.filter((test) => test.passed).length}/{testNames.length}</span>}
            </button>
            <button className={`bottom-tab ${bottomTab === 'console' ? 'active' : ''}`} onClick={() => setBottomTab('console')}>
              Console {consoleEntries.length > 0 && <span className="count">{consoleEntries.length}</span>}
            </button>
            <div className="bottom-actions">
              {bottomTab === 'preview' && (
                <button className="icon-button" title="Reload preview" onClick={() => setReloadKey((key) => key + 1)}>
                  <RefreshIcon />
                </button>
              )}
              {bottomTab === 'console' && consoleEntries.length > 0 && (
                <button className="button button-ghost small" onClick={() => setConsoleEntries([])}>
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className="bottom-content">
            {challenge.preview && (
              <div hidden={bottomTab !== 'preview'} className="preview-host">
                <PreviewFrame engine={track.engine} files={files} entry={challenge.entry} reloadKey={reloadKey} onConsole={appendConsole} />
              </div>
            )}
            {bottomTab === 'tests' && <TestOutput report={report} running={running} testNames={testNames} />}
            {bottomTab === 'console' && (
              <div className="console">
                {consoleEntries.length === 0 && <div className="console-empty">Console output appears here.</div>}
                {consoleEntries.map((entry, entryIndex) => (
                  <div key={entryIndex} className={`console-line ${entry.level}`}>
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
    <div className="workspace-empty">
      <div>
        <h2>Theory lesson</h2>
        <p>This lesson has no coding challenge. Read the theory and answer the quiz to complete it.</p>
      </div>
    </div>
  );

  return (
    <div className="lesson-page" style={{ ['--accent' as string]: track.accent }}>
      <header className="topbar">
        <button className="icon-button" title="Curriculum" onClick={() => setDrawerOpen(true)}>
          <MenuIcon />
        </button>
        <nav className="breadcrumbs">
          <a href={hrefTo({ page: 'home' })} className="brand">
            Dev Dojo
          </a>
          <span>/</span>
          <a href={hrefTo({ page: 'track', trackId: track.id })}>{track.title}</a>
          <span>/</span>
          <span className="current">{lesson.title}</span>
        </nav>
        <div className="topbar-actions">
          {isLessonComplete(state, lesson) && (
            <span className="badge badge-success">
              <CheckIcon /> Done
            </span>
          )}
          <span className="lesson-counter">
            {index + 1} / {track.lessons.length}
          </span>
          <a className={`icon-button ${previous ? '' : 'disabled'}`} title="Previous lesson" href={previous ? hrefTo({ page: 'lesson', trackId: track.id, lessonId: previous.id }) : undefined}>
            <ChevronLeftIcon />
          </a>
          <a className={`icon-button ${next ? '' : 'disabled'}`} title="Next lesson" href={next ? hrefTo({ page: 'lesson', trackId: track.id, lessonId: next.id }) : undefined}>
            <ChevronRightIcon />
          </a>
        </div>
      </header>

      <Group orientation={narrow ? 'vertical' : 'horizontal'} className="lesson-layout">
        <Panel defaultSize={narrow ? '50' : '40'} minSize="20">
          <LessonPanel
            key={lesson.key}
            track={track}
            lesson={lesson}
            tab={tab}
            onTabChange={setTab}
            testNames={testNames}
            report={report}
            running={running}
            onRevealSolution={() => setSolutionOpen(true)}
            nextLesson={next}
          />
        </Panel>
        <Separator className={`separator ${narrow ? 'separator-horizontal' : 'separator-vertical'}`} />
        <Panel defaultSize={narrow ? '50' : '60'} minSize="25">
          {workspace}
        </Panel>
      </Group>

      {drawerOpen && <CurriculumDrawer track={track} currentKey={lesson.key} onClose={() => setDrawerOpen(false)} />}
      {solutionOpen && challenge && (
        <div className="modal-backdrop" onClick={() => setSolutionOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Solution" onClick={(event) => event.stopPropagation()}>
            <header>
              <h2>Reference solution</h2>
              <button className="icon-button" onClick={() => setSolutionOpen(false)} title="Close">
                <CrossIcon />
              </button>
            </header>
            <p className="modal-note">Try the hints and the solution path first: you learn more by getting there yourself.</p>
            <div className="modal-body">
              {Object.entries(challenge.solution).map(([name, code]) => (
                <div key={name}>
                  <div className="solution-file">{name}</div>
                  <Markdown source={`\`\`\`${name.split('.').pop()}\n${code}\n\`\`\``} />
                </div>
              ))}
            </div>
            <footer>
              <button className="button button-ghost" onClick={() => setSolutionOpen(false)}>
                Close
              </button>
              <button className="button button-primary" onClick={loadSolution}>
                Load into editor
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

function TestOutput({ report, running, testNames }: { report: Report | null; running: boolean; testNames: string[] }) {
  if (running) {
    return <div className="test-output muted">Running {testNames.length} tests…</div>;
  }
  if (!report) {
    return <div className="test-output muted">Run the tests to validate your code.</div>;
  }
  const passedCount = report.tests.filter((test) => test.passed).length;
  return (
    <div className="test-output">
      <div className={`test-summary ${report.passed ? 'ok' : 'ko'}`}>
        {report.passed ? 'All tests passed. Nice work!' : `${passedCount} of ${testNames.length} tests passed.`}
        {report.durationMs !== undefined && <span className="muted"> · {report.durationMs} ms</span>}
      </div>
      {report.compileError && <pre className="compile-error">{report.compileError}</pre>}
      {report.tests.map((test, testIndex) => (
        <div key={testIndex} className={`test-row ${test.passed ? 'passed' : 'failed'}`}>
          <span className="test-icon">{test.passed ? <CheckIcon /> : <CrossIcon />}</span>
          <div>
            <div><TestName name={test.name} /></div>
            {!test.passed && test.message && <pre className="test-message">{test.message}</pre>}
          </div>
        </div>
      ))}
    </div>
  );
}
