import { collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { createRecord, deleteRecord, getRecords, updateRecord } from "./collectionService";

const COLLECTION = "Barberos";

export async function getBarberos() {
  return getRecords(COLLECTION);
}

export async function getBarberosActivosPorSede(sedeId) {
  const snapshot = await getDocs(query(
    collection(db, COLLECTION),
    where("sede_id", "==", sedeId),
    where("estado", "==", "activo")
  ));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
}

export const createBarbero = data => createRecord(COLLECTION, data);
export const updateBarbero = (id, data) => updateRecord(COLLECTION, id, data);
export const deleteBarbero = id => deleteRecord(COLLECTION, id);

export async function actualizarPromedioCalificaciones(barberoId, citas) {
  const ratings = citas
    .map(cita => cita.calificacion)
    .filter(value => value != null && value > 0);
  if (ratings.length === 0) return;

  const average = ratings.reduce((sum, value) => sum + value, 0) / ratings.length;
  await updateDoc(doc(db, COLLECTION, barberoId), {
    calificacion_promedio: Math.round(average * 10) / 10,
    total_calificaciones: ratings.length,
  });
}
