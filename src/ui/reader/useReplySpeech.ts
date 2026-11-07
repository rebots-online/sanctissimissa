/**
 * TT.4 — Sacristan replies are spoken (§K.4/§K.8; amended 2026-11-06, §L.9;
 * L-audiobook-20261106.md S2). When an assistant reply finishes streaming and
 * the BA.7 voice runtime reports `voice === 'ready'`, the reply's displayed
 * text is spoken through the K.4 pipeline (`Voice.speak`, audio owner
 * `'sacristan'`). Voice not ready → nothing is spoken and nothing nags.
 * Failures are diagnostics only (`debugEvent('voice', 'reply-speak-failed')`),
 * never UI errors. One AbortController per reply, aborted on the next send
 * and on unmount.
 */
import { useEffect, useRef } from 'react';
import { debugEvent } from '../../core/diagnostics/store.ts';
import { stripGuideCommands } from '../../core/orientation/guide.ts';
import { voiceRuntime } from '../../core/voice/runtime.ts';
import { parseBlocks, parseInline, type MarkdownToken } from '../chatMarkdownParser.ts';

/** Structural view of a ChatView turn. */
export interface ReplyTurn {
  role: 'user' | 'assistant';
  text: string;
}

function tokensText(tokens: readonly MarkdownToken[]): string {
  return tokens.map((t) => (t.t === 'text' || t.t === 'code' ? t.v : tokensText(t.c))).join('');
}

/**
 * The bubble's displayed text: the trailing `[[…]]` command tokens removed
 * (`stripGuideCommands`, exactly as ChatView renders), then the ChatMarkdown
 * parse flattened to the characters the reader actually sees (no `**`, `#`,
 * `-`, `|` syntax). SpokenHighlight matches spoken sentences against this
 * same text, so the string passed to `speak` and the `text` prop are equal.
 */
export function replyPlainText(raw: string): string {
  const blocks = parseBlocks(stripGuideCommands(raw));
  const parts: string[] = [];
  for (const b of blocks) {
    if (b.t === 'heading' || b.t === 'paragraph' || b.t === 'quote') parts.push(tokensText(b.c));
    else if (b.t === 'list') parts.push(b.items.map((item) => tokensText(item)).join('\n'));
    else if (b.t === 'table') {
      parts.push([b.head, ...b.rows].map((row) => row.map((cell) => tokensText(parseInline(cell))).join(' ')).join('\n'));
    }
  }
  return parts.map((p) => p.trim()).filter(Boolean).join('\n\n');
}

export function useReplySpeech(messages: readonly ReplyTurn[], streaming: boolean): void {
  const abortRef = useRef<AbortController | null>(null);
  const wasStreamingRef = useRef(streaming);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    const was = wasStreamingRef.current;
    wasStreamingRef.current = streaming;
    if (streaming && !was) {
      // A new send: the previous reply's speech stops.
      abortRef.current?.abort();
      abortRef.current = null;
      return;
    }
    if (streaming || !was) return;
    // The reply just finished streaming.
    const last = messagesRef.current[messagesRef.current.length - 1];
    if (!last || last.role !== 'assistant') return;
    const plain = replyPlainText(last.text);
    if (!plain) return;
    let ready = false;
    try {
      ready = voiceRuntime.status().voice === 'ready';
    } catch (error) {
      debugEvent('voice', 'reply-speak-failed', error, 'warn');
      return;
    }
    if (!ready) return;
    const controller = new AbortController();
    abortRef.current = controller;
    void (async () => {
      try {
        const voice = await voiceRuntime.getVoice();
        if (controller.signal.aborted) return;
        await voice.speak(plain, { signal: controller.signal });
      } catch (error) {
        if (controller.signal.aborted && (error as { name?: string } | null)?.name === 'AbortError') return;
        debugEvent('voice', 'reply-speak-failed', error, 'warn');
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    })();
  }, [streaming]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      abortRef.current = null;
    },
    [],
  );
}
