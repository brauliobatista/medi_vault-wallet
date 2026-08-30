import { useState } from 'react'
import { LANGUAGES, type Language } from '../i18n/languages'
import { useTranslation } from '../i18n/LanguageContext'

interface Props {
  value: Language
  editing: boolean
  // Persists the new language to the backend for the current account (doctor or patient).
  onSave: (lang: Language) => Promise<void>
}

export default function LanguageSelector({ value, editing, onSave }: Props) {
  const { t, setLanguage } = useTranslation()
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value as Language
    setLanguage(lang)
    setSaving(true)
    setStatus('idle')
    try {
      await onSave(lang)
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 3000)
    } catch {
      setStatus('error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="col-sm-6">
      <label className="form-label text-muted small mb-0">{t('profile.language')}</label>
      <div className="d-flex align-items-center gap-2">
        <select className="form-select form-select-sm" value={value} onChange={handleChange} disabled={saving || !editing}>
          {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
        {saving && <span className="spinner-border spinner-border-sm text-muted" />}
      </div>
      {status === 'saved' && <div className="text-success small mt-1">{t('profile.languageSaved')}</div>}
      {status === 'error' && <div className="text-danger small mt-1">{t('profile.languageError')}</div>}
    </div>
  )
}
