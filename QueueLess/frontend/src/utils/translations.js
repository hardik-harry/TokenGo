import i18n from '../i18n';

export const translations = {}; // Kept for backwards compatibility if anyone directly accesses it, but they shouldn't.

export const getTranslation = (key, lang) => {
  // We ignore `lang` since i18next manages the current language globally,
  // but if needed we could pass { lng: lang } to i18n.t
  return i18n.t(key);
};
