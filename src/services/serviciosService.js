import { createRecord, deleteRecord, getRecords, updateRecord } from "./collectionService";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

const COLLECTION = "Servicios";

export const getServicios = () => getRecords(COLLECTION);
export async function getServiciosActivos() {
  const snapshot = await getDocs(query(collection(db, COLLECTION), where("activo", "==", true)));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
}
export const createServicio = data => createRecord(COLLECTION, data);
export const updateServicio = (id, data) => updateRecord(COLLECTION, id, data);
export const deleteServicio = id => deleteRecord(COLLECTION, id);
