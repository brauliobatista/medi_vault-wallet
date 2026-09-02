import { useEffect, useState } from 'react'
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom'
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
  getAnamneses,
  getAssessments,
  getVitalSigns,
  getAccessStatus,
  getDocuments,
  getChatMessages,
  getFamilyCircle,
  getDoctorNotes,
  saveConsultationDraft,
  finishConsultation,
} from '../../api/medical'
import ContextoClinicoModal from '../../components/ContextoClinicoModal'
import PrescricaoModal from '../../components/PrescricaoModal'
import ExamesModal from '../../components/ExamesModal'
import VitalSignsModal from '../../components/VitalSignsModal'
import AssessmentsModal from '../../components/AssessmentsModal'
import AnamneseModal from '../../components/AnamneseModal'
import DocumentsModal from '../../components/DocumentsModal'
import ChatModal from '../../components/ChatModal'
import NotesModal from '../../components/NotesModal'
import { setActiveConsultation, clearActiveConsultation } from '../../hooks/useActiveConsultation'
import { useTranslation } from '../../i18n/LanguageContext'

type CenterTab = 'anamnese' | 'exame' | 'diagnostico' | 'plano' | 'prescricao' | 'documentos'
type OpenModal = 'contexto' | 'prescricao' | 'exames' | 'vitais' | 'avaliacoes' | 'anamnese' | 'documentos' | 'chat' | 'notas' | null

interface Summary {
  userId: string
  firstName: string
  lastName: string
  biologicalGender: string
  bloodType: string | null
  acceptsTransfusion: boolean
  sex: string
  birthday: string
  utentNumber: string
  photoUrl: string | null
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
  spo2: number | null; weight: number | null; height: number | null; notes: string | null
}
interface MedicalFile { id: number; fileName: string; fileType: string | null; fileUrl: string; uploadedAt: string; uploadedByName: string | null }
interface ChatMessage { id: number; authorDoctorId: string; authorName: string; message: string; createdAt: string }
interface DoctorNote { id: number; doctorId: string; doctorName: string; section: string; noteText: string; createdAt: string; updatedAt: string }
interface FamilyContact { userId: string; name: string; phone: string | null; relationshipCode: string; direction: 'guardian' | 'dependent' }

type TFunc = (key: string, vars?: Record<string, string | number>) => string

function relationshipLabel(f: FamilyContact, t: TFunc) {
  const RELATIONSHIP_LABELS: Record<string, string> = {
    parent: t('patientRecord.relationshipParent'),
    legal_guardian: t('patientRecord.relationshipLegalGuardian'),
    tutor: t('patientRecord.relationshipTutor'),
    other: t('patientRecord.relationshipOther'),
  }
  const base = RELATIONSHIP_LABELS[f.relationshipCode] ?? f.relationshipCode
  return f.direction === 'guardian' ? base : `${base} (${t('patientRecord.dependentSuffix')})`
}

function formatDatePt(iso: string, t: TFunc) {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${String(d).padStart(2, '0')} ${t(`common.month${m}`)} ${y}`
}

function calculateAge(birthday: string) {
  const [y, m, d] = birthday.split('-').map(Number)
  if (!y || !m || !d) return null
  const today = new Date()
  let age = today.getFullYear() - y
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--
  return age
}

function genderLabel(code: string, t: TFunc) {
  const GENDER_LABELS: Record<string, string> = { M: t('profile.genderMale'), F: t('profile.genderFemale') }
  return GENDER_LABELS[code] ?? code
}

function bmi(w?: number | null, h?: number | null) {
  return w && h ? (w / ((h / 100) ** 2)).toFixed(1) : '—'
}

export default function PatientViewPage() {
  const { t } = useTranslation()
  const centerTabs: { key: CenterTab; label: string; icon: string }[] = [
    { key: 'anamnese', label: t('patientRecord.tabAnamnesis'), icon: 'bi-person-lines-fill' },
    { key: 'exame', label: t('patientRecord.tabObjectiveExam'), icon: 'bi-clipboard2-pulse' },
    { key: 'diagnostico', label: t('patientRecord.tabDiagnosis'), icon: 'bi-clipboard2-check' },
    { key: 'plano', label: t('patientRecord.tabPlan'), icon: 'bi-list-check' },
    { key: 'prescricao', label: t('patientRecord.tabPrescription'), icon: 'bi-capsule' },
    { key: 'documentos', label: t('patientRecord.tabDocuments'), icon: 'bi-file-earmark-text' },
  ]

  const { patientId } = useParams<{ patientId: string }>()
  const uid = patientId!
  const location = useLocation()
  const navigate = useNavigate()
  const navState = location.state as { publicId?: string; patientName?: string; consultationId?: number; startedAt?: string } | null

  const [patientName, setPatientName] = useState(navState?.patientName ?? '')
  const [publicId, setPublicId] = useState(navState?.publicId ?? '')
  const [patientNationality, setPatientNationality] = useState('')

  const [summary, setSummary] = useState<Summary | null>(null)
  const [pathologies, setPathologies] = useState<Pathology[]>([])
  const [allergies, setAllergies] = useState<Allergy[]>([])
  const [medications, setMedications] = useState<Medication[]>([])
  const [latestExams, setLatestExams] = useState<ExamItem[]>([])
  const [anamneses, setAnamneses] = useState<Anamnesis[]>([])
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [vitals, setVitals] = useState<VitalSign[]>([])
  const [documents, setDocuments] = useState<MedicalFile[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [notes, setNotes] = useState<DoctorNote[]>([])
  const [familyCircle, setFamilyCircle] = useState<FamilyContact[]>([])
  const [deniedReason, setDeniedReason] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<CenterTab>('anamnese')
  const [openModal, setOpenModal] = useState<OpenModal>(null)

  const [startedAt] = useState(() => (navState?.startedAt ? new Date(navState.startedAt) : new Date()))
  const [elapsedSec, setElapsedSec] = useState(0)
  const [consultationId, setConsultationId] = useState<number | null>(navState?.consultationId ?? null)
  const [savingDraft, setSavingDraft] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [draftSavedMsg, setDraftSavedMsg] = useState(false)

  useEffect(() => {
    const timerId = setInterval(() => setElapsedSec(Math.floor((Date.now() - startedAt.getTime()) / 1000)), 1000)
    return () => clearInterval(timerId)
  }, [startedAt])

  // Keep the sidebar "active consultation" shortcut pointing here while the
  // doctor navigates around the app. Cleared only when the consultation is
  // finished (see handleFinishConsultation) or when access is denied.
  useEffect(() => {
    if (deniedReason || !patientName) return
    setActiveConsultation({
      userId: uid,
      patientName,
      publicId,
      consultationId,
      startedAt: startedAt.toISOString(),
    })
  }, [uid, patientName, publicId, consultationId, deniedReason, startedAt])

  useEffect(() => {
    if (deniedReason) clearActiveConsultation()
  }, [deniedReason])

  useEffect(() => {
    api.get(`/users/${uid}/public-info`).then((r) => {
      if (!navState?.patientName) {
        setPatientName(r.data.name)
        setPublicId(r.data.publicId)
      }
      setPatientNationality(r.data.nationalityName ?? '')
    }).catch(() => {})
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
      getDocuments(uid),
      getChatMessages(uid),
      getFamilyCircle(uid),
      getDoctorNotes(uid),
    ])
      .then(([summaryRes, pathRes, allergyRes, medRes, analyticalRes, imagingRes, optometryRes, anamnesesRes, assessmentsRes, vitalsRes, documentsRes, chatRes, familyRes, notesRes]) => {
        setSummary(summaryRes)
        setPathologies(pathRes)
        setAllergies(allergyRes)
        setMedications(medRes)
        setAnamneses(anamnesesRes)
        setAssessments(assessmentsRes)
        setVitals(vitalsRes)
        setDocuments(documentsRes)
        setChatMessages(chatRes)
        setFamilyCircle(familyRes)
        setNotes(notesRes)

        type Analytical = { id: number; examDate: string; laboratory: string | null; parameters: { isAbnormal: boolean }[] }
        type Imaging = { id: number; examType: string; examDate: string }
        type Optometry = { id: number; examDate: string }

        const combined: ExamItem[] = [
          ...(analyticalRes as Analytical[]).map((e) => ({
            id: `a${e.id}`,
            label: e.laboratory ? `${t('patientRecord.examTypeAnalysis')} · ${e.laboratory}` : t('patientRecord.examTypeAnalysis'),
            date: e.examDate,
            status: (e.parameters?.some((p) => p.isAbnormal) ? 'Atenção' : 'Normal') as 'Normal' | 'Atenção',
          })),
          ...(imagingRes as Imaging[]).map((e) => ({ id: `i${e.id}`, label: e.examType, date: e.examDate, status: null })),
          ...(optometryRes as Optometry[]).map((e) => ({ id: `o${e.id}`, label: t('patientRecord.examTypeOptometry'), date: e.examDate, status: null })),
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

  const handleSaveDraft = async () => {
    setSavingDraft(true)
    try {
      const res = await saveConsultationDraft(uid, { consultationId, startedAt: startedAt.toISOString() })
      setConsultationId(res.id)
      setDraftSavedMsg(true)
      setTimeout(() => setDraftSavedMsg(false), 2500)
    } catch {
      // ignore — doctor can retry
    } finally {
      setSavingDraft(false)
    }
  }

  const handleFinishConsultation = async () => {
    setFinishing(true)
    try {
      await finishConsultation(uid, { consultationId, startedAt: startedAt.toISOString() })
      clearActiveConsultation()
      navigate('/doctor')
    } catch {
      setFinishing(false)
    }
  }

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
                <h5 className="fw-bold mt-3 mb-2">{t('patientRecord.cardSuspendedTitle')}</h5>
                <p className="text-muted mb-4">
                  {t('patientRecord.cardSuspendedMessage')}
                </p>
              </>
            ) : (
              <>
                <i className="bi bi-lock-fill text-danger" style={{ fontSize: '2.5rem' }} />
                <h5 className="fw-bold mt-3 mb-2">{t('patientRecord.noAccessTitle')}</h5>
                <p className="text-muted mb-4">{t('patientRecord.noAccessMessage')}</p>
              </>
            )}
            <Link to="/doctor" className="btn btn-primary">
              {t('patientRecord.continueToDashboard')}
            </Link>
          </div>
        </div>
      </Layout>
    )
  }

  if (loading) {
    return (
      <Layout>
        <p className="text-muted">{t('patientRecord.loadingRecord')}</p>
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
          <i className="bi bi-arrow-left" /> {t('common.back')}
        </Link>

        {summary?.photoUrl ? (
          <img src={summary.photoUrl} alt={patientName || t('patientRecord.patientFallback')} className="consult-patient-photo" />
        ) : (
          <div className="consult-patient-photo consult-patient-photo-placeholder">
            {(patientName || 'U').charAt(0).toUpperCase()}
          </div>
        )}

        <div className="consult-header-main">
          <div className="consult-patient-name">
            {patientName || t('patientRecord.patientFallback')}
            {summary && <i className={`bi ${genderIcon} consult-gender-icon`} />}
          </div>
          {publicId && <div className="consult-public-id">{publicId}</div>}
        </div>

        <div className="consult-header-actions">
          <div className="consult-timer">
            <span className="consult-timer-dot" />
            <div>
              <div className="consult-timer-value">{formatElapsed(elapsedSec)}</div>
              <div className="consult-timer-label">{t('patientRecord.startedAt')}: {startTimeLabel}</div>
            </div>
          </div>
          {draftSavedMsg && <span style={{ color: '#16a34a', fontSize: '0.85rem', fontWeight: 600 }}>{t('patientRecord.draftSaved')}</span>}
          <button className="consult-draft-btn" onClick={handleSaveDraft} disabled={savingDraft || finishing}>
            <i className="bi bi-floppy" /> {savingDraft ? t('patientRecord.savingDraft') : t('patientRecord.saveDraft')}
          </button>
          <button className="consult-finish-btn" onClick={handleFinishConsultation} disabled={savingDraft || finishing}>
            <i className="bi bi-check-lg" /> {finishing ? t('patientRecord.finishingConsultation') : t('patientRecord.finishConsultation')}
          </button>
        </div>
      </div>

      <div className="consult-chips">
        <div className="consult-chip">
          <i className="bi bi-calendar3" style={{ color: '#2563eb' }} />
          <div>
            <div className="consult-chip-label">{t('patientRecord.age')}</div>
            <div className="consult-chip-value">{summary ? `${calculateAge(summary.birthday) ?? '—'} ${t('patientRecord.years')}` : '—'}</div>
          </div>
        </div>
        <div className="consult-chip">
          <i className="bi bi-calendar-event" style={{ color: '#2563eb' }} />
          <div>
            <div className="consult-chip-label">{t('profile.birthday')}</div>
            <div className="consult-chip-value">{summary ? formatDatePt(summary.birthday, t) : '—'}</div>
          </div>
        </div>
        <div className="consult-chip">
          <i className="bi bi-person-vcard" style={{ color: '#2563eb' }} />
          <div>
            <div className="consult-chip-label">{t('patientRecord.utentNumber')}</div>
            <div className="consult-chip-value">{summary?.utentNumber ?? '—'}</div>
          </div>
        </div>
        <div className="consult-chip">
          <i className="bi bi-credit-card-2-front" style={{ color: '#2563eb' }} />
          <div>
            <div className="consult-chip-label">{t('patientRecord.cardNumber')}</div>
            <div className="consult-chip-value font-monospace" style={{ fontSize: '0.8rem' }}>{publicId || '—'}</div>
          </div>
        </div>
        <div className="consult-chip">
          <i className="bi bi-gender-ambiguous" style={{ color: '#2563eb' }} />
          <div>
            <div className="consult-chip-label">{t('profile.biologicalGender')}</div>
            <div className="consult-chip-value">{summary ? genderLabel(summary.biologicalGender, t) : '—'}</div>
          </div>
        </div>
        <div className="consult-chip">
          <i className="bi bi-gender-trans" style={{ color: '#2563eb' }} />
          <div>
            <div className="consult-chip-label">{t('profile.gender')}</div>
            <div className="consult-chip-value">{summary ? genderLabel(summary.sex, t) : '—'}</div>
          </div>
        </div>
        <div className="consult-chip">
          <i className="bi bi-droplet" style={{ color: '#2563eb' }} />
          <div>
            <div className="consult-chip-label">{t('profile.bloodType')}</div>
            <div className="consult-chip-value">{summary?.bloodType ?? '—'}</div>
          </div>
        </div>
        <div className="consult-chip">
          <i className="bi bi-globe" style={{ color: '#2563eb' }} />
          <div>
            <div className="consult-chip-label">{t('profile.nationality')}</div>
            <div className="consult-chip-value">{patientNationality || '—'}</div>
          </div>
        </div>
      </div>

      <div className="consult-layout">
        {/* LEFT column */}
        <div className="consult-col-left">
          <div className="consult-panel">
            <div className="consult-panel-header">
              {t('patientRecord.clinicalContext')}
              <button className="consult-link-btn" onClick={() => setOpenModal('contexto')}>{t('common.edit')}</button>
            </div>

            {allergies.length > 0 && (
              <div className="consult-context-item context-danger">
                <i className="bi bi-exclamation-triangle-fill" />
                <div>
                  <div className="consult-context-title">{t('patientRecord.allergies')}</div>
                  <div className="consult-context-value">{allergies.map((a) => a.activeSubstance).join(', ')}</div>
                  {allergyReactions && <div className="consult-context-sub">{t('patientRecord.reaction')}: {allergyReactions}</div>}
                </div>
              </div>
            )}

            {pathologies.length > 0 && (
              <div className="consult-context-item context-primary">
                <i className="bi bi-heart-pulse" />
                <div>
                  <div className="consult-context-title">{t('patientRecord.activeProblems')}</div>
                  {pathologies.map((p) => <div className="consult-context-value" key={p.id}>{p.icpc2Description}</div>)}
                </div>
              </div>
            )}

            {medications.length > 0 && (
              <div className="consult-context-item context-teal">
                <i className="bi bi-capsule" />
                <div className="flex-grow-1">
                  <div className="consult-context-title">{t('patientRecord.activeMedication')} ({medications.length})</div>
                  {medications.slice(0, 3).map((m) => (
                    <div key={m.id} className="consult-med-row">
                      <div className="consult-context-value">{m.activeSubstance}{m.dose ? ` ${m.dose}` : ''}</div>
                      {m.posology && <div className="consult-context-sub">{m.posology}</div>}
                    </div>
                  ))}
                  <button className="consult-link-btn consult-link-btn-block" onClick={() => setOpenModal('prescricao')}>
                    {t('patientRecord.viewFullPrescription')} <i className="bi bi-arrow-right" />
                  </button>
                </div>
              </div>
            )}

            <div className="consult-context-item context-danger">
              <i className="bi bi-droplet-fill" />
              <div>
                <div className="consult-context-title">{t('patientRecord.bloodTransfusion')}</div>
                <div className="consult-context-value">{summary?.acceptsTransfusion ? t('common.yes') : t('common.no')}</div>
              </div>
            </div>

            <div className="consult-context-item context-plain">
              <i className="bi bi-clipboard2-pulse" />
              <div className="flex-grow-1">
                <div className="consult-panel-subheader">
                  {t('patientRecord.latestExams')}
                  <button className="consult-link-btn" onClick={() => setOpenModal('exames')}>{t('common.viewAll')} <i className="bi bi-arrow-right" /></button>
                </div>
                {latestExams.map((e) => (
                  <div key={e.id} className="consult-exam-row">
                    <div>
                      <div className="consult-context-value">{e.label}</div>
                      <div className="consult-context-sub">{formatDatePt(e.date, t)}</div>
                    </div>
                    {e.status && (
                      <span className={`status-badge ${e.status === 'Normal' ? 'badge-em-curso' : 'badge-ferias'}`}>
                        {e.status === 'Normal' ? t('patientRecord.examStatusNormal') : t('patientRecord.examStatusAttention')}
                      </span>
                    )}
                  </div>
                ))}
                {latestExams.length === 0 && <p className="consult-context-sub mb-0">{t('patientRecord.noExams')}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* CENTER column */}
        <div className="consult-col-center">
          <div className="consult-panel">
            <div className="consult-tabs">
              {centerTabs.map((ct) => (
                <button key={ct.key} className={`consult-tab${tab === ct.key ? ' active' : ''}`} onClick={() => setTab(ct.key)}>
                  <i className={`bi ${ct.icon}`} /> {ct.label}
                </button>
              ))}
            </div>

            <div className="consult-tab-body">
              {tab === 'anamnese' ? (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="consult-section-title mb-0">{t('patientRecord.tabAnamnesis')}</h6>
                    <button className="consult-link-btn" onClick={() => setOpenModal('anamnese')}>
                      <i className="bi bi-clock-history" /> {t('patientRecord.editHistory')}
                    </button>
                  </div>
                  {currentAnamnesis ? (
                    <>
                      {currentAnamnesis.chiefComplaint && <><p className="consult-field-label mb-1">{t('patientRecord.chiefComplaint')}</p><p>{currentAnamnesis.chiefComplaint}</p></>}
                      {currentAnamnesis.illnessHistory && <><p className="consult-field-label mb-1">{t('patientRecord.illnessHistory')}</p><p>{currentAnamnesis.illnessHistory}</p></>}
                      {currentAnamnesis.personalHistory && <><p className="consult-field-label mb-1">{t('patientRecord.personalHistory')}</p><p className="mb-0">{currentAnamnesis.personalHistory}</p></>}
                    </>
                  ) : (
                    <p className="text-muted mb-0">{t('patientRecord.noAnamnesis')}</p>
                  )}
                </>
              ) : tab === 'exame' ? (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="consult-section-title mb-0">{t('patientRecord.tabObjectiveExam')}</h6>
                    <button className="consult-link-btn" onClick={() => setOpenModal('vitais')}>
                      <i className="bi bi-pencil" /> {t('common.edit')}
                    </button>
                  </div>
                  {latestVital?.notes ? (
                    <p className="mb-0">{latestVital.notes}</p>
                  ) : (
                    <p className="text-muted mb-0">{t('patientRecord.noObjectiveExam')}</p>
                  )}
                </>
              ) : tab === 'diagnostico' ? (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="consult-section-title mb-0">{t('patientRecord.tabDiagnosis')}</h6>
                    <button className="consult-link-btn" onClick={() => setOpenModal('avaliacoes')}>
                      <i className="bi bi-plus-lg" /> {t('patientRecord.addEdit')}
                    </button>
                  </div>
                  {assessments.length > 0 ? (
                    assessments.map((a) => <p key={a.id} className="consult-context-value mb-2">{a.hypothesis}</p>)
                  ) : (
                    <p className="text-muted mb-0">{t('patientRecord.noDiagnosticHypotheses')}</p>
                  )}
                </>
              ) : tab === 'plano' ? (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="consult-section-title mb-0">{t('patientRecord.tabPlan')}</h6>
                    <button className="consult-link-btn" onClick={() => setOpenModal('avaliacoes')}>
                      <i className="bi bi-plus-lg" /> {t('patientRecord.addEdit')}
                    </button>
                  </div>
                  {assessments.length > 0 ? (
                    assessments.map((a) => <p key={a.id} className="consult-context-value mb-2">{a.plan}</p>)
                  ) : (
                    <p className="text-muted mb-0">{t('patientRecord.noPlan')}</p>
                  )}
                </>
              ) : tab === 'prescricao' ? (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="consult-section-title mb-0">{t('patientRecord.tabPrescription')}</h6>
                    <button className="consult-link-btn" onClick={() => setOpenModal('prescricao')}>{t('patientRecord.viewFullPrescription')}</button>
                  </div>
                  {medications.length > 0 ? (
                    medications.map((m) => (
                      <div key={m.id} className="consult-med-row mb-2">
                        <div className="consult-context-value">{m.activeSubstance}{m.dose ? ` ${m.dose}` : ''}</div>
                        {m.posology && <div className="consult-context-sub">{m.posology}</div>}
                      </div>
                    ))
                  ) : (
                    <p className="text-muted mb-0">{t('patientRecord.noActiveMedication')}</p>
                  )}
                </>
              ) : (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="consult-section-title mb-0">{t('patientRecord.tabDocuments')}</h6>
                    <button className="consult-link-btn" onClick={() => setOpenModal('documentos')}>
                      <i className="bi bi-upload" /> {t('patientRecord.addDocument')}
                    </button>
                  </div>
                  {documents.length > 0 ? (
                    documents.map((d) => (
                      <div className="consult-doc-row" key={d.id}>
                        <i className="bi bi-file-earmark-text consult-doc-icon" />
                        <div className="flex-grow-1">
                          <div className="consult-context-value">{d.fileName}</div>
                          <div className="consult-context-sub">{d.uploadedAt.slice(0, 10)}{d.uploadedByName ? ` · ${d.uploadedByName}` : ''}</div>
                        </div>
                        <a className="dash-toolbar-btn" href={d.fileUrl} target="_blank" rel="noreferrer"><i className="bi bi-eye" /> {t('patientRecord.openDocument')}</a>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted mb-0">{t('patientRecord.noAssociatedDocuments')}</p>
                  )}
                </>
              )}
            </div>

            {tab === 'anamnese' && (
              <div className="consult-avaliacoes">
                <div className="consult-panel-subheader">
                  {t('patientRecord.assessments')} ({assessments.length})
                  <button className="consult-add-avaliacao-btn" onClick={() => setOpenModal('avaliacoes')}><i className="bi bi-plus-lg" /> {t('patientRecord.addAssessment')}</button>
                </div>
                {assessments.slice(0, 3).map((a, idx) => (
                  <div className="consult-avaliacao-card" key={a.id}>
                    <div className="consult-avaliacao-header">
                      <span className={`consult-avaliacao-dot ${idx % 2 === 0 ? 'dot-blue' : 'dot-purple'}`} />
                      <span className="consult-avaliacao-title">{t('patientRecord.assessment')} {assessments.length - idx}</span>
                      <button className="consult-link-btn consult-avaliacao-edit" onClick={() => setOpenModal('avaliacoes')}>{t('common.edit')}</button>
                    </div>
                    <div className="consult-avaliacao-field">
                      <div className="consult-field-label">{t('patientRecord.diagnosticHypothesis')}</div>
                      <div>{a.hypothesis}</div>
                    </div>
                    <div className="consult-avaliacao-field">
                      <div className="consult-field-label">{t('patientRecord.diagnosticPlan')}</div>
                      <div>{a.plan}</div>
                    </div>
                  </div>
                ))}
                {assessments.length === 0 && <p className="consult-context-sub">{t('patientRecord.noAssessments')}</p>}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT column */}
        <div className="consult-col-right">
          <div className="consult-panel">
            <div className="consult-panel-header">
              {t('patientRecord.vitalSigns')}
              <button className="consult-link-btn" onClick={() => setOpenModal('vitais')}>{t('common.edit')}</button>
            </div>
            {latestVital ? (
              <div className="consult-vitals-grid">
                <div className="consult-vital-tile"><i className="bi bi-heart-pulse consult-vital-icon" /><div className="consult-vital-label">{t('patientRecord.vitalBP')}</div><div className="consult-vital-value">{latestVital.bloodPressureSystolic && latestVital.bloodPressureDiastolic ? `${latestVital.bloodPressureSystolic}/${latestVital.bloodPressureDiastolic}` : '—'}</div><div className="consult-vital-unit">mmHg</div></div>
                <div className="consult-vital-tile"><i className="bi bi-heart consult-vital-icon" /><div className="consult-vital-label">{t('patientRecord.vitalHR')}</div><div className="consult-vital-value">{latestVital.heartRate ?? '—'}</div><div className="consult-vital-unit">bpm</div></div>
                <div className="consult-vital-tile"><i className="bi bi-lungs consult-vital-icon" /><div className="consult-vital-label">{t('patientRecord.vitalRR')}</div><div className="consult-vital-value">{latestVital.respiratoryRate ?? '—'}</div><div className="consult-vital-unit">irpm</div></div>
                <div className="consult-vital-tile"><i className="bi bi-thermometer-half consult-vital-icon" /><div className="consult-vital-label">{t('patientRecord.vitalTemp')}</div><div className="consult-vital-value">{latestVital.temperature ?? '—'}</div><div className="consult-vital-unit">°C</div></div>
                <div className="consult-vital-tile"><i className="bi bi-droplet-half consult-vital-icon" /><div className="consult-vital-label">SpO2</div><div className="consult-vital-value">{latestVital.spo2 ?? '—'}</div><div className="consult-vital-unit">%</div></div>
                <div className="consult-vital-tile"><i className="bi bi-speedometer2 consult-vital-icon" /><div className="consult-vital-label">{t('patientRecord.vitalWeight')}</div><div className="consult-vital-value">{latestVital.weight ?? '—'}</div><div className="consult-vital-unit">kg</div></div>
                <div className="consult-vital-tile"><i className="bi bi-arrows-vertical consult-vital-icon" /><div className="consult-vital-label">{t('patientRecord.vitalHeight')}</div><div className="consult-vital-value">{latestVital.height ?? '—'}</div><div className="consult-vital-unit">cm</div></div>
                <div className="consult-vital-tile"><i className="bi bi-graph-up consult-vital-icon" /><div className="consult-vital-label">{t('patientRecord.vitalBMI')}</div><div className="consult-vital-value">{bmi(latestVital.weight, latestVital.height)}</div><div className="consult-vital-unit">kg/m²</div></div>
              </div>
            ) : (
              <p className="consult-context-sub mb-0">{t('patientRecord.noVitalSigns')}</p>
            )}
          </div>

          <div className="consult-panel">
            <div className="consult-panel-header">
              {t('patientRecord.tabDocuments')}
              <button className="consult-link-btn" onClick={() => setOpenModal('documentos')}>{t('common.viewAll')}</button>
            </div>
            {documents.slice(0, 3).map((d) => (
              <div className="consult-doc-row" key={d.id}>
                <i className="bi bi-file-earmark-text consult-doc-icon" />
                <div className="flex-grow-1">
                  <div className="consult-context-value">{d.fileName}</div>
                  <div className="consult-context-sub">{d.uploadedAt.slice(0, 10)}</div>
                </div>
                <a className="consult-doc-badge" href={d.fileUrl} target="_blank" rel="noreferrer"><i className="bi bi-eye" /> {t('patientRecord.openDocument')}</a>
              </div>
            ))}
            {documents.length === 0 && <p className="consult-context-sub mb-0">{t('patientRecord.noAssociatedDocuments')}</p>}
          </div>

          <div className="consult-panel">
            <div className="consult-panel-header">
              {t('nav.family')}
            </div>
            {familyCircle.length > 0 ? (
              familyCircle.map((f) => (
                <div className="consult-doc-row" key={f.userId}>
                  <i className="bi bi-person-circle consult-doc-icon" />
                  <div className="flex-grow-1">
                    <div className="consult-context-value">{f.name}</div>
                    <div className="consult-context-sub">{relationshipLabel(f, t)}</div>
                  </div>
                  {f.phone ? (
                    <a className="consult-doc-badge" href={`tel:${f.phone}`}>{f.phone}</a>
                  ) : (
                    <span className="consult-context-sub mb-0">—</span>
                  )}
                </div>
              ))
            ) : (
              <p className="consult-context-sub mb-0">{t('patientRecord.noFamilyCircle')}</p>
            )}
          </div>

          <div className="consult-panel">
            <div className="consult-panel-header">
              Notas
              <button className="consult-link-btn" onClick={() => setOpenModal('notas')}>Ver notas</button>
            </div>
            {notes.length > 0 ? (
              <div className="consult-context-item context-plain">
                <i className="bi bi-sticky" />
                <div className="flex-grow-1">
                  <div className="consult-context-title">{notes[0].section}</div>
                  <div className="consult-context-value">{notes[0].noteText}</div>
                  <div className="consult-context-sub">{notes[0].updatedAt.slice(0, 16).replace('T', ' ')}</div>
                </div>
              </div>
            ) : (
              <p className="consult-context-sub mb-0">Sem notas registadas.</p>
            )}
          </div>

          <div className="consult-panel">
            <div className="consult-panel-header">
              {t('patientRecord.teamChat')}
              <button className="consult-link-btn" onClick={() => setOpenModal('chat')}>{t('patientRecord.viewConversations')}</button>
            </div>
            {chatMessages.length > 0 ? (
              <div className="consult-chat-row">
                <div className="consult-chat-avatar">
                  {chatMessages[chatMessages.length - 1].authorName.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                </div>
                <div className="flex-grow-1">
                  <div className="consult-context-value">{chatMessages[chatMessages.length - 1].authorName}</div>
                  <div className="consult-context-sub">{chatMessages[chatMessages.length - 1].message}</div>
                </div>
                <div className="consult-chat-meta">
                  <small className="text-muted">{chatMessages[chatMessages.length - 1].createdAt.slice(11, 16)}</small>
                </div>
              </div>
            ) : (
              <p className="consult-context-sub mb-0">{t('patientRecord.noMessagesYet')}</p>
            )}
          </div>
        </div>
      </div>

      {openModal === 'contexto' && <ContextoClinicoModal userId={uid} onClose={closeModalAndReload} />}
      {openModal === 'prescricao' && <PrescricaoModal userId={uid} onClose={closeModalAndReload} />}
      {openModal === 'exames' && <ExamesModal userId={uid} onClose={closeModalAndReload} />}
      {openModal === 'vitais' && <VitalSignsModal userId={uid} onClose={closeModalAndReload} />}
      {openModal === 'avaliacoes' && <AssessmentsModal userId={uid} onClose={closeModalAndReload} />}
      {openModal === 'anamnese' && <AnamneseModal userId={uid} onClose={closeModalAndReload} />}
      {openModal === 'documentos' && <DocumentsModal userId={uid} onClose={closeModalAndReload} />}
      {openModal === 'chat' && <ChatModal userId={uid} onClose={closeModalAndReload} />}
      {openModal === 'notas' && <NotesModal userId={uid} startedAt={startedAt.toISOString()} onClose={closeModalAndReload} />}
    </Layout>
  )
}
