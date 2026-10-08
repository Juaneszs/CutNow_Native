import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebase.native";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => onAuthStateChanged(auth, async (firebaseUser) => {
    setUser(firebaseUser);
    setPerfil(null);

    if (firebaseUser) {
      try {
        const snapshot = await getDoc(doc(db, "usuarios", firebaseUser.uid));
        if (snapshot.exists()) {
          setPerfil({ id: snapshot.id, ...snapshot.data() });
        }
      } catch (error) {
        console.error("Error leyendo perfil:", error);
      }
    }

    setCargando(false);
  }), []);

  const isAdmin = perfil?.role === "admin";

  return (
    <AuthContext.Provider value={{ user, perfil, isAdmin, cargando }}>
      {children}
    </AuthContext.Provider>
  );
}
