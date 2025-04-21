import React, { useEffect, useState } from 'react';
import { getDatabase } from '../services/database/db';

// Interface for data potentially coming from DB before strict typing
interface RawJournalData {
  id: string;
  title?: string;
  content?: string;
  date?: string;
  type?: 'text' | 'audio';
  audioBlob?: Blob;
  tags?: string[];
  createdAt?: number;
  updatedAt?: number;
  position?: { x: number; y: number };
}

// Consider moving this interface to a shared models/types file later
export interface JournalEntry {
  id: string;
  title: string;
  content?: string; // Optional for audio/future types
  type: 'text' | 'audio'; // Add other types like 'drawing' later
  date: string;
  audioBlob?: Blob; // Optional, only for audio notes
  tags: string[]; // Made required, ensure always an array
  createdAt: number; // Made required
  updatedAt: number; // Made required
  position?: { x: number; y: number }; // Optional, for sticky notes
}

const JournalNotes: React.FC = () => {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [newEntry, setNewEntry] = useState({ title: '', content: '', tags: [] });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJournalEntries = async () => {
      try {
        const db = await getDatabase();
        // Fetch potentially untyped data - use RawJournalData type
        const rawEntries: RawJournalData[] = await db.getAll('journal_entries'); 
        // Map database entries to component interface, handling potential missing fields
        const entries: JournalEntry[] = rawEntries.map(entry => ({
          id: entry.id,
          title: entry.title || 'Journal Entry', // Provide default
          content: entry.content, // Keep as potentially undefined
          date: entry.date || new Date().toISOString(), // Provide default
          type: entry.type || 'text', // Default type if missing
          audioBlob: entry.audioBlob,
          tags: Array.isArray(entry.tags) ? entry.tags : [], // Ensure tags is always an array
          createdAt: entry.createdAt || Date.now(), // Provide default if missing from older data
          updatedAt: entry.updatedAt || Date.now(), // Provide default if missing from older data
          position: entry.position // Position might be undefined
        }));
        setJournalEntries(entries);
        setLoading(false);
      } catch (err) {
        setError('Failed to load Journal entries. Please try again later.');
        setLoading(false);
        console.error('Error fetching Journal entries:', err);
      }
    };

    fetchJournalEntries();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewEntry(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.title || !newEntry.content) return;

    try {
      const db = await getDatabase();
      const id = Date.now().toString();
      const date = new Date().toISOString();
      const entryToSave: JournalEntry = {
        id, 
        title: newEntry.title, 
        content: newEntry.content, 
        type: 'text', 
        date,
        tags: newEntry.tags, // Explicitly set tags to [] here for the text entry form
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await db.put('journal_entries', entryToSave);
      // Optimistically update UI - Ensure the type matches!
      setJournalEntries(prevEntries => [...prevEntries, entryToSave]);
      setNewEntry({ title: '', content: '', tags: [] });
    } catch (err) {
      setError('Failed to save Journal entry. Please try again.');
      console.error('Error saving Journal entry:', err);
    }
  };

  if (loading) {
    return <div className="text-center p-4">Loading Journal entries...</div>;
  }

  if (error) {
    return <div className="text-center p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Journal & Notes</h2>
      
      <form onSubmit={handleSubmit} className="mb-6 bg-white shadow-md rounded-lg p-4">
        <h3 className="text-xl font-semibold mb-2">Add New Entry</h3>
        <div className="mb-4">
          <label htmlFor="title" className="block text-gray-700 text-sm font-bold mb-2">Title:</label>
          <input 
            type="text" 
            id="title" 
            name="title" 
            value={newEntry.title} 
            onChange={handleInputChange} 
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
            placeholder="Entry Title" 
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="content" className="block text-gray-700 text-sm font-bold mb-2">Content:</label>
          <textarea 
            id="content" 
            name="content" 
            value={newEntry.content} 
            onChange={handleInputChange} 
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-32" 
            placeholder="Your thoughts or notes" 
            required
          ></textarea>
        </div>
        <div className="mb-4">
          <label htmlFor="tags" className="block text-gray-700 text-sm font-bold mb-2">Tags:</label>
          <input 
            type="text" 
            id="tags" 
            name="tags" 
            value={newEntry.tags.join(',')} 
            onChange={handleInputChange} 
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
            placeholder="Entry Tags" 
          />
        </div>
        <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">Save Entry</button>
      </form>
      
      {journalEntries.length === 0 ? (
        <div className="text-center p-4">No Journal entries available. Add one above!</div>
      ) : (
        journalEntries.map((entry) => (
          <div key={entry.id} className="mb-6 bg-white shadow-md rounded-lg p-4">
            <h3 className="text-xl font-semibold mb-2">{entry.title}</h3>
            <p className="text-sm text-gray-500">Date: {new Date(entry.date).toLocaleDateString()} | Type: {entry.type}</p>
            {entry.content && <div className="text-base text-gray-700 mt-2 whitespace-pre-wrap">{entry.content}</div>}
            {entry.tags.length > 0 && <div className="text-base text-gray-700 mt-2">Tags: {entry.tags.join(', ')}</div>}
            {entry.type === 'audio' && entry.audioBlob && (
              <div className="mt-3">
                {/* Audio Playback for Saved Entries */}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default JournalNotes;
