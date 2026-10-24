import { useEffect, useRef, useState } from 'react';
import type { EngineId, ProjectFiles } from '../content';
import type { SandboxRequest, SandboxResponse } from '../sandbox/protocol';
import { sandboxUrl } from './runner';

export interface ConsoleEntry {
  level: 'log' | 'info' | 'warn' | 'error';
  text: string;
}

interface PreviewFrameProps {
  engine: EngineId;
  files: ProjectFiles;
  entry: string;
  reloadKey: number;
  onConsole(entry: ConsoleEntry): void;
}

const PREVIEW_DEBOUNCE_MS = 700;

/**
 * Live preview iframe that re-renders the learner project after edits.
 */
export function PreviewFrame({ engine, files, entry, reloadKey, onConsole }: PreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const onConsoleRef = useRef(onConsole);
  onConsoleRef.current = onConsole;

  useEffect(() => {
    setReady(false);
    const onMessage = (event: MessageEvent<SandboxResponse>) => {
      if (event.source !== iframeRef.current?.contentWindow) {
        return;
      }
      if (event.data.type === 'ready') {
        setReady(true);
      }
      if (event.data.type === 'console') {
        onConsoleRef.current({ level: event.data.level, text: event.data.text });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [engine, reloadKey]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    const timer = setTimeout(() => {
      const request: SandboxRequest = { type: 'preview', files, entry };
      iframeRef.current?.contentWindow?.postMessage(request, location.origin);
    }, PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [ready, files, entry]);

  return (
    <div className="preview-frame">
      {!ready && <div className="preview-loading">Starting {engine} sandbox…</div>}
      <iframe key={`${engine}-${reloadKey}`} ref={iframeRef} title="Preview" src={sandboxUrl(engine, 'preview')} />
    </div>
  );
}
