import { useEffect, useState } from 'react'
import Modal from './Modal'
import { getInstitutionContacts, type InstitutionContact } from '../api/agenda'

interface Props { onClose: () => void }

export default function ContactsModal({ onClose }: Props) {
  const [contacts, setContacts] = useState<InstitutionContact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getInstitutionContacts().then(setContacts).finally(() => setLoading(false))
  }, [])

  return (
    <Modal title="Contactos de Extensão" onClose={onClose}>
      {loading ? (
        <p className="text-muted">A carregar…</p>
      ) : contacts.length === 0 ? (
        <p className="mv-empty-state">Sem contactos registados.</p>
      ) : (
        <table className="mv-modal-table">
          <thead>
            <tr><th>Serviço</th><th>Extensão</th><th></th></tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id}>
                <td>{c.serviceName}</td>
                <td>{c.extension}</td>
                <td>
                  <a className="dash-phone-btn" href={`tel:${c.extension.replace(/\s/g, '')}`} aria-label={`Ligar para ${c.serviceName}`}>
                    <i className="bi bi-telephone-fill" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  )
}
