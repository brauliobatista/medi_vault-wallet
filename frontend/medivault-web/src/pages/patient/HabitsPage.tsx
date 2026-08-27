import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { getUser } from '../../hooks/useAuth'
import { getHabits } from '../../api/medical'
import { useTranslation } from '../../i18n/LanguageContext'

export default function HabitsPage() {
  const user = getUser()!
  const { t } = useTranslation()
  const [habits, setHabits] = useState<Record<string, unknown>[]>([])

  useEffect(() => { getHabits(user.id).then(setHabits) }, [user.id])

  const habitLabels: Record<number, string> = {
    1: t('habits.typeAlcohol'), 2: t('habits.typeTobacco'), 3: t('habits.typeDrugs'),
    4: t('habits.typeGambling'), 5: t('habits.typePhysicalActivity'),
  }

  return (
    <Layout>
      <p className="text-muted small mb-3">
        <i className="bi bi-info-circle me-1" />{t('patient.infoManagedByDoctor')}
      </p>
      {habits.length === 0 ? (
        <p className="text-muted">{t('patient.noRecords')}</p>
      ) : (
        <div className="row g-3">
          {habits.map((h) => (
            <div className="col-md-6" key={String(h.id)}>
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-white fw-semibold border-bottom">
                  {habitLabels[Number(h.typeId)] ?? t('habits.typeFallback', { id: String(h.typeId) })}
                </div>
                <div className="card-body">
                  <dl className="mb-0 row">
                    {Boolean(h.name) && <><dt className="col-5 small text-muted">{t('habits.fieldType')}</dt><dd className="col-7 small">{String(h.name)}</dd></>}
                    {Boolean(h.frequency) && <><dt className="col-5 small text-muted">{t('habits.fieldFrequency')}</dt><dd className="col-7 small">{String(h.frequency)}</dd></>}
                    {Boolean(h.quantity) && <><dt className="col-5 small text-muted">{t('habits.fieldQuantity')}</dt><dd className="col-7 small">{String(h.quantity)}</dd></>}
                    {Boolean(h.startDate) && <><dt className="col-5 small text-muted">{t('habits.fieldSince')}</dt><dd className="col-7 small">{String(h.startDate)}</dd></>}
                  </dl>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
