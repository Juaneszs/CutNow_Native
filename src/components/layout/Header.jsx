import { useNavigate, Link } from "react-router-dom";
import { useRef, useState } from "react";
import { useAuth } from "../../context/useAuth";
import AlertaAcceso from "../comunes/AlertaAcceso";
import Dialogo from "../comunes/Dialogo";
import "../Styles/Layout.css";

export default function Header() {
  const { user, perfil, isAdmin, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const navRef = useRef(null);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [gestionarAbierto, setGestionarAbierto] = useState(false);
  const [mostrarAcceso, setMostrarAcceso] = useState(false);
  const [errorSesion, setErrorSesion] = useState(false);

  const cerrarMenu = () => {
    setMenuAbierto(false);
    setGestionarAbierto(false);
  };

  const handleLogout = async () => {
    try {
      await cerrarSesion();
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      setErrorSesion(true);
    }
    cerrarMenu();
  };

  const handleProtected = (path) => (e) => {
    e.preventDefault();
    if (!user) {
      cerrarMenu();
      setMostrarAcceso(true);
    } else {
      navigate(path);
      cerrarMenu();
    }
  };

  return (
    <header className="main-header">
      <div className="header-container">
        <Link to={user ? "/catalogo" : "/"} className="header-logo">
          Cut<span className="text-green">Now</span>
        </Link>

        <button
          className="mobile-menu-toggle"
          aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuAbierto}
          onClick={() => setMenuAbierto(open => !open)}
        >
          {menuAbierto ? "×" : "☰"}
        </button>

        <nav ref={navRef} className={`header-nav ${menuAbierto ? "is-open" : ""}`}>
          {user && <Link to="/catalogo" className="nav-link" onClick={cerrarMenu}>Inicio</Link>}
          <Link to="/tienda" className="nav-link" onClick={cerrarMenu}>Tienda</Link>
          {user ? (
            <>
              <Link to="/mis-citas" className="nav-link" onClick={cerrarMenu}>Mis Citas</Link>
              {isAdmin && (
                <Link to="/admin" className="nav-link admin-nav-link" onClick={cerrarMenu}>
                  ⚙ Admin
                </Link>
              )}
              {isAdmin && (
                <Link to="/admin/citas" className="nav-link admin-nav-link" onClick={cerrarMenu}>
                  📋 Citas
                </Link>
              )}
              {isAdmin && (
                <div className="admin-manage-menu">
                  <button
                    type="button"
                    className="nav-link admin-manage-toggle"
                    aria-expanded={gestionarAbierto}
                    onClick={() => setGestionarAbierto(open => !open)}
                  >
                    Gestionar <span aria-hidden="true">▾</span>
                  </button>
                  {gestionarAbierto && (
                    <div className="admin-manage-dropdown">
                      <Link to="/admin/barberos" className="nav-link" onClick={cerrarMenu}>Barberos</Link>
                      <Link to="/admin/servicios" className="nav-link" onClick={cerrarMenu}>Servicios</Link>
                      <Link to="/admin/sedes" className="nav-link" onClick={cerrarMenu}>Sedes</Link>
                      <Link to="/admin/productos" className="nav-link" onClick={cerrarMenu}>Productos</Link>
                      <Link to="/admin/pedidos" className="nav-link" onClick={cerrarMenu}>Pedidos</Link>
                    </div>
                  )}
                </div>
              )}
              <div className="nav-user-menu">
                <div className="nav-avatar">
                  {perfil?.nombre?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                </div>
                <span className="nav-username">
                  {perfil?.nombre || user.email?.split("@")[0]}
                </span>
                <button className="nav-logout-btn" onClick={handleLogout}>
                  Salir
                </button>
              </div>
            </>
          ) : (
            <>
              <a href="/mis-citas" onClick={handleProtected("/mis-citas")} className="nav-link">Mis Citas</a>
              <Link to="/" className="nav-link login-nav-link" onClick={cerrarMenu}>Iniciar sesión</Link>
              <a href="/agendar" onClick={handleProtected("/agendar")} className="nav-btn-agendar">
                Agendar Cita
              </a>
            </>
          )}

          {user && (
            <a href="/agendar" onClick={handleProtected("/agendar")} className="nav-btn-agendar">
              Agendar Cita
            </a>
          )}
        </nav>
      </div>
      {mostrarAcceso && (
        <AlertaAcceso
          onLogin={() => { setMostrarAcceso(false); cerrarMenu(); navigate("/"); }}
          onRegister={() => { setMostrarAcceso(false); cerrarMenu(); navigate("/registro"); }}
          onCancel={() => setMostrarAcceso(false)}
        />
      )}
      {errorSesion && (
        <Dialogo
          icono="⚠️"
          titulo="No se pudo cerrar sesión"
          mensaje="Intenta de nuevo."
          tipo="aviso"
          onConfirmar={() => setErrorSesion(false)}
        />
      )}
    </header>
  );
}
