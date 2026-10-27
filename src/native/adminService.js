import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase.native";

export async function listarRegistrosAdmin(nombreColeccion) {
  const snapshot = await getDocs(collection(db, nombreColeccion));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
}

export async function crearRegistroAdmin(nombreColeccion, datos) {
  const registro = await addDoc(collection(db, nombreColeccion), datos);
  return { id: registro.id, ...datos };
}

export async function actualizarRegistroAdmin(nombreColeccion, id, datos) {
  await updateDoc(doc(db, nombreColeccion, id), datos);
}

export async function eliminarRegistroAdmin(nombreColeccion, id) {
  await deleteDoc(doc(db, nombreColeccion, id));
}

export async function crearPedidoNativo({ usuarioId, usuarioNombre, productos, total, metodoPago }) {
  const pedido = await addDoc(collection(db, "pedidos"), {
    usuario_id: usuarioId,
    usuario_nombre: usuarioNombre,
    productos: productos.map(producto => ({
      nombre: producto.nombre,
      precio: Number(producto.precio) || 0,
    })),
    total,
    metodo_pago: metodoPago,
    estado: "pendiente",
    fecha_creacion: serverTimestamp(),
  });
  return pedido.id;
}

export async function listarPedidosAdmin() {
  const snapshot = await getDocs(collection(db, "pedidos"));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
}

export async function actualizarPedidoAdmin(pedidoId, estado) {
  await updateDoc(doc(db, "pedidos", pedidoId), {
    estado,
    actualizado_at: serverTimestamp(),
  });
}

export async function eliminarPedidoAdmin(pedidoId) {
  await deleteDoc(doc(db, "pedidos", pedidoId));
}
