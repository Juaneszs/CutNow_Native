import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import {
  arrayRemove,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase.native";
import { useAuth } from "../src/native/useAuth";

const tabs = [
  { value: "pendiente", label: "Próximas" },
  { value: "confirmada", label: "Confirmadas" },
  { value: "finalizada", label: "Completadas" },
  { value: "cancelada", label: "Canceladas" },
];
const money = value => `$${Number(value || 0).toLocaleString("es-CO")}`;

function RatingModal({ cita, onClose }) {
  const [estrellas, setEstrellas] = useState(0);
  const [comentario, setComentario] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function recalcularPromedio(barberoId) {
    const snapshot = await getDocs(query(
      collection(db, "citas"),
      where("barbero_id", "==", barberoId),
      where("estado", "==", "finalizada"),
    ));
    const ratings = snapshot.docs.map(item => item.data().calificacion).filter(value => value > 0);
    if (!ratings.length) return;
    const promedio = ratings.reduce((sum, value) => sum + value, 0) / ratings.length;
    await updateDoc(doc(db, "Barberos", barberoId), {
      calificacion_promedio: Math.round(promedio * 10) / 10,
      total_calificaciones: ratings.length,
    });
  }

  async function enviar() {
    if (!estrellas) return;
    setGuardando(true);
    try {
      await updateDoc(doc(db, "citas", cita.id), {
        calificacion: estrellas,
        comentario: comentario.trim(),
        calificado: true,
      });
      if (cita.barbero_id) await recalcularPromedio(cita.barbero_id);
      Alert.alert("Gracias", "Tu valoración quedó registrada.", [{ text: "Listo", onPress: onClose }]);
    } catch {
      Alert.alert("No se pudo guardar", "Intenta enviar tu valoración nuevamente.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalKicker}>TU EXPERIENCIA</Text>
          <Text style={styles.modalTitle}>Valorar servicio</Text>
          <Text style={styles.modalSubtitle}>¿Cómo fue tu cita con {cita.barbero_nombre}?</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map(value => (
              <Pressable key={value} accessibilityLabel={`${value} estrellas`} accessibilityRole="button" onPress={() => setEstrellas(value)} hitSlop={5}>
                <Text style={[styles.star, value <= estrellas && styles.starActive]}>★</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            accessibilityLabel="Comentario de valoración"
            multiline
            onChangeText={setComentario}
            placeholder="Cuéntanos cómo te fue (opcional)"
            placeholderTextColor="#84908a"
            style={styles.comment}
            textAlignVertical="top"
            value={comentario}
          />
          <Pressable disabled={!estrellas || guardando} onPress={enviar} style={[styles.primaryButton, (!estrellas || guardando) && styles.disabled]}>
            {guardando ? <ActivityIndicator color="#07140d" /> : <Text style={styles.primaryButtonText}>Enviar valoración</Text>}
          </Pressable>
          <Pressable onPress={onClose} style={styles.modalCancel}><Text style={styles.modalCancelText}>Cancelar</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

function AppointmentCard({ cita, onCancel, onRate }) {
  const statusLabels = { pendiente: "Próxima", confirmada: "Confirmada", finalizada: "Completada", cancelada: "Cancelada" };
  const formattedDate = cita.fecha
    ? new Date(`${cita.fecha}T12:00:00`).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })
    : "Fecha pendiente";

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIdentity}>
          <Text style={styles.barberMark}>C</Text>
          <View style={styles.cardTitleWrap}>
            <Text style={styles.barberName}>{cita.barbero_nombre || "Barbero CutNow"}</Text>
            <Text style={styles.serviceName}>{cita.servicio_nombre || "Servicio"}</Text>
          </View>
        </View>
        <Text style={[styles.badge, styles[`badge_${cita.estado}`]]}>{statusLabels[cita.estado] || "Cita"}</Text>
      </View>
      <InfoRow label="Fecha" value={formattedDate} />
      <InfoRow label="Hora" value={cita.hora || "—"} />
      <InfoRow label="Sede" value={cita.sede_nombre || "—"} />
      <InfoRow label="Total" value={money(cita.servicio_precio || cita.precio)} emphasis />

      {cita.calificacion ? (
        <View style={styles.ratingInfo}>
          <Text style={styles.ratingLabel}>Tu valoración</Text>
          <Text style={styles.ratingStars}>{"★".repeat(cita.calificacion)}<Text style={styles.starInactive}>{"★".repeat(5 - cita.calificacion)}</Text></Text>
          {cita.comentario ? <Text style={styles.commentText}>“{cita.comentario}”</Text> : null}
        </View>
      ) : null}

      {cita.estado === "pendiente" || cita.estado === "confirmada" ? (
        <Pressable onPress={() => onCancel(cita)} style={styles.cancelAppointment}><Text style={styles.cancelAppointmentText}>Cancelar cita</Text></Pressable>
      ) : null}
      {cita.estado === "finalizada" && !cita.calificado ? (
        <Pressable onPress={() => onRate(cita)} style={styles.rateAppointment}><Text style={styles.rateAppointmentText}>★  Valorar servicio</Text></Pressable>
      ) : null}
    </View>
  );
}

function InfoRow({ label, value, emphasis = false }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, emphasis && styles.infoEmphasis]}>{value}</Text>
    </View>
  );
}

export default function MyAppointmentsScreen() {
  const router = useRouter();
  const { user, cargando: authCargando } = useAuth();
  const [tab, setTab] = useState("pendiente");
  const [citas, setCitas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [valorando, setValorando] = useState(null);

  useEffect(() => {
    if (!authCargando && !user) router.replace("/");
  }, [authCargando, router, user]);

  useEffect(() => {
    if (authCargando || !user) return;
    const activeQuery = query(
      collection(db, "citas"),
      where("usuario_id", "==", user.uid),
      where("estado", "==", tab),
      orderBy("fecha", "asc"),
    );
    return onSnapshot(activeQuery, snapshot => {
      setCitas(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
      setCargando(false);
    }, () => setCargando(false));
  }, [authCargando, tab, user]);

  function confirmarCancelacion(cita) {
    Alert.alert(
      "Cancelar cita",
      `¿Cancelar la cita del ${cita.fecha} a las ${cita.hora} con ${cita.barbero_nombre}?`,
      [
        { text: "Conservar cita", style: "cancel" },
        {
          text: "Cancelar cita",
          style: "destructive",
          onPress: async () => {
            try {
              const citaRef = doc(db, "citas", cita.id);
              const disponibilidadRef = doc(db, "Barberos", cita.barbero_id, "disponibilidad", cita.fecha);
              await runTransaction(db, async transaction => {
                transaction.update(citaRef, { estado: "cancelada" });
                transaction.update(disponibilidadRef, { slots_ocupados: arrayRemove(cita.hora) });
              });
            } catch {
              Alert.alert("No se pudo cancelar", "Intenta nuevamente o comunícate con la barbería.");
            }
          },
        },
      ],
    );
  }

  const emptyCopy = {
    pendiente: "No tienes citas próximas.",
    confirmada: "No tienes citas confirmadas.",
    finalizada: "Aún no tienes citas completadas.",
    cancelada: "No tienes citas canceladas.",
  };

  if (authCargando || !user) return <View style={styles.center}><ActivityIndicator color="#20c77a" /></View>;

  return (
    <View style={styles.page}>
      {valorando ? <RatingModal cita={valorando} onClose={() => setValorando(null)} /> : null}
      <View style={styles.header}>
        <Text style={styles.kicker}>TU HISTORIAL CUTNOW</Text>
        <Text style={styles.title}>Mis citas</Text>
        <Text style={styles.subtitle}>Consulta tus reservas y comparte tu experiencia.</Text>
      </View>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={citas}
        keyExtractor={item => item.id}
        ListEmptyComponent={cargando ? <ActivityIndicator color="#20c77a" style={styles.empty} /> : (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyMark}>C</Text>
            <Text style={styles.emptyText}>{emptyCopy[tab]}</Text>
            {tab === "pendiente" ? <Pressable onPress={() => router.push("/agendar")} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Agendar una cita</Text></Pressable> : null}
          </View>
        )}
        ListHeaderComponent={(
          <View style={styles.tabs}>
            {tabs.map(item => {
              const selected = item.value === tab;
              return <Pressable key={item.value} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => { setCargando(true); setTab(item.value); }} style={[styles.tab, selected && styles.tabSelected]}><Text style={[styles.tabText, selected && styles.tabTextSelected]}>{item.label}</Text></Pressable>;
            })}
          </View>
        )}
        renderItem={({ item }) => <AppointmentCard cita={item} onCancel={confirmarCancelacion} onRate={setValorando} />}
      />
      <Pressable onPress={() => router.push("/agendar")} style={styles.bottomButton}><Text style={styles.bottomButtonText}>＋  Agendar nueva cita</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#101312" },
  header: { width: "100%", maxWidth: 860, alignSelf: "center", paddingHorizontal: 18, paddingTop: 20, paddingBottom: 12 },
  kicker: { color: "#46d995", fontSize: 10, fontWeight: "700", letterSpacing: 1.7 },
  title: { marginTop: 8, color: "#f3f7f4", fontSize: 27, fontWeight: "700" },
  subtitle: { marginTop: 5, color: "#aab4ad", fontSize: 13, lineHeight: 19 },
  listContent: { width: "100%", maxWidth: 860, alignSelf: "center", paddingHorizontal: 18, paddingBottom: 110 },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 7, paddingTop: 8, paddingBottom: 15 },
  tab: { paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: "#344139", borderRadius: 7 },
  tabSelected: { borderColor: "#20c77a", backgroundColor: "#173326" },
  tabText: { color: "#aab4ad", fontSize: 12, fontWeight: "600" },
  tabTextSelected: { color: "#6be0a4" },
  card: { marginBottom: 11, padding: 15, borderWidth: 1, borderColor: "#29362e", borderRadius: 11, backgroundColor: "#171d19" },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 },
  cardIdentity: { flex: 1, flexDirection: "row", alignItems: "center", gap: 11 },
  barberMark: { width: 42, height: 42, overflow: "hidden", borderRadius: 9, backgroundColor: "#1e3428", color: "#46d995", fontSize: 21, fontWeight: "800", lineHeight: 42, textAlign: "center" },
  cardTitleWrap: { flex: 1 },
  barberName: { color: "#f3f7f4", fontSize: 15, fontWeight: "700" },
  serviceName: { marginTop: 3, color: "#8e9a92", fontSize: 12 },
  badge: { paddingHorizontal: 9, paddingVertical: 6, overflow: "hidden", borderRadius: 6, color: "#d4d8c4", fontSize: 10, fontWeight: "700" },
  badge_pendiente: { backgroundColor: "#3a3020", color: "#f1c86b" },
  badge_confirmada: { backgroundColor: "#18372a", color: "#76dda9" },
  badge_finalizada: { backgroundColor: "#1d3028", color: "#8cdeb2" },
  badge_cancelada: { backgroundColor: "#382322", color: "#ed9187" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#29332d" },
  infoLabel: { color: "#8e9a92", fontSize: 12 },
  infoValue: { flexShrink: 1, color: "#d5ded8", fontSize: 12, fontWeight: "600", textAlign: "right" },
  infoEmphasis: { color: "#46d995", fontSize: 13, fontWeight: "800" },
  ratingInfo: { marginTop: 8, paddingTop: 11, borderTopWidth: 1, borderTopColor: "#29332d" },
  ratingLabel: { color: "#8e9a92", fontSize: 11 },
  ratingStars: { marginTop: 4, color: "#facc15", fontSize: 17 },
  starInactive: { color: "#37433b" },
  commentText: { marginTop: 5, color: "#9aa59d", fontSize: 12, fontStyle: "italic" },
  cancelAppointment: { alignItems: "center", marginTop: 13, paddingVertical: 10, borderWidth: 1, borderColor: "#59302c", borderRadius: 7 },
  cancelAppointmentText: { color: "#ff9b90", fontSize: 12, fontWeight: "700" },
  rateAppointment: { alignItems: "center", marginTop: 13, paddingVertical: 10, borderWidth: 1, borderColor: "#66511f", borderRadius: 7, backgroundColor: "#302916" },
  rateAppointmentText: { color: "#facc15", fontSize: 12, fontWeight: "700" },
  empty: { marginTop: 30 },
  emptyWrap: { alignItems: "center", paddingVertical: 45 },
  emptyMark: { width: 54, height: 54, borderRadius: 27, backgroundColor: "#1e3428", color: "#46d995", fontSize: 25, fontWeight: "800", lineHeight: 54, textAlign: "center" },
  emptyText: { marginTop: 14, marginBottom: 15, color: "#aab4ad", fontSize: 14, textAlign: "center" },
  primaryButton: { minHeight: 45, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, borderRadius: 7, backgroundColor: "#20c77a" },
  primaryButtonText: { color: "#07140d", fontSize: 13, fontWeight: "800" },
  bottomButton: { minHeight: 50, alignItems: "center", justifyContent: "center", marginHorizontal: 18, marginBottom: 90, borderRadius: 8, backgroundColor: "#20c77a" },
  bottomButtonText: { color: "#07140d", fontSize: 14, fontWeight: "800" },
  modalBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, backgroundColor: "rgba(0,0,0,0.78)" },
  modalCard: { width: "100%", maxWidth: 420, padding: 22, borderWidth: 1, borderColor: "#344139", borderRadius: 14, backgroundColor: "#171d19" },
  modalKicker: { color: "#46d995", fontSize: 10, fontWeight: "700", letterSpacing: 1.5 },
  modalTitle: { marginTop: 9, color: "#f3f7f4", fontSize: 22, fontWeight: "700" },
  modalSubtitle: { marginTop: 7, color: "#aab4ad", fontSize: 13, lineHeight: 19 },
  stars: { flexDirection: "row", justifyContent: "center", gap: 12, marginVertical: 18 },
  star: { color: "#3d4941", fontSize: 35 },
  starActive: { color: "#facc15" },
  comment: { minHeight: 95, padding: 12, borderWidth: 1, borderColor: "#344139", borderRadius: 8, backgroundColor: "#1a211d", color: "#f3f7f4", fontSize: 13 },
  modalCancel: { alignItems: "center", paddingTop: 16 },
  modalCancelText: { color: "#aab4ad", fontSize: 13, fontWeight: "600" },
  disabled: { opacity: 0.45 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#101312" },
});