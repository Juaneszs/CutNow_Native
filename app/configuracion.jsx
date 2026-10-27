import { useEffect } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../src/native/useAuth";

const adminLinks = [
  { path: "/admin", label: "Panel administrativo", description: "Resumen de la operación" },
  { path: "/admin/citas", label: "Citas", description: "Revisar y gestionar reservas" },
  { path: "/admin/barberos", label: "Barberos", description: "Crear, editar o eliminar barberos" },
  { path: "/admin/servicios", label: "Servicios", description: "Administrar servicios y precios" },
  { path: "/admin/sedes", label: "Sedes", description: "Administrar las sedes" },
  { path: "/admin/productos", label: "Productos", description: "Administrar el inventario de tienda" },
  { path: "/admin/pedidos", label: "Pedidos", description: "Actualizar o eliminar pedidos" },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { user, isAdmin, cargando, cerrarSesion } = useAuth();

  useEffect(() => {
    if (!cargando && !user) router.replace("/");
  }, [cargando, router, user]);

  async function salir() {
    try {
      await cerrarSesion();
      router.replace("/");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      Alert.alert("No se pudo cerrar sesión", "Intenta de nuevo.");
    }
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Configuración</Text>
      {isAdmin ? (
        <View style={styles.adminSection}>
          <Text style={styles.sectionTitle}>Gestionar</Text>
          {adminLinks.map((item, index) => (
            <Pressable
              key={item.path}
              accessibilityRole="button"
              onPress={() => router.push(item.path)}
              style={({ pressed }) => [styles.adminOption, index === 0 && styles.firstOption, pressed && styles.pressed]}
            >
              <View style={styles.optionIcon}>
                <Ionicons color="#46d995" name={index === 0 ? "settings-outline" : "construct-outline"} size={20} />
              </View>
              <View style={styles.optionCopy}>
                <Text style={styles.optionTitle}>{item.label}</Text>
                <Text style={styles.optionDescription}>{item.description}</Text>
              </View>
              <Ionicons color="#aab4ad" name="chevron-forward" size={20} />
            </Pressable>
          ))}
        </View>
      ) : null}
      <Pressable accessibilityRole="button" onPress={salir} style={({ pressed }) => [styles.logout, pressed && styles.pressed]}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#101312" },
  content: { padding: 20, paddingBottom: 120 },
  title: { marginBottom: 20, color: "#f3f7f4", fontSize: 25, fontWeight: "700" },
  adminSection: { gap: 10 },
  sectionTitle: { marginBottom: 2, color: "#46d995", fontSize: 13, fontWeight: "800", letterSpacing: 1 },
  adminOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: "#29362e",
    borderRadius: 12,
    backgroundColor: "#171d19",
  },
  firstOption: { borderColor: "rgba(70,217,149,0.45)" },
  optionIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "rgba(32,199,122,0.12)",
  },
  optionCopy: { flex: 1, marginHorizontal: 12 },
  optionTitle: { color: "#f3f7f4", fontSize: 14, fontWeight: "600" },
  optionDescription: { marginTop: 4, color: "#aab4ad", fontSize: 12 },
  logout: { alignItems: "center", marginTop: 24, padding: 14, borderWidth: 1, borderColor: "#59302c", borderRadius: 10 },
  logoutText: { color: "#ff9b90", fontSize: 14, fontWeight: "700" },
  pressed: { opacity: 0.76 },
});