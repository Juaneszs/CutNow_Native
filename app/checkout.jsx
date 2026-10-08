import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useCart } from "../src/native/useCart";

const money = value => `$${Number(value || 0).toLocaleString("es-CO")}`;

export default function CheckoutScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { carrito, cargado, vaciar } = useCart();
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [enviando, setEnviando] = useState(false);
  const total = carrito.reduce((sum, item) => sum + (Number(item.precio) || 0), 0);

  async function confirmarCompra() {
    if (!carrito.length) return;
    if (metodoPago === "transferencia") {
      const lineas = carrito.map(item => `- ${item.nombre} - ${money(item.precio)}`).join("\n");
      const mensaje = `Hola, quiero confirmar mi pedido de CutNow:\n\n${lineas}\n\nTotal a transferir: ${money(total)}\n\nQuedo atento a los datos para realizar la transferencia.`;
      const url = `https://wa.me/573005782087?text=${encodeURIComponent(mensaje)}`;
      setEnviando(true);
      try {
        await Linking.openURL(url);
        vaciar();
        router.replace("/tienda");
      } catch {
        Alert.alert("No se pudo abrir WhatsApp", "Comprueba que tienes un navegador o WhatsApp instalado.");
      } finally {
        setEnviando(false);
      }
      return;
    }

    Alert.alert("Pedido reservado", "Págalo en efectivo al recogerlo en la barbería.", [
      { text: "Entendido", onPress: () => { vaciar(); router.replace("/tienda"); } },
    ]);
  }

  function cancelarCompra() {
    Alert.alert("¿Cancelar compra?", "Volverás a la tienda; tu carrito se conservará.", [
      { text: "Seguir comprando", style: "cancel" },
      { text: "Volver a la tienda", onPress: () => router.replace("/tienda") },
    ]);
  }

  if (!cargado) return <View style={styles.center}><ActivityIndicator color="#20c77a" /></View>;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={[styles.body, { width: Math.min(width - 36, 620) }]}>
        <Text style={styles.kicker}>TU PEDIDO</Text>
        <Text style={styles.title}>Finalizar compra.</Text>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Productos · {carrito.length}</Text>
          {carrito.length ? carrito.map(item => (
            <View key={item.idCarrito} style={styles.item}>
              {item.imagen ? <Image source={{ uri: item.imagen }} style={styles.image} /> : <View style={[styles.image, styles.imageFallback]}><Text style={styles.fallbackMark}>CN</Text></View>}
              <Text numberOfLines={2} style={styles.itemName}>{item.nombre}</Text>
              <Text style={styles.itemPrice}>{money(item.precio)}</Text>
            </View>
          )) : <Text style={styles.empty}>Tu carrito está vacío.</Text>}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{money(total)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Método de pago</Text>
          {[
            { value: "efectivo", label: "Efectivo al recoger", detail: "Paga en el local al retirar tu pedido." },
            { value: "transferencia", label: "Transferencia", detail: "Confirma el pedido por WhatsApp." },
          ].map(option => {
            const active = metodoPago === option.value;
            return (
              <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ selected: active }} onPress={() => setMetodoPago(option.value)} style={[styles.method, active && styles.methodActive]}>
                <View style={[styles.radio, active && styles.radioActive]}>{active ? <View style={styles.radioDot} /> : null}</View>
                <View style={styles.methodCopy}>
                  <Text style={styles.methodTitle}>{option.label}</Text>
                  <Text style={styles.methodDetail}>{option.detail}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable accessibilityRole="button" disabled={!carrito.length || enviando} onPress={confirmarCompra} style={({ pressed }) => [styles.confirm, pressed && styles.pressed, (!carrito.length || enviando) && styles.disabled]}>
          {enviando ? <ActivityIndicator color="#07140d" /> : <Text style={styles.confirmText}>{metodoPago === "transferencia" ? "Continuar por WhatsApp" : "Reservar pedido"}</Text>}
        </Pressable>
        <Pressable onPress={cancelarCompra} style={styles.cancelButton}><Text style={styles.cancelText}>Cancelar compra</Text></Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, alignItems: "center", paddingVertical: 25, backgroundColor: "#101312" },
  body: { paddingHorizontal: 18 },
  kicker: { color: "#46d995", fontSize: 10, fontWeight: "700", letterSpacing: 1.8 },
  title: { marginTop: 10, marginBottom: 20, color: "#f3f7f4", fontSize: 27, fontWeight: "700" },
  section: { marginBottom: 15, padding: 15, borderWidth: 1, borderColor: "#29362e", borderRadius: 11, backgroundColor: "#171d19" },
  sectionTitle: { marginBottom: 10, color: "#f3f7f4", fontSize: 15, fontWeight: "700" },
  item: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 9, borderTopWidth: 1, borderTopColor: "#29332d" },
  image: { width: 52, height: 52, borderRadius: 7, backgroundColor: "#222c25" },
  imageFallback: { alignItems: "center", justifyContent: "center" },
  fallbackMark: { color: "#46d995", fontSize: 14, fontWeight: "800" },
  itemName: { flex: 1, color: "#d5ded8", fontSize: 13 },
  itemPrice: { color: "#d5ded8", fontSize: 13, fontWeight: "600" },
  empty: { paddingVertical: 14, color: "#8e9a92", fontSize: 13 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 13, borderTopWidth: 1, borderTopColor: "#3a4840" },
  totalLabel: { color: "#c9d2cc", fontSize: 14 },
  totalValue: { color: "#46d995", fontSize: 17, fontWeight: "800" },
  method: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 9, padding: 12, borderWidth: 1, borderColor: "#344139", borderRadius: 8 },
  methodActive: { borderColor: "#20c77a", backgroundColor: "#17281f" },
  radio: { width: 18, height: 18, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#758078", borderRadius: 9 },
  radioActive: { borderColor: "#46d995" },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#46d995" },
  methodCopy: { flex: 1 },
  methodTitle: { color: "#e1e8e3", fontSize: 13, fontWeight: "600" },
  methodDetail: { marginTop: 3, color: "#84908a", fontSize: 11, lineHeight: 16 },
  confirm: { minHeight: 49, alignItems: "center", justifyContent: "center", marginTop: 4, borderRadius: 8, backgroundColor: "#20c77a" },
  confirmText: { color: "#07140d", fontSize: 14, fontWeight: "800" },
  cancelButton: { alignItems: "center", paddingVertical: 15 },
  cancelText: { color: "#aab4ad", fontSize: 13, fontWeight: "600" },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.45 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#101312" },
});