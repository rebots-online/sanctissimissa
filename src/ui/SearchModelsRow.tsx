// Search-models Settings row — L-native-embed-engine F7 (BA.13). Status text is a
// closed set (Phase L) driven by the embedder state; no specimen text ever renders.
import { useSyncExternalStore } from 'react';

import { consentMetered, embedReadiness, retry, subscribeEmbedReadiness } from '../core/vector/preload.ts';

export default function SearchModelsRow() {
  const s = useSyncExternalStore(subscribeEmbedReadiness, embedReadiness);
  let status: string;
  switch (s.embed) {
    case 'absent':
    case 'waiting-metered': status = 'Search models not downloaded (≈1.28 GB)'; break;
    case 'downloading': status = `Downloading search models — ${Math.round(s.progress * 100)}%`; break;
    case 'verifying': status = 'Verifying search models…'; break;
    case 'loading': status = 'Loading search models…'; break;
    case 'ready': status = `Semantic search ready${s.rerank === 'error' ? ' (reranking unavailable)' : ''}`; break;
    case 'error': status = `Search models unavailable — ${s.reason ?? ''}`; break;
  }
  const showButton = s.embed === 'absent' || s.embed === 'waiting-metered' || s.embed === 'error';
  return (
    <section id="search-models-row" className="model-row">
      <span id="search-models-status" className="model-meta">{status}</span>
      {showButton && (
        <button id="search-models-download" type="button" className="model-download"
          onClick={() => (s.embed === 'error' ? retry() : consentMetered())}>
          {s.embed === 'error' ? 'Retry' : '⬇ Download search models'}
        </button>
      )}
    </section>
  );
}
