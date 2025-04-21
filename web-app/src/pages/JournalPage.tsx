import React from 'react';
import JournalNotes from '../components/JournalNotes';

const JournalPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Journal</h1>
      <JournalNotes />
    </div>
  );
};

export default JournalPage;
