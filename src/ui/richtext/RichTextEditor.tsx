/**
 * RichTextEditor — the one CKEditor 5 React wrapper for all exposures
 * (supersedes the TipTap editor; ARCHITECTURE §7.6 editor row, P-S).
 *
 * Thin on purpose: the official @ckeditor/ckeditor5-react component owns
 * creation/teardown (StrictMode remounts just re-fire onReady); callers keep
 * their own save contracts (AccompanimentEditor's 400 ms BC.3 debounce) and
 * imperative APIs by holding the instance handed to `onReady`. Initial data
 * is read once at mount — live edits flow back through `onChange` only.
 */

import { useMemo, useRef } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import { ClassicEditor } from 'ckeditor5';
import 'ckeditor5/ckeditor5.css';
import './richtext-theme.css';
import { buildConfig, type RichTextPreset } from './presets.ts';
import { normalizeLegacyHtml } from './markCompat.ts';

interface Props {
  preset?: RichTextPreset;
  /** Initial HTML. Legacy bare `<mark>` from TipTap saves is normalized on the main preset. */
  data?: string;
  placeholder?: string;
  /** Serialized HTML after every content change. */
  onChange?: (html: string) => void;
  /** Fired whenever an editor instance is live (again after remount/Watchdog restart). */
  onReady?: (editor: ClassicEditor) => void;
  className?: string;
}

export default function RichTextEditor({
  preset = 'main',
  data,
  placeholder,
  onChange,
  onReady,
  className,
}: Props) {
  const config = useMemo(() => buildConfig(preset, placeholder), [preset, placeholder]);
  const initialData = useMemo(() => {
    const raw = data ?? '';
    return preset === 'main' ? normalizeLegacyHtml(raw) : raw;
    // Intentionally mount-only: the `data` prop is the initial document, not a controlled value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  return (
    <div className={className}>
      <CKEditor
        editor={ClassicEditor}
        config={config}
        data={initialData}
        onReady={(editor) => onReadyRef.current?.(editor)}
        onChange={(_event, editor) => onChangeRef.current?.(editor.getData())}
      />
    </div>
  );
}
