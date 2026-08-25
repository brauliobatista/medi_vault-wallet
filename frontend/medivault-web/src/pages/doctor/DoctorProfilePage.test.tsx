import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DoctorProfilePage from './DoctorProfilePage'
import { saveUser } from '../../hooks/useAuth'
import { getDoctorProfile, changeDoctorPassword } from '../../api/medical'
import { LanguageProvider } from '../../i18n/LanguageContext'

vi.mock('../../api/medical', () => ({
  getDoctorProfile: vi.fn(),
  updateDoctorProfile: vi.fn(),
  changeDoctorPassword: vi.fn(),
}))

const mockedGet = vi.mocked(getDoctorProfile)
const mockedChangePassword = vi.mocked(changeDoctorPassword)

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

  it('logs the doctor out shortly after a successful password change', async () => {
    mockedGet.mockResolvedValue({ ...baseProfile })
    mockedChangePassword.mockResolvedValue({} as never)
    const originalLocation = window.location
    Object.defineProperty(window, 'location', { configurable: true, value: { ...originalLocation, href: '' } })

    const { container } = renderPage()
    await screen.findByText('Hospital Central')

    fireEvent.click(screen.getByText('Alterar password'))
    const [current, next, confirm] = container.querySelectorAll('input[type="password"]')
    fireEvent.change(current, { target: { value: 'old-password' } })
    fireEvent.change(next, { target: { value: 'new-password' } })
    fireEvent.change(confirm, { target: { value: 'new-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Alterar password' }))

    expect(await screen.findByText(/Password alterada com sucesso/)).toBeInTheDocument()
    expect(localStorage.getItem('token')).toBe('token')

    await waitFor(() => expect(localStorage.getItem('token')).toBeNull(), { timeout: 3000 })
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
  })

  it('does not log out when the current password is wrong', async () => {
    mockedGet.mockResolvedValue({ ...baseProfile })
    mockedChangePassword.mockRejectedValue(new Error('wrong password'))

    const { container } = renderPage()
    await screen.findByText('Hospital Central')

    fireEvent.click(screen.getByText('Alterar password'))
    const [current, next, confirm] = container.querySelectorAll('input[type="password"]')
    fireEvent.change(current, { target: { value: 'wrong-password' } })
    fireEvent.change(next, { target: { value: 'new-password' } })
    fireEvent.change(confirm, { target: { value: 'new-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Alterar password' }))

    expect(await screen.findByText('Password atual incorreta.')).toBeInTheDocument()
    expect(localStorage.getItem('token')).toBe('token')
  })
})
