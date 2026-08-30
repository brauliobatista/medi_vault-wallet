import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CountryCodeSelect from './CountryCodeSelect'
import { LanguageProvider } from '../i18n/LanguageContext'

function renderSelect(value: string, onChange: (code: string) => void) {
  return render(
    <LanguageProvider>
      <CountryCodeSelect value={value} onChange={onChange} />
    </LanguageProvider>,
  )
}

describe('CountryCodeSelect', () => {
  it('shows the placeholder when no value is selected', () => {
    renderSelect('', vi.fn())
    expect(screen.getByRole('button', { name: 'Selecionar…' })).toBeInTheDocument()
  })

  it('shows "+code Country" once a value is selected', () => {
    renderSelect('351', vi.fn())
    expect(screen.getByRole('button', { name: '+351 Portugal' })).toBeInTheDocument()
  })

  it('opens on click and lists every country', () => {
    renderSelect('', vi.fn())
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar…' }))
    expect(screen.getByText('+34')).toBeInTheDocument()
    expect(screen.getByText('+49')).toBeInTheDocument()
    expect(screen.getByText('Portugal')).toBeInTheDocument()
  })

  it('filters the list by country name as the user types', () => {
    renderSelect('', vi.fn())
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar…' }))
    fireEvent.change(screen.getByPlaceholderText('Pesquisar'), { target: { value: 'Alemanha' } })
    expect(screen.getByText('Alemanha')).toBeInTheDocument()
    expect(screen.queryByText('Espanha')).not.toBeInTheDocument()
  })

  it('filters the list by calling code as the user types', () => {
    renderSelect('', vi.fn())
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar…' }))
    fireEvent.change(screen.getByPlaceholderText('Pesquisar'), { target: { value: '351' } })
    expect(screen.getByText('Portugal')).toBeInTheDocument()
    expect(screen.queryByText('Alemanha')).not.toBeInTheDocument()
  })

  it('shows a "no results" message when nothing matches', () => {
    renderSelect('', vi.fn())
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar…' }))
    fireEvent.change(screen.getByPlaceholderText('Pesquisar'), { target: { value: 'zzzzzz' } })
    expect(screen.getByText('Sem resultados.')).toBeInTheDocument()
  })

  it('calls onChange and closes the dropdown when a country is picked', () => {
    const onChange = vi.fn()
    renderSelect('', onChange)
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar…' }))
    fireEvent.change(screen.getByPlaceholderText('Pesquisar'), { target: { value: 'Alemanha' } })
    fireEvent.click(screen.getByText('Alemanha'))

    expect(onChange).toHaveBeenCalledWith('49')
    expect(screen.queryByPlaceholderText('Pesquisar')).not.toBeInTheDocument()
  })
})
