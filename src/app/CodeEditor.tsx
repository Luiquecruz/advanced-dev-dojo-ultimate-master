import { useEffect, useRef } from 'react';
import { EDITOR_THEME, languageForFile, monaco } from './monacoSetup';

interface CodeEditorProps {
  modelPath: string;
  fileName: string;
  value: string;
  readOnly?: boolean;
  onChange?(value: string): void;
  onRun?(): void;
}

/**
 * Monaco editor bound to one model per lesson file.
 */
export function CodeEditor({ modelPath, fileName, value, readOnly = false, onChange, onRun }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const callbacksRef = useRef({ onChange, onRun });
  callbacksRef.current = { onChange, onRun };

  useEffect(() => {
    const editor = monaco.editor.create(containerRef.current!, {
      theme: EDITOR_THEME,
      automaticLayout: true,
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Consolas, monospace",
      fontLigatures: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      tabSize: 2,
      padding: { top: 14, bottom: 14 },
      renderLineHighlight: 'all',
      smoothScrolling: true,
      fixedOverflowWidgets: true,
      wordWrap: 'on',
      readOnly,
    });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => callbacksRef.current.onRun?.());
    const subscription = editor.onDidChangeModelContent(() => callbacksRef.current.onChange?.(editor.getValue()));
    editorRef.current = editor;
    return () => {
      subscription.dispose();
      editor.dispose();
    };
  }, [readOnly]);

  useEffect(() => {
    const uri = monaco.Uri.parse(`file:///${modelPath}/${fileName}`);
    let model = monaco.editor.getModel(uri);
    if (!model) {
      model = monaco.editor.createModel(value, languageForFile(fileName), uri);
    } else if (model.getValue() !== value) {
      model.setValue(value);
    }
    editorRef.current?.setModel(model);
  }, [modelPath, fileName]);

  useEffect(() => {
    const model = editorRef.current?.getModel();
    if (model && model.getValue() !== value) {
      model.pushEditOperations([], [{ range: model.getFullModelRange(), text: value }], () => null);
    }
  }, [value]);

  return <div className="min-h-0 flex-1" ref={containerRef} />;
}
