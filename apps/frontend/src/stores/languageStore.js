import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '../i18n';

export const useLanguageStore = create(
  persist(
    (set, get) => ({
      language: 'fr',
      dir: 'ltr',
      setLanguage: (lang) => {
        const dir = lang === 'ar' ? 'rtl' : 'ltr';
        i18n.changeLanguage(lang);
        document.documentElement.dir = dir;
        document.documentElement.lang = lang;
        set({ language: lang, dir });
      },
      initLanguage: () => {
        const { language, dir } = get();
        i18n.changeLanguage(language);
        document.documentElement.dir = dir;
        document.documentElement.lang = language;
      }
    }),
    {
      name: 'language-storage',
    }
  )
);
