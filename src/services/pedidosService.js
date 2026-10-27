import {
  addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export async function crearPedido(data) {
  const result = await addDoc(collection(db, "pedidos"), {
    ...data,
    fecha_creacion: serverTimestamp(),
  });
  return result.id;
}

export async function getPedidos() {
  const snapshot = await getDocs(collection(db, "pedidos"));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
}

export async function actualizarEstadoPedido(pedidoId, estado) {
  await updateDoc(doc(db, "pedidos", pedidoId), {
    estado,
    actualizado_at: serverTimestamp(),
  });
}

export async function eliminarPedido(pedidoId) {
  await deleteDoc(doc(db, "pedidos", pedidoId));
}
