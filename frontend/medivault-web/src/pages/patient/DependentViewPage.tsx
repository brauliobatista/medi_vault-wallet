import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import Layout from '../../components/Layout'
import api from '../../api/client'
import {
  getSurgeries, addSurgery, deleteSurgery,
  getMedications, addMedication, deleteMedication,
  getAllergies, addAllergy, deleteAllergy,
  getAnalyticalExams, addAnalyticalExam,
  getVaccinations, addVaccination, deleteVaccination,
  getHabits, upsertHabit,
  getProfileFor, getQrCodeFor, toggleCardFor,
  getAccessRequestsFor, respondToRequestFor, deleteRequestFor,
} from '../../api/medical'

type TabKey = 'profile' | 'history' | 'medications' | 'allergies' | 'exams' | 'vaccinations' | 'habits' | 'access'

const habitTypes = [
  { value: 'alcohol', label: 'Álcool' },
  { value: 'tobacco', label: 'Tabaco' },
  { value: 'drugs', label: 'Drogas' },
  { value: 'gambling', label: 'Jogo' },
  { value: 'physical_activity', label: 'Atividade Física' },
]

const badgeClass: Record<string, string> = { pending: 'warning text-dark', approved: 'success', revoked: 'secondary' }

export default function DependentViewPage() {
  const { dependentId } = useParams<{ dependentId: string }>()
  const uid = dependentId!

  const [profile, setProfile] = useState<Record<string, unknown> | null>(null)
  const [accessDenied, setAccessDenied] = useState(false)
  const [tab, setTab] = useState<TabKey>('profile')
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [vaccines, setVaccines] = useState<{ id: number; name: string }[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [requests, setRequests] = useState<Record<string, unknown>[]>([])
  const [qrPayload, setQrPayload] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(true)
  const [cardActive, setCardActive] = useState<boolean | null>(null)
  const [confirmSuspend, setConfirmSuspend] = useState(false)
  const [cardLoading, setCardLoading] = useState(false)

  const flash = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  useEffect(() => {
    api.get('/vaccines').then((r) => setVaccines(r.data))
    getProfileFor(uid)
      .then((p) => { setProfile(p); setCardActive(Boolean(p.cardActive)) })
      .catch(() => setAccessDenied(true))
  }, [uid])

  const refreshAccess = () => {
    getAccessRequestsFor(uid).then(setRequests)
    getQrCodeFor(uid).then((d) => setQrPayload(d.payload)).finally(() => setQrLoading(false))
  }

  const loadTab = async (t: TabKey) => {
    setTab(t)
    setShowForm(false)
    setForm({})
    if (t === 'history') setData(await getSurgeries(uid))
    else if (t === 'medications') setData(await getMedications(uid))
    else if (t === 'allergies') setData(await getAllergies(uid))
    else if (t === 'exams') setData(await getAnalyticalExams(uid))
    else if (t === 'vaccinations') setData(await getVaccinations(uid))
    else if (t === 'habits') setData(await getHabits(uid))
    else if (t === 'access') refreshAccess()
  }

  const f = (k: string) => form[k] ?? ''
  const sf = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }))

  const handleAdd = async () => {
    if (tab === 'history') await addSurgery(uid, { surgeryName: f('name'), surgeryDate: f('date'), location: f('location'), notes: f('notes') })
    else if (tab === 'medications') await addMedication(uid, { activeSubstance: f('name'), dose: f('dose'), posology: f('posology'), startDate: f('date') })
    else if (tab === 'allergies') await addAllergy(uid, { activeSubstance: f('name'), allergicReaction: f('reaction'), severity: f('severity') })
    else if (tab === 'exams') await addAnalyticalExam(uid, { examDate: f('date'), laboratory: f('lab'), notes: f('notes'), parameters: [] })
    else if (tab === 'vaccinations') await addVaccination(uid, { vaccineId: Number(f('vaccineId')), doseNumber: f('dose'), administeredAt: f('date'), nextDueDate: f('nextDate'), institution: f('institution') })
    else if (tab === 'habits') await upsertHabit(uid, { type: f('type'), name: f('name'), frequency: f('frequency'), quantity: f('quantity'), startDate: f('date'), consumes: true })
    setShowForm(false)
    setForm({})
    loadTab(tab)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Remover este registo?')) return
    if (tab === 'history') await deleteSurgery(uid, id)
    else if (tab === 'medications') await deleteMedication(uid, id)
    else if (tab === 'allergies') await deleteAllergy(uid, id)
    else if (tab === 'vaccinations') await deleteVaccination(uid, id)
    loadTab(tab)
  }

  const handleCard = async (activate: boolean) => {
    setCardLoading(true)
    setConfirmSuspend(false)
    setCardActive(activate)
    try {
      await toggleCardFor(uid, activate)
      flash(activate ? 'MediCard ativado. Os médicos aprovados voltaram a ter acesso.' : 'MediCard suspenso. Todos os médicos perderam acesso.')
    } catch {
      setCardActive(!activate)
    } finally {
      setCardLoading(false)
    }
  }

  const handleApprove = async (id: number) => {
    setRequests((prev) => prev.map((r) => Number(r.id) === id ? { ...r, status: 'approved' } : r))
    try {
      await respondToRequestFor(uid, id, 'approve')
      flash('Acesso aprovado com sucesso.')
      refreshAccess()
    } catch {
      refreshAccess()
    }
  }

  const handleRevoke = async (id: number, label: string) => {
    setRequests((prev) => prev.filter((r) => Number(r.id) !== id))
    try {
      await deleteRequestFor(uid, id)
      flash(label)
    } catch {
      refreshAccess()
    }
  }

  const canDelete = ['history', 'medications', 'allergies', 'vaccinations'].includes(tab)

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'profile',      label: 'Perfil' },
    { key: 'history',      label: 'Cirurgias' },
    { key: 'medications',  label: 'Medicação' },
    { key: 'allergies',    label: 'Alergias' },
    { key: 'exams',        label: 'Análises' },
    { key: 'vaccinations', label: 'Vacinação' },
    { key: 'habits',       label: 'Hábitos' },
    { key: 'access',       label: 'Acesso' },
  ]

  if (accessDenied) return (
    <Layout>
      <div className="d-flex flex-column align-items-center py-5 text-center">
        <i className="bi bi-lock-fill text-danger mb-3" style={{ fontSize: '2.5rem' }} />
        <h5 className="fw-bold mb-2">Sem acesso</h5>
        <p className="text-muted mb-3">Não é guardião deste familiar ou o vínculo já não está ativo.</p>
        <Link to="/family" className="btn btn-primary btn-sm">Voltar ao Agregado Familiar</Link>
      </div>
    </Layout>
  )

  if (!profile) return (
    <Layout>
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" />
      </div>
    </Layout>
  )

  return (
    <Layout>
      {/* Header */}
      <div className="d-flex align-items-center gap-3 mb-4 flex-wrap">
        <Link to="/family" className="btn btn-outline-secondary btn-sm">
          <i className="bi bi-arrow-left me-1" />Voltar
        </Link>
        {profile.photoUrl ? (
          <img
            src={String(profile.photoUrl)}
            alt={String(profile.firstName ?? 'Familiar')}
            className="rounded-circle"
            style={{ width: 44, height: 44, objectFit: 'cover' }}
          />
        ) : (
          <i className="bi bi-person-vcard text-primary" style={{ fontSize: '1.75rem' }} />
        )}
        <div>
          <h5 className="mb-0 fw-semibold">
            {String(profile.firstName)} {String(profile.lastName)}
            {Boolean(profile.isDependent) && <span className="badge bg-light text-muted border ms-2">Sem login próprio</span>}
          </h5>
          <small className="text-muted font-monospace">{uid}</small>
        </div>
      </div>

      {successMsg && <div className="alert alert-success py-2 mb-3">{successMsg}</div>}

      <ul className="nav nav-tabs mb-3 flex-wrap">
        {tabs.map((t) => (
          <li className="nav-item" key={t.key}>
            <button className={`nav-link ${tab === t.key ? 'active' : ''}`} onClick={() => loadTab(t.key)}>
              {t.label}
            </button>
          </li>
        ))}
      </ul>

      {tab === 'profile' && (
        <div className="card border-0 shadow-sm" style={{ maxWidth: 700 }}>
          <div className="card-body">
            <div className="row g-3">
              <Field label="Nº Utente" value={String(profile.utentNumber)} />
              <Field label="Data de Nascimento" value={String(profile.birthday)} />
              <Field label="Grupo Sanguíneo" value={String(profile.bloodType ?? '-')} />
              <Field label="Email" value={String(profile.email ?? '-')} />
              <Field label="Telefone" value={String(profile.phone ?? '-')} />
              <Field label="Profissão" value={String(profile.profession ?? '-')} />
              <Field label="Aceita transfusão" value={profile.acceptsTransfusion ? 'Sim' : 'Não'} />
              <Field label="Manobras de reanimação" value={profile.acceptsResuscitation ? 'Sim' : 'Não'} />
            </div>
          </div>
        </div>
      )}

      {tab === 'access' && (
        <div style={{ maxWidth: 700 }}>
          {cardActive !== null && (
            <div className={`card border-0 shadow-sm mb-4 border-start border-4 ${cardActive ? 'border-success' : 'border-danger'}`}>
              <div className="card-body d-flex justify-content-between align-items-center flex-wrap gap-3">
                <div className="d-flex align-items-center gap-3">
                  <i className={`bi ${cardActive ? 'bi-shield-check text-success' : 'bi-shield-x text-danger'}`} style={{ fontSize: '2rem' }} />
                  <div>
                    <div className="fw-semibold">{cardActive ? 'MediCard Ativo' : 'MediCard Suspenso'}</div>
                    <small className="text-muted">
                      {cardActive
                        ? 'Os médicos aprovados podem aceder aos dados deste familiar.'
                        : 'Nenhum médico tem acesso enquanto o cartão estiver suspenso.'}
                    </small>
                  </div>
                </div>
                <div>
                  {cardActive ? (
                    confirmSuspend ? (
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <span className="text-muted small">Confirmar suspensão?</span>
                        <button className="btn btn-danger btn-sm" disabled={cardLoading} onClick={() => handleCard(false)}>
                          Sim, suspender
                        </button>
                        <button className="btn btn-outline-secondary btn-sm" onClick={() => setConfirmSuspend(false)}>
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button className="btn btn-outline-danger btn-sm" onClick={() => setConfirmSuspend(true)}>
                        <i className="bi bi-lock me-1" />Suspender cartão
                      </button>
                    )
                  ) : (
                    <button className="btn btn-success btn-sm" disabled={cardLoading} onClick={() => handleCard(true)}>
                      <i className="bi bi-lock-open me-1" />Ativar cartão
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white fw-semibold border-bottom">
              <i className="bi bi-qr-code me-2 text-primary" />
              QR Code de Acesso
            </div>
            <div className="card-body text-center">
              {qrLoading ? (
                <div className="spinner-border text-primary my-3" />
              ) : qrPayload ? (
                <>
                  <QRCodeSVG value={qrPayload} size={200} className="mb-3" />
                  <p className="text-muted small mb-2">
                    Mostre este código ao médico para partilhar o acesso a este familiar imediatamente.
                    O acesso expira após <strong>7 dias</strong>.
                  </p>
                  <div className="d-flex justify-content-center align-items-center gap-2 mb-1">
                    <code className="bg-light border rounded px-3 py-2 fs-6 user-select-all">{qrPayload}</code>
                  </div>
                </>
              ) : (
                <p className="text-danger">Não foi possível gerar o QR Code.</p>
              )}
            </div>
          </div>

          <h6 className="fw-semibold mb-1">Pedidos de Acesso de Médicos</h6>
          {requests.length === 0 ? (
            <p className="text-muted">Sem pedidos de acesso.</p>
          ) : (
            <div className="list-group shadow-sm">
              {requests.map((r) => (
                <div key={String(r.id)} className="list-group-item">
                  <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                    <div>
                      <div className="fw-semibold">{String(r.doctorName)}</div>
                      <small className="text-muted">Pedido em: {String(r.requestedAt).slice(0, 10)}</small>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <span className={`badge bg-${badgeClass[String(r.status)] ?? 'secondary'}`}>{String(r.status)}</span>
                      {r.status === 'pending' && (
                        <>
                          <button className="btn btn-success btn-sm" onClick={() => handleApprove(Number(r.id))}>
                            <i className="bi bi-check me-1" />Aprovar
                          </button>
                          <button className="btn btn-outline-danger btn-sm" onClick={() => handleRevoke(Number(r.id), 'Pedido rejeitado.')}>
                            <i className="bi bi-x me-1" />Rejeitar
                          </button>
                        </>
                      )}
                      {r.status === 'approved' && (
                        <button className="btn btn-outline-danger btn-sm" onClick={() => handleRevoke(Number(r.id), 'Acesso revogado com sucesso.')}>
                          <i className="bi bi-x me-1" />Revogar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!['profile', 'access'].includes(tab) && (
        <>
          <div className="d-flex justify-content-end mb-2">
            <button className="btn btn-primary btn-sm" onClick={() => { setShowForm(!showForm); setForm({}) }}>
              <i className={`bi ${showForm ? 'bi-x' : 'bi-plus'} me-1`} />{showForm ? 'Cancelar' : 'Adicionar'}
            </button>
          </div>

          {showForm && (
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-body">
                <div className="row g-2">
                  {tab === 'history' && <>
                    <div className="col-sm-6"><label className="form-label small">Nome da cirurgia *</label>
                      <input className="form-control form-control-sm" value={f('name')} onChange={sf('name')} /></div>
                    <div className="col-sm-3"><label className="form-label small">Data</label>
                      <input type="date" className="form-control form-control-sm" value={f('date')} onChange={sf('date')} /></div>
                    <div className="col-sm-3"><label className="form-label small">Local</label>
                      <input className="form-control form-control-sm" value={f('location')} onChange={sf('location')} /></div>
                    <div className="col-12"><label className="form-label small">Notas</label>
                      <textarea className="form-control form-control-sm" rows={2} value={f('notes')} onChange={sf('notes')} /></div>
                  </>}
                  {tab === 'medications' && <>
                    <div className="col-sm-6"><label className="form-label small">Substância ativa *</label>
                      <input className="form-control form-control-sm" value={f('name')} onChange={sf('name')} /></div>
                    <div className="col-sm-3"><label className="form-label small">Dose</label>
                      <input className="form-control form-control-sm" placeholder="ex: 500mg" value={f('dose')} onChange={sf('dose')} /></div>
                    <div className="col-sm-3"><label className="form-label small">Início</label>
                      <input type="date" className="form-control form-control-sm" value={f('date')} onChange={sf('date')} /></div>
                    <div className="col-sm-6"><label className="form-label small">Posologia</label>
                      <input className="form-control form-control-sm" placeholder="ex: 2x/dia" value={f('posology')} onChange={sf('posology')} /></div>
                  </>}
                  {tab === 'allergies' && <>
                    <div className="col-sm-5"><label className="form-label small">Substância *</label>
                      <input className="form-control form-control-sm" value={f('name')} onChange={sf('name')} /></div>
                    <div className="col-sm-4"><label className="form-label small">Reação</label>
                      <input className="form-control form-control-sm" value={f('reaction')} onChange={sf('reaction')} /></div>
                    <div className="col-sm-3"><label className="form-label small">Severidade</label>
                      <select className="form-select form-select-sm" value={f('severity')} onChange={sf('severity')}>
                        <option value="">—</option>
                        <option value="mild">Leve</option>
                        <option value="moderate">Moderada</option>
                        <option value="severe">Grave</option>
                      </select></div>
                  </>}
                  {tab === 'exams' && <>
                    <div className="col-sm-4"><label className="form-label small">Data</label>
                      <input type="date" className="form-control form-control-sm" value={f('date')} onChange={sf('date')} /></div>
                    <div className="col-sm-4"><label className="form-label small">Laboratório</label>
                      <input className="form-control form-control-sm" value={f('lab')} onChange={sf('lab')} /></div>
                    <div className="col-12"><label className="form-label small">Notas</label>
                      <textarea className="form-control form-control-sm" rows={2} value={f('notes')} onChange={sf('notes')} /></div>
                  </>}
                  {tab === 'vaccinations' && <>
                    <div className="col-sm-6"><label className="form-label small">Vacina *</label>
                      <select className="form-select form-select-sm" value={f('vaccineId')} onChange={sf('vaccineId')}>
                        <option value="">Selecionar...</option>
                        {vaccines.map((v) => <option key={v.id} value={String(v.id)}>{v.name}</option>)}
                      </select></div>
                    <div className="col-sm-3"><label className="form-label small">Dose</label>
                      <input className="form-control form-control-sm" placeholder="ex: 1ª" value={f('dose')} onChange={sf('dose')} /></div>
                    <div className="col-sm-3"><label className="form-label small">Data</label>
                      <input type="date" className="form-control form-control-sm" value={f('date')} onChange={sf('date')} /></div>
                    <div className="col-sm-6"><label className="form-label small">Próxima dose</label>
                      <input type="date" className="form-control form-control-sm" value={f('nextDate')} onChange={sf('nextDate')} /></div>
                    <div className="col-sm-6"><label className="form-label small">Instituição</label>
                      <input className="form-control form-control-sm" value={f('institution')} onChange={sf('institution')} /></div>
                  </>}
                  {tab === 'habits' && <>
                    <div className="col-sm-4"><label className="form-label small">Tipo *</label>
                      <select className="form-select form-select-sm" value={f('type')} onChange={sf('type')}>
                        <option value="">Selecionar...</option>
                        {habitTypes.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
                      </select></div>
                    <div className="col-sm-4"><label className="form-label small">Nome/Detalhe</label>
                      <input className="form-control form-control-sm" value={f('name')} onChange={sf('name')} /></div>
                    <div className="col-sm-4"><label className="form-label small">Frequência</label>
                      <input className="form-control form-control-sm" placeholder="ex: diário" value={f('frequency')} onChange={sf('frequency')} /></div>
                    <div className="col-sm-4"><label className="form-label small">Quantidade</label>
                      <input className="form-control form-control-sm" value={f('quantity')} onChange={sf('quantity')} /></div>
                    <div className="col-sm-4"><label className="form-label small">Desde</label>
                      <input type="date" className="form-control form-control-sm" value={f('date')} onChange={sf('date')} /></div>
                  </>}
                </div>
                <div className="mt-3">
                  <button className="btn btn-primary btn-sm me-2" onClick={handleAdd}>
                    <i className="bi bi-check me-1" />Guardar
                  </button>
                  <button className="btn btn-outline-secondary btn-sm" onClick={() => setShowForm(false)}>Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {data.length === 0 ? (
            <p className="text-muted">Sem registos.</p>
          ) : (
            <div className="list-group shadow-sm">
              {data.map((item) => (
                <div key={String(item.id)} className="list-group-item d-flex justify-content-between align-items-start gap-2">
                  <div className="flex-grow-1">
                    <div className="fw-semibold">
                      {tab === 'history'      && String(item.surgeryName ?? '-')}
                      {tab === 'medications'  && String(item.activeSubstance ?? '-')}
                      {tab === 'allergies'    && String(item.activeSubstance ?? '-')}
                      {tab === 'exams'        && `${String(item.examDate ?? '-')}${item.laboratory ? ' · ' + item.laboratory : ''}`}
                      {tab === 'vaccinations' && String(item.vaccineName ?? '-')}
                      {tab === 'habits'       && `${String(item.type ?? '-')}${item.name ? ' · ' + item.name : ''}`}
                    </div>
                    <small className="text-muted">
                      {tab === 'history'      && [item.surgeryDate, item.location ? '· ' + item.location : ''].filter(Boolean).join(' ')}
                      {tab === 'medications'  && [item.dose, item.posology ? '· ' + item.posology : '', item.startDate ? '· desde ' + item.startDate : ''].filter(Boolean).join(' ')}
                      {tab === 'allergies'    && [item.allergicReaction, item.severity ? '· ' + item.severity : ''].filter(Boolean).join(' ')}
                      {tab === 'exams'        && String(item.notes ?? '')}
                      {tab === 'vaccinations' && [item.doseNumber, item.administeredAt ? '· ' + item.administeredAt : '', item.institution ? '· ' + item.institution : ''].filter(Boolean).join(' ')}
                      {tab === 'habits'       && [item.frequency, item.quantity ? '· ' + item.quantity : ''].filter(Boolean).join(' ')}
                    </small>
                  </div>
                  {canDelete && (
                    <button className="btn btn-outline-danger btn-sm flex-shrink-0" onClick={() => handleDelete(Number(item.id))}>
                      <i className="bi bi-trash" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Layout>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="col-sm-6">
      <div className="text-muted small">{label}</div>
      <div className="fw-semibold">{value}</div>
    </div>
  )
}
