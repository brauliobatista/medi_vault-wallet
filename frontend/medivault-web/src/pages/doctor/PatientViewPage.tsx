import { useEffect, useState } from 'react'
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import api from '../../api/client'
import {
  getSurgeries, addSurgery, deleteSurgery,
  getMedications, addMedication, deleteMedication,
  getAllergies, addAllergy, deleteAllergy,
  getAnalyticalExams, addAnalyticalExam,
  getVaccinations, addVaccination, deleteVaccination,
  getHabits, upsertHabit,
  getDoctorNotes, createDoctorNote, getFlags, markFlagReviewed,
  getAccessStatus,
} from '../../api/medical'

type TabKey = 'history' | 'medications' | 'allergies' | 'exams' | 'vaccinations' | 'habits' | 'notes'

const habitTypes = [
  { value: 'alcohol', label: 'Álcool' },
  { value: 'tobacco', label: 'Tabaco' },
  { value: 'drugs', label: 'Drogas' },
  { value: 'gambling', label: 'Jogo' },
  { value: 'physical_activity', label: 'Atividade Física' },
]

export default function PatientViewPage() {
  const { patientId } = useParams<{ patientId: string }>()
  const uid = patientId!
  const location = useLocation()
  const navigate = useNavigate()
  const navState = location.state as { publicId?: string; patientName?: string } | null

  const [publicId, setPublicId] = useState<string>(navState?.publicId ?? '')
  const [patientName, setPatientName] = useState<string>(navState?.patientName ?? '')

  const [tab, setTab] = useState<TabKey>('history')
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [notes, setNotes] = useState<Record<string, unknown>[]>([])
  const [flags, setFlags] = useState<Record<string, unknown>[]>([])
  const [noteText, setNoteText] = useState('')
  const [noteSection, setNoteSection] = useState('medical_info')
  const [deniedReason, setDeniedReason] = useState<string | null>(null)
  const [vaccines, setVaccines] = useState<{ id: number; name: string }[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})

  useEffect(() => {
    api.get('/vaccines').then((r) => setVaccines(r.data))
    if (!navState?.publicId) {
      api.get(`/users/${uid}/public-info`).then((r) => {
        setPublicId(r.data.publicId)
        setPatientName(r.data.name)
      }).catch(() => {})
    }
  }, [uid])

  const loadTab = async (t: TabKey) => {
    setTab(t)
    setDeniedReason(null)
    setShowForm(false)
    setForm({})
    try {
      if (t === 'history') setData(await getSurgeries(uid))
      else if (t === 'medications') setData(await getMedications(uid))
      else if (t === 'allergies') setData(await getAllergies(uid))
      else if (t === 'exams') setData(await getAnalyticalExams(uid))
      else if (t === 'vaccinations') setData(await getVaccinations(uid))
      else if (t === 'habits') setData(await getHabits(uid))
      else if (t === 'notes') {
        setNotes(await getDoctorNotes(uid))
        setFlags(await getFlags(uid))
      }
    } catch (err: unknown) {
      if ((err as { response?: { status?: number } })?.response?.status === 403) {
        const status = await getAccessStatus(uid).catch(() => ({ reason: 'no_access' }))
        setDeniedReason(status.reason)
      }
    }
  }

  useEffect(() => {
    getAccessStatus(uid)
      .then((s) => { if (!s.hasAccess) setDeniedReason(s.reason) })
      .catch(() => {})
    loadTab('history')
  }, [uid])

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

  const canDelete = ['history', 'medications', 'allergies', 'vaccinations'].includes(tab)

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'history',      label: 'Cirurgias' },
    { key: 'medications',  label: 'Medicação' },
    { key: 'allergies',    label: 'Alergias' },
    { key: 'exams',        label: 'Análises' },
    { key: 'vaccinations', label: 'Vacinação' },
    { key: 'habits',       label: 'Hábitos' },
    { key: 'notes',        label: 'Notas' },
  ]

  return (
    <Layout>
      {deniedReason && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card border-0 shadow-lg p-4 text-center mx-3" style={{ maxWidth: 400 }}>
            {deniedReason === 'card_suspended' ? (
              <>
                <i className="bi bi-shield-x text-warning" style={{ fontSize: '2.5rem' }} />
                <h5 className="fw-bold mt-3 mb-2">MediCard Suspenso</h5>
                <p className="text-muted mb-4">
                  Este utente suspendeu o seu MediCard. O acesso aos dados está bloqueado até que o utente reative o cartão.
                </p>
              </>
            ) : (
              <>
                <i className="bi bi-lock-fill text-danger" style={{ fontSize: '2.5rem' }} />
                <h5 className="fw-bold mt-3 mb-2">Sem acesso</h5>
                <p className="text-muted mb-4">Este utente ainda não aprovou o seu pedido de acesso.</p>
              </>
            )}
            <button className="btn btn-primary" onClick={() => navigate('/doctor')}>
              Continuar para o dashboard
            </button>
          </div>
        </div>
      )}
      {/* Patient header */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <Link to="/doctor" className="btn btn-outline-secondary btn-sm">
          <i className="bi bi-arrow-left me-1" />Voltar
        </Link>
        <div>
          <h5 className="mb-0 fw-semibold">
            <i className="bi bi-person-vcard me-2 text-primary" />{patientName || 'Paciente'}
          </h5>
          <small className="text-muted font-monospace">{publicId || uid}</small>
        </div>
        {flags.length > 0 && (
          <span className="badge bg-warning text-dark">
            <i className="bi bi-flag me-1" />{flags.length} pendente(s)
          </span>
        )}
      </div>

      <ul className="nav nav-tabs mb-3 flex-wrap">
        {tabs.map((t) => (
          <li className="nav-item" key={t.key}>
            <button className={`nav-link ${tab === t.key ? 'active' : ''}`} onClick={() => loadTab(t.key)}>
              {t.label}
            </button>
          </li>
        ))}
      </ul>

      {tab === 'notes' ? (
        <>
          {flags.length > 0 && (
            <div className="alert alert-warning">
              <strong>Alterações por rever:</strong>
              {flags.map((fl) => (
                <div key={String(fl.id)} className="d-flex justify-content-between align-items-center mt-1">
                  <span><i className="bi bi-flag me-1" />{String(fl.section)} · {String(fl.createdAt).slice(0, 10)}</span>
                  <button className="btn btn-sm btn-outline-success" onClick={async () => { await markFlagReviewed(Number(fl.id)); getFlags(uid).then(setFlags) }}>
                    Marcar como revisto
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-header bg-white border-bottom">Adicionar nota</div>
            <div className="card-body">
              <div className="row g-2">
                <div className="col-sm-4">
                  <select className="form-select form-select-sm" value={noteSection} onChange={(e) => setNoteSection(e.target.value)}>
                    <option value="identification">Identificação</option>
                    <option value="medical_info">Info Médica</option>
                    <option value="mcdts">MCDTS</option>
                    <option value="habits">Hábitos</option>
                    <option value="history">Histórico</option>
                    <option value="other">Outro</option>
                  </select>
                </div>
                <div className="col-12">
                  <textarea className="form-control form-control-sm" rows={3} placeholder="Nota confidencial..." value={noteText} onChange={(e) => setNoteText(e.target.value)} />
                </div>
                <div className="col-12">
                  <button className="btn btn-primary btn-sm" onClick={async () => { if (!noteText.trim()) return; await createDoctorNote({ userId: uid, section: noteSection, noteText }); setNoteText(''); getDoctorNotes(uid).then(setNotes) }}>
                    Guardar nota
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="list-group shadow-sm">
            {notes.map((n) => (
              <div key={String(n.id)} className="list-group-item">
                <div className="d-flex justify-content-between">
                  <span className="badge bg-secondary">{String(n.section)}</span>
                  <small className="text-muted">{String(n.updatedAt).slice(0, 10)}</small>
                </div>
                <p className="mb-0 mt-1">{String(n.noteText)}</p>
              </div>
            ))}
            {notes.length === 0 && <p className="text-muted p-3 mb-0">Sem notas.</p>}
          </div>
        </>

      ) : (
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
