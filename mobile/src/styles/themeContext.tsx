import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeTokens } from './themes/types';
import { warmPaper } from './themes/warmPaper';

// We can add more themes here later
export const THEMES: Record<string, ThemeTokens> = {
  warmPaper,
};

const THEME_STORAGE_KEY = '@app_theme_name';

interface ThemeContextType {
  theme: ThemeTokens;
  themeName: string;
  setThemeName: (name: string) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: warmPaper,
  themeName: 'warmPaper',
  setThemeName: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeName, setThemeNameState] = useState<string>('warmPaper');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (storedTheme && THEMES[storedTheme]) {
          setThemeNameState(storedTheme);
        }
      } catch (e) {
        console.error('Failed to load theme preference', e);
      } finally {
        setIsReady(true);
      }
    };
    loadTheme();
  }, []);

  const setThemeName = async (name: string) => {
    if (THEMES[name]) {
      setThemeNameState(name);
      try {
        await AsyncStorage.setItem(THEME_STORAGE_KEY, name);
      } catch (e) {
        console.error('Failed to save theme preference', e);
      }
    }
  };

  if (!isReady) {
    return null; // or a splash screen equivalent
  }

  const theme = THEMES[themeName] || warmPaper;

  return (
    <ThemeContext.Provider value={{ theme, themeName, setThemeName }}>
      {children}
    </ThemeContext.Provider>
  );
};
