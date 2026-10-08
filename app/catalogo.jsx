import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { collection, getDocs } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase.native";
import { useAuth } from "../src/native/useAuth";

export default function CatalogScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user, perfil, isAdmin, cargando: authCargando } = useAuth();
  const [barberos, setBarberos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

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

  async function cerrarSesion() {
    await signOut(auth);
    router.replace("/");
  }

  const columns = width >= 680 ? 2 : 1;

  if (authCargando || !user) {
    return <View style={styles.center}><ActivityIndicator color="#20c77a" /></View>;
  }

  return (
    <FlatList
      contentContainerStyle={styles.listContent}
      data={barberos}
      key={columns}
      keyExtractor={item => item.id}
      ListEmptyComponent={
        cargando ? <ActivityIndicator color="#20c77a" style={styles.empty} /> :
          <Text style={styles.empty}>{error || "Aún no hay barberos disponibles."}</Text>
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
          {isAdmin ? (
            <Pressable onPress={() => router.push("/admin")} style={styles.adminLink}>
              <Text style={styles.adminLinkText}>Abrir panel administrativo</Text>
            </Pressable>
          ) : null}
          <View style={styles.quickLinks}>
            <Pressable onPress={() => router.push("/mis-citas")} style={styles.quickLink}>
              <Text style={styles.quickLinkText}>Mis citas</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/tienda")} style={styles.quickLink}>
              <Text style={styles.quickLinkText}>Tienda</Text>
            </Pressable>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      )}
      numColumns={columns}
      renderItem={({ item }) => (
        <View style={[styles.barberCard, columns > 1 && styles.barberCardColumn]}>
          {item.foto ? (
            <Image accessibilityLabel={item.Nombre || "Foto del barbero"} source={{ uri: item.foto }} style={styles.avatar} />
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
  listContent: { width: "100%", maxWidth: 900, alignSelf: "center", paddingHorizontal: 20, paddingBottom: 32 },
  header: { paddingTop: 20, paddingBottom: 22 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 30 },
  kicker: { color: "#46d995", fontSize: 10, fontWeight: "700", letterSpacing: 1.7 },
  greeting: { marginTop: 6, color: "#d7e0da", fontSize: 14 },
  logout: { paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: "#3a4840", borderRadius: 7 },
  logoutText: { color: "#c9d2cc", fontSize: 13, fontWeight: "600" },
  title: { color: "#f3f7f4", fontSize: 28, lineHeight: 35, fontWeight: "700" },
  subtitle: { marginTop: 8, color: "#aab4ad", fontSize: 14, lineHeight: 21 },
  adminLink: { alignSelf: "flex-start", marginTop: 14, paddingVertical: 7 },
  adminLinkText: { color: "#46d995", fontSize: 13, fontWeight: "600" },
  quickLinks: { flexDirection: "row", gap: 9, marginTop: 12 },
  quickLink: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: "#344139", borderRadius: 7 },
  quickLinkText: { color: "#c9d2cc", fontSize: 12, fontWeight: "600" },
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