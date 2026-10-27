import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import Cargando from "../comunes/Cargando";
import EstadoVacio from "../comunes/EstadoVacio";
import ImagenConFallback from "../comunes/ImagenConFallback";
import "../Styles/Catalogo.css";
import { getBarberos } from "../../services/barberosService";
import { getCitasByUsuario } from "../../services/citasService";
import { formatAppointmentDateTime, parseAppointmentDate } from "../../utils/formatting";

export default function Catalogo() {
  const navigate = useNavigate();
  const { user, perfil } = useAuth();
  const [barberos, setBarberos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorBarberos, setErrorBarberos] = useState("");
  const [citas, setCitas] = useState([]);
  const [cargandoCitas, setCargandoCitas] = useState(true);
  const [errorCitas, setErrorCitas] = useState("");
  
  // 1. Referencia para controlar el carrusel
  const carruselRef = useRef(null);

  useEffect(() => {
    async function cargarBarberos() {
      try {
        setBarberos(await getBarberos());
      } catch (error) {
        console.error("Error al cargar barberos:", error);
        setErrorBarberos("No se pudieron cargar los barberos.");
      } finally {
        setCargando(false);
      }
    }
    cargarBarberos();
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    let activa = true;

    async function cargarCitas() {
      setCargandoCitas(true);
      setErrorCitas("");
      try {
        const snap = await getCitasByUsuario(user.uid);
        if (activa) {
          setCitas(snap);
        }
      } catch (error) {
        console.error("Error al cargar las citas del cliente:", error);
        if (activa) setErrorCitas("No se pudo cargar el resumen de tus citas.");
      } finally {
        if (activa) setCargandoCitas(false);
      }
    }

    cargarCitas();
    return () => { activa = false; };
  }, [user?.uid]);

  const ahora = new Date();
  const citasProximas = citas
    .filter(cita => {
      if (cita.estado !== "pendiente" && cita.estado !== "confirmada") return false;
      const fechaCita = parseAppointmentDate(cita);
      return fechaCita && fechaCita >= ahora;
    })
    .sort((a, b) => parseAppointmentDate(a) - parseAppointmentDate(b));
  const citasFinalizadas = citas.filter(cita => cita.estado === "finalizada").length;
  const proximaCita = citasProximas[0];

  // 2. Funciones para mover las flechas
  const scrollIzquierda = () => {
    if (carruselRef.current) {
      // Movemos 320px hacia la izquierda (aprox. 1 tarjeta + espacio)
      carruselRef.current.scrollBy({ left: -320, behavior: "smooth" });
    }
  };

  const scrollDerecha = () => {
    if (carruselRef.current) {
      // Movemos 320px hacia la derecha
      carruselRef.current.scrollBy({ left: 320, behavior: "smooth" });
    }
  };

  return (
    <div className="catalog-container">
      
      {/* HEADER */}
      <header className="catalog-header">
        <h1>
          <span className="header-logo">Catálogo de <span className="text-green">Barberos</span></span>
        </h1>
        <p>Selecciona un barbero y agenda tu cita</p>
      </header>

      <section className="client-summary">
        <div className="action-card client-summary-card">
          <h2>Hola, {perfil?.nombre || user?.email?.split("@")[0] || "cliente"}</h2>
          {cargandoCitas ? (
            <Cargando mensaje="Cargando..." />
          ) : errorCitas ? (
            <p className="client-summary-error">{errorCitas}</p>
          ) : (
            <>
              <div className="client-summary-stats">
                <div>
                  <strong>{citasProximas.length}</strong>
                  <span>Citas próximas</span>
                </div>
                <div>
                  <strong>{citasFinalizadas}</strong>
                  <span>Citas completadas</span>
                </div>
              </div>
              {proximaCita ? (
                <p className="client-next-appointment">
                  Próxima cita: <strong>
                    {formatAppointmentDateTime(proximaCita)} a las {proximaCita.hora}
                  </strong>
                </p>
              ) : (
                <div className="client-no-appointments">
                  <p>Aún no tienes citas próximas</p>
                  <button className="action-btn solid" onClick={() => navigate("/agendar")}>
                    Agendar una cita <span>→</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── SECCIÓN CARRUSEL DE BARBEROS ── */}
      <section className="carrusel-wrapper">
        
        {/* Flecha Izquierda (Solo se muestra si hay barberos y no está cargando) */}
        {!cargando && barberos.length > 0 && (
          <button className="carrusel-btn left" onClick={scrollIzquierda}>
            &#10094;
          </button>
        )}

        {/* Pista Deslizable */}
        <div className="carrusel-track" ref={carruselRef}>
          
          {cargando && <Cargando mensaje="Cargando la élite de barberos..." />}

          {!cargando && errorBarberos && (
            <EstadoVacio icono="⚠️" mensaje={errorBarberos} />
          )}

          {!cargando && !errorBarberos && barberos.length === 0 && (
            <EstadoVacio icono="💈" mensaje="No hay barberos registrados por el momento." />
          )}

          {/* Tarjetas de Barberos */}
          {barberos.map(barbero => (
            <div key={barbero.id} className="barber-card">
              <div className="avatar-container">
                <ImagenConFallback
                  src={barbero.foto}
                  nombre={barbero.Nombre}
                  className="barber-avatar-img"
                  tipo="barbero"
                />
              </div>

              <h3 className="barber-name">{barbero.Nombre}</h3>
              <p className="barber-specialty">{barbero.especialidad || "Barbero profesional"}</p>

              {/* BOTÓN VERDE */}
              <button
                className="btn-primary"
                onClick={() =>
                  navigate("/agendar", {
                    state: { barberoElegido: barbero }
                  })
                }
              >
                Agendar
              </button>
            </div>
          ))}
        </div>

        {/* Flecha Derecha */}
        {!cargando && barberos.length > 0 && (
          <button className="carrusel-btn right" onClick={scrollDerecha}>
            &#10095;
          </button>
        )}

      </section>

      {/* ── TARJETAS DE ACCIÓN INFERIORES (Sin cambios) ── */}
      <section className="action-cards-container">
        
        {/* TARJETA 1: Mis Citas */}
        <div className="action-card">
          <div className="action-card-top">
            <div className="action-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            </div>
            <div className="action-text">
              <h3>Mis Citas</h3>
              <p>Gestiona tus citas, reprograma o cancela fácilmente desde aquí.</p>
            </div>
          </div>
          <button className="action-btn outline" onClick={() => navigate("/mis-citas")}>
            Ver mis citas <span>→</span>
          </button>
        </div>

        {/* TARJETA 2: Agendar (Destacada) */}
        <div className="action-card highlighted">
          <div className="action-card-top">
            <div className="action-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z"></path></svg>
            </div>
            <div className="action-text">
              <h3>Agendar Cita Rápida</h3>
              <p>Encuentra tu barbero, elige tu servicio y reserva en minutos.</p>
            </div>
          </div>
          <button className="action-btn solid" onClick={() => navigate("/agendar")}>
            Agendar ahora <span>→</span>
          </button>
        </div>

        {/* TARJETA 3: Tienda */}
        <div className="action-card">
          <div className="action-card-top">
            <div className="action-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
            </div>
            <div className="action-text">
              <h3>Visitar Tienda</h3>
              <p>Descubre nuestros productos premium para tu cuidado personal.</p>
            </div>
          </div>
          <button className="action-btn outline" onClick={() => navigate("/tienda")}>
            Ir a la tienda <span>→</span>
          </button>
        </div>

      </section>
    </div>
  );
}
