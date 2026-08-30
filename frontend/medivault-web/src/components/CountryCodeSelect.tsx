import { useEffect, useMemo, useRef, useState } from 'react'
import { COUNTRY_CALLING_CODES } from '../data/countryCallingCodes'
import { useTranslation } from '../i18n/LanguageContext'

interface CountryOption {
  iso2: string
  callingCode: string
  name: string
}

interface Props {
  value: string
  onChange: (callingCode: string) => void
  disabled?: boolean
}

// Searchable "+code Country" combobox for src/data/countryCallingCodes.ts.
// Country names are resolved via Intl.DisplayNames for the active language
// instead of a hand-maintained translation table, so the ~245-country list
// stays accurate without per-language upkeep.
export default function CountryCodeSelect({ value, onChange, disabled }: Props) {
  const { t, language } = useTranslation()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const options = useMemo<CountryOption[]>(() => {
    const displayNames = new Intl.DisplayNames([language], { type: 'region' })
    return COUNTRY_CALLING_CODES
      .map((c) => ({ ...c, name: displayNames.of(c.iso2) ?? c.iso2 }))
      .sort((a, b) => a.name.localeCompare(b.name, language))
  }, [language])

  const current = options.find((o) => o.callingCode === value)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.name.toLowerCase().includes(q) || o.callingCode.includes(q))
  }, [options, query])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleSelect = (option: CountryOption) => {
    onChange(option.callingCode)
    setOpen(false)
    setQuery('')
  }

  return (
    <div className="position-relative" ref={containerRef}>
      <button
        type="button"
        className="form-control form-control-sm text-start d-flex justify-content-between align-items-center"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
      >
        <span>{current ? `+${current.callingCode} ${current.name}` : t('common.select')}</span>
        <i className="bi bi-chevron-down small text-muted" />
      </button>
      {open && (
        <div className="dropdown-menu show p-0" style={{ maxHeight: 260, overflowY: 'auto', width: '100%' }}>
          <div className="p-2 border-bottom bg-white" style={{ position: 'sticky', top: 0 }}>
            <input
              autoFocus
              className="form-control form-control-sm"
              placeholder={t('common.search')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-muted small">{t('common.noResults')}</div>
          ) : (
            filtered.map((o) => (
              <button
                key={o.iso2}
                type="button"
                className={`dropdown-item d-flex justify-content-between${o.callingCode === value ? ' active' : ''}`}
                onClick={() => handleSelect(o)}
              >
                <span>{o.name}</span>
                <span className="text-muted">+{o.callingCode}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
