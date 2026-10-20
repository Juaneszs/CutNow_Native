import { StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../src/native/AuthProvider";
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
            <Stack.Screen name="cita/[id]" options={{ title: "Reservar cita" }} />
          </Stack>
          <BottomNavigation />
        </View>
      </CartProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});