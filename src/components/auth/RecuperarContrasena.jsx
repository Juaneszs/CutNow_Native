import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../firebase";
import { Link } from "react-router-dom";
import Cargando from "../comunes/Cargando";
import { isValidEmail } from "../../utils/validation";

export default function RecuperarContrasena() {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState("idle");
  const [error, setError] = useState("");

  const handleEnviar = async () => {
    if (!email) {
      setError("Ingresa tu correo electrónico.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("El correo no tiene un formato válido.");
      return;
    }
    setError("");
    setEstado("enviando");
    try {
      await sendPasswordResetEmail(auth, email);
      setEstado("enviado");
    } catch (e) {
      if (e.code === "auth/user-not-found") {
        setError("No encontramos una cuenta con ese correo.");
      } else {
        setError("Ocurrió un error. Intenta de nuevo.");
      }
      setEstado("error");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card recovery-card">

        {/* Header */}
        <div className="recovery-heading">
          <div className="recovery-icon">🔑</div>
          <span className="recovery-logo">
            Cut<span>Now</span>
          </span>
          <h2>
            Recuperar contraseña
          </h2>
          <p>
            Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
          </p>
        </div>

        {/* Estado enviado */}
        {estado === "enviado" ? (
          <div className="recovery-success">
            <div className="recovery-success-box">
              <div className="recovery-success-icon">✅</div>
              <p className="recovery-success-title">
                ¡Correo enviado!
              </p>
              <p className="recovery-success-detail">
                Revisa tu bandeja de entrada (y la carpeta de spam) en <strong>{email}</strong>
              </p>
            </div>
            <Link to="/" className="btn-primary recovery-link">
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <>
            {/* Error */}
            {error && (
              <div className="auth-error">
                {error}
              </div>
            )}

            {/* Input */}
            <div className="auth-label-row">
              <label>Correo electrónico</label>
            </div>
            <input
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEnviar()}
            />

            <button
              onClick={handleEnviar}
              className="btn-primary"
              disabled={estado === "enviando"}
            >
              {estado === "enviando" ? <Cargando mensaje="Enviando..." /> : "Enviar enlace de recuperación"}
            </button>

            <p className="recovery-footer">
              ¿Recuerdas tu contraseña?{" "}
              <Link to="/">
                Inicia sesión
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
