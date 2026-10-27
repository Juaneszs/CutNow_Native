import "../Styles/Feedback.css";

export default function Cargando({ mensaje = "Cargando..." }) {
  return (
    <div className="loading-indicator" role="status" aria-live="polite">
      <span className="loading-spinner" aria-hidden="true" />
      <span>{mensaje}</span>
    </div>
  );
}
