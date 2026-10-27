import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase.native";
import { useAuth } from "../src/native/useAuth";
import { isValidEmail, isValidPassword } from "../src/utils/validation";
import LoadingState from "../src/native/LoadingState";
import background from "../public/fondobarb.png";

export default function LoginScreen() {
  const router = useRouter();
  const { user, cargando: authCargando } = useAuth();
  const { width } = useWindowDimensions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!authCargando && user) router.replace("/catalogo");
  }, [authCargando, router, user]);

  async function iniciarSesion() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Completa tu correo y contraseña.");
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setError("El correo no tiene un formato válido.");
      return;
    }
    if (!isValidPassword(password)) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setError("");
    setEnviando(true);
    try {
      await signInWithEmailAndPassword(auth, trimmedEmail, password);
      router.replace("/catalogo");
    } catch (authError) {
      setError(
        authError.code === "auth/invalid-credential"
          ? "Correo o contraseña incorrectos."
          : "No se pudo iniciar sesión. Intenta de nuevo.",
      );
    } finally {
      setEnviando(false);
    }
  }

  if (authCargando) {
    return <LoadingState />;
  }

  return (
    <ImageBackground source={background} style={styles.background} imageStyle={styles.backgroundImage}>
      <View style={styles.scrim} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.card, { width: Math.min(width - 36, 420) }]}>
            <Text style={styles.wordmark}>Cut<Text style={styles.accent}>Now</Text></Text>
            <Text style={styles.eyebrow}>BARBERÍA · MEDELLÍN</Text>
            <Text style={styles.title}>Qué bueno verte.</Text>
            <Text style={styles.subtitle}>Inicia sesión para reservar tu próximo corte.</Text>

            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput
              accessibilityLabel="Correo electrónico"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="tu@correo.com"
              placeholderTextColor="#84908a"
              returnKeyType="next"
              style={styles.input}
              value={email}
            />

            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              accessibilityLabel="Contraseña"
              autoComplete="password"
              onChangeText={setPassword}
              onSubmitEditing={iniciarSesion}
              placeholder="Tu contraseña"
              placeholderTextColor="#84908a"
              returnKeyType="go"
              secureTextEntry
              style={styles.input}
              value={password}
            />

            <Pressable onPress={() => router.push("/recuperar-contrasena")} style={styles.forgotButton}>
              <Text style={styles.link}>¿Olvidaste tu contraseña?</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={enviando}
              onPress={iniciarSesion}
              style={({ pressed }) => [styles.submit, pressed && styles.pressed, enviando && styles.disabled]}
            >
              {enviando ? <ActivityIndicator color="#07140d" /> : <Text style={styles.submitText}>Iniciar sesión</Text>}
            </Pressable>

            <View style={styles.registerRow}>
              <Text style={styles.secondaryText}>¿Primera vez en CutNow?</Text>
              <Pressable onPress={() => router.push("/registro")}>
                <Text style={styles.link}> Crear cuenta</Text>
              </Pressable>
            </View>
            <Pressable onPress={() => router.push("/tienda")} style={styles.exploreButton}>
              <Text style={styles.secondaryText}>Explorar la tienda</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  background: { flex: 1, backgroundColor: "#101312" },
  backgroundImage: { opacity: 0.22 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(9, 14, 11, 0.72)" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#101312" },
  scrollContent: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingVertical: 28 },
  card: {
    paddingHorizontal: 26,
    paddingVertical: 34,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(220, 239, 226, 0.13)",
    backgroundColor: "rgba(17, 23, 19, 0.96)",
    shadowColor: "#000",
    shadowOpacity: 0.32,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  wordmark: { color: "#f3f7f4", fontSize: 30, fontWeight: "800", textAlign: "center" },
  accent: { color: "#20c77a" },
  eyebrow: { marginTop: 7, color: "#93a098", fontSize: 10, fontWeight: "700", letterSpacing: 1.8, textAlign: "center" },
  title: { marginTop: 30, color: "#f3f7f4", fontSize: 25, fontWeight: "700" },
  subtitle: { marginTop: 7, marginBottom: 24, color: "#aab4ad", fontSize: 14, lineHeight: 21 },
  error: { marginBottom: 16, color: "#ff8e83", fontSize: 13, lineHeight: 19 },
  label: { marginBottom: 8, color: "#c9d2cc", fontSize: 13, fontWeight: "600" },
  input: {
    height: 50,
    marginBottom: 18,
    paddingHorizontal: 14,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#344139",
    backgroundColor: "#1a211d",
    color: "#f3f7f4",
    fontSize: 15,
  },
  forgotButton: { alignSelf: "flex-end", paddingVertical: 2, marginBottom: 22 },
  link: { color: "#46d995", fontSize: 13, fontWeight: "600" },
  submit: { minHeight: 50, alignItems: "center", justifyContent: "center", borderRadius: 9, backgroundColor: "#20c77a" },
  submitText: { color: "#07140d", fontSize: 15, fontWeight: "800" },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.6 },
  registerRow: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", marginTop: 22 },
  exploreButton: { alignSelf: "center", paddingTop: 14 },
  secondaryText: { color: "#aab4ad", fontSize: 13 },
});