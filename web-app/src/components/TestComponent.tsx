import React from 'react';

/**
 * Simple test component to verify that React is rendering correctly
 */
const TestComponent: React.FC = () => {
  return (
    <div className="p-4 bg-white shadow-md rounded-lg">
      <h2 className="text-xl font-bold mb-4">Test Component</h2>
      <p>If you can see this, React is rendering correctly!</p>
    </div>
  );
};

export default TestComponent;
