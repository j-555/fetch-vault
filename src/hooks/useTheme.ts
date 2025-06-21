import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export type Theme = 'light' | 'dark';

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>('dark');
  const [isLoading, setIsLoading] = useState(true);
  const [themeVersion, setThemeVersion] = useState(0); // add version for forcing re-renders

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      setIsLoading(true);
      const savedTheme = await invoke<string>('get_theme');
      const validTheme = isValidTheme(savedTheme) ? savedTheme as Theme : 'dark';
      setTheme(validTheme);
      applyTheme(validTheme);
    } catch (error) {
      console.error('Failed to load theme:', error);
      setTheme('dark');
      applyTheme('dark');
    } finally {
      setIsLoading(false);
    }
  };

  const changeTheme = async (newTheme: Theme) => {
    try {
      setIsLoading(true);
      console.log('Changing theme to:', newTheme);
      
      // apply theme immediately to dom
      applyTheme(newTheme);
      
      // update state
      setTheme(newTheme);
      
      // save to backend
      await invoke('set_theme', { theme: newTheme });
      
      // force re-render by incrementing version
      setThemeVersion(prev => {
        console.log('Incrementing theme version from', prev, 'to', prev + 1);
        return prev + 1;
      });
      
      // force another dom update after state change
      setTimeout(() => {
        applyTheme(newTheme);
        console.log('Forced theme re-application');
      }, 10);
      
    } catch (error) {
      console.error('Failed to save theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyTheme = (themeValue: Theme) => {
    console.log('Applying theme:', themeValue);
    const html = document.documentElement;
    // remove all theme classes
    html.classList.remove('dark');
    
    if (themeValue === 'light') {
      // light theme - no additional classes needed
      console.log('Applied light theme (no classes)');
    } else if (themeValue === 'dark') {
      html.classList.add('dark');
      console.log('Applied dark theme');
    }
    
    console.log('Current HTML classes:', html.className);
  };

  const isValidTheme = (theme: string): theme is Theme => {
    return ['light', 'dark'].includes(theme);
  };

  return {
    theme,
    isLoading,
    changeTheme,
    applyTheme,
    themeVersion, // export theme version for components that need to re-render
  };
}; 