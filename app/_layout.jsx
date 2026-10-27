import { Pressable, StyleSheet, Text, View } from "react-native";
import { Link, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../src/native/AuthContext";
import { CartProvider } from "../src/native/CartContext";
import { BottomNavigation } from "../src/native/BottomNavigation";

export default function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <StatusBar style="light" />
        <View style={styles.root}>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: "#101312" },
              headerTintColor: "#f4f7f5",
              contentStyle: { backgroundColor: "#101312" },
              headerShadowVisible: false,
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="registro" options={{ title: "Crear cuenta" }} />
            <Stack.Screen name="recuperar-contrasena" options={{ title: "Recuperar acceso" }} />
            <Stack.Screen name="catalogo" options={{ title: "CutNow" }} />
            <Stack.Screen name="agendar" options={{ title: "Reservar cita" }} />
            <Stack.Screen name="tienda" options={{ title: "Tienda" }} />
            <Stack.Screen name="checkout" options={{ title: "Finalizar compra" }} />
            <Stack.Screen name="mis-citas" options={{ title: "Mis citas" }} />
            <Stack.Screen name="configuracion" options={{ title: "Configuración" }} />
            <Stack.Screen name="admin" options={{ title: "Administración" }} />
            <Stack.Screen name="admin/citas" options={{ title: "Gestión de citas" }} />
            <Stack.Screen name="admin/[section]" options={{ title: "Gestión" }} />
            <Stack.Screen name="cita/[id]" options={{ title: "Reservar cita" }} />
          </Stack>
          <BottomNavigation />
        </View>
      </CartProvider>
    </AuthProvider>
  );
}

export function ErrorBoundary({ error, retry }) {
  return (
    <View style={styles.errorPage}>
      <Text style={styles.errorTitle}>Algo salió mal</Text>
      <Text style={styles.errorText}>No pudimos mostrar esta pantalla. Vuelve al inicio e inténtalo nuevamente.</Text>
      <Text accessibilityRole="alert" style={styles.errorDetail}>{error?.message}</Text>
      <Link href="/" asChild>
        <Pressable style={styles.errorButton}>
          <Text style={styles.errorButtonText}>Volver al inicio</Text>
        </Pressable>
      </Link>
      <Pressable onPress={retry} style={styles.retryButton}>
        <Text style={styles.retryText}>Reintentar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  errorPage: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#101312" },
  errorTitle: { color: "#f3f7f4", fontSize: 24, fontWeight: "800" },
  errorText: { marginTop: 10, color: "#aab4ad", fontSize: 14, lineHeight: 21, textAlign: "center" },
  errorDetail: { marginTop: 8, color: "#ff8e83", fontSize: 11, textAlign: "center" },
  errorButton: { marginTop: 20, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 8, backgroundColor: "#20c77a" },
  errorButtonText: { color: "#07140d", fontWeight: "800" },
  retryButton: { padding: 12 },
  retryText: { color: "#46d995", fontWeight: "600" },
});