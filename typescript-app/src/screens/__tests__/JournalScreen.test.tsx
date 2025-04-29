import React from 'react';
import {
  render,
  fireEvent,
  act,
  wait,
  createMockNavigation,
  createMockRoute,
  createNavigationEvent,
  triggerNavigationEvent,
  type MockFunction
} from '../../test-utils/test-library';
import { JournalScreen } from '../JournalScreen';
import * as journalService from '../../services/journal';
import type { JournalEntry } from '../../types/journal';

// Mock journal service
jest.mock('../../services/journal', () => ({
  getAllJournalEntries: jest.fn(),
  saveJournalEntry: jest.fn(),
  deleteJournalEntry: jest.fn(),
}));

// Mock entries
const mockEntries: JournalEntry[] = [
  {
    id: 'entry-1',
    title: 'First Entry',
    content: 'Test content 1',
    type: 'text',
    date: '2025-04-29',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'entry-2',
    title: 'Second Entry',
    content: 'Test content 2',
    type: 'text',
    date: '2025-04-29',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

describe('JournalScreen Component', () => {
  const mockNavigation = createMockNavigation();
  const mockRoute = createMockRoute();
  const getAllEntriesMock = journalService.getAllJournalEntries as MockFunction;
  const saveEntryMock = journalService.saveJournalEntry as MockFunction;
  const deleteEntryMock = journalService.deleteJournalEntry as MockFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    getAllEntriesMock.mockResolvedValue(mockEntries);
  });

  it('renders loading state initially', () => {
    const { getByTestId } = render(
      <JournalScreen navigation={mockNavigation} route={mockRoute} />
    );
    
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('renders journal entries after loading', async () => {
    const { getByText, queryByTestId } = render(
      <JournalScreen navigation={mockNavigation} route={mockRoute} />
    );

    await act(async () => {
      await wait();
    });

    expect(queryByTestId('loading-indicator')).toBeNull();
    expect(getByText('First Entry')).toBeTruthy();
    expect(getByText('Second Entry')).toBeTruthy();
  });

  it('reloads entries on focus', async () => {
    const { getByText } = render(
      <JournalScreen navigation={mockNavigation} route={mockRoute} />
    );

    await act(async () => {
      await wait();
    });

    // Clear first load
    getAllEntriesMock.mockClear();

    // Trigger focus event
    await act(async () => {
      triggerNavigationEvent(mockNavigation, createNavigationEvent('focus'));
      await wait();
    });

    // Verify service was called
    expect(getAllEntriesMock).toHaveBeenCalledTimes(1);
  });

  it('creates new entry when add button is pressed', async () => {
    const { getByTestId } = render(
      <JournalScreen navigation={mockNavigation} route={mockRoute} />
    );

    await act(async () => {
      fireEvent.press(getByTestId('add-entry-button'));
      await wait();
    });

    expect(saveEntryMock).toHaveBeenCalled();
  });

  it('deletes entry when delete is triggered', async () => {
    const { getAllByTestId } = render(
      <JournalScreen navigation={mockNavigation} route={mockRoute} />
    );

    await act(async () => {
      await wait();
    });

    const deleteButtons = getAllByTestId('delete-entry-button');
    await act(async () => {
      fireEvent.press(deleteButtons[0]);
      await wait();
    });

    expect(deleteEntryMock).toHaveBeenCalledWith('entry-1');
  });

  it('handles errors when loading entries', async () => {
    const error = new Error('Failed to load entries');
    getAllEntriesMock.mockRejectedValue(error);

    const { getByTestId } = render(
      <JournalScreen navigation={mockNavigation} route={mockRoute} />
    );

    await act(async () => {
      await wait();
    });

    expect(getByTestId('error-message')).toBeTruthy();
  });
});