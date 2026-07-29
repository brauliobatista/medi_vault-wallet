import type { ReactNode } from 'react'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
}

export default function Modal({ title, onClose, children }: Props) {
  return (
    <div className="mv-modal-overlay" onClick={onClose}>
      <div className="mv-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="mv-modal-header">
          <h5 className="mv-modal-title">{title}</h5>
          <button className="mv-modal-close" onClick={onClose} aria-label="Fechar">
            <i className="bi bi-x-lg" />
          </button>
        </div>
        <div className="mv-modal-body">{children}</div>
      </div>
    </div>
  )
}
