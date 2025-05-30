import * as React from "react";

// PLACEHOLDER FILE - This isn't used anywhere yet (just Connor playing with Contexts)
// This will need to merge-with or replace colors, and then update things throughout the app...

const ThemeContext = React.createContext({
  toggleTheme: () => {},
  isThemeDark: false,
});

export default ThemeContext;