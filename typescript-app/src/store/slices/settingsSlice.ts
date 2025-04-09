import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  language: string;
  showLatinOnly: boolean;
  showTranslationOnly: boolean;
  showBoth: boolean;
  offlineMode: boolean;
}

const initialState: SettingsState = {
  theme: 'system',
  fontSize: 16,
  language: 'en',
  showLatinOnly: false,
  showTranslationOnly: false,
  showBoth: true,
  offlineMode: false,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.theme = action.payload;
    },
    setFontSize: (state, action: PayloadAction<number>) => {
      state.fontSize = action.payload;
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
    },
    setTextDisplay: (state, action: PayloadAction<{
      latinOnly?: boolean;
      translationOnly?: boolean;
      both?: boolean;
    }>) => {
      if (action.payload.latinOnly !== undefined) {
        state.showLatinOnly = action.payload.latinOnly;
        state.showTranslationOnly = false;
        state.showBoth = false;
      }
      if (action.payload.translationOnly !== undefined) {
        state.showTranslationOnly = action.payload.translationOnly;
        state.showLatinOnly = false;
        state.showBoth = false;
      }
      if (action.payload.both !== undefined) {
        state.showBoth = action.payload.both;
        state.showLatinOnly = false;
        state.showTranslationOnly = false;
      }
    },
    setOfflineMode: (state, action: PayloadAction<boolean>) => {
      state.offlineMode = action.payload;
    },
  },
});

export const {
  setTheme,
  setFontSize,
  setLanguage,
  setTextDisplay,
  setOfflineMode,
} = settingsSlice.actions;

export default settingsSlice.reducer;