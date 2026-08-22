import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DoctorProfilePage from './DoctorProfilePage'
import { saveUser } from '../../hooks/useAuth'
import { getDoctorProfile } from '../../api/medical'

vi.mock('../../api/medical', () => ({
  getDoctorProfile: vi.fn(),
  updateDoctorProfile: vi.fn(),
  changeDoctorPassword: vi.fn(),
}))

const mockedGet = vi.mocked(getDoctorProfile)

function renderPage() {
  return render(
    <MemoryRouter>
      <DoctorProfilePage />
    </MemoryRouter>,
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
})
