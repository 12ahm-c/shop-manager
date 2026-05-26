
import { useTranslation } from 'react-i18next';
import { useLanguageStore } from '../stores/languageStore';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguageStore();

  const toggleLanguage = () => {
    const newLang = language === 'fr' ? 'ar' : 'fr';
    setLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-md transition-colors"
      aria-label="Switch language"
    >
      <Globe className="w-4 h-4" />
      <span>{language === 'fr' ? 'العربية' : 'Français'}</span>
    </button>
  );
}
