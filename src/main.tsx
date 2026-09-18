import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { CompanionModelsProvider } from './ui/ModelPicker.tsx';
import DiagnosticsWindow from './ui/DiagnosticsWindow.tsx';
import { installDiagnosticCapture } from './core/diagnostics/capture.ts';
import { initSelfApplyingUpdates } from './pwa/pwaUpdate.ts';
import './styles.css';

installDiagnosticCapture();
initSelfApplyingUpdates();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CompanionModelsProvider>
      <App />
      <DiagnosticsWindow />
    </CompanionModelsProvider>
  </React.StrictMode>,
);
