import "../Styles/Feedback.css";

export default function AlertaAcceso({ onLogin, onRegister, onCancel }) {
  return (
    <div className="dialog-overlay" role="presentation">
      <section className="dialog-card access-dialog" role="dialog" aria-modal="true" aria-labelledby="access-dialog-title">
        <span className="dialog-icon" aria-hidden="true">✂️</span>
        <h2 id="access-dialog-title">Acceso Restringido</h2>
        <p>Debes iniciar sesión o registrarte para gestionar tu perfil.</p>
        <div className="dialog-actions">
          <button className="dialog-button primary" onClick={onLogin}>Iniciar sesión</button>
          <button className="dialog-button outline" onClick={onRegister}>Registrarse</button>
        </div>
        <button className="dialog-cancel" onClick={onCancel}>Cancelar</button>
      </section>
    </div>
  );
}
