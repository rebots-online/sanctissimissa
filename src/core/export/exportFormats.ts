/**
 * Export formats for Mass and Office texts (X-1, X-2).
 * HTML, Markdown, and JSON — all client-side, no server round-trip.
 */

export interface ExportEntry {
  title: string;
  latin: string | null;
  english: string | null;
  source?: string;
  rubric?: boolean;
}

export interface ExportMeta {
  day: string;
  feastName: string | null;
  season: string;
  source: string;
}

function stripBang(text: string): string {
  return text
    .split('\n')
    .filter((l) => !l.startsWith('!*') && !l.startsWith('!&'))
    .map((l) => (l.startsWith('!') ? l.slice(1) : l))
    .join('\n');
}

export function exportHTML(meta: ExportMeta, entries: ExportEntry[]): string {
  const sections = entries
    .map((e) => {
      if (e.rubric) return `  <h2>${esc(e.title)}</h2>`;
      const la = e.latin ? stripBang(e.latin) : '';
      const en = e.english ? stripBang(e.english) : '';
      return `  <section>
    <h3>${esc(e.title)}</h3>
    <div class="bilingual">
      <div class="latin" lang="la"><p>${esc(la).replace(/\n/g, '<br>')}</p></div>
      <div class="english" lang="en"><p>${esc(en).replace(/\n/g, '<br>')}</p></div>
    </div>
  </section>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="la">
<head>
<meta charset="utf-8">
<title>${esc(meta.feastName ?? meta.day)} — ${esc(meta.source)}</title>
<style>
body { font-family: Georgia, serif; max-width: 800px; margin: 2em auto; padding: 0 1em; }
h1 { font-size: 1.4em; }
h2 { font-size: 1.1em; border-bottom: 1px solid #ccc; margin-top: 1.5em; }
h3 { font-size: 1em; color: #555; }
.bilingual { display: grid; grid-template-columns: 1fr 1fr; gap: 1em; }
.latin { font-style: italic; }
.english { font-style: normal; }
@media (max-width: 600px) { .bilingual { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<h1>${esc(meta.feastName ?? meta.day)}</h1>
<p><small>${esc(meta.day)} · ${esc(meta.season)} · ${esc(meta.source)}</small></p>
${sections}
</body>
</html>`;
}

export function exportMarkdown(meta: ExportMeta, entries: ExportEntry[]): string {
  const lines: string[] = [
    `# ${meta.feastName ?? meta.day}`,
    '',
    `*${meta.day} · ${meta.season} · ${meta.source}*`,
    '',
  ];
  for (const e of entries) {
    if (e.rubric) {
      lines.push(`## ${e.title}`, '');
      continue;
    }
    lines.push(`### ${e.title}`, '');
    if (e.latin) {
      lines.push('**Latine:**', '', stripBang(e.latin), '');
    }
    if (e.english) {
      lines.push('**English:**', '', stripBang(e.english), '');
    }
    lines.push('');
  }
  return lines.join('\n');
}

export function exportJSON(meta: ExportMeta, entries: ExportEntry[]): string {
  return JSON.stringify({ meta, entries }, null, 2);
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export type ExportFormat = 'html' | 'md' | 'json';

export function downloadExport(
  format: ExportFormat,
  meta: ExportMeta,
  entries: ExportEntry[],
): void {
  const content =
    format === 'html' ? exportHTML(meta, entries) :
    format === 'md' ? exportMarkdown(meta, entries) :
    exportJSON(meta, entries);
  const mime =
    format === 'html' ? 'text/html' :
    format === 'md' ? 'text/markdown' :
    'application/json';
  const ext = format === 'html' ? 'html' : format === 'md' ? 'md' : 'json';
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const el = document.createElement('a');
  el.href = url;
  el.download = `${(meta.feastName ?? meta.day).replace(/\s+/g, '-').replace(/[^\w-]/g, '')}.${ext}`;
  el.click();
  URL.revokeObjectURL(url);
}
