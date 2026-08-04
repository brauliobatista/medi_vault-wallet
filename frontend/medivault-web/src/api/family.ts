import api from './client'

export const getFamily = () => api.get('/family').then((r) => r.data)
export const getPendingInvitations = () => api.get('/family/invitations').then((r) => r.data)
export const getRelationshipTypes = () => api.get('/family/relationship-types').then((r) => r.data)
export const getGenders = () => api.get('/genders').then((r) => r.data)

export const searchUserByEmail = (email: string) =>
  api.get(`/family/search?email=${encodeURIComponent(email)}`).then((r) => r.data)

export const inviteByEmail = (email: string, relationshipTypeId: number) =>
  api.post('/family/invite', { email, relationshipTypeId }).then((r) => r.data)

export const createDependent = (data: object) =>
  api.post('/family/dependent', data).then((r) => r.data)

export const respondToGuardianship = (guardianshipId: number, action: 'approve' | 'decline') =>
  api.put(`/family/${guardianshipId}/respond`, { action })

export const removeGuardianship = (guardianshipId: number) =>
  api.delete(`/family/${guardianshipId}`)
