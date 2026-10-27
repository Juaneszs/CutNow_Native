import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../src/native/useAuth";
import LoadingState from "../../src/native/LoadingState";
import EmptyState from "../../src/native/EmptyState";
import {
  actualizarPedidoAdmin,
  actualizarRegistroAdmin,
  crearRegistroAdmin,
  eliminarPedidoAdmin,
  eliminarRegistroAdmin,
  listarPedidosAdmin,
  listarRegistrosAdmin,
} from "../../src/native/adminService";

const config = {
  barberos: {
    title: "Barberos",
    collection: "Barberos",
    fields: [
      { name: "Nombre", label: "Nombre" },
      { name: "especialidad", label: "Especialidad" },
      { name: "foto", label: "Foto (URL)" },
      { name: "sede_id", label: "Sede", type: "sede" },
      { name: "estado", label: "Estado", type: "choice", options: ["activo", "inactivo"], defaultValue: "activo" },
    ],
  },
  servicios: {
    title: "Servicios",
    collection: "Servicios",
    fields: [
      { name: "NomCorte", label: "Nombre del servicio" },
      { name: "Precio", label: "Precio", type: "number" },
      { name: "duracion_min", label: "Duración (minutos)", type: "number" },
      { name: "activo", label: "Activo", type: "boolean", defaultValue: true },
    ],
  },
  sedes: {
    title: "Sedes",
    collection: "Sedes",
    fields: [
      { name: "NomSede", label: "Nombre de la sede" },
      { name: "Ciudad", label: "Ciudad" },
      { name: "Direccion", label: "Dirección" },
      { name: "activa", label: "Activa", type: "boolean", defaultValue: true },
    ],
  },
  productos: {
    title: "Productos",
    collection: "Productos",
    fields: [
      { name: "nombre", label: "Nombre" },
      { name: "precio", label: "Precio", type: "number" },
      { name: "imagen", label: "Imagen (URL)" },
      { name: "categoria", label: "Categoría", type: "choice", options: ["Herramientas", "Productos", "Accesorios"] },
    ],
  },
};

const emptyMessage = "No hay registros";
const money = value => `$${Number(value || 0).toLocaleString("es-CO")}`;

function initialForm(fields) {
  return Object.fromEntries(fields.map(field => [
    field.name,
    field.type === "boolean" ? (field.defaultValue ?? true) : (field.defaultValue ?? ""),
  ]));
}

export default function AdminManagementScreen() {
  const router = useRouter();
  const { section } = useLocalSearchParams();
  const { user, isAdmin, cargando: authCargando } = useAuth();
  const sectionKey = Array.isArray(section) ? section[0] : section;
  const definition = config[sectionKey];
  const ordersMode = sectionKey === "pedidos";
  const fields = definition?.fields || [];
  const [records, setRecords] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(() => initialForm(fields));
  const [error, setError] = useState("");

  const title = ordersMode ? "Pedidos" : definition?.title || "Administración";

  useEffect(() => {
    if (!authCargando && (!user || !isAdmin)) router.replace("/catalogo");
  }, [authCargando, isAdmin, router, user]);

  useEffect(() => {
    setForm(initialForm(fields));
    setEditando(null);
  }, [sectionKey]);

  useEffect(() => {
    if (authCargando || !user || !isAdmin) return;
    if (!definition && !ordersMode) {
      setCargando(false);
      return;
    }
    let activo = true;
    setCargando(true);
    setRecords([]);
    setError("");
    const cargar = async () => {
      try {
        const [items, sedesItems] = await Promise.all([
          ordersMode ? listarPedidosAdmin() : listarRegistrosAdmin(definition.collection),
          sectionKey === "barberos" ? listarRegistrosAdmin("Sedes") : Promise.resolve([]),
        ]);
        if (activo) {
          const sorted = ordersMode
            ? [...items].sort((a, b) => (b.fecha_creacion?.toMillis?.() || 0) - (a.fecha_creacion?.toMillis?.() || 0))
            : items;
          setRecords(sorted);
          setSedes(sedesItems);
        }
      } catch (loadError) {
        console.error("Error al cargar administración móvil:", loadError);
        if (activo) setError("No se pudieron cargar los datos. Intenta nuevamente.");
      } finally {
        if (activo) setCargando(false);
      }
    };
    cargar();
    return () => { activo = false; };
  }, [authCargando, definition, isAdmin, ordersMode, sectionKey, user]);

  const sedeOptions = useMemo(() => sedes.map(sede => ({
    value: sede.id,
    label: sede.NomSede || "Sede sin nombre",
  })), [sedes]);

  function editar(record) {
    setEditando(record);
    setForm(Object.fromEntries(fields.map(field => [
      field.name,
      record[field.name] ?? field.defaultValue ?? (field.type === "boolean" ? true : ""),
    ])));
    setError("");
  }

  async function guardar() {
    const invalid = fields.find(field => {
      const value = form[field.name];
      if (field.type === "boolean") return typeof value !== "boolean";
      if (field.type === "number") return value === "" || !Number.isFinite(Number(value)) || Number(value) <= 0;
      return typeof value !== "string" || !value.trim();
    });
    if (invalid) {
      setError(invalid.type === "number"
        ? `${invalid.label} debe ser un número mayor a 0.`
        : `El campo ${invalid.label} es obligatorio.`);
      return;
    }

    const data = Object.fromEntries(fields.map(field => [
      field.name,
      field.type === "number" ? Number(form[field.name]) : form[field.name],
    ]));
    setGuardando(true);
    setError("");
    try {
      if (editando) {
        await actualizarRegistroAdmin(definition.collection, editando.id, data);
        setRecords(current => current.map(item => item.id === editando.id ? { ...item, ...data } : item));
        Alert.alert("Guardado", `${title} actualizado correctamente.`);
      } else {
        const created = await crearRegistroAdmin(definition.collection, data);
        setRecords(current => [...current, created]);
        Alert.alert("Guardado", `${title} creado correctamente.`);
      }
      setEditando(null);
      setForm(initialForm(fields));
    } catch (saveError) {
      console.error("Error al guardar registro móvil:", saveError);
      setError(`No se pudo guardar ${title.toLowerCase()}. Intenta de nuevo.`);
    } finally {
      setGuardando(false);
    }
  }

  function confirmarEliminar(record) {
    Alert.alert("¿Eliminar registro?", "Esta acción no se puede deshacer.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            if (ordersMode) await eliminarPedidoAdmin(record.id);
            else await eliminarRegistroAdmin(definition.collection, record.id);
            setRecords(current => current.filter(item => item.id !== record.id));
            if (editando?.id === record.id) {
              setEditando(null);
              setForm(initialForm(fields));
            }
          } catch (deleteError) {
            console.error("Error al eliminar registro móvil:", deleteError);
            Alert.alert("Error", "No se pudo eliminar el registro.");
          }
        },
      },
    ]);
  }

  async function cambiarEstadoPedido(pedido, estado) {
    try {
      await actualizarPedidoAdmin(pedido.id, estado);
      setRecords(current => current.map(item => item.id === pedido.id ? { ...item, estado } : item));
    } catch (updateError) {
      console.error("Error al actualizar pedido móvil:", updateError);
      Alert.alert("Error", "No se pudo actualizar el estado del pedido.");
    }
  }

  function renderField(field) {
    const value = form[field.name];
    if (field.type === "boolean" || field.type === "choice" || field.type === "sede") {
      const options = field.type === "boolean"
        ? [{ value: true, label: "Sí" }, { value: false, label: "No" }]
        : field.type === "sede" ? sedeOptions : field.options.map(option => ({ value: option, label: option }));
      return (
        <View key={field.name} style={styles.field}>
          <Text style={styles.fieldLabel}>{field.label}</Text>
          <View style={styles.choiceWrap}>
            {options.map(option => (
              <Pressable
                key={String(option.value)}
                onPress={() => setForm(current => ({ ...current, [field.name]: option.value }))}
                style={[styles.choice, value === option.value && styles.choiceActive]}
              >
                <Text style={[styles.choiceText, value === option.value && styles.choiceTextActive]}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      );
    }
    return (
      <View key={field.name} style={styles.field}>
        <Text style={styles.fieldLabel}>{field.label}</Text>
        <TextInput
          keyboardType={field.type === "number" ? "decimal-pad" : "default"}
          onChangeText={text => setForm(current => ({ ...current, [field.name]: text }))}
          placeholder={field.label}
          placeholderTextColor="#7e8981"
          style={styles.input}
          value={String(value ?? "")}
        />
      </View>
    );
  }

  if (authCargando || cargando) {
    return <LoadingState message={error || "Cargando..."} />;
  }

  if (!definition && !ordersMode) {
    return <View style={styles.center}><Text style={styles.title}>Página no encontrada</Text></View>;
  }

  return (
    <>
      <Stack.Screen options={{ title }} />
      <ScrollView style={styles.page} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Gestionar {title}</Text>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

        {!ordersMode && (
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>{editando ? "Editar registro" : "Nuevo registro"}</Text>
            {fields.map(renderField)}
            <View style={styles.actions}>
              <Pressable disabled={guardando} onPress={guardar} style={[styles.button, styles.primary, guardando && styles.disabled]}>
                <Text style={styles.buttonText}>{guardando ? "Guardando..." : editando ? "Guardar cambios" : "Crear"}</Text>
              </Pressable>
              {editando ? (
                <Pressable onPress={() => { setEditando(null); setForm(initialForm(fields)); }} style={[styles.button, styles.secondary]}>
                  <Text style={styles.buttonText}>Cancelar edición</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>{title}</Text>
        {error && records.length === 0 ? null : records.length === 0 ? (
          <EmptyState icon={ordersMode ? "▣" : "◇"} message={emptyMessage} />
        ) : records.map(record => (
          <View key={record.id} style={styles.card}>
            {ordersMode ? (
              <>
                <Text style={styles.cardTitle}>{record.usuario_nombre || "Pedido"}</Text>
                <Text style={styles.cardText}>Estado: {record.estado || "pendiente"} · Pago: {record.metodo_pago || "—"}</Text>
                <Text style={styles.cardText}>Total: {money(record.total)}</Text>
                {(record.productos || []).map((product, index) => (
                  <Text key={`${record.id}-${index}`} style={styles.cardText}>• {product.nombre} — {money(product.precio)}</Text>
                ))}
                <View style={styles.actions}>
                  {record.estado !== "entregado" && (
                    <Pressable onPress={() => cambiarEstadoPedido(record, "entregado")} style={[styles.button, styles.primary]}>
                      <Text style={styles.buttonText}>Marcar entregado</Text>
                    </Pressable>
                  )}
                  {record.estado !== "cancelado" && (
                    <Pressable onPress={() => cambiarEstadoPedido(record, "cancelado")} style={[styles.button, styles.secondary]}>
                      <Text style={styles.buttonText}>Cancelar pedido</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => confirmarEliminar(record)} style={[styles.button, styles.danger]}>
                    <Text style={styles.buttonText}>Eliminar</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.cardTitle}>{record.Nombre || record.NomCorte || record.NomSede || record.nombre || "Registro"}</Text>
                {fields.map(field => {
                  const fieldValue = record[field.name];
                  const labelValue = field.type === "boolean" ? (fieldValue ? "Sí" : "No")
                    : field.type === "number" && field.name.toLowerCase().includes("precio") ? money(fieldValue)
                      : field.name === "sede_id" ? (sedeOptions.find(item => item.value === fieldValue)?.label || fieldValue)
                        : fieldValue;
                  return <Text key={field.name} style={styles.cardText}>{field.label}: {labelValue || "—"}</Text>;
                })}
                <View style={styles.actions}>
                  <Pressable onPress={() => editar(record)} style={[styles.button, styles.primary]}>
                    <Text style={styles.buttonText}>Editar</Text>
                  </Pressable>
                  <Pressable onPress={() => confirmarEliminar(record)} style={[styles.button, styles.danger]}>
                    <Text style={styles.buttonText}>Eliminar</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#101312" },
  content: { padding: 18, paddingBottom: 112, gap: 14 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10, backgroundColor: "#101312" },
  title: { color: "#f3f7f4", fontSize: 24, fontWeight: "800" },
  sectionTitle: { marginTop: 8, marginBottom: 8, color: "#e9f1eb", fontSize: 18, fontWeight: "700" },
  muted: { color: "#aab4ad" },
  error: { padding: 12, borderRadius: 10, color: "#ffaaa5", backgroundColor: "rgba(190,55,47,0.14)" },
  empty: { padding: 22, borderRadius: 12, color: "#aab4ad", textAlign: "center", backgroundColor: "#171d19" },
  panel: { padding: 16, borderWidth: 1, borderColor: "#29362e", borderRadius: 14, backgroundColor: "#171d19" },
  field: { marginBottom: 12, gap: 6 },
  fieldLabel: { color: "#c6d0c9", fontSize: 13, fontWeight: "600" },
  input: { minHeight: 46, paddingHorizontal: 12, borderWidth: 1, borderColor: "#35443a", borderRadius: 9, color: "#f3f7f4", backgroundColor: "#101312" },
  choiceWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: { paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: "#35443a", borderRadius: 9, backgroundColor: "#101312" },
  choiceActive: { borderColor: "#46d995", backgroundColor: "rgba(32,199,122,0.14)" },
  choiceText: { color: "#aab4ad", fontSize: 13 },
  choiceTextActive: { color: "#70e2a7" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  button: { minHeight: 40, justifyContent: "center", paddingHorizontal: 12, borderRadius: 9 },
  primary: { backgroundColor: "#46d995" },
  secondary: { borderWidth: 1, borderColor: "#46564b", backgroundColor: "#202923" },
  danger: { borderWidth: 1, borderColor: "rgba(248,113,113,0.45)", backgroundColor: "rgba(160,45,45,0.2)" },
  disabled: { opacity: 0.55 },
  buttonText: { color: "#101312", fontSize: 13, fontWeight: "700" },
  card: { padding: 15, borderWidth: 1, borderColor: "#29362e", borderRadius: 14, backgroundColor: "#171d19" },
  cardTitle: { marginBottom: 5, color: "#f3f7f4", fontSize: 16, fontWeight: "700" },
  cardText: { marginTop: 4, color: "#aab4ad", fontSize: 13 },
});
