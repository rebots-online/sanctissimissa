import React, { useState, useEffect } from 'react';
import { getAllJournalEntries, saveJournalEntry } from '../services/database/liturgicalService';
import { JournalEntry } from '../types/journal';
import { v4 as uuidv4 } from 'uuid';

/**
 * Journal page component
 * 
 * Features:
 * - List of journal entries
 * - Create, edit, and delete entries
 * - Text and audio entries
 * - Responsive design
 */
const JournalPage: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [entryType, setEntryType] = useState('text');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  
  // Load journal entries
  useEffect(() => {
    const loadEntries = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const journalEntries = await getAllJournalEntries();
        setEntries(journalEntries);
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading journal entries:', err);
        setError(`Error loading journal entries: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setLoading(false);
      }
    };
    
    loadEntries();
  }, []);
  
  // Select an entry
  const handleSelectEntry = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setIsEditing(false);
    setIsCreating(false);
  };
  
  // Create a new entry
  const handleCreateEntry = () => {
    setSelectedEntry(null);
    setIsEditing(false);
    setIsCreating(true);
    setTitle('');
    setContent('');
    setEntryType('text');
    setAudioBlob(null);
  };
  
  // Edit the selected entry
  const handleEditEntry = () => {
    if (selectedEntry) {
      setTitle(selectedEntry.title);
      setContent(selectedEntry.content || '');
      setEntryType(selectedEntry.type);
      setAudioBlob(selectedEntry.audioBlob || null);
      setIsEditing(true);
      setIsCreating(false);
    }
  };
  
  // Delete the selected entry
  const handleDeleteEntry = async () => {
    if (selectedEntry && window.confirm('Are you sure you want to delete this entry?')) {
      try {
        // In a real implementation, we would delete the entry from the database
        // For now, we'll just remove it from the state
        setEntries(entries.filter(entry => entry.id !== selectedEntry.id));
        setSelectedEntry(null);
      } catch (err) {
        console.error('Error deleting entry:', err);
        setError(`Error deleting entry: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  };
  
  // Save the entry
  const handleSaveEntry = async () => {
    try {
      const now = Date.now();
      
      const entry: JournalEntry = {
        id: isCreating ? uuidv4() : (selectedEntry?.id || uuidv4()),
        title,
        content,
        type: entryType,
        date: new Date().toISOString().split('T')[0],
        createdAt: isCreating ? now : (selectedEntry?.createdAt || now),
        updatedAt: now,
        audioBlob: audioBlob || undefined
      };
      
      await saveJournalEntry(entry);
      
      // Update the entries list
      if (isCreating) {
        setEntries([entry, ...entries]);
      } else {
        setEntries(entries.map(e => e.id === entry.id ? entry : e));
      }
      
      setSelectedEntry(entry);
      setIsEditing(false);
      setIsCreating(false);
    } catch (err) {
      console.error('Error saving entry:', err);
      setError(`Error saving entry: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };
  
  // Cancel editing or creating
  const handleCancel = () => {
    setIsEditing(false);
    setIsCreating(false);
  };
  
  // Start recording audio
  const handleStartRecording = () => {
    // In a real implementation, we would use the MediaRecorder API
    // For now, we'll just set a flag
    setIsRecording(true);
  };
  
  // Stop recording audio
  const handleStopRecording = () => {
    // In a real implementation, we would stop the MediaRecorder and get the blob
    // For now, we'll just set a flag and a dummy blob
    setIsRecording(false);
    setAudioBlob(new Blob(['dummy audio data'], { type: 'audio/webm' }));
  };
  
  // Format date for display
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Render loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error:</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }
  
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Spiritual Journal</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entries list */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow-md p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Entries</h2>
            <button
              onClick={handleCreateEntry}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              New Entry
            </button>
          </div>
          
          {entries.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No journal entries yet.</p>
          ) : (
            <ul className="space-y-2">
              {entries.map(entry => (
                <li
                  key={entry.id}
                  className={`p-3 rounded cursor-pointer hover:bg-gray-100 transition ${
                    selectedEntry?.id === entry.id ? 'bg-blue-100' : ''
                  }`}
                  onClick={() => handleSelectEntry(entry)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{entry.title}</h3>
                      <p className="text-sm text-gray-500">
                        {formatDate(entry.createdAt)}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        entry.type === 'audio' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {entry.type === 'audio' ? 'Audio' : 'Text'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {/* Entry detail or editor */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-4">
          {isEditing || isCreating ? (
            <div>
              <h2 className="text-xl font-semibold mb-4">
                {isCreating ? 'New Entry' : 'Edit Entry'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Entry title"
                  />
                </div>
                
                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                    Entry Type
                  </label>
                  <select
                    id="type"
                    value={entryType}
                    onChange={e => setEntryType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="text">Text</option>
                    <option value="audio">Audio</option>
                  </select>
                </div>
                
                {entryType === 'text' ? (
                  <div>
                    <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                      Content
                    </label>
                    <textarea
                      id="content"
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      rows={10}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Write your thoughts..."
                    ></textarea>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Audio Recording
                    </label>
                    
                    {isRecording ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-pulse h-4 w-4 bg-red-600 rounded-full"></div>
                        <span>Recording...</span>
                        <button
                          onClick={handleStopRecording}
                          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                        >
                          Stop Recording
                        </button>
                      </div>
                    ) : (
                      <div>
                        {audioBlob ? (
                          <div className="flex items-center space-x-2">
                            <span>Recording saved</span>
                            <button
                              onClick={handleStartRecording}
                              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                            >
                              Record Again
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={handleStartRecording}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                          >
                            Start Recording
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEntry}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    disabled={!title}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          ) : selectedEntry ? (
            <div>
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold">{selectedEntry.title}</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={handleEditEntry}
                    className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleDeleteEntry}
                    className="px-3 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-500">
                  Created: {formatDate(selectedEntry.createdAt)}
                </p>
                {selectedEntry.updatedAt !== selectedEntry.createdAt && (
                  <p className="text-sm text-gray-500">
                    Updated: {formatDate(selectedEntry.updatedAt)}
                  </p>
                )}
              </div>
              
              {selectedEntry.type === 'audio' ? (
                <div className="bg-gray-100 p-4 rounded">
                  <p className="mb-2">Audio entry</p>
                  {/* In a real implementation, we would render an audio player */}
                  <div className="bg-white p-3 rounded border border-gray-300">
                    <div className="flex items-center space-x-2">
                      <button className="p-2 bg-blue-600 text-white rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <div className="h-2 bg-gray-200 rounded-full w-full">
                        <div className="h-2 bg-blue-600 rounded-full w-1/3"></div>
                      </div>
                      <span className="text-sm text-gray-500">1:23</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="prose max-w-none">
                  {selectedEntry.content ? (
                    <p>{selectedEntry.content}</p>
                  ) : (
                    <p className="text-gray-500 italic">No content</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {entries.length === 0
                  ? 'Create your first journal entry to get started.'
                  : 'Select an entry or create a new one.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JournalPage;
