import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import JournalEntry from '../JournalEntry';
import { Audio } from 'expo-av';
import type { JournalEntry as JournalEntryType } from '../../types/journal';

// Mock expo-av Audio module
jest.mock('expo-av', () => ({
  Audio: {
    Recording: {
      createAsync: jest.fn().mockResolvedValue({
        recording: {
          status: { canRecord: true },
          startAsync: jest.fn(),
          stopAndUnloadAsync: jest.fn(),
          getURI: jest.fn().mockReturnValue('test-uri'),
        },
      }),
    },
    Sound: {
      createAsync: jest.fn().mockResolvedValue({
        sound: {
          playAsync: jest.fn(),
          pauseAsync: jest.fn(),
          unloadAsync: jest.fn(),
          setOnPlaybackStatusUpdate: jest.fn(),
        },
      }),
    },
    requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
    setAudioModeAsync: jest.fn().mockResolvedValue(true),
  },
}));

const mockEntry: JournalEntryType = {
  id: 'test-entry-1',
  title: 'Test Entry',
  content: 'Test content',
  type: 'text',
  date: '2025-04-29',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

describe('JournalEntry Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders in view mode correctly', () => {
    const { getByText, getByTestId } = render(
      <JournalEntry entry={mockEntry} />
    );

    expect(getByTestId('entry-title')).toHaveTextContent('Test Entry');
    expect(getByTestId('entry-content')).toHaveTextContent('Test content');
  });

  it('renders in edit mode correctly', () => {
    const { getByPlaceholderText } = render(
      <JournalEntry entry={mockEntry} isEditing={true} />
    );

    expect(getByPlaceholderText('Entry Title')).toBeTruthy();
    expect(getByPlaceholderText('Write your thoughts...')).toBeTruthy();
  });

  it('calls onSave when save button is pressed', async () => {
    const mockSave = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = render(
      <JournalEntry
        entry={mockEntry}
        isEditing={true}
        onSave={mockSave}
      />
    );

    await act(async () => {
      fireEvent.press(getByTestId('save-button'));
    });

    expect(mockSave).toHaveBeenCalledWith({
      ...mockEntry,
      title: mockEntry.title,
      content: mockEntry.content,
    });
  });

  it('handles audio recording', async () => {
    const mockSave = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = render(
      <JournalEntry
        entry={mockEntry}
        isEditing={true}
        onSave={mockSave}
      />
    );

    // Start recording
    await act(async () => {
      fireEvent.press(getByTestId('record-button'));
    });

    expect(Audio.requestPermissionsAsync).toHaveBeenCalled();
    expect(Audio.setAudioModeAsync).toHaveBeenCalledWith({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    // Stop recording
    await act(async () => {
      fireEvent.press(getByTestId('record-button'));
    });

    expect(mockSave).toHaveBeenCalledWith({
      ...mockEntry,
      audioPath: 'test-uri',
      type: 'mixed',
    });
  });

  it('handles spatial mode correctly', () => {
    const spatialEntry = {
      ...mockEntry,
      positionX: 100,
      positionY: 200,
    };

    const { getByTestId } = render(
      <JournalEntry
        entry={spatialEntry}
        spatialMode={true}
      />
    );

    const entryContainer = getByTestId('entry-container');
    expect(entryContainer).toHaveStyle({
      position: 'absolute',
      left: 100,
      top: 200,
    });
  });
});