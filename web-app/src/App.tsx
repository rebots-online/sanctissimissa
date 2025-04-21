import React, { useState, useRef, MouseEvent } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import './App.css'
import CalendarPage from './pages/CalendarPage'
import HomePage from './pages/HomePage'
import DatabaseTest from './components/database/DatabaseTest'
import AudioRecorderModal from './components/modals/AudioRecorderModal';
import TextNoteModal from './components/modals/TextNoteModal';
import MassPage from './pages/MassPage';
import DivineofficePage from './pages/DivineofficePage';
import PrayersPage from './pages/PrayersPage';
import JournalPage from './pages/JournalPage';
import { getDatabase } from './services/database/db';
import { JournalEntry } from './components/JournalNotes';

// --- Placeholder Context Menu Component ---
interface NoteContextMenuProps {
  position: { x: number; y: number };
  onClose: () => void;
  onOptionSelect: (option: string) => void;
}

const NoteContextMenu: React.FC<NoteContextMenuProps> = ({ position, onClose, onOptionSelect }) => {
  // Basic styling to position the menu
  const menuStyle: React.CSSProperties = {
    position: 'absolute',
    top: `${position.y}px`,
    left: `${position.x}px`,
    border: '1px solid #ccc',
    background: 'white',
    padding: '10px',
    zIndex: 1000,
    boxShadow: '2px 2px 5px rgba(0,0,0,0.2)',
  };

  // Add a backdrop to handle clicks outside the menu
  const backdropStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999, // Below the menu, above other content
    background: 'transparent', // Invisible, just captures clicks
  };

  return (
    <>
      <div style={backdropStyle} onClick={onClose}></div>
      <div style={menuStyle}>
        <p className="text-sm mb-2">Note Options:</p>
        <button onClick={() => onOptionSelect('audio')} className="block w-full text-left px-2 py-1 hover:bg-gray-100 text-sm">Record Audio Note</button>
        <button onClick={() => onOptionSelect('text')} className="block w-full text-left px-2 py-1 hover:bg-gray-100 text-sm">Write Text Note</button>
        {/* Add Draw Note later */}
        <button onClick={onClose} className="block w-full text-left px-2 py-1 mt-1 text-red-600 hover:bg-gray-100 text-sm">Cancel</button>
      </div>
    </>
  );
};
// --- End Placeholder Context Menu ---

function App() {
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const LONG_PRESS_DURATION = 500; // milliseconds

  const handleMouseDown = (e: MouseEvent<HTMLElement>) => {
    // Clear any existing timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    // Start a new timer
    longPressTimerRef.current = setTimeout(() => {
      // Prevent default context menu
      e.preventDefault(); 
      setContextMenuPosition({ x: e.clientX, y: e.clientY });
      setContextMenuVisible(true);
      longPressTimerRef.current = null; // Clear ref after firing
    }, LONG_PRESS_DURATION);
  };

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleMouseUp = () => {
    clearLongPressTimer();
  };

  const handleMouseLeave = () => {
    // Clear timer if mouse leaves the area before long press triggers
    clearLongPressTimer();
  };

  // Show our custom context menu on right-click
  const handleContextMenu = (e: MouseEvent<HTMLElement>) => {
      e.preventDefault(); // Prevent the native context menu
      
      // Show our custom context menu at the click position
      setContextMenuPosition({ x: e.clientX, y: e.clientY });
      setContextMenuVisible(true);
  };

  const handleCloseContextMenu = () => {
    setContextMenuVisible(false);
  };

  const handleContextMenuOption = (option: string) => {
    setContextMenuVisible(false); // Close context menu regardless of option
    if (option === 'audio') {
      setIsAudioModalOpen(true); // Open the audio recorder modal
    } else if (option === 'text') {
      setIsTextModalOpen(true); // Open the text note modal
    } else {
      console.log(`Selected option: ${option}`); // Placeholder for other options
    }
  };

  const handleCloseAudioModal = () => {
    setIsAudioModalOpen(false);
  };

  const handleCloseTextModal = () => {
    setIsTextModalOpen(false);
  };

  const handleSaveAudioNote = async (title: string, audioBlob: Blob) => {
    console.log('Attempting to save audio note:', title);
    try {
        const db = await getDatabase();
        const id = Date.now().toString();
        const date = new Date().toISOString();
        const entryToSave: JournalEntry = {
            id,
            title,
            type: 'audio',
            audioBlob,
            date,
            position: contextMenuPosition, // Save the position where the menu was opened
            tags: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            // content is implicitly undefined for audio type
        };
        await db.put('journal_entries', entryToSave);
        console.log('Audio note saved successfully:', entryToSave);
        setIsAudioModalOpen(false); // Close modal on success
    } catch (err) {
        console.error('Failed to save audio note:', err);
        // TODO: Show error to user in the modal?
        // For now, we just log it and the modal stays open
    }
  };

  const handleSaveTextNote = async (title: string, content: string) => {
    console.log('Attempting to save text note:', title);
    try {
        const db = await getDatabase();
        const id = Date.now().toString();
        const date = new Date().toISOString();
        const entryToSave: JournalEntry = {
            id,
            title,
            type: 'text',
            content,
            date,
            position: contextMenuPosition, // Save the position where the menu was opened
            tags: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        await db.put('journal_entries', entryToSave);
        console.log('Text note saved successfully:', entryToSave);
        setIsTextModalOpen(false); // Close modal on success
    } catch (err) {
        console.error('Failed to save text note:', err);
        // For now, we just log it and the modal stays open
    }
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-gray-800 text-white p-4">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold flex items-center">
              <span className="mr-2" aria-hidden="true">✝️</span>
              <span>SanctissiMissa</span>
            </h1>
            <nav>
              <ul className="flex space-x-4">
                <li>
                  <Link to="/" className="hover:text-gray-300">Home</Link>
                </li>
                <li>
                  <Link to="/calendar" className="hover:text-gray-300">Calendar</Link>
                </li>
                <li>
                  <Link to="/journal" className="hover:text-gray-300">Journal</Link>
                </li>
                <li>
                  <Link to="/mass" className="hover:text-gray-300">Mass</Link>
                </li>
                <li>
                  <Link to="/office" className="hover:text-gray-300">Divine Office</Link>
                </li>
                <li>
                  <Link to="/prayers" className="hover:text-gray-300">Prayers</Link>
                </li>
                <li>
                  <Link to="/database-test" className="hover:text-gray-300">DB Test</Link>
                </li>
              </ul>
            </nav>
          </div>
        </header>

        {/* Attach long-press handlers here */}
        <main 
          className="container mx-auto py-6 flex-grow" 
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onContextMenu={handleContextMenu} // Prevent default right-click menu
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/database-test" element={<DatabaseTest />} />
            <Route path="/journal" element={<JournalPage />} />
            
            {/* Mass routes */}
            <Route path="/mass" element={<MassPage />} />
            <Route path="/mass/:date" element={<MassPage />} />
            
            {/* Divine Office routes */}
            <Route path="/office" element={<DivineofficePage />} />
            <Route path="/office/:date" element={<DivineofficePage />} />
            <Route path="/office/:date/:hour" element={<DivineofficePage />} />
            
            {/* Prayers routes */}
            <Route path="/prayers" element={<PrayersPage />} />
            <Route path="/prayers/:category" element={<PrayersPage />} />
            <Route path="/prayers/:category/:id" element={<PrayersPage />} />
          </Routes>
        </main>

        <footer className="bg-gray-800 text-white p-4 mt-auto">
          <div className="container mx-auto text-center">
            <p>SanctissiMissa &copy; 2025 Robin L. M. Cheung, MBA</p>
          </div>
        </footer>
      </div>

      {/* Render Context Menu Conditionally */}
      {contextMenuVisible && (
        <NoteContextMenu 
          position={contextMenuPosition} 
          onClose={handleCloseContextMenu} 
          onOptionSelect={handleContextMenuOption} 
        />
      )}

      {/* Render Audio Recorder Modal Conditionally */}
      <AudioRecorderModal 
        isOpen={isAudioModalOpen}
        onClose={handleCloseAudioModal}
        onSave={handleSaveAudioNote}
      />

      {/* Render Text Note Modal Conditionally */}
      <TextNoteModal
        isOpen={isTextModalOpen}
        onClose={handleCloseTextModal}
        onSave={handleSaveTextNote}
      />
    </Router>
  )
}

export default App
