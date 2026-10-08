import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function BarberAppointmentRedirect() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const barberId = Array.isArray(id) ? id[0] : id;

  useEffect(() => {
    if (barberId) router.replace({ pathname: "/agendar", params: { barberoId: barberId } });
  }, [barberId, router]);

  return <View style={styles.center}><ActivityIndicator color="#20c77a" /></View>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#101312" },
});