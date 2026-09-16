import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { initSelfApplyingUpdates } from './pwa/pwaUpdate.ts';
import './styles.css';

initSelfApplyingUpdates();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
