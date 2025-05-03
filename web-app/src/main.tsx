import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import App from './App';
import theme from './theme';
import { DatabaseProvider } from './shared/database';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

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

// Register service worker for PWA with enhanced update handling
const updateSW = registerSW({
  // When a new service worker is available and waiting to be activated
  onNeedRefresh() {
    // Create a custom notification instead of using the browser's confirm dialog
    const updateNotification = document.createElement('div');
    updateNotification.className = 'sw-update-notification';
    updateNotification.innerHTML = `
      <div class="sw-update-content">
        <p>New content is available!</p>
        <div class="sw-update-actions">
          <button id="sw-update-button">Update Now</button>
          <button id="sw-update-dismiss">Later</button>
        </div>
      </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .sw-update-notification {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: #556cd6;
        color: white;
        padding: 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 9999;
        max-width: 90%;
        width: 400px;
      }
      .sw-update-content {
        text-align: center;
      }
      .sw-update-actions {
        display: flex;
        justify-content: center;
        gap: 16px;
        margin-top: 12px;
      }
      .sw-update-actions button {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
      }
      #sw-update-button {
        background-color: white;
        color: #556cd6;
      }
      #sw-update-dismiss {
        background-color: transparent;
        color: white;
        border: 1px solid white;
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(updateNotification);

    // Add event listeners
    document.getElementById('sw-update-button')?.addEventListener('click', () => {
      // Update the service worker
      updateSW(true);
      // Remove the notification
      updateNotification.remove();
    });

    document.getElementById('sw-update-dismiss')?.addEventListener('click', () => {
      // Remove the notification
      updateNotification.remove();
    });
  },

  // When the service worker is ready for offline use
  onOfflineReady() {
    // Create a toast notification
    const offlineNotification = document.createElement('div');
    offlineNotification.className = 'offline-notification';
    offlineNotification.innerHTML = `
      <div class="offline-content">
        <p>App ready for offline use</p>
      </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .offline-notification {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: #4caf50;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 9999;
        animation: fadeInOut 3s forwards;
      }
      @keyframes fadeInOut {
        0% { opacity: 0; }
        10% { opacity: 1; }
        80% { opacity: 1; }
        100% { opacity: 0; }
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(offlineNotification);

    // Remove the notification after 3 seconds
    setTimeout(() => {
      offlineNotification.remove();
    }, 3000);

    console.log('App ready to work offline');
  },

  // Register error handling
  onRegisterError(error) {
    console.error('Service worker registration error:', error);
  }
});

// Initialize the application
initializeApp().catch(console.error);
