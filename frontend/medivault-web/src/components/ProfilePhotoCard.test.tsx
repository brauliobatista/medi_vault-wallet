import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ProfilePhotoCard from './ProfilePhotoCard'
import { cropToSquare } from '../utils/image'
import { LanguageProvider } from '../i18n/LanguageContext'

vi.mock('../utils/image', () => ({
  cropToSquare: vi.fn((file: File) => Promise.resolve(new File([file], 'cropped.jpg', { type: 'image/jpeg' }))),
}))

const mockedCrop = vi.mocked(cropToSquare)

function setup(overrides: Partial<React.ComponentProps<typeof ProfilePhotoCard>> = {}) {
  const uploadPhoto = vi.fn().mockResolvedValue({ photoUrl: '/uploads/profile-photos/new.jpg' })
  const deletePhoto = vi.fn().mockResolvedValue({})
  const onPhotoChange = vi.fn()
  const props = {
    photoUrl: null as string | null,
    fallbackInitial: 'A',
    uploadPhoto,
    deletePhoto,
    onPhotoChange,
    ...overrides,
  }
  const utils = render(
    <LanguageProvider>
      <ProfilePhotoCard {...props} />
    </LanguageProvider>,
  )
  return { uploadPhoto, deletePhoto, onPhotoChange, ...utils }
}

const fileInput = (container: HTMLElement) =>
  container.querySelector('input[type="file"]') as HTMLInputElement

describe('ProfilePhotoCard', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('shows the fallback initial and the upload/camera buttons when there is no photo', () => {
    setup()

    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Carregar foto/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Usar câmara/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Remover/ })).not.toBeInTheDocument()
  })

  it('resolves the stored photo path through mediaUrl for the <img> src', () => {
    setup({ photoUrl: '/uploads/profile-photos/ana.jpg' })

    expect(screen.getByAltText('Foto de perfil')).toHaveAttribute('src', '/uploads/profile-photos/ana.jpg')
  })

  it('crops the picked file before uploading and reports the new photo path', async () => {
    const { container, uploadPhoto, onPhotoChange } = setup()
    const picked = new File(['bytes'], 'huge-photo.png', { type: 'image/png' })

    fireEvent.change(fileInput(container), { target: { files: [picked] } })

    await waitFor(() => expect(onPhotoChange).toHaveBeenCalledWith('/uploads/profile-photos/new.jpg'))
    expect(mockedCrop).toHaveBeenCalledWith(picked)
    const uploaded = uploadPhoto.mock.calls[0][0] as File
    expect(uploaded.name).toBe('cropped.jpg')
  })

  it('shows an error and does not report a change when the upload fails', async () => {
    const uploadPhoto = vi.fn().mockRejectedValue(new Error('bad file'))
    const { container, onPhotoChange } = setup({ uploadPhoto })

    fireEvent.change(fileInput(container), { target: { files: [new File(['x'], 'x.png', { type: 'image/png' })] } })

    expect(await screen.findByText(/Não foi possível carregar a imagem/)).toBeInTheDocument()
    expect(onPhotoChange).not.toHaveBeenCalled()
  })

  it('removes the photo after confirmation and reports null', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { deletePhoto, onPhotoChange } = setup({ photoUrl: '/uploads/profile-photos/ana.jpg' })

    fireEvent.click(screen.getByRole('button', { name: /Remover/ }))

    await waitFor(() => expect(deletePhoto).toHaveBeenCalled())
    expect(onPhotoChange).toHaveBeenCalledWith(null)
  })

  it('does not remove the photo when the confirmation is dismissed', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { deletePhoto, onPhotoChange } = setup({ photoUrl: '/uploads/profile-photos/ana.jpg' })

    fireEvent.click(screen.getByRole('button', { name: /Remover/ }))

    expect(deletePhoto).not.toHaveBeenCalled()
    expect(onPhotoChange).not.toHaveBeenCalled()
  })
})
