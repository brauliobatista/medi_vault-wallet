import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DoctorProfilePage from './DoctorProfilePage'
import { saveUser } from '../../hooks/useAuth'
import { getDoctorProfile } from '../../api/medical'
import { LanguageProvider } from '../../i18n/LanguageContext'

vi.mock('../../api/medical', () => ({
  getDoctorProfile: vi.fn(),
  updateDoctorProfile: vi.fn(),
  changeDoctorPassword: vi.fn(),
}))

const mockedGet = vi.mocked(getDoctorProfile)

function renderPage() {
  return render(
    <LanguageProvider>
      <MemoryRouter>
        <DoctorProfilePage />
      </MemoryRouter>
    </LanguageProvider>,
  )
}

const baseProfile = {
  id: '1',
  ordemMedicosId: 'OM12345',
  firstName: 'João',
  lastName: 'Costa',
  email: 'joao.costa@example.com',
  speciality: 'Cardiologia',
  institutionId: 'inst-1',
  institutionName: 'Hospital Central',
  nationalityName: 'Portuguesa',
}

describe('DoctorProfilePage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    saveUser({ id: '1', name: 'João Costa', role: 'Doctor' }, 'token')
  })

  it('shows the institution name, type badge, address and phone', async () => {
    mockedGet.mockResolvedValue({
      ...baseProfile,
      institutionType: 'hospital',
      institutionAddress: 'Rua A, 123',
      institutionPhone: '212345678',
    })

    renderPage()

    expect(await screen.findByText('Hospital Central')).toBeInTheDocument()
    expect(screen.getByText('Hospital')).toBeInTheDocument()
    expect(screen.getByText('Rua A, 123')).toBeInTheDocument()
    expect(screen.getByText('212345678')).toBeInTheDocument()
  })

  it('only allows changing the language while editing', async () => {
    mockedGet.mockResolvedValue({ ...baseProfile })

    renderPage()
    await screen.findByText('Hospital Central')

    const languageLabel = screen.getByText('Idioma da Plataforma')
    const languageSelect = languageLabel.parentElement!.querySelector('select') as HTMLSelectElement
    expect(languageSelect).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: /Editar/ }))
    expect(languageSelect).toBeEnabled()
  })

  it('does not render the address/phone line when the institution has none', async () => {
    mockedGet.mockResolvedValue({
      ...baseProfile,
      institutionType: 'clinic',
      institutionAddress: null,
      institutionPhone: null,
    })

    renderPage()

    expect(await screen.findByText('Hospital Central')).toBeInTheDocument()
    expect(screen.getByText('Clínica')).toBeInTheDocument()
    expect(screen.queryByText(/Rua/)).not.toBeInTheDocument()
  })
})
