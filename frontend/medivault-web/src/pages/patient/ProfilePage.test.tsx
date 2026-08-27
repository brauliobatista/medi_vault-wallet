import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProfilePage from './ProfilePage'
import { getProfile, updateProfile, uploadProfilePhoto, deleteProfilePhoto, getAccessRequests } from '../../api/medical'
import { saveUser } from '../../hooks/useAuth'
import { LanguageProvider } from '../../i18n/LanguageContext'

vi.mock('../../api/medical', () => ({
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  uploadProfilePhoto: vi.fn(),
  deleteProfilePhoto: vi.fn(),
  getAccessRequests: vi.fn().mockResolvedValue([]),
}))

const mockedGetProfile = vi.mocked(getProfile)
const mockedUpdateProfile = vi.mocked(updateProfile)
const mockedUpload = vi.mocked(uploadProfilePhoto)
const mockedDelete = vi.mocked(deleteProfilePhoto)
const mockedGetAccessRequests = vi.mocked(getAccessRequests)

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
    <LanguageProvider>
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    </LanguageProvider>,
  )
}

describe('ProfilePage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    mockedUpdateProfile.mockResolvedValue({})
    mockedGetAccessRequests.mockResolvedValue([])
    saveUser({ id: '1', name: 'Ana Silva', role: 'Patient' }, 'token')
  })

  it('shows an "Adicionar foto" button and no photo <img> when there is no photo', async () => {
    mockedGetProfile.mockResolvedValue({ ...baseProfile })

    renderPage()

    expect(await screen.findByRole('button', { name: /Adicionar foto/ })).toBeInTheDocument()
    expect(screen.queryByAltText('Foto de perfil')).not.toBeInTheDocument()
  })

  it('renders the photo file input with camera capture enabled for mobile', async () => {
    mockedGetProfile.mockResolvedValue({ ...baseProfile })
    const { container } = renderPage()
    await screen.findByRole('button', { name: /Adicionar foto/ })

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toHaveAttribute('capture', 'user')
    expect(input).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp')
  })

  it('uploads the selected photo and refreshes the profile', async () => {
    mockedGetProfile
      .mockResolvedValueOnce({ ...baseProfile })
      .mockResolvedValueOnce({ ...baseProfile, photoUrl: '/uploads/profile-photos/ana.jpg' })
    mockedUpload.mockResolvedValue({ photoUrl: '/uploads/profile-photos/ana.jpg' })

    const { container } = renderPage()
    await screen.findByRole('button', { name: /Adicionar foto/ })

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['conteudo'], 'foto.jpg', { type: 'image/jpeg' })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => expect(mockedUpload).toHaveBeenCalledWith(file))
    expect(await screen.findByAltText('Foto de perfil')).toHaveAttribute('src', '/uploads/profile-photos/ana.jpg')
  })

  it('shows an error message when the upload fails', async () => {
    mockedGetProfile.mockResolvedValue({ ...baseProfile })
    mockedUpload.mockRejectedValue(new Error('invalid file'))

    const { container } = renderPage()
    await screen.findByRole('button', { name: /Adicionar foto/ })

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['conteudo'], 'malware.exe')
    fireEvent.change(input, { target: { files: [file] } })

    expect(await screen.findByText(/Não foi possível carregar a imagem/)).toBeInTheDocument()
  })

  it('removes the photo after confirming', async () => {
    mockedGetProfile
      .mockResolvedValueOnce({ ...baseProfile, photoUrl: '/uploads/profile-photos/ana.jpg' })
      .mockResolvedValueOnce({ ...baseProfile, photoUrl: null })
    mockedDelete.mockResolvedValue({} as never)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderPage()
    await screen.findByRole('button', { name: /Remover/ })

    fireEvent.click(screen.getByRole('button', { name: /Remover/ }))

    await waitFor(() => expect(mockedDelete).toHaveBeenCalled())
    expect(await screen.findByRole('button', { name: /Adicionar foto/ })).toBeInTheDocument()
  })
})

describe('ProfilePage - critical field confirmation popup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    saveUser({ id: 'u1', name: 'Ana Silva', role: 'Patient' }, 'token')
    mockedGetProfile.mockResolvedValue(baseProfile)
    mockedUpdateProfile.mockResolvedValue(baseProfile)
    mockedGetAccessRequests.mockResolvedValue([])
  })

  it('only allows changing the language while editing', async () => {
    mockedGetProfile.mockResolvedValue({ ...baseProfile })

    renderPage()
    await screen.findByRole('button', { name: /Editar/ })

    const languageLabel = screen.getByText('Idioma da Plataforma')
    const languageSelect = languageLabel.parentElement!.querySelector('select') as HTMLSelectElement
    expect(languageSelect).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: /Editar/ }))
    expect(languageSelect).toBeEnabled()
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
