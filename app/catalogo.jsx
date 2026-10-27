import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase.native";
import { useAuth } from "../src/native/useAuth";
import LoadingState from "../src/native/LoadingState";
import EmptyState from "../src/native/EmptyState";

export default function CatalogScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user, perfil, cargando: authCargando, cerrarSesion: cerrarSesionAuth } = useAuth();
  const [barberos, setBarberos] = useState([]);
  const [fotosFallidas, setFotosFallidas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [resumen, setResumen] = useState(null);
  const [cargandoResumen, setCargandoResumen] = useState(true);
  const [errorResumen, setErrorResumen] = useState("");

  useEffect(() => {
    if (!authCargando && !user) router.replace("/");
  }, [authCargando, router, user]);

  useEffect(() => {
    if (authCargando || !user) return;
    let activa = true;
    getDocs(collection(db, "Barberos"))
      .then(snapshot => {
        if (activa) setBarberos(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
      })
      .catch(() => {
        if (activa) setError("No se pudo cargar el catálogo. Intenta actualizar la pantalla.");
      })
      .finally(() => {
        if (activa) setCargando(false);
      });
    return () => { activa = false; };
  }, [authCargando, user]);

  useEffect(() => {
    if (authCargando || !user) return;
    let activa = true;
    getDocs(query(collection(db, "citas"), where("usuario_id", "==", user.uid)))
      .then(snapshot => {
        if (!activa) return;
        const citas = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const proximas = citas.filter(cita => {
          if (!["pendiente", "confirmada"].includes(cita.estado) || !cita.fecha) return false;
          const fechaCita = new Date(`${cita.fecha}T${cita.hora || "00:00"}:00`);
          return fechaCita >= hoy;
        });
        proximas.sort((a, b) => `${a.fecha} ${a.hora || ""}`.localeCompare(`${b.fecha} ${b.hora || ""}`));
        setResumen({
          proximas: proximas.length,
          completadas: citas.filter(cita => cita.estado === "finalizada").length,
          siguiente: proximas[0] || null,
        });
      })
      .catch(error => {
        console.error("Error al cargar el resumen de citas:", error);
        if (activa) setErrorResumen("No se pudo cargar el resumen de tus citas.");
      })
      .finally(() => { if (activa) setCargandoResumen(false); });
    return () => { activa = false; };
  }, [authCargando, user]);

  async function cerrarSesion() {
    try {
      await cerrarSesionAuth();
      router.replace("/");
    } catch (logoutError) {
      console.error("Error al cerrar sesión:", logoutError);
      Alert.alert("No se pudo cerrar sesión", "Intenta de nuevo.");
    }
  }

  const columns = width >= 680 ? 2 : 1;

  if (authCargando || !user) {
    return <LoadingState />;
  }

  return (
    <FlatList
      contentContainerStyle={styles.listContent}
      data={barberos}
      key={columns}
      keyExtractor={item => item.id}
      ListEmptyComponent={
        cargando ? <LoadingState /> :
          <EmptyState icon="✂" message={error || "No hay barberos disponibles."} />
      }
      ListHeaderComponent={(
        <View style={styles.header}>
          <View style={styles.topRow}>
            <View>
              <Text style={styles.kicker}>CUTNOW · MEDELLÍN</Text>
              <Text style={styles.greeting}>Hola, {perfil?.nombre || user.email?.split("@")[0]}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={cerrarSesion} style={styles.logout}>
              <Text style={styles.logoutText}>Salir</Text>
            </Pressable>
          </View>
          <Text style={styles.title}>Elige quién cuida tu estilo.</Text>
          <Text style={styles.subtitle}>Selecciona un barbero para iniciar tu reserva.</Text>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Tu resumen</Text>
            {cargandoResumen ? (
              <View style={styles.summaryLoading}>
                <ActivityIndicator color="#20c77a" />
                <Text style={styles.summaryText}>Cargando...</Text>
              </View>
            ) : errorResumen ? (
              <Text style={styles.error}>{errorResumen}</Text>
            ) : (
              <>
                <View style={styles.summaryStats}>
                  <Text style={styles.summaryText}>Próximas: <Text style={styles.summaryNumber}>{resumen?.proximas || 0}</Text></Text>
                  <Text style={styles.summaryText}>Completadas: <Text style={styles.summaryNumber}>{resumen?.completadas || 0}</Text></Text>
                </View>
                {resumen?.siguiente ? (
                  <Text style={styles.summaryText}>
                    Próxima cita: {resumen.siguiente.fecha} · {resumen.siguiente.hora || "Hora pendiente"}
                  </Text>
                ) : (
                  <View style={styles.noUpcoming}>
                    <Text style={styles.summaryText}>Aún no tienes citas próximas</Text>
                    <Pressable onPress={() => router.push("/agendar")} style={styles.summaryBookButton}>
                      <Text style={styles.summaryBookText}>Agendar cita</Text>
                    </Pressable>
                  </View>
                )}
              </>
            )}
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      )}
      numColumns={columns}
      renderItem={({ item }) => (
        <View style={[styles.barberCard, columns > 1 && styles.barberCardColumn]}>
          {item.foto && !fotosFallidas.includes(item.id) ? (
            <Image
              accessibilityLabel={item.Nombre || "Foto del barbero"}
              onError={() => setFotosFallidas(current => [...current, item.id])}
              source={{ uri: item.foto }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}><Text style={styles.avatarText}>{item.Nombre?.[0]?.toUpperCase() || "C"}</Text></View>
          )}
          <View style={styles.barberDetails}>
            <Text style={styles.barberName}>{item.Nombre || "Barbero CutNow"}</Text>
            <Text style={styles.specialty}>{item.especialidad || "Barbero profesional"}</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/agendar", params: { barberoId: item.id } })} style={({ pressed }) => [styles.bookButton, pressed && styles.pressed]}>
              <Text style={styles.bookButtonText}>Ver horarios</Text>
            </Pressable>
          </View>
        </View>
      )}
      style={styles.page}
    />
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#101312" },
  listContent: { width: "100%", maxWidth: 900, alignSelf: "center", paddingHorizontal: 20, paddingBottom: 112 },
  header: { paddingTop: 20, paddingBottom: 22 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 30 },
  kicker: { color: "#46d995", fontSize: 10, fontWeight: "700", letterSpacing: 1.7 },
  greeting: { marginTop: 6, color: "#d7e0da", fontSize: 14 },
  logout: { paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: "#3a4840", borderRadius: 7 },
  logoutText: { color: "#c9d2cc", fontSize: 13, fontWeight: "600" },
  title: { color: "#f3f7f4", fontSize: 28, lineHeight: 35, fontWeight: "700" },
  subtitle: { marginTop: 8, color: "#aab4ad", fontSize: 14, lineHeight: 21 },
  summaryCard: { marginTop: 18, padding: 15, borderWidth: 1, borderColor: "#29362e", borderRadius: 12, backgroundColor: "#171d19" },
  summaryTitle: { marginBottom: 10, color: "#f3f7f4", fontSize: 16, fontWeight: "700" },
  summaryLoading: { flexDirection: "row", alignItems: "center", gap: 10 },
  summaryStats: { flexDirection: "row", flexWrap: "wrap", gap: 18, marginBottom: 10 },
  summaryText: { color: "#aab4ad", fontSize: 13, lineHeight: 19 },
  summaryNumber: { color: "#46d995", fontWeight: "800" },
  noUpcoming: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 2 },
  summaryBookButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 7, backgroundColor: "#20c77a" },
  summaryBookText: { color: "#07140d", fontSize: 12, fontWeight: "800" },
  error: { marginTop: 12, color: "#ff8e83", fontSize: 13 },
  barberCard: { flexDirection: "row", alignItems: "center", marginBottom: 12, padding: 14, borderWidth: 1, borderColor: "#29362e", borderRadius: 12, backgroundColor: "#171d19" },
  barberCardColumn: { flex: 1, marginHorizontal: 6 },
  avatar: { width: 76, height: 76, borderRadius: 10, backgroundColor: "#222c25" },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#46d995", fontSize: 30, fontWeight: "700" },
  barberDetails: { flex: 1, marginLeft: 15 },
  barberName: { color: "#f3f7f4", fontSize: 17, fontWeight: "700" },
  specialty: { marginTop: 4, color: "#aab4ad", fontSize: 13 },
  bookButton: { alignSelf: "flex-start", marginTop: 12, paddingHorizontal: 15, paddingVertical: 9, borderRadius: 7, backgroundColor: "#20c77a" },
  bookButtonText: { color: "#07140d", fontSize: 13, fontWeight: "800" },
  pressed: { opacity: 0.8 },
  empty: { paddingVertical: 40, color: "#aab4ad", textAlign: "center", fontSize: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#101312" },
});