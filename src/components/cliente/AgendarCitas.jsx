
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Cargando from "../comunes/Cargando";
import EstadoVacio from "../comunes/EstadoVacio";
import "../Styles/AgendarCitas.css";
import { useAuth } from "../../context/useAuth";
import { crearCitaConReserva } from "../../services/citasService";
import { getOccupiedSlots } from "../../services/disponibilidadService";
import { getBarberosActivosPorSede } from "../../services/barberosService";
import { getSedesActivas } from "../../services/sedesService";
import { getServiciosActivos } from "../../services/serviciosService";
import { generateAvailableHours } from "../../utils/appointmentSlots";
import { getTomorrowLocal } from "../../utils/dates";
import { formatPrice } from "../../utils/formatting";

export default function AgendarCitas() {
  const navigate = useNavigate();
  const location = useLocation();
  const barberoDesdeCatalogo = location.state?.barberoElegido || null;
  const { user } = useAuth();

  // ── Datos de Firestore ────────────────────────────────────
  const [sedes, setSedes] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [barberos, setBarberos] = useState([]);
  const [horasDisponibles, setHorasDisponibles] = useState([]);
  const [cargandoHoras, setCargandoHoras] = useState(false);

  // ── Elecciones del usuario ────────────────────────────────
  const [sedeElegida, setSedeElegida] = useState(null);
  const [servicioElegido, setServicioElegido] = useState(null);
  const [barberoElegido, setBarberoElegido] = useState(null);
  const [fechaElegida, setFechaElegida] = useState("");
  const [horaElegida, setHoraElegida] = useState("");

  // ── UI ────────────────────────────────────────────────────
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState(false);

  // ── Carga inicial ─────────────────────────────────────────
  useEffect(() => {
    async function cargar() {
      try {
        const [sedesActivas, serviciosActivos] = await Promise.all([
          getSedesActivas(),
          getServiciosActivos(),
        ]);
        setSedes(sedesActivas);
        setServicios(serviciosActivos);
      } catch (error) {
        console.error("Error al cargar sedes y servicios:", error);
        setError("No se pudieron cargar los datos. Recarga la página.");
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, []);

  // ── Preseleccionar barbero si viene del catálogo ──────────
  useEffect(() => {
    if (barberoDesdeCatalogo && sedes.length > 0) {
      const sede = sedes.find(item => item.id === barberoDesdeCatalogo.sede_id);
      if (!sede) {
        setError("No se encontró la sede del barbero seleccionado.");
        return;
      }
      setSedeElegida(sede);
      setBarberoElegido(barberoDesdeCatalogo);
    }
  }, [barberoDesdeCatalogo, sedes]);

  // ── Carga barberos cuando cambia la sede ─────────────────
  useEffect(() => {
    if (!sedeElegida) return;

    if (!barberoDesdeCatalogo) {
      setBarberoElegido(null);
    }

    setHoraElegida("");
    setHorasDisponibles([]);

    let activo = true;
    async function cargarBarberos() {
      try {
        const datos = await getBarberosActivosPorSede(sedeElegida.id);
        if (activo) setBarberos(datos);
      } catch (error) {
        console.error("Error al cargar barberos:", error);
        if (activo) setError("No se pudieron cargar los barberos de esta sede.");
      }
    }
    cargarBarberos();
    return () => { activo = false; };
  }, [sedeElegida, barberoDesdeCatalogo]);

  // ── Carga horas cuando cambia barbero, fecha o servicio ──
  useEffect(() => {
    if (!barberoElegido || !fechaElegida || !servicioElegido) {
      setHorasDisponibles([]);
      setCargandoHoras(false);
      return;
    }
    let activo = true;
    setHoraElegida("");
    setCargandoHoras(true);

    async function cargarHoras() {
      try {
        const ocupados = await getOccupiedSlots(barberoElegido.id, fechaElegida);
        if (activo) setHorasDisponibles(generateAvailableHours(servicioElegido.duracion_min || 30, ocupados));
      } catch (error) {
        console.error("Error al buscar horas disponibles:", error);
        if (activo) {
          setHorasDisponibles([]);
          setError("No se pudieron buscar horas disponibles. Intenta de nuevo.");
        }
      } finally {
        if (activo) setCargandoHoras(false);
      }
    }
    cargarHoras();
    return () => { activo = false; };
  }, [barberoElegido, fechaElegida, servicioElegido]);

  // ── Fecha mínima: mañana ──────────────────────────────────
  const fechaMinima = getTomorrowLocal();

  // ── Confirmar y guardar la cita en Firestore ─────────────
  async function confirmarCita() {
    if (!sedeElegida || !servicioElegido || !barberoElegido || !fechaElegida || !horaElegida) {
      setError("Por favor completa todos los pasos antes de confirmar.");
      return;
    }
    setError("");
    setGuardando(true);

    try {
      if (!user) throw new Error("Debes iniciar sesión para agendar una cita.");
      await crearCitaConReserva({
        usuario_id: user.uid,
        usuario_nombre: user.displayName || user.email,
        barbero_id: barberoElegido.id,
        barbero_nombre: barberoElegido.Nombre,
        servicio_id: servicioElegido.id,
        servicio_nombre: servicioElegido.NomCorte,
        servicio_precio: servicioElegido.Precio,
        sede_id: sedeElegida.id,
        sede_nombre: sedeElegida.NomSede,
        fecha: fechaElegida,
        hora: horaElegida,
        estado: "pendiente",
        precio: servicioElegido.Precio || 0,
        calificacion: null,
        calificado: false,
      });

      setExito(true);
    } catch (e) {
      setError(e.message || "No se pudo agendar la cita. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  function resetear() {
    setExito(false);
    setSedeElegida(null);
    setServicioElegido(null);
    setBarberoElegido(null);
    setFechaElegida("");
    setHoraElegida("");
    setError("");
  }

  const todoCompleto = sedeElegida && servicioElegido && barberoElegido && fechaElegida && horaElegida;
  const pasos = [sedeElegida, servicioElegido, barberoElegido, fechaElegida, horaElegida];

  // ── Pantalla de éxito
  if (exito) {
    return (
      <div className="exito-wrap">
        <div className="exito-card">
          <div className="exito-icono">✅</div>
          <h2 className="exito-titulo">¡Cita agendada!</h2>
          <p className="exito-detalle">{barberoElegido?.Nombre} · {servicioElegido?.NomCorte}</p>
          <p className="exito-fecha">{fechaElegida} · {horaElegida}</p>
          <p className="exito-precio">{formatPrice(servicioElegido?.Precio)}</p>
          <div className="exito-btns">
            <button className="btn-ver-citas" onClick={() => navigate("/mis-citas")}>
              Ver mis citas
            </button>
            <button className="btn-agendar-otra" onClick={resetear}>
              Agendar otra
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Pantalla de carga
  if (cargando) {
    return <div className="agendar-cargando"><Cargando mensaje="Cargando..." /></div>;
  }

  // ── Pantalla principal
  return (
    <div className="agendar-pagina">
      <div className="agendar-contenedor">

        {/* TÍTULO */}
        <h1 className="agendar-titulo">
          <span className="header-logo">Agendar Cita</span>
        </h1>

        {/*barra de progreso */}
        <div className="agendar-progreso">
          {[1, 2, 3, 4, 5].map((n, i) => (
            <div
              key={n}
              className={`progreso-dot ${pasos[i] ? "completado" : ""}`}
            >
              {pasos[i] ? "✓" : n}
            </div>
          ))}
        </div>

        {/*error*/}
        {error && <div className="agendar-error">{error}</div>}

        {/*paso 1, sede */}
        <div className="agendar-grupo">
          <label className="agendar-label">
            <span className="agendar-numerito">1</span> Elige Sede
          </label>
          <select
            className="agendar-select"
            value={sedeElegida?.id || ""}
            onChange={e => setSedeElegida(sedes.find(x => x.id === e.target.value) || null)}
          >
            <option value="">Selecciona una sede...</option>
            {sedes.map(sede => (
              <option key={sede.id} value={sede.id}>
                {sede.NomSede} — {sede.Ciudad}
              </option>
            ))}
          </select>
          {!cargando && sedes.length === 0 && (
            <EstadoVacio icono="📍" mensaje="No hay sedes disponibles." />
          )}
        </div>

        {/* PASO 2: SERVICIO */}
        <div className="agendar-grupo">
          <label className="agendar-label">
            <span className="agendar-numerito">2</span> Elige Servicio
          </label>
          <select
            className="agendar-select"
            value={servicioElegido?.id || ""}
            onChange={e => setServicioElegido(servicios.find(x => x.id === e.target.value) || null)}
          >
            <option value="">Selecciona un servicio...</option>
            {servicios.map(serv => (
              <option key={serv.id} value={serv.id}>
                {serv.NomCorte} — {formatPrice(serv.Precio)} ({serv.duracion_min} min)
              </option>
            ))}
          </select>
          {!cargando && servicios.length === 0 && (
            <EstadoVacio icono="✂️" mensaje="No hay servicios disponibles." />
          )}
        </div>

        {/* PASO 3: BARBERO */}
        <div className="agendar-grupo">
          <label className="agendar-label">
            <span className="agendar-numerito">3</span> Elige Barbero
          </label>
          <select
            className="agendar-select"
            value={barberoElegido?.id || ""}
            disabled={barberoDesdeCatalogo || !sedeElegida}
            onChange={e => setBarberoElegido(barberos.find(x => x.id === e.target.value) || null)}
          >
            <option value="">
              {barberoDesdeCatalogo
                ? "Barbero seleccionado"
                : !sedeElegida
                ? "Primero elige una sede..."
                : "Selecciona un barbero..."}
            </option>
            {!barberoDesdeCatalogo && barberos.map(barb => (
              <option key={barb.id} value={barb.id}>
                {barb.Nombre} — {barb.especialidad}
              </option>
            ))}
          </select>
          {sedeElegida && !barberoDesdeCatalogo && barberos.length === 0 && (
            <EstadoVacio icono="💈" mensaje="No hay barberos disponibles en esta sede." />
          )}
        </div>

        {/* PASO 4: FECHA */}
        <div className="agendar-grupo">
          <label className="agendar-label">
            <span className="agendar-numerito">4</span> Fecha
          </label>
          <input
            type="date"
            className="agendar-fecha"
            min={fechaMinima}
            value={fechaElegida}
            disabled={!barberoElegido}
            onChange={e => setFechaElegida(e.target.value)}
          />
        </div>

        {/* PASO 5: HORA */}
        <div className="agendar-grupo">
          <label className="agendar-label">
            <span className="agendar-numerito">5</span> Hora disponible
          </label>
          <select
            className="agendar-select"
            value={horaElegida}
            disabled={!fechaElegida}
            onChange={e => setHoraElegida(e.target.value)}
          >
            <option value="">
              {!fechaElegida
                ? "Primero elige una fecha..."
                : cargandoHoras
                ? "Buscando horas..."
                : horasDisponibles.length === 0
                ? "Sin horas disponibles — elige otra fecha"
                : "Selecciona una hora..."}
            </option>
            {horasDisponibles.map(hora => (
              <option key={hora} value={hora}>{hora}</option>
            ))}
          </select>
          {cargandoHoras && <Cargando mensaje="Buscando horas..." />}
        </div>

        {/* RESUMEN */}
        {todoCompleto && (
          <div className="agendar-resumen">
            <p className="agendar-resumen-titulo">Resumen de tu cita</p>
            {[
              ["Sede",     sedeElegida.NomSede],
              ["Servicio", servicioElegido.NomCorte],
              ["Barbero",  barberoElegido.Nombre],
              ["Fecha",    fechaElegida],
              ["Hora",     horaElegida],
              ["Direccion", sedeElegida.Direccion],
            ].map(([label, valor]) => (
              <div key={label} className="agendar-resumen-fila">
                <span className="resumen-label">{label}</span>
                <span className="resumen-valor">{valor}</span>
              </div>
            ))}
            <div className="agendar-resumen-fila ultima">
              <span className="resumen-label">Total</span>
              <span className="resumen-precio">
                {formatPrice(servicioElegido.Precio)}
              </span>
            </div>
          </div>
        )}

        {/* BOTÓN CONFIRMAR */}
        <button
          className="agendar-btn-confirmar"
          onClick={confirmarCita}
          disabled={!todoCompleto || guardando}
        >
          {guardando ? "Agendando..." : "Confirmar cita"}
        </button>

      </div>
    </div>
  );
}