'use client';

import { useEffect, useRef } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { searchKeymap } from '@codemirror/search';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { markdown } from '@codemirror/lang-markdown';
import { python } from '@codemirror/lang-python';
import { sql } from '@codemirror/lang-sql';
import { yaml } from '@codemirror/lang-yaml';
import { oneDark } from '@codemirror/theme-one-dark';

interface CodeEditorProps {
  content: string;
  language: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  onSave?: () => void;
}

function getLanguageExtension(language: string) {
  switch (language) {
    case 'javascript':
      return javascript({ jsx: true, typescript: false });
    case 'typescript':
      return javascript({ jsx: true, typescript: true });
    case 'json':
      return json();
    case 'css':
      return css();
    case 'html':
      return html();
    case 'markdown':
      return markdown();
    case 'python':
      return python();
    case 'sql':
      return sql();
    case 'yaml':
      return yaml();
    case 'shell':
      return null; // Kein Sprachpaket — Plaintext-Fallback
    default:
      return null;
  }
}

const customTheme = EditorView.theme({
  '&': {
    fontSize: '12px',
    fontFamily: '"Azeret Mono", "JetBrains Mono", "Fira Code", monospace',
    height: '100%',
    backgroundColor: '#060809',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: '"Azeret Mono", "JetBrains Mono", "Fira Code", monospace',
  },
  '.cm-content': {
    padding: '8px 0',
    caretColor: '#22d3ee',
    color: '#c8d6e5',
  },
  '.cm-focused': {
    outline: 'none',
  },
  '.cm-line': {
    padding: '0 12px 0 4px',
  },
  '.cm-gutters': {
    backgroundColor: '#0b0e11',
    borderRight: '1px solid #1a2028',
    color: '#4a5a6e',
    minWidth: '40px',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    padding: '0 8px',
    minWidth: '32px',
    textAlign: 'right',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#0e1620',
    color: '#8a9bb0',
  },
  '.cm-activeLine': {
    backgroundColor: '#0b1018',
  },
  '.cm-cursor': {
    borderLeftColor: '#22d3ee',
    borderLeftWidth: '2px',
  },
  '.cm-selectionBackground': {
    backgroundColor: '#1a3a5c !important',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: '#1a3a5c',
  },
  '.cm-matchingBracket': {
    backgroundColor: '#1a3a5c',
    color: '#22d3ee !important',
  },
  '.cm-searchMatch': {
    backgroundColor: '#3a2800',
    outline: '1px solid #fbbf24',
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: '#5c3d00',
  },
});

export function CodeEditor({ content, language, readOnly = false, onChange, onSave }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Bestehende View zerstoeren
    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    const langExt = getLanguageExtension(language);

    const saveKeymap = keymap.of([
      {
        key: 'Mod-s',
        run: () => {
          if (onSave) {
            onSave();
            return true;
          }
          return false;
        },
      },
    ]);

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && onChange) {
        onChange(update.state.doc.toString());
      }
    });

    const extensions = [
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      history(),
      bracketMatching(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...searchKeymap,
        indentWithTab,
      ]),
      saveKeymap,
      oneDark,
      customTheme,
      updateListener,
      EditorState.readOnly.of(readOnly),
      EditorView.lineWrapping,
    ];

    if (langExt) {
      extensions.push(langExt);
    }

    const state = EditorState.create({
      doc: content,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // content und language als Deps: bei Aenderung View neu erstellen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, language, readOnly]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden"
      style={{ fontFamily: '"Azeret Mono", "JetBrains Mono", "Fira Code", monospace' }}
    />
  );
}
