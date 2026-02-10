import { configureStore } from '@reduxjs/toolkit';

import { authSlice } from './slices/auth';
import { shortcutsSlice } from './slices/shortcuts';

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    shortcuts: shortcutsSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['auth/setTokens'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
