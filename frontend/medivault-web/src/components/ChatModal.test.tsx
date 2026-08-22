import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ChatModal from './ChatModal'
import { getChatMessages, sendChatMessage } from '../api/medical'

vi.mock('../api/medical', () => ({
  getChatMessages: vi.fn(),
  sendChatMessage: vi.fn(),
}))

const mockedGet = vi.mocked(getChatMessages)
const mockedSend = vi.mocked(sendChatMessage)

describe('ChatModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows an empty state when there are no messages', async () => {
    mockedGet.mockResolvedValue([])

    render(<ChatModal userId="u1" onClose={() => {}} />)

    expect(await screen.findByText('Sem mensagens ainda.')).toBeInTheDocument()
  })

  it('renders loaded messages with author and content', async () => {
    mockedGet.mockResolvedValue([
      { id: 1, authorDoctorId: 'd1', authorName: 'Dr. João Costa', message: 'Olá', createdAt: '2024-01-01T10:00:00' },
    ])

    render(<ChatModal userId="u1" onClose={() => {}} />)

    expect(await screen.findByText('Dr. João Costa')).toBeInTheDocument()
    expect(screen.getByText('Olá')).toBeInTheDocument()
  })

  it('sends the typed message and reloads the list', async () => {
    mockedGet.mockResolvedValue([])
    mockedSend.mockResolvedValue({ id: 2, authorDoctorId: 'd1', authorName: 'Dr. João Costa', message: 'nova', createdAt: '2024-01-01T10:00:00' })

    render(<ChatModal userId="u1" onClose={() => {}} />)
    await screen.findByText('Sem mensagens ainda.')

    fireEvent.change(screen.getByPlaceholderText('Escrever mensagem…'), { target: { value: 'nova' } })
    const sendButton = screen.getAllByRole('button').find((b) => b.getAttribute('aria-label') !== 'Fechar')!
    fireEvent.click(sendButton)

    await waitFor(() => expect(mockedSend).toHaveBeenCalledWith('u1', 'nova'))
    expect(mockedGet).toHaveBeenCalledTimes(2)
  })

  it('does not send an empty or whitespace-only message', async () => {
    mockedGet.mockResolvedValue([])

    render(<ChatModal userId="u1" onClose={() => {}} />)
    await screen.findByText('Sem mensagens ainda.')

    fireEvent.change(screen.getByPlaceholderText('Escrever mensagem…'), { target: { value: '   ' } })
    const sendButton = screen.getAllByRole('button').find((b) => b.getAttribute('aria-label') !== 'Fechar')!
    fireEvent.click(sendButton)

    expect(mockedSend).not.toHaveBeenCalled()
  })
})
