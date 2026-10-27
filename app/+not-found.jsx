import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function NotFoundScreen() {
  return (
    <View style={styles.page}>
      <Text style={styles.title}>Página no encontrada</Text>
      <Text style={styles.message}>La ruta que buscas no existe.</Text>
      <Link href="/" asChild>
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Volver al inicio</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#101312" },
  title: { color: "#f3f7f4", fontSize: 24, fontWeight: "800" },
  message: { marginTop: 8, color: "#aab4ad", fontSize: 14 },
  button: { marginTop: 20, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 8, backgroundColor: "#20c77a" },
  buttonText: { color: "#07140d", fontWeight: "800" },
});
