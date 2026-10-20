import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../src/native/useAuth";

export default function SettingsScreen() {
  const router = useRouter();
  const { user, isAdmin, cargando } = useAuth();

  useEffect(() => {
    if (!cargando && !user) router.replace("/");
  }, [cargando, router, user]);

  return (
    <View style={styles.page}>
      <Text style={styles.title}>Configuración</Text>
      {isAdmin ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/admin")}
          style={({ pressed }) => [styles.adminOption, pressed && styles.pressed]}
        >
          <View style={styles.optionIcon}>
            <Ionicons color="#46d995" name="settings-outline" size={21} />
          </View>
          <View style={styles.optionCopy}>
            <Text style={styles.optionTitle}>Abrir panel administrativo</Text>
            <Text style={styles.optionDescription}>Gestiona la operación de CutNow.</Text>
          </View>
          <Ionicons color="#aab4ad" name="chevron-forward" size={20} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 20, backgroundColor: "#101312" },
  title: { marginBottom: 20, color: "#f3f7f4", fontSize: 25, fontWeight: "700" },
  adminOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: "#29362e",
    borderRadius: 12,
    backgroundColor: "#171d19",
  },
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
  pressed: { opacity: 0.76 },
});