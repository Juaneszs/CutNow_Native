import "../Styles/Feedback.css";

export default function EstadoVacio({ icono = "📭", mensaje, boton, onClick }) {
  return (
    <div className="empty-state-card">
      <span className="empty-state-icon" aria-hidden="true">{icono}</span>
      <p>{mensaje}</p>
      {boton && <button className="empty-state-button" onClick={onClick}>{boton}</button>}
    </div>
  );
}
