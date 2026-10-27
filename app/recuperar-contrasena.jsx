import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase.native";
import { isValidEmail } from "../src/utils/validation";

export default function RecoverPasswordScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState("idle");
  const [error, setError] = useState("");

  async function enviarEnlace() {
    if (!isValidEmail(email)) {
      setError("Escribe un correo electrónico válido.");
      return;
    }
    setError("");
    setEstado("enviando");
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setEstado("enviado");
    } catch (sendError) {
      setEstado("idle");
      setError(sendError.code === "auth/user-not-found" ? "No encontramos una cuenta con ese correo." : "No se pudo enviar el enlace. Intenta de nuevo.");
    }
  }

  return (
    <View style={styles.page}>
      <View style={[styles.card, { width: Math.min(width - 36, 420) }]}>
        <Text style={styles.kicker}>RECUPERAR ACCESO</Text>
        <Text style={styles.title}>{estado === "enviado" ? "Revisa tu correo." : "Volvamos a entrar."}</Text>
        <Text style={styles.subtitle}>
          {estado === "enviado"
            ? `Enviamos un enlace para restablecer la contraseña a ${email.trim()}.`
            : "Te enviaremos un enlace seguro para restablecer tu contraseña."}
        </Text>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {estado !== "enviado" ? (
          <>
            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput autoCapitalize="none" keyboardType="email-address" onChangeText={setEmail} onSubmitEditing={enviarEnlace} placeholder="tu@correo.com" placeholderTextColor="#84908a" style={styles.input} value={email} />
            <Pressable accessibilityRole="button" disabled={estado === "enviando"} onPress={enviarEnlace} style={({ pressed }) => [styles.submit, pressed && styles.pressed]}>
              {estado === "enviando" ? <ActivityIndicator color="#07140d" /> : <Text style={styles.submitText}>Enviar enlace</Text>}
            </Pressable>
          </>
        ) : null}
        <Pressable onPress={() => router.replace("/")} style={styles.backButton}>
          <Text style={styles.link}>Volver al inicio de sesión</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 24, backgroundColor: "#101312" },
  card: { padding: 25, borderWidth: 1, borderColor: "#29362e", borderRadius: 14, backgroundColor: "#171d19" },
  kicker: { color: "#46d995", fontSize: 10, fontWeight: "700", letterSpacing: 1.8 },
  title: { marginTop: 14, color: "#f3f7f4", fontSize: 25, fontWeight: "700" },
  subtitle: { marginTop: 8, marginBottom: 23, color: "#aab4ad", fontSize: 14, lineHeight: 21 },
  error: { marginBottom: 14, color: "#ff8e83", fontSize: 13, lineHeight: 18 },
  label: { marginBottom: 7, color: "#c9d2cc", fontSize: 13, fontWeight: "600" },
  input: { height: 49, marginBottom: 18, paddingHorizontal: 13, borderWidth: 1, borderColor: "#344139", borderRadius: 8, backgroundColor: "#1a211d", color: "#f3f7f4", fontSize: 15 },
  submit: { minHeight: 49, alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: "#20c77a" },
  submitText: { color: "#07140d", fontSize: 15, fontWeight: "800" },
  pressed: { opacity: 0.82 },
  backButton: { alignSelf: "center", paddingTop: 20 },
  link: { color: "#46d995", fontSize: 13, fontWeight: "600" },
});