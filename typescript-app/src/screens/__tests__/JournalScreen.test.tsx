import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { JournalScreen } from '../JournalScreen';
import * as journalService from '../../services/journal';
import {
  createMockNavigation,
  createMockRoute,
  createNavigationEvent,
  triggerNavigationEvent,
  type NavigationEventType
} from '../../test-utils/navigation';
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

  beforeEach(() => {
    jest.clearAllMocks();
    (journalService.getAllJournalEntries as jest.Mock).mockResolvedValue(mockEntries);
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
      await new Promise(resolve => setTimeout(resolve, 0));
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
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Clear first load
    (journalService.getAllJournalEntries as jest.Mock).mockClear();

    // Trigger focus event
    await act(async () => {
      triggerNavigationEvent(mockNavigation, createNavigationEvent('focus'));
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(journalService.getAllJournalEntries).toHaveBeenCalledTimes(1);
  });

  it('creates new entry when add button is pressed', async () => {
    const { getByTestId } = render(
      <JournalScreen navigation={mockNavigation} route={mockRoute} />
    );

    await act(async () => {
      fireEvent.press(getByTestId('add-entry-button'));
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(journalService.saveJournalEntry).toHaveBeenCalled();
  });

  it('deletes entry when delete is triggered', async () => {
    const { getAllByTestId } = render(
      <JournalScreen navigation={mockNavigation} route={mockRoute} />
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    const deleteButtons = getAllByTestId('delete-entry-button');
    await act(async () => {
      fireEvent.press(deleteButtons[0]);
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(journalService.deleteJournalEntry).toHaveBeenCalledWith('entry-1');
  });

  it('handles errors when loading entries', async () => {
    (journalService.getAllJournalEntries as jest.Mock).mockRejectedValue(
      new Error('Failed to load entries')
    );

    const { getByTestId } = render(
      <JournalScreen navigation={mockNavigation} route={mockRoute} />
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(getByTestId('error-message')).toBeTruthy();
  });
});