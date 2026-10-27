import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebase.native";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);
  const authChangeId = useRef(0);

  useEffect(() => onAuthStateChanged(auth, async firebaseUser => {
    const changeId = ++authChangeId.current;
    setCargando(true);
    setUser(firebaseUser);
    setPerfil(null);

    if (firebaseUser) {
      try {
        const snapshot = await getDoc(doc(db, "usuarios", firebaseUser.uid));
        if (changeId === authChangeId.current && snapshot.exists()) {
          setPerfil({ id: snapshot.id, ...snapshot.data() });
        }
      } catch (error) {
        console.error("Error leyendo perfil:", error);
      }
    }

    if (changeId === authChangeId.current) setCargando(false);
  }), []);

  async function cerrarSesion() {
    const userActual = user;
    const perfilActual = perfil;
    ++authChangeId.current;
    setUser(null);
    setPerfil(null);
    setCargando(true);
    try {
      await signOut(auth);
    } catch (error) {
      setUser(userActual);
      setPerfil(perfilActual);
      setCargando(false);
      throw error;
    }
  }

  const isAdmin = perfil?.role === "admin";

  return (
    <AuthContext.Provider value={{ user, perfil, isAdmin, cargando, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  );
}
