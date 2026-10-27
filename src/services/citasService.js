import {
  collection, deleteDoc, doc, getDocs, onSnapshot, orderBy, query,
  runTransaction, serverTimestamp, updateDoc, where,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  releaseSlotInTransaction,
  reserveSlotInTransaction,
} from "./disponibilidadService";

export async function getCitas() {
  const snapshot = await getDocs(collection(db, "citas"));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
}

export async function getCitasByUsuario(usuarioId) {
  const snapshot = await getDocs(query(
    collection(db, "citas"),
    where("usuario_id", "==", usuarioId)
  ));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
}

export async function getCitasFinalizadasByBarbero(barberoId) {
  const snapshot = await getDocs(query(
    collection(db, "citas"),
    where("barbero_id", "==", barberoId),
    where("estado", "==", "finalizada")
  ));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
}

export function subscribeCitasByUsuarioEstado(usuarioId, estado, onData, onError) {
  const citasQuery = query(
    collection(db, "citas"),
    where("usuario_id", "==", usuarioId),
    where("estado", "==", estado),
    orderBy("fecha", "asc")
  );
  return onSnapshot(
    citasQuery,
    snapshot => onData(snapshot.docs.map(item => ({ id: item.id, ...item.data() }))),
    onError
  );
}

export function subscribeCitasPorEstado(estados, sortDirection, onData, onError) {
  const citasQuery = query(
    collection(db, "citas"),
    where("estado", "in", estados),
    orderBy("fecha", sortDirection),
    ...(sortDirection === "asc" && estados.length > 1 ? [orderBy("hora", "asc")] : [])
  );
  return onSnapshot(
    citasQuery,
    snapshot => onData(snapshot.docs.map(item => ({ id: item.id, ...item.data() }))),
    onError
  );
}

export function subscribeCitasPorEstadoIndividual(estado, onData, onError) {
  const citasQuery = query(
    collection(db, "citas"),
    where("estado", "==", estado),
    orderBy("fecha", "desc")
  );
  return onSnapshot(
    citasQuery,
    snapshot => onData(snapshot.docs.map(item => ({ id: item.id, ...item.data() }))),
    onError
  );
}

export async function crearCitaConReserva(cita) {
  const citaRef = doc(collection(db, "citas"));
  const disponibilidadRef = doc(
    db,
    "Barberos",
    cita.barbero_id,
    "disponibilidad",
    cita.fecha
  );

  await runTransaction(db, async transaction => {
    const availability = await transaction.get(disponibilidadRef);
    const ocupados = availability.exists()
      ? availability.data().slots_ocupados || []
      : [];

    if (ocupados.includes(cita.hora)) {
      throw new Error("Este horario ya fue tomado. Elige otro.");
    }

    transaction.set(citaRef, {
      ...cita,
      fecha_creacion: serverTimestamp(),
    });
    reserveSlotInTransaction(transaction, disponibilidadRef, cita.hora);
  });
}

export async function cancelarCita(citaId, barberoId, fecha, hora) {
  const citaRef = doc(db, "citas", citaId);
  const disponibilidadRef = doc(db, "Barberos", barberoId, "disponibilidad", fecha);

  await runTransaction(db, async transaction => {
    transaction.update(citaRef, {
      estado: "cancelada",
      cancelada_at: serverTimestamp(),
    });
    releaseSlotInTransaction(transaction, disponibilidadRef, hora);
  });
}

export async function aceptarCita(citaId) {
  await updateDoc(doc(db, "citas", citaId), {
    estado: "confirmada",
    confirmada_at: serverTimestamp(),
  });
}

export async function completarCita(citaId) {
  await updateDoc(doc(db, "citas", citaId), {
    estado: "finalizada",
    finalizada_at: serverTimestamp(),
  });
}

export async function calificarCita(citaId, estrellas, comentario) {
  await updateDoc(doc(db, "citas", citaId), {
    calificacion: estrellas,
    comentario: comentario.trim(),
    calificado: true,
  });
}

export async function deleteCita(citaId) {
  await deleteDoc(doc(db, "citas", citaId));
}
