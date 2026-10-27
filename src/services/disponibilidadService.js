import { arrayRemove, arrayUnion, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export async function getOccupiedSlots(barberoId, fecha) {
  const snapshot = await getDoc(doc(db, "Barberos", barberoId, "disponibilidad", fecha));
  return snapshot.exists() ? snapshot.data().slots_ocupados || [] : [];
}

export function reserveSlotInTransaction(transaction, disponibilidadRef, hora) {
  transaction.set(
    disponibilidadRef,
    { slots_ocupados: arrayUnion(hora) },
    { merge: true }
  );
}

export function releaseSlotInTransaction(transaction, disponibilidadRef, hora) {
  transaction.update(disponibilidadRef, { slots_ocupados: arrayRemove(hora) });
}
