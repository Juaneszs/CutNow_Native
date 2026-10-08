import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase.native";
import { useAuth } from "../src/native/useAuth";
import { useCart } from "../src/native/useCart";

const categorias = [
  { nombre: "Herramientas", icono: "✂" },
  { nombre: "Productos", icono: "◉" },
  { nombre: "Accesorios", icono: "▣" },
];
const money = value => `$${Number(value || 0).toLocaleString("es-CO")}`;

export default function StoreScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const { carrito, cargado: carritoCargado, agregar, eliminar } = useCart();
  const [productos, setProductos] = useState([]);
  const [categoria, setCategoria] = useState("Herramientas");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let activa = true;
    getDocs(collection(db, "Productos"))
      .then(snapshot => {
        if (activa) setProductos(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
      })
      .catch(() => { if (activa) setError("No se pudo cargar el inventario."); })
      .finally(() => { if (activa) setCargando(false); });
    return () => { activa = false; };
  }, []);

  const total = carrito.reduce((sum, item) => sum + (Number(item.precio) || 0), 0);
  const columns = width >= 720 ? 2 : 1;
  const visible = productos.filter(item => item.categoria === categoria);

  function agregarProducto(producto) {
    if (!user) {
      Alert.alert("Inicia sesión", "Necesitas una cuenta para añadir productos al carrito.", [
        { text: "Ahora no", style: "cancel" },
        { text: "Iniciar sesión", onPress: () => router.push("/") },
        { text: "Crear cuenta", onPress: () => router.push("/registro") },
      ]);
      return;
    }
    agregar(producto);
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.kicker}>CUTNOW · SELECCIÓN PROFESIONAL</Text>
        <Text style={styles.title}>Herramientas para tu ritual.</Text>
        <Text style={styles.subtitle}>Productos y accesorios disponibles para recoger en el local.</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
        {categorias.map(item => {
          const selected = item.nombre === categoria;
          return (
            <Pressable key={item.nombre} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => setCategoria(item.nombre)} style={[styles.category, selected && styles.categorySelected]}>
              <Text style={[styles.categoryIcon, selected && styles.categoryTextSelected]}>{item.icono}</Text>
              <Text style={[styles.categoryText, selected && styles.categoryTextSelected]}>{item.nombre}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {cargando ? <ActivityIndicator color="#20c77a" style={styles.loading} /> : error ? <Text style={styles.empty}>{error}</Text> : visible.length ? (
        <FlatList
          data={visible}
          key={columns}
          keyExtractor={item => item.id}
          numColumns={columns}
          scrollEnabled={false}
          columnWrapperStyle={columns > 1 ? styles.gridRow : undefined}
          renderItem={({ item }) => (
            <View style={[styles.productCard, columns > 1 && styles.productColumn]}>
              {item.imagen ? <Image source={{ uri: item.imagen }} style={styles.productImage} resizeMode="cover" /> : <View style={[styles.productImage, styles.imageFallback]}><Text style={styles.fallbackMark}>CN</Text></View>}
              <Text style={styles.pickup}>RECOGIDA EN LOCAL</Text>
              <Text style={styles.productName}>{item.nombre || "Producto CutNow"}</Text>
              <Text style={styles.productPrice}>{money(item.precio)}</Text>
              <Pressable accessibilityRole="button" onPress={() => agregarProducto(item)} style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
                <Text style={styles.addButtonText}>＋  Añadir al carrito</Text>
              </Pressable>
            </View>
          )}
          style={styles.grid}
        />
      ) : <Text style={styles.empty}>No hay productos en esta categoría.</Text>}

      <View style={styles.cartSection}>
        <View style={styles.cartHeading}>
          <View>
            <Text style={styles.cartTitle}>Tu carrito</Text>
            <Text style={styles.cartCount}>{carrito.length} {carrito.length === 1 ? "artículo" : "artículos"}</Text>
          </View>
          <Text style={styles.cartTotal}>{money(total)}</Text>
        </View>
        {carrito.length ? carrito.map(item => (
          <View key={item.idCarrito} style={styles.cartItem}>
            <Text numberOfLines={1} style={styles.cartItemName}>{item.nombre}</Text>
            <Text style={styles.cartItemPrice}>{money(item.precio)}</Text>
            <Pressable accessibilityLabel={`Quitar ${item.nombre} del carrito`} onPress={() => eliminar(item.idCarrito)} hitSlop={8}>
              <Text style={styles.remove}>×</Text>
            </Pressable>
          </View>
        )) : <Text style={styles.cartEmpty}>{carritoCargado ? "Aún no has añadido productos." : "Recuperando carrito..."}</Text>}
        <Pressable accessibilityRole="button" disabled={!carrito.length || !carritoCargado} onPress={() => router.push("/checkout")} style={[styles.checkoutButton, (!carrito.length || !carritoCargado) && styles.disabled]}>
          <Text style={styles.checkoutText}>Continuar compra</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#101312" },
  content: { width: "100%", maxWidth: 980, alignSelf: "center", paddingHorizontal: 18, paddingBottom: 30 },
  header: { paddingTop: 24, paddingBottom: 18 },
  kicker: { color: "#46d995", fontSize: 10, fontWeight: "700", letterSpacing: 1.7 },
  title: { marginTop: 10, color: "#f3f7f4", fontSize: 28, fontWeight: "700", lineHeight: 35 },
  subtitle: { marginTop: 7, color: "#aab4ad", fontSize: 14, lineHeight: 21 },
  categories: { gap: 8, paddingBottom: 18 },
  category: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: "#344139", borderRadius: 8, backgroundColor: "#171d19" },
  categorySelected: { borderColor: "#20c77a", backgroundColor: "#173326" },
  categoryIcon: { color: "#abb7af", fontSize: 15 },
  categoryText: { color: "#abb7af", fontSize: 13, fontWeight: "600" },
  categoryTextSelected: { color: "#6be0a4" },
  loading: { marginVertical: 40 },
  empty: { paddingVertical: 28, color: "#aab4ad", fontSize: 14, textAlign: "center" },
  grid: { marginHorizontal: -5 },
  gridRow: { gap: 10 },
  productColumn: { flex: 1 },
  productCard: { marginHorizontal: 5, marginBottom: 12, padding: 12, borderWidth: 1, borderColor: "#29362e", borderRadius: 11, backgroundColor: "#171d19" },
  productImage: { width: "100%", height: 168, borderRadius: 8, backgroundColor: "#202822" },
  imageFallback: { alignItems: "center", justifyContent: "center" },
  fallbackMark: { color: "#46d995", fontSize: 26, fontWeight: "800" },
  pickup: { marginTop: 13, color: "#46d995", fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  productName: { marginTop: 5, color: "#f3f7f4", fontSize: 16, fontWeight: "700" },
  productPrice: { marginTop: 5, color: "#d5ded8", fontSize: 15, fontWeight: "600" },
  addButton: { minHeight: 42, alignItems: "center", justifyContent: "center", marginTop: 13, borderRadius: 7, backgroundColor: "#20c77a" },
  addButtonText: { color: "#07140d", fontSize: 13, fontWeight: "800" },
  pressed: { opacity: 0.8 },
  cartSection: { marginTop: 8, padding: 16, borderWidth: 1, borderColor: "#344139", borderRadius: 11, backgroundColor: "#171d19" },
  cartHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  cartTitle: { color: "#f3f7f4", fontSize: 18, fontWeight: "700" },
  cartCount: { marginTop: 3, color: "#8e9a92", fontSize: 12 },
  cartTotal: { color: "#46d995", fontSize: 18, fontWeight: "800" },
  cartItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#29332d" },
  cartItemName: { flex: 1, color: "#d5ded8", fontSize: 13 },
  cartItemPrice: { color: "#d5ded8", fontSize: 13, fontWeight: "600" },
  remove: { paddingHorizontal: 4, color: "#ff8e83", fontSize: 23 },
  cartEmpty: { paddingVertical: 8, color: "#84908a", fontSize: 13 },
  checkoutButton: { minHeight: 47, alignItems: "center", justifyContent: "center", marginTop: 14, borderRadius: 8, backgroundColor: "#20c77a" },
  checkoutText: { color: "#07140d", fontSize: 14, fontWeight: "800" },
  disabled: { opacity: 0.45 },
});