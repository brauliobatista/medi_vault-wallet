import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProfilePage from './ProfilePage'
import { saveUser } from '../../hooks/useAuth'
import { getProfile, updateProfile } from '../../api/medical'

vi.mock('../../api/medical', () => ({
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  uploadProfilePhoto: vi.fn(),
  deleteProfilePhoto: vi.fn(),
  getAccessRequests: vi.fn().mockResolvedValue([]),
}))

const mockedGetProfile = vi.mocked(getProfile)
const mockedUpdateProfile = vi.mocked(updateProfile)

const baseProfile = {
  utentNumber: '123456789',
  firstName: 'Ana',
  lastName: 'Silva',
  birthday: '1990-01-01',
  bloodType: 'A+',
  nationalityName: 'Portuguesa',
  email: 'ana@example.com',
  phone: '912345678',
  profession: 'Engenheira',
  maritalStatus: 'Solteira',
  acceptsTransfusion: false,
  acceptsResuscitation: false,
  emergencyAccess: false,
  biologicalGender: 'F',
  sexId: 2,
  photoUrl: null,
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>,
  )
}

describe('ProfilePage - critical field confirmation popup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    saveUser({ id: 'u1', name: 'Ana Silva', role: 'Patient' }, 'token')
    mockedGetProfile.mockResolvedValue(baseProfile)
    mockedUpdateProfile.mockResolvedValue(baseProfile)
  })

  it('shows a warning popup instead of applying the change immediately when toggling "Aceita transfusão"', async () => {
    renderPage()
    await waitFor(() => expect(mockedGetProfile).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: /editar/i }))

    fireEvent.click(screen.getByLabelText('Aceita transfusão'))

    expect(await screen.findByText('Confirmar alteração')).toBeInTheDocument()
    expect(screen.getByText(/transfusões de sangue/)).toBeInTheDocument()
    expect(screen.getByLabelText('Aceita transfusão')).not.toBeChecked()
  })

  it('shows a warning popup when toggling "Manobras de reanimação"', async () => {
    renderPage()
    await waitFor(() => expect(mockedGetProfile).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: /editar/i }))

    fireEvent.click(screen.getByLabelText('Manobras de reanimação'))

    const heading = await screen.findByText('Confirmar alteração')
    const modal = within(heading.closest('.mv-modal-panel') as HTMLElement)
    expect(modal.getByText(/manobras de reanimação/i)).toBeInTheDocument()
  })

  it('applies the change once the user confirms the popup', async () => {
    renderPage()
    await waitFor(() => expect(mockedGetProfile).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: /editar/i }))

    fireEvent.click(screen.getByLabelText('Aceita transfusão'))
    const heading = await screen.findByText('Confirmar alteração')
    const modal = within(heading.closest('.mv-modal-panel') as HTMLElement)
    fireEvent.click(modal.getByRole('button', { name: 'Confirmar' }))

    expect(screen.queryByText('Confirmar alteração')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Aceita transfusão')).toBeChecked()
  })

  it('keeps the original value when the user cancels the popup', async () => {
    renderPage()
    await waitFor(() => expect(mockedGetProfile).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: /editar/i }))

    fireEvent.click(screen.getByLabelText('Aceita transfusão'))
    const heading = await screen.findByText('Confirmar alteração')
    const modal = within(heading.closest('.mv-modal-panel') as HTMLElement)
    fireEvent.click(modal.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByText('Confirmar alteração')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Aceita transfusão')).not.toBeChecked()
  })
})
