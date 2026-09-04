/**
 * EditorPreview — dev-only design gallery for the CKEditor 5 integration
 * (replaces the Figma-mockup design pass; served by `npm run dev` at
 * /editor-preview.html, deliberately NOT in the production build inputs).
 *
 * Renders the real RichTextEditor (main + compact presets) over realistic
 * liturgical content, with theme family × light/dark × seasonal color
 * switching, so the token-mapped theme can be polished against screenshots
 * before the editor is swapped into Journal/Homily/annotations.
 */

import React, { useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import RichTextEditor from './ui/richtext/RichTextEditor.tsx';
import { THEME_FAMILIES, applyTheme, type ThemeFamily, type ThemeMode } from './core/theme/themes.ts';
import type { ClassicEditor } from 'ckeditor5';

const SAMPLE_HTML = `
<h2>Sancta Missa — notes</h2>
<p>In nomine <mark class="marker-yellow">Patris, et Filii, et Spiritus Sancti</mark>. Amen. The asperges precedes the
Mass of the Catechumens; the celebrant, standing at the epistle side, intones the antiphon while the server
answers <i>Ps. 50:9</i>.</p>
<blockquote><p>Asperges me, Domine, hysopo, et mundabor: lavabis me, et super nivem dealbabor.</p></blockquote>
<ul><li>Kyrie IX (Catholic melodies)</li><li>Gloria — heard Sundays outside Advent and Septuagesima</li></ul>
<p><a href="https://divinumofficium.com">Divinum Officium</a> remains the corpus source; see the
<a href="#/verse/gen/1/1">Genesis 1:1</a> deep link for the internal-route convention.</p>
<figure class="table"><table><tbody>
<tr><td>Canticum</td><td>Benedictus (Lk 1:68–79)</td></tr>
<tr><td>Oratio</td><td>Deus, qui de beatae Mariae…</td></tr>
</tbody></table></figure>
<p>Stage directions follow the <span style="color: var(--rubric); font-style: italic;">rubric convention</span> —
red, italic, sans the surrounding voice.</p>
`;

const COLOR_OPTIONS = ['purple', 'red', 'green', 'white', 'black', 'rose'] as const;
type SeasonalColor = (typeof COLOR_OPTIONS)[number];

function App() {
  const [family, setFamily] = useState<ThemeFamily>('skeuomorphic');
  const [mode, setMode] = useState<ThemeMode>('light');
  const [color, setColor] = useState<SeasonalColor>('purple');
  const [savedHtml, setSavedHtml] = useState('');
  const mainReadyRef = useRef<ClassicEditor | null>(null);

  function apply(f: ThemeFamily, m: ThemeMode, c: SeasonalColor) {
    setFamily(f);
    setMode(m);
    setColor(c);
    applyTheme(f, m);
    document.documentElement.dataset.color = c;
  }

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '16px' }}>
      <header style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', margin: '12px 0 20px' }}>
        <strong style={{ fontVariant: 'small-caps' }}>CKEditor preview</strong>
        <label>
          Theme{' '}
          <select value={family} onChange={(e) => apply(e.target.value as ThemeFamily, mode, color)}>
            {THEME_FAMILIES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </label>
        <label>
          Mode{' '}
          <select value={mode} onChange={(e) => apply(family, e.target.value as ThemeMode, color)}>
            <option value="light">light</option>
            <option value="dark">dark</option>
          </select>
        </label>
        <label>
          Season{' '}
          <select value={color} onChange={(e) => apply(family, mode, e.target.value as SeasonalColor)}>
            {COLOR_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => setSavedHtml(mainReadyRef.current?.getData() ?? '')}>
          Read getData()
        </button>
      </header>

      <div className="jsc-card" style={{ padding: 12, marginBottom: 20 }}>
        <p className="jsc-source" style={{ margin: '0 0 8px', fontVariant: 'small-caps' }}>Main preset — Journal / Homily</p>
        <RichTextEditor
          preset="main"
          data={SAMPLE_HTML}
          onReady={(editor) => { mainReadyRef.current = editor; }}
          onChange={(html) => setSavedHtml(html)}
        />
        <div className="jsc-toolbar" style={{ marginTop: 10, gridColumn: '1 / -1' }} role="toolbar" aria-label="Draft actions">
          <button type="button" className="primary" onClick={() => setSavedHtml(mainReadyRef.current?.getData() ?? '')}>
            Save draft
          </button>
          <button type="button" onClick={() => setSavedHtml('')}>Cancel</button>
          <span className="jsc-why" aria-live="polite">{savedHtml ? 'Draft saved locally' : ''}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div className="jsc-card" style={{ padding: 12, width: 380 }}>
          <p className="jsc-source" style={{ margin: '0 0 8px', fontVariant: 'small-caps' }}>Compact preset — annotations</p>
          <RichTextEditor preset="compact" data="<p>Ambrosian; cfr. “Aeterne rerum conditor”.</p>" />
        </div>
        <div className="jsc-card" style={{ padding: 12, flex: 1, minWidth: 280 }}>
          <p className="jsc-source" style={{ margin: '0 0 8px', fontVariant: 'small-caps' }}>getData() output</p>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, maxHeight: 240, overflow: 'auto' }}>{savedHtml || '…'}</pre>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
