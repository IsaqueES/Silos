export default function DangerZone({ text, button, onClick, disabled }) {
  return (
    <div className="danger-zone">
      <div>
        <b>Zona de perigo</b>
        <div className="muted">{text}</div>
      </div>
      <button className="btn danger-outline" onClick={onClick} disabled={disabled}>
        {button}
      </button>
    </div>
  )
}
