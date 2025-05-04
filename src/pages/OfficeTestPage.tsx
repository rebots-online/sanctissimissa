import React, { useState, useEffect } from 'react';
import { loadOfficeText } from '../lib/office';

/**
 * Test page for the Office text loading functionality
 */
const OfficeTestPage: React.FC = () => {
  const [officeText, setOfficeText] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const testOfficeTextLoading = async () => {
      try {
        setLoading(true);
        
        // Get today's date
        const today = new Date().toISOString().split('T')[0];
        
        // Try to load Vespers for today
        const result = await loadOfficeText(today, 'vespers');
        
        setOfficeText(result);
        setLoading(false);
      } catch (err) {
        console.error('Error testing Office text loading:', err);
        setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setLoading(false);
      }
    };
    
    testOfficeTextLoading();
  }, []);
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (error) {
    return <div className="error">{error}</div>;
  }
  
  return (
    <div>
      <h1>Office Text Test</h1>
      
      {officeText ? (
        <div>
          <h2>Office Text Found</h2>
          <pre>{JSON.stringify(officeText, null, 2)}</pre>
        </div>
      ) : (
        <div>No office text found</div>
      )}
    </div>
  );
};

export default OfficeTestPage;
