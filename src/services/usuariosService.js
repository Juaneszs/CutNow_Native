import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export async function crearPerfilUsuario(usuarioId, perfil) {
  await setDoc(doc(db, "usuarios", usuarioId), perfil);
}

export async function getPerfilUsuario(usuarioId) {
  const snapshot = await getDoc(doc(db, "usuarios", usuarioId));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}
