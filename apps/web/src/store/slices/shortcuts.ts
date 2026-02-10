import { createSlice } from '@reduxjs/toolkit';

import type { PayloadAction } from '@reduxjs/toolkit';

export interface ShortcutBinding {
  id: string;
  action: string;
  label: string;
  description: string;
  keys: string;
  scope: string;
  sequence: boolean;
  enabled: boolean;
}

export interface ShortcutsState {
  profileId: string | null;
  bindings: ShortcutBinding[];
  commandPaletteOpen: boolean;
}

const initialState: ShortcutsState = {
  profileId: null,
  bindings: [],
  commandPaletteOpen: false,
};

export const shortcutsSlice = createSlice({
  name: 'shortcuts',
  initialState,
  reducers: {
    setProfile(state, action: PayloadAction<{ id: string; bindings: ShortcutBinding[] }>) {
      state.profileId = action.payload.id;
      state.bindings = action.payload.bindings;
    },
    updateBinding(state, action: PayloadAction<{ id: string; keys?: string; enabled?: boolean }>) {
      const binding = state.bindings.find((b) => b.id === action.payload.id);
      if (binding) {
        if (action.payload.keys !== undefined) binding.keys = action.payload.keys;
        if (action.payload.enabled !== undefined) binding.enabled = action.payload.enabled;
      }
    },
    toggleCommandPalette(state) {
      state.commandPaletteOpen = !state.commandPaletteOpen;
    },
    openCommandPalette(state) {
      state.commandPaletteOpen = true;
    },
    closeCommandPalette(state) {
      state.commandPaletteOpen = false;
    },
  },
});

export const { setProfile, updateBinding, toggleCommandPalette, openCommandPalette, closeCommandPalette } =
  shortcutsSlice.actions;
