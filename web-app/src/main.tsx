import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import App from './App';
import theme from './theme';
import { DatabaseProvider } from './shared/database';

async function initializeApp() {
  try {
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <BrowserRouter>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <DatabaseProvider>
              <App />
            </DatabaseProvider>
          </ThemeProvider>
        </BrowserRouter>
      </React.StrictMode>
    );
  } catch (error) {
    console.error('Failed to initialize application:', error);
    // Show error boundary fallback
    document.getElementById('root')!.innerHTML = `
      <div style="padding: 20px; text-align: center;">
        <h1>Application Error</h1>
        <p>Failed to initialize the application. Please try reloading the page.</p>
        <button onclick="window.location.reload()">Reload Application</button>
      </div>
    `;
  }
}

// Initialize the application
initializeApp().catch(console.error);
