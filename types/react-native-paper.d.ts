// Module augmentation that teaches react-native-paper's `useTheme()` about the
// custom color tokens our app adds in constants/Colors.ts (lightTheme/darkTheme).
//
// In react-native-paper v5 (MD3), `MD3Colors`/`MD3Theme` are exported as `type`
// aliases rather than `interface`s, so they cannot be extended via interface
// declaration-merging. Instead we add a `useTheme` overload whose default type
// parameter is an MD3 theme with our extra `colors`, so every bare `useTheme()`
// call site (e.g. components/Button.tsx, components/Text.tsx,
// components/SyncStatusChip.tsx) typechecks against the custom keys app-wide.
import 'react-native-paper';
import type { MD3Theme, MD3Colors } from 'react-native-paper';
import type { $DeepPartial } from '@callstack/react-theme-provider';

// Every custom color key added in constants/Colors.ts beyond Paper's base
// MD3Colors. All are `string`.
type AppCustomColors = {
  textDefault: string;
  iconDefault: string;
  modalBackground: string;
  onModalBackground: string;
  modalHeader: string;
  onModalHeader: string;
  disabled: string;
  onDisabled: string;
  syncSynced: string;
  syncPending: string;
  syncError: string;
  syncGuest: string;
};

type AppMD3Theme = Omit<MD3Theme, 'colors'> & {
  colors: MD3Colors & AppCustomColors;
};

declare module 'react-native-paper' {
  // Re-declaring the overload set: the no-generic default now resolves to our
  // extended theme, while explicit `useTheme<T>()` usages keep working.
  export function useTheme<T = AppMD3Theme>(overrides?: $DeepPartial<T>): T;
}
