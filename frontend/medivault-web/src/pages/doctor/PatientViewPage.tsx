import { useEffect, useState } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import Layout from '../../components/Layout'
import api from '../../api/client'
import {
  getPatientSummary,
  getPathologies,
  getAllergies,
  getMedications,
  getAnalyticalExams,
  getImagingExams,
  getOptometryExams,
  getDoctorProfile,
  getAnamneses,
  getAssessments,
  getVitalSigns,
  getAccessStatus,
} from '../../api/medical'
import ContextoClinicoModal from '../../components/ContextoClinicoModal'
import PrescricaoModal from '../../components/PrescricaoModal'
import ExamesModal from '../../components/ExamesModal'
import VitalSignsModal from '../../components/VitalSignsModal'
import AssessmentsModal from '../../components/AssessmentsModal'
import AnamneseModal from '../../components/AnamneseModal'

type CenterTab = 'anamnese' | 'exame' | 'diagnostico' | 'plano' | 'prescricao' | 'documentos'
type OpenModal = 'contexto' | 'prescricao' | 'exames' | 'vitais' | 'avaliacoes' | 'anamnese' | null

interface Summary {
  userId: string
  firstName: string
  lastName: string
  biologicalGender: string
  bloodType: string | null
  acceptsTransfusion: boolean
}

interface Pathology { id: number; icpc2Description: string; type: string; diagnosedAt: string | null; notes: string | null }
interface Allergy { id: number; activeSubstance: string; allergicReaction: string | null; severity: string | null }
interface Medication { id: number; activeSubstance: string; dose: string | null; posology: string | null }
interface ExamItem { id: string; label: string; date: string; status: 'Normal' | 'Atenção' | null }
interface Anamnesis { id: number; chiefComplaint: string | null; illnessHistory: string | null; personalHistory: string | null; createdAt: string }
interface Assessment { id: number; hypothesis: string; plan: string }
interface VitalSign {
  id: number; recordedAt: string
  bloodPressureSystolic: number | null; bloodPressureDiastolic: number | null
  heartRate: number | null; respiratoryRate: number | null; temperature: number | null
  spo2: number | null; weight: number | null; height: number | null
}

const MONTHS_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
function formatDatePt(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${String(d).padStart(2, '0')} ${MONTHS_PT[m - 1]} ${y}`
}

const centerTabs: { key: CenterTab; label: string; icon: string }[] = [
  { key: 'anamnese', label: 'Anamnese', icon: 'bi-person-lines-fill' },
  { key: 'exame', label: 'Exame Objetivo', icon: 'bi-clipboard2-pulse' },
  { key: 'diagnostico', label: 'Diagnóstico', icon: 'bi-clipboard2-check' },
  { key: 'plano', label: 'Plano', icon: 'bi-list-check' },
  { key: 'prescricao', label: 'Prescrição', icon: 'bi-capsule' },
  { key: 'documentos', label: 'Documentos', icon: 'bi-file-earmark-text' },
]

const mockDocs = [
  { id: 1, name: 'Atestado de Incapacidade', date: '20 abr 2025', type: 'PDF' },
  { id: 2, name: 'Pedido de Exames', date: '15 abr 2025', type: 'PDF' },
  { id: 3, name: 'Pedido de Consulta', date: '10 abr 2025', type: 'PDF' },
]

function bmi(w?: number | null, h?: number | null) {
  return w && h ? (w / ((h / 100) ** 2)).toFixed(1) : '—'
}

export default function PatientViewPage() {
  const { patientId } = useParams<{ patientId: string }>()
  const uid = patientId!
  const location = useLocation()
  const navState = location.state as { publicId?: string; patientName?: string } | null

  const [patientName, setPatientName] = useState(navState?.patientName ?? '')
  const [publicId, setPublicId] = useState(navState?.publicId ?? '')
  const [doctorSpecialty, setDoctorSpecialty] = useState('')

  const [summary, setSummary] = useState<Summary | null>(null)
  const [pathologies, setPathologies] = useState<Pathology[]>([])
  const [allergies, setAllergies] = useState<Allergy[]>([])
  const [medications, setMedications] = useState<Medication[]>([])
  const [latestExams, setLatestExams] = useState<ExamItem[]>([])
  const [anamneses, setAnamneses] = useState<Anamnesis[]>([])
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [vitals, setVitals] = useState<VitalSign[]>([])
  const [deniedReason, setDeniedReason] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<CenterTab>('anamnese')
  const [openModal, setOpenModal] = useState<OpenModal>(null)

  const [startedAt] = useState(() => new Date())
  const [elapsedSec, setElapsedSec] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setElapsedSec(Math.floor((Date.now() - startedAt.getTime()) / 1000)), 1000)
    return () => clearInterval(t)
  }, [startedAt])

  useEffect(() => {
    getDoctorProfile().then((p) => setDoctorSpecialty(p.speciality ?? '')).catch(() => {})
    if (!navState?.patientName) {
      api.get(`/users/${uid}/public-info`).then((r) => {
        setPatientName(r.data.name)
        setPublicId(r.data.publicId)
      }).catch(() => {})
    }
  }, [uid])

  useEffect(() => {
    getAccessStatus(uid)
      .then((s) => { if (!s.hasAccess) setDeniedReason(s.reason) })
      .catch(() => {})
  }, [uid])

  const loadAll = () => {
    setLoading(true)
    setDeniedReason(null)
    Promise.all([
      getPatientSummary(uid),
      getPathologies(uid),
      getAllergies(uid),
      getMedications(uid),
      getAnalyticalExams(uid),
      getImagingExams(uid),
      getOptometryExams(uid),
      getAnamneses(uid),
      getAssessments(uid),
      getVitalSigns(uid),
    ])
      .then(([summaryRes, pathRes, allergyRes, medRes, analyticalRes, imagingRes, optometryRes, anamnesesRes, assessmentsRes, vitalsRes]) => {
        setSummary(summaryRes)
        setPathologies(pathRes)
        setAllergies(allergyRes)
        setMedications(medRes)
        setAnamneses(anamnesesRes)
        setAssessments(assessmentsRes)
        setVitals(vitalsRes)

        type Analytical = { id: number; examDate: string; laboratory: string | null; parameters: { isAbnormal: boolean }[] }
        type Imaging = { id: number; examType: string; examDate: string }
        type Optometry = { id: number; examDate: string }

        const combined: ExamItem[] = [
          ...(analyticalRes as Analytical[]).map((e) => ({
            id: `a${e.id}`,
            label: e.laboratory ? `Análise · ${e.laboratory}` : 'Análise',
            date: e.examDate,
            status: (e.parameters?.some((p) => p.isAbnormal) ? 'Atenção' : 'Normal') as 'Normal' | 'Atenção',
          })),
          ...(imagingRes as Imaging[]).map((e) => ({ id: `i${e.id}`, label: e.examType, date: e.examDate, status: null })),
          ...(optometryRes as Optometry[]).map((e) => ({ id: `o${e.id}`, label: 'Optometria', date: e.examDate, status: null })),
        ]
        combined.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
        setLatestExams(combined.slice(0, 3))
      })
      .catch((err: unknown) => {
        if ((err as { response?: { status?: number } })?.response?.status === 403) {
          getAccessStatus(uid)
            .then((s) => setDeniedReason(s.reason))
            .catch(() => setDeniedReason('no_access'))
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(loadAll, [uid])

  const closeModalAndReload = () => { setOpenModal(null); loadAll() }

  const formatElapsed = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }
  const startTimeLabel = `${String(startedAt.getHours()).padStart(2, '0')}:${String(startedAt.getMinutes()).padStart(2, '0')}`

  if (deniedReason) {
    return (
      <Layout>
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
            <Link to="/doctor" className="btn btn-primary">
              Continuar para o dashboard
            </Link>
          </div>
        </div>
      </Layout>
    )
  }

  if (loading) {
    return (
      <Layout>
        <p className="text-muted">A carregar ficha do utente…</p>
      </Layout>
    )
  }

  const genderIcon = summary?.biologicalGender === 'F' ? 'bi-gender-female' : 'bi-gender-male'
  const allergyReactions = allergies.filter((a) => a.allergicReaction).map((a) => a.allergicReaction).join(', ')
  const currentAnamnesis = anamneses[0]
  const latestVital = vitals[0]

  return (
    <Layout>
      <div className="consult-header">
        <Link to="/doctor" className="consult-back">
          <i className="bi bi-arrow-left" /> Voltar
        </Link>

        <div className="consult-header-main">
          <div className="consult-patient-name">
            {patientName || 'Paciente'}
            {summary && <i className={`bi ${genderIcon} consult-gender-icon`} />}
          </div>
          <div className="consult-specialty">{doctorSpecialty}</div>
          {publicId && <div className="consult-public-id">{publicId}</div>}
        </div>

        <div className="consult-header-actions">
          <div className="consult-timer">
            <span className="consult-timer-dot" />
            <div>
              <div className="consult-timer-value">{formatElapsed(elapsedSec)}</div>
              <div className="consult-timer-label">Início: {startTimeLabel}</div>
            </div>
          </div>
          <button className="consult-draft-btn"><i className="bi bi-floppy" /> Guardar rascunho</button>
          <button className="consult-finish-btn"><i className="bi bi-check-lg" /> Finalizar consulta</button>
        </div>
      </div>

      <div className="consult-chips">
        <div className="consult-chip">
          <i className="bi bi-droplet-fill" style={{ color: '#dc2626' }} />
          <div>
            <div className="consult-chip-label">Grupo Sanguíneo</div>
            <div className="consult-chip-value">{summary?.bloodType ?? '—'}</div>
          </div>
        </div>
        <div className="consult-chip">
          <i className="bi bi-capsule" style={{ color: '#2563eb' }} />
          <div>
            <div className="consult-chip-label">Medicação</div>
            <div className="consult-chip-value">{medications.length} ativas</div>
          </div>
        </div>
        <div className="consult-chip">
          <i className="bi bi-exclamation-triangle-fill" style={{ color: '#dc2626' }} />
          <div>
            <div className="consult-chip-label">Alergias</div>
            <div className="consult-chip-value">{allergies.length}</div>
          </div>
        </div>
      </div>

      <div className="consult-layout">
        {/* LEFT column */}
        <div className="consult-col-left">
          <div className="consult-panel">
            <div className="consult-panel-header">
              Contexto Clínico
              <button className="consult-link-btn" onClick={() => setOpenModal('contexto')}>Editar</button>
            </div>

            {allergies.length > 0 && (
              <div className="consult-context-item context-danger">
                <i className="bi bi-exclamation-triangle-fill" />
                <div>
                  <div className="consult-context-title">Alergias</div>
                  <div className="consult-context-value">{allergies.map((a) => a.activeSubstance).join(', ')}</div>
                  {allergyReactions && <div className="consult-context-sub">Reação: {allergyReactions}</div>}
                </div>
              </div>
            )}

            {pathologies.length > 0 && (
              <div className="consult-context-item context-primary">
                <i className="bi bi-heart-pulse" />
                <div>
                  <div className="consult-context-title">Problemas Ativos</div>
                  {pathologies.map((p) => <div className="consult-context-value" key={p.id}>{p.icpc2Description}</div>)}
                </div>
              </div>
            )}

            {medications.length > 0 && (
              <div className="consult-context-item context-teal">
                <i className="bi bi-capsule" />
                <div className="flex-grow-1">
                  <div className="consult-context-title">Medicação Ativa ({medications.length})</div>
                  {medications.slice(0, 3).map((m) => (
                    <div key={m.id} className="consult-med-row">
                      <div className="consult-context-value">{m.activeSubstance}{m.dose ? ` ${m.dose}` : ''}</div>
                      {m.posology && <div className="consult-context-sub">{m.posology}</div>}
                    </div>
                  ))}
                  <button className="consult-link-btn consult-link-btn-block" onClick={() => setOpenModal('prescricao')}>
                    Ver prescrição completa <i className="bi bi-arrow-right" />
                  </button>
                </div>
              </div>
            )}

            <div className="consult-context-item context-danger">
              <i className="bi bi-droplet-fill" />
              <div>
                <div className="consult-context-title">Transfusão de Sangue</div>
                <div className="consult-context-value">{summary?.acceptsTransfusion ? 'Sim' : 'Não'}</div>
              </div>
            </div>

            <div className="consult-context-item context-plain">
              <i className="bi bi-clipboard2-pulse" />
              <div className="flex-grow-1">
                <div className="consult-panel-subheader">
                  Últimos Exames
                  <button className="consult-link-btn" onClick={() => setOpenModal('exames')}>Ver todos <i className="bi bi-arrow-right" /></button>
                </div>
                {latestExams.map((e) => (
                  <div key={e.id} className="consult-exam-row">
                    <div>
                      <div className="consult-context-value">{e.label}</div>
                      <div className="consult-context-sub">{formatDatePt(e.date)}</div>
                    </div>
                    {e.status && (
                      <span className={`status-badge ${e.status === 'Normal' ? 'badge-em-curso' : 'badge-ferias'}`}>{e.status}</span>
                    )}
                  </div>
                ))}
                {latestExams.length === 0 && <p className="consult-context-sub mb-0">Sem exames registados.</p>}
              </div>
            </div>
          </div>
        </div>

        {/* CENTER column */}
        <div className="consult-col-center">
          <div className="consult-panel">
            <div className="consult-tabs">
              {centerTabs.map((t) => (
                <button key={t.key} className={`consult-tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
                  <i className={`bi ${t.icon}`} /> {t.label}
                </button>
              ))}
            </div>

            <div className="consult-tab-body">
              {tab === 'anamnese' ? (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="consult-section-title mb-0">Anamnese</h6>
                    <button className="consult-link-btn" onClick={() => setOpenModal('anamnese')}>
                      <i className="bi bi-clock-history" /> Editar / Histórico
                    </button>
                  </div>
                  {currentAnamnesis ? (
                    <>
                      {currentAnamnesis.chiefComplaint && <><p className="consult-field-label mb-1">Queixa principal</p><p>{currentAnamnesis.chiefComplaint}</p></>}
                      {currentAnamnesis.illnessHistory && <><p className="consult-field-label mb-1">História da doença atual</p><p>{currentAnamnesis.illnessHistory}</p></>}
                      {currentAnamnesis.personalHistory && <><p className="consult-field-label mb-1">História pessoal relevante</p><p className="mb-0">{currentAnamnesis.personalHistory}</p></>}
                    </>
                  ) : (
                    <p className="text-muted mb-0">Sem anamnese registada.</p>
                  )}
                </>
              ) : tab === 'prescricao' ? (
                <p className="text-muted mb-0">
                  {medications.length} medicamento(s) ativo(s).{' '}
                  <button className="consult-link-btn" onClick={() => setOpenModal('prescricao')}>Ver prescrição completa</button>
                </p>
              ) : tab === 'documentos' ? (
                <p className="text-muted mb-0">Sem documentos associados a esta consulta. <span className="badge bg-secondary">Em breve</span></p>
              ) : (
                <p className="text-muted mb-0">Sem registos nesta secção. <span className="badge bg-secondary">Em breve</span></p>
              )}
            </div>

            {tab === 'anamnese' && (
              <div className="consult-avaliacoes">
                <div className="consult-panel-subheader">
                  Avaliações ({assessments.length})
                  <button className="consult-add-avaliacao-btn" onClick={() => setOpenModal('avaliacoes')}><i className="bi bi-plus-lg" /> Adicionar avaliação</button>
                </div>
                {assessments.slice(0, 3).map((a, idx) => (
                  <div className="consult-avaliacao-card" key={a.id}>
                    <div className="consult-avaliacao-header">
                      <span className={`consult-avaliacao-dot ${idx % 2 === 0 ? 'dot-blue' : 'dot-purple'}`} />
                      <span className="consult-avaliacao-title">Avaliação {assessments.length - idx}</span>
                      <button className="consult-link-btn consult-avaliacao-edit" onClick={() => setOpenModal('avaliacoes')}>Editar</button>
                    </div>
                    <div className="consult-avaliacao-field">
                      <div className="consult-field-label">Hipótese diagnóstica</div>
                      <div>{a.hypothesis}</div>
                    </div>
                    <div className="consult-avaliacao-field">
                      <div className="consult-field-label">Plano diagnóstico</div>
                      <div>{a.plan}</div>
                    </div>
                  </div>
                ))}
                {assessments.length === 0 && <p className="consult-context-sub">Sem avaliações registadas.</p>}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT column */}
        <div className="consult-col-right">
          <div className="consult-panel">
            <div className="consult-panel-header">
              Sinais Vitais
              <button className="consult-link-btn" onClick={() => setOpenModal('vitais')}>Editar</button>
            </div>
            {latestVital ? (
              <div className="consult-vitals-grid">
                <div className="consult-vital-tile"><i className="bi bi-heart-pulse consult-vital-icon" /><div className="consult-vital-label">TA</div><div className="consult-vital-value">{latestVital.bloodPressureSystolic && latestVital.bloodPressureDiastolic ? `${latestVital.bloodPressureSystolic}/${latestVital.bloodPressureDiastolic}` : '—'}</div><div className="consult-vital-unit">mmHg</div></div>
                <div className="consult-vital-tile"><i className="bi bi-heart consult-vital-icon" /><div className="consult-vital-label">FC</div><div className="consult-vital-value">{latestVital.heartRate ?? '—'}</div><div className="consult-vital-unit">bpm</div></div>
                <div className="consult-vital-tile"><i className="bi bi-lungs consult-vital-icon" /><div className="consult-vital-label">FR</div><div className="consult-vital-value">{latestVital.respiratoryRate ?? '—'}</div><div className="consult-vital-unit">irpm</div></div>
                <div className="consult-vital-tile"><i className="bi bi-thermometer-half consult-vital-icon" /><div className="consult-vital-label">Temp.</div><div className="consult-vital-value">{latestVital.temperature ?? '—'}</div><div className="consult-vital-unit">°C</div></div>
                <div className="consult-vital-tile"><i className="bi bi-droplet-half consult-vital-icon" /><div className="consult-vital-label">SpO2</div><div className="consult-vital-value">{latestVital.spo2 ?? '—'}</div><div className="consult-vital-unit">%</div></div>
                <div className="consult-vital-tile"><i className="bi bi-speedometer2 consult-vital-icon" /><div className="consult-vital-label">Peso</div><div className="consult-vital-value">{latestVital.weight ?? '—'}</div><div className="consult-vital-unit">kg</div></div>
                <div className="consult-vital-tile"><i className="bi bi-arrows-vertical consult-vital-icon" /><div className="consult-vital-label">Altura</div><div className="consult-vital-value">{latestVital.height ?? '—'}</div><div className="consult-vital-unit">cm</div></div>
                <div className="consult-vital-tile"><i className="bi bi-graph-up consult-vital-icon" /><div className="consult-vital-label">IMC</div><div className="consult-vital-value">{bmi(latestVital.weight, latestVital.height)}</div><div className="consult-vital-unit">kg/m²</div></div>
              </div>
            ) : (
              <p className="consult-context-sub mb-0">Sem sinais vitais registados.</p>
            )}
          </div>

          <div className="consult-panel">
            <div className="consult-panel-header">
              Documentos
              <button className="consult-link-btn">Ver todos</button>
            </div>
            {mockDocs.map((d) => (
              <div className="consult-doc-row" key={d.id}>
                <i className="bi bi-file-earmark-text consult-doc-icon" />
                <div className="flex-grow-1">
                  <div className="consult-context-value">{d.name}</div>
                  <div className="consult-context-sub">{d.date}</div>
                </div>
                <span className="consult-doc-badge">{d.type}</span>
              </div>
            ))}
          </div>

          <div className="consult-panel">
            <div className="consult-panel-header">
              Chat da Equipa
              <button className="consult-link-btn">Ver conversas</button>
            </div>
            <div className="consult-chat-row">
              <div className="consult-chat-avatar">DR</div>
              <div className="flex-grow-1">
                <div className="consult-context-value">Dr. Pedro Martins</div>
                <div className="consult-context-sub">Bom dia, reveja os resultados do eco.</div>
              </div>
              <div className="consult-chat-meta">
                <small className="text-muted">09:14</small>
                <span className="badge rounded-pill bg-primary">1</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {openModal === 'contexto' && <ContextoClinicoModal userId={uid} onClose={closeModalAndReload} />}
      {openModal === 'prescricao' && <PrescricaoModal userId={uid} onClose={closeModalAndReload} />}
      {openModal === 'exames' && <ExamesModal userId={uid} onClose={closeModalAndReload} />}
      {openModal === 'vitais' && <VitalSignsModal userId={uid} onClose={closeModalAndReload} />}
      {openModal === 'avaliacoes' && <AssessmentsModal userId={uid} onClose={closeModalAndReload} />}
      {openModal === 'anamnese' && <AnamneseModal userId={uid} onClose={closeModalAndReload} />}
    </Layout>
  )
}
