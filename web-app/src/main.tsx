import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter } from 'react-router-dom'
import { initDatabase, getDatabase } from './services/database/db'

// Function to check if data needs to be imported
async function checkAndImportData() {
  try {
    console.log('======= DATABASE CHECK DIAGNOSTIC =======');
    
    // Allow skipping the import process with a URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('bypass_import')) {
      console.log('Bypassing import check due to URL parameter');
      return true;
    }

    // Initialize the database
    await initDatabase();
    const db = await getDatabase();
    
    // List all available stores for debugging
    const storeNames = Array.from(db.objectStoreNames || []);
    console.log('Available database stores:', storeNames);
    
    // Collect counts for all relevant stores
    const counts: Record<string, number> = {};
    for (const storeName of storeNames) {
      try {
        counts[storeName] = await db.count(storeName);
        console.log(`- ${storeName}: ${counts[storeName]} items`);
      } catch (e) {
        console.error(`Error counting items in ${storeName}:`, e);
        counts[storeName] = 0;
      }
    }
    
    // Check if key tables have at least some data (not necessarily all three)
    const hasLiturgicalData = (
      (counts['liturgical_days'] > 0) || 
      (counts['mass_texts'] > 0) || 
      (counts['office_texts'] > 0)
    );
    
    // If we don't have any liturgical data at all, redirect to import
    if (!hasLiturgicalData) {
      console.log('No liturgical data found in database, redirecting to import page...');
      window.location.href = '/import.html';
      return false;
    }
    
    console.log('Database is already populated with liturgical data');
    console.log(`- Liturgical days: ${counts['liturgical_days'] || 0}`);
    console.log(`- Mass texts: ${counts['mass_texts'] || 0}`);
    console.log(`- Office texts: ${counts['office_texts'] || 0}`);
    return true;
  } catch (error) {
    console.error('Error checking database:', error);
    return false;
  }
}

// Check if we need to import data before rendering the app
checkAndImportData().then((databaseReady) => {
  // Only render the app if the database is ready or we're on the import page
  if (databaseReady || window.location.pathname.includes('/import.html')) {
    const root = ReactDOM.createRoot(document.getElementById('root')!);
    root.render(
      <React.StrictMode>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </React.StrictMode>
    );
  }
});
