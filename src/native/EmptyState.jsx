import { Pressable, StyleSheet, Text, View } from "react-native";

export default function EmptyState({ icon = "◇", message, actionLabel, onAction }) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.button}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center", gap: 10, padding: 22 },
  icon: { color: "#46d995", fontSize: 32, fontWeight: "700" },
  message: { color: "#aab4ad", fontSize: 13, lineHeight: 19, textAlign: "center" },
  button: { marginTop: 2, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, backgroundColor: "#20c77a" },
  buttonText: { color: "#07140d", fontSize: 12, fontWeight: "800" },
});
