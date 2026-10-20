import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "../firebase.native";
import { useAuth } from "../src/native/useAuth";

function fechaComoClave(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function manana() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

const money = value => `$${Number(value || 0).toLocaleString("es-CO")}`;

export default function BookingScreen() {
  const router = useRouter();
  const { barberoId: routeBarberoId } = useLocalSearchParams();
  const barberoId = Array.isArray(routeBarberoId) ? routeBarberoId[0] : routeBarberoId;
  const { width } = useWindowDimensions();
  const { user, cargando: authCargando } = useAuth();
  const [sedes, setSedes] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [barberos, setBarberos] = useState([]);
  const [sedeElegida, setSedeElegida] = useState(null);
  const [servicioElegido, setServicioElegido] = useState(null);
  const [barberoElegido, setBarberoElegido] = useState(null);
  const [fechaElegida, setFechaElegida] = useState(null);
  const [horaElegida, setHoraElegida] = useState("");
  const [horasDisponibles, setHorasDisponibles] = useState([]);
  const [mostrarFecha, setMostrarFecha] = useState(false);
  const [selectorActivo, setSelectorActivo] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [confirmada, setConfirmada] = useState(false);

  useEffect(() => {
    if (!authCargando && !user) router.replace("/");
  }, [authCargando, router, user]);

  useEffect(() => {
    if (authCargando || !user) return;
    let activa = true;

    async function cargarCatalogos() {
      try {
        const [sedeSnapshot, servicioSnapshot, barberoSnapshot] = await Promise.all([
          getDocs(query(collection(db, "Sedes"), where("activa", "==", true))),
          getDocs(query(collection(db, "Servicios"), where("activo", "==", true))),
          getDocs(collection(db, "Barberos")),
        ]);
        if (!activa) return;
        const sedesCargadas = sedeSnapshot.docs.map(item => ({ id: item.id, ...item.data() }));
        const barberosCargados = barberoSnapshot.docs.map(item => ({ id: item.id, ...item.data() }));
        setSedes(sedesCargadas);
        setServicios(servicioSnapshot.docs.map(item => ({ id: item.id, ...item.data() })));
        setBarberos(barberosCargados);

        if (barberoId) {
          const preseleccionado = barberosCargados.find(item => item.id === barberoId);
          if (preseleccionado) {
            setBarberoElegido(preseleccionado);
            setSedeElegida(sedesCargadas.find(item => item.id === preseleccionado.sede_id) || null);
          }
        }
      } catch {
        if (activa) setError("No se pudieron cargar las opciones de reserva.");
      } finally {
        if (activa) setCargando(false);
      }
    }

    cargarCatalogos();
    return () => { activa = false; };
  }, [authCargando, barberoId, user]);

  useEffect(() => {
    setHoraElegida("");
    setHorasDisponibles([]);
    if (!barberoElegido || !fechaElegida || !servicioElegido) return;

    let activa = true;
    async function cargarHoras() {
      try {
        const disponibilidad = doc(db, "Barberos", barberoElegido.id, "disponibilidad", fechaElegida);
        const snapshot = await getDoc(disponibilidad);
        const ocupados = snapshot.exists() ? snapshot.data().slots_ocupados || [] : [];
        const duracion = Math.max(Number(servicioElegido.duracion_min) || 30, 15);
        const disponibles = [];
        for (let hora = 8; hora < 18; hora += 1) {
          for (let minuto = 0; minuto < 60; minuto += duracion) {
            const slot = `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;
            if (!ocupados.includes(slot)) disponibles.push(slot);
          }
        }
        if (activa) setHorasDisponibles(disponibles);
      } catch {
        if (activa) setError("No se pudieron consultar los horarios. Intenta de nuevo.");
      }
    }
    cargarHoras();
    return () => { activa = false; };
  }, [barberoElegido, fechaElegida, servicioElegido]);

  function cambiarSede(id) {
    const sede = sedes.find(item => item.id === id) || null;
    setSedeElegida(sede);
    setBarberoElegido(null);
    setHoraElegida("");
    setFechaElegida(null);
  }

  async function confirmarCita() {
    if (!user || !sedeElegida || !servicioElegido || !barberoElegido || !fechaElegida || !horaElegida) {
      setError("Completa todos los pasos para confirmar tu cita.");
      return;
    }

    setError("");
    setGuardando(true);
    try {
      const claveFecha = fechaElegida;
      const citaRef = doc(collection(db, "citas"));
      const disponibilidadRef = doc(db, "Barberos", barberoElegido.id, "disponibilidad", claveFecha);
      await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(disponibilidadRef);
        const ocupados = snapshot.exists() ? snapshot.data().slots_ocupados || [] : [];
        if (ocupados.includes(horaElegida)) {
          throw new Error("Este horario ya fue reservado. Elige otra hora.");
        }
        transaction.set(citaRef, {
          usuario_id: user.uid,
          usuario_nombre: user.displayName || user.email,
          barbero_id: barberoElegido.id,
          barbero_nombre: barberoElegido.Nombre,
          servicio_id: servicioElegido.id,
          servicio_nombre: servicioElegido.NomCorte,
          servicio_precio: servicioElegido.Precio,
          sede_id: sedeElegida.id,
          sede_nombre: sedeElegida.NomSede,
          fecha: claveFecha,
          hora: horaElegida,
          estado: "pendiente",
          precio: servicioElegido.Precio || 0,
          calificacion: null,
          calificado: false,
          fecha_creacion: serverTimestamp(),
        });
        transaction.set(disponibilidadRef, { slots_ocupados: arrayUnion(horaElegida) }, { merge: true });
      });
      setConfirmada(true);
    } catch (bookingError) {
      setError(bookingError.message || "No se pudo reservar. Intenta de nuevo.");
      if (bookingError.message?.includes("ya fue reservado")) {
        setHorasDisponibles(current => current.filter(item => item !== horaElegida));
        setHoraElegida("");
      }
    } finally {
      setGuardando(false);
    }
  }

  const barberosDeSede = barberos.filter(item => item.sede_id === sedeElegida?.id && item.estado === "activo");
  const completo = sedeElegida && servicioElegido && barberoElegido && fechaElegida && horaElegida;
  const opcionesSelector = selectorActivo === "sede"
    ? sedes.map(item => ({ id: item.id, titulo: item.NomSede, detalle: item.Ciudad }))
    : selectorActivo === "servicio"
      ? servicios.map(item => ({ id: item.id, titulo: item.NomCorte, detalle: `${money(item.Precio)} · ${item.duracion_min || 30} min` }))
      : selectorActivo === "barbero"
        ? barberosDeSede.map(item => ({ id: item.id, titulo: item.Nombre, detalle: item.especialidad || "Barbero profesional" }))
        : [];

  if (authCargando || cargando) {
    return <View style={styles.center}><ActivityIndicator color="#20c77a" /></View>;
  }

  if (confirmada) {
    return (
      <View style={styles.successPage}>
        <View style={[styles.successCard, { width: Math.min(width - 36, 460) }]}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successTitle}>Cita solicitada</Text>
          <Text style={styles.successCopy}>{barberoElegido.Nombre} · {servicioElegido.NomCorte}</Text>
          <Text style={styles.successCopy}>{fechaElegida} · {horaElegida}</Text>
          <Text style={styles.successPrice}>{money(servicioElegido.Precio)}</Text>
          <Pressable onPress={() => router.replace("/mis-citas")} style={styles.confirmButton}>
            <Text style={styles.confirmButtonText}>Ver mis citas</Text>
          </Pressable>
          <Pressable onPress={() => router.replace("/catalogo")} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Volver al catálogo</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Modal animationType="fade" onRequestClose={() => setSelectorActivo(null)} transparent visible={Boolean(selectorActivo)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.optionModal, { width: Math.min(width - 36, 520) }]}>
            <Text style={styles.modalTitle}>
              {selectorActivo === "sede" ? "Elige una sede" : selectorActivo === "servicio" ? "Elige un servicio" : "Elige un barbero"}
            </Text>
            <ScrollView style={styles.optionList}>
              {opcionesSelector.length ? opcionesSelector.map(option => (
                <Pressable
                  key={option.id}
                  onPress={() => {
                    if (selectorActivo === "sede") cambiarSede(option.id);
                    if (selectorActivo === "servicio") setServicioElegido(servicios.find(item => item.id === option.id) || null);
                    if (selectorActivo === "barbero") setBarberoElegido(barberosDeSede.find(item => item.id === option.id) || null);
                    setSelectorActivo(null);
                  }}
                  style={styles.optionRow}
                >
                  <Text style={styles.optionTitle}>{option.titulo || "Opción"}</Text>
                  {option.detalle ? <Text style={styles.optionDetail}>{option.detalle}</Text> : null}
                </Pressable>
              )) : (
                <Text style={styles.optionEmpty}>
                  {selectorActivo === "barbero" ? "No hay barberos activos en esta sede." : "No hay opciones disponibles."}
                </Text>
              )}
            </ScrollView>
            <Pressable onPress={() => setSelectorActivo(null)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <View style={[styles.form, { width: Math.min(width - 32, 620) }]}>
        <Text style={styles.kicker}>RESERVAS CUTNOW</Text>
        <Text style={styles.title}>Agenda tu próxima cita.</Text>
        <Text style={styles.subtitle}>Elige tus opciones y confirma un horario disponible.</Text>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>01 · Sede</Text>
        <SelectField
          selected={Boolean(sedeElegida)}
          value={sedeElegida ? `${sedeElegida.NomSede}${sedeElegida.Ciudad ? ` · ${sedeElegida.Ciudad}` : ""}` : "Toca para elegir una sede"}
          onPress={() => setSelectorActivo("sede")}
        />

        <Text style={styles.label}>02 · Servicio</Text>
        <SelectField
          selected={Boolean(servicioElegido)}
          value={servicioElegido ? `${servicioElegido.NomCorte} · ${money(servicioElegido.Precio)}` : "Toca para elegir un servicio"}
          onPress={() => setSelectorActivo("servicio")}
        />

        <Text style={styles.label}>03 · Barbero</Text>
        <SelectField
          disabled={!sedeElegida}
          selected={Boolean(barberoElegido)}
          value={barberoElegido ? `${barberoElegido.Nombre} · ${barberoElegido.especialidad || "Profesional"}` : sedeElegida ? "Toca para elegir un barbero" : "Primero selecciona una sede"}
          onPress={() => setSelectorActivo("barbero")}
        />

        <Text style={styles.label}>04 · Fecha</Text>
        <Pressable disabled={!barberoElegido} onPress={() => setMostrarFecha(true)} style={[styles.dateButton, !barberoElegido && styles.disabled]}>
          <Text style={fechaElegida ? styles.dateText : styles.placeholderText}>{fechaElegida || "Selecciona una fecha"}</Text>
          <Text style={styles.dateGlyph}>▦</Text>
        </Pressable>
        {mostrarFecha ? (
          <DateTimePicker
            value={fechaElegida ? new Date(`${fechaElegida}T12:00:00`) : manana()}
            minimumDate={manana()}
            mode="date"
            display={"default"}
            onChange={(event, date) => {
              setMostrarFecha(false);
              if (event.type === "set" && date) setFechaElegida(fechaComoClave(date));
            }}
          />
        ) : null}

        <Text style={styles.label}>05 · Horario</Text>
        {!fechaElegida ? (
          <Text style={styles.hint}>Selecciona barbero y fecha para consultar disponibilidad.</Text>
        ) : horasDisponibles.length ? (
          <View style={styles.slots}>
            {horasDisponibles.map(slot => (
              <Pressable key={slot} onPress={() => setHoraElegida(slot)} style={[styles.slot, horaElegida === slot && styles.slotSelected]}>
                <Text style={[styles.slotText, horaElegida === slot && styles.slotTextSelected]}>{slot}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.hint}>No hay horas libres para esta fecha.</Text>
        )}

        {completo ? (
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Resumen de la cita</Text>
            <SummaryRow label="Sede" value={sedeElegida.NomSede} />
            <SummaryRow label="Servicio" value={servicioElegido.NomCorte} />
            <SummaryRow label="Barbero" value={barberoElegido.Nombre} />
            <SummaryRow label="Fecha y hora" value={`${fechaElegida} · ${horaElegida}`} />
            <SummaryRow label="Total" value={money(servicioElegido.Precio)} emphasis />
          </View>
        ) : null}

        <Pressable accessibilityRole="button" disabled={!completo || guardando} onPress={confirmarCita} style={({ pressed }) => [styles.confirmButton, (!completo || guardando) && styles.disabled, pressed && styles.pressed]}>
          {guardando ? <ActivityIndicator color="#07140d" /> : <Text style={styles.confirmButtonText}>Confirmar cita</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

function SummaryRow({ label, value, emphasis = false }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, emphasis && styles.summaryEmphasis]}>{value || "—"}</Text>
    </View>
  );
}

function SelectField({ value, selected, disabled = false, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.selectField, disabled && styles.disabled, pressed && styles.pressed]}
    >
      <Text numberOfLines={1} style={selected ? styles.dateText : styles.placeholderText}>{value}</Text>
      <Text style={styles.selectChevron}>⌄</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, alignItems: "center", paddingVertical: 24, paddingHorizontal: 0, backgroundColor: "#101312" },
  form: { paddingHorizontal: 20, paddingVertical: 8 },
  kicker: { color: "#46d995", fontSize: 10, fontWeight: "700", letterSpacing: 1.8 },
  title: { marginTop: 10, color: "#f3f7f4", fontSize: 27, fontWeight: "700", lineHeight: 34 },
  subtitle: { marginTop: 7, marginBottom: 22, color: "#aab4ad", fontSize: 14, lineHeight: 21 },
  error: { marginBottom: 14, padding: 12, borderRadius: 8, backgroundColor: "#391e1c", color: "#ff9b90", fontSize: 13, lineHeight: 19 },
  label: { marginTop: 15, marginBottom: 7, color: "#d8e0da", fontSize: 13, fontWeight: "700" },
  selectField: { minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: "#344139", borderRadius: 8, backgroundColor: "#1a211d" },
  selectChevron: { color: "#46d995", fontSize: 19, fontWeight: "700" },
  dateButton: { minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, borderWidth: 1, borderColor: "#344139", borderRadius: 8, backgroundColor: "#1a211d" },
  dateText: { color: "#f3f7f4", fontSize: 14 },
  placeholderText: { color: "#84908a", fontSize: 14 },
  dateGlyph: { color: "#46d995", fontSize: 18 },
  hint: { paddingVertical: 13, color: "#84908a", fontSize: 13, lineHeight: 19 },
  slots: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  slot: { width: "23%", minHeight: 42, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#344139", borderRadius: 7, backgroundColor: "#1a211d" },
  slotSelected: { borderColor: "#20c77a", backgroundColor: "#173326" },
  slotText: { color: "#c9d2cc", fontSize: 13, fontWeight: "600" },
  slotTextSelected: { color: "#70e6aa" },
  summary: { marginTop: 22, padding: 15, borderWidth: 1, borderColor: "#344139", borderRadius: 10, backgroundColor: "#171d19" },
  summaryTitle: { marginBottom: 10, color: "#f3f7f4", fontSize: 15, fontWeight: "700" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", gap: 16, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#29332d" },
  summaryLabel: { color: "#93a098", fontSize: 12 },
  summaryValue: { flexShrink: 1, color: "#d8e0da", fontSize: 12, fontWeight: "600", textAlign: "right" },
  summaryEmphasis: { color: "#46d995", fontSize: 14, fontWeight: "800" },
  confirmButton: { minHeight: 50, alignItems: "center", justifyContent: "center", marginTop: 22, borderRadius: 8, backgroundColor: "#20c77a" },
  confirmButtonText: { color: "#07140d", fontSize: 15, fontWeight: "800" },
  secondaryButton: { minHeight: 44, alignItems: "center", justifyContent: "center", marginTop: 8, borderRadius: 8, borderWidth: 1, borderColor: "#35443b" },
  secondaryButtonText: { color: "#b6c1b9", fontSize: 13, fontWeight: "600" },
  successPage: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, backgroundColor: "#101312" },
  successCard: { alignItems: "center", padding: 24, borderWidth: 1, borderColor: "#344139", borderRadius: 14, backgroundColor: "#171d19" },
  successIcon: { width: 52, height: 52, overflow: "hidden", borderRadius: 26, backgroundColor: "#173326", color: "#46d995", fontSize: 34, fontWeight: "700", textAlign: "center", lineHeight: 52 },
  successTitle: { marginTop: 16, marginBottom: 10, color: "#f3f7f4", fontSize: 23, fontWeight: "700" },
  successCopy: { marginTop: 4, color: "#aab4ad", fontSize: 14, textAlign: "center" },
  successPrice: { marginTop: 15, marginBottom: 4, color: "#46d995", fontSize: 21, fontWeight: "800" },
  modalBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, backgroundColor: "rgba(0,0,0,0.78)" },
  optionModal: { maxHeight: "78%", padding: 18, borderWidth: 1, borderColor: "#344139", borderRadius: 12, backgroundColor: "#171d19" },
  modalTitle: { marginBottom: 12, color: "#f3f7f4", fontSize: 19, fontWeight: "700" },
  optionList: { flexShrink: 1 },
  optionRow: { paddingVertical: 13, borderTopWidth: 1, borderTopColor: "#29332d" },
  optionTitle: { color: "#e4eae6", fontSize: 14, fontWeight: "600" },
  optionDetail: { marginTop: 4, color: "#8e9a92", fontSize: 12 },
  optionEmpty: { paddingVertical: 18, color: "#aab4ad", fontSize: 13, lineHeight: 20 },
  modalClose: { alignItems: "center", marginTop: 10, paddingVertical: 11, borderRadius: 7, backgroundColor: "#253229" },
  modalCloseText: { color: "#9ce8bc", fontSize: 13, fontWeight: "700" },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.82 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#101312" },
});