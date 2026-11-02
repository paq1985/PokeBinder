import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Language } from '@/lib/translations';
import { supabase } from '@/lib/supabase';

type LanguageContextValue = {
  lang: Language;
  setLang: (lang: Language) => void;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const STORAGE_KEY = 'app_language';

function getInitialLang(): Language {
  try {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored === 'it' || stored === 'en' || stored === 'fr' || stored === 'de' || stored === 'es') {
      return stored;
    }
  } catch {
    // localStorage may not be available
  }
  return 'it';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(getInitialLang);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
    void (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (session.session?.user) {
        await supabase.from('profiles').update({ language: next }).eq('id', session.session.user.id);
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (session.session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('language')
          .eq('id', session.session.user.id)
          .maybeSingle();
        if (profile?.language) {
          const profileLang = profile.language as Language;
          setLangState(profileLang);
          try {
            if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, profileLang);
          } catch {
            // ignore
          }
        }
      }
    })();
  }, []);

  return <LanguageContext.Provider value={{ lang, setLang }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
