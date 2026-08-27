export type Language = 'pt' | 'en' | 'es' | 'fr' | 'de' | 'it'

export const DEFAULT_LANGUAGE: Language = 'pt'

export const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'pt', label: 'Português' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
]

export function isLanguage(value: string): value is Language {
  return LANGUAGES.some((l) => l.code === value)
}
