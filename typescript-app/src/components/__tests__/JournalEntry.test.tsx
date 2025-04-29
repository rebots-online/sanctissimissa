import React from 'react';
import {
  render,
  fireEvent,
  act,
  wait,
  type MockFunction,
  type RenderAPI
} from '../../test-utils/test-library';
import JournalEntry, { type JournalEntryProps } from '../JournalEntry';
import { Audio, type Recording, type Sound, type PlaybackStatus } from 'expo-av';
import type { JournalEntry as JournalEntryType } from '../../types/journal';

// Mock types and functions setup
type StatusUpdateCallback = (status: PlaybackStatus) => void;
const mockStartAsync = jest.fn<Promise<void>, []>();
const mockStopAndUnloadAsync = jest.fn<Promise<void>, []>();
const mockGetURI = jest.fn<string, []>().mockReturnValue('test-uri');
const mockPlayAsync = jest.fn<Promise<void>, []>();
const mockPauseAsync = jest.fn<Promise<void>, []>();
const mockUnloadAsync = jest.fn<Promise<void>, []>();
const mockSetOnPlaybackStatusUpdate = jest.fn<void, [StatusUpdateCallback]>();

// Store callback reference
let lastStatusCallback: StatusUpdateCallback | null = null;

// Mock implementations...
const createMockRecording = (): Recording => ({
  status: { canRecord: true, isDoneRecording: false, durationMillis: 0 },
  startAsync: mockStartAsync,
  stopAndUnloadAsync: mockStopAndUnloadAsync,
  getURI: mockGetURI
});

const createMockSound = (): Sound => ({
  playAsync: mockPlayAsync,
  pauseAsync: mockPauseAsync,
  unloadAsync: mockUnloadAsync,
  setOnPlaybackStatusUpdate: (callback: StatusUpdateCallback) => {
    lastStatusCallback = callback;
    mockSetOnPlaybackStatusUpdate(callback);
  }
});

// Store mock instances
const mockRecording = createMockRecording();
const mockSound = createMockSound();

// Mock expo-av Audio module...
jest.mock('expo-av', () => ({
  Audio: {
    Recording: {
      createAsync: jest.fn().mockResolvedValue({ recording: mockRecording })
    },
    Sound: {
      createAsync: jest.fn().mockResolvedValue({ sound: mockSound })
    },
    requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
    setAudioModeAsync: jest.fn().mockResolvedValue(true)
  }
}));

// Test data
const mockTextEntry: JournalEntryType = {
  id: 'test-entry-1',
  title: 'Test Entry',
  content: 'Test content',
  type: 'text',
  date: '2025-04-29',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const mockAudioEntry: JournalEntryType = {
  ...mockTextEntry,
  id: 'test-audio-1',
  title: 'Audio Entry',
  type: 'mixed',
  audioPath: 'test-audio.m4a',
};

describe('JournalEntry Component', () => {
  let renderResult: RenderAPI;
  const mockOnPress = jest.fn();
  const mockOnSave = jest.fn().mockResolvedValue(undefined);
  const mockOnDelete = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetURI.mockReturnValue('test-uri');
    lastStatusCallback = null;
  });

  afterEach(() => {
    if (renderResult) {
      renderResult.unmount();
    }
  });

  const renderJournalEntry = (props: Partial<JournalEntryProps> = {}) => {
    const defaultProps: JournalEntryProps = {
      entry: mockTextEntry,
      isEditing: false,
      spatialMode: false,
      onPress: mockOnPress,
      onSave: mockOnSave,
      onDelete: mockOnDelete,
      testID: 'journal-entry',
      ...props
    };
    renderResult = render(<JournalEntry {...defaultProps} />);
    return renderResult;
  };

  describe('Rendering and Interactions', () => {
    it('renders in view mode correctly', () => {
      const { getByTestId } = renderJournalEntry();

      expect(getByTestId('journal-entry')).toBeTruthy();
      expect(getByTestId('journal-entry-title')).toHaveTextContent('Test Entry');
      expect(getByTestId('journal-entry-content')).toHaveTextContent('Test content');
    });

    it('handles press events correctly', () => {
      const { getByTestId } = renderJournalEntry();
      fireEvent.press(getByTestId('journal-entry'));
      expect(mockOnPress).toHaveBeenCalled();
    });

    it('disables press events in edit mode', () => {
      const { getByTestId } = renderJournalEntry({ isEditing: true });
      fireEvent.press(getByTestId('journal-entry-edit-container'));
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('handles style prop correctly', () => {
      const customStyle = { backgroundColor: 'red' };
      const { getByTestId } = renderJournalEntry({ style: customStyle });
      expect(getByTestId('journal-entry')).toHaveStyle(customStyle);
    });
  });

  // Additional test suites for editing, audio, etc...
});