import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import {
  arrayRemove,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../../firebase.native";
import { useAuth } from "../../src/native/useAuth";
import LoadingState from "../../src/native/LoadingState";

const money = value => `$${Number(value || 0).toLocaleString("es-CO")}`;

function CompleteModal({ cita, onClose, onConfirm }) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalKicker}>GESTIÓN DE CITA</Text>
          <Text style={styles.modalTitle}>¿Completar esta cita?</Text>
          <Text style={styles.modalCopy}>{cita.usuario_nombre || "Cliente"} · {cita.servicio_nombre}</Text>
          <Text style={styles.modalCopy}>{cita.barbero_nombre} · {cita.fecha} · {cita.hora}</Text>
          <Text style={styles.modalHint}>El cliente podrá valorar el servicio.</Text>
          <Pressable onPress={onConfirm} style={styles.confirmButton}><Text style={styles.confirmButtonText}>Completar cita</Text></Pressable>
          <Pressable onPress={onClose} style={styles.modalCancel}><Text style={styles.modalCancelText}>Volver</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

function AppointmentCard({ cita, onAccept, onComplete, onCancel, onDelete, busy }) {
  const statusColor = cita.estado === "pendiente" ? "#f1c86b" : cita.estado === "confirmada" ? "#76dda9" : "#8cdeb2";
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.flex}>
          <Text style={styles.clientName}>{cita.usuario_nombre || "Cliente"}</Text>
          <Text style={styles.serviceName}>{cita.servicio_nombre || "Servicio"}</Text>
        </View>
        <Text style={[styles.badge, { color: statusColor }]}>{cita.estado}</Text>
      </View>
      <InfoRow label="Barbero" value={cita.barbero_nombre} />
      <InfoRow label="Fecha" value={cita.fecha} />
      <InfoRow label="Hora" value={cita.hora} />
      <InfoRow label="Sede" value={cita.sede_nombre || "—"} />
      <InfoRow label="Total" value={money(cita.precio)} emphasis />
      {cita.calificacion ? <Text style={styles.rating}>★ {cita.calificacion}/5 {cita.comentario ? `· “${cita.comentario}”` : ""}</Text> : null}
      {cita.estado === "pendiente" ? (
        <View style={styles.actions}>
          <Pressable disabled={busy} onPress={() => onAccept(cita)} style={[styles.acceptButton, busy && styles.disabled]}><Text style={styles.actionText}>{busy ? "Guardando…" : "Aceptar"}</Text></Pressable>
          <Pressable disabled={busy} onPress={() => onCancel(cita, "rechazar")} style={[styles.dangerButton, busy && styles.disabled]}><Text style={styles.dangerText}>Rechazar</Text></Pressable>
        </View>
      ) : cita.estado === "confirmada" ? (
        <View style={styles.actions}>
          <Pressable disabled={busy} onPress={() => onComplete(cita)} style={[styles.acceptButton, busy && styles.disabled]}><Text style={styles.actionText}>{busy ? "Guardando…" : "Completar"}</Text></Pressable>
          <Pressable disabled={busy} onPress={() => onCancel(cita, "cancelar")} style={[styles.dangerButton, busy && styles.disabled]}><Text style={styles.dangerText}>Cancelar</Text></Pressable>
        </View>
      ) : null}
      {["finalizada", "cancelada"].includes(cita.estado) && onDelete ? (
        <Pressable disabled={busy} onPress={() => onDelete(cita)} style={[styles.dangerButton, busy && styles.disabled]}>
          <Text style={styles.dangerText}>Eliminar</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function InfoRow({ label, value, emphasis = false }) {
  return <View style={styles.infoRow}><Text style={styles.infoLabel}>{label}</Text><Text style={[styles.infoValue, emphasis && styles.infoEmphasis]}>{value || "—"}</Text></View>;
}

export default function AdminAppointmentsScreen() {
  const router = useRouter();
  const { user, isAdmin, cargando: authCargando } = useAuth();
  const [activas, setActivas] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [tab, setTab] = useState("activas");
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [ocupada, setOcupada] = useState(null);
  const [porCompletar, setPorCompletar] = useState(null);
  const [errorCarga, setErrorCarga] = useState("");

  useEffect(() => {
    if (!authCargando && (!user || !isAdmin)) router.replace("/catalogo");
  }, [authCargando, isAdmin, router, user]);

  useEffect(() => {
    if (authCargando || !user || !isAdmin) return;
    const activeQuery = query(collection(db, "citas"), where("estado", "in", ["pendiente", "confirmada"]), orderBy("fecha", "asc"), orderBy("hora", "asc"));
    const historyQuery = query(collection(db, "citas"), where("estado", "in", ["finalizada", "cancelada"]), orderBy("fecha", "desc"));
    const stopActive = onSnapshot(activeQuery, snapshot => {
      setActivas(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
      setCargando(false);
    }, error => {
      console.error("Error al cargar citas activas:", error);
      setErrorCarga("No se pudieron cargar las citas activas.");
      setCargando(false);
    });
    const stopHistory = onSnapshot(historyQuery, snapshot => {
      setHistorial(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
    }, error => {
      console.error("Error al cargar el historial de citas:", error);
      setErrorCarga("No se pudo cargar el historial de citas.");
      setCargando(false);
    });
    return () => { stopActive(); stopHistory(); };
  }, [authCargando, isAdmin, user]);

  async function aceptar(cita) {
    setOcupada(cita.id);
    try {
      await updateDoc(doc(db, "citas", cita.id), { estado: "confirmada", confirmada_at: serverTimestamp() });
    } catch {
      Alert.alert("No se pudo aceptar", "Intenta nuevamente.");
    } finally {
      setOcupada(null);
    }
  }

  async function completar() {
    if (!porCompletar) return;
    const cita = porCompletar;
    setPorCompletar(null);
    setOcupada(cita.id);
    try {
      await updateDoc(doc(db, "citas", cita.id), { estado: "finalizada", finalizada_at: serverTimestamp() });
    } catch {
      Alert.alert("No se pudo completar", "Intenta nuevamente.");
    } finally {
      setOcupada(null);
    }
  }

  function confirmarCancelacion(cita, action) {
    Alert.alert("Confirmar acción", `¿Deseas ${action} la cita de ${cita.usuario_nombre || "este cliente"}?`, [
      { text: "Volver", style: "cancel" },
      {
        text: action === "rechazar" ? "Rechazar" : "Cancelar cita",
        style: "destructive",
        onPress: async () => {
          setOcupada(cita.id);
          try {
            const citaRef = doc(db, "citas", cita.id);
            const availabilityRef = doc(db, "Barberos", cita.barbero_id, "disponibilidad", cita.fecha);
            await runTransaction(db, async transaction => {
              transaction.update(citaRef, { estado: "cancelada", cancelada_at: serverTimestamp() });
              transaction.update(availabilityRef, { slots_ocupados: arrayRemove(cita.hora) });
            });
          } catch {
            Alert.alert("No se pudo cancelar", "La cita sigue activa; intenta nuevamente.");
          } finally {
            setOcupada(null);
          }
        },
      },
    ]);
  }

  function eliminarCita(cita) {
    Alert.alert("¿Eliminar cita?", "Esta acción no se puede deshacer.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          setOcupada(cita.id);
          try {
            await deleteDoc(doc(db, "citas", cita.id));
          } catch (error) {
            console.error("Error al eliminar cita:", error);
            Alert.alert("No se pudo eliminar", "Intenta nuevamente.");
          } finally {
            setOcupada(null);
          }
        },
      },
    ]);
  }

  const fuente = tab === "activas"
    ? activas
    : historial.filter(cita => tab === "canceladas" ? cita.estado === "cancelada" : cita.estado === "finalizada");
  const term = busqueda.trim().toLowerCase();
  const filtradas = fuente.filter(cita => !term || (cita.usuario_nombre || "").toLowerCase().includes(term) || (cita.barbero_nombre || "").toLowerCase().includes(term));
  const pendientes = activas.filter(cita => cita.estado === "pendiente").length;
  const confirmadas = activas.filter(cita => cita.estado === "confirmada").length;
  const hoy = new Date();
  const fechaLocalHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
  const finalizadas = historial.filter(cita => cita.estado === "finalizada");
  const canceladas = historial.filter(cita => cita.estado === "cancelada");
  const ingresoHoy = finalizadas.filter(cita => cita.fecha === fechaLocalHoy).reduce((sum, cita) => sum + (Number(cita.precio) || 0), 0);

  if (authCargando || cargando || !user || !isAdmin) return <LoadingState message={errorCarga || "Cargando citas..."} />;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {porCompletar ? <CompleteModal cita={porCompletar} onClose={() => setPorCompletar(null)} onConfirm={completar} /> : null}
      <Text style={styles.kicker}>OPERACIONES CUTNOW</Text>
      <Text style={styles.title}>Gestión de citas</Text>
      <Text style={styles.subtitle}>Confirma reservas y mantén actualizado el historial.</Text>
      <View style={styles.summaryGrid}>
        <Summary label="Pendientes" value={String(pendientes)} color="#f1c86b" />
        <Summary label="Confirmadas" value={String(confirmadas)} color="#76dda9" />
        <Summary label="Finalizadas" value={String(finalizadas.length)} color="#8cdeb2" />
        <Summary label="Ingresos hoy" value={money(ingresoHoy)} color="#46d995" />
      </View>
      <TextInput onChangeText={setBusqueda} placeholder="Buscar cliente o barbero" placeholderTextColor="#84908a" style={styles.search} value={busqueda} />
      <View style={styles.tabs}>
        {[{ key: "activas", label: `Activas · ${activas.length}` }, { key: "historial", label: `Historial · ${finalizadas.length}` }, { key: "canceladas", label: `Canceladas · ${canceladas.length}` }].map(item => {
          const selected = item.key === tab;
          return <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => setTab(item.key)} style={[styles.tab, selected && styles.tabActive]}><Text style={[styles.tabText, selected && styles.tabTextActive]}>{item.label}</Text></Pressable>;
        })}
      </View>
      {errorCarga ? <Text accessibilityRole="alert" style={styles.error}>{errorCarga}</Text> : null}
      {tab === "activas" ? ["pendiente", "confirmada"].map(status => {
        const group = filtradas.filter(cita => cita.estado === status);
        if (!group.length) return null;
        return <View key={status} style={styles.group}><Text style={styles.groupTitle}>{status === "pendiente" ? "Por confirmar" : "Confirmadas"} · {group.length}</Text>{group.map(cita => <AppointmentCard key={cita.id} cita={cita} busy={ocupada === cita.id} onAccept={aceptar} onComplete={setPorCompletar} onCancel={confirmarCancelacion} />)}</View>;
      }) : filtradas.map(cita => <AppointmentCard key={cita.id} cita={cita} busy={ocupada === cita.id} onDelete={eliminarCita} />)}
      {!filtradas.length ? <Text style={styles.empty}>{errorCarga ? "No fue posible consultar las citas." : term ? "No hay resultados para esa búsqueda." : tab === "activas" ? "No hay citas activas." : tab === "canceladas" ? "Aún no hay citas canceladas." : "Aún no hay citas finalizadas."}</Text> : null}
    </ScrollView>
  );
}

function Summary({ label, value, color }) {
  return <View style={styles.summaryCard}><View style={[styles.summaryDot, { backgroundColor: color }]} /><Text style={styles.summaryLabel}>{label}</Text><Text adjustsFontSizeToFit numberOfLines={1} style={styles.summaryValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#101312" },
  content: { width: "100%", maxWidth: 960, alignSelf: "center", paddingHorizontal: 18, paddingTop: 20, paddingBottom: 120 },
  flex: { flex: 1 },
  kicker: { color: "#46d995", fontSize: 10, fontWeight: "700", letterSpacing: 1.6 },
  title: { marginTop: 8, color: "#f3f7f4", fontSize: 26, fontWeight: "700" },
  subtitle: { marginTop: 6, color: "#aab4ad", fontSize: 13, lineHeight: 19 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 8, marginTop: 18 },
  summaryCard: { width: "48.5%", minHeight: 85, justifyContent: "center", padding: 11, borderWidth: 1, borderColor: "#29362e", borderRadius: 8, backgroundColor: "#171d19" },
  summaryDot: { width: 7, height: 7, borderRadius: 4 },
  summaryLabel: { marginTop: 8, color: "#8e9a92", fontSize: 10 },
  summaryValue: { marginTop: 4, color: "#e7ece8", fontSize: 17, fontWeight: "800" },
  search: { height: 46, marginTop: 16, paddingHorizontal: 13, borderWidth: 1, borderColor: "#344139", borderRadius: 8, backgroundColor: "#171d19", color: "#f3f7f4", fontSize: 13 },
  tabs: { flexDirection: "row", gap: 8, marginTop: 13, marginBottom: 7 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 10, borderWidth: 1, borderColor: "#344139", borderRadius: 7 },
  tabActive: { borderColor: "#20c77a", backgroundColor: "#173326" },
  tabText: { color: "#aab4ad", fontSize: 12, fontWeight: "600" },
  tabTextActive: { color: "#6be0a4" },
  group: { marginTop: 13 },
  groupTitle: { marginBottom: 8, color: "#dce4de", fontSize: 14, fontWeight: "700" },
  card: { marginBottom: 10, padding: 14, borderWidth: 1, borderColor: "#29362e", borderRadius: 9, backgroundColor: "#171d19" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginBottom: 10 },
  clientName: { color: "#f3f7f4", fontSize: 15, fontWeight: "700" },
  serviceName: { marginTop: 3, color: "#8e9a92", fontSize: 12 },
  badge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 5, backgroundColor: "#202822", fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 7, borderTopWidth: 1, borderTopColor: "#29332d" },
  infoLabel: { color: "#8e9a92", fontSize: 11 },
  infoValue: { flexShrink: 1, color: "#d5ded8", fontSize: 11, fontWeight: "600", textAlign: "right" },
  infoEmphasis: { color: "#46d995", fontSize: 12, fontWeight: "800" },
  rating: { marginTop: 6, color: "#facc15", fontSize: 12, lineHeight: 18 },
  actions: { flexDirection: "row", gap: 8, marginTop: 12 },
  acceptButton: { flex: 1, minHeight: 40, alignItems: "center", justifyContent: "center", borderRadius: 7, backgroundColor: "#20c77a" },
  actionText: { color: "#07140d", fontSize: 12, fontWeight: "800" },
  dangerButton: { flex: 1, minHeight: 40, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#59302c", borderRadius: 7 },
  dangerText: { color: "#ff9b90", fontSize: 12, fontWeight: "700" },
  disabled: { opacity: 0.5 },
  error: { marginTop: 12, color: "#ff8e83", fontSize: 13, lineHeight: 19 },
  empty: { paddingVertical: 35, color: "#8e9a92", fontSize: 13, textAlign: "center" },
  modalBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, backgroundColor: "rgba(0,0,0,0.78)" },
  modalCard: { width: "100%", maxWidth: 420, padding: 22, borderWidth: 1, borderColor: "#344139", borderRadius: 12, backgroundColor: "#171d19" },
  modalKicker: { color: "#46d995", fontSize: 10, fontWeight: "700", letterSpacing: 1.6 },
  modalTitle: { marginTop: 10, color: "#f3f7f4", fontSize: 21, fontWeight: "700" },
  modalCopy: { marginTop: 8, color: "#c2ccc5", fontSize: 13, lineHeight: 19 },
  modalHint: { marginTop: 14, color: "#8e9a92", fontSize: 12 },
  confirmButton: { minHeight: 44, alignItems: "center", justifyContent: "center", marginTop: 18, borderRadius: 7, backgroundColor: "#20c77a" },
  confirmButtonText: { color: "#07140d", fontSize: 13, fontWeight: "800" },
  modalCancel: { alignItems: "center", paddingTop: 15 },
  modalCancelText: { color: "#aab4ad", fontSize: 13, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#101312" },
});