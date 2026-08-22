import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Navbar from './Navbar'
import { saveUser } from '../hooks/useAuth'

describe('Navbar', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders only the brand link when no user is logged in', () => {
    render(<Navbar />)

    expect(screen.getByText('MediVault')).toBeInTheDocument()
    expect(screen.queryByText(/Sair/)).not.toBeInTheDocument()
  })

  it('links the brand to /dashboard for a patient', () => {
    saveUser({ id: '1', name: 'Ana Silva', role: 'Patient' }, 'token')

    render(<Navbar />)

    expect(screen.getByRole('link', { name: /MediVault/ })).toHaveAttribute('href', '/dashboard')
  })

  it('links the brand to /doctor for a doctor', () => {
    saveUser({ id: '1', name: 'Dr. João Costa', role: 'Doctor' }, 'token')

    render(<Navbar />)

    expect(screen.getByRole('link', { name: /MediVault/ })).toHaveAttribute('href', '/doctor')
  })

  it('shows the logged-in user name and role badge', () => {
    saveUser({ id: '1', name: 'Ana Silva', role: 'Patient' }, 'token')

    render(<Navbar />)

    expect(screen.getByText('Ana Silva')).toBeInTheDocument()
    expect(screen.getByText('Patient')).toBeInTheDocument()
  })

  it('calls logout when the Sair button is clicked', () => {
    saveUser({ id: '1', name: 'Ana Silva', role: 'Patient' }, 'token')
    render(<Navbar />)
    const originalLocation = window.location
    Object.defineProperty(window, 'location', { configurable: true, value: { ...originalLocation, href: '' } })

    fireEvent.click(screen.getByRole('button', { name: /Sair/ }))

    expect(localStorage.getItem('token')).toBeNull()
    expect(window.location.href).toBe('/login')
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
  })
})
