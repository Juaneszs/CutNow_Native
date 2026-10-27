import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import Cargando from "../comunes/Cargando";
import Dialogo from "../comunes/Dialogo";
import EstadoVacio from "../comunes/EstadoVacio";
import styles from "../Styles/MisCitas.module.css";
import {
  calificarCita,
  cancelarCita as cancelarCitaService,
  getCitasFinalizadasByBarbero,
  subscribeCitasByUsuarioEstado,
} from "../../services/citasService";
import { actualizarPromedioCalificaciones } from "../../services/barberosService";
import { formatDate, formatPrice } from "../../utils/formatting";


// Scalificacion con estrellas y comentario
function ValoracionModal({ cita, onCerrar, onError }) {
  const [estrellas, setEstrellas] = useState(0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function recalcularPromedioBarbero(barberoId) {
    try {
      const citas = await getCitasFinalizadasByBarbero(barberoId);
      await actualizarPromedioCalificaciones(barberoId, citas);
    } catch (e) {
      console.error("Error recalculando promedio:", e);
    }
  }

  async function handleEnviar() {
    if (estrellas === 0) return;
    setGuardando(true);
    try {
      await calificarCita(cita.id, estrellas, comentario);
      // calcular promedio del barbero
      if (cita.barbero_id) {
        await recalcularPromedioBarbero(cita.barbero_id);
      }
      setEnviado(true);
      setTimeout(onCerrar, 1500);
    } catch (e) {
      console.error("Error al guardar la valoración:", e);
      onError("Error al guardar la valoración. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="rating-overlay">
      <div className="rating-modal-card">
        {enviado ? (
          <>
            <div className="rating-success-icon">🎉</div>
            <h3 className="rating-modal-title">¡Gracias por tu valoración!</h3>
          </>
        ) : (
          <>
            <div className="rating-modal-icon">⭐</div>
            <h3 className="rating-modal-title">Valorar servicio</h3>
            <p className="rating-modal-copy">
              ¿Cómo fue tu experiencia con <strong>{cita.barbero_nombre}</strong>?
            </p>

            {/* Estrellas */}
            <div className="rating-star-picker">
              {[1, 2, 3, 4, 5].map(n => (
                <span
                  key={n}
                  onClick={() => setEstrellas(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  className={`rating-pick-star ${n <= (hover || estrellas) ? "selected" : ""}`}
                >★</span>
              ))}
            </div>

            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Escribe un comentario (opcional)..."
              rows={3}
              className="rating-comment-input"
            />

            <div className="rating-modal-actions">
              <button
                className="rating-submit-button"
                onClick={handleEnviar}
                disabled={estrellas === 0 || guardando}
              >
                {guardando ? "Guardando..." : "Enviar valoración"}
              </button>
              <button
                className="rating-cancel-button"
                onClick={onCerrar}
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function MisCitas() {
  const navigate = useNavigate();
  const { user, cargando: authCargando } = useAuth();
  const [tabActivo, setTabActivo] = useState("pendiente");
  const [citas, setCitas] = useState([]);
  const [consultaCargada, setConsultaCargada] = useState("");
  const [citaAValorar, setCitaAValorar] = useState(null);
  const [dialogo, setDialogo] = useState(null);
  const queryKey = user ? `${user.uid}:${tabActivo}` : "";

  useEffect(() => {
    if (authCargando) return;
    if (!user) {
      navigate("/");
      return;
    }

    const cancelar = subscribeCitasByUsuarioEstado(user.uid, tabActivo, data => {
      setCitas(data);
      setConsultaCargada(queryKey);
    }, error => {
      console.error("Error al cargar las citas:", error);
      setCitas([]);
      setConsultaCargada(queryKey);
      setDialogo({
        icono: "⚠️",
        titulo: "No se pudieron cargar las citas",
        mensaje: "Intenta de nuevo más tarde.",
        confirmar: "Entendido",
        tipo: "aviso",
      });
    });

    return () => cancelar();
  }, [queryKey, tabActivo, navigate, user, authCargando]);

  function cancelarCita(cita) {
    setDialogo({
      titulo: "¿Cancelar cita?",
      mensaje: `¿Cancelar tu cita del ${cita.fecha} a las ${cita.hora} con ${cita.barbero_nombre}?`,
      confirmar: "Sí, cancelar",
      cancelar: "Volver",
      onConfirmar: () => confirmarCancelacion(cita),
    });
  }

  async function confirmarCancelacion(cita) {
    setDialogo(null);
    try {
      await cancelarCitaService(cita.id, cita.barbero_id, cita.fecha, cita.hora);
    } catch (e) {
      console.error("Error al cancelar cita:", e);
      setDialogo({
        icono: "⚠️",
        titulo: "No se pudo cancelar",
        mensaje: "Intenta de nuevo.",
        confirmar: "Entendido",
        tipo: "aviso",
      });
    }
  }

  function formatearFecha(fechaStr) {
    const [year, month, day] = fechaStr.split("-").map(Number);
    return formatDate(new Date(year, month - 1, day));
  }

  const tabs = [
    { valor: "pendiente",  etiqueta: "📅 Próximas" },
    { valor: "confirmada", etiqueta: "✓ Confirmadas" },
    { valor: "finalizada", etiqueta: "✅ Completadas" },
    { valor: "cancelada",  etiqueta: "❌ Canceladas" },
  ];

  return (
    <div className="catalog-container">
      {dialogo && (
        <Dialogo
          {...dialogo}
          onConfirmar={() => dialogo.onConfirmar ? dialogo.onConfirmar() : setDialogo(null)}
          onCancelar={() => setDialogo(null)}
        />
      )}
      {citaAValorar && (
        <ValoracionModal
          cita={citaAValorar}
          onCerrar={() => setCitaAValorar(null)}
          onError={mensaje => setDialogo({ titulo: "Error", mensaje, tipo: "aviso" })}
        />
      )}

      <header className="catalog-header">
        <h1><span className="header-logo">Mis Citas</span></h1>
        <p>Administra tus citas y revisa tu historial</p>
      </header>

      {/* TABS */}
      <div className={styles.tabsRow}>
        {tabs.map(tab => (
          <button
            key={tab.valor}
            className={`${styles.tabBtn} ${tabActivo === tab.valor ? styles.active : ""}`}
            onClick={() => setTabActivo(tab.valor)}
          >
            {tab.etiqueta}
          </button>
        ))}
      </div>

      {/* CONTENIDO */}
      {authCargando || (user && consultaCargada !== queryKey) ? (
        <div className={styles.containerCentrado}>
          <Cargando />
        </div>
      ) : citas.length === 0 ? (
        <div className={styles.containerCentrado}>
          <EstadoVacio
            icono={tabActivo === "pendiente" ? "📅" : tabActivo === "confirmada" ? "✓" : tabActivo === "finalizada" ? "✅" : "❌"}
            mensaje={tabActivo === "pendiente"
              ? "No tienes citas próximas."
              : tabActivo === "confirmada"
                ? "No tienes citas confirmadas."
                : tabActivo === "finalizada"
                  ? "Aún no tienes citas completadas."
                  : "No tienes citas canceladas."}
          />
          {tabActivo === "pendiente" && (
            <button
              className="btn-primary mis-citas-empty-action"
              onClick={() => navigate("/agendar")}
            >
              Agendar una cita
            </button>
          )}
        </div>
      ) : (
        <div className={styles.citasGrid}>
          {citas.map(cita => (
            <div key={cita.id} className={`barber-card ${styles.appointmentCard}`}>

              <div className={styles.cardHeader}>
                <div>
                  <div className={styles.appointmentIcon}>💈</div>
                  <h3 className={styles.appointmentBarber}>{cita.barbero_nombre}</h3>
                </div>
                <span className={`badge ${
                  cita.estado === "pendiente"  ? "pending"
                  : cita.estado === "confirmada" ? styles.badgeConfirmada
                  : cita.estado === "finalizada" ? "done"
                  : styles.badgeCancelada
                }`}>
                  {cita.estado === "pendiente"  ? "Próxima"
                    : cita.estado === "confirmada" ? "Confirmada"
                    : cita.estado === "finalizada" ? "Completada"
                    : "Cancelada"}
                </span>
              </div>

              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Servicio</span>
                <span className={styles.infoValor}>{cita.servicio_nombre}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Fecha</span>
                <span className={styles.infoValor}>{formatearFecha(cita.fecha)}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Hora</span>
                <span className={styles.infoValor}>{cita.hora}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Sede</span>
                <span className={styles.infoValor}>{cita.sede_nombre || "—"}</span>
              </div>
              <div className={`${styles.infoRow} ${styles.noBorder}`}>
                <span className={styles.infoLabel}>Total</span>
                <span className={styles.infoTotal}>
                  {formatPrice(cita.servicio_precio || cita.precio || 0)}
                </span>
              </div>

              {/* Calificación existente */}
              {cita.calificacion && (
                <div className={styles["rating-display"]}>
                  <p className={styles["rating-display-title"]}>Tu valoración:</p>
                  <div className={styles["rating-display-stars"]}>
                    {[1,2,3,4,5].map(n => (
                      <span key={n} className={n <= cita.calificacion ? styles.starSelected : styles.starUnselected}>★</span>
                    ))}
                  </div>
                  {cita.comentario && (
                    <p className={styles.ratingComment}>
                      "{cita.comentario}"
                    </p>
                  )}
                </div>
              )}

              {/* Acciones */}
              <div className={styles.appointmentActions}>
                
                {/*incluye pendiente o confirmada */}
                {(cita.estado === "pendiente" || cita.estado === "confirmada") && (
                  <button
                    className={styles.btnCancelarCita}
                    onClick={() => cancelarCita(cita)}
                  >
                    Cancelar cita
                  </button>
                )}

                {cita.estado === "finalizada" && !cita.calificado && (
                  <button
                    className="btn-primary mis-citas-rate-action"
                    onClick={() => setCitaAValorar(cita)}
                  >
                    ⭐ Valorar servicio
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.footerActions}>
        <button
          className="btn-primary mis-citas-new-action"
          onClick={() => navigate("/agendar")}
        >
          + Agendar nueva cita
        </button>
      </div>
    </div>
  );
}
