import "../Styles/Feedback.css";

export default function Dialogo({
  icono = "⚠️",
  titulo,
  mensaje,
  confirmar = "Aceptar",
  cancelar,
  onConfirmar,
  onCancelar,
  tipo = "confirmacion",
}) {
  return (
    <div className="dialog-overlay" role="presentation">
      <section className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <span className="dialog-icon" aria-hidden="true">{icono}</span>
        <h2 id="dialog-title">{titulo}</h2>
        <p>{mensaje}</p>
        <div className="dialog-actions">
          {cancelar && (
            <button className="dialog-button secondary" onClick={onCancelar}>
              {cancelar}
            </button>
          )}
          <button className={`dialog-button ${tipo === "aviso" ? "primary" : "danger"}`} onClick={onConfirmar}>
            {confirmar}
          </button>
        </div>
      </section>
    </div>
  );
}
