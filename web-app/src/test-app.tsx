import React from 'react';
import ReactDOM from 'react-dom/client';

const TestApp: React.FC = () => {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>SanctissiMissa Test App</h1>
      <p>If you can see this, React is working correctly.</p>
      <p>This is a simple test application to verify that Vite and React are working correctly.</p>
    </div>
  );
};

// Render the test app
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TestApp />
  </React.StrictMode>
);
