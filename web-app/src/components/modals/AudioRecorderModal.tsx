import React, { useState, useRef, useEffect, useCallback } from 'react';
import Draggable from 'react-draggable';

interface AudioRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, audioBlob: Blob) => void;
}

const AudioRecorderModal: React.FC<AudioRecorderModalProps> = ({ isOpen, onClose, onSave }) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');

  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const resetState = useCallback(() => {
    setIsRecording(false);
    setMediaRecorder(null);
    setAudioChunks([]);
    setRecordedAudioBlob(null);
    setError(null);
    setTitle('');
    stopStream();
  }, [stopStream]);

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
    return () => {
      stopStream();
    };
  }, [isOpen, resetState, stopStream]);

  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Media Devices API not supported in this browser.');
      return;
    }
    resetState();
    setError(null);
    try {
      console.log('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone access granted');
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks((prev) => [...prev, event.data]);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        setRecordedAudioBlob(audioBlob);
        setIsRecording(false);
        stopStream();
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Error accessing microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
    }
  };

  const handleSave = () => {
    if (recordedAudioBlob && title.trim()) {
      onSave(title.trim(), recordedAudioBlob);
      resetState();
    } else {
      setError('No audio recorded or recording not finished.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Draggable handle=".drag-handle">
        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md relative">
          <div className="drag-handle cursor-move absolute top-0 left-0 right-0 h-6 bg-gray-200 rounded-t-lg flex items-center justify-center">
            <div className="w-8 h-1 bg-gray-400 rounded-full"></div>
          </div>
          <div className="pt-4">
            <h2 className="text-xl font-semibold mb-4">Record Audio Note</h2>
            
            {error && <p className="text-red-500 text-sm mb-3">Error: {error}</p>}

            <div className="mb-4">
              <label htmlFor="audioTitle" className="block text-sm font-medium text-gray-700 mb-1">Note Title:</label>
              <input 
                type="text" 
                id="audioTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="Enter title for your note"
              />
            </div>

            <div className="mb-4 flex justify-center items-center space-x-4">
              {!isRecording ? (
                <button 
                  onClick={startRecording} 
                  disabled={isRecording}
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
                >
                  Start Recording
                </button>
              ) : (
                <button 
                  onClick={stopRecording} 
                  disabled={!isRecording}
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
                >
                  Stop Recording
                </button>
              )}
              {isRecording && <span className="text-red-500 animate-pulse">Recording...</span>}
            </div>

            {recordedAudioBlob && (
              <div className="mb-4">
                <p className="text-sm font-semibold mb-1">Recording Preview:</p>
                <audio controls src={URL.createObjectURL(recordedAudioBlob)} className="w-full"></audio>
              </div>
            )}

            <div className="flex justify-end space-x-3 mt-6">
              <button 
                onClick={onClose} 
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave} 
                disabled={!recordedAudioBlob || !title.trim() || isRecording}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      </Draggable>
    </div>
  );
};

export default AudioRecorderModal;
