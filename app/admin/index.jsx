import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase.native";
import { useAuth } from "../../src/native/useAuth";
import LoadingState from "../../src/native/LoadingState";
import EmptyState from "../../src/native/EmptyState";

const money = value => `$${Number(value || 0).toLocaleString("es-CO")}`;

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user, isAdmin, cargando: authCargando } = useAuth();
  const [stats, setStats] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authCargando && (!user || !isAdmin)) router.replace("/catalogo");
  }, [authCargando, isAdmin, router, user]);

  useEffect(() => {
    if (authCargando || !user || !isAdmin) return;
    let activa = true;
    async function cargar() {
      try {
        const [appointmentsSnapshot, barbersSnapshot] = await Promise.all([
          getDocs(collection(db, "citas")),
          getDocs(collection(db, "Barberos")),
        ]);
        if (!activa) return;
        const appointments = appointmentsSnapshot.docs.map(item => ({ id: item.id, ...item.data() }));
        const barbers = barbersSnapshot.docs.map(item => ({ id: item.id, ...item.data() }));
        const completed = appointments.filter(item => item.estado === "finalizada");
        const earnings = {};
        const ratings = {};
        appointments.forEach(item => {
          if (!item.barbero_id) return;
          if (item.estado === "finalizada") earnings[item.barbero_id] = (earnings[item.barbero_id] || 0) + (Number(item.precio) || 0);
          if (item.calificacion) (ratings[item.barbero_id] ||= []).push(Number(item.calificacion));
        });
        const now = new Date();
        const months = Array.from({ length: 6 }, (_, index) => {
          const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
          return {
            key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
            label: date.toLocaleString("es", { month: "short" }),
            value: 0,
          };
        });
        completed.forEach(item => {
          const month = months.find(value => value.key === item.fecha?.slice(0, 7));
          if (month) month.value += Number(item.precio) || 0;
        });
        setStats({
          totalCitas: appointments.length,
          completadas: completed.length,
          ingresoTotal: completed.reduce((sum, item) => sum + (Number(item.precio) || 0), 0),
          clientes: new Set(appointments.map(item => item.usuario_id).filter(Boolean)).size,
          meses: months,
          barberos: barbers.map(barber => {
            const barberRatings = ratings[barber.id] || [];
            return {
              id: barber.id,
              nombre: barber.Nombre || barber.nombre || "Barbero",
              ingresos: earnings[barber.id] || 0,
              citas: appointments.filter(item => item.barbero_id === barber.id).length,
              rating: barberRatings.length ? barberRatings.reduce((sum, value) => sum + value, 0) / barberRatings.length : 0,
            };
          }).sort((a, b) => b.ingresos - a.ingresos),
        });
      } catch {
        if (activa) setError("No se pudieron cargar las métricas administrativas.");
      } finally {
        if (activa) setCargando(false);
      }
    }
    cargar();
    return () => { activa = false; };
  }, [authCargando, isAdmin, user]);

  if (authCargando || cargando) return <LoadingState />;
  if (!user || !isAdmin) return <LoadingState />;
  if (error || !stats) return <View style={styles.center}><Text style={styles.error}>{error || "No hay métricas disponibles."}</Text></View>;

  const columns = width > 600 ? 4 : 2;
  const maxMonth = Math.max(...stats.meses.map(item => item.value), 1);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>CUTNOW · OPERACIONES</Text>
      <Text style={styles.title}>Panel administrativo</Text>
      <Text style={styles.subtitle}>Rendimiento de reservas, equipo e ingresos.</Text>
      <Pressable onPress={() => router.push("/admin/citas")} style={styles.manageButton}>
        <Text style={styles.manageButtonText}>Gestionar citas  →</Text>
      </Pressable>
      <Pressable onPress={() => router.push("/configuracion")} style={[styles.manageButton, styles.secondaryManageButton]}>
        <Text style={[styles.manageButtonText, styles.secondaryManageButtonText]}>Gestionar barberos, servicios, sedes, productos y pedidos  →</Text>
      </Pressable>

      <View style={styles.statsGrid}>
        <StatCard label="Clientes" value={stats.clientes.toLocaleString()} hint="Con reservas" columns={columns} />
        <StatCard label="Ingresos" value={money(stats.ingresoTotal)} hint="Citas completadas" columns={columns} />
        <StatCard label="Citas" value={String(stats.totalCitas)} hint={`${stats.completadas} completadas`} columns={columns} />
        <StatCard label="Barberos" value={String(stats.barberos.length)} hint="En el sistema" columns={columns} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ingresos mensuales</Text>
        {stats.meses.some(month => month.value > 0) ? (
          <View style={styles.chart}>
            {stats.meses.map(month => (
              <View key={month.key} style={styles.barGroup}>
                <Text numberOfLines={1} style={styles.barValue}>{month.value ? money(month.value) : ""}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.bar, { height: `${Math.max((month.value / maxMonth) * 100, month.value ? 8 : 2)}%` }]} />
                </View>
                <Text style={styles.monthLabel}>{month.label}</Text>
              </View>
            ))}
          </View>
        ) : <EmptyState icon="▥" message="Aún no hay datos para mostrar en el gráfico." />}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rendimiento por barbero</Text>
        {stats.barberos.length ? stats.barberos.map((barber, index) => (
          <View key={barber.id} style={styles.barberRow}>
            <View style={styles.rank}><Text style={styles.rankText}>{String(index + 1).padStart(2, "0")}</Text></View>
            <View style={styles.barberInfo}>
              <Text style={styles.barberName}>{barber.nombre}</Text>
              <Text style={styles.barberMeta}>{barber.citas} citas · {barber.rating ? `★ ${barber.rating.toFixed(1)}` : "Sin valoraciones"}</Text>
            </View>
            <Text style={styles.barberRevenue}>{money(barber.ingresos)}</Text>
          </View>
        )) : <Text style={styles.empty}>Aún no hay barberos registrados.</Text>}
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value, hint, columns }) {
  return (
    <View style={[styles.statCard, { width: columns === 4 ? "23.5%" : "48%" }]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.statValue}>{value}</Text>
      <Text numberOfLines={1} style={styles.statHint}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#101312" },
  content: { width: "100%", maxWidth: 960, alignSelf: "center", paddingHorizontal: 18, paddingTop: 22, paddingBottom: 120 },
  kicker: { color: "#46d995", fontSize: 10, fontWeight: "700", letterSpacing: 1.7 },
  title: { marginTop: 9, color: "#f3f7f4", fontSize: 27, fontWeight: "700" },
  subtitle: { marginTop: 6, color: "#aab4ad", fontSize: 13, lineHeight: 19 },
  manageButton: { alignSelf: "flex-start", marginTop: 15, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 7, backgroundColor: "#20c77a" },
  manageButtonText: { color: "#07140d", fontSize: 13, fontWeight: "800" },
  secondaryManageButton: { backgroundColor: "#202a23" },
  secondaryManageButtonText: { color: "#b9f3d2" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 9, marginTop: 20 },
  statCard: { minHeight: 105, justifyContent: "center", padding: 12, borderWidth: 1, borderColor: "#29362e", borderRadius: 9, backgroundColor: "#171d19" },
  statLabel: { color: "#98a49c", fontSize: 11, fontWeight: "600" },
  statValue: { marginTop: 7, color: "#f3f7f4", fontSize: 20, fontWeight: "800" },
  statHint: { marginTop: 5, color: "#718078", fontSize: 10 },
  section: { marginTop: 15, padding: 15, borderWidth: 1, borderColor: "#29362e", borderRadius: 10, backgroundColor: "#171d19" },
  sectionTitle: { marginBottom: 15, color: "#e4eae6", fontSize: 15, fontWeight: "700" },
  chart: { height: 160, flexDirection: "row", alignItems: "stretch", justifyContent: "space-around", gap: 6 },
  barGroup: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  barValue: { height: 18, color: "#8e9a92", fontSize: 8, textAlign: "center" },
  barTrack: { width: "72%", flex: 1, justifyContent: "flex-end", borderBottomWidth: 1, borderColor: "#344139" },
  bar: { width: "100%", borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: "#20c77a" },
  monthLabel: { marginTop: 7, color: "#8e9a92", fontSize: 10, textTransform: "capitalize" },
  barberRow: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#29332d" },
  rank: { width: 30, height: 30, alignItems: "center", justifyContent: "center", borderRadius: 7, backgroundColor: "#202a23" },
  rankText: { color: "#46d995", fontSize: 11, fontWeight: "700" },
  barberInfo: { flex: 1 },
  barberName: { color: "#e1e8e3", fontSize: 13, fontWeight: "600" },
  barberMeta: { marginTop: 4, color: "#84908a", fontSize: 11 },
  barberRevenue: { color: "#46d995", fontSize: 13, fontWeight: "700" },
  empty: { color: "#84908a", fontSize: 13 },
  error: { color: "#ff8e83", fontSize: 14, textAlign: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20, backgroundColor: "#101312" },
});