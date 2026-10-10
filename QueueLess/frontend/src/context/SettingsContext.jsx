import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { getTranslation } from '../utils/translations';
import i18n from '../i18n';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const { user } = useAuth();

  const [theme, setThemeState] = useState(() => localStorage.getItem('theme') || 'Light');
  const [language, setLanguageState] = useState(() => localStorage.getItem('language') || 'English');
  const [notifications, setNotificationsState] = useState(() => localStorage.getItem('notifications') !== 'false');
  const [isUpdating, setIsUpdating] = useState(false);

  // Apply theme to document body
  const applyTheme = useCallback((currentTheme) => {
    if (currentTheme === 'Dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }, []);

  // Sync theme changes with DOM and localStorage
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('theme', theme);
  }, [theme, applyTheme]);

  // Sync language with localStorage and i18next
  useEffect(() => {
    localStorage.setItem('language', language);
    i18n.changeLanguage(language);
  }, [language]);

  // Sync notifications with localStorage
  useEffect(() => {
    localStorage.setItem('notifications', notifications.toString());
  }, [notifications]);

  // Load preferences from backend when user logs in or changes
  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    const fetchBackendSettings = async () => {
      try {
        const res = await api.get('/auth/me/settings');
        if (isMounted && res.data) {
          if (res.data.theme) {
            setThemeState(res.data.theme);
            applyTheme(res.data.theme);
            localStorage.setItem('theme', res.data.theme);
          }
          if (res.data.language) {
            setLanguageState(res.data.language);
            localStorage.setItem('language', res.data.language);
          }
          if (typeof res.data.notifications_enabled === 'boolean') {
            setNotificationsState(res.data.notifications_enabled);
            localStorage.setItem('notifications', res.data.notifications_enabled.toString());
          }
        }
      } catch (err) {
        console.warn('Could not fetch backend user settings, using cached local settings.', err);
      }
    };

    fetchBackendSettings();
    return () => { isMounted = false; };
  }, [user, applyTheme]);

  const updateNotifications = async (enabled) => {
    setNotificationsState(enabled);
    localStorage.setItem('notifications', enabled.toString());
    if (!user) return true;

    setIsUpdating(true);
    try {
      await api.put('/auth/me/settings', { notifications_enabled: enabled });
      return true;
    } catch (err) {
      console.error('Failed to save notification settings:', err);
      // Don't violently revert for best UX, but report error
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  const updateLanguage = async (newLang) => {
    setLanguageState(newLang);
    localStorage.setItem('language', newLang);
    if (!user) return true;

    setIsUpdating(true);
    try {
      await api.put('/auth/me/settings', { language: newLang });
      return true;
    } catch (err) {
      console.error('Failed to save language settings:', err);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  const updateTheme = async (newTheme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (!user) return true;

    setIsUpdating(true);
    try {
      await api.put('/auth/me/settings', { theme: newTheme });
      return true;
    } catch (err) {
      console.error('Failed to save theme settings:', err);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  const t = useCallback((key) => {
    return getTranslation(key, language);
  }, [language]);

  return (
    <SettingsContext.Provider value={{
      theme,
      language,
      notifications,
      isUpdating,
      updateNotifications,
      updateLanguage,
      updateTheme,
      t
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
