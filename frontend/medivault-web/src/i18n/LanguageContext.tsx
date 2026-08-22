import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { DEFAULT_LANGUAGE, isLanguage, type Language } from './languages'
import pt from './locales/pt'
import en from './locales/en'
import es from './locales/es'
import fr from './locales/fr'
import de from './locales/de'
import it from './locales/it'

const dictionaries: Record<Language, Record<string, string>> = { pt, en, es, fr, de, it }

const STORAGE_KEY = 'language'

interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

function interpolate(str: string, vars?: Record<string, string | number>) {
  if (!vars) return str
  return str.replace(/\{(\w+)\}/g, (_, key: string) => (key in vars ? String(vars[key]) : `{${key}}`))
}

function readInitialLanguage(): Language {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved && isLanguage(saved) ? saved : DEFAULT_LANGUAGE
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readInitialLanguage)

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem(STORAGE_KEY, lang)
  }

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const dict = dictionaries[language]
  const t = (key: string, vars?: Record<string, string | number>) => {
    const raw = dict[key] ?? dictionaries[DEFAULT_LANGUAGE][key] ?? key
    return interpolate(raw, vars)
  }

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>
}

export function useTranslation() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useTranslation must be used within a LanguageProvider')
  return ctx
}
