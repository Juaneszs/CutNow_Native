import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase";
import { useNavigate, Link } from "react-router-dom";
import Cargando from "../comunes/Cargando";
import { isValidEmail, isValidPassword } from "../../utils/validation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Por favor completa todos los campos.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("El correo no tiene un formato válido.");
      return;
    }
    if (!isValidPassword(password)) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setError("");
    setCargando(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/catalogo");
    } catch (e) {
      if (
        e.code === "auth/user-not-found" ||
        e.code === "auth/wrong-password" ||
        e.code === "auth/invalid-credential"
      ) {
        setError("Correo o contraseña incorrectos.");
      } else {
        setError("Error al iniciar sesión. Intenta de nuevo.");
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card login-card">
        <div className="login-heading">
          <span className="login-logo">
            Cut<span>Now</span>
          </span>
          <p className="login-subtitle">
            Bienvenido de vuelta
          </p>
        </div>

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <div className="auth-label-row">
          <label>Correo electrónico</label>
        </div>
        <input
          type="email"
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />

        <div className="auth-label-row password-label-row">
          <label>Contraseña</label>
        </div>
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />

        <div className="login-forgot">
          <Link to="/recuperar-contrasena">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <button onClick={handleLogin} className="btn-primary" disabled={cargando}>
          {cargando ? <Cargando mensaje="Ingresando..." /> : "Iniciar sesión"}
        </button>

        <p className="login-footer">
          ¿No tienes cuenta?{" "}
          <Link to="/registro">
            Regístrate gratis
          </Link>
        </p>

        <p className="login-explore">
          ¿Solo quieres explorar?{" "}
          <Link to="/tienda">
            Ver tienda
          </Link>
        </p>
      </div>
    </div>
  );
}
