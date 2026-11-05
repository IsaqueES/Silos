export default function DangerZone({ title = 'Zona de perigo', text, button, onClick, disabled }) {
  return (
    <div className="danger-zone">
      <div>
        <b>{title}</b>
        <div className="muted">{text}</div>
      </div>
      <button className="btn danger-outline" onClick={onClick} disabled={disabled}>
        {button}
      </button>
    </div>
  )
}
