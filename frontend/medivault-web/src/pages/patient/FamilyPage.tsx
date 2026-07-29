import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import {
  getFamily, getPendingInvitations, getRelationshipTypes,
  searchUserByEmail, inviteByEmail, createDependent,
  respondToGuardianship, removeGuardianship,
} from '../../api/family'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type RelationshipType = { id: number; code: string; description: string | null }

const relationshipLabels: Record<string, string> = {
  parent: 'Pai / Mãe',
  legal_guardian: 'Tutor legal',
  tutor: 'Tutor de menor',
  other: 'Outro',
}

export default function FamilyPage() {
  const [family, setFamily] = useState<Record<string, unknown>[]>([])
  const [invitations, setInvitations] = useState<Record<string, unknown>[]>([])
  const [relationshipTypes, setRelationshipTypes] = useState<RelationshipType[]>([])
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null)

  const [email, setEmail] = useState('')
  const [relationshipTypeId, setRelationshipTypeId] = useState<number | ''>('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [foundUser, setFoundUser] = useState<{ userId: string; name: string } | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState({ firstName: '', lastName: '', birthday: '', biologicalGender: 'M', sex: 'M' })

  const refresh = () => {
    getFamily().then(setFamily)
    getPendingInvitations().then(setInvitations)
  }

  useEffect(() => {
    refresh()
    getRelationshipTypes().then(setRelationshipTypes)
  }, [])

  const flash = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  const resetAddForm = () => {
    setEmail('')
    setRelationshipTypeId('')
    setSearchError(null)
    setFoundUser(null)
    setShowCreateForm(false)
    setCreateForm({ firstName: '', lastName: '', birthday: '', biologicalGender: 'M', sex: 'M' })
  }

  const handleSearch = async () => {
    setSearchError(null)
    setFoundUser(null)
    setShowCreateForm(false)
    if (!EMAIL_RE.test(email.trim())) {
      setSearchError('Introduza um email válido.')
      return
    }
    if (relationshipTypeId === '') {
      setSearchError('Selecione o tipo de relação.')
      return
    }
    setSearching(true)
    try {
      const result = await searchUserByEmail(email.trim())
      setFoundUser(result)
    } catch {
      setShowCreateForm(true)
    } finally {
      setSearching(false)
    }
  }

  const handleInvite = async () => {
    if (relationshipTypeId === '') return
    try {
      await inviteByEmail(email.trim(), Number(relationshipTypeId))
      flash('Convite enviado. A pessoa tem de aceitar para o vínculo ficar ativo.')
      resetAddForm()
      refresh()
    } catch {
      setSearchError('Não foi possível enviar o convite.')
    }
  }

  const handleCreateDependent = async () => {
    if (relationshipTypeId === '') return
    if (!createForm.firstName.trim() || !createForm.lastName.trim() || !createForm.birthday) {
      setSearchError('Preencha todos os campos obrigatórios.')
      return
    }
    try {
      await createDependent({ ...createForm, relationshipTypeId: Number(relationshipTypeId) })
      flash('Perfil criado e adicionado ao agregado familiar.')
      resetAddForm()
      refresh()
    } catch {
      setSearchError('Não foi possível criar o perfil.')
    }
  }

  const handleRespond = async (id: number, action: 'approve' | 'decline') => {
    setInvitations((prev) => prev.filter((i) => Number(i.guardianshipId) !== id))
    try {
      await respondToGuardianship(id, action)
      flash(action === 'approve' ? 'Convite aceite.' : 'Convite recusado.')
      refresh()
    } catch {
      refresh()
    }
  }

  const handleRemove = async (id: number) => {
    setConfirmRemove(null)
    setFamily((prev) => prev.filter((f) => Number(f.guardianshipId) !== id))
    try {
      await removeGuardianship(id)
      flash('Removido do agregado familiar.')
    } catch {
      refresh()
    }
  }

  const badgeClass: Record<string, string> = { pending: 'warning text-dark', approved: 'success' }

  return (
    <Layout>
      <div style={{ maxWidth: 700 }}>
        {successMsg && <div className="alert alert-success py-2 mb-3">{successMsg}</div>}

        {invitations.length > 0 && (
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white fw-semibold border-bottom">
              <i className="bi bi-envelope-paper me-2 text-primary" />
              Convites recebidos
            </div>
            <div className="list-group list-group-flush">
              {invitations.map((i) => (
                <div key={String(i.guardianshipId)} className="list-group-item d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div>
                    <div className="fw-semibold">{String(i.name)}</div>
                    <small className="text-muted">
                      Quer adicioná-lo(a) como {relationshipLabels[String(i.relationshipCode)] ?? String(i.relationshipCode)}
                    </small>
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-success btn-sm" onClick={() => handleRespond(Number(i.guardianshipId), 'approve')}>
                      <i className="bi bi-check me-1" />Aceitar
                    </button>
                    <button className="btn btn-outline-danger btn-sm" onClick={() => handleRespond(Number(i.guardianshipId), 'decline')}>
                      <i className="bi bi-x me-1" />Recusar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white fw-semibold border-bottom">
            <i className="bi bi-people me-2 text-primary" />
            O meu agregado familiar
          </div>
          {family.length === 0 ? (
            <div className="card-body">
              <p className="text-muted mb-0">Ainda não adicionou ninguém ao seu agregado familiar.</p>
            </div>
          ) : (
            <div className="list-group list-group-flush">
              {family.map((f) => (
                <div key={String(f.guardianshipId)} className="list-group-item d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div>
                    <div className="fw-semibold">
                      {String(f.name)}
                      {Boolean(f.isDependent) && <span className="badge bg-light text-muted border ms-2">Sem login próprio</span>}
                    </div>
                    <small className="text-muted">{relationshipLabels[String(f.relationshipCode)] ?? String(f.relationshipCode)}</small>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span className={`badge bg-${badgeClass[String(f.status)] ?? 'secondary'}`}>{String(f.status)}</span>
                    {confirmRemove === Number(f.guardianshipId) ? (
                      <div className="d-flex align-items-center gap-2">
                        <span className="text-muted small">Remover?</span>
                        <button className="btn btn-danger btn-sm" onClick={() => handleRemove(Number(f.guardianshipId))}>Sim</button>
                        <button className="btn btn-outline-secondary btn-sm" onClick={() => setConfirmRemove(null)}>Cancelar</button>
                      </div>
                    ) : (
                      <button className="btn btn-outline-danger btn-sm" onClick={() => setConfirmRemove(Number(f.guardianshipId))}>
                        <i className="bi bi-x me-1" />Remover
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white fw-semibold border-bottom">
            <i className="bi bi-person-plus me-2 text-primary" />
            Adicionar familiar
          </div>
          <div className="card-body">
            <div className="row g-2 align-items-end">
              <div className="col-md-6">
                <label className="form-label small text-muted">Email da pessoa</label>
                <input
                  type="email"
                  className="form-control form-control-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@email.pt"
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small text-muted">Tipo de relação</label>
                <select
                  className="form-select form-select-sm"
                  value={relationshipTypeId}
                  onChange={(e) => setRelationshipTypeId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">Selecione...</option>
                  {relationshipTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>{relationshipLabels[rt.code] ?? rt.code}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <button className="btn btn-primary btn-sm w-100" disabled={searching} onClick={handleSearch}>
                  {searching ? <span className="spinner-border spinner-border-sm" /> : 'Pesquisar'}
                </button>
              </div>
            </div>

            {searchError && <div className="alert alert-danger py-2 mt-3 mb-0">{searchError}</div>}

            {foundUser && (
              <div className="alert alert-light border d-flex justify-content-between align-items-center mt-3 mb-0">
                <span><i className="bi bi-person-check me-2 text-success" />{foundUser.name}</span>
                <button className="btn btn-success btn-sm" onClick={handleInvite}>
                  <i className="bi bi-send me-1" />Convidar
                </button>
              </div>
            )}

            {showCreateForm && (
              <div className="border rounded p-3 mt-3">
                <p className="text-muted small mb-3">
                  Não encontrámos ninguém com este email. Pode criar um perfil que fica totalmente sob a sua gestão (sem login próprio).
                </p>
                <div className="row g-2">
                  <div className="col-md-6">
                    <label className="form-label small text-muted">Nome próprio</label>
                    <input className="form-control form-control-sm" value={createForm.firstName}
                      onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small text-muted">Apelido</label>
                    <input className="form-control form-control-sm" value={createForm.lastName}
                      onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small text-muted">Data de nascimento</label>
                    <input type="date" className="form-control form-control-sm" value={createForm.birthday}
                      onChange={(e) => setCreateForm({ ...createForm, birthday: e.target.value })} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small text-muted">Sexo biológico</label>
                    <select className="form-select form-select-sm" value={createForm.biologicalGender}
                      onChange={(e) => setCreateForm({ ...createForm, biologicalGender: e.target.value })}>
                      <option value="M">M</option>
                      <option value="F">F</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small text-muted">Sexo</label>
                    <select className="form-select form-select-sm" value={createForm.sex}
                      onChange={(e) => setCreateForm({ ...createForm, sex: e.target.value })}>
                      <option value="M">M</option>
                      <option value="F">F</option>
                    </select>
                  </div>
                </div>
                <button className="btn btn-primary btn-sm mt-3" onClick={handleCreateDependent}>
                  <i className="bi bi-plus-lg me-1" />Criar e adicionar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
