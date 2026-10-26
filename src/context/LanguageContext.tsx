import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { en } from '../i18n/en';
import { ta } from '../i18n/ta';

type Language = 'en' | 'ta';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string) => string;
  ts: (stageName: string) => string;
  tstat: (status: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('trizen_lang');
    return (saved as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('trizen_lang', lang);
    document.documentElement.lang = lang;
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = (path: string): string => {
    const keys = path.split('.');
    let current: any = language === 'en' ? en : ta;

    for (const key of keys) {
      if (current[key] === undefined) {
        // Fallback to English if key missing in Tamil
        let englishFallback: any = en;
        for (const fallbackKey of keys) {
          if (englishFallback[fallbackKey] === undefined) {
            return path; // Return path if not found in English either
          }
          englishFallback = englishFallback[fallbackKey];
        }
        return englishFallback;
      }
      current = current[key];
    }

    return current;
  };

  const ts = (name: string): string => {
    if (!name) return name;
    if (name.includes('Threading') || name.includes('Raw')) return t('stages.threading');
    if (name.includes('Dyeing')) return t('stages.dyeing');
    if (name.includes('Warping') || name.includes('Vaarpu')) return t('stages.warping');
    if (name.includes('Weaving') || name.includes('Loom')) return t('stages.weaving');
    if (name.includes('Finishing')) return t('stages.finishing');
    if (name.includes('Quality') || name.includes('Inspection')) return t('stages.inspection');
    if (name.includes('Packing') || name.includes('Stock')) return t('stages.packing');
    return name;
  };

  const tstat = (status: string): string => {
    if (!status) return status;
    const key = status.toLowerCase();
    if (key === 'pending_approval') return t('status.pending_approval');
    if (key === 'ready_for_assignment') return t('status.ready_for_assignment');
    if (key === 'in_progress') return t('status.in_progress');
    if (key === 'under_review') return t('status.under_review');
    if (key === 'submitted_for_review') return t('status.under_review');
    if (key === 'work_offered') return t('status.pending');
    if (key === 'rework_required') return t('batch.rework_reason');
    
    // Default lookup
    return t(`status.${key}`) !== `status.${key}` ? t(`status.${key}`) : status;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, ts, tstat }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
