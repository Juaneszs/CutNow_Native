import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export default function LoadingState({ message = "Cargando..." }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color="#20c77a" size="large" />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center", gap: 10, padding: 24 },
  message: { color: "#aab4ad", fontSize: 13, textAlign: "center" },
});
