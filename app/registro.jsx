import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase.native";
import { useAuth } from "../src/native/useAuth";
import { isValidEmail, isValidPassword } from "../src/utils/validation";

export default function RegisterScreen() {
  const router = useRouter();
  const { user, cargando: authCargando } = useAuth();
  const { width } = useWindowDimensions();
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!authCargando && user) router.replace("/catalogo");
  }, [authCargando, router, user]);

  async function registrar() {
    if (![nombre, apellido, email, password, confirmar].every(value => value.trim())) {
      setError("Completa todos los campos.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("El correo electrónico no es válido.");
      return;
    }
    if (!isValidPassword(password)) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setError("");
    setEnviando(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await setDoc(doc(db, "usuarios", credential.user.uid), {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: email.trim(),
        creadoEn: new Date().toISOString(),
        role: "user",
      });
      router.replace("/catalogo");
    } catch (registrationError) {
      setError(
        registrationError.code === "auth/email-already-in-use"
          ? "Este correo ya está registrado."
          : registrationError.code === "auth/invalid-email"
            ? "El correo no tiene un formato válido."
            : "No se pudo crear la cuenta. Intenta de nuevo.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      {authCargando ? <ActivityIndicator color="#20c77a" /> : null}
      {!authCargando && !user ? (
      <View style={[styles.card, { width: Math.min(width - 36, 460) }]}>
        <Text style={styles.kicker}>CUTNOW · NUEVA CUENTA</Text>
        <Text style={styles.title}>Tu próximo corte empieza aquí.</Text>
        <Text style={styles.subtitle}>Crea tu perfil para reservar y gestionar tus citas.</Text>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>Nombre</Text>
        <TextInput autoCapitalize="words" onChangeText={setNombre} placeholder="Nombre" placeholderTextColor="#84908a" style={styles.input} value={nombre} />
        <Text style={styles.label}>Apellido</Text>
        <TextInput autoCapitalize="words" onChangeText={setApellido} placeholder="Apellido" placeholderTextColor="#84908a" style={styles.input} value={apellido} />
        <Text style={styles.label}>Correo electrónico</Text>
        <TextInput autoCapitalize="none" keyboardType="email-address" onChangeText={setEmail} placeholder="tu@correo.com" placeholderTextColor="#84908a" style={styles.input} value={email} />
        <Text style={styles.label}>Contraseña</Text>
        <TextInput onChangeText={setPassword} placeholder="Mínimo 6 caracteres" placeholderTextColor="#84908a" secureTextEntry style={styles.input} value={password} />
        <Text style={styles.label}>Confirmar contraseña</Text>
        <TextInput onChangeText={setConfirmar} onSubmitEditing={registrar} placeholder="Repite tu contraseña" placeholderTextColor="#84908a" secureTextEntry style={styles.input} value={confirmar} />

        <Pressable accessibilityRole="button" disabled={enviando} onPress={registrar} style={({ pressed }) => [styles.submit, pressed && styles.pressed, enviando && styles.disabled]}>
          {enviando ? <ActivityIndicator color="#07140d" /> : <Text style={styles.submitText}>Crear cuenta</Text>}
        </Pressable>
        <Pressable onPress={() => router.replace("/")} style={styles.backButton}>
          <Text style={styles.link}>Ya tengo una cuenta</Text>
        </Pressable>
      </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingVertical: 24, backgroundColor: "#101312" },
  card: { padding: 24, borderWidth: 1, borderColor: "#29362e", borderRadius: 14, backgroundColor: "#171d19" },
  kicker: { color: "#46d995", fontSize: 10, fontWeight: "700", letterSpacing: 1.8 },
  title: { marginTop: 12, color: "#f3f7f4", fontSize: 24, fontWeight: "700", lineHeight: 31 },
  subtitle: { marginTop: 8, marginBottom: 20, color: "#aab4ad", fontSize: 14, lineHeight: 21 },
  error: { marginBottom: 16, color: "#ff8e83", fontSize: 13 },
  label: { marginBottom: 7, color: "#c9d2cc", fontSize: 13, fontWeight: "600" },
  input: { height: 48, marginBottom: 15, paddingHorizontal: 13, borderWidth: 1, borderColor: "#344139", borderRadius: 8, backgroundColor: "#1a211d", color: "#f3f7f4", fontSize: 15 },
  submit: { minHeight: 49, alignItems: "center", justifyContent: "center", marginTop: 5, borderRadius: 8, backgroundColor: "#20c77a" },
  submitText: { color: "#07140d", fontSize: 15, fontWeight: "800" },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.6 },
  backButton: { alignSelf: "center", paddingVertical: 17 },
  link: { color: "#46d995", fontSize: 13, fontWeight: "600" },
});