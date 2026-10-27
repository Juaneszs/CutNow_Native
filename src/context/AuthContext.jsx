import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase";
import { getPerfilUsuario } from "../services/usuariosService";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);
  const authChangeId = useRef(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      const currentChangeId = ++authChangeId.current;
      setCargando(true);
      setUser(firebaseUser);
      setPerfil(null);

      if (firebaseUser) {
        try {
          const loadedProfile = await getPerfilUsuario(firebaseUser.uid);
          if (currentChangeId === authChangeId.current) {
            setPerfil(loadedProfile);
          }
        } catch (e) {
          console.error("Error leyendo perfil:", e);
        }
      }
      if (currentChangeId === authChangeId.current) setCargando(false);
    });
    return unsub;
  }, []);

  const cerrarSesion = async () => {
    const usuarioActual = user;
    const perfilActual = perfil;
    ++authChangeId.current;
    setUser(null);
    setPerfil(null);
    setCargando(true);
    try {
      await signOut(auth);
    } catch (error) {
      setUser(usuarioActual);
      setPerfil(perfilActual);
      setCargando(false);
      throw error;
    }
  };

  const isAdmin = perfil?.role === "admin";

  return (
    <AuthContext.Provider value={{ user, perfil, isAdmin, cargando, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  );
}
